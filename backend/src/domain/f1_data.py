import os
import pathlib
import pickle
import sys
from datetime import timedelta
from multiprocessing import Pool, cpu_count

import fastf1
import fastf1.plotting
import numpy as np
import pandas as pd

from src.lib.settings import get_settings
from src.lib.time import parse_time_string
from src.lib.tyres import get_tyre_compound_int
from src.config.settings import DATA_DIR

_COMPUTED_DATA_DIR = pathlib.Path(DATA_DIR)



def enable_cache():
    # Get cache location from settings
    settings = get_settings()
    cache_path = settings.cache_location

    # Check if cache folder exists
    if not os.path.exists(cache_path):
        os.makedirs(cache_path)

    # Enable local cache
    fastf1.Cache.enable_cache(cache_path)


FPS = 25
DT = 1 / FPS

# Bump this any time the shape of per-frame data changes (fields added,
# removed, or renamed) — old cache files under a previous version number
# are simply ignored (treated as "not found") instead of being loaded and
# causing a KeyError downstream when new code expects a field they don't have.
CACHE_SCHEMA_VERSION = 8


def _process_single_driver(args):
    """Extract one driver's telemetry safely for replay generation."""
    driver_no, session, driver_code = args

    print(f"Getting telemetry for driver: {driver_code}")

    try:
        laps_driver = session.laps.pick_drivers(driver_no)
    except Exception as exc:
        print(f"[Replay] {driver_code}: failed to select laps: {exc}")
        return None

    if laps_driver is None or laps_driver.empty:
        print(f"[Replay] {driver_code}: no laps")
        return None

    driver_max_lap = (
        float(laps_driver["LapNumber"].max())
        if "LapNumber" in laps_driver.columns
        else 0
    )

    t_all = []
    x_all = []
    y_all = []
    race_dist_all = []
    rel_dist_all = []
    lap_numbers = []
    tyre_compounds = []
    tyre_life_all = []
    speed_all = []
    gear_all = []
    drs_all = []
    throttle_all = []
    brake_all = []

    total_dist_so_far = 0.0

    pit_in_times = []
    pit_out_times = []

    for _, lap in laps_driver.iterlaps():

        try:
            lap_number = float(lap.get("LapNumber", 0))

            # --------------------------------------------------------
            # Telemetry
            # --------------------------------------------------------
            lap_tel = lap.get_telemetry()

            if lap_tel is None or lap_tel.empty:
                continue

            required = [
                "SessionTime",
                "X",
                "Y",
                "Distance",
                "RelativeDistance",
                "Speed",
                "nGear",
                "DRS",
                "Throttle",
                "Brake",
            ]

            missing = [c for c in required if c not in lap_tel.columns]

            if missing:
                print(
                    f"[Replay] {driver_code} lap {lap_number}: "
                    f"missing {missing}"
                )
                continue

            # --------------------------------------------------------
            # Convert telemetry to numeric arrays
            # --------------------------------------------------------
            t_lap = (
                lap_tel["SessionTime"]
                .dt.total_seconds()
                .to_numpy(dtype=float)
            )

            x_lap = pd.to_numeric(
                lap_tel["X"], errors="coerce"
            ).to_numpy(dtype=float)

            y_lap = pd.to_numeric(
                lap_tel["Y"], errors="coerce"
            ).to_numpy(dtype=float)

            d_lap = pd.to_numeric(
                lap_tel["Distance"], errors="coerce"
            ).to_numpy(dtype=float)

            rd_lap = pd.to_numeric(
                lap_tel["RelativeDistance"], errors="coerce"
            ).to_numpy(dtype=float)

            speed_lap = pd.to_numeric(
                lap_tel["Speed"], errors="coerce"
            ).fillna(0).to_numpy(dtype=float)

            gear_lap = pd.to_numeric(
                lap_tel["nGear"], errors="coerce"
            ).fillna(0).to_numpy(dtype=float)

            drs_lap = pd.to_numeric(
                lap_tel["DRS"], errors="coerce"
            ).fillna(0).to_numpy(dtype=float)

            throttle_lap = pd.to_numeric(
                lap_tel["Throttle"], errors="coerce"
            ).fillna(0).to_numpy(dtype=float)

            brake_lap = pd.to_numeric(
                lap_tel["Brake"], errors="coerce"
            ).fillna(0).to_numpy(dtype=float)

            # --------------------------------------------------------
            # Remove invalid distance samples
            # --------------------------------------------------------
            valid_distance = np.isfinite(d_lap)

            if not np.any(valid_distance):
                continue

            first_valid = float(d_lap[valid_distance][0])

            # Use the largest valid distance as the lap endpoint.
            last_valid = float(
                d_lap[valid_distance][-1]
            )

            lap_distance = max(
                0.0,
                last_valid - first_valid
            )

            race_d_lap = (
                total_dist_so_far
                + (d_lap - first_valid)
            )

            race_d_lap = np.nan_to_num(
                race_d_lap,
                nan=total_dist_so_far,
                posinf=total_dist_so_far,
                neginf=total_dist_so_far,
            )

            # --------------------------------------------------------
            # Safe tyre information
            # --------------------------------------------------------
            compound_value = lap.get("Compound")

            try:
                tyre_compound = get_tyre_compound_int(
                    compound_value
                )
            except Exception:
                tyre_compound = 0

            tyre_life_value = lap.get("TyreLife")

            if pd.notna(tyre_life_value):
                try:
                    tyre_life = float(tyre_life_value)
                except Exception:
                    tyre_life = 0.0
            else:
                tyre_life = 0.0

            # --------------------------------------------------------
            # Safe pit timestamps
            # --------------------------------------------------------
            pit_in = lap.get("PitInTime")
            pit_out = lap.get("PitOutTime")

            try:
                if pd.notna(pit_in):
                    pit_in_times.append(
                        pit_in.total_seconds()
                    )
            except Exception:
                pass

            try:
                if pd.notna(pit_out):
                    pit_out_times.append(
                        pit_out.total_seconds()
                    )
            except Exception:
                pass

            # --------------------------------------------------------
            # Append telemetry
            # --------------------------------------------------------
            t_all.append(t_lap)
            x_all.append(x_lap)
            y_all.append(y_lap)
            race_dist_all.append(race_d_lap)
            rel_dist_all.append(
                np.nan_to_num(
                    rd_lap,
                    nan=0.0,
                    posinf=1.0,
                    neginf=0.0,
                )
            )

            lap_numbers.append(
                np.full(
                    len(t_lap),
                    lap_number,
                    dtype=float
                )
            )

            tyre_compounds.append(
                np.full(
                    len(t_lap),
                    tyre_compound,
                    dtype=float
                )
            )

            tyre_life_all.append(
                np.full(
                    len(t_lap),
                    tyre_life,
                    dtype=float
                )
            )

            speed_all.append(speed_lap)
            gear_all.append(gear_lap)
            drs_all.append(drs_lap)
            throttle_all.append(throttle_lap)
            brake_all.append(brake_lap)

            total_dist_so_far += lap_distance

        except Exception as exc:
            print(
                f"[Replay] {driver_code} lap {lap_number}: "
                f"telemetry extraction failed: {exc}"
            )
            continue

    # ------------------------------------------------------------
    # No telemetry for this driver
    # ------------------------------------------------------------
    if not t_all:
        print(
            f"[Replay] {driver_code}: NO TELEMETRY EXTRACTED"
        )
        return None

    # ------------------------------------------------------------
    # Concatenate
    # ------------------------------------------------------------
    t_all = np.concatenate(t_all)
    x_all = np.concatenate(x_all)
    y_all = np.concatenate(y_all)
    race_dist_all = np.concatenate(race_dist_all)
    rel_dist_all = np.concatenate(rel_dist_all)
    lap_numbers = np.concatenate(lap_numbers)
    tyre_compounds = np.concatenate(tyre_compounds)
    tyre_life_all = np.concatenate(tyre_life_all)
    speed_all = np.concatenate(speed_all)
    gear_all = np.concatenate(gear_all)
    drs_all = np.concatenate(drs_all)
    throttle_all = np.concatenate(throttle_all)
    brake_all = np.concatenate(brake_all)

    # ------------------------------------------------------------
    # Sort by session time
    # ------------------------------------------------------------
    valid_time = np.isfinite(t_all)

    t_all = t_all[valid_time]
    x_all = x_all[valid_time]
    y_all = y_all[valid_time]
    race_dist_all = race_dist_all[valid_time]
    rel_dist_all = rel_dist_all[valid_time]
    lap_numbers = lap_numbers[valid_time]
    tyre_compounds = tyre_compounds[valid_time]
    tyre_life_all = tyre_life_all[valid_time]
    speed_all = speed_all[valid_time]
    gear_all = gear_all[valid_time]
    drs_all = drs_all[valid_time]
    throttle_all = throttle_all[valid_time]
    brake_all = brake_all[valid_time]

    if len(t_all) == 0:
        return None

    order = np.argsort(t_all)

    t_all = t_all[order]
    x_all = x_all[order]
    y_all = y_all[order]
    race_dist_all = race_dist_all[order]
    rel_dist_all = rel_dist_all[order]
    lap_numbers = lap_numbers[order]
    tyre_compounds = tyre_compounds[order]
    tyre_life_all = tyre_life_all[order]
    speed_all = speed_all[order]
    gear_all = gear_all[order]
    drs_all = drs_all[order]
    throttle_all = throttle_all[order]
    brake_all = brake_all[order]

    # ------------------------------------------------------------
    # Pit windows
    # ------------------------------------------------------------
    pit_in_times.sort()
    pit_out_times.sort()

    pit_windows = list(
        zip(pit_in_times, pit_out_times)
    )

    in_pit_all = np.zeros(
        len(t_all),
        dtype=float
    )

    for pit_in, pit_out in pit_windows:
        if pit_out >= pit_in:
            in_pit_all[
                (t_all >= pit_in)
                & (t_all <= pit_out)
            ] = 1.0

    print(
        f"Completed telemetry for driver: {driver_code} "
        f"({len(t_all)} samples, "
        f"{driver_max_lap:.0f} laps)"
    )

    return {
        "code": driver_code,
        "data": {
            "t": t_all,
            "x": x_all,
            "y": y_all,
            "dist": race_dist_all,
            "rel_dist": rel_dist_all,
            "lap": lap_numbers,
            "tyre": tyre_compounds,
            "tyre_life": tyre_life_all,
            "speed": speed_all,
            "gear": gear_all,
            "drs": drs_all,
            "throttle": throttle_all,
            "brake": brake_all,
            "in_pit": in_pit_all,
        },
        "t_min": float(t_all.min()),
        "t_max": float(t_all.max()),
        "max_lap": driver_max_lap,
    }

