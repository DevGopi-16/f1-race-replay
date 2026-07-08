"""STUB — I don't have your original src/lib/time.py. f1_data.py only
calls parse_time_string(str(some_timedelta)), so that's the one function
that needs to work correctly; format_time is included since ui_components.py
uses it too. Replace with your real version if it does more (e.g. different
formatting rules).
"""

import re


def parse_time_string(time_str: str) -> float:
    """Parse a pandas Timedelta's string form (e.g. '0 days 00:01:18.532000'
    or '00:01:18.532000') into seconds as a float.
    """
    if time_str is None or time_str in ("NaT", "None"):
        raise ValueError(f"Cannot parse time string: {time_str!r}")

    match = re.search(r"(?:(\d+) days? )?(\d+):(\d+):(\d+(?:\.\d+)?)", time_str)
    if not match:
        raise ValueError(f"Could not parse time string: {time_str!r}")

    days, hours, minutes, seconds = match.groups()
    total = float(seconds) + int(minutes) * 60 + int(hours) * 3600
    if days:
        total += int(days) * 86400
    return total


def format_time(seconds) -> str:
    """Format seconds as m:ss.mmm, e.g. 78.532 -> '1:18.532'."""
    if seconds is None:
        return "-"
    try:
        seconds = float(seconds)
    except (TypeError, ValueError):
        return "-"
    minutes = int(seconds // 60)
    remainder = seconds - minutes * 60
    return f"{minutes}:{remainder:06.3f}"
