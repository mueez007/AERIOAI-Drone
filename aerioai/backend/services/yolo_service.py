import cv2
import numpy as np
from typing import List, Optional

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None


class YOLOService:
    """Local object detection using YOLOv8n."""

    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load YOLOv8 nano model."""
        if YOLO is None:
            print("ultralytics not installed - YOLO detection disabled")
            self.model = None
            return
        try:
            self.model = YOLO("yolov8n.pt")
            print("YOLOv8n model loaded successfully")
        except Exception as e:
            print(f"YOLO model load error: {e}")
            self.model = None

    def is_available(self) -> bool:
        """Check if model is loaded and ready."""
        return self.model is not None

    def detect(self, image_path: str) -> List[dict]:
        """Run object detection on an image file."""
        if not self.model:
            return self._fallback_detection()

        try:
            results = self.model(image_path)
            detections = []

            for result in results:
                for box in result.boxes:
                    class_name = result.names[int(box.cls)]
                    detections.append({
                        "class": class_name,
                        "confidence": round(float(box.conf), 3),
                        "bbox": [round(float(x), 1) for x in box.xyxy[0].tolist()],
                    })

            return detections
        except Exception as e:
            print(f"YOLO detection error: {e}")
            return self._fallback_detection()

    def detect_frame(self, frame: np.ndarray) -> List[dict]:
        """Run detection on a live frame (numpy array)."""
        if not self.model:
            return self._fallback_detection()

        try:
            results = self.model(frame)
            detections = []

            for result in results:
                for box in result.boxes:
                    class_name = result.names[int(box.cls)]
                    detections.append({
                        "class": class_name,
                        "confidence": round(float(box.conf), 3),
                        "bbox": [round(float(x), 1) for x in box.xyxy[0].tolist()],
                    })

            return detections
        except Exception as e:
            print(f"YOLO frame detection error: {e}")
            return self._fallback_detection()

    def draw_detections(self, frame: np.ndarray, detections: List[dict]) -> np.ndarray:
        """Draw bounding boxes on a frame."""
        for det in detections:
            bbox = det["bbox"]
            x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
            label = f"{det['class']} {det['confidence']:.2f}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)
            cv2.putText(frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        return frame

    def count_by_class(self, detections: List[dict]) -> List[dict]:
        """Group detections by class and count them."""
        counts = {}
        for det in detections:
            class_name = det["class"]
            if class_name not in counts:
                counts[class_name] = {"count": 0, "total_confidence": 0}
            counts[class_name]["count"] += 1
            counts[class_name]["total_confidence"] += det["confidence"]

        return [
            {
                "class": class_name,
                "count": data["count"],
                "avg_confidence": round(data["total_confidence"] / data["count"], 3),
            }
            for class_name, data in counts.items()
        ]

    def _fallback_detection(self) -> List[dict]:
        """Return empty when model is unavailable."""
        return []