# def load_session(year, round_number, session_type="R"):
#     # session_type: 'R' (Race), 'S' (Sprint) etc.
#     session = fastf1.get_session(year, round_number, session_type)
#     session.load(telemetry=True, weather=True)
#     return session

def load_session(year, round_number, session_type="R", telemetry=True):
    # session_type: 'R' (Race), 'S' (Sprint) etc.
    session = fastf1.get_session(year, round_number, session_type)
    session.load(laps=True, telemetry=telemetry, weather=telemetry)
    return session


# The following functions require a loaded session object
def get_driver_colors(session):
    color_mapping = fastf1.plotting.get_driver_color_mapping(session)

    # Convert hex colors to RGB tuples
    rgb_colors = {}
    for driver, hex_color in color_mapping.items():
        hex_color = hex_color.lstrip("#")
        rgb = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
        rgb_colors[driver] = rgb
    return rgb_colors

def get_driver_statuses(session):
    """
    Build official race-result metadata for every driver in the session.

    This is intentionally separate from replay telemetry because DNS,
    DNF/retirement and DSQ drivers may not have usable telemetry frames.
    """

    results = session.results
    statuses = {}

    for _, row in results.iterrows():
        code = row.get("Abbreviation")

        if not code or pd.isna(code):
            continue

        code = str(code)

        position_value = row.get("Position")
        position = (
            int(position_value)
            if pd.notna(position_value)
            else None
        )

        status_value = row.get("Status")
        status = (
            str(status_value).strip()
            if pd.notna(status_value)
            else ""
        )

        laps_value = row.get("Laps")
        laps_completed = (
            int(laps_value)
            if pd.notna(laps_value)
            else 0
        )

        # FastF1 normally provides a textual status such as:
        # Finished, +1 Lap, Retired, Did not start, Disqualified.
        status_lower = status.lower()

        did_not_start = (
            "did not start" in status_lower
            or "dns" == status_lower
        )

        disqualified = (
            "disqual" in status_lower
            or "dsq" == status_lower
        )

        retired = (
            "retired" in status_lower
            or "dnf" == status_lower
        )

        classified = (
            not did_not_start
            and not disqualified
            and position is not None
        )

        statuses[code] = {
            "status": status,
            "position": position,
            "laps_completed": laps_completed,
            "classified": classified,
            "did_not_start": did_not_start,
            "retired": retired,
            "disqualified": disqualified,
        }

    return statuses


# def get_session_drivers(session):
#     """Lightweight driver list (code, name, color) for populating dropdowns
#     — doesn't need telemetry loaded, just session.results.
#     """
#     results = session.results
#     colors = get_driver_colors(session)
#     drivers = []
#     for _, row in results.iterrows():
#         code = row.get("Abbreviation")
#         if not code or pd.isna(code):
#             continue
#         full_name = row.get("FullName", code)
#         rgb = colors.get(code, (136, 136, 136))
#         drivers.append({
#             "code": code,
#             "name": str(full_name) if pd.notna(full_name) else code,
#             "color": f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}",
#         })
#     return drivers

