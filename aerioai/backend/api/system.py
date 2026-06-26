from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import psutil
import os
import platform
from datetime import datetime, timezone

from core.database import get_db, engine
from core.models import User, Mission, Media, AuditLog, UserRole
from core.security import get_current_user, require_role
from config import settings

router = APIRouter(prefix="/api/system", tags=["System"])


@router.get("/health")
def system_health(current_user: User = Depends(get_current_user)):
    """Full system health dashboard."""
    cpu_percent = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory()
    media_path = os.path.abspath(settings.MEDIA_PATH)
    os.makedirs(media_path, exist_ok=True)
    disk = psutil.disk_usage(media_path)

    return {
        "status": "operational",
        "timestamp": str(datetime.now(timezone.utc)),
        "cpu": {
            "percent": cpu_percent,
            "cores": psutil.cpu_count(),
        },
        "ram": {
            "total_gb": round(ram.total / (1024**3), 2),
            "used_gb": round(ram.used / (1024**3), 2),
            "available_gb": round(ram.available / (1024**3), 2),
            "percent": ram.percent,
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent,
            "warning": disk.percent > settings.MAX_STORAGE_PERCENT,
            "critical": disk.percent > settings.CLEANUP_PERCENT,
        },
        "system": {
            "os": platform.system(),
            "hostname": platform.node(),
            "python_version": platform.python_version(),
        },
        "services": {
            "database": _check_database(),
            "camera": _check_camera(),
            "flight_controller": _check_fc(),
            "gemini_api": _check_gemini(),
            "groq_api": _check_groq(),
        },
    }


def _check_database():
    try:
        engine.connect()
        return {"status": "online", "message": "Connected"}
    except Exception as e:
        return {"status": "offline", "message": str(e)}


def _check_camera():
    from services.camera_service import CameraService
    try:
        cam = CameraService()
        if cam.is_available():
            return {"status": "online", "message": "Camera available"}
        return {"status": "offline", "message": "Camera not detected"}
    except Exception as e:
        return {"status": "offline", "message": str(e)}


def _check_fc():
    from services.fc_service import FlightControllerService
    try:
        fc = FlightControllerService()
        if fc.is_connected():
            return {"status": "online", "message": "FC connected"}
        return {"status": "offline", "message": "FC not connected"}
    except Exception as e:
        return {"status": "offline", "message": str(e)}


def _check_gemini():
    if settings.GEMINI_API_KEY:
        return {"status": "configured", "message": "API key set"}
    return {"status": "not_configured", "message": "No API key"}


def _check_groq():
    if settings.GROQ_API_KEY:
        return {"status": "configured", "message": "API key set"}
    return {"status": "not_configured", "message": "No API key"}


@router.get("/stats")
def system_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dashboard statistics."""
    total_missions = db.query(Mission).count()
    active_missions = db.query(Mission).filter(Mission.status == "active").count()
    total_photos = db.query(Media).filter(Media.media_type == "photo").count()
    total_videos = db.query(Media).filter(Media.media_type == "video").count()
    total_audit_logs = db.query(AuditLog).count()

    media_path = os.path.abspath(settings.MEDIA_PATH)
    os.makedirs(media_path, exist_ok=True)
    disk = psutil.disk_usage(media_path)
    storage_percent = disk.percent

    return {
        "missions": {
            "total": total_missions,
            "active": active_missions,
            "completed": total_missions - active_missions,
        },
        "media": {
            "photos": total_photos,
            "videos": total_videos,
        },
        "storage": {
            "used_percent": storage_percent,
            "free_gb": round(disk.free / (1024**3), 2),
        },
        "audit_logs": total_audit_logs,
    }


@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Get system audit logs (Admin only)."""
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": db.query(AuditLog).count(),
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": str(log.created_at),
            }
            for log in logs
        ],
    }
