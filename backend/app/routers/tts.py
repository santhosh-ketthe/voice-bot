from typing import Optional
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.services.tts import stream_tts_audio

router = APIRouter(prefix="/api", tags=["tts"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=650)
    sample_id: Optional[str] = None


@router.post("/tts")
async def tts_endpoint(request: Request, body: TTSRequest):
    """
    Synthesize speech dynamically using edge-tts with audio/mpeg streaming.
    """
    return StreamingResponse(
        stream_tts_audio(body.text),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )

