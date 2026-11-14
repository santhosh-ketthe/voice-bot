from typing import List, Literal, Optional
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from app.services.llm import generate_chat_response

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=1000)


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=50)


class ChatResponse(BaseModel):
    answer: str
    source: str
    sample_id: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: Request, body: ChatRequest):
    """
    Generate conversational persona response using Groq GPT-OSS 20B
    with fallback to Google Gemini Flash.
    """
    message_dicts = [{"role": m.role, "content": m.content} for m in body.messages]
    result = await generate_chat_response(message_dicts)

    return ChatResponse(
        answer=result["answer"],
        source=result["source"],
        sample_id=result.get("sample_id"),
    )

