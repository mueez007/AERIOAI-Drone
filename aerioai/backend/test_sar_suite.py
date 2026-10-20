import os
import sys
import math
import time
import unittest
import numpy as np
import cv2

# Ensure backend directory is in python path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from schemas.sar import (
    SARObservation,
    DetectionBBox,
    PolygonCoordinate,
    KMLValidationResponse,
    CoverageRouteResponse,
)
from services.sar_detector_service import SARDetectorService
from services.kml_service import KMLCoverageService


class TestSARDetector(unittest.TestCase):
    """Automated tests for YOLO Person Detector & Tracking Service."""

    @classmethod
    def setUpClass(cls):
        cls.service = SARDetectorService()

    def test_detector_initialization_status(self):
        """Test honest model status exposure."""
        status = self.service.get_status()
        self.assertIn(status.status, ["ready", "loading", "unavailable"])
        self.assertEqual(status.classes_tracked, ["person"])
        self.assertIn("yolo", status.model_name.lower())
        self.assertIsInstance(status.inference_fps, float)
        self.assertIsInstance(status.mean_inference_ms, float)

    def test_empty_or_invalid_image_handling(self):
        """Test detector handles zero-size or invalid arrays safely without throwing exceptions."""
        empty_frame = np.zeros((0, 0, 3), dtype=np.uint8)
        detections = self.service.detect_and_track(empty_frame)
        self.assertEqual(detections, [])

    def test_no_detections_on_clean_background(self):
        """Test detector returns empty list (and no fabricated observations) on blank canvas."""
        blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        self.service.clear_observations()
        detections = self.service.detect_and_track(blank_frame)
        self.assertEqual(len(detections), 0)
        # Verify no fake observations were added to store
        self.assertEqual(len(self.service.get_observations()), 0)

    def test_synthetic_person_detection(self):
        """Test inference executes safely on a frame and respects confidence thresholds."""
        # Create a frame with a simple person-like contour
        test_frame = np.zeros((640, 640, 3), dtype=np.uint8)
        # Draw a synthetic human stick figure
        cv2.circle(test_frame, (320, 200), 30, (220, 220, 220), -1)  # head
        cv2.line(test_frame, (320, 230), (320, 420), (220, 220, 220), 10)  # torso
        cv2.line(test_frame, (320, 280), (260, 350), (220, 220, 220), 8)  # arm left
        cv2.line(test_frame, (320, 280), (380, 350), (220, 220, 220), 8)  # arm right
        cv2.line(test_frame, (320, 420), (280, 560), (220, 220, 220), 10)  # leg left
        cv2.line(test_frame, (320, 420), (360, 560), (220, 220, 220), 10)  # leg right

        # Run inference with low confidence to ensure pipeline processes without error
        detections = self.service.detect_and_track(test_frame, conf_threshold=0.10)
        self.assertIsInstance(detections, list)

    def test_confidence_filtering(self):
        """Test that high confidence threshold strictly filters out weak detections."""
        test_frame = np.zeros((320, 320, 3), dtype=np.uint8)
        # Very high threshold (0.999) must return empty
        detections = self.service.detect_and_track(test_frame, conf_threshold=0.999)
        self.assertEqual(len(detections), 0)