def get_session_drivers(session):
    """Driver roster for a session: code, name, team, session position,
    points, and team color — built from session.results, so it works
    without loading telemetry (fast, used for dropdowns and the
    Drivers roster view alike).
    """
    results = session.results
    colors = get_driver_colors(session)
    drivers = []
    for _, row in results.iterrows():
        code = row.get("Abbreviation")
        if not code or pd.isna(code):
            continue
        full_name = row.get("FullName", code)
        team = row.get("TeamName", "")
        position = row.get("Position")
        points = row.get("Points")
        rgb = colors.get(code, (136, 136, 136))
        drivers.append({
            "code": code,
            "name": str(full_name) if pd.notna(full_name) else code,
            "team": str(team) if pd.notna(team) else "",
            "position": int(position) if pd.notna(position) else None,
            "points": float(points) if pd.notna(points) else None,
            "color": f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}",
        })

    drivers.sort(key=lambda d: (d["position"] is None, d["position"] or 999))
    return drivers


def get_driver_lap_telemetry(session, driver_code, lap_number=None, n_points=400):
    """One driver's telemetry for a single lap (their fastest lap by
    default, or a specific lap_number), resampled onto a fixed-size
    distance grid (not time) — so two different drivers' laps can be
    directly compared point-for-point on a shared X-axis regardless of
    how long each lap took or how many raw samples FastF1 recorded.
    """
    driver_laps = session.laps.pick_drivers(driver_code)
    if driver_laps.empty:
        raise ValueError(f"No laps found for driver '{driver_code}'")

    if lap_number is not None:
        lap_rows = driver_laps[driver_laps["LapNumber"] == lap_number]
        if lap_rows.empty:
            raise ValueError(f"Lap {lap_number} not found for driver '{driver_code}'")
        lap = lap_rows.iloc[0]
    else:
        lap = driver_laps.pick_fastest()
        if lap is None:
            raise ValueError(f"No valid lap found for driver '{driver_code}'")

    telemetry = lap.get_telemetry()
    if telemetry is None or telemetry.empty or "Distance" not in telemetry.columns:
        raise ValueError(f"No telemetry available for driver '{driver_code}'")

    dist = telemetry["Distance"].to_numpy()
    speed = telemetry["Speed"].to_numpy()
    throttle = telemetry["Throttle"].to_numpy()
    brake = telemetry["Brake"].to_numpy().astype(float) * 100.0
    gear = telemetry["nGear"].to_numpy()

    total_distance = float(dist.max())
    grid = np.linspace(0, total_distance, n_points)

    order = np.argsort(dist)
    dist_sorted = dist[order]

    speed_r = np.interp(grid, dist_sorted, speed[order])
    throttle_r = np.interp(grid, dist_sorted, throttle[order])
    brake_r = np.interp(grid, dist_sorted, brake[order])

    idxs = np.searchsorted(dist_sorted, grid, side="right") - 1
    idxs = np.clip(idxs, 0, len(dist_sorted) - 1)
    gear_r = gear[order][idxs].astype(int)

    sector_times = {
        "sector1": parse_time_string(str(lap.get("Sector1Time"))) if pd.notna(lap.get("Sector1Time")) else None,
        "sector2": parse_time_string(str(lap.get("Sector2Time"))) if pd.notna(lap.get("Sector2Time")) else None,
        "sector3": parse_time_string(str(lap.get("Sector3Time"))) if pd.notna(lap.get("Sector3Time")) else None,
    }
    lap_time = parse_time_string(str(lap.get("LapTime"))) if pd.notna(lap.get("LapTime")) else None
    compound = str(lap.get("Compound", "UNKNOWN")) if pd.notna(lap.get("Compound")) else "UNKNOWN"

    return {
        "driver": driver_code,
        "lap_number": int(lap["LapNumber"]),
        "distance": [round(d, 1) for d in grid.tolist()],
        "speed": [round(s, 1) for s in speed_r.tolist()],
        "throttle": [round(t, 1) for t in throttle_r.tolist()],
        "brake": [round(b, 1) for b in brake_r.tolist()],
        "gear": gear_r.tolist(),
        "lap_time": lap_time,
        "sector_times": sector_times,
        "compound": compound,
        "total_distance": round(total_distance, 1),
    }

def get_tyre_strategy(session):
    """
    Builds a per-driver tyre-stint summary directly from FastF1's Laps
    dataframe (Stint + Compound + FreshTyre columns) — reliable, not
    derived from noisy per-frame telemetry. Includes whether each stint
    started on a fresh or used set of tyres (FastF1's FreshTyre column),
    and total race pit-stop count, matching the standard
    stint-strategy-chart format (e.g. official Pirelli pit-stop graphics).
    """
    laps = session.laps
    total_laps = int(laps["LapNumber"].max()) if not laps.empty else 0
    driver_colors = get_driver_colors(session)

    strategy = []
    total_pit_stops = 0

    for drv in session.drivers:
        driver_code = session.get_driver(drv)["Abbreviation"]
        driver_laps = laps.pick_drivers(drv)
        if driver_laps.empty:
            continue

        stints = []
        for stint_num, stint_laps in driver_laps.groupby("Stint"):
            if stint_laps.empty:
                continue
            compound_val = stint_laps["Compound"].iloc[0]
            compound = str(compound_val) if pd.notna(compound_val) else "UNKNOWN"
            start_lap = int(stint_laps["LapNumber"].min())
            end_lap = int(stint_laps["LapNumber"].max())

            fresh_val = stint_laps["FreshTyre"].iloc[0] if "FreshTyre" in stint_laps.columns else None
            fresh = bool(fresh_val) if pd.notna(fresh_val) else True

            stints.append({
                "stint": int(stint_num),
                "compound": compound,
                "compound_int": get_tyre_compound_int(compound),
                "start_lap": start_lap,
                "end_lap": end_lap,
                "lap_count": end_lap - start_lap + 1,
                "fresh": fresh,
            })

        stints.sort(key=lambda s: s["start_lap"])

        # Pit stop count: one fewer than the number of stints (a driver
        # who never pits has exactly 1 stint and 0 stops).
        driver_pit_stops = max(0, len(stints) - 1)
        total_pit_stops += driver_pit_stops

        rgb = driver_colors.get(driver_code, (136, 136, 136))
        strategy.append({
            "code": driver_code,
            "color": f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}",
            "stints": stints,
            "pit_stops": driver_pit_stops,
            "laps_completed": stints[-1]["end_lap"] if stints else 0,
        })

    try:
        results = session.results
        order = {row["Abbreviation"]: idx for idx, (_, row) in enumerate(results.iterrows())}
        strategy.sort(key=lambda s: order.get(s["code"], 999))
    except Exception:
        pass

    return {
        "total_laps": total_laps,
        "total_pit_stops": total_pit_stops,
        "drivers": strategy,
    }

