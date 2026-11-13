from fastapi import APIRouter

router = APIRouter(prefix="/api/samples", tags=["samples"])

STARTER_QUESTIONS = [
    {
        "id": "intro",
        "question": "Tell me about yourself and your background.",
        "short_label": "About Me",
    },
    {
        "id": "superpower",
        "question": "What is your biggest superpower as an engineer?",
        "short_label": "My Superpower",
    },
    {
        "id": "growth_areas",
        "question": "What are three genuine growth areas you are working on?",
        "short_label": "Growth Areas",
    },
    {
        "id": "pushing_limits",
        "question": "Tell me about a time you pushed your technical limits or failed.",
        "short_label": "Failure & Lesson",
    },
    {
        "id": "why_genai",
        "question": "Why are you passionate about Generative AI?",
        "short_label": "Why GenAI?",
    },
]


@router.get("")
async def get_samples():
    """Return the list of 5 starter questions for the frontend chips."""
    return {"samples": STARTER_QUESTIONS}
