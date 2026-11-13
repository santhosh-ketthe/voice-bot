import logging
from typing import Optional
from fastapi import HTTPException
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import groq
from app.config import settings

logger = logging.getLogger(__name__)

_groq_client: Optional[groq.AsyncGroq] = None


def get_groq_client() -> groq.AsyncGroq:
    global _groq_client
    if _groq_client is None:
        if not settings.GROQ_API_KEY:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "GROQ_API_KEY not configured",
                    "userMessage": "Groq API key is missing on the server. Please check environment configuration.",
                    "code": "MISSING_API_KEY",
                },
            )
        _groq_client = groq.AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=15.0)
    return _groq_client


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=3),
    retry=retry_if_exception_type((groq.APIConnectionError, groq.RateLimitError)),
    reraise=True,
)
async def _execute_transcription(audio_bytes: bytes, filename: str) -> str:
    client = get_groq_client()
    transcription = await client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model=settings.GROQ_WHISPER_MODEL,
        response_format="json",
        language="en",
        temperature=0.0,
    )
    return transcription.text.strip()


async def transcribe_audio(audio_bytes: bytes, original_filename: str = "audio.webm") -> str:
    """
    Transcribe audio bytes using Groq Whisper.
    Enforces size limit and file naming for codec hints.
    """
    size_mb = len(audio_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_AUDIO_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "Audio file too large",
                "userMessage": f"Audio file ({size_mb:.1f}MB) exceeds the {settings.MAX_AUDIO_SIZE_MB}MB limit.",
                "code": "FILE_TOO_LARGE",
            },
        )

    if len(audio_bytes) < 1000:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Audio file too short or empty",
                "userMessage": "Didn't catch any audio. Please hold the mic and speak clearly.",
                "code": "AUDIO_TOO_SHORT",
            },
        )

    # Ensure a valid file extension is present for Whisper format detection
    ext = original_filename.split(".")[-1].lower() if "." in original_filename else "webm"
    if ext not in ["webm", "mp4", "m4a", "wav", "ogg", "mp3"]:
        ext = "webm"
    filename = f"recording.{ext}"

    try:
        text = await _execute_transcription(audio_bytes, filename)
        if not text:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "No speech detected",
                    "userMessage": "No clear speech detected in recording. Please try again.",
                    "code": "NO_SPEECH_DETECTED",
                },
            )
        return text
    except HTTPException:
        raise
    except groq.APIStatusError as e:
        logger.error(f"Groq Whisper API status error: {e}")
        raise HTTPException(
            status_code=502,
            detail={
                "error": f"Groq Whisper error: {e.message}",
                "userMessage": "Speech transcription service is currently unavailable. Please type your question.",
                "code": "STT_PROVIDER_ERROR",
            },
        )
    except Exception as e:
        logger.error(f"Unexpected STT error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "userMessage": "Transcription failed. Please try typing your question instead.",
                "code": "STT_UNKNOWN_ERROR",
            },
        )

