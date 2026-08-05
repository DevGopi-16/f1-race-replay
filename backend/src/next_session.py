"""Finds the next upcoming F1 session (any type — practice, qualifying,
race) across the remaining calendar, with a precise UTC timestamp.

Distinct from session_watcher.py's find_live_session, which looks for a
session happening RIGHT NOW; this looks forward for the next one that
hasn't started yet. Powers the "Next: X - Practice 1 / 16 DAYS 3H 5M"
countdown badge.
"""

import datetime
from typing import Optional

import fastf1

SESSION_NAME_TO_TYPE = {
    "Practice 1": "FP1",
    "Practice 2": "FP2",
    "Practice 3": "FP3",
    "Qualifying": "Q",
    "Sprint Qualifying": "SQ",
    "Sprint": "S",
    "Race": "R",
}


def get_next_session(year: int) -> Optional[dict]:
    events = fastf1.get_event_schedule(year, include_testing=False)
    now = datetime.datetime.now(datetime.timezone.utc)

    best = None
    for _, event in events.iterrows():
        for i in range(1, 6):
            name = event.get(f"Session{i}")
            date_utc = event.get(f"Session{i}DateUtc")
            if not name or date_utc is None or (hasattr(date_utc, "isnull") and date_utc.isnull()):
                continue

            start = date_utc.to_pydatetime()
            if start.tzinfo is None:
                start = start.replace(tzinfo=datetime.timezone.utc)

            if start <= now:
                continue

            if best is None or start < best["start"]:
                best = {
                    "event_name": str(event.get("EventName", "")),
                    "country": str(event.get("Country", "")),
                    "round": int(event.get("RoundNumber")),
                    "session_name": str(name),
                    "session_type": SESSION_NAME_TO_TYPE.get(str(name)),
                    "start": start,
                }

    if best is None:
        return None

    return {
        "event_name": best["event_name"],
        "country": best["country"],
        "round": best["round"],
        "session_name": best["session_name"],
        "session_type": best["session_type"],
        "start_utc": best["start"].isoformat(),
    }
