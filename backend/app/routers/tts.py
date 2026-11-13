from typing import Optional
from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.config import settings
from app.ratelimit import limiter, daily_counter
from app.services.tts import stream_tts_audio
from app.cache import sample_cache

router = APIRouter(prefix="/api", tags=["tts"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=650)
    sample_id: Optional[str] = None


@router.post("/tts")
@limiter.limit(settings.RATE_LIMIT_PER_MINUTE)
async def tts_endpoint(request: Request, body: TTSRequest):
    """
    Synthesize speech using edge-tts with audio/mpeg streaming.
    Returns pre-cached audio instantly if sample_id matches.
    """
    daily_counter.check_and_increment()

    # Check in-memory pre-warmed audio cache first
    if body.sample_id:
        cached_audio = sample_cache.get_audio(body.sample_id)
        if cached_audio:
            return Response(
                content=cached_audio,
                media_type="audio/mpeg",
                headers={"X-Cache-Hit": "true"},
            )

    return StreamingResponse(
        stream_tts_audio(body.text),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )

