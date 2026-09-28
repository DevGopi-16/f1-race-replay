"""
Tracks which password-reset token IDs (jti) have already been used,
so a reset link can't be replayed within its validity window.

In-memory, like the rate limiter — resets on restart, single-instance
only. Fine for now; entries are small and short-lived (tokens expire
in 30 min anyway, so this never grows unbounded).
"""

import time
from threading import Lock

_used: dict[str, float] = {}
_lock = Lock()

_CLEANUP_AFTER_SECONDS = 60 * 60  # drop entries older than an hour


def _cleanup() -> None:
    cutoff = time.time() - _CLEANUP_AFTER_SECONDS
    for jti in [k for k, t in _used.items() if t < cutoff]:
        _used.pop(jti, None)


def is_used(jti: str) -> bool:
    with _lock:
        _cleanup()
        return jti in _used


def mark_used(jti: str) -> None:
    with _lock:
        _used[jti] = time.time()