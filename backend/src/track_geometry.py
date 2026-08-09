# # Pure-data ports of the track geometry and race-event extraction logic
# # originally in src/ui_components.py — with the `arcade` dependency stripped
# # out, since the web backend has no need to render anything itself.

# # Behavior is intentionally kept identical to the desktop app so the web
# # replay matches it (same track boundary math, same DRS zone detection,
# # same flag/DNF event types).



import os
import pickle
import fastf1
import numpy as np

# Event Constants
EVENT_DNF = "dnf"
EVENT_YELLOW_FLAG = "yellow_flag"
EVENT_RED_FLAG = "red_flag"
EVENT_SAFETY_CAR = "safety_car"
EVENT_VSC = "vsc"

TRACK_STATUS_TO_EVENT = {
    "2": EVENT_YELLOW_FLAG,
    "4": EVENT_SAFETY_CAR,
    "5": EVENT_RED_FLAG,
    "6": EVENT_VSC,
    "7": EVENT_VSC,
}

import fastf1
import numpy as np

def get_track_map_with_telemetry(year: int, gp: str, session_type: str, driver_code: str):
    """
    Returns track coordinates colored by speed for a given driver's fastest lap.
    driver_code: 3-letter code, e.g. 'ANT', 'RUS'
    """
    session = fastf1.get_session(year, gp, session_type)
    session.load(telemetry=True, laps=True, weather=False)

    lap = session.laps.pick_driver(driver_code).pick_fastest()
    tel = lap.get_telemetry()

    x = tel['X'].to_numpy()
    y = tel['Y'].to_numpy()
    speed = tel['Speed'].to_numpy()

    # Normalize coordinates to a 0-1000 box for easy frontend scaling
    x_norm = ((x - x.min()) / (x.max() - x.min()) * 1000).tolist()
    y_norm = ((y - y.min()) / (y.max() - y.min()) * 1000).tolist()

    points = [
        {"x": round(x_norm[i], 1), "y": round(y_norm[i], 1), "speed": round(float(speed[i]), 1)}
        for i in range(len(x_norm))
    ]

    def format_laptime(td):
        total_seconds = td.total_seconds()
        minutes = int(total_seconds // 60)
        seconds = total_seconds % 60
        return f"{minutes}:{seconds:06.3f}"


    return {
        "driver": driver_code,
        "gp": gp,
        "lap_time": format_laptime(lap['LapTime']),
        "max_speed": round(float(speed.max()), 1),
        "min_speed": round(float(speed.min()), 1),
        "points": points
    }

# Helper Functions

def point_at_distance(example_lap, distance):

    if "Distance" not in example_lap.columns:
        return {
            "x": float(example_lap["X"].iloc[0]),
            "y": float(example_lap["Y"].iloc[0]),
        }

    distances = example_lap["Distance"].to_numpy()

    idx = np.abs(distances - distance).argmin()

    return {
        "x": float(example_lap["X"].iloc[idx]),
        "y": float(example_lap["Y"].iloc[idx]),
    }


# Sector Markers + Colored Segments

SECTOR_COLORS = {
    1: "#e2001a",  # red — Sector 1
    2: "#00aeef",  # cyan/blue — Sector 2
    3: "#ffd400",  # yellow — Sector 3
}


def tangent_point_at_distance(example_lap, distance, delta=40.0):
    """
    Returns a point slightly further along the track from `distance` —
    used by the frontend to compute the track's local direction (for
    rotating sector labels to run diagonally along the track, like
    broadcast graphics do, instead of sitting flat/horizontal).
    """
    return point_at_distance(example_lap, distance + delta)



def build_sector_markers(example_lap):
    """
    Creates Sector 1 / Sector 2 / Sector 3 label markers, placed at the
    MIDPOINT of each sector, each with a tangent_point so the frontend
    can rotate the label to follow the track's direction at that point.
    """

    if "Distance" in example_lap.columns:

        total_distance = float(example_lap["Distance"].max())

        sector_midpoints = [
            total_distance / 6,
            total_distance / 2,
            total_distance * 5 / 6,
        ]

        sectors = []

        for i, d in enumerate(sector_midpoints, start=1):
            sectors.append({
                "id": i,
                "label": f"Sector {i}",
                "color": SECTOR_COLORS[i],
                "position": point_at_distance(example_lap, d),
                "tangent_point": tangent_point_at_distance(example_lap, d),
            })

        return sectors

    # Fallback: no Distance column
    total = len(example_lap)
    indexes = [total // 6, total // 2, (total * 5) // 6]
    sectors = []
    for i, idx in enumerate(indexes, start=1):
        next_idx = min(idx + 5, total - 1)
        sectors.append({
            "id": i,
            "label": f"Sector {i}",
            "color": SECTOR_COLORS[i],
            "position": {
                "x": float(example_lap["X"].iloc[idx]),
                "y": float(example_lap["Y"].iloc[idx]),
            },
            "tangent_point": {
                "x": float(example_lap["X"].iloc[next_idx]),
                "y": float(example_lap["Y"].iloc[next_idx]),
            },
        })
    return sectors

def build_sector_segments(example_lap, track_width: float = 200.0):
    """
    Splits the track into 3 colored line segments (one per sector), like
    a broadcast-style circuit map.

    Returns a list of {id, label, color, centerline, inner, outer}.
    """
    x = example_lap["X"].to_numpy()
    y = example_lap["Y"].to_numpy()
    n = len(x)

    if "Distance" in example_lap.columns:
        distances = example_lap["Distance"].to_numpy()
        total_distance = float(distances.max())
        cut1 = total_distance / 3
        cut2 = total_distance * 2 / 3
        idx1 = int(np.abs(distances - cut1).argmin())
        idx2 = int(np.abs(distances - cut2).argmin())
    else:
        idx1 = n // 3
        idx2 = n * 2 // 3

    dx = np.gradient(x)
    dy = np.gradient(y)
    norm = np.sqrt(dx ** 2 + dy ** 2)
    norm[norm == 0] = 1.0
    dx /= norm
    dy /= norm
    nx, ny = -dy, dx
    x_outer = x + nx * (track_width / 2)
    y_outer = y + ny * (track_width / 2)
    x_inner = x - nx * (track_width / 2)
    y_inner = y - ny * (track_width / 2)

    bounds = [(0, idx1), (idx1, idx2), (idx2, n)]
    segments = []
    for i, (start, end) in enumerate(bounds, start=1):
        segments.append({
            "id": i,
            "label": f"Sector {i}",
            "color": SECTOR_COLORS[i],
            "centerline": list(zip(
                x[start:end].round(1).tolist(), y[start:end].round(1).tolist()
            )),
            "inner": list(zip(
                x_inner[start:end].round(1).tolist(), y_inner[start:end].round(1).tolist()
            )),
            "outer": list(zip(
                x_outer[start:end].round(1).tolist(), y_outer[start:end].round(1).tolist()
            )),
        })
    return segments


def build_start_finish(example_lap):
    """
    Returns the Start / Finish location.
    """

    return {
        "x": float(example_lap["X"].iloc[0]),
        "y": float(example_lap["Y"].iloc[0]),
    }


def plot_drs_zones(example_lap, offset: float = 140.0):
    """
    Detect contiguous DRS active zones. Returns both the raw track-line
    points (start/end) and an offset version (start_offset/end_offset)
    pushed outward perpendicular to the track — used by the frontend so
    DRS dashed lines are drawn beside the track instead of directly on
    top of it, where they'd overlap the sector-colored track segments.
    """

    x_val = example_lap["X"].to_numpy()
    y_val = example_lap["Y"].to_numpy()
    drs_col = example_lap["DRS"]

    dx = np.gradient(x_val)
    dy = np.gradient(y_val)
    norm = np.sqrt(dx ** 2 + dy ** 2)
    norm[norm == 0] = 1.0
    dx /= norm
    dy /= norm
    nx = -dy
    ny = dx

    def _offset_point(i):
        return {
            "x": float(x_val[i] + nx[i] * offset),
            "y": float(y_val[i] + ny[i] * offset),
        }

    drs_zones = []
    drs_start = None

    for i, value in enumerate(drs_col):

        if value in (10, 12, 14):
            if drs_start is None:
                drs_start = i
        else:
            if drs_start is not None:
                drs_end = i - 1
                drs_zones.append({
                    "zone": len(drs_zones) + 1,
                    "start": {"x": float(x_val[drs_start]), "y": float(y_val[drs_start])},
                    "end": {"x": float(x_val[drs_end]), "y": float(y_val[drs_end])},
                    "start_offset": _offset_point(drs_start),
                    "end_offset": _offset_point(drs_end),
                    "label": f"DRS {len(drs_zones) + 1}",
                })
                drs_start = None

    if drs_start is not None:
        drs_end = len(drs_col) - 1
        drs_zones.append({
            "zone": len(drs_zones) + 1,
            "start": {"x": float(x_val[drs_start]), "y": float(y_val[drs_start])},
            "end": {"x": float(x_val[drs_end]), "y": float(y_val[drs_end])},
            "start_offset": _offset_point(drs_start),
            "end_offset": _offset_point(drs_end),
            "label": f"DRS {len(drs_zones) + 1}",
        })

    return drs_zones

# Track Geometry

def build_track_geometry(example_lap, track_width: float = 200.0) -> dict:
    """
    Build track geometry for the frontend.

    Returns:
        - centerline
        - inner boundary
        - outer boundary
        - DRS zones
        - sector markers
        - sector-colored segments
        - start/finish
        - bounds
    """

    # Build helper data
    drs_zones = plot_drs_zones(example_lap)

    sectors = build_sector_markers(example_lap)

    sector_segments = build_sector_segments(example_lap, track_width)

    start_finish = build_start_finish(example_lap)

    print("Track Keys:", {
        "sectors": len(sectors),
        "drs": len(drs_zones)
    })

    # Track Centerline
    plot_x_ref = example_lap["X"].to_numpy()
    plot_y_ref = example_lap["Y"].to_numpy()

    # Calculate normal vectors
    dx = np.gradient(plot_x_ref)
    dy = np.gradient(plot_y_ref)

    norm = np.sqrt(dx ** 2 + dy ** 2)
    norm[norm == 0] = 1.0

    dx /= norm
    dy /= norm

    nx = -dy
    ny = dx

    # Inner / Outer Track
    x_outer = plot_x_ref + nx * (track_width / 2)
    y_outer = plot_y_ref + ny * (track_width / 2)

    x_inner = plot_x_ref - nx * (track_width / 2)
    y_inner = plot_y_ref - ny * (track_width / 2)

    # Bounds
    bounds = {
        "x_min": float(min(
            plot_x_ref.min(),
            x_inner.min(),
            x_outer.min()
        )),

        "x_max": float(max(
            plot_x_ref.max(),
            x_inner.max(),
            x_outer.max()
        )),

        "y_min": float(min(
            plot_y_ref.min(),
            y_inner.min(),
            y_outer.min()
        )),

        "y_max": float(max(
            plot_y_ref.max(),
            y_inner.max(),
            y_outer.max()
        )),
    }

    # Return JSON
    return {

        # Track
        "centerline": list(zip(
            plot_x_ref.round(1).tolist(),
            plot_y_ref.round(1).tolist()
        )),

        "inner": list(zip(
            x_inner.round(1).tolist(),
            y_inner.round(1).tolist()
        )),

        "outer": list(zip(
            x_outer.round(1).tolist(),
            y_outer.round(1).tolist()
        )),

        # Start / Finish
        "start_finish": start_finish,

        # Sector Labels
        "sectors": sectors,

        # Sector-colored track segments (broadcast-style)
        "sector_segments": sector_segments,

        # DRS Zones
        "drs_zones": drs_zones,

        # Track Limits
        "bounds": bounds,
    }


# Race Events
def extract_race_events(
    frames: list,
    track_statuses: list,
    sample_every: int = 25,
) -> list:
    """
    Extract race events from telemetry.

    Events include:
        - DNF
        - Yellow Flag
        - Safety Car
        - Virtual Safety Car
        - Red Flag

    Events are stored using race time (seconds), so they remain
    correct even if the replay FPS changes.
    """

    events = []

    if not frames:
        return events

    # Driver DNFs
    previous_drivers = set()

    for i in range(0, len(frames), sample_every):

        frame = frames[i]

        current_drivers = set(
            frame.get("drivers", {}).keys()
        )

        if previous_drivers:

            retired = previous_drivers - current_drivers

            for driver_code in retired:

                previous_frame = frames[max(0, i - sample_every)]

                driver_info = previous_frame.get(
                    "drivers",
                    {}
                ).get(driver_code, {})

                events.append({

                    "type": EVENT_DNF,

                    "t": frame["t"],

                    "label": driver_code,

                    "lap": driver_info.get(
                        "lap",
                        "?"
                    ),
                })

        previous_drivers = current_drivers

    # Track Status Events
    race_end_time = frames[-1]["t"]

    for status in track_statuses:

        event_type = TRACK_STATUS_TO_EVENT.get(
            str(status.get("status", ""))
        )

        if event_type is None:
            continue

        start_time = status.get("start_time", 0)

        end_time = status.get("end_time")

        if end_time is None:
            end_time = start_time + 10

        if end_time <= 0:
            continue

        end_time = min(end_time, race_end_time)

        events.append({

            "type": event_type,

            "t": start_time,

            "end_t": end_time,

            "label": "",

        })

    # Sort by race time
    events.sort(
        key=lambda event: event["t"]
    )

    return events


# --- Lightweight circuit outline (for Sessions-grid preview cards) --------
# Unlike build_track_geometry() (which needs a full session already
# loaded, e.g. for the replay), this loads just ONE fastest lap's
# telemetry on its own, normalizes it to a small SVG-ready point list,
# and caches the result to disk — so the Sessions grid doesn't have to
# pay the full replay-loading cost just to draw a preview shape.

import pathlib

_CACHE_DIR = pathlib.Path(__file__).resolve().parent.parent / "computed_data"


def _outline_cache_path(year: int, round_number: int) -> str:
    # Absolute path anchored to backend/computed_data/ regardless of the
    # working directory a script or server was launched from — avoids
    # cache files silently splitting across two different locations.
    return str(_CACHE_DIR / f"track_outline_{year}_{round_number}.pkl")


import datetime as _dt


def _event_is_in_future(year: int, round_number: int) -> bool:
    """True if this event's date is after today — used to skip pointless
    current-season fetch attempts for rounds that haven't been raced."""
    try:
        event = fastf1.get_event(year, round_number)
        event_date = event.get("EventDate")
        if event_date is None:
            return False
        # EventDate may be a pandas Timestamp or datetime — normalize to date.
        event_date = getattr(event_date, "date", lambda: event_date)()
        return event_date > _dt.date.today()
    except Exception:
        return False


def _resolve_fallback_round(year: int, round_number: int):
    """
    Find the same circuit run in a previous season — used when `year`'s
    edition hasn't happened yet (a future round has no telemetry at
    all). Track layouts don't change year to year, so a prior season's
    shape is still a valid preview. Matches by country/location, since
    round numbers don't line up exactly across seasons.
    """
    try:
        event = fastf1.get_event(year, round_number)
        target_country = str(event.get("Country", ""))
        target_location = str(event.get("Location", ""))
    except Exception:
        return None

    for back_year in range(year - 1, year - 4, -1):
        try:
            schedule = fastf1.get_event_schedule(back_year)
        except Exception:
            continue
        # Exclude pre-season testing (RoundNumber == 0) — testing
        # events have no qualifying/race telemetry, so matching one
        # as a "fallback" just produces another failure.
        match = schedule[
            (
                (schedule["Country"] == target_country) |
                (schedule["Location"] == target_location)
            )
            & (schedule["RoundNumber"] > 0)
        ]
        if not match.empty:
            return back_year, int(match.iloc[0]["RoundNumber"])
    return None


def _load_fastest_lap(year: int, round_number: int):
    """Tries Quali then Race for (year, round_number), with one retry
    each on transient failures (e.g. a network hiccup fetching live
    timing data). Returns None if neither has usable telemetry (e.g.
    the event hasn't happened yet). Logs the real exception so failures
    are diagnosable instead of silently swallowed."""
    for session_type in ("Q", "R"):
        for attempt in (1, 2):
            try:
                session = fastf1.get_session(year, round_number, session_type)
                session.load(laps=True, telemetry=True, weather=False)
                lap = session.laps.pick_fastest()
                if lap is not None:
                    return lap
                print(f"[track-outline] {year} R{round_number} {session_type}: no fastest lap in results")
            except Exception as e:
                print(f"[track-outline] {year} R{round_number} {session_type} attempt {attempt} failed: {e}")
    return None


def get_track_outline(year: int, round_number: int, session_type: str = "Q") -> dict:
    """
    Real circuit outline (centerline points + start/finish point),
    normalized into a compact 190x130 box matching the existing card
    SVG viewBox. Cached to disk after first computation.

    If the requested (year, round_number) has no telemetry yet — e.g. a
    future round on the calendar that hasn't been raced — falls back to
    the same circuit's most recent previous season, since the physical
    track layout is unchanged.
    """
    cache_path = _outline_cache_path(year, round_number)
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            return pickle.load(f)

    used_year, used_round = year, round_number
    lap = None

    # Skip straight to the previous-season fallback for rounds that
    # clearly haven't happened yet — avoids wasting 4+ real network
    # attempts (Q + R, 2 retries each) on a session that provably
    # has no data, which is what made warm-up crawl on future rounds.
    if not _event_is_in_future(year, round_number):
        lap = _load_fastest_lap(year, round_number)

    if lap is None:
        fallback = _resolve_fallback_round(year, round_number)
        if fallback:
            used_year, used_round = fallback
            lap = _load_fastest_lap(used_year, used_round)

    if lap is None:
        raise ValueError(
            f"No lap data available for {year} round {round_number} "
            f"(and no usable previous-season fallback found)"
        )

    tel = lap.get_telemetry()
    x = tel["X"].to_numpy()
    y = tel["Y"].to_numpy()
    distances = tel["Distance"].to_numpy() if "Distance" in tel.columns else None
    drs_raw = tel["DRS"].to_numpy() if "DRS" in tel.columns else None

    # Downsample to a fixed point budget BEFORE normalizing — same
    # telemetry already loaded above, just fewer points to draw/ship,
    # so this adds no extra fetch cost, only a lighter payload.
    TARGET_POINTS = 160
    n_raw = len(x)
    if n_raw > TARGET_POINTS:
        idxs = np.linspace(0, n_raw - 1, TARGET_POINTS).astype(int)
        x, y = x[idxs], y[idxs]
        if distances is not None:
            distances = distances[idxs]
        if drs_raw is not None:
            drs_raw = drs_raw[idxs]

    x_min, x_max = float(x.min()), float(x.max())
    y_min, y_max = float(y.min()), float(y.max())
    width = (x_max - x_min) or 1.0
    height = (y_max - y_min) or 1.0

    target_w, target_h = 190.0, 130.0
    pad = 12.0
    scale = min((target_w - pad * 2) / width, (target_h - pad * 2) / height)

    x_norm = (x - x_min) * scale + pad
    # Flip Y — SVG grows downward, track telemetry Y axis typically doesn't.
    y_norm = target_h - ((y - y_min) * scale + pad)

    points = [
        [round(float(px), 1), round(float(py), 1)]
        for px, py in zip(x_norm.tolist(), y_norm.tolist())
    ]
    n = len(points)

    # Sector-colored segments (color only, no labels) — split by
    # distance into thirds, +1 index overlap at each cut so segments
    # visually connect with no gap between them.
    if distances is not None and len(distances) == n:
        total_distance = float(distances.max())
        idx1 = int(np.abs(distances - total_distance / 3).argmin())
        idx2 = int(np.abs(distances - total_distance * 2 / 3).argmin())
    else:
        idx1 = n // 3
        idx2 = n * 2 // 3

    sector_segments = [
        {"id": 1, "color": "#e2001a", "points": points[0:idx1 + 1]},
        {"id": 2, "color": "#00aeef", "points": points[idx1:idx2 + 1]},
        {"id": 3, "color": "#ffd400", "points": points[idx2:]},
    ]

    # DRS zone start points only (kept light — no full-zone overlay).
    drs_zones = []
    if drs_raw is not None:
        active = np.isin(drs_raw, [10, 12, 14])
        zone_start = None
        for i, is_active in enumerate(active):
            if is_active and zone_start is None:
                zone_start = i
            elif not is_active and zone_start is not None:
                drs_zones.append({"start": points[zone_start], "end": points[i - 1]})
                zone_start = None
        if zone_start is not None:
            drs_zones.append({"start": points[zone_start], "end": points[n - 1]})

    result = {
        "year": year,
        "round": round_number,
        "source_year": used_year,
        "source_round": used_round,
        "points": points,
        "start_finish": {"x": points[0][0], "y": points[0][1]},
        "viewbox": {"w": target_w, "h": target_h},
        "sector_segments": sector_segments,
        "drs_zones": drs_zones,
    }

    os.makedirs(_CACHE_DIR, exist_ok=True)
    with open(cache_path, "wb") as f:
        pickle.dump(result, f, protocol=pickle.HIGHEST_PROTOCOL)

    return result


def get_cached_track_outline(year: int, round_number: int):
    """
    Returns the cached outline if it already exists on disk — NEVER
    triggers a live FastF1 fetch. Used by the /api/schedule endpoint so
    it stays fast even for rounds that haven't been pre-warmed yet;
    those simply come back without outline data and the frontend falls
    back to a lazy per-card fetch only for those specific rounds.
    """
    cache_path = _outline_cache_path(year, round_number)
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "rb") as f:
                return pickle.load(f)
        except Exception:
            return None
    return None
