from pydantic import BaseModel, validator
from typing import Optional


class ChatRequest(BaseModel):
    message: str
    media_id: Optional[str] = None
    mission_id: Optional[str] = None
    live_stream: Optional[bool] = False
    generate_audio: Optional[bool] = False
    session_id: Optional[str] = None
    context: Optional[str] = "ai_chat"


class ChatResponse(BaseModel):
    response: str
    media_id: Optional[str] = None
    mission_id: Optional[str] = None
    live_stream: Optional[bool] = False
    audio_url: Optional[str] = None
    session_id: Optional[str] = None
    context: Optional[str] = "ai_chat"


class VoiceCommandResponse(BaseModel):
    transcribed_text: str
    ai_response: str
    audio_url: Optional[str] = None


class SceneAnalysisRequest(BaseModel):
    media_id: Optional[str] = None
    prompt: Optional[str] = None
    live_stream: Optional[bool] = False
    analysis_type: Optional[str] = "normal"


class SceneAnalysisResponse(BaseModel):
    media_id: str
    detections: list
    summary: str
    threat_level: str
    confidence: float
    recommendations: Optional[str] = None


class DeepVideoAnalysisRequest(BaseModel):
    media_id: str
    analysis_type: Optional[str] = "normal"


class DeepVideoAnalysisResponse(BaseModel):
    media_id: str
    detections: list
    summary: str
    threat_level: str
    confidence: float
    recommendations: Optional[str] = None


class LiveAnalysisLogResponse(BaseModel):
    id: int
    user_id: str
    session_id: Optional[str] = None
    context: Optional[str] = "ai_chat"
    role: str
    message: str
    is_voice: bool
    created_at: str

    @validator("created_at", pre=True)
    def convert_datetime(cls, v):
        if hasattr(v, "isoformat"):
            return v.isoformat()
        return str(v)

    class Config:
        from_attributes = True
