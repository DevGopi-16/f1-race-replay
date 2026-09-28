"""
Race Control message feed: penalties, deleted lap times, investigations,
flags — pulled directly from FastF1's official race control data for a
completed session.
"""

import fastf1
import pandas as pd


def build_race_control_feed(season: int, round_: int, session_type: str = "R") -> list[dict]:
    session = fastf1.get_session(season, round_, session_type)
    session.load(laps=False, telemetry=False, weather=False, messages=True)

    msgs = session.race_control_messages
    if msgs is None or len(msgs) == 0:
        return []

    rows = []
    for _, m in msgs.iterrows():
        time_val = m.get("Time")
        time_str = None
        try:
            if time_val is not None and not pd.isna(time_val):
                time_str = time_val.strftime("%H:%M:%S")
        except (TypeError, ValueError, AttributeError):
            time_str = str(time_val) if time_val is not None else None

        lap_val = m.get("Lap")
        lap = None
        try:
            if lap_val is not None and not pd.isna(lap_val):
                lap = int(lap_val)
        except (TypeError, ValueError):
            pass

        rows.append(
            {
                "time": time_str,
                "lap": lap,
                "category": m.get("Category"),
                "message": m.get("Message"),
                "flag": m.get("Flag"),
            }
        )

    rows.reverse()
    return rows
