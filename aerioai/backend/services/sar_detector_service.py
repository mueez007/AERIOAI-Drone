import os
import time
import math
import uuid
import threading
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any

import cv2
import numpy as np

from schemas.sar import (
    SARObservation,
    SARDetectorStatus,
    DetectionBBox,
    LiveDetectionItem,
    DetectionCounts,
    LiveDetectionsResponse,
)
from services.camera_service import shared_camera_service

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    YOLO = None
    ULTRALYTICS_AVAILABLE = False


class SARDetectorService:
    """Search & Rescue Person Detector, Instance Segmentation & ByteTrack Tracking Service.
    
    Features:
    1. Pretrained YOLO detector (YOLO26n / YOLOv8n) strictly class-filtered to person (class 0).
    2. Lazy-loaded instance segmentation model (YOLO26n-seg / YOLOv8n-seg) for human silhouette masking.
    3. Multi-frame person association via ByteTrack.
    4. Honest ground-plane geographic projection.
    5. Non-blocking background worker with thread-safe cached camera frame ingestion.
    """

    def __init__(self):
        # Models
        self.model_det = None
        self.model_seg = None
        self.model_name = "yolo26n.pt"
        self.model_version = "Ultralytics YOLO26n (Pretrained COCO)"
        self.segmentation_model_name: Optional[str] = None
        self.device = "cpu"

        # Lifecycle States
        self.status: str = "loading" if ULTRALYTICS_AVAILABLE else "unavailable"
        self.error_message: Optional[str] = None
        self.mask_status: str = "off"  # off, loading, active, unavailable
        self.is_mask_enabled: bool = False

        # General Object Detection (Vehicles + People)
        self.SUPPORTED_CLASSES = {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck",
        }
        self.is_object_detection_enabled: bool = False
        self.target_classes: List[int] = [0]  # default to class 0 (person)

        self._lock = threading.Lock()
        self._observations_lock = threading.Lock()
        self._latest_detections_lock = threading.Lock()

        # In-memory Observation Store
        # observation_id -> SARObservation
        self._observations: Dict[str, SARObservation] = {}
        # track_id -> observation_id mapping
        self._track_to_obs_id: Dict[int, str] = {}
        self._person_counter = 0

        # Fast live detections cache for responsive UI polling
        self._latest_detections: List[Dict[str, Any]] = []
        self._latest_frame_timestamp: float = 0.0

        # Performance Metrics
        self._inference_times: List[float] = []
        self._last_inference_timestamp = 0.0
        self._fps = 0.0

        # Live background processing state
        self._is_live_tracking_active = False
        self._worker_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        # Load primary detector
        self._initialize_detector()

    def _initialize_detector(self):
        """Load pretrained YOLO detection weights strictly for person detection (class 0)."""
        if not ULTRALYTICS_AVAILABLE:
            self.status = "unavailable"
            self.error_message = "ultralytics package is not installed."
            return

        try:
            weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "weights"))
            os.makedirs(weights_dir, exist_ok=True)
            primary_weights = os.path.join(weights_dir, "yolo26n.pt")
            fallback_weights = os.path.join(weights_dir, "yolov8n.pt")

            weights_to_load = primary_weights if os.path.exists(primary_weights) else "yolo26n.pt"
            try:
                self.model_det = YOLO(weights_to_load)
                self.model_name = "yolo26n.pt"
                self.model_version = "Ultralytics YOLO26n (Pretrained COCO)"
            except Exception as e_primary:
                print(f"[SAR] yolo26n load notice: {e_primary}, falling back to yolov8n.pt...")
                weights_to_load = fallback_weights if os.path.exists(fallback_weights) else "yolov8n.pt"
                self.model_det = YOLO(weights_to_load)
                self.model_name = "yolov8n.pt"
                self.model_version = "Ultralytics YOLOv8n (Pretrained COCO)"

            # Warm-up inference on a dummy frame
            dummy_frame = np.zeros((320, 320, 3), dtype=np.uint8)
            _ = self.model_det.predict(dummy_frame, classes=[0], verbose=False)

            self.status = "ready"
            self.error_message = None
            print(f"[SAR] Primary detector initialized: {self.model_version} on {self.device}")
        except Exception as e:
            self.status = "error"
            self.error_message = f"Detector model load failed: {str(e)}"
            self.model_det = None
            print(f"[SAR] Detector initialization error: {e}")

    def toggle_mask(self, enable: bool) -> bool:
        """Toggle human-shaped instance segmentation masking on/off.
        
        Lazy-loads yolo26n-seg.pt (or yolov8n-seg.pt) on first activation.
        Returns True if active, False otherwise.
        """
        if not enable:
            self.is_mask_enabled = False
            self.mask_status = "off"
            print("[SAR] Human mask disabled.")
            return False

        if not ULTRALYTICS_AVAILABLE:
            self.is_mask_enabled = False
            self.mask_status = "unavailable"
            print("[SAR] Human mask unavailable: ultralytics not installed.")
            return False

        if self.model_seg is not None:
            self.is_mask_enabled = True
            self.mask_status = "active"
            print("[SAR] Human mask enabled (using cached segmentation model).")
            return True

        # Lazy load segmentation model
        self.mask_status = "loading"
        print("[SAR] Loading instance segmentation model for human masks...")
        try:
            weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "weights"))
            os.makedirs(weights_dir, exist_ok=True)
            primary_seg = os.path.join(weights_dir, "yolo26n-seg.pt")
            fallback_seg = os.path.join(weights_dir, "yolov8n-seg.pt")

            weights_to_load = primary_seg if os.path.exists(primary_seg) else "yolo26n-seg.pt"
            try:
                self.model_seg = YOLO(weights_to_load)
                self.segmentation_model_name = "yolo26n-seg.pt"
            except Exception as e_seg_primary:
                print(f"[SAR] yolo26n-seg load notice: {e_seg_primary}, falling back to yolov8n-seg.pt...")
                weights_to_load = fallback_seg if os.path.exists(fallback_seg) else "yolov8n-seg.pt"
                self.model_seg = YOLO(weights_to_load)
                self.segmentation_model_name = "yolov8n-seg.pt"

            # Warm-up inference
            dummy_frame = np.zeros((320, 320, 3), dtype=np.uint8)
            _ = self.model_seg.predict(dummy_frame, classes=[0], verbose=False)

            self.is_mask_enabled = True
            self.mask_status = "active"
            print(f"[SAR] Segmentation model loaded successfully: {self.segmentation_model_name}")
            return True
        except Exception as e:
            print(f"[SAR] Segmentation model load failed: {e}")
            self.model_seg = None
            self.is_mask_enabled = False
            self.mask_status = "unavailable"
            return False

    def toggle_object_detection(self, enable: bool) -> bool:
        """Toggle general object detection (road vehicles) on/off.
        
        When off, detector strictly tracks class 0 (person).
        When on, detector tracks person (0) and vehicles (1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck).
        """
        self.is_object_detection_enabled = bool(enable)
        if self.is_object_detection_enabled:
            self.target_classes = list(self.SUPPORTED_CLASSES.keys())
            print("[SAR] General object detection enabled (person + vehicles).")
        else:
            self.target_classes = [0]
            print("[SAR] General object detection disabled (person only).")
        return self.is_object_detection_enabled

    def get_live_detections(self) -> LiveDetectionsResponse:
        """Return cached live detections for fast, low-latency UI polling."""
        with self._latest_detections_lock:
            # If detections are stale (> 3.0s without new frame inference), return empty detections list
            is_stale = (time.time() - self._latest_frame_timestamp) > 3.0 if self._latest_frame_timestamp > 0 else True
            dets = [] if is_stale else list(self._latest_detections)
            ts = self._latest_frame_timestamp

        persons = 0
        vehicles = 0
        items: List[LiveDetectionItem] = []
        for d in dets:
            label = d.get("label", "Detection")
            is_person = "Person" in label or d.get("class_id") == 0
            if is_person:
                persons += 1
            else:
                vehicles += 1

            items.append(
                LiveDetectionItem(
                    label=label,
                    confidence=d.get("confidence", 0.0),
                    bbox=d.get("bbox", [0.0, 0.0, 0.0, 0.0]),
                    mask_polygon=d.get("mask_polygon"),
                    track_id=d.get("track_id"),
                )
            )

        mean_ms = (
            sum(self._inference_times[-30:]) / len(self._inference_times[-30:]) * 1000.0
            if self._inference_times else 0.0
        )

        return LiveDetectionsResponse(
            detections=items,
            counts=DetectionCounts(
                persons=persons,
                vehicles=vehicles,
                total=persons + vehicles,
            ),
            inference_fps=round(self._fps, 1),
            mean_inference_ms=round(mean_ms, 1),
            is_tracking_active=self._is_live_tracking_active,
            mask_status=self.mask_status,
            is_mask_enabled=self.is_mask_enabled,
            is_object_detection_enabled=self.is_object_detection_enabled,
            timestamp=ts,
        )

    def get_status(self) -> SARDetectorStatus:
        """Return honest status of detector, tracker, and segmentation model."""
        with self._observations_lock:
            total_obs = len(self._observations)
            active_tracks = sum(
                1 for obs in self._observations.values()
                if obs.observation_status in ["tracking", "detected"]
            )

        mean_ms = (
            sum(self._inference_times[-30:]) / len(self._inference_times[-30:]) * 1000.0
            if self._inference_times else 0.0
        )

        active_classes_tracked = [
            self.SUPPORTED_CLASSES[c]
            for c in (self.target_classes if self.is_object_detection_enabled else [0])
            if c in self.SUPPORTED_CLASSES
        ]

        return SARDetectorStatus(
            status=self.status,
            model_name=self.model_name,
            model_version=self.model_version,
            classes_tracked=active_classes_tracked,
            device=self.device,
            inference_fps=round(self._fps, 1),
            mean_inference_ms=round(mean_ms, 1),
            is_live_tracking_active=self._is_live_tracking_active,
            total_observations_count=total_obs,
            active_tracks_count=active_tracks,
            error_message=self.error_message,
            mask_status=self.mask_status,
            is_mask_enabled=self.is_mask_enabled,
            segmentation_model_name=self.segmentation_model_name,
            is_object_detection_enabled=self.is_object_detection_enabled,
        )

    @property
    def is_live_tracking_active(self) -> bool:
        """Return True if background live tracking thread is actively looping."""
        return self._is_live_tracking_active

    # ─── Frame Inference & Tracking ─────────────────────────────────

    def detect_and_track(
        self,
        frame: np.ndarray,
        telemetry: Optional[Dict[str, Any]] = None,
        source_type: str = "actual_camera",
        conf_threshold: float = 0.25,
        mission_id: Optional[str] = None,
    ) -> List[SARObservation]:
        """Run ByteTrack tracking on a single frame and update observation records.
        
        If human masking is enabled, extracts polygon contours from segmentation masks.
        Handles zero, one, or multiple persons and vehicles entering/leaving defensively.
        """
        if frame is None or not isinstance(frame, np.ndarray):
            return []

        h, w = frame.shape[:2]
        if h == 0 or w == 0:
            return []

        active_model = self.model_seg if (self.is_mask_enabled and self.model_seg is not None) else self.model_det
        if active_model is None or self.status in ["unavailable", "error"]:
            return []

        active_classes = self.target_classes if self.is_object_detection_enabled else [0]

        t_start = time.time()
        self.status = "running"

        with self._lock:
            try:
                # Run ByteTrack multi-object tracking on active classes
                results = active_model.track(
                    source=frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    classes=active_classes,
                    conf=conf_threshold,
                    verbose=False,
                )
            except Exception as e:
                print(f"[SAR] Tracking inference error: {e}")
                self.status = "ready"
                return []

        duration = time.time() - t_start
        self._inference_times.append(duration)
        if len(self._inference_times) > 100:
            self._inference_times.pop(0)

        # Update FPS calculation
        now = time.time()
        if self._last_inference_timestamp > 0:
            dt = now - self._last_inference_timestamp
            if dt > 0:
                inst_fps = 1.0 / dt
                self._fps = 0.8 * self._fps + 0.2 * inst_fps if self._fps > 0 else inst_fps
        self._last_inference_timestamp = now
        self.status = "ready"

        current_frame_observations: List[SARObservation] = []
        current_active_track_ids = set()
        live_detections_batch: List[Dict[str, Any]] = []

        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None or len(boxes) == 0:
                continue

            # Extract segmentation masks if available
            masks = getattr(result, "masks", None)
            masks_xyn = getattr(masks, "xyn", None) if (masks is not None and self.is_mask_enabled) else None

            for i, box in enumerate(boxes):
                try:
                    cls_id = int(box.cls[0].item()) if box.cls is not None else 0
                    if cls_id not in active_classes:
                        continue

                    class_name = self.SUPPORTED_CLASSES.get(cls_id, "object")

                    conf = float(box.conf[0].item()) if box.conf is not None else 0.0
                    if conf < conf_threshold:
                        continue

                    # Defensive track ID extraction (handles tensor shapes, empty, or None safely)
                    track_id = None
                    if box.id is not None:
                        try:
                            track_id = int(box.id.view(-1)[0].item())
                        except Exception:
                            track_id = None

                    xyxy = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])

                    # Normalized bounding box for canvas HUD
                    norm_x = max(0.0, min(1.0, x1 / w))
                    norm_y = max(0.0, min(1.0, y1 / h))
                    norm_w = max(0.0, min(1.0, (x2 - x1) / w))
                    norm_h = max(0.0, min(1.0, (y2 - y1) / h))

                    # Human-shaped instance segmentation mask: extract ONLY for person (class 0)
                    mask_polygon: Optional[List[List[float]]] = None
                    if cls_id == 0 and masks_xyn is not None and i < len(masks_xyn):
                        pts = masks_xyn[i]
                        if pts is not None and len(pts) >= 3:
                            mask_polygon = [[round(float(p[0]), 4), round(float(p[1]), 4)] for p in pts]

                    bbox = DetectionBBox(
                        x1=round(x1, 1),
                        y1=round(y1, 1),
                        x2=round(x2, 1),
                        y2=round(y2, 1),
                        norm_x=round(norm_x, 4),
                        norm_y=round(norm_y, 4),
                        norm_w=round(norm_w, 4),
                        norm_h=round(norm_h, 4),
                        mask_polygon=mask_polygon,
                    )

                    if cls_id == 0:
                        if track_id is not None:
                            current_active_track_ids.add(track_id)

                        # Estimate ground location honestly for SAR person tracking
                        loc_res = self.estimate_ground_location(
                            bbox=bbox,
                            telemetry=telemetry,
                            img_width=w,
                            img_height=h,
                            source_type=source_type,
                        )

                        # Record or update observation in SAR store
                        obs = self._record_or_update_observation(
                            track_id=track_id,
                            confidence=conf,
                            bbox=bbox,
                            mask_polygon=mask_polygon,
                            location_res=loc_res,
                            source_type=source_type,
                            mission_id=mission_id,
                            timestamp=now,
                        )
                        current_frame_observations.append(obs)
                        live_label = obs.label
                    else:
                        cap_name = class_name.capitalize()
                        live_label = f"{cap_name} #{track_id}" if track_id is not None else cap_name

                    live_detections_batch.append({
                        "label": live_label,
                        "class_id": cls_id,
                        "class_name": class_name,
                        "confidence": round(conf, 3),
                        "bbox": [round(norm_x, 4), round(norm_y, 4), round(norm_w, 4), round(norm_h, 4)],
                        "mask_polygon": mask_polygon,
                        "track_id": track_id,
                    })
                except Exception as box_err:
                    print(f"[SAR] Box parsing error: {box_err}")
                    continue

        with self._latest_detections_lock:
            self._latest_detections = live_detections_batch
            self._latest_frame_timestamp = now

        # Update statuses of tracks no longer seen in this frame
        self._update_lost_tracks(current_active_track_ids, current_time=now)

        return current_frame_observations

    # ─── Observation Store Management ───────────────────────────────

    def _record_or_update_observation(
        self,
        track_id: Optional[int],
        confidence: float,
        bbox: DetectionBBox,
        mask_polygon: Optional[List[List[float]]] = None,
        location_res: Optional[Dict[str, Any]] = None,
        source_type: str = "actual_camera",
        mission_id: Optional[str] = None,
        timestamp: Optional[float] = None,
    ) -> SARObservation:
        """Create or update a persistent person observation record."""
        ts = timestamp if timestamp is not None else time.time()
        time_str = datetime.fromtimestamp(ts).strftime("%I:%M:%S %p")
        loc_res = location_res or {}

        with self._observations_lock:
            # Check if track_id maps to existing observation
            obs_id = None
            if track_id is not None and track_id in self._track_to_obs_id:
                obs_id = self._track_to_obs_id[track_id]

            if obs_id and obs_id in self._observations:
                existing = self._observations[obs_id]
                updated = SARObservation(
                    observation_id=existing.observation_id,
                    mission_id=mission_id or existing.mission_id,
                    track_id=track_id,
                    label=existing.label,
                    detection_confidence=round(confidence, 3),
                    bounding_box=bbox,
                    mask_polygon=mask_polygon,
                    frame_timestamp=ts,
                    first_seen_at=existing.first_seen_at,
                    last_seen_at=time_str,
                    observation_status="tracking" if track_id is not None else "detected",
                    latitude=loc_res.get("latitude"),
                    longitude=loc_res.get("longitude"),
                    location_method=loc_res.get("location_method", "unavailable"),
                    location_uncertainty_m=loc_res.get("location_uncertainty_m"),
                    location_status=loc_res.get("location_status", "unavailable"),
                    source_type=source_type,
                    telemetry_timestamp=loc_res.get("telemetry_timestamp"),
                    notes=loc_res.get("notes") or existing.notes,
                )
                self._observations[obs_id] = updated
                return updated
            else:
                # New observation
                self._person_counter += 1
                new_id = f"obs_sar_{self._person_counter:02d}_{uuid.uuid4().hex[:6]}"
                label = f"Person {self._person_counter:02d}"

                new_obs = SARObservation(
                    observation_id=new_id,
                    mission_id=mission_id,
                    track_id=track_id,
                    label=label,
                    detection_confidence=round(confidence, 3),
                    bounding_box=bbox,
                    mask_polygon=mask_polygon,
                    frame_timestamp=ts,
                    first_seen_at=time_str,
                    last_seen_at=time_str,
                    observation_status="tracking" if track_id is not None else "detected",
                    latitude=loc_res.get("latitude"),
                    longitude=loc_res.get("longitude"),
                    location_method=loc_res.get("location_method", "unavailable"),
                    location_uncertainty_m=loc_res.get("location_uncertainty_m"),
                    location_status=loc_res.get("location_status", "unavailable"),
                    source_type=source_type,
                    telemetry_timestamp=loc_res.get("telemetry_timestamp"),
                    notes=loc_res.get("notes"),
                )
                self._observations[new_id] = new_obs
                if track_id is not None:
                    self._track_to_obs_id[track_id] = new_id
                return new_obs

    def _update_lost_tracks(self, active_track_ids: set, current_time: float):
        """Update statuses of past tracks (stale, track_lost) without deleting records."""
        with self._observations_lock:
            for obs in self._observations.values():
                if obs.track_id is not None and obs.track_id not in active_track_ids:
                    age = current_time - obs.frame_timestamp
                    if age > 15.0:
                        obs.observation_status = "track_lost"
                    elif age > 4.0:
                        obs.observation_status = "stale"

    def get_observations(self) -> List[SARObservation]:
        """Return all persistent observations sorted by latest sighting."""
        with self._observations_lock:
            return sorted(
                list(self._observations.values()),
                key=lambda x: x.frame_timestamp,
                reverse=True,
            )

    def clear_observations(self):
        """Reset observation store and live detections cache."""
        with self._observations_lock:
            self._observations.clear()
            self._track_to_obs_id.clear()
            self._person_counter = 0
        with self._latest_detections_lock:
            self._latest_detections.clear()
            self._latest_frame_timestamp = 0.0

    # ─── Honest Ground-Plane Location Estimation ────────────────────

    @staticmethod
    def estimate_ground_location(
        bbox: DetectionBBox,
        telemetry: Optional[Dict[str, Any]],
        img_width: int,
        img_height: int,
        source_type: str = "actual_camera",
    ) -> Dict[str, Any]:
        """Estimate person's geographic ground coordinate using calibrated geometry."""
        unavailable_result = {
            "latitude": None,
            "longitude": None,
            "location_method": "unavailable",
            "location_uncertainty_m": None,
            "location_status": "unavailable",
            "telemetry_timestamp": None,
            "notes": "Location unavailable: Camera calibration or altitude AGL missing.",
        }

        if not telemetry:
            return unavailable_result

        # Validate GPS coordinate
        lat = telemetry.get("latitude") or telemetry.get("lat") or telemetry.get("gps_lat")
        lon = telemetry.get("longitude") or telemetry.get("lon") or telemetry.get("gps_lon")
        if lat is None or lon is None or (abs(lat) < 1e-4 and abs(lon) < 1e-4):
            unavailable_result["notes"] = "Location unavailable: Invalid or missing drone GPS coordinates."
            return unavailable_result

        # Validate Altitude AGL
        alt_agl = telemetry.get("altitude_agl") or telemetry.get("relative_altitude") or telemetry.get("alt")
        if alt_agl is None or alt_agl < 1.0:
            unavailable_result["notes"] = "Location unavailable: Altitude AGL unavailable."
            return unavailable_result

        # Validate Heading
        heading = telemetry.get("heading")
        if heading is None:
            heading = telemetry.get("yaw", 0.0)

        # Validate Camera Gimbal Pitch
        gimbal_pitch = telemetry.get("gimbal_pitch", -90.0)
        hfov_deg = telemetry.get("camera_hfov_deg", 78.0)
        vfov_deg = telemetry.get("camera_vfov_deg", 54.0)

        # Detection ground contact point (feet)
        u_c = bbox.norm_x + bbox.norm_w / 2.0
        v_bottom = bbox.norm_y + bbox.norm_h

        hfov_rad = math.radians(hfov_deg)
        vfov_rad = math.radians(vfov_deg)

        alpha_x = (u_c - 0.5) * hfov_rad
        alpha_y = -(v_bottom - 0.5) * vfov_rad

        pitch_rad = math.radians(gimbal_pitch)
        total_pitch = pitch_rad + alpha_y

        if total_pitch >= math.radians(-2.0):
            unavailable_result["notes"] = "Location unavailable: Detection line of sight does not intersect ground."
            return unavailable_result

        theta_look_down = abs(total_pitch)
        ground_distance_m = alt_agl / math.tan(theta_look_down)

        drone_heading_rad = math.radians(heading)
        bearing_rad = drone_heading_rad + alpha_x

        delta_n = ground_distance_m * math.cos(bearing_rad)
        delta_e = ground_distance_m * math.sin(bearing_rad)

        lat_rad = math.radians(lat)
        meters_per_lat_deg = 111132.954 - 559.822 * math.cos(2 * lat_rad)
        meters_per_lon_deg = 111412.84 * math.cos(lat_rad)

        if meters_per_lon_deg < 1.0:
            return unavailable_result

        est_lat = lat + (delta_n / meters_per_lat_deg)
        est_lon = lon + (delta_e / meters_per_lon_deg)

        if not (-90.0 <= est_lat <= 90.0 and -180.0 <= est_lon <= 180.0):
            return unavailable_result

        # Error propagation for uncertainty radius
        sigma_gps = 3.5
        sigma_h = 1.5
        sigma_theta = math.radians(2.0)
        var_dist = (sigma_gps ** 2) + ((1.0 / math.tan(theta_look_down) * sigma_h) ** 2) + ((alt_agl / (math.sin(theta_look_down) ** 2) * sigma_theta) ** 2)
        uncertainty_m = math.sqrt(var_dist)

        return {
            "latitude": round(est_lat, 7),
            "longitude": round(est_lon, 7),
            "location_method": "ground_plane_pinhole",
            "location_uncertainty_m": round(min(uncertainty_m, 150.0), 1),
            "location_status": "estimated",
            "telemetry_timestamp": telemetry.get("timestamp", time.time()),
            "notes": f"Estimated via pinhole ground projection. AGL={alt_agl:.1f}m, Pitch={gimbal_pitch:.1f}°, Distance={ground_distance_m:.1f}m.",
        }

    # ─── Live Camera Inference Worker Loop ──────────────────────────

    def start_live_tracking(self, cadence_hz: float = 3.0) -> Dict[str, Any]:
        """Start non-blocking background frame inference at bounded cadence."""
        if self._is_live_tracking_active:
            return {"is_running": True, "cadence_hz": cadence_hz, "message": "Already running"}

        self._stop_event.clear()
        self._is_live_tracking_active = True
        shared_camera_service.set_sar_active(True)

        def _worker():
            interval = 1.0 / max(0.5, min(10.0, cadence_hz))
            print(f"[SAR] Live tracking worker started at {cadence_hz:.1f} Hz cadence.")
            while not self._stop_event.is_set():
                t_loop = time.time()
                try:
                    # Retrieve cached raw frame without competing for hardware lock
                    raw_frame = shared_camera_service.get_current_raw_frame(copy=True)
                    if raw_frame is not None:
                        from api.telemetry import get_latest_telemetry
                        telemetry_data = get_latest_telemetry()

                        self.detect_and_track(
                            frame=raw_frame,
                            telemetry=telemetry_data,
                            source_type="actual_camera",
                            conf_threshold=0.25,
                        )
                except Exception as e:
                    print(f"[SAR] Background tracking loop exception: {e}")

                elapsed = time.time() - t_loop
                sleep_time = max(0.01, interval - elapsed)
                self._stop_event.wait(timeout=sleep_time)

            self._is_live_tracking_active = False
            shared_camera_service.set_sar_active(False)
            print("[SAR] Live tracking worker stopped cleanly.")

        self._worker_thread = threading.Thread(target=_worker, daemon=True, name="SARTrackingWorker")
        self._worker_thread.start()
        return {"is_running": True, "cadence_hz": cadence_hz, "message": "Worker started"}

    def stop_live_tracking(self) -> Dict[str, Any]:
        """Stop background frame inference safely."""
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=1.5)
        self._is_live_tracking_active = False
        shared_camera_service.set_sar_active(False)
        return {"is_running": False, "message": "Worker stopped"}


# Shared SAR detector service instance
sar_detector_service = SARDetectorService()
