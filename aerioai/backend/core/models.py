from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
import uuid

from core.database import Base


def generate_id():
    return str(uuid.uuid4())[:8]


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"


class ThreatLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class MediaType(str, enum.Enum):
    PHOTO = "photo"
    VIDEO = "video"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_id)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OPERATOR)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    audit_logs = relationship("AuditLog", back_populates="user")


class Mission(Base):
    __tablename__ = "missions"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    status = Column(String, default="created")  # created, active, completed, aborted
    pilot_id = Column(String, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    distance_meters = Column(Float, nullable=True)
    avg_speed = Column(Float, nullable=True)
    max_altitude = Column(Float, nullable=True)
    gps_route = Column(JSON, nullable=True)  # List of {lat, lon, alt}
    total_objects_detected = Column(Integer, default=0)
    total_threats = Column(Integer, default=0)
    threat_score = Column(Float, default=0.0)
    coverage_score = Column(Float, default=0.0)
    mission_success = Column(Float, default=0.0)
    summary = Column(Text, nullable=True)
    is_pinned = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    pilot = relationship("User")
    media = relationship("Media", back_populates="mission")
    detections = relationship("Detection", back_populates="mission")
    events = relationship("MissionEvent", back_populates="mission")
    voice_logs = relationship("VoiceLog", back_populates="mission")


class Media(Base):
    __tablename__ = "media"

    id = Column(String, primary_key=True, default=generate_id)
    mission_id = Column(String, ForeignKey("missions.id"), nullable=True)
    media_type = Column(Enum(MediaType), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)  # For videos
    gps_lat = Column(Float, nullable=True)
    gps_lon = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    threat_level = Column(Enum(ThreatLevel), nullable=True)
    confidence = Column(Float, nullable=True)
    objects_detected = Column(JSON, nullable=True)  # [{class, count, confidence}]
    analysis_history = Column(JSON, default=list)
    is_pinned = Column(Integer, default=0)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    mission = relationship("Mission", back_populates="media")
    detections = relationship("Detection", back_populates="media")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(String, ForeignKey("missions.id"), nullable=False)
    media_id = Column(String, ForeignKey("media.id"), nullable=True)
    object_class = Column(String, nullable=False)
    count = Column(Integer, default=1)
    confidence = Column(Float, nullable=True)
    bbox = Column(JSON, nullable=True)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    mission = relationship("Mission", back_populates="detections")
    media = relationship("Media", back_populates="detections")


class MissionEvent(Base):
    __tablename__ = "mission_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(String, ForeignKey("missions.id"), nullable=False)
    event_type = Column(String, nullable=False)  # takeoff, landing, detection, alert, waypoint_reached
    description = Column(Text, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lon = Column(Float, nullable=True)
    event_metadata = Column("metadata", JSON, nullable=True)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    mission = relationship("Mission", back_populates="events")


class VoiceLog(Base):
    __tablename__ = "voice_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(String, ForeignKey("missions.id"), nullable=False)
    user_query = Column(Text, nullable=True)
    ai_response = Column(Text, nullable=True)
    audio_filepath = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    mission = relationship("Mission", back_populates="voice_logs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # login, mission_start, media_delete, etc.
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")

class LiveAnalysisLog(Base):
    __tablename__ = "live_analysis_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    session_id = Column(String, nullable=True)
    context = Column(String, default="ai_chat")
    role = Column(String, nullable=False) # 'user' or 'ai'
    message = Column(Text, nullable=False)
    is_voice = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
