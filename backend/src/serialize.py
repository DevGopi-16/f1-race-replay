FRAME_FIELDS_FOR_CLIENT = (
    "x",
    "y",
    "lap",
    "position",
    "dist",
    "rel_dist",
    "speed",
    "gear",
    "drs",
    "throttle",
    "brake",
    "tyre",
    "tyre_life",
    "in_pit",
    "ahead",
    "behind",
    "gap_to_leader",
    "interval",
)


def downsample_frames(
    frames: list,
    source_fps: int = 25,
    target_fps: int = 8,
) -> list:
    if not frames:
        return []

    if target_fps >= source_fps:
        return frames

    step = max(1, round(source_fps / target_fps))

    return frames[::step]


def serialize_frame(frame: dict) -> dict:
    drivers_out = {}

    for code, driver in frame.get("drivers", {}).items():
        if not isinstance(driver, dict):
            continue

        driver_out = {}

        for key in FRAME_FIELDS_FOR_CLIENT:
            value = driver.get(key)

            if value is not None:
                driver_out[key] = value

        drivers_out[code] = driver_out

    return {
        "t": frame.get("t"),
        "lap": frame.get("lap"),
        "drivers": drivers_out,
    }


def serialize_frames(
    frames: list,
    source_fps: int = 25,
    target_fps: int = 8,
) -> list:
    sampled = downsample_frames(
        frames,
        source_fps=source_fps,
        target_fps=target_fps,
    )

    return [
        serialize_frame(frame)
        for frame in sampled
    ]


def serialize_replay_frame(frame: dict) -> dict:
    drivers_out = {}

    for code, d in frame.get("drivers", {}).items():
        if not isinstance(d, dict):
            continue

        drivers_out[code] = {
            key: d[key]
            for key in FRAME_FIELDS_FOR_CLIENT
            if key in d
        }

    return {
        "t": frame.get("t"),
        "lap": frame.get("lap"),
        "drivers": drivers_out,
    }


def serialize_replay_frames(
    frames: list,
    source_fps: int = 25,
    target_fps: int = 8,
) -> list:
    sampled = downsample_frames(
        frames,
        source_fps=source_fps,
        target_fps=target_fps,
    )

    return [
        serialize_replay_frame(frame)
        for frame in sampled
    ]


def rgb_tuple_to_hex(rgb) -> str:
    r, g, b = rgb[0], rgb[1], rgb[2]

    return "#{:02x}{:02x}{:02x}".format(
        int(r),
        int(g),
        int(b),
    )


def serialize_driver_colors(driver_colors: dict) -> dict:
    """
    Serialize driver color metadata for the replay frontend.
    Supports both simple string colors and structured metadata.
    """
    if not isinstance(driver_colors, dict):
        return {}

    output = {}

    for code, value in driver_colors.items():
        code = str(code).upper()

        if isinstance(value, str):
            output[code] = value

        elif isinstance(value, dict):
            output[code] = {
                key: value[key]
                for key in ("color", "name", "abbreviation")
                if key in value
            }

        elif isinstance(value, (tuple, list)) and len(value) >= 3:
            try:
                output[code] = (
                    "#{:02x}{:02x}{:02x}".format(
                        int(value[0]),
                        int(value[1]),
                        int(value[2]),
                    )
                )
            except (TypeError, ValueError):
                continue

    return output
