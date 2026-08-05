"""
Builds a "timing tower" snapshot from a completed FastF1 session:
position, gap to leader, interval, last lap, sector times (flagged for
session-best/personal-best), tyre compound + laps used, pit stop count,
and pit status. Reads FINAL data from a finished session (official,
cached FastF1 data) — not a real-time feed.
"""

import math

import pandas as pd


def _fmt_gap(td):
    if td is None:
        return None
    try:
        if pd.isna(td):
            return None
    except (TypeError, ValueError):
        pass
    total = td.total_seconds()
    if total <= 0 or math.isnan(total):
        return None
    return f"+{total:.3f}"


def _fmt_laptime(td):
    if td is None:
        return None
    try:
        if pd.isna(td):
            return None
    except (TypeError, ValueError):
        pass
    total = td.total_seconds()
    minutes = int(total // 60)
    seconds = total - minutes * 60
    if minutes:
        return f"{minutes}:{seconds:06.3f}"
    return f"{seconds:.3f}"


def _sector_info(value, personal_best, session_best):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return {
        "time": round(value.total_seconds(), 3),
        "is_session_best": session_best is not None and value == session_best,
        "is_personal_best": personal_best is not None and value == personal_best,
    }


def _count_pit_stops(driver_laps):
    if driver_laps is None or len(driver_laps) == 0 or "PitInTime" not in driver_laps:
        return 0
    return int(driver_laps["PitInTime"].notna().sum())


def _stint_history(driver_laps):
    """Ordered list of compounds used across all stints, e.g.
    ["MEDIUM", "HARD", "HARD"] — powers the pit-stop history icons,
    distinct from the current-compound tyre chip which only shows the
    most recent stint."""
    if driver_laps is None or len(driver_laps) == 0 or "Stint" not in driver_laps or "Compound" not in driver_laps:
        return []
    try:
        sorted_laps = driver_laps.sort_values("LapNumber") if "LapNumber" in driver_laps else driver_laps
        history = sorted_laps.groupby("Stint")["Compound"].first().tolist()
        return [c for c in history if c is not None and not pd.isna(c)]
    except (TypeError, ValueError, KeyError):
        return []


def _position_change(grid_position, current_position):
    """Positive = gained positions since the start (started P5, now P2 -> +3,
    shown as an up arrow). Negative = lost positions (down arrow). None if
    either position is unknown (e.g. non-race sessions with no grid)."""
    if grid_position is None or current_position is None:
        return None
    try:
        if pd.isna(grid_position) or pd.isna(current_position):
            return None
        return int(grid_position) - int(current_position)
    except (TypeError, ValueError):
        return None


def build_timing_tower(session):
    if session.results is None or len(session.results) == 0:
        raise ValueError("No results available for this session yet")

    results = session.results.sort_values("Position")
    laps = session.laps

    session_best_s1 = laps["Sector1Time"].min() if "Sector1Time" in laps else None
    session_best_s2 = laps["Sector2Time"].min() if "Sector2Time" in laps else None
    session_best_s3 = laps["Sector3Time"].min() if "Sector3Time" in laps else None

    rows = []
    prev_total_time = None

    for _, res in results.iterrows():
        code = res.get("Abbreviation")
        driver_laps = laps[laps["Driver"] == code] if "Driver" in laps else laps.iloc[0:0]
        last_lap = driver_laps.iloc[-1] if len(driver_laps) else None

        personal_best_s1 = driver_laps["Sector1Time"].min() if len(driver_laps) and "Sector1Time" in driver_laps else None
        personal_best_s2 = driver_laps["Sector2Time"].min() if len(driver_laps) and "Sector2Time" in driver_laps else None
        personal_best_s3 = driver_laps["Sector3Time"].min() if len(driver_laps) and "Sector3Time" in driver_laps else None

        total_time = res.get("Time")
        is_leader = len(rows) == 0

        gap_str = "Leader" if is_leader else _fmt_gap(total_time)

        interval_str = None
        if not is_leader and total_time is not None and prev_total_time is not None:
            try:
                if not pd.isna(total_time) and not pd.isna(prev_total_time):
                    interval_str = _fmt_gap(total_time - prev_total_time)
            except (TypeError, ValueError):
                pass

        if total_time is not None:
            try:
                if not pd.isna(total_time):
                    prev_total_time = total_time
            except (TypeError, ValueError):
                pass

        pit_status = None
        tyre_laps = None
        if last_lap is not None:
            pit_in = last_lap.get("PitInTime")
            try:
                if pit_in is not None and not pd.isna(pit_in):
                    pit_status = "IN PIT"
            except (TypeError, ValueError):
                pass
            tl = last_lap.get("TyreLife")
            try:
                if tl is not None and not pd.isna(tl):
                    tyre_laps = int(tl)
            except (TypeError, ValueError):
                pass

        team_color = res.get("TeamColor")
        current_position = int(res["Position"]) if not pd.isna(res.get("Position")) else None
        grid_position = res.get("GridPosition")
        grid_position = int(grid_position) if grid_position is not None and not pd.isna(grid_position) else None

        rows.append(
            {
                "position": current_position,
                "grid_position": grid_position,
                "position_change": _position_change(grid_position, current_position),
                "driver_code": code,
                "driver_name": res.get("FullName") or res.get("BroadcastName"),
                "team": res.get("TeamName"),
                "team_color": f"#{team_color}" if team_color and not str(team_color).startswith("#") else team_color,
                "gap": gap_str,
                "interval": interval_str,
                "last_lap": _fmt_laptime(last_lap["LapTime"]) if last_lap is not None and "LapTime" in last_lap else None,
                "sectors": {
                    "s1": _sector_info(
                        last_lap["Sector1Time"] if last_lap is not None and "Sector1Time" in last_lap else None,
                        personal_best_s1,
                        session_best_s1,
                    ),
                    "s2": _sector_info(
                        last_lap["Sector2Time"] if last_lap is not None and "Sector2Time" in last_lap else None,
                        personal_best_s2,
                        session_best_s2,
                    ),
                    "s3": _sector_info(
                        last_lap["Sector3Time"] if last_lap is not None and "Sector3Time" in last_lap else None,
                        personal_best_s3,
                        session_best_s3,
                    ),
                },
                "compound": last_lap.get("Compound") if last_lap is not None else None,
                "tyre_laps": tyre_laps,
                "pit_count": _count_pit_stops(driver_laps),
                "stint_history": _stint_history(driver_laps),
                "pit_status": pit_status,
                "status": res.get("Status"),
            }
        )

    return rows
