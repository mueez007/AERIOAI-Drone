# AERIOAI Search & Rescue (SAR) Module Documentation

## 1. Overview
The AERIOAI Search & Rescue module provides a reliable, end-to-end computer-vision, multi-object tracking, geospatial coverage planning, and interactive triage system built directly into the AERIOAI ground-station architecture.

---

## 2. Model Specifications & Licensing
- **Model Checkpoint**: Official Ultralytics `yolo26n.pt` (with graceful fallback to `yolov8n.pt` if primary asset is missing).
- **Architecture**: Nano YOLO real-time object detector.
- **Trained Dataset**: Microsoft COCO (80 classes).
- **Target Detection Class**: Class `0` (`person`). All other classes are strictly filtered out to optimize perception focus.
- **License**: Ultralytics AGPL-3.0 (with commercial enterprise licensing options).
- **Storage Policy**: Model weights (`*.pt`, `*.onnx`, `*.engine`) are strictly ignored in `.gitignore` and kept out of Git source control.

---

## 3. Installation & Startup Instructions

### 3.1 Backend Dependencies
Install required perception and geospatial libraries:
```bash
pip install ultralytics lap shapely opencv-python fastapi uvicorn pydantic
```

### 3.2 Starting Backend Server
```bash
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Upon startup, the detector warms up on a zero-array frame and reports:
`[SAR] Detector successfully initialized: Ultralytics YOLO26n (Pretrained COCO) on cpu`

### 3.3 Starting Frontend Ground Station
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in the browser, log in, and switch mission mode to **Search & Rescue**.

---

## 4. Multi-Frame Person Tracking (ByteTrack)
- Detection and tracking are decoupled.
- The tracking engine utilizes **ByteTrack** (`tracker="bytetrack.yaml"`), maintaining associations across consecutive video frames even through temporary occlusions or low-confidence detection dips.
- **Track IDs vs Observation IDs**:
  - `track_id`: Transient integer assigned by the ByteTrack Kalman filter.
  - `observation_id`: Persistent ground station identifier (e.g. `obs_sar_01_a8f3b2`) labeled neutrally as `Person 01`, `Person 02`.
- Tracks transition through honest operational states:
  - `tracking`: Actively matched in current video frame.
  - `detected`: Found in single frame without persistent track.
  - `stale`: Unseen for 4–15 seconds.
  - `track_lost`: Unseen for >15 seconds (persisted in history without silent deletion or premature merging).

---

## 5. Honest Ground-Plane Location Estimation

### 5.1 Geometry & Inputs
Estimated geographic ground coordinates are calculated using flat-earth projection on the tangent plane:
- Drone GPS coordinate $(\phi_0, \lambda_0)$
- Altitude Above Ground Level ($h$ in meters)
- Aircraft heading $(\psi)$
- Camera gimbal pitch $(\theta_p)$ (e.g. $-90^\circ$ for nadir, $-45^\circ$ forward-down)
- Camera horizontal and vertical field of view ($HFOV, VFOV$)
- Bottom of detection bounding box $(u_c, v_{bottom})$ where the person touches the ground plane.

### 5.2 Honest Availability Rules
Location is marked as `location_status = "unavailable"` if:
1. Drone GPS is missing, stale, or $(0, 0)$.
2. Altitude AGL is $\le 1.0\text{m}$ or uncalibrated.
3. Camera mounting angle is uncalibrated.
4. Optical line of sight points at or above the horizon ($\theta_{tot} \ge -1^\circ$).
**Strict Rule**: Drone GPS coordinates and camera image centers are NEVER substituted as person coordinates.

### 5.3 Uncertainty Radius
Uncertainty is calculated using Gaussian error propagation accounting for GPS dilution of precision ($\sigma_{gps} \approx 3.5\text{m}$), altitude variance ($\sigma_h \approx 1.5\text{m}$), and angular variance ($\sigma_\theta \approx 2^\circ$):
$$\sigma_{pos} = \sqrt{\sigma_{gps}^2 + \left(\frac{1}{\tan \theta} \cdot \sigma_h\right)^2 + \left(\frac{h}{\sin^2 \theta} \cdot \sigma_\theta\right)^2}$$
Reported on UI as $\pm X\text{m}$ and rendered as an interactive uncertainty radius circle on the map.

---

## 6. KML/GeoJSON Import & Lawnmower Route Planning

### 6.1 Perimeter Import
- Operators can upload `.kml` or `.geojson` incident search boundaries.
- Backend parses `<coordinates>`, checks ring closure (auto-closing unclosed perimeters with warning), validates geometry via Shapely, and calculates area ($m^2$) and perimeter ($m$).

### 6.2 Lawnmower Coverage Generation
- Converts perimeter to local metric frame ($1\text{ unit} = 1\text{ meter}$).
- Applies configurable safety margin (e.g. $3\text{m}$).
- Rotates polygon by $-\theta$ into aligned sweep direction (e.g. $0^\circ$ N-S, $45^\circ$, $90^\circ$ E-W).
- Generates parallel scanlines spaced by track spacing $S$ (e.g. $25\text{m}$).
- Connects scanline endpoints in alternating serpentine order (left-to-right, right-to-left).
- Rotates waypoints back to geographic coordinates.
- Calculates total flight distance, turn count, and flight time at survey speed.
- **Safety Lock**: Autonomous flight dispatch, arming, and waypoint upload commands are strictly disabled (`autonomous_flight_enabled = false`). All routes are for visual review and operator preview only.

---

## 7. Interactive Map & Observation Triage
- **Marker-to-Card Selection**: Clicking a person marker on the Leaflet map selects the corresponding triage card and displays detailed popup telemetry.
- **Card-to-Marker Selection**: Clicking an observation card pans the map to the estimated GPS coordinate with smooth animation and highlights the marker.
- **HUD Bounding Boxes & Silhouette Masks**: When live camera tracking is active, detection bounding boxes, tracking labels (`TRK #ID · Person 92%`), and real human silhouette masks are rendered on the `LiveFeedCanvas` video HUD.

