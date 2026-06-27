import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.models import Media
from services.gemini_service import GeminiService
from api.chat import deep_analyze_video
from schemas.chat import DeepVideoAnalysisRequest

engine = create_engine("sqlite:///aerioai.db")
Session = sessionmaker(bind=engine)
db = Session()
media = db.query(Media).filter(Media.id == "172e8bf4").first()

service = GeminiService()
try:
    res = service.analyze_video_deep_reasoning(media)
    print("SUCCESS")
    print(res)
except Exception as e:
    print(f"FAILED: {e}")
