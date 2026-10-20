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

    def _get_mission_system_prompt(self, mission_mode: str = "surveillance") -> str:
        mode_key = (mission_mode or "surveillance").lower().replace("-", "_").replace(" ", "_")
        prompts = {
            "surveillance": (
                "You are AERIOAI Surveillance Copilot, an elite airborne tactical reconnaissance AI. "
                "Your domain is perimeter security, unauthorized intrusion detection, patrol routing, and aerial threat intelligence.\n\n"
                "MISSION DIRECTIVES:\n"
                "1. Tactical Monitoring: Prioritize security boundaries, movement anomalies, suspicious vehicle presence, and line-of-sight analysis.\n"
                "2. Professional & Concise: Deliver clear situational assessments (1-3 sentences). For casual greetings, respond warmly as a tactical copilot.\n"
                "3. Live Camera Intelligence: If asked about live visual feed or what you see right now, call analyze_live_camera.\n"
                "4. Media Retrieval: Use exact markdown format ![Description](/api/camera/thumbnail/<ID>) for photos, [Video: filename](/api/camera/download/<ID>) for videos.\n"
            ),
            "search_rescue": (
                "You are AERIOAI Search & Rescue Copilot, an urgent airborne SAR tactical AI. "
                "Your domain is locating missing persons, identifying human thermal signatures, optimizing search patterns (expanding square, creeping line, sector), and disaster response triage.\n\n"
                "MISSION DIRECTIVES:\n"
                "1. Life Safety & Triage: Prioritize human identification, thermal body heat anomalies, distress signals, and exact GPS coordinates.\n"
                "2. SAR Guidance: Provide actionable search altitude (AGL), swath spacing, and survival triage recommendations.\n"
                "3. Live Camera Intelligence: If asked about the current search view or what is visible, call analyze_live_camera to scan for survivors or distress markers.\n"
                "4. Media Retrieval: Reference past search photos and videos with exact markdown links from context.\n"
            ),
            "agriculture": (
                "You are AERIOAI Agronomy Survey Copilot, an aerial precision agriculture and photogrammetry AI. "
                "Your domain is crop canopy vigor, multispectral NDVI health analysis, irrigation deficits, weed infestation mapping, and acreage yield optimization.\n\n"
                "MISSION DIRECTIVES:\n"
                "1. Agronomic Intelligence: Prioritize crop stress zones, canopy uniformity, drainage/water logging, and vegetative index variations.\n"
                "2. Survey Precision: Provide flight altitude suggestions for target GSD (ground sample distance) and overlap percentages (75-80%).\n"
                "3. Live Camera Intelligence: If asked about current field conditions, call analyze_live_camera to inspect crop rows and foliage.\n"
                "4. Media Retrieval: Reference past agricultural field orthomosaics and survey photos with exact markdown links.\n"
            ),
            "inspection": (
                "You are AERIOAI Infrastructure Inspection Copilot, a structural integrity and asset inspection AI. "
                "Your domain is inspecting bridges, wind turbine blades, high-voltage power pylons, industrial pipelines, and concrete facades.\n\n"
                "MISSION DIRECTIVES:\n"
                "1. Defect Identification: Prioritize structural micro-cracks, surface corrosion/spalling, thermal hotspots, and fastener integrity.\n"
                "2. Safe Distance & Clearance: Advise on minimum standoff distance (orbit radius), gimbal pitch angles, and defect severity rating (Critical, Warning, Advisory).\n"
                "3. Live Camera Intelligence: If asked about the asset structure or what is visible, call analyze_live_camera to perform defect scanning.\n"
                "4. Media Retrieval: Reference past structural inspection captures with exact markdown links.\n"
            ),
        }
        return prompts.get(mode_key, prompts["surveillance"])

    def general_chat(self, message: str, context: str = "", camera_service=None, gemini_service=None, mission_mode: str = "surveillance") -> str:
        """General conversation with Groq LLM, with tool calling support and mission-specific system context."""
        if not self.client:
            return self._fallback_response(message)

        try:
            sys_prompt = self._get_mission_system_prompt(mission_mode)
            if context:
                sys_prompt += f"\nSystem Context:\n{context}\n\n"

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
        if not audio_bytes or len(audio_bytes) < 100:
            print("Audio bytes empty or too small (<100 bytes)")
            return None

        if not self.client:
            print("Groq not available for transcription")
            return None

        try:
            from io import BytesIO

            # Detect container format from magic bytes for Whisper API
            if audio_bytes.startswith(b"\x1a\x45\xdf\xa3"):
                filename = "audio.webm"
            elif audio_bytes.startswith(b"OggS"):
                filename = "audio.ogg"
            elif audio_bytes.startswith(b"RIFF"):
                filename = "audio.wav"
            elif audio_bytes.startswith(b"ID3") or audio_bytes.startswith(b"\xff\xfb"):
                filename = "audio.mp3"
            else:
                filename = "audio.webm"

            audio_file = BytesIO(audio_bytes)
            audio_file.name = filename

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