def get_circuit_rotation(session):
    circuit = session.get_circuit_info()
    return circuit.rotation


# def get_race_telemetry(session, session_type="R"):
#     event_name = str(session).replace(" ", "_")
#     cache_suffix = "sprint" if session_type == "S" else "race"
#     cache_suffix = f"{cache_suffix}_v{CACHE_SCHEMA_VERSION}"

def get_race_telemetry(session, session_type="R"):
    """
    Build synchronized race/sprint replay telemetry from FastF1 lap telemetry.

    The returned structure is intentionally compatible with the replay service:
      {
        "frames": [
          {
            "t": <seconds from session timeline>,
            "drivers": {
              "VER": {
                "x": ..., "y": ..., "dist": ..., "rel_dist": ...,
                "lap": ..., "speed": ..., "gear": ...,
                "drs": ..., "throttle": ..., "brake": ...,
                "tyre": ..., "tyre_life": ...,
                "gap_to_leader": ..., "interval": ...,
                "ahead": ..., "behind": ...
              }
            }
          }
        ],
        "driver_colors": {...},
        "max_tyre_life": {...},
        "driver_statuses": {...},
        "track_statuses": [...]
      }

    IMPORTANT:
    gap_to_leader and interval are calculated from the actual FastF1
    synchronized telemetry. They are not hardcoded and are not calculated
    as distance / speed.

    These are telemetry-derived timing gaps. They should be treated as an
    approximation of the official live timing feed, especially around pit
    entry/exit, safety-car periods, and unusual telemetry gaps.
    """
    event_name = str(session).replace(" ", "_")
    cache_suffix = "sprint" if session_type == "S" else "race"
    cache_suffix = f"{cache_suffix}_v{CACHE_SCHEMA_VERSION}"
    cache_file = _COMPUTED_DATA_DIR / f"{event_name}_{cache_suffix}_telemetry.pkl"

    # ------------------------------------------------------------------
    # Reuse the project's computed replay cache unless refresh was asked.
    # ------------------------------------------------------------------
    if "--refresh-data" not in sys.argv:
        try:
            with open(cache_file, "rb") as f:
                data = pickle.load(f)

            if (
                isinstance(data, dict)
                and isinstance(data.get("frames"), list)
                and data.get("frames")
            ):
                print(f"Loaded precomputed {cache_suffix} telemetry data.")
                return data
        except FileNotFoundError:
            pass
        except Exception as exc:
            print(f"[Replay] Could not load cached race telemetry: {exc}")

    # ------------------------------------------------------------------
    # Make sure the session data needed by _process_single_driver exists.
    # ------------------------------------------------------------------
    try:
        if session.laps is None or session.laps.empty:
            session.load(
                laps=True,
                telemetry=True,
                weather=False,
                messages=False,
                livedata=False,
            )
        else:
            # get_telemetry() on individual laps may still require telemetry.
            session.load(
                laps=True,
                telemetry=True,
                weather=False,
                messages=False,
                livedata=False,
            )
    except Exception as exc:
        raise RuntimeError(f"Failed to load race telemetry: {exc}") from exc

    # ------------------------------------------------------------------
    # Process every driver. Multiprocessing is avoided here deliberately:
    # FastF1/Pandas objects are large and can be expensive to pickle, and
    # this function is also used directly by the API process.
    # ------------------------------------------------------------------
    driver_codes = {}
    for driver_no in session.drivers:
        try:
            driver_codes[driver_no] = session.get_driver(driver_no)["Abbreviation"]
        except Exception as exc:
            print(f"[Replay] Could not resolve driver {driver_no}: {exc}")

    driver_data = {}

    for driver_no, driver_code in driver_codes.items():
        result = _process_single_driver((driver_no, session, driver_code))
        if result is None:
            continue

        data = result["data"]

        # Keep only finite numeric samples. This prevents NaN/inf from
        # reaching JSON serialization or the interpolation functions.
        cleaned = {}
        for key, values in data.items():
            arr = np.asarray(values)
            if key == "lap":
                cleaned[key] = np.nan_to_num(arr, nan=0.0).astype(float)
            elif key == "in_pit":
                cleaned[key] = np.nan_to_num(arr, nan=0.0).astype(float)
            else:
                try:
                    cleaned[key] = np.asarray(arr, dtype=float)
                except Exception:
                    cleaned[key] = arr

        # Ensure time ordering and remove duplicate timestamps.
        times = cleaned["t"]
        valid = np.isfinite(times)

        for key in list(cleaned.keys()):
            cleaned[key] = cleaned[key][valid]

        if len(cleaned["t"]) < 2:
            continue

        order = np.argsort(cleaned["t"])
        for key in list(cleaned.keys()):
            cleaned[key] = cleaned[key][order]

        unique_t, unique_idx = np.unique(cleaned["t"], return_index=True)
        for key in list(cleaned.keys()):
            cleaned[key] = cleaned[key][unique_idx]

        cleaned["t"] = unique_t
        driver_data[driver_code] = cleaned

    if not driver_data:
        raise RuntimeError("No usable race telemetry was extracted from FastF1.")

    # ------------------------------------------------------------------
    # Shared replay timeline.
    #
    # Each driver retains the real FastF1 SessionTime as its source clock.
    # The replay timeline starts at the earliest telemetry timestamp.
    # ------------------------------------------------------------------
    global_t_min = min(float(data["t"][0]) for data in driver_data.values())
    global_t_max = max(float(data["t"][-1]) for data in driver_data.values())

    if global_t_max <= global_t_min:
        raise RuntimeError("Race telemetry contains an invalid time range.")

    timeline = np.arange(
        0.0,
        (global_t_max - global_t_min) + (DT * 0.5),
        DT,
        dtype=float,
    )

    if timeline.size == 0:
        raise RuntimeError("Could not build a replay timeline.")

    # ------------------------------------------------------------------
    # Interpolation helpers.
    # ------------------------------------------------------------------
    continuous_fields = (
        "x",
        "y",
        "dist",
        "rel_dist",
        "speed",
        "throttle",
        "brake",
        "tyre_life",
        "in_pit",
    )

    discrete_fields = ("lap", "tyre", "gear", "drs")

    resampled = {}

    for code, data in driver_data.items():
        source_t = np.asarray(data["t"], dtype=float) - global_t_min

        # np.interp does not accept duplicate x values. They were removed
        # above, but keep this guard for safety.
        source_t, unique_idx = np.unique(source_t, return_index=True)

        if len(source_t) < 2:
            continue

        result = {}

        for field in continuous_fields:
            values = np.asarray(data[field], dtype=float)[unique_idx]
            values = np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0)
            result[field] = np.interp(
                timeline,
                source_t,
                values,
            )

        for field in discrete_fields:
            values = np.asarray(data[field], dtype=float)[unique_idx]
            values = np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0)

            idxs = np.searchsorted(source_t, timeline, side="right") - 1
            idxs = np.clip(idxs, 0, len(source_t) - 1)
            result[field] = values[idxs]

        # Keep exact session-time information available for timing-gap
        # calculations. "t" is absolute FastF1 session time here.
        result["t"] = timeline + global_t_min

        resampled[code] = result

    if not resampled:
        raise RuntimeError("No drivers could be resampled onto the replay timeline.")

    # ------------------------------------------------------------------
    # Driver metadata.
    # ------------------------------------------------------------------
    driver_colors = get_driver_colors(session)
    driver_statuses = get_driver_statuses(session)

    max_tyre_life = {}
    for code, data in resampled.items():
        try:
            max_tyre_life[code] = int(
                max(0.0, float(np.nanmax(data["tyre_life"])))
            )
        except Exception:
            max_tyre_life[code] = 0

    # ------------------------------------------------------------------
    # Timing-gap calculation.
    #
    # For a car at distance D:
    #   gap_to_leader = leader's time at distance D - this car's time
    #
    # For the immediately-ahead car:
    #   interval = ahead car's time at distance D - this car's time
    #
    # This is a true time-at-track-position calculation using telemetry.
    # It is fundamentally different from distance_gap / speed.
    # ------------------------------------------------------------------
    timing_lookup = {}
    for code, data in driver_data.items():
        timing_lookup[code] = data

    def _safe_timing_gap(ahead_code, current_time, target_distance):
        if not ahead_code:
            return None

        ahead_data = timing_lookup.get(ahead_code)
        if ahead_data is None:
            return None

        ahead_time = _time_at_race_distance(
            ahead_data,
            target_distance,
        )

        if ahead_time is None:
            return None

        gap = float(ahead_time - current_time)

        # A tiny negative value can occur because of interpolation and
        # telemetry timestamp quantization. Do not expose -0.000...
        if abs(gap) < 0.005:
            gap = 0.0

        # Negative gaps larger than the interpolation tolerance indicate
        # that the chosen ordering is not valid for this sample.
        if gap < -0.05:
            return None

        return gap

    frames = []

    codes = list(resampled.keys())

    for frame_index, relative_t in enumerate(timeline):
        absolute_t = float(relative_t + global_t_min)

        # --------------------------------------------------------------
        # Snapshot all drivers first.
        # --------------------------------------------------------------
        snapshot = []

        for code in codes:
            data = resampled[code]

            distance = float(data["dist"][frame_index])
            if not np.isfinite(distance):
                continue

            snapshot.append(
                {
                    "code": code,
                    "distance": distance,
                    "lap": float(data["lap"][frame_index]),
                    "time": float(data["t"][frame_index]),
                }
            )

        if not snapshot:
            continue

        # Race order at this instant is based on completed race distance.
        # For equal/near-equal distance, session time breaks the tie.
        snapshot.sort(
            key=lambda item: (
                -item["distance"],
                item["time"],
            )
        )

        position_by_code = {
            item["code"]: position
            for position, item in enumerate(snapshot, start=1)
        }

        ahead_by_code = {}
        behind_by_code = {}

        for idx, item in enumerate(snapshot):
            code = item["code"]

            ahead_by_code[code] = (
                snapshot[idx - 1]["code"] if idx > 0 else None
            )
            behind_by_code[code] = (
                snapshot[idx + 1]["code"]
                if idx + 1 < len(snapshot)
                else None
            )

        leader_code = snapshot[0]["code"]

        # --------------------------------------------------------------
        # Build driver payloads.
        # --------------------------------------------------------------
        frame_drivers = {}

        for code in codes:
            if code not in position_by_code:
                continue

            data = resampled[code]

            current_distance = float(data["dist"][frame_index])
            current_time = float(data["t"][frame_index])

            ahead_code = ahead_by_code.get(code)
            behind_code = behind_by_code.get(code)

            # Leader gap.
            if code == leader_code:
                gap_to_leader = 0.0
            else:
                gap_to_leader = _safe_timing_gap(
                    leader_code,
                    current_time,
                    current_distance,
                )

            # Interval to the immediately preceding car in the
            # telemetry-derived race order.
            if ahead_code is None:
                interval = 0.0
            else:
                interval = _safe_timing_gap(
                    ahead_code,
                    current_time,
                    current_distance,
                )

            # Physical distance gap remains separate from timing gap.
            leader_distance = float(snapshot[0]["distance"])
            gap_m = max(0.0, leader_distance - current_distance)

            tyre_value = float(data["tyre"][frame_index])
            tyre_life_value = float(data["tyre_life"][frame_index])

            frame_drivers[code] = {
                "x": float(data["x"][frame_index]),
                "y": float(data["y"][frame_index]),
                "lap": float(data["lap"][frame_index]),
                "tyre": int(round(tyre_value)),
                "tyre_life": float(tyre_life_value),
                "position": int(position_by_code[code]),
                "rel_dist": float(data["rel_dist"][frame_index]),
                "dist": current_distance,
                "speed": float(data["speed"][frame_index]),
                "gear": int(round(data["gear"][frame_index])),
                "drs": int(round(data["drs"][frame_index])),
                "throttle": float(data["throttle"][frame_index]),
                "brake": float(data["brake"][frame_index]),
                "in_pit": bool(data["in_pit"][frame_index] >= 0.5),
                "gap_m": gap_m,
                "gap_to_leader": (
                    round(gap_to_leader, 3)
                    if gap_to_leader is not None
                    else None
                ),
                "interval": (
                    round(interval, 3)
                    if interval is not None
                    else None
                ),
                "ahead": (
                    {
                        "driver": ahead_code,
                        "gap": (
                            round(interval, 3)
                            if interval is not None
                            else None
                        ),
                    }
                    if ahead_code
                    else None
                ),
                "behind": (
                    {
                        "driver": behind_code,
                    }
                    if behind_code
                    else None
                ),
            }

        frames.append(
            {
                "t": round(float(relative_t), 3),
                "drivers": frame_drivers,
            }
        )

    if not frames:
        raise RuntimeError("Replay frame generation produced no frames.")

    # ------------------------------------------------------------------
    # Track-status timeline.
    # ------------------------------------------------------------------
    formatted_track_statuses = []

    try:
        track_status = session.track_status

        if track_status is not None and not track_status.empty:
            for status in track_status.to_dict("records"):
                raw_time = status.get("Time")

                if raw_time is None or pd.isna(raw_time):
                    continue

                try:
                    absolute_status_time = raw_time.total_seconds()
                except AttributeError:
                    try:
                        absolute_status_time = float(raw_time)
                    except Exception:
                        continue

                start_time = float(absolute_status_time - global_t_min)

                if formatted_track_statuses:
                    formatted_track_statuses[-1]["end_time"] = start_time

                formatted_track_statuses.append(
                    {
                        "status": str(status.get("Status", "")),
                        "start_time": start_time,
                        "end_time": None,
                    }
                )
    except Exception as exc:
        print(f"[Replay] Could not process track-status data: {exc}")

    # ------------------------------------------------------------------
    # Save the new schema-versioned cache.
    # ------------------------------------------------------------------
    result = {
        "frames": frames,
        "driver_colors": driver_colors,
        "max_tyre_life": max_tyre_life,
        "driver_statuses": driver_statuses,
        "track_statuses": formatted_track_statuses,
        "frame_rate": FPS,
        "source_fps": FPS,
        "session_type": session_type,
        "t_min": global_t_min,
        "t_max": global_t_max,
    }

    _COMPUTED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    try:
        with open(cache_file, "wb") as f:
            pickle.dump(
                result,
                f,
                protocol=pickle.HIGHEST_PROTOCOL,
            )

        print(
            f"[Replay] Saved {len(frames):,} frames to "
            f"{cache_file.name}"
        )
    except Exception as exc:
        print(f"[Replay] Could not save computed telemetry cache: {exc}")

    return result


