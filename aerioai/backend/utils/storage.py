import os
import shutil
from datetime import datetime, timezone
from typing import List

from config import settings
from core.database import SessionLocal
from core.models import Media, Mission


def get_storage_stats():
    """Get current storage usage statistics."""
    media_path = settings.MEDIA_PATH
    total_size = 0
    file_count = 0

    for root, dirs, files in os.walk(media_path):
        for file in files:
            filepath = os.path.join(root, file)
            try:
                total_size += os.path.getsize(filepath)
                file_count += 1
            except OSError:
                pass

    return {
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "file_count": file_count,
        "base_path": media_path,
    }


def check_storage_alert() -> dict:
    """Check storage levels and return alert status."""
    import psutil

    disk = psutil.disk_usage(settings.MEDIA_PATH)
    percent = disk.percent

    alert = {
        "percent": percent,
        "level": "normal",
        "message": "Storage is normal",
    }

    if percent > settings.CLEANUP_PERCENT:
        alert["level"] = "critical"
        alert["message"] = f"Critical: Storage at {percent}%. Auto-cleanup triggered."
        auto_cleanup()
    elif percent > settings.MAX_STORAGE_PERCENT:
        alert["level"] = "warning"
        alert["message"] = f"Warning: Storage at {percent}%. Consider cleanup."

    return alert


def auto_cleanup():
    """Automatically delete oldest unpinned missions and their media."""
    db = SessionLocal()
    try:
        missions_to_delete = (
            db.query(Mission)
            .filter(Mission.is_pinned == 0)
            .order_by(Mission.created_at.asc())
            .limit(5)
            .all()
        )

        for mission in missions_to_delete:
            delete_mission_media(mission.id, db)
            db.delete(mission)

        db.commit()
        print(f"Auto-cleanup: deleted {len(missions_to_delete)} missions")
    except Exception as e:
        print(f"Auto-cleanup error: {e}")
        db.rollback()
    finally:
        db.close()


def delete_mission_media(mission_id: str, db):
    """Delete all media files for a mission."""
    media_items = db.query(Media).filter(Media.mission_id == mission_id).all()
    for media in media_items:
        if os.path.exists(media.filepath):
            os.remove(media.filepath)
        db.delete(media)


def delete_old_media(days: int = 30):
    """Delete media older than specified days (unpinned only)."""
    db = SessionLocal()
    try:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        old_media = (
            db.query(Media)
            .filter(Media.is_pinned == 0, Media.created_at < cutoff)
            .all()
        )

        for media in old_media:
            if os.path.exists(media.filepath):
                os.remove(media.filepath)
            db.delete(media)

        db.commit()
        return len(old_media)
    except Exception as e:
        print(f"Delete old media error: {e}")
        db.rollback()
        return 0
    finally:
        db.close()


def get_media_size(filepath: str) -> int:
    """Get file size in bytes."""
    try:
        return os.path.getsize(filepath)
    except OSError:
        return 0
