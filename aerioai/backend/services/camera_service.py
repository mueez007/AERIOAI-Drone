import cv2
import os
import time
from datetime import datetime
from threading import Lock
from typing import Optional, Generator

import numpy as np
from config import settings


class CameraService:
    """Thread-safe camera service supporting MJPEG streaming, on-demand captures,
    and high-performance lock-free frame caching for AI inference workers."""

    def __init__(self):
        self.camera = None
        self.is_recording = False
        self.video_writer = None
        self.recording_filename = None
        self._lock = Lock()
        self._active_streams = 0
        self._is_sar_active = False

        # Thread-safe cached latest frame to prevent concurrent camera.read() collisions
        self._frame_cache_lock = Lock()
        self._cached_frame: Optional[np.ndarray] = None
        self._cached_frame_time: float = 0.0

    # ─── Internal helpers ────────────────────────────────────────────

    def _open_camera(self):
        """Open the physical camera under self._lock."""
        if self._camera_opened():
            return
        try:
            if settings.CAMERA_SOURCE == "csi":
                import picamera2
                self.camera = picamera2.Picamera2()
                config = self.camera.create_still_configuration(
                    main={"size": (settings.CAMERA_WIDTH, settings.CAMERA_HEIGHT)}
                )
                self.camera.configure(config)
                self.camera.start()
                print("Camera: CSI (picamera2) initialized.")
            elif settings.CAMERA_SOURCE == "webcam":
                # AVFoundation on macOS requires index 0
                self.camera = cv2.VideoCapture(0)
                self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, settings.CAMERA_WIDTH)
                self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, settings.CAMERA_HEIGHT)
                # Optimize buffer size to 1 to reduce latency and memory accumulation
                self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if not self.camera.isOpened():
                    print("Camera: macOS did not grant access — check Privacy & Security > Camera")
                    self.camera = None
                else:
                    print(f"Camera: webcam opened ({settings.CAMERA_WIDTH}x{settings.CAMERA_HEIGHT}).")
        except Exception as e:
            print(f"Camera open error: {e}")
            self.camera = None

    def _camera_opened(self) -> bool:
        if settings.CAMERA_SOURCE == "webcam":
            return self.camera is not None and self.camera.isOpened()
        return self.camera is not None

    def _release_camera(self):
        """Release the physical camera device only when no consumer requires it."""
        if self._active_streams > 0 or self.is_recording or self._is_sar_active:
            return  # Camera is actively needed by another component

        with self._lock:
            if self.camera is not None:
                try:
                    if settings.CAMERA_SOURCE == "webcam":
                        self.camera.release()
                except Exception as e:
                    print(f"Camera release warning: {e}")
                self.camera = None
            with self._frame_cache_lock:
                self._cached_frame = None
                self._cached_frame_time = 0.0
            print("Camera: released (no active consumers)")

    def set_sar_active(self, active: bool):
        """Register or unregister SAR live tracking as an active camera consumer."""
        self._is_sar_active = active
        if active:
            # Ensure camera is opened if not already
            with self._lock:
                if not self._camera_opened():
                    self._open_camera()
        else:
            self._release_camera()

    def _get_frame(self) -> Optional[np.ndarray]:
        """Safely grab a single frame strictly under self._lock to prevent
        AVFoundation race conditions across threads."""
        if settings.CAMERA_SOURCE == "mock":
            frame = self._generate_mock_frame()
            with self._frame_cache_lock:
                self._cached_frame = frame
                self._cached_frame_time = time.time()
            return frame

        with self._lock:
            if not self._camera_opened():
                self._open_camera()
            if not self._camera_opened():
                return None

            try:
                if settings.CAMERA_SOURCE == "csi":
                    frame = self.camera.capture_array()
                elif settings.CAMERA_SOURCE == "webcam":
                    ret, frame = self.camera.read()
                    if not ret or frame is None:
                        return None
                else:
                    return None
            except Exception as e:
                print(f"Camera read error: {e}")
                return None

            # Update cached frame for non-competing consumers
            with self._frame_cache_lock:
                self._cached_frame = frame.copy()
                self._cached_frame_time = time.time()

            return frame

    def _generate_mock_frame(self) -> np.ndarray:
        """Generate a placeholder frame when camera hardware is unavailable."""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(frame, "AERIOAI - NO CAMERA", (120, 240),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        cv2.putText(frame, datetime.now().strftime("%H:%M:%S"), (220, 290),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
        return frame

    # ─── Public API ──────────────────────────────────────────────────

    def is_available(self) -> bool:
        if settings.CAMERA_SOURCE == "mock":
            return True
        with self._lock:
            return self._camera_opened()

    def capture_photo(self, mission_id: str = None) -> Optional[dict]:
        """Capture a single photo, save it, then check release policy."""
        frame = self._get_frame()
        if frame is None:
            return None

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"photo_{timestamp}.jpg"
        filepath = os.path.join(settings.MEDIA_PATH, "photos", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        cv2.imwrite(filepath, frame)

        self._release_camera()
        return {"filename": filename, "filepath": filepath, "gps_lat": None, "gps_lon": None}

    def start_recording(self):
        """Start video recording."""
        if self.is_recording:
            return

        frame = self._get_frame()
        if frame is None:
            return

        height, width = frame.shape[:2]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.recording_filename = f"video_{timestamp}.mp4"
        filepath = os.path.join(settings.MEDIA_PATH, "videos", self.recording_filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        self.video_writer = cv2.VideoWriter(
            filepath, fourcc, settings.CAMERA_FPS,
            (width, height),
        )
        self.is_recording = True
        self._recording_start_time = time.time()

    def stop_recording(self) -> Optional[dict]:
        """Stop video recording and return metadata."""
        if not self.is_recording:
            return None
        self.is_recording = False
        duration = int(time.time() - self._recording_start_time)
        if self.video_writer:
            self.video_writer.release()
            self.video_writer = None

        self._release_camera()
        filepath = os.path.join(settings.MEDIA_PATH, "videos", self.recording_filename)
        return {"filename": self.recording_filename, "filepath": filepath, "duration_seconds": duration}

    def generate_frames(self) -> Generator:
        """MJPEG streaming generator. Opens camera on connect, releases on disconnect."""
        self._active_streams += 1
        print(f"Camera: stream client connected (total: {self._active_streams})")
        try:
            while True:
                frame = self._get_frame()
                if frame is None:
                    frame = self._generate_mock_frame()

                if self.is_recording and self.video_writer:
                    self.video_writer.write(frame)

                _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
                )
        except GeneratorExit:
            pass
        finally:
            self._active_streams -= 1
            if self._active_streams < 0:
                self._active_streams = 0
            print(f"Camera: stream client disconnected (remaining: {self._active_streams})")
            self._release_camera()

    def get_current_snapshot_bytes(self) -> Optional[bytes]:
        """Get the current camera frame as JPEG bytes for AI analysis."""
        frame = self.get_current_raw_frame(copy=False)
        if frame is None:
            return None
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return buffer.tobytes()

    def get_current_raw_frame(self, copy: bool = True) -> Optional[np.ndarray]:
        """Get current raw numpy frame for AI inference.
        
        To prevent concurrent hardware read collisions on macOS AVFoundation / CSI,
        this method reuses the freshly cached frame if available (< 600ms old).
        Only falls back to hardware grab if cache is stale or uninitialized.
        """
        now = time.time()
        with self._frame_cache_lock:
            if self._cached_frame is not None and (now - self._cached_frame_time) < 0.6:
                return self._cached_frame.copy() if copy else self._cached_frame

        # Cache is stale or uninitialized: acquire frame under self._lock
        frame = self._get_frame()
        if frame is None:
            return None
        return frame.copy() if copy else frame

    def cleanup(self):
        """Release all camera resources on server shutdown."""
        self._active_streams = 0
        self.is_recording = False
        self._is_sar_active = False
        with self._lock:
            if self.camera is not None:
                try:
                    if settings.CAMERA_SOURCE == "webcam":
                        self.camera.release()
                except Exception:
                    pass
                self.camera = None
            if self.video_writer:
                try:
                    self.video_writer.release()
                except Exception:
                    pass
                self.video_writer = None


# Shared singleton instance to avoid duplicate camera handles across services
shared_camera_service = CameraService()