def _time_at_race_distance(driver_data, target_distance):
    """
    Estimate the real session time at which a driver reaches
    a specific cumulative race distance.

    Uses the driver's actual FastF1 telemetry:
        t         -> session time
        race_dist -> cumulative race distance

    Returns:
        float: session time in seconds
        None: if the requested distance is outside available data
    """
    try:
        times = np.asarray(driver_data["t"], dtype=float)
        distances = np.asarray(driver_data["dist"], dtype=float)

        if len(times) == 0 or len(distances) == 0:
            return None

        valid = (
            np.isfinite(times)
            & np.isfinite(distances)
        )

        times = times[valid]
        distances = distances[valid]

        if len(times) < 2:
            return None

        # Sort by telemetry time first.
        order = np.argsort(times)

        times = times[order]
        distances = distances[order]

        # Race distance should normally increase with time.
        # Remove duplicate/non-increasing distance samples so
        # interpolation remains mathematically valid.
        keep = np.concatenate(
            ([True], np.diff(distances) > 0)
        )

        distances = distances[keep]
        times = times[keep]

        if len(distances) < 2:
            return None

        target_distance = float(target_distance)

        # Do NOT extrapolate outside real telemetry.
        if (
            target_distance < distances[0]
            or target_distance > distances[-1]
        ):
            return None

        return float(
            np.interp(
                target_distance,
                distances,
                times,
            )
        )

    except Exception as exc:
        print(
            f"[Replay] Failed to interpolate timing "
            f"at race distance: {exc}"
        )
        return None

