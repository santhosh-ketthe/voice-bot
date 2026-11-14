from fastapi import APIRouter

router = APIRouter(prefix="/api/samples", tags=["samples"])

STARTER_QUESTIONS = [
    {
        "id": "life_story",
        "question": "What should we know about your life story in a few sentences?",
        "short_label": "Life Story",
    },
    {
        "id": "superpower",
        "question": "What is your number one superpower?",
        "short_label": "Superpower",
    },
    {
        "id": "growth_areas",
        "question": "What are the top three areas you would like to grow in?",
        "short_label": "Growth Areas",
    },
    {
        "id": "misconception",
        "question": "What misconception do your coworkers have about you?",
        "short_label": "Misconception",
    },
    {
        "id": "pushing_limits",
        "question": "How do you push your boundaries and limits?",
        "short_label": "Pushing Limits",
    },
]


@router.get("")
async def get_samples():
    """Return the list of 5 starter questions for the frontend chips."""
    return {"samples": STARTER_QUESTIONS}
