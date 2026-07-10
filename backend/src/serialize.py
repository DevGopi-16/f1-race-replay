# """Prepares your existing get_race_telemetry() output for transfer over
# HTTP: downsamples the 25fps frame list to a web-friendly rate, and strips
# fields the frontend doesn't need (dist/rel_dist — position is already
# precomputed server-side, so the client never needs to re-derive it).
# """

# FRAME_FIELDS_FOR_CLIENT = (
#     "x", "y", "lap", "tyre", "tyre_life", "position", "rel_dist",
#     "speed", "gear", "drs", "throttle", "brake",
# )


# def downsample_frames(frames: list, source_fps: int = 25, target_fps: int = 8) -> list:
#     """Keep every Nth frame. target_fps must divide evenly into source_fps
#     for simplicity (e.g. 25 -> 5fps step=5, 25 -> 8.33fps isn't exact so we
#     round the step and accept the small drift — fine for a replay UI).
#     """
#     if target_fps >= source_fps:
#         step = 1
#     else:
#         step = max(1, round(source_fps / target_fps))
#     return frames[::step]


# def serialize_frame(frame: dict) -> dict:
#     """Strip a single frame down to just what the web client renders."""
#     drivers_out = {}
#     for code, d in frame.get("drivers", {}).items():
#         drivers_out[code] = {k: d[k] for k in FRAME_FIELDS_FOR_CLIENT if k in d}

#     out = {"t": frame["t"], "lap": frame.get("lap"), "drivers": drivers_out}
#     if "weather" in frame:
#         out["weather"] = frame["weather"]
#     return out


# def serialize_frames(frames: list, source_fps: int = 25, target_fps: int = 8) -> list:
#     sampled = downsample_frames(frames, source_fps=source_fps, target_fps=target_fps)
#     return [serialize_frame(f) for f in sampled]


# def rgb_tuple_to_hex(rgb) -> str:
#     r, g, b = rgb[0], rgb[1], rgb[2]
#     return f"#{r:02x}{g:02x}{b:02x}"


# def serialize_driver_colors(driver_colors: dict) -> dict:
#     return {code: rgb_tuple_to_hex(rgb) for code, rgb in driver_colors.items()}


"""Prepares your existing get_race_telemetry() output for transfer over
HTTP: downsamples the 25fps frame list to a web-friendly rate, and strips
fields the frontend doesn't need.

Note: `dist` (race distance in meters) IS sent, even though it's not used
for leaderboard ordering (position is already precomputed server-side) —
it's needed client-side for the Ahead/Behind gap estimate in the driver
info panel, same approximation your desktop DriverInfoComponent.get_gap_str
uses.
"""

# FRAME_FIELDS_FOR_CLIENT = (
#     "x", "y", "lap", "tyre", "tyre_life", "position", "rel_dist", "dist",
#     "speed", "gear", "drs", "throttle", "brake",
# )


# def downsample_frames(frames: list, source_fps: int = 25, target_fps: int = 8) -> list:
#     """Keep every Nth frame. target_fps must divide evenly into source_fps
#     for simplicity (e.g. 25 -> 5fps step=5, 25 -> 8.33fps isn't exact so we
#     round the step and accept the small drift — fine for a replay UI).
#     """
#     if target_fps >= source_fps:
#         step = 1
#     else:
#         step = max(1, round(source_fps / target_fps))
#     return frames[::step]


# def serialize_frame(frame: dict) -> dict:
#     """Strip a single frame down to just what the web client renders."""
#     drivers_out = {}
#     for code, d in frame.get("drivers", {}).items():
#         drivers_out[code] = {k: d[k] for k in FRAME_FIELDS_FOR_CLIENT if k in d}

#     out = {"t": frame["t"], "lap": frame.get("lap"), "drivers": drivers_out}
#     if "weather" in frame:
#         out["weather"] = frame["weather"]
#     return out


# def serialize_frames(frames: list, source_fps: int = 25, target_fps: int = 8) -> list:
#     sampled = downsample_frames(frames, source_fps=source_fps, target_fps=target_fps)
#     return [serialize_frame(f) for f in sampled]


# def rgb_tuple_to_hex(rgb) -> str:
#     r, g, b = rgb[0], rgb[1], rgb[2]
#     return f"#{r:02x}{g:02x}{b:02x}"


# def serialize_driver_colors(driver_colors: dict) -> dict:
#     return {code: rgb_tuple_to_hex(rgb) for code, rgb in driver_colors.items()}





FRAME_FIELDS_FOR_CLIENT = (
    "x", "y", "lap", "tyre", "tyre_life", "position", "rel_dist", "dist",
    "speed", "gear", "drs", "throttle", "brake", "in_pit", "ahead", "behind",
)


def downsample_frames(frames: list, source_fps: int = 25, target_fps: int = 8) -> list:
    """Keep every Nth frame. target_fps must divide evenly into source_fps
    for simplicity (e.g. 25 -> 5fps step=5, 25 -> 8.33fps isn't exact so we
    round the step and accept the small drift — fine for a replay UI).
    """
    if target_fps >= source_fps:
        step = 1
    else:
        step = max(1, round(source_fps / target_fps))
    return frames[::step]


def serialize_frame(frame: dict) -> dict:
    """Strip a single frame down to just what the web client renders."""
    drivers_out = {}
    for code, d in frame.get("drivers", {}).items():
        drivers_out[code] = {k: d[k] for k in FRAME_FIELDS_FOR_CLIENT if k in d}

    out = {"t": frame["t"], "lap": frame.get("lap"), "drivers": drivers_out}
    if "weather" in frame:
        out["weather"] = frame["weather"]
    return out


def serialize_frames(frames: list, source_fps: int = 25, target_fps: int = 8) -> list:
    sampled = downsample_frames(frames, source_fps=source_fps, target_fps=target_fps)
    return [serialize_frame(f) for f in sampled]


def rgb_tuple_to_hex(rgb) -> str:
    r, g, b = rgb[0], rgb[1], rgb[2]
    return f"#{r:02x}{g:02x}{b:02x}"


def serialize_driver_colors(driver_colors: dict) -> dict:
    return {code: rgb_tuple_to_hex(rgb) for code, rgb in driver_colors.items()}