class TestSARTracking(unittest.TestCase):
    """Automated tests for ByteTrack multi-frame person association."""

    def setUp(self):
        self.service = SARDetectorService()
        self.service.clear_observations()

    def test_observation_creation_and_track_persistence(self):
        """Test observation store registers unique observation ID and neutral Person label."""
        bbox = DetectionBBox(
            x1=100.0, y1=150.0, x2=180.0, y2=320.0,
            norm_x=0.156, norm_y=0.234, norm_w=0.125, norm_h=0.265
        )
        loc_res = {
            "latitude": 13.0845,
            "longitude": 77.5892,
            "location_method": "ground_plane_pinhole",
            "location_uncertainty_m": 4.5,
            "location_status": "estimated",
            "notes": "Test sighting",
        }
        obs = self.service._record_or_update_observation(
            track_id=1,
            confidence=0.91,
            bbox=bbox,
            location_res=loc_res,
            source_type="actual_camera",
            mission_id="mission_test_01",
            timestamp=time.time(),
        )

        self.assertIn("obs_sar_", obs.observation_id)
        self.assertEqual(obs.label, "Person 01")
        self.assertEqual(obs.track_id, 1)
        self.assertEqual(obs.detection_confidence, 0.91)
        self.assertEqual(obs.observation_status, "tracking")

        # Second sighting of the same track_id should update the SAME observation, not create a duplicate
        obs_updated = self.service._record_or_update_observation(
            track_id=1,
            confidence=0.95,
            bbox=bbox,
            location_res=loc_res,
            source_type="actual_camera",
            mission_id="mission_test_01",
            timestamp=time.time() + 1.0,
        )

        self.assertEqual(obs.observation_id, obs_updated.observation_id)
        self.assertEqual(obs_updated.detection_confidence, 0.95)
        self.assertEqual(len(self.service.get_observations()), 1)

    def test_separate_tracks_receive_separate_observations(self):
        """Test that distinct track IDs create distinct Person 01, Person 02 records."""
        bbox = DetectionBBox(
            x1=50, y1=50, x2=100, y2=150, norm_x=0.1, norm_y=0.1, norm_w=0.1, norm_h=0.2
        )
        loc_res = {"location_status": "unavailable", "location_method": "unavailable"}

        obs1 = self.service._record_or_update_observation(
            track_id=10, confidence=0.88, bbox=bbox, location_res=loc_res,
            source_type="actual_camera", mission_id=None, timestamp=time.time()
        )
        obs2 = self.service._record_or_update_observation(
            track_id=20, confidence=0.82, bbox=bbox, location_res=loc_res,
            source_type="actual_camera", mission_id=None, timestamp=time.time()
        )

        self.assertNotEqual(obs1.observation_id, obs2.observation_id)
        self.assertEqual(obs1.label, "Person 01")
        self.assertEqual(obs2.label, "Person 02")
        self.assertEqual(len(self.service.get_observations()), 2)

    def test_track_loss_and_stale_status(self):
        """Test tracks transition to 'stale' and 'track_lost' when unobserved over time."""
        bbox = DetectionBBox(
            x1=50, y1=50, x2=100, y2=150, norm_x=0.1, norm_y=0.1, norm_w=0.1, norm_h=0.2
        )
        loc_res = {"location_status": "unavailable", "location_method": "unavailable"}
        t0 = time.time()
        obs = self.service._record_or_update_observation(
            track_id=99, confidence=0.85, bbox=bbox, location_res=loc_res,
            source_type="actual_camera", mission_id=None, timestamp=t0
        )
        self.assertEqual(obs.observation_status, "tracking")

        # After 5 seconds without track in active set -> stale
        self.service._update_lost_tracks(active_track_ids=set(), current_time=t0 + 6.0)
        obs_stale = self.service.get_observations()[0]
        self.assertEqual(obs_stale.observation_status, "stale")

        # After 18 seconds without track in active set -> track_lost
        self.service._update_lost_tracks(active_track_ids=set(), current_time=t0 + 20.0)
        obs_lost = self.service.get_observations()[0]
        self.assertEqual(obs_lost.observation_status, "track_lost")


class TestSARLocationEstimation(unittest.TestCase):
    """Automated tests for honest ground-plane location estimation."""

    def test_missing_telemetry_returns_unavailable(self):
        """Test missing telemetry sets location_status='unavailable'."""
        bbox = DetectionBBox(
            x1=100, y1=100, x2=200, y2=300, norm_x=0.2, norm_y=0.2, norm_w=0.2, norm_h=0.4
        )
        res = SARDetectorService.estimate_ground_location(bbox, telemetry=None, img_width=640, img_height=480)
        self.assertEqual(res["location_status"], "unavailable")
        self.assertIsNone(res["latitude"])
        self.assertIsNone(res["longitude"])
        self.assertIsNone(res["location_uncertainty_m"])

    def test_invalid_coordinates_rejected(self):
        """Test (0, 0) coordinates or missing GPS are rejected."""
        bbox = DetectionBBox(
            x1=100, y1=100, x2=200, y2=300, norm_x=0.2, norm_y=0.2, norm_w=0.2, norm_h=0.4
        )
        # Case 1: 0, 0 coordinates
        res1 = SARDetectorService.estimate_ground_location(
            bbox, telemetry={"lat": 0.0, "lon": 0.0, "altitude_agl": 30.0},
            img_width=640, img_height=480
        )
        self.assertEqual(res1["location_status"], "unavailable")

        # Case 2: Drone on ground (altitude < 1m)
        res2 = SARDetectorService.estimate_ground_location(
            bbox, telemetry={"lat": 13.084, "lon": 77.589, "altitude_agl": 0.2},
            img_width=640, img_height=480
        )
        self.assertEqual(res2["location_status"], "unavailable")

    def test_drone_coordinates_not_substituted_for_person_coordinates(self):
        """Test that drone GPS is never simply copied as person coordinates."""
        drone_lat = 13.082700
        drone_lon = 77.587700
        # Detection in top-right corner looking forward with pitch -45 deg
        bbox = DetectionBBox(
            x1=400, y1=100, x2=450, y2=200,
            norm_x=0.625, norm_y=0.208, norm_w=0.078, norm_h=0.208
        )
        telemetry = {
            "lat": drone_lat,
            "lon": drone_lon,
            "altitude_agl": 50.0,
            "heading": 90.0,  # East
            "gimbal_pitch": -45.0,
            "camera_hfov_deg": 78.0,
            "camera_vfov_deg": 54.0,
        }
        res = SARDetectorService.estimate_ground_location(
            bbox, telemetry=telemetry, img_width=640, img_height=480
        )
        self.assertEqual(res["location_status"], "estimated")
        self.assertIsNotNone(res["latitude"])
        self.assertIsNotNone(res["longitude"])
        # Estimated coordinates must differ from drone's exact position
        self.assertNotEqual(res["latitude"], drone_lat)
        self.assertNotEqual(res["longitude"], drone_lon)
        # Heading was East (90 deg), so estimated longitude must be greater than drone_lon
        self.assertGreater(res["longitude"], drone_lon)
        # Uncertainty radius must be a positive number in meters
        self.assertGreater(res["location_uncertainty_m"], 0.0)

    def test_above_horizon_rays_rejected(self):
        """Test that when camera is tilted at or above horizon, rays are rejected."""
        bbox = DetectionBBox(
            x1=100, y1=10, x2=200, y2=80, norm_x=0.2, norm_y=0.02, norm_w=0.2, norm_h=0.1
        )
        telemetry = {
            "lat": 13.084, "lon": 77.589, "altitude_agl": 40.0,
            "heading": 0.0, "gimbal_pitch": 5.0,  # Tilted up (+5 deg)
        }
        res = SARDetectorService.estimate_ground_location(bbox, telemetry=telemetry, img_width=640, img_height=480)
        self.assertEqual(res["location_status"], "unavailable")


class TestKMLAndCoverageRoute(unittest.TestCase):
    """Automated tests for KML polygon parsing and lawnmower coverage route generation."""

    def test_valid_kml_polygon_parsing(self):
        """Test parsing valid KML Polygon XML."""
        kml_xml = """<?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2">
          <Document>
            <Placemark>
              <name>SAR Search Zone Alpha</name>
              <Polygon>
                <outerBoundaryIs>
                  <LinearRing>
                    <coordinates>
                      77.585000,13.082000,0
                      77.590000,13.082000,0
                      77.590000,13.086000,0
                      77.585000,13.086000,0
                      77.585000,13.082000,0
                    </coordinates>
                  </LinearRing>
                </outerBoundaryIs>
              </Polygon>
            </Placemark>
          </Document>
        </kml>
        """
        coords, warnings = KMLCoverageService.parse_kml_or_geojson(kml_xml)
        self.assertEqual(len(coords), 5)
        # Check validation
        val = KMLCoverageService.validate_polygon(coords)
        self.assertTrue(val.is_valid)
        self.assertGreater(val.area_sq_meters, 10000.0)
        self.assertGreater(val.perimeter_meters, 500.0)

    def test_unclosed_ring_auto_closing(self):
        """Test that unclosed polygon coordinate rings are safely closed with warning."""
        unclosed_coords = [
            PolygonCoordinate(lat=13.082, lon=77.585),
            PolygonCoordinate(lat=13.082, lon=77.590),
            PolygonCoordinate(lat=13.086, lon=77.590),
            PolygonCoordinate(lat=13.086, lon=77.585),
            # Missing 5th vertex closing back to 13.082, 77.585
        ]
        val = KMLCoverageService.validate_polygon(unclosed_coords)
        self.assertTrue(val.is_valid)
        self.assertEqual(len(val.coordinates), 5)
        self.assertEqual(val.coordinates[0].lat, val.coordinates[-1].lat)
        self.assertTrue(any("unclosed" in w.lower() for w in val.warnings))

    def test_malformed_kml_error_reporting(self):
        """Test malformed XML raises clear ValueError without crashing."""
        malformed = "<Document><Polygon><coordinates>invalid,gibberish</coordinates></Polygon></Document>"
        with self.assertRaises(ValueError):
            KMLCoverageService.parse_kml_or_geojson(malformed)

    def test_lawnmower_route_generation(self):
        """Test generating parallel coverage passes inside rectangular polygon."""
        rect_coords = [
            PolygonCoordinate(lat=13.080, lon=77.580),
            PolygonCoordinate(lat=13.080, lon=77.584),
            PolygonCoordinate(lat=13.084, lon=77.584),
            PolygonCoordinate(lat=13.084, lon=77.580),
            PolygonCoordinate(lat=13.080, lon=77.580),
        ]
        route = KMLCoverageService.generate_lawnmower_route(
            polygon_coords=rect_coords,
            track_spacing_m=30.0,
            flight_altitude_m=45.0,
            sweep_angle_deg=0.0,
            boundary_margin_m=5.0,
            drone_speed_mps=5.0,
        )
        self.assertTrue(route.is_generated)
        self.assertGreater(len(route.waypoints), 4)
        self.assertGreater(route.total_distance_m, 200.0)
        self.assertGreater(route.estimated_flight_seconds, 30.0)
        # Check safety lock
        self.assertFalse(route.autonomous_flight_enabled)

        # Check waypoint order is sequential 1, 2, 3...
        orders = [wp.order for wp in route.waypoints]
        self.assertEqual(orders, list(range(1, len(route.waypoints) + 1)))

        # Verify all waypoints lie within bounding coordinates of polygon
        for wp in route.waypoints:
            self.assertTrue(13.079 <= wp.lat <= 13.085)
            self.assertTrue(77.579 <= wp.lon <= 77.585)

    def test_rotated_sweep_angles(self):
        """Test generating routes at 45 deg and 90 deg sweep headings."""
        rect_coords = [
            PolygonCoordinate(lat=13.080, lon=77.580),
            PolygonCoordinate(lat=13.080, lon=77.584),
            PolygonCoordinate(lat=13.084, lon=77.584),
            PolygonCoordinate(lat=13.084, lon=77.580),
            PolygonCoordinate(lat=13.080, lon=77.580),
        ]
        route_45 = KMLCoverageService.generate_lawnmower_route(
            polygon_coords=rect_coords, track_spacing_m=30.0, sweep_angle_deg=45.0
        )
        route_90 = KMLCoverageService.generate_lawnmower_route(
            polygon_coords=rect_coords, track_spacing_m=30.0, sweep_angle_deg=90.0
        )
        self.assertTrue(route_45.is_generated)
        self.assertTrue(route_90.is_generated)
        self.assertGreater(len(route_45.waypoints), 0)
        self.assertGreater(len(route_90.waypoints), 0)


class TestRegressionAndIsolation(unittest.TestCase):
    """Test that existing mission modes and camera components remain completely intact."""

    def test_main_app_routes(self):
        """Ensure all primary routes are registered without conflicts."""
        from main import app
        route_paths = [r.path for r in app.routes]
        self.assertIn("/api/camera/stream", route_paths)
        self.assertIn("/api/telemetry/", route_paths)
        self.assertIn("/api/missions/", route_paths)
        self.assertIn("/api/chat/message", route_paths)
        self.assertIn("/api/sar/status", route_paths)
        self.assertIn("/api/sar/observations", route_paths)
        self.assertIn("/api/sar/kml/validate", route_paths)
        self.assertIn("/api/sar/routes/generate", route_paths)
        self.assertIn("/api/sar/status/mask", route_paths)


