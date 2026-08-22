"""Watches the F1 schedule and automatically starts/stops LiveCapture
around actual session times — so nobody has to manually flip live
mode on/off.

Runs as a blocking loop, intended for the same
loop.run_in_executor(None, ...) background-thread pattern main.py
already uses for warm_driver_stats_cache. Checks the schedule every
POLL_INTERVAL_SECONDS; that's deliberately infrequent since session
start times don't change minute-to-minute — no need to hammer FastF1's
schedule source.

Session "live window" is start_time -> start_time + estimated_duration
+ END_BUFFER_MINUTES. FastF1's schedule doesn't give an end time, so
durations are conservative estimates per session type — better to run
capture a bit too long (harmless, it'll just idle) than cut off a
session that ran late.
"""

import time
import datetime
import pandas as pd
from typing import Optional

import fastf1

from src.live.capture import run_capture
from src.live.state import live_state

POLL_INTERVAL_SECONDS = 60
END_BUFFER_MINUTES = 20

SESSION_NAME_TO_TYPE = {
    "Practice 1": "FP1",
    "Practice 2": "FP2",
    "Practice 3": "FP3",
    "Qualifying": "Q",
    "Sprint Qualifying": "SQ",
    "Sprint": "S",
    "Race": "R",
}

ESTIMATED_DURATION_MINUTES = {
    "FP1": 60,
    "FP2": 60,
    "FP3": 60,
    "Q": 60,
    "SQ": 45,
    "S": 45,
    "R": 150,
}


def find_live_session(events_df, now: datetime.datetime) -> Optional[dict]:
    """Return the currently live F1 session, if any.

    All schedule timestamps are normalized to timezone-aware UTC
    before comparison. This avoids pandas datetime64 / Python datetime
    and timezone-aware / timezone-naive comparison errors.
    """

    # Normalize `now` to timezone-aware UTC Python datetime.
    if isinstance(now, pd.Timestamp):
        if now.tzinfo is None:
            now = now.tz_localize("UTC")
        else:
            now = now.tz_convert("UTC")
        now = now.to_pydatetime()
    elif isinstance(now, datetime.datetime):
        if now.tzinfo is None:
            now = now.replace(tzinfo=datetime.timezone.utc)
        else:
            now = now.astimezone(datetime.timezone.utc)
    else:
        now = pd.Timestamp(now, tz="UTC").to_pydatetime()

    for _, event in events_df.iterrows():
        for i in range(1, 6):
            name = event.get(f"Session{i}")
            date_utc = event.get(f"Session{i}DateUtc")

            if (
                not name
                or date_utc is None
                or (hasattr(date_utc, "isnull") and date_utc.isnull())
            ):
                continue

            session_type = SESSION_NAME_TO_TYPE.get(str(name))
            if not session_type:
                continue

            # --------------------------------------------------------
            # Normalize schedule timestamp to timezone-aware UTC.
            # --------------------------------------------------------
            try:
                start_ts = pd.Timestamp(date_utc)

                if start_ts.tzinfo is None:
                    start_ts = start_ts.tz_localize("UTC")
                else:
                    start_ts = start_ts.tz_convert("UTC")

                start = start_ts.to_pydatetime()

            except Exception as e:
                print(
                    f"[live-watcher] invalid session datetime "
                    f"{date_utc!r}: {e}"
                )
                continue

            duration = ESTIMATED_DURATION_MINUTES.get(
                session_type,
                90,
            )

            end = start + datetime.timedelta(
                minutes=duration + END_BUFFER_MINUTES
            )

            if start <= now <= end:
                return {
                    "year": int(event["EventDate"].year),
                    "round": int(event["RoundNumber"]),
                    "session_type": session_type,
                    "meta": {
                        "event_name": str(
                            event.get("EventName", "")
                        ),
                        "session_name": str(name),
                    },
                }

    return None


def run_forever():
    """Blocking loop — call via run_in_executor from main.py's startup hook."""
    while True:
        try:
            _tick()
        except Exception as e:
            print(f"[live-watcher] error checking schedule: {e}")
        time.sleep(POLL_INTERVAL_SECONDS)


def _tick():
    now = pd.Timestamp.now(tz="UTC")

    current_snapshot = live_state.snapshot()

    # Use the full event schedule directly instead of
    # fastf1.get_events_remaining(), which can trigger a
    # pandas datetime64[ns] vs Python datetime comparison error.
    try:
        schedule = fastf1.get_event_schedule(now.year)
        live_session = find_live_session(schedule, now)

    except Exception as e:
        print(f"[live-watcher] schedule lookup failed: {e}")
        return

    if live_session is None:
        return

    already_capturing_this = current_snapshot["is_live"] and (
        current_snapshot["year"] == live_session["year"]
        and current_snapshot["round"] == live_session["round"]
        and current_snapshot["session_type"] == live_session["session_type"]
    )

    if already_capturing_this:
        return

    print(
        f"[live-watcher] Live session detected: "
        f"{live_session['meta']['event_name']} "
        f"{live_session['meta']['session_name']} — starting capture."
    )

    import threading

    threading.Thread(
        target=run_capture,
        args=(
            live_session["year"],
            live_session["round"],
            live_session["session_type"],
            live_session["meta"],
        ),
        daemon=True,
    ).start()

