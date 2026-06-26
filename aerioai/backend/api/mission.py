from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from core.database import get_db
from core.models import User, Mission, Media, Detection, MissionEvent, VoiceLog, AuditLog
from schemas.mission import (
    MissionCreate, MissionUpdate, MissionResponse, MissionListResponse,
    MissionCompareRequest, MissionCompareResponse, MissionQueryRequest, MissionQueryResponse,
)
from core.security import get_current_user
from services.gemini_service import GeminiService

router = APIRouter(prefix="/api/missions", tags=["Missions"])
gemini_service = GeminiService()


@router.post("/", response_model=MissionResponse, status_code=201)
def create_mission(
    payload: MissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mission = Mission(
        name=payload.name,
        pilot_id=current_user.id,
        status="created",
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    event = MissionEvent(
        mission_id=mission.id,
        event_type="created",
        description=f"Mission '{payload.name}' created",
    )
    db.add(event)

    audit = AuditLog(
        user_id=current_user.id,
        action="mission_create",
        details=f"Mission created: {mission.id} - {payload.name}",
    )
    db.add(audit)
    db.commit()

    return mission


@router.get("/", response_model=MissionListResponse)
def list_missions(
    status: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Mission)
    if status:
        query = query.filter(Mission.status == status)
    query = query.order_by(Mission.created_at.desc())

    total = query.count()
    missions = query.offset(skip).limit(limit).all()

    return MissionListResponse(total=total, missions=missions)


@router.get("/{mission_id}", response_model=MissionResponse)
def get_mission(
    mission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission


@router.patch("/{mission_id}", response_model=MissionResponse)
def update_mission(
    mission_id: str,
    payload: MissionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(mission, key, value)

    db.commit()
    db.refresh(mission)
    return mission


@router.post("/{mission_id}/start", response_model=MissionResponse)
def start_mission(
    mission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission.status = "active"
    mission.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(mission)

    event = MissionEvent(
        mission_id=mission.id,
        event_type="started",
        description="Mission started",
    )
    db.add(event)
    db.commit()

    return mission


@router.post("/{mission_id}/complete", response_model=MissionResponse)
def complete_mission(
    mission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission.status = "completed"
    mission.ended_at = datetime.now(timezone.utc)
    if mission.started_at:
        mission.duration_seconds = int((mission.ended_at - mission.started_at).total_seconds())

    detections_count = db.query(Detection).filter(Detection.mission_id == mission_id).count()
    mission.total_objects_detected = detections_count

    db.commit()
    db.refresh(mission)

    event = MissionEvent(
        mission_id=mission.id,
        event_type="completed",
        description=f"Mission completed. Duration: {mission.duration_seconds}s",
    )
    db.add(event)
    db.commit()

    return mission


@router.delete("/{mission_id}")
def delete_mission(
    mission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    db.delete(mission)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="mission_delete",
        details=f"Mission deleted: {mission_id}",
    )
    db.add(audit)
    db.commit()

    return {"message": "Mission deleted successfully"}


@router.post("/compare", response_model=MissionCompareResponse)
def compare_missions(
    payload: MissionCompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    missions = db.query(Mission).filter(Mission.id.in_(payload.mission_ids)).all()
    if len(missions) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 missions to compare")

    comparison_text = gemini_service.compare_missions(missions)

    return MissionCompareResponse(
        missions=missions,
        comparison_text=comparison_text,
    )


@router.post("/query", response_model=MissionQueryResponse)
def query_missions(
    payload: MissionQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI-powered mission knowledge base query."""
    all_missions = db.query(Mission).order_by(Mission.created_at.desc()).limit(100).all()

    result_text, matching_ids = gemini_service.query_missions(payload.query, all_missions)

    matching_missions = [m for m in all_missions if m.id in matching_ids]

    return MissionQueryResponse(
        query=payload.query,
        result=result_text,
        matching_missions=matching_missions,
    )
