import sys
import os

# Ensure the backend directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Resolve absolute media path from backend dir
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_MEDIA_PATH = os.path.abspath(os.path.join(_BACKEND_DIR, "..", "media"))
os.makedirs(os.path.join(_MEDIA_PATH, "photos"), exist_ok=True)
os.makedirs(os.path.join(_MEDIA_PATH, "videos"), exist_ok=True)
os.environ.setdefault("MEDIA_PATH", _MEDIA_PATH)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config import settings
from core.database import init_db
from api import auth, camera, telemetry, mission, chat, system, sar


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("=" * 50)
    print(f"🚁 {settings.APP_NAME} v{settings.APP_VERSION}")
    print("=" * 50)
    print("Initializing database...")
    init_db()
    
    # Create default admin user if none exists
    from core.database import SessionLocal
    from core.models import User, UserRole
    from core.security import hash_password
    db = SessionLocal()
    try:
        if not db.query(User).first():
            print("Creating default admin user...")
            admin_user = User(
                username="admin",
                email="admin@aerioai.com",
                hashed_password=hash_password("admin123"),
                role=UserRole.ADMIN
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()
        
    print("Database initialized.")
    print(f"Camera mode: {settings.CAMERA_SOURCE}")
    print(f"Flight controller mode: {settings.FC_MODE}")
    print(f"Server starting on {settings.API_HOST}:{settings.API_PORT}")
    print("=" * 50)
    yield
    print("Shutting down AERIOAI...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Autonomous Drone for Surveillance, Delivery & Emergency Response",
    lifespan=lifespan,
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(camera.router)
app.include_router(telemetry.router)
app.include_router(mission.router)
app.include_router(chat.router)
app.include_router(system.router)
app.include_router(sar.router)

# Serve media files statically
app.mount("/media", StaticFiles(directory=_MEDIA_PATH), name="media")


@app.get("/")
def root():
    """Root endpoint - API status."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Simple health check."""
    return {"status": "ok", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