---

## 8. Root Cause Analysis: Multi-Person / Live Camera Python Crash

### 8.1 The Observed Failure
During live Search & Rescue camera tracking, after tracking a person for a sustained period, a second person entered the scene and the Python backend process terminated abruptly with:
- `Exception Type: EXC_BAD_ACCESS (SIGBUS)`
- `Exception Subtype: KERN_PROTECTION_FAILURE at 0x0000000200363140`
- `Triggered by Thread: 36, Dispatch Queue: cameraQueue`

### 8.2 Native Crash Dissection & Root Cause
Inspection of the macOS diagnostic report (`/Users/mueez/Library/Logs/DiagnosticReports/Python-2026-10-20-221956.ips`) revealed:
- **Crashed Thread (Thread 36 - `cameraQueue`)**:
  Executing native Apple AVFoundation frame delegate `-[CaptureDelegate captureOutput:didOutputSampleBuffer:fromConnection:]` -> `_objc_msgSend_uncached` -> `realizeClassWithoutSwift`.
- **Concurrent Thread (Thread 20)**:
  Executing `cv::VideoCapture::read` -> `cv::VideoCapture::grab` -> `-[CaptureDelegate grabImageUntilDate:]`.

**Demonstrated Root Cause**:
1. In `backend/services/camera_service.py`, `self.camera.read()` was invoked outside of `self._lock`.
2. Simultaneously, the FastAPI MJPEG HTTP video stream generator (`/api/camera/stream`) and the SAR background tracking loop (`sar_detector_service.py`) were both invoking `camera.read()` concurrently on the same hardware OpenCV `VideoCapture` instance.
3. Furthermore, when client connection counts fluctuated, `_release_camera()` deallocated `CaptureDelegate` while AVFoundation was actively pushing sample buffers on `cameraQueue`, resulting in a use-after-free `SIGBUS` (Bus error: 10) in macOS system libraries.
4. The crash coincided with multiple people because the increased inference and tracking overhead altered thread scheduling, widening the race-window collision between the MJPEG generator and the detector thread.

