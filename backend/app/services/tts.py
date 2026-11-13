import logging
from typing import AsyncGenerator
import edge_tts
from fastapi import HTTPException
from app.config import settings

logger = logging.getLogger(__name__)

MAX_TTS_TEXT_LENGTH = 650


async def stream_tts_audio(text: str, voice: str = None) -> AsyncGenerator[bytes, None]:
    """
    Synthesize text to speech using edge-tts and stream the mp3 bytes.
    Enforces maximum length and handles errors.
    """
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Empty text provided",
                "userMessage": "Cannot synthesize empty speech.",
                "code": "EMPTY_TEXT",
            },
        )

    if len(clean_text) > MAX_TTS_TEXT_LENGTH:
        clean_text = clean_text[:MAX_TTS_TEXT_LENGTH]

    chosen_voice = voice or settings.TTS_VOICE

    try:
        communicate = edge_tts.Communicate(clean_text, chosen_voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]
    except Exception as e:
        logger.error(f"edge-tts synthesis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail={
                "error": f"TTS synthesis failed: {str(e)}",
                "userMessage": "Voice synthesis temporarily unavailable; switching to browser voice.",
                "code": "TTS_SYNTHESIS_FAILED",
            },
        )


async def synthesize_to_bytes(text: str, voice: str = None) -> bytes:
    """Synthesize full audio into in-memory bytes (useful for pre-warming sample cache)."""
    audio_chunks = []
    async for chunk in stream_tts_audio(text, voice):
        audio_chunks.append(chunk)
    return b"".join(audio_chunks)

