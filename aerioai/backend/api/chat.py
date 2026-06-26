from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from core.security import get_current_user
from core.database import get_db
from core.models import User, Media, VoiceLog, LiveAnalysisLog
from api.camera import camera_service
from services.gemini_service import GeminiService
from services.chat_service import GroqService
from services.tts_service import TTSService
from services.nvidia_service import NvidiaService
from schemas.chat import (
    ChatRequest, ChatResponse, VoiceCommandResponse,
    SceneAnalysisRequest, SceneAnalysisResponse,
    DeepVideoAnalysisRequest, DeepVideoAnalysisResponse,
    LiveAnalysisLogResponse
)
from typing import List

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])
gemini_service = GeminiService()
groq_service = GroqService()
tts_service = TTSService()
nvidia_service = NvidiaService()


from services.fc_service import FlightControllerService

fc_service = FlightControllerService()

def _build_system_context(db: Session, user_id: int) -> str:
    # 1. Telemetry
    t = fc_service.get_telemetry()
    ctx = f"System Telemetry: Altitude {t.get('altitude',0)}m, Battery {t.get('battery_percent',0)}%, Speed {t.get('ground_speed',0)}m/s.\n"
    
    # 2. Chat History (last 10)
    history = db.query(LiveAnalysisLog).filter(LiveAnalysisLog.user_id == user_id).order_by(LiveAnalysisLog.created_at.desc()).limit(10).all()
    if history:
        ctx += "Recent Chat History:\n"
        for h in reversed(history):
            ctx += f"- {h.role.upper()}: {h.message}\n"
    
    # 3. Media Context
    media = db.query(Media).order_by(Media.created_at.desc()).limit(20).all()
    if media:
        photos = [m for m in media if m.media_type == 'PHOTO']
        videos = [m for m in media if m.media_type == 'VIDEO']
        
        if photos:
            ctx += "\nRecent Photos:\n"
            for m in photos:
                ctx += f"- Photo ID: {m.id}, Filename: {m.filename}, Taken: {m.created_at}, Threat: {m.threat_level}, Summary: {m.summary}\n"
                ctx += f"  Display with: ![{m.filename}](/api/camera/thumbnail/{m.id})\n"
        
        if videos:
            ctx += "\nRecent Videos:\n"
            for m in videos:
                ctx += f"- Video ID: {m.id}, Filename: {m.filename}, Taken: {m.created_at}, Duration: {m.duration_seconds}s, Summary: {m.summary}\n"
                ctx += f"  Display with: [🎬 {m.filename}](/api/camera/download/{m.id})\n"
        
        ctx += "\nCRITICAL RULES FOR MEDIA - READ CAREFULLY:\n"
        ctx += "When the user asks for photos or images, respond by copying the EXACT 'Display with:' lines from the Recent Photos section above.\n"
        ctx += "When the user asks for videos, respond by copying the EXACT 'Display with:' lines from the Recent Videos section above.\n"
        ctx += "DO NOT invent, shorten, or alter the markdown links. Copy them character-for-character.\n"
        ctx += "DO NOT wrap them in code blocks. Just paste the markdown directly.\n"
        ctx += "DO NOT provide analysis unless the user explicitly asks 'analyze', 'what is in', or 'describe'.\n"
        ctx += "If the user asks about a specific media's content, use its Summary and Threat Level from the context above.\n"
            
    return ctx