def get_qualifying_results(session):
    # Extract the qualifying results and return a list of the drivers, their positions and their lap times in each qualifying segment

    results = session.results

    qualifying_data = []

    for _, row in results.iterrows():
        driver_code = row["Abbreviation"]
        # Skip drivers with no position (DNF/DNS/no lap data)
        if pd.isna(row["Position"]):
            continue
        position = int(row["Position"])
        q1_time = row["Q1"]
        q2_time = row["Q2"]
        q3_time = row["Q3"]
        full_name = row["FullName"]

        # Convert pandas Timedelta objects to seconds (or None if NaT)
        def convert_time_to_seconds(time_val) -> str:
            if pd.isna(time_val):
                return None
            return str(time_val.total_seconds())

        qualifying_data.append(
            {
                "code": driver_code,
                "full_name": full_name,
                "position": position,
                "color": get_driver_colors(session).get(driver_code, (128, 128, 128)),
                "Q1": convert_time_to_seconds(q1_time),
                "Q2": convert_time_to_seconds(q2_time),
                "Q3": convert_time_to_seconds(q3_time),
            }
        )
    return qualifying_data


def get_driver_quali_telemetry(session, driver_code: str, quali_segment: str):
    # Split Q1/Q2/Q3 sections
    q1, q2, q3 = session.laps.split_qualifying_sessions()

    segments = {"Q1": q1, "Q2": q2, "Q3": q3}

    # Validate the segment
    if quali_segment not in segments:
        raise ValueError("quali_segment must be 'Q1', 'Q2', or 'Q3'")

    segment_laps = segments[quali_segment]
    if segment_laps is None:
        raise ValueError(f"{quali_segment} does not exist for this session.")

    # Filter laps for the driver
    driver_laps = segment_laps.pick_drivers(driver_code)
    if driver_laps.empty:
        raise ValueError(f"No laps found for driver '{driver_code}' in {quali_segment}")

    # Pick fastest lap
    fastest_lap = driver_laps.pick_fastest()

    # Extract telemetry with xyz coordinates

    if fastest_lap is None:
        raise ValueError(f"No valid laps for driver '{driver_code}' in {quali_segment}")

    telemetry = fastest_lap.get_telemetry()

    # Guard: if telemetry has no time data, return empty
    if (
        telemetry is None
        or telemetry.empty
        or "Time" not in telemetry
        or len(telemetry) == 0
    ):
        return {"frames": [], "track_statuses": []}

    global_t_min = telemetry["Time"].dt.total_seconds().min()
    global_t_max = telemetry["Time"].dt.total_seconds().max()

    max_speed = telemetry["Speed"].max()
    min_speed = telemetry["Speed"].min()

    # An array of objects containing the start and end disances of each time the driver used DRS during the lap
    lap_drs_zones = []

    # Build arrays directly from dataframes
    t_arr = telemetry["Time"].dt.total_seconds().to_numpy()
    x_arr = telemetry["X"].to_numpy()
    y_arr = telemetry["Y"].to_numpy()
    dist_arr = telemetry["Distance"].to_numpy()
    rel_dist_arr = telemetry["RelativeDistance"].to_numpy()
    speed_arr = telemetry["Speed"].to_numpy()
    gear_arr = telemetry["nGear"].to_numpy()
    throttle_arr = telemetry["Throttle"].to_numpy()
    brake_arr = telemetry["Brake"].to_numpy()
    drs_arr = telemetry["DRS"].to_numpy()

    # Recompute time bounds from the (possibly modified) telemetry times
    global_t_min = float(t_arr.min())
    global_t_max = float(t_arr.max())

    # Create timeline (relative times starting at zero) and include endpoint
    absolute_timeline = np.arange(
        global_t_min,
        global_t_max,
        DT,
    )

    timeline = absolute_timeline - global_t_min


    # Ensure we have at least one sample
    if t_arr.size == 0:
        return {"frames": [], "track_statuses": []}

    # Shift telemetry times to same reference as timeline (relative to global_t_min)
    t_rel = t_arr - global_t_min

    # Sort & deduplicate times using the relative times
    order = np.argsort(t_rel)
    t_sorted = t_rel[order]
    t_sorted_unique, unique_idx = np.unique(t_sorted, return_index=True)
    idx_map = order[unique_idx]

    x_sorted = x_arr[idx_map]
    y_sorted = y_arr[idx_map]
    dist_sorted = dist_arr[idx_map]
    rel_dist_sorted = rel_dist_arr[idx_map]
    speed_sorted = speed_arr[idx_map]
    gear_sorted = gear_arr[idx_map]
    throttle_sorted = throttle_arr[idx_map]
    brake_sorted = brake_arr[idx_map]
    drs_sorted = drs_arr[idx_map]

    # Continuous interpolation
    x_resampled = np.interp(timeline, t_sorted_unique, x_sorted)
    y_resampled = np.interp(timeline, t_sorted_unique, y_sorted)
    dist_resampled = np.interp(timeline, t_sorted_unique, dist_sorted)
    rel_dist_resampled = np.interp(timeline, t_sorted_unique, rel_dist_sorted)
    speed_resampled = np.round(np.interp(timeline, t_sorted_unique, speed_sorted), 1)
    throttle_resampled = np.round(
        np.interp(timeline, t_sorted_unique, throttle_sorted), 1
    )
    brake_resampled = np.round(np.interp(timeline, t_sorted_unique, brake_sorted), 1)
    drs_resampled = np.interp(timeline, t_sorted_unique, drs_sorted)

    # Make sure that braking is between 0 and 100 so that it matches the throttle scale

    brake_resampled = brake_resampled * 100.0

    # Forward-fill / step sampling for discrete fields (gear)
    idxs = np.searchsorted(t_sorted_unique, timeline, side="right") - 1
    idxs = np.clip(idxs, 0, len(t_sorted_unique) - 1)
    gear_resampled = gear_sorted[idxs].astype(int)

    resampled_data = {
        "t": absolute_timeline,
        "x": x_resampled,
        "y": y_resampled,
        "dist": dist_resampled,
        "rel_dist": rel_dist_resampled,
        "speed": speed_resampled,
        "gear": gear_resampled,
        "throttle": throttle_resampled,
        "brake": brake_resampled,
        "drs": drs_resampled,
        "throttle": throttle_resampled,
    }

    track_status = session.track_status

    formatted_track_statuses = []

    for status in track_status.to_dict("records"):
        seconds = timedelta.total_seconds(status["Time"])

        start_time = seconds - global_t_min  # Shift to match timeline
        end_time = None

        # Set the end time of the previous status
        if formatted_track_statuses:
            formatted_track_statuses[-1]["end_time"] = start_time

        formatted_track_statuses.append(
            {
                "status": status["Status"],
                "start_time": start_time,
                "end_time": end_time,
            }
        )

    # 4.1. Resample weather data onto the same timeline for playback
    weather_resampled = None
    weather_df = getattr(session, "weather_data", None)
    if weather_df is not None and not weather_df.empty:
        try:
            weather_times = (
                weather_df["Time"].dt.total_seconds().to_numpy() - global_t_min
            )
            if len(weather_times) > 0:
                order_w = np.argsort(weather_times)
                weather_times = weather_times[order_w]

                def _maybe_get(name):
                    return (
                        weather_df[name].to_numpy()[order_w]
                        if name in weather_df
                        else None
                    )

                def _resample(series):
                    if series is None:
                        return None
                    return np.interp(timeline, weather_times, series)

                track_temp = _resample(_maybe_get("TrackTemp"))
                air_temp = _resample(_maybe_get("AirTemp"))
                humidity = _resample(_maybe_get("Humidity"))
                wind_speed = _resample(_maybe_get("WindSpeed"))
                wind_direction = _resample(_maybe_get("WindDirection"))
                rainfall_raw = _maybe_get("Rainfall")
                rainfall = (
                    _resample(rainfall_raw.astype(float))
                    if rainfall_raw is not None
                    else None
                )

                weather_resampled = {
                    "track_temp": track_temp,
                    "air_temp": air_temp,
                    "humidity": humidity,
                    "wind_speed": wind_speed,
                    "wind_direction": wind_direction,
                    "rainfall": rainfall,
                }
        except Exception as e:
            print(f"Weather data could not be processed: {e}")

    # Build the frames
    frames = []
    num_frames = len(timeline)

    for i in range(num_frames):
        t = timeline[i]

        weather_snapshot = {}
        if weather_resampled:
            try:
                wt = weather_resampled
                rain_val = wt["rainfall"][i] if wt.get("rainfall") is not None else 0.0
                weather_snapshot = {
                    "track_temp": float(wt["track_temp"][i])
                    if wt.get("track_temp") is not None
                    else None,
                    "air_temp": float(wt["air_temp"][i])
                    if wt.get("air_temp") is not None
                    else None,
                    "humidity": float(wt["humidity"][i])
                    if wt.get("humidity") is not None
                    else None,
                    "wind_speed": float(wt["wind_speed"][i])
                    if wt.get("wind_speed") is not None
                    else None,
                    "wind_direction": float(wt["wind_direction"][i])
                    if wt.get("wind_direction") is not None
                    else None,
                    "rain_state": "RAINING" if rain_val and rain_val >= 0.5 else "DRY",
                }
            except Exception as e:
                print(f"Failed to attach weather data to frame {i}: {e}")

        # Check if drs has changed from the previous frame

        if i > 0:
            drs_prev = resampled_data["drs"][i - 1]
            drs_curr = resampled_data["drs"][i]

            if (drs_curr >= 10) and (drs_prev < 10):
                # DRS activated
                lap_drs_zones.append(
                    {
                        "zone_start": float(resampled_data["dist"][i]),
                        "zone_end": None,
                    }
                )
            elif (drs_curr < 10) and (drs_prev >= 10):
                # DRS deactivated
                if lap_drs_zones and lap_drs_zones[-1]["zone_end"] is None:
                    lap_drs_zones[-1]["zone_end"] = float(resampled_data["dist"][i])

        frame_payload = {
            "t": round(t, 3),
            "telemetry": {
                "x": float(resampled_data["x"][i]),
                "y": float(resampled_data["y"][i]),
                "dist": float(resampled_data["dist"][i]),
                "rel_dist": float(resampled_data["rel_dist"][i]),
                "speed": float(resampled_data["speed"][i]),
                "gear": int(resampled_data["gear"][i]),
                "throttle": float(resampled_data["throttle"][i]),
                "brake": float(resampled_data["brake"][i]),
                "drs": int(resampled_data["drs"][i]),
            },
        }
        if weather_snapshot:
            frame_payload["weather"] = weather_snapshot

        frames.append(frame_payload)

    # Set the time of the final frame to the exact lap time

    frames[-1]["t"] = round(parse_time_string(str(fastest_lap["LapTime"])), 3)

    sector_times = {
        "sector1": parse_time_string(str(fastest_lap.get("Sector1Time")))
        if pd.notna(fastest_lap.get("Sector1Time"))
        else None,
        "sector2": parse_time_string(str(fastest_lap.get("Sector2Time")))
        if pd.notna(fastest_lap.get("Sector2Time"))
        else None,
        "sector3": parse_time_string(str(fastest_lap.get("Sector3Time")))
        if pd.notna(fastest_lap.get("Sector3Time"))
        else None,
    }

    # Extract tyre compound from the lap
    compound = (
        str(fastest_lap.get("Compound", "UNKNOWN"))
        if pd.notna(fastest_lap.get("Compound"))
        else "UNKNOWN"
    )
    compound_number = get_tyre_compound_int(compound)
    return {
        "frames": frames,
        "track_statuses": formatted_track_statuses,
        "drs_zones": lap_drs_zones,
        "max_speed": max_speed,
        "min_speed": min_speed,
        "sector_times": sector_times,
        "compound": compound_number,
    }


