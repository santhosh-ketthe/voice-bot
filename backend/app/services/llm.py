import logging
import re
from typing import Dict, List, Optional
from fastapi import HTTPException
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import groq

from app.config import settings
from app.persona.prompt import build_system_prompt
from app.cache import sample_cache

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
    retry=retry_if_exception_type((groq.APIConnectionError, groq.RateLimitError, groq.APITimeoutError)),
    reraise=True,
)
async def _call_groq_llm(messages: List[Dict[str, str]]) -> str:
    """Call primary LLM provider: Groq (Llama 3.3 70B)."""
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured")

    client = groq.AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=15.0)
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=settings.TEMPERATURE,
        max_tokens=settings.MAX_TOKENS,
    )
    return response.choices[0].message.content or ""


async def _call_gemini_fallback(system_prompt: str, messages: List[Dict[str, str]]) -> str:
    """Fallback LLM provider: Google Gemini REST API using httpx."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured for fallback")

    # Construct Gemini payload
    # Format chat history for Gemini: map 'user' -> 'user' and 'assistant' -> 'model'
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
    incoming_messages: List[Dict[str, str]], check_cache: bool = True
) -> Dict[str, any]:
    """
    Generate an answer following the candidate persona.
    1. Check fuzzy match against pre-warmed samples for near-instant response.
    2. Try Groq (Llama 3.3 70B).
    3. On failure, fall back to Google Gemini Flash.
    """
    # 1. Sanitize & filter incoming messages
    filtered_history = []
    for m in incoming_messages:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        # Strictly reject client-injected 'system' role
        if role in ["user", "assistant"] and content:
            # Enforce max 500 characters per message to prevent payload bloat
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

    # 2. Check for sample question match on the latest user message
    last_user_message = ""
    for msg in reversed(trimmed_history):
        if msg["role"] == "user":
            last_user_message = msg["content"]
            break

    if check_cache and last_user_message:
        matched_sample = sample_cache.match_question(last_user_message)
        if matched_sample:
            logger.info(f"Serving pre-warmed cached response for '{last_user_message}'")
            return {
                "answer": matched_sample["answer"],
                "source": "pre_warmed_cache",
                "sample_id": matched_sample["id"],
            }

    # 3. Assemble messages with system prompt
    system_prompt = build_system_prompt()
    groq_messages = [{"role": "system", "content": system_prompt}] + trimmed_history

    # 4. Attempt Groq first
    try:
        raw_answer = await _call_groq_llm(groq_messages)
        clean_answer = clean_for_speech(raw_answer)
        if clean_answer:
            return {"answer": clean_answer, "source": "groq_llama_3.3_70b"}
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
