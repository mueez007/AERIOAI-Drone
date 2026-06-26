import cv2
import os
import time
from datetime import datetime
from threading import Lock
from typing import Optional, Generator

from config import settings


class CameraService:
    def __init__(self):
        self.camera = None
        self.is_recording = False
        self.video_writer = None
        self.recording_filename = None
        self._lock = Lock()
        self._active_streams = 0

    # ─── Internal helpers ────────────────────────────────────────────

    def _open_camera(self):
        """Open the physical camera (called only when actually needed)."""
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
            elif settings.CAMERA_SOURCE == "webcam":
                self.camera = cv2.VideoCapture(0)
                self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, settings.CAMERA_WIDTH)
                self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, settings.CAMERA_HEIGHT)
                if not self.camera.isOpened():
                    print("Camera: macOS did not grant access — check Privacy & Security > Camera")
                    self.camera = None
        except Exception as e:
            print(f"Camera open error: {e}")
            self.camera = None

    def _camera_opened(self) -> bool:
        if settings.CAMERA_SOURCE == "webcam":
            return self.camera is not None and self.camera.isOpened()
        return self.camera is not None

    def _release_camera(self):
        """Release the physical camera device so the LED turns off."""
        if self.camera is not None:
            if settings.CAMERA_SOURCE == "webcam":
                self.camera.release()
            self.camera = None
        print("Camera: released (no active streams)")

    def _get_frame(self):
        """Get a single frame. Opens camera on-demand, returns None if unavailable."""
        if settings.CAMERA_SOURCE == "mock":
            return self._generate_mock_frame()

        with self._lock:
            if not self._camera_opened():
                self._open_camera()
            if not self._camera_opened():
                return None

        if settings.CAMERA_SOURCE == "csi":
            return self.camera.capture_array()
        if settings.CAMERA_SOURCE == "webcam":
            ret, frame = self.camera.read()
            if ret:
                return frame
        return None

    def _generate_mock_frame(self):
        """Generate a placeholder frame when camera hardware is unavailable."""
        import numpy as np
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
        return self._camera_opened()

    def capture_photo(self, mission_id: str = None) -> Optional[dict]:
        """Capture a single photo, save it, then release camera if not streaming."""
        frame = self._get_frame()
        if frame is None:
            return None

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"photo_{timestamp}.jpg"
        filepath = os.path.join(settings.MEDIA_PATH, "photos", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        cv2.imwrite(filepath, frame)

        # Release camera after one-off capture if nobody is streaming
        if self._active_streams == 0 and not self.is_recording:
            self._release_camera()

        return {"filename": filename, "filepath": filepath, "gps_lat": None, "gps_lon": None}

    def start_recording(self):
        """Start video recording."""
        if self.is_recording:
            return
            
        frame = self._get_frame()
        if frame is None:
            return  # Cannot start recording if no camera frame

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

        # Release camera if nobody is streaming
        if self._active_streams == 0:
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
            print(f"Camera: stream client disconnected (remaining: {self._active_streams})")
            if self._active_streams <= 0 and not self.is_recording:
                self._active_streams = 0
                self._release_camera()

    def get_current_snapshot_bytes(self) -> Optional[bytes]:
        """Get the current camera frame as JPEG bytes for AI analysis."""
        frame = self._get_frame()
        if frame is None:
            return None
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        result = buffer.tobytes()
        # Release if not actively streaming
        if self._active_streams == 0 and not self.is_recording:
            self._release_camera()
        return result

    def cleanup(self):
        """Release all camera resources on server shutdown."""
        self._release_camera()
        if self.video_writer:
            self.video_writer.release()
