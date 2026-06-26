import json
import os
from typing import Optional, List

from config import settings
from services.nvidia_service import NvidiaService


class GeminiService:
    """Google Gemini 2.5 for scene understanding and mission intelligence."""

    def __init__(self):
        self.model = None
        self.nvidia_service = NvidiaService()
        self._init_client()

    def _init_client(self):
        """Initialize Gemini client."""
        try:
            if settings.GEMINI_API_KEY:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel("gemini-2.5-flash")
                print("Gemini API initialized")
            else:
                print("Gemini API key not set - scene analysis disabled")
        except Exception as e:
            print(f"Gemini init error: {e}")

    def is_available(self) -> bool:
        return self.model is not None

    def analyze_scene(self, media, prompt: Optional[str] = None) -> dict:
        """Full scene analysis of a photo."""
        if not self.model:
            return self.nvidia_service.analyze_with_kimi(media, prompt)

        try:
            import google.generativeai as genai

            image = {
                "mime_type": "image/jpeg",
                "data": open(media.filepath, "rb").read(),
            }

            default_prompt = """
            You are AERIOAI, an autonomous drone AI for aerial surveillance.
            Perform a highly detailed "Deep Explainable AI" scene analysis for security/surveillance purposes.
            Format your response strictly as JSON with this schema:

            {
                "summary": "A highly detailed, structured markdown explanation of the scene. Use bullet points and separate lines for readability. Explain exactly why you came to this conclusion.",
                "activity": "What is happening in the scene",
                "objects": [{"class": "name", "count": number, "description": "brief"}],
                "threat_level": "LOW" | "MEDIUM" | "HIGH",
                "confidence": 0-100,
                "recommendations": "Any actions recommended or null",
                "key_observations": ["observation 1", "observation 2"]
            }

            Only return the JSON, no other text.
            """

            response = self.model.generate_content([
                prompt or default_prompt,
                image,
            ])

            result_text = response.text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:-3]
            elif result_text.startswith("```"):
                result_text = result_text[3:-3]

            return json.loads(result_text)

        except Exception as e:
            error_msg = str(e).lower()
            if "429" in error_msg or "quota" in error_msg or "resourceexhausted" in error_msg:
                return {
                    "summary": "Gemini Rate Limit Exceeded - API Quota is over. Please try again in a minute, or use Normal Analysis.",
                    "activity": "Rate Limit Reached",
                    "objects": [],
                    "threat_level": "UNKNOWN",
                    "confidence": 0,
                    "recommendations": "Wait and retry, or use Normal Analysis.",
                    "key_observations": []
                }
            print(f"Gemini analysis error, falling back to Kimi: {e}")
            return self.nvidia_service.analyze_with_kimi(media, prompt)

    def analyze_live_scene(self, frame_bytes: bytes, prompt: Optional[str] = None) -> dict:
        """Full scene analysis of a live frame."""
        if not self.model:
            return self._mock_analysis()

        try:
            import google.generativeai as genai

            image = {
                "mime_type": "image/jpeg",
                "data": frame_bytes,
            }

            default_prompt = """
            You are AERIOAI, an autonomous drone AI for aerial surveillance.
            Analyze this live camera feed frame and return a JSON response with:

            {
                "summary": "2-3 sentence description of the scene",
                "activity": "What is happening in the scene",
                "objects": [{"class": "name", "count": number, "description": "brief"}],
                "threat_level": "LOW" | "MEDIUM" | "HIGH",
                "confidence": 0-100,
                "recommendations": "Any actions recommended or null",
                "key_observations": ["observation 1", "observation 2"]
            }

            Only return the JSON, no other text.
            """

            response = self.model.generate_content([
                prompt or default_prompt,
                image,
            ])

            result_text = response.text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:-3]
            elif result_text.startswith("```"):
                result_text = result_text[3:-3]

            return json.loads(result_text)

        except Exception as e:
            print(f"Gemini live analysis error: {e}")
            return self._mock_analysis()

    def analyze_video_deep_reasoning(self, media) -> dict:
        """Deep video analysis using Gemini"""
        try:
            import cv2
            cap = cv2.VideoCapture(media.filepath)
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                raise Exception("Could not read video frame for analysis")
                
            _, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()

            default_prompt = """
            You are an expert video reasoning system. Perform a deep structural analysis on this video frame.
            Provide detailed reasoning about the physical world interactions, potential threats, and activities.
            Return a JSON response with:
            {
                "summary": "Deep, structured description of the scene using bullet points.",
                "activity": "Detailed analysis of events happening using bullet points.",
                "objects": [{"class": "name", "count": number, "description": "detailed description"}],
                "threat_level": "LOW" | "MEDIUM" | "HIGH",
                "confidence": 0-100,
                "recommendations": "Specific, actionable recommendations",
                "key_observations": ["observation 1", "observation 2"]
            }
            Only return the JSON, no other text.
            """

            image = {
                "mime_type": "image/jpeg",
                "data": frame_bytes,
            }

            response = self.model.generate_content([default_prompt, image])
            result_text = response.text.strip()
            
            if result_text.startswith("```json"):
                result_text = result_text[7:-3]
            elif result_text.startswith("```"):
                result_text = result_text[3:-3]

            return json.loads(result_text)
        except Exception as e:
            error_msg = str(e).lower()
            print(f"Gemini deep video analysis error: {e}")
            if "429" in error_msg or "quota" in error_msg or "resourceexhausted" in error_msg:
                return {
                    "summary": "Gemini Rate Limit Exceeded - API Quota is over. Please try again in a minute.",
                    "activity": "Rate Limit Reached",
                    "objects": [],
                    "threat_level": "UNKNOWN",
                    "confidence": 0,
                    "recommendations": "Wait and retry.",
                    "key_observations": []
                }
            return {
                "summary": f"Failed to perform deep analysis: {e}",
                "activity": "Error",
                "objects": [],
                "threat_level": "UNKNOWN",
                "confidence": 0,
                "recommendations": "None",
                "key_observations": []
            }

    def analyze_media_with_query(self, media, query: str, context: str = "") -> str:
        """Answer a specific question about a photo or video."""
        if not self.model:
            return f"[Gemini not available] I cannot answer: {query}"

        try:
            # For videos, extract first frame; for images, read directly
            if media.filepath.lower().endswith(('.mp4', '.mov', '.avi')):
                import cv2
                cap = cv2.VideoCapture(media.filepath)
                ret, frame = cap.read()
                cap.release()
                if not ret:
                    raise Exception("Could not read video frame")
                _, buffer = cv2.imencode('.jpg', frame)
                image_data = buffer.tobytes()
            else:
                image_data = open(media.filepath, "rb").read()

            image = {
                "mime_type": "image/jpeg",
                "data": image_data,
            }

            # Build analysis context from previous analyses
            analysis_ctx = ""
            if media.summary:
                analysis_ctx += f"\nPrevious Analysis Summary: {media.summary}\n"
            if media.threat_level:
                analysis_ctx += f"Threat Level: {media.threat_level}\n"
            if media.objects_detected:
                analysis_ctx += f"Detected Objects: {media.objects_detected}\n"
            if media.analysis_history:
                for entry in media.analysis_history[-3:]:  # Last 3 analyses
                    analysis_ctx += f"\nAnalysis ({entry.get('type', 'normal')}): {entry.get('summary', '')}\n"

            sys_context = f"\nSystem Context:\n{context}\n{analysis_ctx}" if context or analysis_ctx else ""
            prompt = f"""
            You are AERIOAI, an autonomous drone AI.
            Based on this {'video frame' if media.filepath.lower().endswith(('.mp4', '.mov', '.avi')) else 'aerial image'} and the system context, answer the following question.
            Be natural and conversational. Use the previous analysis context to inform your answer.{sys_context}

            Question: {query}

            Respond naturally in 1-4 sentences.
            """

            response = self.model.generate_content([prompt, image])
            return response.text.strip()

        except Exception as e:
            return f"Error analyzing media: {str(e)}"

    def analyze_frame_with_query(self, frame_bytes: bytes, query: str, context: str = "") -> str:
        """Answer a specific question about a live camera frame."""
        if not self.model:
            return f"[Gemini not available] I cannot answer: {query}"

        try:
            image = {
                "mime_type": "image/jpeg",
                "data": frame_bytes,
            }

            sys_context = f"\nSystem Context:\n{context}\n" if context else ""
            prompt = f"""
            You are AERIOAI, an autonomous drone AI.
            Based on this live camera frame and the system context, answer the following question.
            Be concise and factual. If you cannot determine something, say so.{sys_context}

            Question: {query}

            Answer in 1-3 sentences.
            """

            response = self.model.generate_content([prompt, image])
            return response.text.strip()

        except Exception as e:
            return f"Error analyzing live frame: {str(e)}"

    def generate_mission_summary(self, mission) -> str:
        """Generate a natural language mission summary."""
        if not self.model:
            return self._mock_mission_summary(mission)

        try:
            prompt = f"""
            You are AERIOAI. Summarize this drone mission:

            Name: {mission.name}
            Duration: {mission.duration_seconds}s
            Distance: {mission.distance_meters}m
            Objects Detected: {mission.total_objects_detected}
            Threats: {mission.total_threats}

            Write a 3-4 sentence professional mission summary.
            """

            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            return self._mock_mission_summary(mission)

    def compare_missions(self, missions: List) -> str:
        """Compare two or more missions."""
        if not self.model:
            return self._mock_compare(missions)

        try:
            mission_data = []
            for m in missions:
                mission_data.append(f"""
                Mission {m.id}: {m.name}
                Duration: {m.duration_seconds}s
                Objects: {m.total_objects_detected}
                Threats: {m.total_threats}
                Threat Score: {m.threat_score}
                Success: {m.mission_success}%
                """)

            prompt = f"""
            Compare these drone missions and highlight key differences:

            {''.join(mission_data)}

            Write a 4-5 sentence comparison.
            """

            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            return self._mock_compare(missions)

    def query_missions(self, query: str, missions: List) -> tuple:
        """AI-powered query over mission history."""
        if not self.model:
            return self._mock_query(query, missions), []

        try:
            mission_summaries = []
            for m in missions[:20]:
                mission_summaries.append(
                    f"[{m.id}] {m.name} | Duration: {m.duration_seconds}s | "
                    f"Objects: {m.total_objects_detected} | Threats: {m.total_threats} | "
                    f"Status: {m.status} | Score: {m.mission_success}%"
                )

            prompt = f"""
            Given these missions:
            {chr(10).join(mission_summaries)}

            User query: {query}

            Answer the query based on the mission data.
            Also list the mission IDs that are relevant.
            Format: ANSWER|[id1,id2,id3]
            """

            response = self.model.generate_content(prompt)
            text = response.text.strip()

            if "|" in text:
                answer, ids_str = text.rsplit("|", 1)
                try:
                    ids = json.loads(ids_str.strip())
                    return answer.strip(), ids
                except:
                    return text, []

            return text, []

        except Exception as e:
            return f"Error querying missions: {str(e)}", []

    def _mock_analysis(self) -> dict:
        return {
            "summary": "Scene analysis unavailable - Gemini API not configured.",
            "activity": "Unknown",
            "objects": [],
            "threat_level": "LOW",
            "confidence": 0,
            "recommendations": None,
            "key_observations": [],
        }

    def _mock_mission_summary(self, mission) -> str:
        return f"Mission '{mission.name}' completed. Duration: {mission.duration_seconds}s. No AI summary available."

    def _mock_compare(self, missions) -> str:
        return f"Comparison of {len(missions)} missions. AI comparison unavailable."

    def _mock_query(self, query: str, missions: List) -> str:
        return f"Query received: '{query}'. AI mission search unavailable."
