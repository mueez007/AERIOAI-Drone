from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os

from core.database import get_db
from core.models import User, Media, MediaType, AuditLog
from schemas.camera import MediaListResponse, CaptureResponse, VideoStartResponse, VideoStopResponse
from core.security import get_current_user
from services.camera_service import CameraService

router = APIRouter(prefix="/api/camera", tags=["Camera"])
camera_service = CameraService()


@router.post("/capture", response_model=CaptureResponse)
def capture_photo(
    mission_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = camera_service.capture_photo(mission_id=mission_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to capture photo")

    media = Media(
        mission_id=mission_id,
        media_type=MediaType.PHOTO,
        filename=result["filename"],
        filepath=result["filepath"],
        gps_lat=result.get("gps_lat"),
        gps_lon=result.get("gps_lon"),
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    audit = AuditLog(
        user_id=current_user.id,
        action="photo_capture",
        details=f"Photo captured: {result['filename']}",
    )
    db.add(audit)
    db.commit()

    return CaptureResponse(
        id=media.id,
        filename=result["filename"],
        filepath=result["filepath"],
        message="Photo captured successfully",
    )


@router.post("/record/start", response_model=VideoStartResponse)
def start_recording(
    mission_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    camera_service.start_recording()
    return VideoStartResponse(message="Recording started")


@router.post("/record/stop", response_model=VideoStopResponse)
def stop_recording(
    mission_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = camera_service.stop_recording()
    if not result:
        raise HTTPException(status_code=500, detail="Failed to stop recording")

    media = Media(
        mission_id=mission_id,
        media_type=MediaType.VIDEO,
        filename=result["filename"],
        filepath=result["filepath"],
        duration_seconds=result["duration_seconds"],
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    audit = AuditLog(
        user_id=current_user.id,
        action="video_record",
        details=f"Video recorded: {result['filename']}",
    )
    db.add(audit)
    db.commit()

    return VideoStopResponse(
        filename=result["filename"],
        filepath=result["filepath"],
        duration_seconds=result["duration_seconds"],
        message="Recording stopped",
    )


@router.get("/photos", response_model=MediaListResponse)
def get_photos(
    mission_id: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Media).filter(Media.media_type == MediaType.PHOTO)
    if mission_id:
        query = query.filter(Media.mission_id == mission_id)

    total = query.count()
    photos = query.order_by(Media.captured_at.desc()).offset(skip).limit(limit).all()

    return MediaListResponse(total=total, photos=photos, videos=[])


@router.get("/videos", response_model=MediaListResponse)
def get_videos(
    mission_id: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Media).filter(Media.media_type == MediaType.VIDEO)
    if mission_id:
        query = query.filter(Media.mission_id == mission_id)

    total = query.count()
    videos = query.order_by(Media.captured_at.desc()).offset(skip).limit(limit).all()

    return MediaListResponse(total=total, photos=[], videos=videos)


@router.delete("/{media_id}")
def delete_media(
    media_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if os.path.exists(media.filepath):
        os.remove(media.filepath)

    db.delete(media)

    audit = AuditLog(
        user_id=current_user.id,
        action="media_delete",
        details=f"Deleted media: {media.filename}",
    )
    db.add(audit)
    db.commit()

    return {"message": "Media deleted successfully"}


@router.get("/stream")
def live_stream():
    return StreamingResponse(
        camera_service.generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/download/{media_id}")
def download_media(
    media_id: str,
    db: Session = Depends(get_db),
):
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if not os.path.exists(media.filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(media.filepath, filename=media.filename)


@router.get("/thumbnail/{media_id}")
def get_thumbnail(
    media_id: str,
    db: Session = Depends(get_db),
):
    """Public read-only endpoint for <img> tags — no auth needed."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if not os.path.exists(media.filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(media.filepath, filename=media.filename)
