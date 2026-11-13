from fastapi import APIRouter, HTTPException, Response
from app.cache import sample_cache

router = APIRouter(prefix="/api/samples", tags=["samples"])


@router.get("")
async def get_samples():
    """Return the list of 5 starter questions with pre-warmed answers."""
    return {"samples": sample_cache.get_all_samples()}


@router.get("/{sample_id}/audio")
async def get_sample_audio(sample_id: str):
    """Retrieve pre-synthesized audio for a sample question."""
    audio_bytes = sample_cache.get_audio(sample_id)
    if not audio_bytes:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Sample audio not found or not yet cached",
                "userMessage": "Sample audio not yet pre-warmed.",
                "code": "SAMPLE_AUDIO_NOT_FOUND",
            },
        )
    return Response(content=audio_bytes, media_type="audio/mpeg")
