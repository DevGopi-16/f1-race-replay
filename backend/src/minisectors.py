"""
Minisector breakdown: splits each driver's fastest lap into per-SECTOR
distance segments (7 per sector, 21 total) and flags which driver was
fastest through each one (purple, matching broadcast convention).

Also computes, per driver per sector: their own sector time, the
session-best time for that sector (which may belong to a different
driver), and the delta between them — this is what powers the
"MINISECTORS & TIMES" column's three numbers per row
(own time / session-best time / delta), matching the reference layout.

Needs full car telemetry, unlike timing_tower.py — meaningfully heavier
on first fetch, cached by FastF1 after that.
"""

import fastf1
import numpy as np
import pandas as pd

SEGMENTS_PER_SECTOR = 7


def build_minisectors(season: int, round_: int, session_type: str = "R", top_n: int = 10) -> dict:
    session = fastf1.get_session(season, round_, session_type)
    session.load(laps=True, telemetry=True, weather=False, messages=False)

    if session.results is None or len(session.results) == 0:
        raise ValueError("No results available for this session yet")

    top_codes = (
        session.results.sort_values("Position")["Abbreviation"].dropna().head(top_n).tolist()
    )

    computed = {}  # driver_code -> {sector_segments, sector_times, team_color, lap_time}

    for code in top_codes:
        driver_laps = session.laps[session.laps["Driver"] == code]
        if driver_laps.empty:
            continue
        fastest = driver_laps.pick_fastest()
        if fastest is None:
            continue

        sector_times_s = _extract_sector_times(fastest)
        if sector_times_s is None:
            continue  # missing sector split data, skip this driver

        try:
            tel = fastest.get_telemetry()
        except Exception:
            continue
        if tel is None or tel.empty or "Distance" not in tel or "Speed" not in tel or "Time" not in tel:
            continue

        segments = _build_sector_segments(tel, sector_times_s)
        if segments is None:
            continue

        result_row = session.results[session.results["Abbreviation"] == code]
        team_color = None
        if not result_row.empty:
            tc = result_row.iloc[0].get("TeamColor")
            if tc:
                team_color = f"#{tc}" if not str(tc).startswith("#") else tc

        computed[code] = {
            "sector_segments": segments,
            "sector_times": sector_times_s,
            "team_color": team_color,
            "lap_time": _fmt_laptime(fastest["LapTime"]) if "LapTime" in fastest else None,
        }

    if not computed:
        return {"drivers": [], "best_sector_times": {}}

    # Session-best time per sector across everyone we computed (may be a
    # different driver per sector — this is the "col2" benchmark value).
    best_sector_times = {}
    for key in ("s1", "s2", "s3"):
        values = [c["sector_times"][key] for c in computed.values() if c["sector_times"][key] is not None]
        best_sector_times[key] = min(values) if values else None

    # Fastest driver per minisector segment, per sector (purple highlight).
    best_per_segment = {}
    for key in ("s1", "s2", "s3"):
        best_per_segment[key] = []
        for seg_idx in range(SEGMENTS_PER_SECTOR):
            best_code, best_speed = None, None
            for code, data in computed.items():
                v = data["sector_segments"][key][seg_idx]
                if v is None:
                    continue
                if best_speed is None or v > best_speed:
                    best_speed, best_code = v, code
            best_per_segment[key].append(best_code)

    drivers_out = []
    for code, data in computed.items():
        sector_segments_out = {}
        sector_deltas_out = {}
        for key in ("s1", "s2", "s3"):
            speeds = data["sector_segments"][key]
            sector_segments_out[key] = [
                {
                    "speed": round(v, 1) if v is not None else None,
                    "is_best": best_per_segment[key][i] == code and v is not None,
                }
                for i, v in enumerate(speeds)
            ]
            own_time = data["sector_times"][key]
            best_time = best_sector_times[key]
            sector_deltas_out[key] = (
                round(best_time - own_time, 3) if own_time is not None and best_time is not None else None
            )

        drivers_out.append({
            "driver_code": code,
            "team_color": data["team_color"],
            "lap_time": data["lap_time"],
            "sector_times": {k: round(v, 3) if v is not None else None for k, v in data["sector_times"].items()},
            "sector_deltas": sector_deltas_out,
            "sector_segments": sector_segments_out,
        })

    return {
        "drivers": drivers_out,
        "best_sector_times": {k: round(v, 3) if v is not None else None for k, v in best_sector_times.items()},
    }


def _extract_sector_times(lap) -> dict | None:
    """Returns {"s1": seconds, "s2": seconds, "s3": seconds} or None if
    any sector split is missing (can't build per-sector segments without
    all three boundaries)."""
    try:
        s1 = lap["Sector1Time"]
        s2 = lap["Sector2Time"]
        s3 = lap["Sector3Time"]
        if pd.isna(s1) or pd.isna(s2) or pd.isna(s3):
            return None
        return {"s1": s1.total_seconds(), "s2": s2.total_seconds(), "s3": s3.total_seconds()}
    except (KeyError, TypeError, AttributeError):
        return None


def _build_sector_segments(tel, sector_times_s: dict) -> dict | None:
    """Splits telemetry distance into 3 sector ranges (via time->distance
    interpolation at sector boundaries), then bins each range into
    SEGMENTS_PER_SECTOR equal-distance segments with average speed."""
    rel_time_s = (tel["Time"] - tel["Time"].iloc[0]).dt.total_seconds()
    total_distance = tel["Distance"].max()
    if not total_distance or pd.isna(total_distance) or total_distance <= 0:
        return None

    boundary1_t = sector_times_s["s1"]
    boundary2_t = sector_times_s["s1"] + sector_times_s["s2"]

    dist_b1 = float(np.interp(boundary1_t, rel_time_s, tel["Distance"]))
    dist_b2 = float(np.interp(boundary2_t, rel_time_s, tel["Distance"]))

    ranges = {
        "s1": (0.0, dist_b1),
        "s2": (dist_b1, dist_b2),
        "s3": (dist_b2, float(total_distance)),
    }

    result = {}
    for key, (start, end) in ranges.items():
        if end <= start:
            return None  # malformed boundary, bail rather than emit garbage
        edges = [start + (end - start) * i / SEGMENTS_PER_SECTOR for i in range(SEGMENTS_PER_SECTOR + 1)]
        speeds = []
        for i in range(SEGMENTS_PER_SECTOR):
            mask = (tel["Distance"] >= edges[i]) & (tel["Distance"] < edges[i + 1])
            chunk = tel.loc[mask, "Speed"]
            speeds.append(float(chunk.mean()) if len(chunk) else None)
        result[key] = speeds

    return result


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