def _process_quali_driver(args):
    """Process qualifying telemetry data for a single driver - must be top-level for multiprocessing"""
    session, driver_code = args
    print(f"Getting qualifying telemetry for driver: {driver_code}")

    driver_telemetry_data = {}

    max_speed = 0.0
    min_speed = 0.0

    for segment in ["Q1", "Q2", "Q3"]:
        try:
            segment_telemetry = get_driver_quali_telemetry(
                session, driver_code, segment
            )
            driver_telemetry_data[segment] = segment_telemetry

            # Update global max/min speed
            if segment_telemetry["max_speed"] > max_speed:
                max_speed = segment_telemetry["max_speed"]
            if segment_telemetry["min_speed"] < min_speed or min_speed == 0.0:
                min_speed = segment_telemetry["min_speed"]

        except ValueError:
            driver_telemetry_data[segment] = {"frames": [], "track_statuses": []}

    print(
        f"Finished processing qualifying telemetry for driver: {driver_code}, {session.get_driver(driver_code)['FullName']},"
    )
    return {
        "driver_code": driver_code,
        "driver_full_name": session.get_driver(driver_code)["FullName"],
        "driver_telemetry_data": driver_telemetry_data,
        "max_speed": max_speed,
        "min_speed": min_speed,
    }


def get_quali_telemetry(session, session_type="Q"):
    # This function is going to get the results from qualifying and the telemetry for each drivers' fastest laps in each qualifying segment

    # The structure of the returned data will be:
    # {
    #   "results": [ { "code": driver_code, "position": position, "Q1": time, "Q2": time, "Q3": time }, ... ],
    #   "telemetry": {
    #       "driver_code": {
    #           "Q1": { "frames": [ { "t": time, "x": x, "y": y, "dist": dist, "speed": speed, "gear": gear }, ... ] },
    #           "Q2": { ... },
    #           "Q3": { ... },
    #       },
    #       ...
    #   }
    # }

    event_name = str(session).replace(" ", "_")
    cache_suffix = "sprintquali" if session_type == "SQ" else "quali"

    # Check if this data has already been computed
    try:
        if "--refresh-data" not in sys.argv:
            with open(
                _COMPUTED_DATA_DIR / f"{event_name}_{cache_suffix}_telemetry.pkl", "rb"
            ) as f:
                data = pickle.load(f)
                print(f"Loaded precomputed {cache_suffix} telemetry data.")
                print("The replay should begin in a new window shortly!")
                return data
    except FileNotFoundError:
        pass  # Need to compute from scratch

    qualifying_results = get_qualifying_results(session)

    telemetry_data = {}

    max_speed = 0.0
    min_speed = 0.0

    driver_codes = {
        num: session.get_driver(num)["Abbreviation"] for num in session.drivers
    }

    telemetry_data = {}

    driver_args = [(session, driver_codes[driver_no]) for driver_no in session.drivers]

    print(f"Processing {len(session.drivers)} drivers in parallel...")

    num_processes = min(cpu_count(), len(session.drivers))

    with Pool(processes=num_processes) as pool:
        results = pool.map(_process_quali_driver, driver_args)
    for result in results:
        driver_code = result["driver_code"]
        telemetry_data[driver_code] = {
            "full_name": result["driver_full_name"],
            **result["driver_telemetry_data"],
        }

        if result["max_speed"] > max_speed:
            max_speed = result["max_speed"]
        if result["min_speed"] < min_speed or min_speed == 0.0:
            min_speed = result["min_speed"]

    # Save to the compute_data directory

    _COMPUTED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(_COMPUTED_DATA_DIR / f"{event_name}_{cache_suffix}_telemetry.pkl", "wb") as f:
        pickle.dump(
            {
                "results": qualifying_results,
                "telemetry": telemetry_data,
                "max_speed": max_speed,
                "min_speed": min_speed,
            },
            f,
            protocol=pickle.HIGHEST_PROTOCOL,
        )

    return {
        "results": qualifying_results,
        "telemetry": telemetry_data,
        "max_speed": max_speed,
        "min_speed": min_speed,
    }


