import asyncio
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.ratelimit import limiter
from app.cache import sample_cache
from app.services.tts import synthesize_to_bytes
from app.routers import health, transcribe, chat, tts, samples

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("voicebot")


async def prewarm_sample_cache():
    """Asynchronously pre-synthesize audio for starter questions in the background."""
    if os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("APP_ENV") == "testing" or settings.APP_ENV in ("testing", "test"):
        logger.info("Skipping sample audio pre-warming in testing mode.")
        return

    logger.info("Starting background pre-warming of sample audio cache...")
    for item in sample_cache.samples:
        sample_id = item["id"]
        answer_text = item["answer"]
        try:
            audio_bytes = await synthesize_to_bytes(answer_text)
            sample_cache.store_audio(sample_id, audio_bytes)
            logger.info(f"Pre-warmed audio cache for sample: {sample_id} ({len(audio_bytes)} bytes)")
        except Exception as e:
            logger.warning(f"Failed to pre-warm audio for {sample_id}: {e}")
    logger.info("Sample audio pre-warming complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting VoiceBot API (env: {settings.APP_ENV})")
    # Launch cache pre-warming in background only when explicitly enabled
    if settings.PREWARM_AUDIO_CACHE and not (
        os.environ.get("PYTEST_CURRENT_TEST") or settings.APP_ENV in ("testing", "test")
    ):
        asyncio.create_task(prewarm_sample_cache())
    yield
    logger.info("Shutting down VoiceBot API...")


app = FastAPI(
    title="Voice Bot API",
    description="Production-grade Voice Bot backend powered by Groq, Gemini, and Edge-TTS",
    version="1.0.0",
    lifespan=lifespan,
)

# Attach SlowAPI limiter
app.state.limiter = limiter


# ---------------------------------------------------------------------------
# Global Exception Handlers (Standardized readable error format)
# ---------------------------------------------------------------------------
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "userMessage": "You're sending requests too quickly. Please pause for a moment before trying again.",
            "code": "RATE_LIMIT_EXCEEDED",
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Ensure client always receives structured user-facing message
    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        content = {
            "error": str(exc.detail),
            "userMessage": str(exc.detail),
            "code": "HTTP_ERROR",
        }
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "userMessage": "An unexpected error occurred. Please try again in a few moments.",
            "code": "INTERNAL_SERVER_ERROR",
        },
    )


# ---------------------------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------------------------
origins = settings.ALLOWED_ORIGINS
if "*" not in origins:
    # Always allow local dev origins
    origins = list(set(origins + ["http://localhost:5173", "http://127.0.0.1:5173"]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.APP_ENV == "development" else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API Routers
# ---------------------------------------------------------------------------
app.include_router(health.router)
app.include_router(transcribe.router)
app.include_router(chat.router)
app.include_router(tts.router)
app.include_router(samples.router)


# ---------------------------------------------------------------------------
# Static Files & SPA Fallback (Conditional)
# ---------------------------------------------------------------------------
static_dir = Path(settings.STATIC_DIR)
if static_dir.is_dir() and (static_dir / "index.html").exists():
    logger.info(f"Mounting frontend static build from {static_dir}")
    assets_dir = static_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't hijack API or documentation routes
        if full_path == "api" or full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404, detail="Route not found")

        base_resolved = static_dir.resolve()
        target_resolved = (static_dir / full_path).resolve()

        # Prevent directory traversal attacks
        try:
            if target_resolved.is_relative_to(base_resolved) and target_resolved.is_file():
                return FileResponse(str(target_resolved))
        except (ValueError, RuntimeError):
            pass

        return FileResponse(str(static_dir / "index.html"))
else:
    logger.info(f"Static directory {static_dir} not found; running in API-only mode.")

    @app.get("/")
    async def root_info():
        return {
            "name": "Voice Bot API",
            "status": "online",
            "documentation": "/docs",
            "health": "/api/health",
        }
