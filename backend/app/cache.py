import difflib
import logging
import re
from typing import Dict, List, Optional, Tuple, Set

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "what", "is", "are", "you", "your", "tell", "me", "about", "can",
    "please", "give", "a", "an", "the", "do", "how", "i", "my", "to", "in"
}

SAMPLE_QUESTIONS_DATA = [
    {
        "id": "intro",
        "question": "Tell me about yourself and your background.",
        "short_label": "About Me",
        "aliases": [
            "tell me about yourself",
            "who are you",
            "give me your introduction",
            "introduce yourself",
            "what is your background",
            "tell me about your career",
            "walk me through your resume",
            "tell me your background",
        ],
        "answer": (
            "I am an AI and Full-Stack engineer with a B.Tech in Computer Science and three years of experience at "
            "Covalense Global. Over the last two years, I have specialized in Generative AI, building high-throughput "
            "agentic systems and low-latency voice bots. I am deeply passionate about cutting inference latency and "
            "delivering reliable, production-ready AI products."
        ),
    },
    {
        "id": "superpower",
        "question": "What is your biggest superpower as an engineer?",
        "short_label": "My Superpower",
        "aliases": [
            "what is your superpower",
            "what is your biggest strength",
            "what are you best at",
            "what makes you unique",
            "why should we hire you",
            "what is your superpower as an engineer",
        ],
        "answer": (
            "My biggest superpower is taking complex Generative AI ideas from concept to hardened production with exceptional "
            "speed and latency optimization. For example, I architected an end-to-end voice pipeline that achieved sub-600ms "
            "latency by pipelining speech-to-text token streaming, speculative LLM decoding, and early chunked TTS audio playback."
        ),
    },
    {
        "id": "growth_areas",
        "question": "What are three genuine growth areas you are working on?",
        "short_label": "Growth Areas",
        "aliases": [
            "what are your weaknesses",
            "three growth areas",
            "areas of improvement",
            "what are you learning right now",
            "where do you need to improve",
            "what are your growth areas",
        ],
        "answer": (
            "First, I am diving deeper into custom CUDA and Triton kernels for GPU inference acceleration. "
            "Second, I am mastering Direct Preference Optimization to align open-source models beyond standard prompt engineering. "
            "And third, I am implementing formal state machines to prevent deadlocks and hallucinations in autonomous multi-agent workflows."
        ),
    },
    {
        "id": "pushing_limits",
        "question": "Tell me about a time you pushed your technical limits or failed.",
        "short_label": "Failure & Lesson",
        "aliases": [
            "tell me about a failure",
            "tell me about a time you failed",
            "biggest challenge",
            "time you pushed limits",
            "mistake you learned from",
            "biggest failure",
        ],
        "answer": (
            "Early in my GenAI journey, an un-capped endpoint got hit by bot traffic, exhausting our API quota. "
            "That failure taught me that defense-in-depth is non-negotiable. I now build strict rate limiting, token caps, "
            "multi-tier fallback LLM providers, and pre-warmed response caches into every architecture I design."
        ),
    },
    {
        "id": "why_genai",
        "question": "Why are you passionate about Generative AI?",
        "short_label": "Why GenAI?",
        "aliases": [
            "why generative ai",
            "why genai",
            "why do you love ai",
            "what excites you about ai",
            "passion for ai",
            "why are you passionate about ai",
        ],
        "answer": (
            "Traditional software is static and deterministic, but Generative AI gives software reasoning and adaptive intelligence. "
            "Building voice-native AI agents that converse naturally with zero perceptible lag feels like building the future "
            "of human-computer interaction, and that is what drives me every single day."
        ),
    },
]


def normalize_text(text: str) -> str:
    """Normalize text for consistent matching."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def get_keywords(text: str) -> Set[str]:
    """Extract non-trivial semantic tokens."""
    tokens = normalize_text(text).split()
    return {w for w in tokens if w not in STOP_WORDS and len(w) > 2}


class SampleCache:
    """In-memory cache for sample question answers and pre-synthesized TTS audio."""

    def __init__(self):
        self.samples: List[dict] = SAMPLE_QUESTIONS_DATA
        self.audio_cache: Dict[str, bytes] = {}
        # Precompute normalized questions and aliases for fast matching
        self._candidates: List[Tuple[str, str, Set[str], dict]] = []
        for sample in self.samples:
            norm_q = normalize_text(sample["question"])
            kw_q = get_keywords(sample["question"])
            self._candidates.append((sample["id"], norm_q, kw_q, sample))
            for alias in sample.get("aliases", []):
                norm_a = normalize_text(alias)
                kw_a = get_keywords(alias)
                self._candidates.append((sample["id"], norm_a, kw_a, sample))

    def get_all_samples(self) -> List[dict]:
        """Return the list of sample questions for starter chips."""
        return [
            {
                "id": s["id"],
                "question": s["question"],
                "short_label": s.get("short_label", s["question"]),
                "answer": s["answer"],
                "has_cached_audio": s["id"] in self.audio_cache,
            }
            for s in self.samples
        ]

    def match_question(self, user_query: str, threshold: float = 0.65) -> Optional[dict]:
        """
        Check if a user question closely matches one of our pre-warmed samples.
        Combines exact string check, token overlap, and Levenshtein similarity.
        """
        norm_query = normalize_text(user_query)
        if not norm_query:
            return None

        query_tokens = get_keywords(user_query)
        best_match = None
        best_score = 0.0

        for sample_id, norm_candidate, candidate_kws, sample in self._candidates:
            # 1. Exact match
            if norm_query == norm_candidate:
                return sample

            # 2. Phrase containment (only if candidate phrase is sufficiently specific >= 3 words)
            cand_words = norm_candidate.split()
            if len(cand_words) >= 3 and norm_candidate in norm_query:
                return sample

            # 3. Keyword overlap score
            overlap_score = 0.0
            if query_tokens and candidate_kws:
                intersection = query_tokens.intersection(candidate_kws)
                if intersection:
                    overlap_score = (len(intersection) / len(candidate_kws)) * 0.9

            # 4. SequenceMatcher string ratio
            seq_ratio = difflib.SequenceMatcher(None, norm_query, norm_candidate).ratio()

            total_score = max(seq_ratio, overlap_score)
            if total_score > best_score:
                best_score = total_score
                best_match = sample

        if best_score >= threshold and best_match:
            logger.info(f"Fuzzy match hit ({best_score:.2f}) for query: '{user_query}' -> '{best_match['question']}'")
            return best_match

        return None

    def store_audio(self, sample_id: str, audio_bytes: bytes) -> None:
        self.audio_cache[sample_id] = audio_bytes

    def get_audio(self, sample_id: str) -> Optional[bytes]:
        return self.audio_cache.get(sample_id)


sample_cache = SampleCache()
