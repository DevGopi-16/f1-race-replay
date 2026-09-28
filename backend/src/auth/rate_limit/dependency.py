"""
Rate limiting by email — protects a specific account from brute-force
regardless of which IP the attempts come from.
"""

from fastapi import HTTPException
from fastapi import Request
from src.auth.security_log.logger import log_event
from src.auth.rate_limit.limiter import (
    is_rate_limited,
    record_attempt,
    clear_attempts,
    seconds_until_retry,
    record_violation,
    get_backoff_seconds,
    clear_violations,
    get_lock_remaining,
    set_lock,
    clear_lock,
)

def get_client_ip(request: Request) -> str:
    """Real client IP, accounting for a reverse proxy (Railway, etc.).
    X-Forwarded-For can contain a chain of IPs (client, proxy1, proxy2...);
    the first one is the original client. Only trust this header when you
    control the proxy in front of you — otherwise it's spoofable.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def check_rate_limit(bucket: str, identifier: str, max_attempts: int, window_seconds: int) -> None:
    key = f"{bucket}:{identifier.lower()}"

    remaining = get_lock_remaining(key)
    if remaining > 0:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again later.",
            headers={"Retry-After": str(remaining)},
        )

    if is_rate_limited(key, max_attempts, window_seconds):
        current_backoff = get_backoff_seconds(key, window_seconds)
        strikes = record_violation(key, current_backoff)
        backoff = get_backoff_seconds(key, window_seconds)
        set_lock(key, backoff)
        log_event(
            "rate_limit_hit",
            bucket=bucket,
            identifier=identifier,
            strikes=strikes,
            backoff_seconds=backoff,
        )
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again later.",
            headers={"Retry-After": str(backoff)},
        )

def record_failed_attempt(bucket: str, identifier: str) -> None:
    record_attempt(f"{bucket}:{identifier.lower()}")

def clear_rate_limit(bucket: str, identifier: str) -> None:
    key = f"{bucket}:{identifier.lower()}"
    clear_attempts(key)
    clear_violations(key)
    clear_lock(key)