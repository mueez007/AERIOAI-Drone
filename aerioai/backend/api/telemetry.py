from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.models import User
from core.security import get_current_user
from services.fc_service import FlightControllerService

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])
fc_service = FlightControllerService()


@router.get("/")
def get_telemetry(current_user: User = Depends(get_current_user)):
    """Get current telemetry snapshot."""
    return fc_service.get_telemetry()


@router.get("/gps")
def get_gps(current_user: User = Depends(get_current_user)):
    """Get GPS-specific data."""
    telemetry = fc_service.get_telemetry()
    return {
        "lat": telemetry.get("gps_lat"),
        "lon": telemetry.get("gps_lon"),
        "alt": telemetry.get("altitude"),
        "speed": telemetry.get("ground_speed"),
        "heading": telemetry.get("heading"),
        "satellites": telemetry.get("satellites"),
        "fix_type": telemetry.get("fix_type"),
        "home_lat": telemetry.get("home_lat"),
        "home_lon": telemetry.get("home_lon"),
    }


@router.get("/attitude")
def get_attitude(current_user: User = Depends(get_current_user)):
    """Get drone orientation."""
    telemetry = fc_service.get_telemetry()
    return {
        "roll": telemetry.get("roll"),
        "pitch": telemetry.get("pitch"),
        "yaw": telemetry.get("yaw"),
        "heading": telemetry.get("heading"),
    }


@router.get("/battery")
def get_battery(current_user: User = Depends(get_current_user)):
    """Get battery status."""
    telemetry = fc_service.get_telemetry()
    return {
        "voltage": telemetry.get("battery_voltage"),
        "percentage": telemetry.get("battery_percent"),
        "current": telemetry.get("battery_current"),
        "mah_used": telemetry.get("mah_used"),
        "cell_count": telemetry.get("cell_count"),
    }


@router.get("/system")
def get_system_status(current_user: User = Depends(get_current_user)):
    """Get overall drone system status."""
    telemetry = fc_service.get_telemetry()
    return {
        "flight_mode": telemetry.get("flight_mode"),
        "armed": telemetry.get("armed"),
        "air_mode": telemetry.get("air_mode"),
        "failsafe": telemetry.get("failsafe"),
        "rth_active": telemetry.get("rth_active"),
        "waypoint_number": telemetry.get("waypoint_number"),
        "distance_to_home": telemetry.get("distance_to_home"),
    }


@router.websocket("/ws")
async def telemetry_websocket(websocket: WebSocket):
    """WebSocket for real-time telemetry streaming."""
    await websocket.accept()
    try:
        while True:
            telemetry = fc_service.get_telemetry()
            await websocket.send_json(telemetry)
            await websocket.receive_text()  # Wait for client acknowledgment
    except WebSocketDisconnect:
        print("Telemetry WebSocket disconnected")
    except Exception as e:
        print(f"Telemetry WebSocket error: {e}")