### 8.3 The Resolution
1. **Thread-Safe Camera Mutex**: Enclosed all `self.camera.read()` calls strictly inside `with self._lock:` in `CameraService`.
2. **Lock-Free Cached Frame Access**: Implemented thread-safe frame caching (`_cached_frame`, `_cached_frame_time`). `get_current_raw_frame()` serves a memory copy of the latest frame (< 0.6s old) to the SAR worker thread without competing for hardware capture locks.
3. **Hardware Lifecycle Protection**: Added `set_sar_active(True)` in `CameraService` to prevent premature camera release while SAR tracking is active.

---

## 9. Human-Shaped Silhouette Masking (Instance Segmentation)

### 9.1 Pretrained Model Architecture
- **Model**: `yolo26n-seg.pt` (Ultralytics Nano Instance Segmentation, pretrained on COCO).
- **Fallback**: `yolov8n-seg.pt` if primary weight asset is absent.
- **Single Forward Pass**: Both bounding boxes, track IDs, and segmentation mask polygons (`masks.xyn`) are predicted in a single forward pass (~47 ms on Apple M4), eliminating the need for a secondary expensive model.
- **Lazy Loading**: Loaded into memory only when the operator toggles **HUMAN MASK: ON**.

### 9.2 Independent UI Toggles
- **Detection Start/Stop**: Located directly in the top toolbar of the live camera HUD, accessible in regular and fullscreen mode.
  - States: `DETECTION OFF`, `DETECTION STARTING`, `DETECTION ACTIVE`, `DETECTION ERROR`.
- **Human Masking Toggle**: Located beside detection controls on the camera toolbar.
  - States: `MASK OFF`, `MASK LOADING`, `MASK ACTIVE`, `MASK UNAVAILABLE`.
  - When Mask is OFF: Real rectangular person detection boxes, track IDs, and confidence labels remain visible.
  - When Mask is ON: Exact human silhouette polygons (`rgba(52, 211, 153, 0.32)`) overlay the visible person contours.

---

## 10. Raspberry Pi 4 Companion Computer Optimization

### 10.1 Hardware Disparity & Architecture
- **Development System**: MacBook Pro (Apple M4, 16 GB unified RAM).
- **Target Companion**: Raspberry Pi 4 Model B (Quad-core ARM Cortex-A72 @ 1.5 GHz, 4 GB LPDDR4 RAM).

### 10.2 Recommended Workload Partitioning
| Task | Raspberry Pi 4 (Onboard) | MacBook Pro (Ground Station) |
|---|---|---|
| Camera Capture & Video Encoding | Primary (H.264 / MJPEG) | Display & Recording |
| Person Detection & ByteTrack | Primary (YOLO26n Nano @ 320x320, 2–3 Hz) | Primary during development / High-FPS |
| Human Instance Segmentation | Optional (CPU-bound, ~300ms) | Primary (GPU/Neural Engine accelerated) |
| Telemetry & MAVLink Bridge | Primary | Consumer & Map Overlay |
| Geospatial KML Route Planning | Inactive | Primary (Shapely / Turf.js preview) |

### 10.3 Pi Optimization Guidelines
1. **Resolution Scaling**: Run inference on `imgsz=320` or `imgsz=480` instead of 640 on Pi 4 CPU to maintain 2–4 FPS.
2. **NCNN / ONNX Runtime**: Export weights to NCNN for optimal ARM NEON SIMD utilization:
   ```bash
   yolo export model=yolo26n.pt format=ncnn
   ```
3. **Cadence & Bounded Backpressure**: The SAR worker processes the newest cached frame and drops stale frames if inference exceeds cadence, ensuring zero frame accumulation or queue buildup.
4. **Thermal Throttling Mitigation**: Recommend an active cooling fan/heatsink on the Pi 4 to prevent CPU throttling from 1.5 GHz down to 600 MHz under sustained AI workload.