@router.post("/message", response_model=ChatResponse)
def chat_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI Copilot chat - text in, text out."""
    ctx = _build_system_context(db, current_user.id)
    if payload.live_stream:
        frame_bytes = camera_service.get_current_snapshot_bytes()
        if frame_bytes:
            response_text = gemini_service.analyze_frame_with_query(frame_bytes, payload.message, context=ctx)
        else:
            response_text = "Cannot analyze live stream - camera is currently unavailable."
    elif payload.media_id:
        media = db.query(Media).filter(Media.id == payload.media_id).first()
        if media:
            response_text = gemini_service.analyze_media_with_query(media, payload.message, context=ctx)
        else:
            response_text = "Media not found."
    elif payload.mission_id:
        response_text = groq_service.chat_about_mission(payload.message, payload.mission_id, db)
    else:
        response_text = groq_service.general_chat(payload.message, context=ctx)

    audio_url = None
    if payload.generate_audio:
        audio_url = tts_service.generate_speech(response_text)

    # Save user query
    user_log = LiveAnalysisLog(user_id=current_user.id, role="user", message=payload.message, session_id=payload.session_id, context=payload.context)
    db.add(user_log)
    # Save AI response
    ai_log = LiveAnalysisLog(user_id=current_user.id, role="ai", message=response_text, session_id=payload.session_id, context=payload.context)
    db.add(ai_log)
    db.commit()

    return ChatResponse(
        response=response_text,
        media_id=payload.media_id,
        mission_id=payload.mission_id,
        live_stream=payload.live_stream,
        audio_url=audio_url,
        session_id=payload.session_id,
        context=payload.context
    )


@router.post("/voice", response_model=VoiceCommandResponse)
async def voice_command(
    audio: UploadFile = File(...),
    mission_id: str = None,
    media_id: str = None,
    live_stream: bool = False,
    session_id: str = None,
    context: str = "ai_chat",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Voice command - audio in, text + audio out."""
    audio_bytes = await audio.read()

    transcribed_text = groq_service.transcribe_audio(audio_bytes)
    if not transcribed_text:
        raise HTTPException(status_code=400, detail="Could not transcribe audio")

    ctx = _build_system_context(db, current_user.id)
    if live_stream:
        frame_bytes = camera_service.get_current_snapshot_bytes()
        if frame_bytes:
            ai_response = gemini_service.analyze_frame_with_query(frame_bytes, transcribed_text, context=ctx)
        else:
            ai_response = "Cannot analyze live stream - camera is currently unavailable."
    elif media_id:
        media = db.query(Media).filter(Media.id == media_id).first()
        if media:
            ai_response = gemini_service.analyze_media_with_query(media, transcribed_text, context=ctx)
        else:
            ai_response = "Media not found."
    elif mission_id:
        ai_response = groq_service.chat_about_mission(transcribed_text, mission_id, db)
    else:
        ai_response = groq_service.general_chat(transcribed_text, context=ctx)

    audio_path = tts_service.generate_speech(ai_response)

    # Save user query
    user_log = LiveAnalysisLog(user_id=current_user.id, role="user", message=transcribed_text, is_voice=1, session_id=session_id, context=context)
    db.add(user_log)
    # Save AI response
    ai_log = LiveAnalysisLog(user_id=current_user.id, role="ai", message=ai_response, is_voice=1, session_id=session_id, context=context)
    db.add(ai_log)
    db.commit()

    if mission_id:
        voice_log = VoiceLog(
            mission_id=mission_id,
            user_query=transcribed_text,
            ai_response=ai_response,
            audio_filepath=audio_path,
        )
        db.add(voice_log)
        db.commit()

    return VoiceCommandResponse(
        transcribed_text=transcribed_text,
        ai_response=ai_response,
        audio_url=audio_path,
    )


