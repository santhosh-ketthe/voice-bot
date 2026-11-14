from fastapi import APIRouter, File, UploadFile, Request
from app.services.stt import transcribe_audio

router = APIRouter(prefix="/api", tags=["transcribe"])


@router.post("/transcribe")
async def transcribe_endpoint(request: Request, audio: UploadFile = File(...)):
    """
    Transcribe audio blob via Groq Whisper.
    """
    # Read uploaded audio into memory
    content = await audio.read()
    filename = audio.filename or "recording.webm"

    text = await transcribe_audio(content, original_filename=filename)
    return {"text": text}