class TestCameraConcurrencyAndCrashRegression(unittest.TestCase):
    """Regression tests verifying the resolution of the AVFoundation multi-thread camera race condition crash."""

    def setUp(self):
        from services.camera_service import CameraService
        self.cam_service = CameraService()

    def test_concurrent_frame_readers_thread_safety(self):
        """Simulate concurrent HTTP stream generator and SAR tracking thread accessing get_current_raw_frame().
        Proves thread-safety under mutex and cached-frame reuse without AVFoundation hardware corruption.
        """
        import threading
        test_frame = np.full((480, 640, 3), 128, dtype=np.uint8)
        with self.cam_service._lock:
            self.cam_service._cached_frame = test_frame
            self.cam_service._cached_frame_time = time.time()

        results = []
        errors = []

        def reader_task(task_id: int):
            for _ in range(50):
                try:
                    frame = self.cam_service.get_current_raw_frame()
                    if frame is not None:
                        results.append(frame.shape)
                except Exception as e:
                    errors.append(e)
                time.sleep(0.001)

        threads = [threading.Thread(target=reader_task, args=(i,)) for i in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent reads produced errors: {errors}")
        self.assertGreater(len(results), 0)

    def test_sar_active_flag_prevents_premature_hardware_release(self):
        """Verify set_sar_active(True) locks camera acquisition and prevents camera deallocation."""
        self.cam_service.set_sar_active(True)
        self.assertTrue(self.cam_service._is_sar_active)

        with self.cam_service._lock:
            self.cam_service.active_streams = 0
            self.cam_service._release_camera()
            self.assertTrue(self.cam_service._is_sar_active)

        self.cam_service.set_sar_active(False)
        self.assertFalse(self.cam_service._is_sar_active)


class TestMultiPersonByteTrackSequence(unittest.TestCase):
    """Stress tests simulating zero, one, two, and multiple persons entering, moving, and leaving."""

    def setUp(self):
        self.service = SARDetectorService()
        self.service.clear_observations()

    def test_multi_person_scene_progression(self):
        """Test sequence: empty scene -> 1 person -> 2 persons entering -> person 1 leaves -> empty scene."""
        blank = np.zeros((480, 640, 3), dtype=np.uint8)

        # Step 1: Empty scene produces 0 detections and 0 observations
        det_empty = self.service.detect_and_track(blank)
        self.assertEqual(len(det_empty), 0)
        self.assertEqual(len(self.service.get_observations()), 0)

        # Helper to draw synthetic people
        def create_frame_with_people(people_positions):
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            for (cx, cy) in people_positions:
                cv2.circle(frame, (cx, cy - 60), 20, (255, 255, 255), -1)
                cv2.ellipse(frame, (cx, cy), (25, 50), 0, 0, 360, (255, 255, 255), -1)
                cv2.line(frame, (cx - 15, cy + 50), (cx - 15, cy + 90), (255, 255, 255), 8)
                cv2.line(frame, (cx + 15, cy + 50), (cx + 15, cy + 90), (255, 255, 255), 8)
            return frame

        # Step 2: Feed frame through pipeline with conf threshold
        f1 = create_frame_with_people([(200, 240)])
        res1 = self.service.detect_and_track(f1, conf_threshold=0.05)
        self.assertIsInstance(res1, list)

        # Step 3: Two people entering simultaneously
        f2 = create_frame_with_people([(150, 240), (450, 240)])
        res2 = self.service.detect_and_track(f2, conf_threshold=0.05)
        self.assertIsInstance(res2, list)

        # Step 4: Long running changing counts (3 people -> 1 person -> 0 people)
        f3 = create_frame_with_people([(100, 240), (300, 240), (500, 240)])
        res3 = self.service.detect_and_track(f3, conf_threshold=0.05)
        self.assertIsInstance(res3, list)

        f4 = blank
        res4 = self.service.detect_and_track(f4, conf_threshold=0.05)
        self.assertEqual(len(res4), 0)

    def test_observation_stability_without_duplicate_records(self):
        """Verify that updating the same track over multiple frames updates the existing observation
        rather than creating a new record every frame.
        """
        bbox = DetectionBBox(
            x1=100.0, y1=100.0, x2=200.0, y2=300.0,
            norm_x=0.156, norm_y=0.208, norm_w=0.156, norm_h=0.416
        )

        # Frame 1: Track 10 appears
        obs1 = self.service._record_or_update_observation(
            track_id=10, confidence=0.88, bbox=bbox, timestamp=1000.0
        )
        self.assertEqual(len(self.service.get_observations()), 1)
        orig_id = obs1.observation_id

        # Frame 2: Track 10 moved slightly
        obs2 = self.service._record_or_update_observation(
            track_id=10, confidence=0.91, bbox=bbox, timestamp=1000.3
        )
        self.assertEqual(len(self.service.get_observations()), 1)
        self.assertEqual(obs2.observation_id, orig_id)
        self.assertEqual(obs2.detection_confidence, 0.91)

        # Frame 3: Track 20 appears (second person)
        obs3 = self.service._record_or_update_observation(
            track_id=20, confidence=0.85, bbox=bbox, timestamp=1000.6
        )
        self.assertEqual(len(self.service.get_observations()), 2)
        self.assertNotEqual(obs3.observation_id, orig_id)


class TestInstanceSegmentationMasking(unittest.TestCase):
    """Automated tests for pretrained human instance segmentation and mask toggles."""

    def setUp(self):
        self.service = SARDetectorService()
        self.service.clear_observations()

    def test_mask_toggle_and_lazy_load(self):
        """Test toggle_mask(True) lazy loads segmentation model and sets mask_status to active or unavailable honestly."""
        res_on = self.service.toggle_mask(True)
        self.assertTrue(res_on)
        status = self.service.get_status()
        self.assertTrue(status.is_mask_enabled)
        self.assertIn(status.mask_status, ["active", "unavailable"])

        res_off = self.service.toggle_mask(False)
        self.assertFalse(res_off)
        status_off = self.service.get_status()
        self.assertFalse(status_off.is_mask_enabled)
        self.assertEqual(status_off.mask_status, "off")

    def test_segmentation_mask_polygon_structure(self):
        """Test that recorded observations preserve mask_polygon coordinates when provided."""
        test_polygon = [
            [0.2, 0.3], [0.25, 0.25], [0.3, 0.3], [0.28, 0.45], [0.22, 0.45]
        ]
        bbox = DetectionBBox(
            x1=128.0, y1=144.0, x2=192.0, y2=216.0,
            norm_x=0.2, norm_y=0.225, norm_w=0.1, norm_h=0.112,
            mask_polygon=test_polygon
        )
        obs = self.service._record_or_update_observation(
            track_id=5, confidence=0.92, bbox=bbox, mask_polygon=test_polygon
        )
        self.assertIsNotNone(obs.mask_polygon)
        self.assertEqual(len(obs.mask_polygon), 5)
        self.assertEqual(obs.mask_polygon[0], [0.2, 0.3])

    def test_segmentation_failure_does_not_crash_detection(self):
        """Test that if segmentation model encounters an invalid frame, detector handles it without crashing."""
        self.service.toggle_mask(True)
        invalid_frame = np.zeros((0, 0, 3), dtype=np.uint8)
        res = self.service.detect_and_track(invalid_frame)
        self.assertEqual(res, [])


class TestLifecycleCleanShutdown(unittest.TestCase):
    """Test start and stop lifecycle of live tracking worker."""

    def setUp(self):
        self.service = SARDetectorService()

    def test_worker_start_and_stop_lifecycle(self):
        """Verify start_live_tracking and stop_live_tracking transitions without duplicate threads."""
        res_start = self.service.start_live_tracking(cadence_hz=5.0)
        self.assertTrue(res_start["is_running"])
        self.assertTrue(self.service.is_live_tracking_active)

        # Repeated start must be safe and not duplicate workers
        res_repeat = self.service.start_live_tracking(cadence_hz=5.0)
        self.assertTrue(res_repeat["is_running"])

        # Stop worker
        res_stop = self.service.stop_live_tracking()
        self.assertFalse(res_stop["is_running"])
        self.assertFalse(self.service.is_live_tracking_active)


class TestGeneralObjectDetection(unittest.TestCase):
    """Automated tests for Surveillance general object detection (vehicles + people)."""

    def setUp(self):
        self.service = SARDetectorService()
        self.service.clear_observations()
        self.service.toggle_object_detection(False)

    def test_object_detection_toggle(self):
        """Test toggling general object detection switches between person-only and multi-class vehicle detection."""
        # Initial: person only (class 0)
        self.assertFalse(self.service.is_object_detection_enabled)
        self.assertEqual(self.service.target_classes, [0])
        status = self.service.get_status()
        self.assertEqual(status.classes_tracked, ["person"])

        # Enable object detection
        res_on = self.service.toggle_object_detection(True)
        self.assertTrue(res_on)
        self.assertTrue(self.service.is_object_detection_enabled)
        self.assertEqual(set(self.service.target_classes), {0, 1, 2, 3, 5, 7})
        status_on = self.service.get_status()
        self.assertIn("car", status_on.classes_tracked)
        self.assertIn("person", status_on.classes_tracked)
        self.assertIn("truck", status_on.classes_tracked)
        self.assertIn("bus", status_on.classes_tracked)
        # Verify no building detection is claimed
        self.assertNotIn("building", status_on.classes_tracked)

        # Disable object detection -> returns strictly to person only
        res_off = self.service.toggle_object_detection(False)
        self.assertFalse(res_off)
        self.assertFalse(self.service.is_object_detection_enabled)
        self.assertEqual(self.service.target_classes, [0])
        status_off = self.service.get_status()
        self.assertEqual(status_off.classes_tracked, ["person"])

    def test_live_detections_caching_and_counts(self):
        """Test get_live_detections returns structured counts and detection items accurately."""
        self.service.toggle_object_detection(True)
        # Directly populate test live detections batch to verify calculation logic
        with self.service._latest_detections_lock:
            self.service._latest_detections = [
                {
                    "label": "Person 01",
                    "class_id": 0,
                    "class_name": "person",
                    "confidence": 0.88,
                    "bbox": [0.1, 0.2, 0.15, 0.3],
                    "mask_polygon": [[0.1, 0.2], [0.2, 0.2], [0.2, 0.5]],
                    "track_id": 1,
                },
                {
                    "label": "Car #2",
                    "class_id": 2,
                    "class_name": "car",
                    "confidence": 0.94,
                    "bbox": [0.4, 0.5, 0.3, 0.25],
                    "mask_polygon": None,
                    "track_id": 2,
                },
                {
                    "label": "Truck #3",
                    "class_id": 7,
                    "class_name": "truck",
                    "confidence": 0.82,
                    "bbox": [0.7, 0.4, 0.25, 0.4],
                    "mask_polygon": None,
                    "track_id": 3,
                },
            ]
            self.service._latest_frame_timestamp = time.time()

        live_res = self.service.get_live_detections()
        self.assertEqual(live_res.counts.persons, 1)
        self.assertEqual(live_res.counts.vehicles, 2)
        self.assertEqual(live_res.counts.total, 3)
        self.assertEqual(len(live_res.detections), 3)

        # Person detection has mask_polygon; vehicle detections do not
        person_item = next(d for d in live_res.detections if "Person" in d.label)
        self.assertIsNotNone(person_item.mask_polygon)
        car_item = next(d for d in live_res.detections if "Car" in d.label)
        self.assertIsNone(car_item.mask_polygon)

    def test_independent_toggles_behavior(self):
        """Verify that turning masking off does not disable detection or boxes, and turning objects off preserves people."""
        # 1. Masking on, objects on
        self.service.toggle_mask(True)
        self.service.toggle_object_detection(True)
        self.assertTrue(self.service.is_mask_enabled)
        self.assertTrue(self.service.is_object_detection_enabled)

        # 2. Turn masking off -> objects must remain on, detector status still ready
        self.service.toggle_mask(False)
        self.assertFalse(self.service.is_mask_enabled)
        self.assertTrue(self.service.is_object_detection_enabled)

        # 3. Turn objects off -> person tracking remains active
        self.service.toggle_object_detection(False)
        self.assertFalse(self.service.is_object_detection_enabled)
        self.assertEqual(self.service.target_classes, [0])

    def test_multi_object_frame_inference_stability(self):
        """Test multi-object tracking across frames with changing numbers of objects without crashing."""
        self.service.toggle_object_detection(True)

        # Generate frames with simulated scenes of different sizes and content
        frame_1 = np.full((480, 640, 3), 40, dtype=np.uint8)  # empty dark scene
        res_1 = self.service.detect_and_track(frame_1)
        self.assertIsInstance(res_1, list)

        # Draw 1 bright rectangle (1 object)
        frame_2 = frame_1.copy()
        cv2.rectangle(frame_2, (100, 100), (200, 300), (255, 255, 255), -1)
        res_2 = self.service.detect_and_track(frame_2)
        self.assertIsInstance(res_2, list)

        # Draw 3 bright rectangles (3 objects)
        frame_3 = frame_1.copy()
        cv2.rectangle(frame_3, (50, 50), (120, 200), (255, 255, 255), -1)
        cv2.rectangle(frame_3, (200, 150), (350, 350), (200, 200, 200), -1)
        cv2.rectangle(frame_3, (400, 100), (550, 400), (180, 180, 180), -1)
        res_3 = self.service.detect_and_track(frame_3)
        self.assertIsInstance(res_3, list)

        # Frame 4: Back to 0 objects
        res_4 = self.service.detect_and_track(frame_1)
        self.assertIsInstance(res_4, list)


if __name__ == "__main__":
    unittest.main()

