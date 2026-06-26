from pydantic import BaseModel
from typing import Optional, List


class MissionCreate(BaseModel):
    name: str


class MissionUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    is_pinned: Optional[int] = None


class MissionResponse(BaseModel):
    id: str
    name: str
    status: str
    pilot_id: str
    started_at: Optional[str]
    ended_at: Optional[str]
    duration_seconds: Optional[int]
    distance_meters: Optional[float]
    avg_speed: Optional[float]
    max_altitude: Optional[float]
    total_objects_detected: int
    total_threats: int
    threat_score: float
    coverage_score: float
    mission_success: float
    summary: Optional[str]
    is_pinned: int
    created_at: str

    class Config:
        from_attributes = True


class MissionListResponse(BaseModel):
    total: int
    missions: List[MissionResponse]


class MissionCompareRequest(BaseModel):
    mission_ids: List[str]


class MissionCompareResponse(BaseModel):
    missions: List[MissionResponse]
    comparison_text: str


class MissionQueryRequest(BaseModel):
    query: str


class MissionQueryResponse(BaseModel):
    query: str
    result: str
    matching_missions: List[MissionResponse]
