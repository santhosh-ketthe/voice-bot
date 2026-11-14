import pytest
from app.services.stt import is_whisper_hallucination


def test_is_whisper_hallucination():
    # True positives: silence hallucinations
    assert is_whisper_hallucination("you") is True
    assert is_whisper_hallucination("you.") is True
    assert is_whisper_hallucination("you?") is True
    assert is_whisper_hallucination("  you  ") is True
    assert is_whisper_hallucination("Thank you.") is True
    assert is_whisper_hallucination("thank you for watching") is True
    assert is_whisper_hallucination("bye") is True
    assert is_whisper_hallucination("...") is True
    assert is_whisper_hallucination("") is True

    # True negatives: actual legitimate user questions
    assert is_whisper_hallucination("Tell me about yourself") is False
    assert is_whisper_hallucination("What are your growth areas?") is False
    assert is_whisper_hallucination("Why should we hire you?") is False
    assert is_whisper_hallucination("How did you push your limits?") is False
    assert is_whisper_hallucination("What is your experience with GenAI?") is False
