import time
from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/api", tags=["health"])

SERVER_START_TIME = time.time()


@router.get("/health")
async def health_check():
    """
    Health check endpoint for container uptime monitoring (e.g. UptimeRobot)
    and deployment orchestrators (Render, Hugging Face Spaces).
    """
    uptime_seconds = int(time.time() - SERVER_START_TIME)

    return {
        "ok": True,
        "status": "healthy",
        "service": "voice-bot-api",
        "env": settings.APP_ENV,
        "uptime_seconds": uptime_seconds,
    }