def get_race_weekends_by_year(year):
    """Returns a list of race weekends for a given year."""
    enable_cache()
    schedule = fastf1.get_event_schedule(year)
    weekends = []
    for _, event in schedule.iterrows():
        if event.is_testing():
            continue
        weekends.append(
            {
                "round_number": event["RoundNumber"],
                "event_name": event["EventName"],
                "date": str(event["EventDate"].date()),
                "country": event["Country"],
                "type": event["EventFormat"],
            }
        )
    return weekends


def list_rounds(year):
    """Lists all rounds for a given year."""
    enable_cache()
    print(f"F1 Schedule {year}")
    schedule = fastf1.get_event_schedule(year)
    for _, event in schedule.iterrows():
        print(f"{event['RoundNumber']}: {event['EventName']}")


def list_sprints(year):
    """Lists all sprint rounds for a given year."""
    enable_cache()
    print(f"F1 Sprint Races {year}")
    schedule = fastf1.get_event_schedule(year)
    sprint_name = "sprint_qualifying"
    if year == 2023:
        sprint_name = "sprint_shootout"
    if year in [2021, 2022]:
        sprint_name = "sprint"
    sprints = schedule[schedule["EventFormat"] == sprint_name]
    if sprints.empty:
        print(f"No sprint races found for {year}.")
    else:
        for _, event in sprints.iterrows():
            print(f"{event['RoundNumber']}: {event['EventName']}")
