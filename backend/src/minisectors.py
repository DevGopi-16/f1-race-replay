"""
Minisector breakdown: splits each driver's fastest lap into N equal-length
distance segments and flags which driver was fastest through each one
(purple, matching broadcast convention). Needs full car telemetry, unlike
timing_tower.py — meaningfully heavier on first fetch, cached by FastF1
after that.
"""

import fastf1
import pandas as pd

SEGMENT_COUNT = 20


def build_minisectors(season: int, round_: int, session_type: str = "R", top_n: int = 10) -> dict:
    session = fastf1.get_session(season, round_, session_type)
    session.load(laps=True, telemetry=True, weather=False, messages=False)

    if session.results is None or len(session.results) == 0:
        raise ValueError("No results available for this session yet")

    # Only compute for the top N classified drivers — full-field telemetry
    # binning for 20 cars is expensive and the tail of the field adds
    # little visual value here.
    top_codes = (
        session.results.sort_values("Position")["Abbreviation"].dropna().head(top_n).tolist()
    )

    driver_segments = {}
    driver_meta = {}

    for code in top_codes:
        driver_laps = session.laps[session.laps["Driver"] == code]
        if driver_laps.empty:
            continue
        fastest = driver_laps.pick_fastest()
        if fastest is None:
            continue

        try:
            tel = fastest.get_telemetry()
        except Exception:
            continue

        if tel is None or tel.empty or "Distance" not in tel or "Speed" not in tel:
            continue

        total_distance = tel["Distance"].max()
        if not total_distance or pd.isna(total_distance) or total_distance <= 0:
            continue

        bin_edges = [total_distance * i / SEGMENT_COUNT for i in range(SEGMENT_COUNT + 1)]
        segment_speeds = []
        for i in range(SEGMENT_COUNT):
            mask = (tel["Distance"] >= bin_edges[i]) & (tel["Distance"] < bin_edges[i + 1])
            chunk = tel.loc[mask, "Speed"]
            segment_speeds.append(float(chunk.mean()) if len(chunk) else None)

        driver_segments[code] = segment_speeds

        result_row = session.results[session.results["Abbreviation"] == code]
        team_color = None
        if not result_row.empty:
            tc = result_row.iloc[0].get("TeamColor")
            if tc:
                team_color = f"#{tc}" if not str(tc).startswith("#") else tc

        driver_meta[code] = {
            "team_color": team_color,
            "lap_time": _fmt_laptime(fastest["LapTime"]) if "LapTime" in fastest else None,
        }

    if not driver_segments:
        return {"drivers": []}

    # For each segment index, find the fastest driver across everyone we computed.
    best_per_segment = []
    for seg_idx in range(SEGMENT_COUNT):
        best_code = None
        best_speed = None
        for code, speeds in driver_segments.items():
            v = speeds[seg_idx]
            if v is None:
                continue
            if best_speed is None or v > best_speed:
                best_speed = v
                best_code = code
        best_per_segment.append(best_code)

    drivers_out = []
    for code, speeds in driver_segments.items():
        segments = []
        for seg_idx, v in enumerate(speeds):
            segments.append(
                {
                    "speed": round(v, 1) if v is not None else None,
                    "is_best": best_per_segment[seg_idx] == code and v is not None,
                }
            )
        drivers_out.append(
            {
                "driver_code": code,
                "team_color": driver_meta[code]["team_color"],
                "lap_time": driver_meta[code]["lap_time"],
                "segments": segments,
            }
        )

    return {"drivers": drivers_out}


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
