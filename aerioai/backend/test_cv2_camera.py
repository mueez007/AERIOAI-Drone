import cv2
import sys

print("Testing VideoCapture(0)")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot open camera 0")
else:
    ret, frame = cap.read()
    if ret:
        print(f"Successfully grabbed frame with shape: {frame.shape}")
    else:
        print("Failed to grab frame")
    cap.release()
