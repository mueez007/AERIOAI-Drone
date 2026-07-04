import sys
try:
    import picamera2
    print("Picamera2 imported successfully")
    cam = picamera2.Picamera2()
    print("Camera initialized")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
