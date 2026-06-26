import os
import requests
import base64
import json
from typing import Optional

from config import settings

class NvidiaService:
    def __init__(self):
        self.kimi_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        self.cosmos_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    
    def _encode_image(self, image_path: str):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def analyze_with_kimi(self, media, prompt: Optional[str] = None) -> dict:
        """Fallback for scene analysis using moonshotai/kimi-k2.6"""
        if not settings.KIMI_API_KEY:
            return self._mock_analysis()
        
        try:
            if media.filepath.lower().endswith(('.mp4', '.mov', '.avi')):
                import cv2
                cap = cv2.VideoCapture(media.filepath)
                ret, frame = cap.read()
                cap.release()
                if not ret:
                    raise Exception("Could not read video frame")
                _, buffer = cv2.imencode('.jpg', frame)
                b64_image = base64.b64encode(buffer).decode('utf-8')
            else:
                b64_image = self._encode_image(media.filepath)
            
            default_prompt = (
                "You are AERIOAI. Analyze this aerial image and return a JSON response exactly like this: "
                '{"summary": "...", "activity": "...", "objects": [{"class": "name", "count": 1, "description": "..."}], '
                '"threat_level": "LOW", "confidence": 95, "recommendations": null, "key_observations": []}'
            )
            
            headers = {
                "Authorization": f"Bearer {settings.KIMI_API_KEY}",
                "Accept": "application/json"
            }
            
            payload = {
                "model": "moonshotai/kimi-k2.6",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt or default_prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                        ]
                    }
                ],
                "max_tokens": 1024,
                "temperature": 0.2,
                "stream": False
            }
            
            response = requests.post(self.kimi_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            text = result["choices"][0]["message"]["content"].strip()
            
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
                
            return json.loads(text)
        except Exception as e:
            print(f"Kimi fallback error: {e}")
            return self._mock_analysis()

    def deep_video_analysis_cosmos(self, media) -> dict:
        """Deep video analysis using nvidia/cosmos3-nano-reasoner"""
        if not settings.COSMOS_API_KEY:
            return {"error": "Cosmos API not configured", "history": [], "summary": ""}
            
        try:
            import cv2
            cap = cv2.VideoCapture(media.filepath)
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                raise Exception("Could not read video frame for analysis")
                
            _, buffer = cv2.imencode('.jpg', frame)
            b64_image = base64.b64encode(buffer).decode('utf-8')

            prompt = (
                "You are a Cosmos video reasoning system. Perform a deep structural analysis on this video frame. "
                "Provide detailed reasoning about the physical world interactions, potential threats, and activities."
            )

            headers = {
                "Authorization": f"Bearer {settings.COSMOS_API_KEY}",
                "Accept": "application/json"
            }

            payload = {
                "model": "nvidia/cosmos3-nano-reasoner",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                        ]
                    }
                ],
                "max_tokens": 2048,
                "temperature": 0.4,
                "stream": False
            }

            response = requests.post(self.cosmos_url, headers=headers, json=payload, timeout=45)
            response.raise_for_status()
            result = response.json()

            text = result["choices"][0]["message"]["content"].strip()
            
            return {
                "summary": text,
                "reasoning_depth": "Deep Structural via Cosmos",
                "threat_assessment": "Pending Validation"
            }
            
        except Exception as e:
            print(f"Cosmos deep analysis error: {e}")
            return {
                "summary": f"Failed to perform deep analysis: {e}",
                "reasoning_depth": "None",
                "threat_assessment": "Unknown"
            }

    def _mock_analysis(self) -> dict:
        return {
            "summary": "Scene analysis unavailable - Gemini and Kimi failed.",
            "activity": "Unknown",
            "objects": [],
            "threat_level": "LOW",
            "confidence": 0,
            "recommendations": None,
            "key_observations": [],
        }
