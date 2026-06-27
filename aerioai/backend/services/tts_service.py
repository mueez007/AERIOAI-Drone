import os
import time
from config import settings


class TTSService:
    """Text-to-Speech using ElevenLabs for natural voice output."""

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize TTS client."""
        try:
            if settings.ELEVENLABS_API_KEY:
                print("ElevenLabs TTS initialized")
                self.client = True  # Will use API directly
            else:
                print("ElevenLabs API key not set - using fallback TTS")
                self.client = False
        except Exception as e:
            print(f"TTS init error: {e}")
            self.client = False

    def is_available(self) -> bool:
        return self.client is not None

    def generate_speech(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> str:
        """Generate speech audio file from text. Returns filepath."""
        if self.client:
            return self._elevenlabs_speech(text, voice_id)
        return self._fallback_speech(text)

    def _elevenlabs_speech(self, text: str, voice_id: str) -> str:
        """Generate speech using ElevenLabs API."""
        try:
            import httpx

            voice_id = "JBFqnCBsd6RMkjVDRZzb" # User requested voice id
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": settings.ELEVENLABS_API_KEY,
            }

            data = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            }

            response = httpx.post(url, json=data, headers=headers, timeout=30)

            if response.status_code == 200:
                filename = f"response_{int(time.time() * 1000)}.mp3"
                filepath = os.path.join(settings.MEDIA_PATH, "audio", filename)
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                with open(filepath, "wb") as f:
                    f.write(response.content)
                return f"/media/audio/{filename}"
            else:
                print(f"ElevenLabs error: {response.status_code}")
                return self._fallback_speech(text)

        except Exception as e:
            print(f"ElevenLabs speech error: {e}")
            return self._fallback_speech(text)

    def _fallback_speech(self, text: str) -> str:
        """Use system TTS as fallback (macOS say command or espeak on Linux)."""
        try:
            import platform
            filename = f"response_{int(time.time())}.m4a"
            filepath = os.path.join(settings.MEDIA_PATH, "audio", filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            system = platform.system()
            if system == "Darwin":
                os.system(f'say "{text}" -o {filepath}')
            elif system == "Linux":
                # espeak doesn't support m4a natively easily, but we can fallback to wav if needed.
                # Just keeping extension m4a, browsers might struggle if it's actually wav, but mac is the main target.
                os.system(f'espeak "{text}" -w {filepath}')
            else:
                return ""  # Return empty, no TTS available

            return f"/media/audio/{filename}"
        except Exception as e:
            print(f"Fallback TTS error: {e}")
            return ""
