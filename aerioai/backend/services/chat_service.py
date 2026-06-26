from typing import Optional
from sqlalchemy.orm import Session

from config import settings


class GroqService:
    """Groq API for fast chat, voice transcription, and conversational AI."""

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize Groq client."""
        try:
            if settings.GROQ_API_KEY:
                from groq import Groq
                self.client = Groq(api_key=settings.GROQ_API_KEY)
                print("Groq API initialized")
            else:
                print("Groq API key not set - chat features disabled")
        except Exception as e:
            print(f"Groq init error: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def general_chat(self, message: str, context: str = "") -> str:
        """General conversation with Groq LLM."""
        if not self.client:
            return self._fallback_response(message)

        try:
            sys_prompt = (
                "You are AERIOAI, a friendly and intelligent autonomous drone AI copilot. "
                "You assist with aerial surveillance, mission intelligence, and general conversation.\n\n"
                "IMPORTANT RULES:\n"
                "1. For casual greetings (hey, hi, hello, what's up, etc.), respond warmly and casually like a friend. "
                "Do NOT analyze scenes or give technical reports for casual chat.\n"
                "2. For mission/surveillance questions, be concise and professional.\n"
                "3. When the user asks about photos or videos from a specific date/time, look through the 'Recent Media' in the System Context below. "
                "Display matching media using this exact markdown format: ![Description](http://localhost:8000/api/camera/thumbnail/<ID>)\n"
                "For videos, use: [Video: filename](http://localhost:8000/api/camera/download/<ID>)\n"
                "4. Keep responses to 1-4 sentences unless the user asks for detail.\n"
                "5. Never say you can't retrieve images or videos — you have the media data in context below.\n\n"
            )
            if context:
                sys_prompt += f"System Context:\n{context}\n\n"

            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": sys_prompt,
                    },
                    {"role": "user", "content": message},
                ],
                max_tokens=500,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Groq chat error: {e}")
            return self._fallback_response(message)

    def chat_about_mission(self, message: str, mission_id: str, db: Session) -> str:
        """Chat about a specific mission with context."""
        from core.models import Mission
        mission = db.query(Mission).filter(Mission.id == mission_id).first()

        if not mission:
            return "Mission not found."

        if not self.client:
            return f"Mission {mission.name}: Duration {mission.duration_seconds}s, {mission.total_objects_detected} objects detected. (AI unavailable)"

        try:
            context = f"""
            Mission: {mission.name}
            Status: {mission.status}
            Duration: {mission.duration_seconds}s
            Distance: {mission.distance_meters}m
            Objects Detected: {mission.total_objects_detected}
            Threats: {mission.total_threats}
            Threat Score: {mission.threat_score}
            Success Score: {mission.mission_success}%
            Summary: {mission.summary or 'No summary available'}
            """

            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are AERIOAI. Answer questions about this mission:\n{context}",
                    },
                    {"role": "user", "content": message},
                ],
                max_tokens=250,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            return f"Error processing query: {str(e)}"

    def transcribe_audio(self, audio_bytes: bytes) -> Optional[str]:
        """Transcribe audio using Groq Whisper API."""
        if not self.client:
            print("Groq not available for transcription")
            return None

        try:
            from io import BytesIO

            audio_file = BytesIO(audio_bytes)
            audio_file.name = "audio.wav"

            transcription = self.client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=audio_file,
                response_format="text",
            )
            return transcription.strip()

        except Exception as e:
            print(f"Groq transcription error: {e}")
            return None

    def _fallback_response(self, message: str) -> str:
        """Response when Groq is unavailable."""
        if "see" in message.lower():
            return "I cannot analyze the scene right now. AI services are offline."
        elif "battery" in message.lower():
            return "Battery status unavailable. Check the telemetry dashboard."
        elif "status" in message.lower():
            return "System status unavailable. AI services are currently offline."
        return f"I received your message: '{message}'. However, AI services are currently unavailable. Please check your Groq API key configuration."
