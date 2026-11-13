import logging
import re
from typing import Dict, List, Optional
from fastapi import HTTPException
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import AsyncOpenAI, APIConnectionError, RateLimitError, APITimeoutError

from app.config import settings
from app.persona.prompt import build_system_prompt

logger = logging.getLogger(__name__)


def clean_for_speech(text: str) -> str:
    """Strip out markdown, asterisks, bullet points, and headers so TTS speaks cleanly."""
    # Remove markdown headers (# Title)
    text = re.sub(r"#+\s*", "", text)
    # Remove bold/italic markers (* or _)
    text = re.sub(r"[\*_]{1,3}", "", text)
    # Remove bullet points (- or * at start of lines)
    text = re.sub(r"^\s*[\-\*\•]\s*", "", text, flags=re.MULTILINE)
    # Remove numbered lists (1. 2.)
    text = re.sub(r"^\s*\d+\.\s*", "", text, flags=re.MULTILINE)
    # Remove backticks / code blocks
    text = re.sub(r"`{1,3}.*?`{1,3}", "", text, flags=re.DOTALL)
    # Normalize excess spaces and newlines into single spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=3),
    retry=retry_if_exception_type((APIConnectionError, RateLimitError, APITimeoutError)),
    reraise=True,
)
async def _call_groq_llm(system_prompt: str, messages: List[Dict[str, str]]) -> str:
    """Call primary LLM provider: Groq with OpenAI-compatible responses API (openai/gpt-oss-20b)."""
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured")

    client = AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url=settings.GROQ_BASE_URL,
        timeout=15.0,
    )

    # 1. Primary: Use client.responses.create (fast language model responses API)
    try:
        response = await client.responses.create(
            model=settings.GROQ_MODEL,
            instructions=system_prompt,
            input=messages,
        )
        if hasattr(response, "output_text") and response.output_text:
            return response.output_text.strip()
    except Exception as e:
        logger.warning(f"Groq responses.create failed ({e}), attempting chat.completions fallback on Groq...")

    # 2. Secondary fallback on Groq: chat.completions.create
    chat_payload = [{"role": "system", "content": system_prompt}] + messages
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=chat_payload,
        temperature=settings.TEMPERATURE,
        max_tokens=settings.MAX_TOKENS,
    )
    return response.choices[0].message.content or ""


async def _call_gemini_fallback(system_prompt: str, messages: List[Dict[str, str]]) -> str:
    """Fallback LLM provider: Google Gemini REST API using httpx."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured for fallback")

    contents = []
    for msg in messages:
        if msg["role"] == "system":
            continue
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        f"?key={settings.GEMINI_API_KEY}"
    )

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": settings.TEMPERATURE,
            "maxOutputTokens": settings.MAX_TOKENS,
        },
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates returned from Gemini API")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise ValueError("Empty response parts from Gemini API")

        return parts[0].get("text", "")


async def generate_chat_response(
    incoming_messages: List[Dict[str, str]]
) -> Dict[str, any]:
    """
    Generate an answer following the candidate persona.
    Directly queries Groq responses.create with openai/gpt-oss-20b (no cache interception).
    On failure, falls back to Google Gemini Flash.
    """
    # 1. Sanitize & filter incoming messages
    filtered_history = []
    for m in incoming_messages:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        # Strictly reject client-injected 'system' role
        if role in ["user", "assistant"] and content:
            filtered_history.append({"role": role, "content": content[:500]})

    if not filtered_history:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Empty or invalid message list",
                "userMessage": "Please send a valid message.",
                "code": "EMPTY_MESSAGES",
            },
        )

    # Trim to last MAX_MESSAGE_HISTORY turns
    trimmed_history = filtered_history[-settings.MAX_MESSAGE_HISTORY :]

    # 2. Assemble system prompt
    system_prompt = build_system_prompt()

    # 3. Query Groq first (using client.responses.create with openai/gpt-oss-20b)
    try:
        raw_answer = await _call_groq_llm(system_prompt, trimmed_history)
        clean_answer = clean_for_speech(raw_answer)
        if clean_answer:
            return {"answer": clean_answer, "source": "groq_gpt_oss_20b"}
    except Exception as groq_err:
        logger.warning(f"Groq LLM call failed ({groq_err}), attempting Gemini fallback...")

    # 5. Attempt Gemini fallback
    try:
        raw_answer = await _call_gemini_fallback(system_prompt, trimmed_history)
        clean_answer = clean_for_speech(raw_answer)
        if clean_answer:
            logger.info("Successfully received answer from Gemini fallback")
            return {"answer": clean_answer, "source": "gemini_fallback"}
    except Exception as gemini_err:
        logger.error(f"Gemini fallback also failed: {gemini_err}")

    # 6. If both failed, return a graceful error
    raise HTTPException(
        status_code=503,
        detail={
            "error": "LLM providers unavailable",
            "userMessage": "I am having trouble connecting to my AI brain right now. Please try again in a few moments or click one of the sample questions below!",
            "code": "LLM_SERVICE_UNAVAILABLE",
        },
    )
