"""In-memory store for live timing state.

This is the single source of truth that capture.py writes to and
main.py's /api/timing-tower endpoint reads from. Kept deliberately
dumb — no FastF1, no networking, just a thread-safe box of the latest
known rows plus some metadata about what session (if any) is live.

Why a class instead of module-level globals: capture.py and
session_watcher.py run on background threads while FastAPI serves
requests on the main event loop thread — concurrent reads/writes to
plain module globals are technically fine in CPython for simple
assignments (GIL), but wrapping in a lock removes any doubt and costs
nothing.
"""

import threading
from typing import Optional


class LiveTimingState:
    def __init__(self):
        self._lock = threading.Lock()
        self._is_live = False
        self._year: Optional[int] = None
        self._round: Optional[int] = None
        self._session_type: Optional[str] = None
        self._rows: list[dict] = []
        self._meta: dict = {}

    def start_session(self, year: int, round_: int, session_type: str, meta: dict):
        """Called by capture.py when it successfully connects to a session."""
        with self._lock:
            self._is_live = True
            self._year = year
            self._round = round_
            self._session_type = session_type
            self._meta = meta
            self._rows = []

    def update_rows(self, rows: list[dict]):
        """Called by capture.py on every parsed timing update."""
        with self._lock:
            self._rows = rows

    def stop_session(self):
        """Called by capture.py when the session ends or the connection drops."""
        with self._lock:
            self._is_live = False

    def matches(self, year: int, round_: int, session_type: str) -> bool:
        """True if the requested session is the one currently being captured live."""
        with self._lock:
            return (
                self._is_live
                and self._year == year
                and self._round == round_
                and self._session_type == session_type
            )

    def snapshot(self) -> dict:
        """Returns a safe copy of current state for /api/timing-tower and /api/live/status."""
        with self._lock:
            return {
                "is_live": self._is_live,
                "year": self._year,
                "round": self._round,
                "session_type": self._session_type,
                "meta": dict(self._meta),
                "rows": list(self._rows),
            }


# Single shared instance — imported by capture.py, session_watcher.py, and main.py
live_state = LiveTimingState()
