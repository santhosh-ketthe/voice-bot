import datetime
import threading
from fastapi import Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings

# SlowAPI Limiter for per-IP rate limiting
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_PER_MINUTE])


class GlobalDailyCounter:
    """Thread-safe global daily request counter to protect against runaway API costs."""

    def __init__(self, limit: int):
        self.limit = limit
        self.lock = threading.Lock()
        self.current_date = datetime.date.today()
        self.count = 0

    def check_and_increment(self) -> None:
        today = datetime.date.today()
        with self.lock:
            if today != self.current_date:
                self.current_date = today
                self.count = 0

            if self.count >= self.limit:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Daily limit reached",
                        "userMessage": "This voice demo has reached its daily quota to protect cloud resources. Please try again tomorrow!",
                        "code": "DAILY_LIMIT_EXCEEDED"
                    }
                )
            self.count += 1

    def get_stats(self) -> dict:
        with self.lock:
            return {
                "date": str(self.current_date),
                "count": self.count,
                "limit": self.limit,
                "remaining": max(0, self.limit - self.count)
            }


daily_counter = GlobalDailyCounter(limit=settings.GLOBAL_DAILY_LIMIT)
