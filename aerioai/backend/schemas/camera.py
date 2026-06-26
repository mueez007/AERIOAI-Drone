from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MediaResponse(BaseModel):
    id: str
    mission_id: Optional[str]
    media_type: str
    filename: str
    filepath: str
    file_size_bytes: Optional[int]
    duration_seconds: Optional[int]
    gps_lat: Optional[float]
    gps_lon: Optional[float]
    altitude: Optional[float]
    summary: Optional[str]
    threat_level: Optional[str]
    confidence: Optional[float]
    objects_detected: Optional[list]
    analysis_history: Optional[list]
    is_pinned: int
    captured_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class MediaListResponse(BaseModel):
    total: int
    photos: List[MediaResponse]
    videos: List[MediaResponse]


class CaptureResponse(BaseModel):
    id: str
    filename: str
    filepath: str
    message: str


class VideoStartResponse(BaseModel):
    message: str


class VideoStopResponse(BaseModel):
    filename: str
    filepath: str
    duration_seconds: int
    message: str
