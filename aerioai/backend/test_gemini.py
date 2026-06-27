import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.models import Media
from services.gemini_service import GeminiService

engine = create_engine("sqlite:///aerioai.db")
Session = sessionmaker(bind=engine)
db = Session()
media = db.query(Media).filter(Media.id == "7c91d065").first()

service = GeminiService()
res = service.analyze_video_deep_reasoning(media)
print(res)
