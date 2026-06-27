import google.generativeai as genai
import time
import os

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

try:
    print("Uploading...")
    video_file = genai.upload_file(path="/Users/mueez/Desktop/AERIOAI-Drone/aerioai/media/videos/video_20260627_014844.mp4")
    print(f"Uploaded as: {video_file.name}")
    
    while video_file.state.name == "PROCESSING":
        print('.', end='', flush=True)
        time.sleep(2)
        video_file = genai.get_file(video_file.name)
        
    if video_file.state.name == "FAILED":
        print("Video processing failed.")
    else:
        print("\nProcessing complete! Ready to generate content.")
        genai.delete_file(video_file.name)
except Exception as e:
    print(f"Error: {e}")
