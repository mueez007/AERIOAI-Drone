import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.chat import _build_system_context

engine = create_engine("sqlite:///aerioai.db")
Session = sessionmaker(bind=engine)
db = Session()
print(_build_system_context(db, 1))
