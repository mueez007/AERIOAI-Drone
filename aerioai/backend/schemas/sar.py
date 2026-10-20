from typing import List, Optional, Tuple, Literal
from pydantic import BaseModel, Field


class DetectionBBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    # Normalized coordinates 0.0 - 1.0 for rendering over responsive canvases
    norm_x: float
    norm_y: float
    norm_w: float
    norm_h: float
    mask_polygon: Optional[List[List[float]]] = None


class RawDetection(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: DetectionBBox
    track_id: Optional[int] = None


class SARObservation(BaseModel):
    observation_id: str
    mission_id: Optional[str] = None
    track_id: Optional[int] = None
    label: str  # e.g., "Person 01", "Person 02"
    detection_confidence: float
    bounding_box: DetectionBBox
    mask_polygon: Optional[List[List[float]]] = None
    frame_timestamp: float
    first_seen_at: str
    last_seen_at: str
    observation_status: Literal["detected", "tracking", "stale", "track_lost", "unverified"]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_method: Literal[
        "direct_calibrated_projection",
        "ground_plane_pinhole",
        "unavailable",
        "simulated_fixture",
    ]
    location_uncertainty_m: Optional[float] = None
    location_status: Literal["unavailable", "estimated", "validated"]
    source_type: Literal["actual_camera", "uploaded_test_image", "simulated_fixture"]
    telemetry_timestamp: Optional[float] = None
    notes: Optional[str] = None


class SARDetectorStatus(BaseModel):
    status: Literal["loading", "ready", "running", "unavailable", "error"]
    model_name: str
    model_version: str
    classes_tracked: List[str]
    device: str
    inference_fps: float
    mean_inference_ms: float
    is_live_tracking_active: bool
    total_observations_count: int
    active_tracks_count: int
    error_message: Optional[str] = None
    mask_status: Literal["off", "loading", "active", "unavailable"] = "off"
    is_mask_enabled: bool = False
    segmentation_model_name: Optional[str] = None
    is_object_detection_enabled: bool = False


class LiveDetectionItem(BaseModel):
    label: str
    confidence: float
    bbox: List[float]  # [norm_x, norm_y, norm_w, norm_h]
    mask_polygon: Optional[List[List[float]]] = None
    track_id: Optional[int] = None


class DetectionCounts(BaseModel):
    persons: int = 0
    vehicles: int = 0
    total: int = 0


class LiveDetectionsResponse(BaseModel):
    detections: List[LiveDetectionItem] = []
    counts: DetectionCounts = DetectionCounts()
    inference_fps: float = 0.0
    mean_inference_ms: float = 0.0
    is_tracking_active: bool = False
    mask_status: Literal["off", "loading", "active", "unavailable"] = "off"
    is_mask_enabled: bool = False
    is_object_detection_enabled: bool = False
    timestamp: float = 0.0


class KMLValidationRequest(BaseModel):
    kml_content: Optional[str] = None
    geojson_content: Optional[str] = None


class PolygonCoordinate(BaseModel):
    lat: float
    lon: float


class KMLValidationResponse(BaseModel):
    is_valid: bool
    message: str
    coordinates: List[PolygonCoordinate]
    center: PolygonCoordinate
    area_sq_meters: float
    perimeter_meters: float
    warnings: List[str] = []


class CoverageRouteRequest(BaseModel):
    polygon: List[PolygonCoordinate]
    track_spacing_m: float = Field(default=25.0, ge=5.0, le=200.0)
    flight_altitude_m: float = Field(default=40.0, ge=10.0, le=150.0)
    sweep_angle_deg: float = Field(default=0.0, ge=0.0, le=360.0)
    boundary_margin_m: float = Field(default=3.0, ge=0.0, le=50.0)
    drone_speed_mps: float = Field(default=5.0, ge=1.0, le=20.0)


class RouteWaypoint(BaseModel):
    order: int
    lat: float
    lon: float
    alt_m: float
    waypoint_type: Literal["turn", "survey_pass", "entry", "exit"]
    leg_distance_m: float


class CoverageRouteResponse(BaseModel):
    is_generated: bool
    message: str
    waypoints: List[RouteWaypoint]
    total_distance_m: float
    estimated_flight_seconds: float
    turn_count: int
    swath_width_m: float
    track_spacing_m: float
    flight_altitude_m: float
    warnings: List[str] = []
    # Explicit safety indicator: Autonomous execution disabled
    autonomous_flight_enabled: bool = False
