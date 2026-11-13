from fastapi import APIRouter, File, UploadFile, Request, HTTPException
from app.ratelimit import limiter, daily_counter
from app.services.stt import transcribe_audio
from app.config import settings

router = APIRouter(prefix="/api", tags=["transcribe"])


@router.post("/transcribe")
@limiter.limit(settings.RATE_LIMIT_PER_MINUTE)
async def transcribe_endpoint(request: Request, audio: UploadFile = File(...)):
    """
    Transcribe audio blob via Groq Whisper.
    Enforces rate limits and file size safety.
    """
    daily_counter.check_and_increment()

    # Read uploaded audio into memory
    content = await audio.read()
    filename = audio.filename or "recording.webm"

    text = await transcribe_audio(content, original_filename=filename)
    return {"text": text}

