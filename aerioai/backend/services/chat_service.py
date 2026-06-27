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

    def general_chat(self, message: str, context: str = "", camera_service=None, gemini_service=None) -> str:
        """General conversation with Groq LLM, with tool calling support."""
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
                "3. When the user asks to SEE or RETRIEVE photos or videos from a specific date/time, look through the 'Recent Media' in the System Context below. "
                "Display matching media using this exact markdown format: ![Description](/api/camera/thumbnail/<ID>)\n"
                "For videos, use: [Video: filename](/api/camera/download/<ID>)\n"
                "4. If the user asks to SUMMARIZE, ANALYZE, or DESCRIBE the media, write a conversational response based on the 'Summary' and 'Threat' from the context. Do not just output the markdown link.\n"
                "5. Keep responses to 1-4 sentences unless the user asks for detail.\n"
                "6. Never say you can't retrieve images or videos — you have the media data in context below.\n"
                "7. If the user asks 'what do you see in the live stream', 'what are you looking at right now', or similar, CALL the analyze_live_camera tool.\n\n"
            )
            if context:
                sys_prompt += f"System Context:\n{context}\n\n"

            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "analyze_live_camera",
                        "description": "Capture a snapshot from the live camera stream and get a detailed description of what is currently visible.",
                        "parameters": {
                            "type": "object",
                            "properties": {},
                        }
                    }
                }
            ]

            messages = [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": message},
            ]

            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=500,
                temperature=0.7,
            )
            
            response_message = response.choices[0].message
            
            if response_message.tool_calls:
                for tool_call in response_message.tool_calls:
                    if tool_call.function.name == "analyze_live_camera":
                        if camera_service and gemini_service:
                            frame_bytes = camera_service.get_current_snapshot_bytes()
                            if frame_bytes:
                                vision_analysis = gemini_service.analyze_frame_with_query(frame_bytes, "Describe what you see in this live camera feed.", context="")
                            else:
                                vision_analysis = "Error: Camera is currently unavailable."
                        else:
                            vision_analysis = "Error: Internal services not loaded."
                        
                        messages.append(response_message)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": tool_call.function.name,
                            "content": vision_analysis,
                        })
                
                # Second API call with the tool result
                second_response = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    max_tokens=500,
                    temperature=0.7,
                )
                return second_response.choices[0].message.content.strip()

            return response_message.content.strip()

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
