import os
import cv2
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from core.security import get_current_user
from schemas.sar import (
    SARObservation,
    SARDetectorStatus,
    LiveDetectionsResponse,
    KMLValidationRequest,
    KMLValidationResponse,
    CoverageRouteRequest,
    CoverageRouteResponse,
    PolygonCoordinate,
)
from services.sar_detector_service import sar_detector_service
from services.kml_service import KMLCoverageService
from services.camera_service import shared_camera_service
from api.telemetry import get_latest_telemetry

router = APIRouter(prefix="/api/sar", tags=["Search & Rescue"])


@router.get("/status", response_model=SARDetectorStatus)
def get_detector_status(current_user: Optional[User] = Depends(get_current_user)):
    """Return detector availability, loaded model metadata, FPS, and tracking state."""
    return sar_detector_service.get_status()


@router.post("/status/live-tracking")
def toggle_live_tracking(
    action: str = Query(..., pattern="^(start|stop)$"),
    cadence_hz: float = Query(3.0, ge=0.5, le=10.0),
    current_user: User = Depends(get_current_user),
):
    """Start or stop the non-blocking background frame inference worker."""
    if action == "start":
        sar_detector_service.start_live_tracking(cadence_hz=cadence_hz)
        return {"status": "started", "cadence_hz": cadence_hz}
    else:
        sar_detector_service.stop_live_tracking()
        return {"status": "stopped"}


@router.post("/status/mask")
def toggle_mask(
    action: str = Query(..., pattern="^(on|off)$"),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Toggle human-shaped instance segmentation silhouette masking on or off."""
    enabled = (action == "on")
    is_active = sar_detector_service.toggle_mask(enabled)
    status = sar_detector_service.get_status()
    return {
        "is_mask_enabled": is_active,
        "mask_status": status.mask_status,
        "segmentation_model": status.segmentation_model_name,
    }


@router.post("/status/object-detection")
def toggle_object_detection(
    action: str = Query(..., pattern="^(on|off)$"),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Toggle general object detection (vehicles: car, bus, truck, motorcycle, bicycle) on or off."""
    enabled = (action == "on")
    is_active = sar_detector_service.toggle_object_detection(enabled)
    status = sar_detector_service.get_status()
    return {
        "is_object_detection_enabled": is_active,
        "classes_tracked": status.classes_tracked,
    }


@router.get("/detections/live", response_model=LiveDetectionsResponse)
def get_live_detections(current_user: Optional[User] = Depends(get_current_user)):
    """Return fast, low-latency live detections and measured counts for real-time UI rendering."""
    return sar_detector_service.get_live_detections()


@router.get("/observations", response_model=List[SARObservation])
def get_observations(current_user: Optional[User] = Depends(get_current_user)):
    """Return all persistent Search & Rescue person observations."""
    return sar_detector_service.get_observations()


@router.delete("/observations")
def clear_observations(current_user: User = Depends(get_current_user)):
    """Reset the observation store."""
    sar_detector_service.clear_observations()
    return {"message": "SAR observation store cleared."}


@router.post("/detect", response_model=List[SARObservation])
async def detect_image(
    file: Optional[UploadFile] = File(None),
    conf_threshold: float = Form(0.25),
    use_telemetry: bool = Form(True),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Run person detection & tracking on an uploaded test image or camera snapshot.
    
    Associated with honest ground-plane estimation when telemetry is valid.
    """
    if file:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image file or format.")
        source_type = "uploaded_test_image"
    else:
        # Pull live frame from shared camera service
        frame = shared_camera_service.get_current_raw_frame(copy=True)
        if frame is None:
            raise HTTPException(status_code=503, detail="Camera frame unavailable.")
        source_type = "actual_camera"

    telemetry_data = get_latest_telemetry() if use_telemetry else None

    observations = sar_detector_service.detect_and_track(
        frame=frame,
        telemetry=telemetry_data,
        source_type=source_type,
        conf_threshold=conf_threshold,
    )
    return observations


@router.post("/kml/validate", response_model=KMLValidationResponse)
async def validate_kml(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Validate KML/GeoJSON boundary geometry and calculate area & perimeter."""
    content_str = ""
    if file:
        raw_bytes = await file.read()
        try:
            content_str = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File must be valid UTF-8 text.")
    elif raw_content:
        content_str = raw_content
    else:
        raise HTTPException(status_code=400, detail="Either file or raw_content must be provided.")

    try:
        coords, warnings = KMLCoverageService.parse_kml_or_geojson(content_str)
        res = KMLCoverageService.validate_polygon(coords)
        if warnings:
            res.warnings.extend(warnings)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KML validation error: {str(e)}")


@router.post("/routes/generate", response_model=CoverageRouteResponse)
def generate_coverage_route(
    request: CoverageRouteRequest,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate previewable lawnmower coverage route inside a search perimeter.
    
    SAFETY LOCK: Autonomous execution is disabled. Route is for display and planning only.
    """
    return KMLCoverageService.generate_lawnmower_route(
        polygon_coords=request.polygon,
        track_spacing_m=request.track_spacing_m,
        flight_altitude_m=request.flight_altitude_m,
        sweep_angle_deg=request.sweep_angle_deg,
        boundary_margin_m=request.boundary_margin_m,
        drone_speed_mps=request.drone_speed_mps,
    )