@router.post("/analyze-scene", response_model=SceneAnalysisResponse)
def analyze_scene(
    payload: SceneAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze a photo/video with full scene understanding."""
    if payload.live_stream:
        frame_bytes = camera_service.get_current_snapshot_bytes()
        if frame_bytes:
            result = gemini_service.analyze_live_scene(frame_bytes, payload.prompt)
        else:
            # Camera unavailable - return a mock/fallback analysis
            result = {
                "summary": "Camera feed unavailable. Please check that your camera is connected and macOS camera permissions are granted to the Terminal in System Settings > Privacy & Security > Camera.",
                "activity": "No feed",
                "objects": [],
                "threat_level": "LOW",
                "confidence": 0,
                "recommendations": "Check camera permissions and connectivity.",
                "key_observations": [],
            }
        media_id = "live"
    else:
        media = db.query(Media).filter(Media.id == payload.media_id).first()
        if not media:
            raise HTTPException(status_code=404, detail="Media not found")
        
        if payload.analysis_type == "normal":
            result = nvidia_service.analyze_with_kimi(media, payload.prompt)
        else:
            result = gemini_service.analyze_scene(media, payload.prompt)
        
        # Create history entry
        import datetime
        history_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "summary": result.get("summary", ""),
            "threat_level": result.get("threat_level", "LOW"),
            "detections": result.get("objects", []),
            "recommendations": result.get("recommendations", ""),
            "prompt": payload.prompt or "",
            "type": payload.analysis_type
        }
        
        # Make sure analysis_history is a list
        current_history = media.analysis_history or []
        current_history.append(history_entry)
        
        # We must assign a new list to trigger SQLAlchemy's JSON mutation tracking
        media.analysis_history = list(current_history)
        
        # Also update the primary summary for backwards compatibility/quick viewing
        media.summary = history_entry["summary"]
        media.threat_level = history_entry["threat_level"]
        media.objects_detected = history_entry["detections"]
        db.commit()
        media_id = media.id

    # If it's a live stream, log the structured analysis in LiveAnalysisLog so it shows up in chat history
    if payload.live_stream:
        log_message = f"**{result.get('threat_level', 'LOW')} THREAT**\n{result.get('summary', '')}\n\n*Objects: {', '.join([o.get('class', '') for o in result.get('objects', [])])}*\n\nRecommendation: {result.get('recommendations', '')}"
        ai_log = LiveAnalysisLog(user_id=current_user.id, role="ai", message=log_message)
        db.add(ai_log)
        db.commit()

    return SceneAnalysisResponse(
        media_id=media_id,
        detections=result.get("objects", []),
        summary=result.get("summary", ""),
        threat_level=result.get("threat_level", "LOW"),
        confidence=result.get("confidence", 0.0),
        recommendations=result.get("recommendations"),
    )


@router.post("/deep-analyze-video", response_model=DeepVideoAnalysisResponse)
def deep_analyze_video(
    payload: DeepVideoAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze a video using Gemini deep reasoning or Normal Kimi."""
    media = db.query(Media).filter(Media.id == payload.media_id, Media.media_type == "video").first()
    if not media:
        raise HTTPException(status_code=404, detail="Video not found")

    if payload.analysis_type == "normal":
        result = nvidia_service.analyze_with_kimi(media)
    else:
        result = gemini_service.analyze_video_deep_reasoning(media)

    import datetime
    history_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "summary": result.get("summary", ""),
        "threat_level": result.get("threat_level", "LOW"),
        "detections": result.get("objects", []),
        "recommendations": result.get("recommendations", ""),
        "prompt": "",
        "type": payload.analysis_type
    }
    current_history = media.analysis_history or []
    current_history.append(history_entry)
    media.analysis_history = list(current_history)
    media.summary = history_entry["summary"]
    media.threat_level = history_entry["threat_level"]
    media.objects_detected = history_entry["detections"]
    db.commit()

    return DeepVideoAnalysisResponse(
        media_id=media.id,
        summary=result.get("summary", ""),
        detections=result.get("objects", []),
        threat_level=result.get("threat_level", "LOW"),
        confidence=result.get("confidence", 0.0),
        recommendations=result.get("recommendations", ""),
    )


@router.get("/startup-announcement")
def get_startup_announcement(current_user: User = Depends(get_current_user)):
    """Generate audio URL for startup announcement."""
    if not tts_service.is_available():
        return {"audio_url": ""}
        
    text = "System is starting. Drone motors configuring. Connection established and ready to fly."
    audio_path = tts_service.generate_speech(text)
    return {"audio_url": audio_path, "text": text}


@router.get("/history", response_model=List[LiveAnalysisLogResponse])
def get_live_analysis_history(
    context: str = None,
    session_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch real-time live analysis history."""
    query = db.query(LiveAnalysisLog).filter(LiveAnalysisLog.user_id == current_user.id)
    if context:
        query = query.filter(LiveAnalysisLog.context == context)
    if session_id:
        query = query.filter(LiveAnalysisLog.session_id == session_id)
        
    logs = query.order_by(LiveAnalysisLog.created_at.asc()).all()
    return logs
