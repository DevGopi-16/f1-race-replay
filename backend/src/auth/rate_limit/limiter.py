"""
Simple in-memory rate limiter, keyed by (client IP, bucket name).

In-memory means this resets on server restart and only works correctly
for a single server instance. Fine for now; swap for a database or Redis
backend later if you run multiple instances behind a load balancer.
"""

import time
from collections import defaultdict
from threading import Lock

_attempts: dict[str, list[float]] = defaultdict(list)
_lock = Lock()

# ---- enforced lockouts ----

_locked_until: dict[str, float] = {}


def get_lock_remaining(key: str) -> int:
    with _lock:
        until = _locked_until.get(key, 0.0)
        return max(0, int(until - time.time()))


def set_lock(key: str, seconds: int) -> None:
    with _lock:
        _locked_until[key] = time.time() + seconds


def clear_lock(key: str) -> None:
    with _lock:
        _locked_until.pop(key, None)
        
def is_rate_limited(
    key: str,
    max_attempts: int,
    window_seconds: int,
) -> bool:
    """Returns True if `key` has hit max_attempts within window_seconds."""
    now = time.time()

    with _lock:
        attempts = _attempts[key]
        # Drop attempts outside the window.
        attempts[:] = [t for t in attempts if now - t < window_seconds]

        if len(attempts) >= max_attempts:
            return True

        return False


def record_attempt(key: str) -> None:
    with _lock:
        _attempts[key].append(time.time())


def clear_attempts(key: str) -> None:
    """Call on a successful login to reset the counter for that key."""
    with _lock:
        _attempts.pop(key, None)


def seconds_until_retry(key: str, window_seconds: int) -> int:
    with _lock:
        attempts = _attempts.get(key, [])
        if not attempts:
            return 0
        oldest = min(attempts)
        remaining = window_seconds - (time.time() - oldest)
        return max(0, int(remaining))


# ---- exponential backoff on repeated lockouts ----

_violations: dict[str, int] = defaultdict(int)
_violation_times: dict[str, float] = {}

MAX_BACKOFF_SECONDS = 24 * 60 * 60  # cap at 24 hours
VIOLATION_RESET_AFTER_SECONDS = 24 * 60 * 60  # strikes forgotten after a clean day


def record_violation(key: str, current_backoff_seconds: int) -> int:
    """Called when a blocked identifier tries again. Only counts as a NEW
    strike if the previous backoff period has actually elapsed — repeated
    requests during the same lockout don't compound the penalty.
    """
    with _lock:
        now = time.time()
        last = _violation_times.get(key)

        if last and now - last > VIOLATION_RESET_AFTER_SECONDS:
            _violations[key] = 0

        elif last and now - last < current_backoff_seconds:
            # Still within the same lockout window — don't add a new strike.
            return _violations.get(key, 1)

        _violations[key] += 1
        _violation_times[key] = now
        return _violations[key]


def get_backoff_seconds(key: str, base_window_seconds: int) -> int:
    """Lockout duration grows as base * 2^strikes, capped."""
    with _lock:
        strikes = _violations.get(key, 0)
    backoff = base_window_seconds * (2 ** strikes)
    return min(backoff, MAX_BACKOFF_SECONDS)


def clear_violations(key: str) -> None:
    with _lock:
        _violations.pop(key, None)
        _violation_times.pop(key, None)