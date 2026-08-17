FRAME_FIELDS_FOR_CLIENT = (
    "x",
    "y",
)


def downsample_frames(
    frames: list,
    source_fps: int = 25,
    target_fps: int = 8,
) -> list:
    """
    Downsample telemetry frames for the replay animation.

    The replay frontend only needs car positions, so keeping the
    payload small is much more important than sending full telemetry
    for every frame.
    """
    if not frames:
        return []

    if target_fps >= source_fps:
        return frames

    step = max(1, round(source_fps / target_fps))

    return frames[::step]


def serialize_frame(frame: dict) -> dict:
    """
    Serialize only the data required by the replay track animation.
    """

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
    """
    Compact payload used by the visual replay.

    Replay only needs:
    - timestamp
    - lap
    - driver position on track
    - race position
    - tyre information

    Detailed telemetry is intentionally excluded.
    Detailed telemetry can be requested separately.
    """
    drivers_out = {}

    for code, d in frame.get("drivers", {}).items():
        drivers_out[code] = {
            key: d[key]
            for key in (
                "x",
                "y",
                "lap",
                "position",
                "tyre",
                "tyre_life",
            )
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

    return f"#{r:02x}{g:02x}{b:02x}"


def serialize_driver_colors(driver_colors: dict) -> dict:
    return {
        code: rgb_tuple_to_hex(rgb)
        for code, rgb in driver_colors.items()
    }
