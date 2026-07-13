# # Pure-data ports of the track geometry and race-event extraction logic
# # originally in src/ui_components.py — with the `arcade` dependency stripped
# # out, since the web backend has no need to render anything itself.

# # Behavior is intentionally kept identical to the desktop app so the web
# # replay matches it (same track boundary math, same DRS zone detection,
# # same flag/DNF event types).




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