---

## 11. Measured Performance Benchmarks

### 11.1 Apple M4 (Development Machine — 16 GB RAM)
*Measured empirically over 200 consecutive frames with 640x480 resolution:*
- **YOLO26n Detection Initialization**: 142.7 ms (Baseline RSS: 411.8 MB).
- **YOLO26n-seg Lazy-Load & Warm-up**: 253.7 ms.
- **Detection + ByteTrack (Mask OFF)**:
  - Mean Latency: **34.13 ms** (P50: 32.30 ms, P90: 35.76 ms, P99: 69.81 ms)
  - Throughput: **29.3 FPS**
  - Memory RSS: **429.5 MB**
- **Detection + ByteTrack + Segmentation (Mask ON)**:
  - Mean Latency: **47.04 ms** (P50: 44.63 ms, P90: 51.43 ms, P99: 73.34 ms)
  - Throughput: **21.3 FPS**
  - Memory RSS: **494.5 MB**
- **Stability**: Zero crashes, zero memory leaks over 200 consecutive frames.

### 11.2 Raspberry Pi 4 Status
*Real hardware testing on the physical Raspberry Pi 4 is pending physical connection to the drone companion computer. The software architecture and bounded cadence loops are fully prepared for ARM64 deployment.*

---

## 12. Reproducing Automated Tests

Run backend test suite (30 automated tests including crash regression, object detection, and multi-person tracking):
```bash
python3 -m unittest backend/test_sar_suite.py
```
Run regression audit:
```bash
python3 backend/test_regression_audit.py
```
Run frontend TypeScript check:
```bash
./frontend/node_modules/.bin/tsc --project frontend/tsconfig.json --noEmit
```
Run frontend production build:
```bash
npm --prefix frontend run build
```

---

## 13. Surveillance Vision Pipeline & Object Detection Integration

### 13.1 Shared Vision Architecture
- Rather than duplicating pipelines or spawning competing camera handles, Surveillance and Search & Rescue safely share the core detection and segmentation services.
- **Matching Camera Controls**: Directly integrated into the live camera ribbon (normal and fullscreen modes):
  1. `START DETECTION` / `STOP DETECTION`
  2. `BOXES ON` / `BOXES OFF`
  3. `HUMAN MASK ON` / `HUMAN MASK OFF`
  4. `OBJECT DETECTION ON` / `OBJECT DETECTION OFF`
- **Independent Toggles**: Box overlays, human segmentation masking, and general object detection operate independently without stopping frame processing or disabling person detection.

### 13.2 General Object Detection (Road Vehicles)
- Enabled COCO-pretrained classes: `person` (0), `bicycle` (1), `car` (2), `motorcycle` (3), `bus` (5), `truck` (7).
- Bounding boxes and labels are distinguished with clean visual accents (emerald green for persons, blue/amber/purple for vehicles).
- **Building Detection Policy**: Honest COCO object detectors cannot reliably detect general buildings without custom models; buildings are not claimed or fabricated.

### 13.3 Low-Latency Fast Detections Pipeline
- **Root Cause of Slow Overlays**: Previously, frontend polled `/api/sar/observations` every 1500 ms while inference ran at 3–5 Hz, resulting in 0.67 Hz visible box updates.
- **Optimization**: Added fast in-memory endpoint `/api/sar/detections/live` polled at ~150 ms (~6.6 Hz) when tracking is active. Overlays update smoothly in real time while tracking persistence remains bounded.

### 13.4 Cross-Session Person Re-Identification Notice
- **Status**: **Explicitly Deferred** as per project scope.
- ByteTrack maintains multi-frame association during active tracking, but long-absence cross-session re-identification requires appearance embedding models (e.g. OSNet / FastReID) and is deferred to a dedicated future phase.
