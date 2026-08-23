"""
backend/src/driver_panel.py

- Jolpica (api.jolpi.ca): season/driver/team metadata + live standings (fast, live).
- FastF1: per-round race/qualifying results, aggregated into podiums, poles,
  average finish, and fastest-lap counts. FastF1's own disk cache means this
  only pays the "slow" cost once per round, ever — not once per server restart.

Aggregated stats are additionally persisted to backend/computed_data/ as a
season-level JSON snapshot, refreshed once per day, so a server restart
doesn't even need to touch FastF1 again until that snapshot goes stale.
"""

import os
import json
import time
import datetime

import requests
import fastf1

JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"
COMPUTED_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "computed_data")
STATS_CACHE_TTL_SECONDS = 24 * 60 * 60  # recompute at most once a day


# ---------- Jolpica: standings + metadata ----------

def fetch_driver_standings(season: int, round_: int | None = None) -> list[dict]:
    if round_:
        url = f"{JOLPICA_BASE}/{season}/{round_}/driverstandings/"
    else:
        url = f"{JOLPICA_BASE}/{season}/driverstandings/"

    resp = requests.get(url, timeout=10)
    resp.raise_for_status()

    standings_lists = resp.json()["MRData"]["StandingsTable"]["StandingsLists"]
    if not standings_lists:
        return []
    return standings_lists[0]["DriverStandings"]



def _completed_rounds(season: int) -> list[int]:
    schedule = fastf1.get_event_schedule(season, include_testing=False)
    today = datetime.datetime.now()

    # Skip races from the last few days — FastF1 often can't fetch complete
    # session/timing data for a race that just happened, which causes long
    # hangs on live network calls (e.g. the Belgian GP freeze).
    cutoff = today - datetime.timedelta(days=5)

    completed = schedule[schedule["EventDate"] < cutoff]
    return completed["RoundNumber"].tolist()

def _upcoming_races(season: int, count: int = 4) -> list[dict]:
    """
    Returns the next `count` scheduled races after the last completed
    round, or an empty list if the season has no more races left.
    """
    schedule = fastf1.get_event_schedule(season, include_testing=False)
    completed = set(_completed_rounds(season))

    if completed:
        last_completed = max(completed)
    else:
        last_completed = 0

    upcoming = schedule[schedule["RoundNumber"] > last_completed]
    if upcoming.empty:
        return []

    races = []
    for _, event in upcoming.head(count).iterrows():
        races.append({
            "name": event["EventName"],
            "date": event["EventDate"].strftime("%Y-%m-%d"),   # ISO format for reliable JS parsing
            "display_date": event["EventDate"].strftime("%B %d, %Y"),
            "country": event.get("Country", ""),
        })
    return races

def _race_session_data(season: int, round_: int):
    """
    Loads the race session ONCE (with laps=True) and returns both the
    results table and the fastest-lap driver code from it. Replaces the
    old pattern of loading the same race session twice.
    """
    session = fastf1.get_session(season, round_, "R")
    session.load(laps=True, telemetry=False, weather=False, messages=False)

    results = session.results

    fastest_code = None
    laps = session.laps
    if not laps.empty:
        fastest = laps.pick_fastest()
        fastest_code = fastest["Driver"] if fastest is not None else None

    return results, fastest_code


def _qualifying_results(season: int, round_: int):
    session = fastf1.get_session(season, round_, "Q")
    session.load(laps=False, telemetry=False, weather=False, messages=False)
    return session.results


"""
Patch for backend/src/driver_panel.py — replace _compute_season_stats with
this version. The only behavioral change: qualifying position is now
recorded per-round (not just whether it was P1), and merged into each
driver's `history` entries as `quali_position`. Everything else is
identical to before.
"""

def _compute_season_stats(season: int) -> dict[str, dict]:
    """
    Build season driver statistics from completed race + qualifying sessions.

    Safety rules:
    - DNF / DNS / DSQ / NaN / non-numeric positions become None.
    - Only valid numeric race positions count toward podiums/average finish.
    - Poles come only from the Qualifying session.
    - Fastest lap is taken only from the Race session.
    - A failed round never aborts the entire season calculation.
    - Qualifying position is stored per round and merged into race history.
    """

    stats: dict[str, dict] = {}
    quali_positions: dict[str, dict[int, int]] = {}

    def _new_entry() -> dict:
        return {
            "podiums": 0,
            "poles": 0,
            "fastest_laps": 0,
            "finishes": [],
            "history": [],
        }

    def _safe_int(value):
        """Return a positive integer or None for NaN/DNF/DNS/DSQ/etc."""
        if value is None:
            return None

        try:
            # Handles pandas/numpy NaN and NaT safely.
            if value != value:
                return None
        except Exception:
            pass

        try:
            text = str(value).strip()
        except Exception:
            return None

        if not text:
            return None

        # FastF1 may expose classifications such as R/D/NC instead
        # of a numeric finishing position.
        try:
            number = float(text)
        except (TypeError, ValueError):
            return None

        if number != number or number <= 0:
            return None

        try:
            return int(number)
        except (TypeError, ValueError, OverflowError):
            return None

    def _safe_float(value, default=0.0):
        if value is None:
            return default

        try:
            if value != value:
                return default
        except Exception:
            pass

        try:
            number = float(value)
            if number != number:
                return default
            return number
        except (TypeError, ValueError, OverflowError):
            return default

    schedule = fastf1.get_event_schedule(season, include_testing=False)
    round_names = dict(zip(schedule["RoundNumber"], schedule["EventName"]))

    for round_ in sorted(_completed_rounds(season)):

        # ------------------------------------------------------------
        # RACE
        # ------------------------------------------------------------
        try:
            race, fl_code = _race_session_data(season, round_)

            if race is not None and not race.empty:
                for _, row in race.iterrows():
                    code = row.get("Abbreviation")

                    if not code:
                        continue

                    code = str(code).strip().upper()
                    entry = stats.setdefault(code, _new_entry())

                    pos = _safe_int(row.get("Position"))

                    if pos is not None:
                        entry["finishes"].append(pos)

                        if pos <= 3:
                            entry["podiums"] += 1

                    points = round(_safe_float(row.get("Points")), 3)

                    entry["history"].append({
                        "round": int(round_),
                        "event_name": round_names.get(
                            round_,
                            f"Round {round_}"
                        ),
                        "position": pos,
                        "points": points,
                    })

            # Fastest lap is already calculated from the R session
            # by _race_session_data(), so it cannot accidentally count
            # Sprint / Qualifying laps as Grand Prix fastest laps.
            if fl_code:
                fl_code = str(fl_code).strip().upper()

                fl_entry = stats.setdefault(fl_code, _new_entry())
                fl_entry["fastest_laps"] += 1

        except Exception as e:
            print(
                f"[driver_panel] skipping race round "
                f"{round_} ({season}): {e}"
            )

        # ------------------------------------------------------------
        # QUALIFYING
        # ------------------------------------------------------------
        try:
            quali = _qualifying_results(season, round_)

            if quali is not None and not quali.empty:
                for _, row in quali.iterrows():
                    code = row.get("Abbreviation")

                    if not code:
                        continue

                    code = str(code).strip().upper()
                    entry = stats.setdefault(code, _new_entry())

                    qpos = _safe_int(row.get("Position"))

                    if qpos is not None:
                        quali_positions.setdefault(
                            code, {}
                        )[int(round_)] = qpos

                        # Pole is counted ONLY from the Q session.
                        if qpos == 1:
                            entry["poles"] += 1

        except Exception as e:
            print(
                f"[driver_panel] skipping qualifying round "
                f"{round_} ({season}): {e}"
            )

    # ------------------------------------------------------------
    # FINALIZE HISTORY + AVERAGE FINISH
    # ------------------------------------------------------------
    for code, entry in stats.items():
        history = sorted(
            entry["history"],
            key=lambda h: h["round"]
        )

        cumulative = 0.0
        driver_quali = quali_positions.get(code, {})

        for h in history:
            cumulative += _safe_float(h.get("points"))
            h["cumulative_points"] = round(cumulative, 1)

            # None is intentional when qualifying data was unavailable.
            h["quali_position"] = driver_quali.get(h["round"])

        entry["history"] = history

        finishes = entry.pop("finishes", [])

        entry["avg_finish"] = (
            round(sum(finishes) / len(finishes), 1)
            if finishes
            else None
        )

    return stats

def _current_event_name(season: int) -> str | None:
    """
    Returns the event name of the most recently completed round of the
    season — used so the frontend track map shows the actual current
    race instead of a hardcoded fallback.
    """
    schedule = fastf1.get_event_schedule(season, include_testing=False)
    completed = _completed_rounds(season)
    if not completed:
        return None
    last_round = max(completed)
    match = schedule[schedule["RoundNumber"] == last_round]
    if match.empty:
        return None
    return match.iloc[0]["EventName"]


def _disk_cache_path(season: int) -> str:
    return os.path.join(COMPUTED_DATA_DIR, f"driver_stats_{season}.json")



def get_season_stats_cached(season: int) -> dict[str, dict]:
    """Read-only: returns cached stats if present, else {} — never computes."""
    path = _disk_cache_path(season)
    if os.path.exists(path):
        try:
            with open(path) as f:
                cached = json.load(f)
            if isinstance(cached, dict):
                return cached
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def warm_season_stats(season: int) -> None:
    """Computes and persists stats to disk. Call only from a background thread."""
    path = _disk_cache_path(season)
    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)
        if age < STATS_CACHE_TTL_SECONDS:
            # Even if "fresh" by age, don't trust a corrupted/placeholder
            # file — validate it actually contains usable stats before
            # skipping the recompute.
            try:
                with open(path) as f:
                    cached = json.load(f)
                if isinstance(cached, dict) and cached:
                    return  # genuinely fresh and valid, nothing to do
            except (json.JSONDecodeError, OSError):
                pass  # fall through and recompute

    stats = _compute_season_stats(season)
    os.makedirs(COMPUTED_DATA_DIR, exist_ok=True)

    # Write atomically so a server crash/interruption can never leave
    # driver_stats_<season>.json partially written or corrupted.
    temp_path = f"{path}.tmp"

    try:
        with open(temp_path, "w") as f:
            json.dump(
                stats,
                f,
                indent=2,
                allow_nan=False,
            )
            f.flush()
            os.fsync(f.fileno())

        os.replace(temp_path, path)

    except Exception:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except OSError:
            pass
        raise


# ---------- Merge ----------

def _static_lookup(static_drivers: list) -> dict:
    lookup = {}
    for entry in static_drivers:
        key = entry.get("driverId") or entry.get("id")
        if key:
            lookup[str(key).lower()] = entry
    return lookup

def _compute_age(born_str: str | None) -> int | None:
    if not born_str:
        return None
    try:
        born_date = datetime.datetime.strptime(born_str, "%Y-%m-%d")
        today = datetime.datetime.now()
        age = today.year - born_date.year
        if (today.month, today.day) < (born_date.month, born_date.day):
            age -= 1
        return age
    except ValueError:
        return None

def build_driver_panel(season: int, static_drivers: list, round_: int | None = None) -> list[dict]:
    standings = fetch_driver_standings(season, round_)
    season_stats = get_season_stats_cached(season) or {}
    static_by_key = _static_lookup(static_drivers)
    upcoming_races = _upcoming_races(season, count=4)
    current_event_name = _current_event_name(season)

    merged = []
    for entry in standings:
        driver = entry.get("Driver", {})
        constructors = entry.get("Constructors", [])
        driver_id = driver.get("driverId", "")
        code = driver.get("code", "")
        static_entry = static_by_key.get(driver_id.lower(), {})
        extra = season_stats.get(code, {})

        # ------------------------------------------------------------
        # NORMALIZED DRIVER -> FRONTEND CONTRACT
        # Keep one canonical shape here so driver-panel.js never has
        # to guess between snake_case / camelCase / legacy field names.
        # ------------------------------------------------------------

        def _safe_int(value, default=None):
            try:
                if value is None:
                    return default
                if isinstance(value, float) and value != value:
                    return default
                return int(float(value))
            except (TypeError, ValueError):
                return default

        def _safe_float(value, default=0.0):
            try:
                if value is None:
                    return default
                if isinstance(value, float) and value != value:
                    return default
                return float(value)
            except (TypeError, ValueError):
                return default

        team_name = (
            constructors[0].get("name", "")
            if constructors and isinstance(constructors[0], dict)
            else ""
        ) or static_entry.get("team", "")

        team_color = (
            static_entry.get("teamColor")
            or static_entry.get("team_color")
            or static_entry.get("color")
            or "#888888"
        )

        driver_name = (
            f"{driver.get('givenName', '')} "
            f"{driver.get('familyName', '')}"
        ).strip()

        if not driver_name:
            driver_name = (
                static_entry.get("name")
                or static_entry.get("fullName")
                or code
                or driver_id
            )

        # Preserve existing static asset names while exposing one
        # predictable frontend contract.
        driver_image = (
            static_entry.get("image")
            or static_entry.get("driver_img")
            or static_entry.get("driverImage")
            or ""
        )

        banner_image = (
            static_entry.get("banner")
            or static_entry.get("banner_url")
            or static_entry.get("bannerUrl")
            or ""
        )

        team_logo = (
            static_entry.get("teamLogo")
            or static_entry.get("team_logo")
            or static_entry.get("logo")
            or ""
        )

        car_name = (
            static_entry.get("carName")
            or static_entry.get("car_name")
            or ""
        )

        merged.append({
            # Static metadata / assets
            **static_entry,

            # Canonical identity
            "driverId": driver_id or static_entry.get("driverId", ""),
            "code": code or static_entry.get("code", ""),
            "name": driver_name,

            # Team
            "team": team_name,
            "color": team_color,
            "teamLogo": team_logo,
            "carName": car_name,

            # Assets
            "image": driver_image,
            "banner": banner_image,

            # Current championship standings
            "position": _safe_int(entry.get("position")),
            "points": _safe_float(entry.get("points"), 0.0),
            "wins": _safe_int(entry.get("wins"), 0),

            # Season statistics
            "podiums": _safe_int(extra.get("podiums"), 0),
            "poles": _safe_int(extra.get("poles"), 0),
            "fastest_laps": _safe_int(extra.get("fastest_laps"), 0),
            "avg_finish": extra.get("avg_finish"),

            # Historical data
            "history": extra.get("history", []) or [],

            # Schedule / current event
            "next_races": upcoming_races or [],
            "current_event_name": current_event_name,

            # Biography
            "age": _compute_age(static_entry.get("born")),
        })

    merged.sort(key=lambda d: (d["position"] is None, d["position"] or 999))
    return merged

# ============================================================
# CAREER, SEASON JOURNEY, CIRCUIT DNA, RACECRAFT, PERFORMANCE INDEX
# ============================================================

CAREER_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  # career totals barely move mid-season


def get_or_build_season_stats(season: int) -> dict[str, dict]:
    """Read-only. NEVER computes inline inside a request — if a season
    isn't cached yet, returns {} and the background warm-up job fills
    it in for next time. This is what keeps /api/drivers/{code}/full
    fast even on first request after a fresh server start."""
    return get_season_stats_cached(season) or {}


def _career_cache_path(code: str) -> str:
    return os.path.join(COMPUTED_DATA_DIR, f"career_{code}.json")


def get_career_stats(code: str, debut_year: int, current_season: int) -> dict:
    """
    Walks every season from debut -> current, summing real per-season
    stats (already computed by _compute_season_stats). Cached per driver,
    refreshed weekly since these totals only change after a race weekend.
    """
    path = _career_cache_path(code)
    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)
        if age < CAREER_CACHE_TTL_SECONDS:
            try:
                with open(path) as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                pass

    totals = {
        "wins": 0, "podiums": 0, "poles": 0, "fastest_laps": 0,
        "starts": 0, "first_win_year": None, "first_pole_year": None,
    }

    debut_year = debut_year or current_season

    for year in range(debut_year, current_season + 1):
        season_stats = get_or_build_season_stats(year)
        entry = season_stats.get(code)
        if not entry:
            continue

        history = sorted(entry.get("history", []), key=lambda h: h["round"])
        totals["starts"] += len(history)
        totals["podiums"] += entry.get("podiums", 0)
        totals["poles"] += entry.get("poles", 0)
        totals["fastest_laps"] += entry.get("fastest_laps", 0)

        for h in history:
            if h.get("position") == 1:
                totals["wins"] += 1
                if totals["first_win_year"] is None:
                    totals["first_win_year"] = year
            if h.get("quali_position") == 1 and totals["first_pole_year"] is None:
                totals["first_pole_year"] = year

    os.makedirs(COMPUTED_DATA_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(totals, f, indent=2)

    return totals


def get_season_journey(code: str, current_season: int, years_back: int = 3) -> list[dict]:
    """Points/wins/avg-finish per season for the last `years_back` seasons."""
    journey = []
    for year in range(current_season - years_back + 1, current_season + 1):
        season_stats = get_or_build_season_stats(year)
        entry = season_stats.get(code)

        if not entry:
            journey.append({"year": year, "points": 0, "wins": 0, "avg_finish": None})
            continue

        history = entry.get("history", [])
        points = history[-1]["cumulative_points"] if history else 0
        wins = sum(1 for h in history if h.get("position") == 1)

        journey.append({
            "year": year,
            "points": points,
            "wins": wins,
            "avg_finish": entry.get("avg_finish"),
        })

    return journey


def get_circuit_dna(code: str, current_season: int, years_back: int = 3) -> dict:
    """
    Groups real finishing positions by circuit (event_name) across
    `years_back` seasons, then normalizes avg finish to a 0-100 scale:
    P1 avg -> 100, P20 avg -> ~0. This scale is a documented choice,
    not an official rating.
    """
    by_circuit: dict[str, list[int]] = {}

    for year in range(current_season - years_back + 1, current_season + 1):
        season_stats = get_or_build_season_stats(year)
        entry = season_stats.get(code)
        if not entry:
            continue
        for h in entry.get("history", []):
            pos = h.get("position")
            if pos is None:
                continue
            by_circuit.setdefault(h["event_name"], []).append(pos)

    ratings = []
    for circuit, positions in by_circuit.items():
        avg_pos = sum(positions) / len(positions)
        score = max(0, min(100, round(100 - (avg_pos - 1) * (100 / 19))))
        ratings.append({"circuit": circuit, "score": score, "races": len(positions)})

    ratings.sort(key=lambda r: r["score"], reverse=True)

    return {
        "best": ratings[0] if ratings else None,
        "weakest": ratings[-1] if ratings else None,
        "ratings": ratings,
    }


# ---------- Racecraft (new FastF1 lap-level pull) ----------

def _compute_racecraft_for_round(season: int, round_: int) -> dict[str, dict]:
    session = fastf1.get_session(season, round_, "R")
    session.load(laps=True, telemetry=False, weather=False, messages=False)

    laps = session.laps
    if laps.empty:
        return {}

    result: dict[str, dict] = {}

    for code, driver_laps in laps.groupby("Driver"):
        driver_laps = driver_laps.sort_values("LapNumber")
        positions = driver_laps["Position"].dropna().tolist()

        overtakes = 0
        lost = 0
        for prev, cur in zip(positions, positions[1:]):
            if cur < prev:
                overtakes += 1
            elif cur > prev:
                lost += 1

        pit_laps = driver_laps[driver_laps["PitInTime"].notna()]
        pit_durations = []

        for _, lap in pit_laps.iterrows():
            pit_in = lap.get("PitInTime")
            next_lap = driver_laps[driver_laps["LapNumber"] == lap["LapNumber"] + 1]
            if not next_lap.empty:
                pit_out = next_lap.iloc[0].get("PitOutTime")
                if pit_in is not None and pit_out is not None:
                    try:
                        duration = (pit_out - pit_in).total_seconds()
                        if 0 < duration < 60:  # filters SC/red-flag stoppages
                            pit_durations.append(duration)
                    except Exception:
                        pass

        grid = positions[0] if positions else None
        finish = positions[-1] if positions else None
        gained = (grid - finish) if (grid is not None and finish is not None) else 0

        result[code] = {
            "overtakes": overtakes,
            "positions_lost": lost,
            "positions_gained": gained,
            "pit_stops": len(pit_laps),
            "pit_durations": pit_durations,
        }

    return result


def _racecraft_cache_path(season: int) -> str:
    return os.path.join(COMPUTED_DATA_DIR, f"racecraft_{season}.json")


def get_racecraft_cached(season: int) -> dict:
    path = _racecraft_cache_path(season)
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def warm_racecraft_stats(season: int) -> None:
    """Expensive (loads laps for every completed round) — call from a
    background thread only, same pattern as warm_season_stats."""
    path = _racecraft_cache_path(season)
    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)
        if age < STATS_CACHE_TTL_SECONDS:
            return

    aggregate: dict[str, dict] = {}

    for round_ in sorted(_completed_rounds(season)):
        try:
            round_data = _compute_racecraft_for_round(season, round_)
        except Exception as e:
            print(f"[driver_panel] racecraft skip round {round_} ({season}): {e}")
            continue

        for code, stats in round_data.items():
            entry = aggregate.setdefault(code, {
                "overtakes": 0, "positions_lost": 0, "positions_gained": 0,
                "pit_stops": 0, "pit_durations": [],
            })
            entry["overtakes"] += stats["overtakes"]
            entry["positions_lost"] += stats["positions_lost"]
            entry["positions_gained"] += stats["positions_gained"]
            entry["pit_stops"] += stats["pit_stops"]
            entry["pit_durations"].extend(stats["pit_durations"])

    for code, entry in aggregate.items():
        durations = entry.pop("pit_durations")
        entry["avg_pit_stop"] = round(sum(durations) / len(durations), 2) if durations else None
        entry["best_pit_stop"] = round(min(durations), 2) if durations else None

    os.makedirs(COMPUTED_DATA_DIR, exist_ok=True)
    temp_path = f"{path}.tmp"
    with open(temp_path, "w") as f:
        json.dump(aggregate, f, indent=2)
    os.replace(temp_path, path)


def get_racecraft_stats(season: int) -> dict:
    """Read-only — never triggers the expensive per-round lap loop
    inline inside a request."""
    return get_racecraft_cached(season)


# ---------- Performance Index (transparent formula, not official) ----------

def get_performance_index(season_entry: dict, racecraft_entry: dict) -> dict:
    """
    Every sub-score is a normalized real stat:
    - race_pace: normalized avg finish
    - qualifying: normalized avg quali position
    - consistency: 100 - (stdev of finishes) * 10
    - racecraft: overtakes per race, scaled
    - overtaking: net positions gained per race, scaled
    - tyre_mgmt: null until stint-degradation data is built (see TODO)
    """
    history = season_entry.get("history", [])
    finishes = [h["position"] for h in history if h.get("position") is not None]
    qualis = [h["quali_position"] for h in history if h.get("quali_position") is not None]

    def _normalize_position(pos):
        return max(0, min(100, round(100 - (pos - 1) * (100 / 19))))

    race_pace = _normalize_position(sum(finishes) / len(finishes)) if finishes else 0
    qualifying = _normalize_position(sum(qualis) / len(qualis)) if qualis else 0

    if len(finishes) > 1:
        mean = sum(finishes) / len(finishes)
        variance = sum((f - mean) ** 2 for f in finishes) / len(finishes)
        consistency = max(0, min(100, round(100 - (variance ** 0.5) * 10)))
    else:
        consistency = 0

    races_run = len(history) or 1
    racecraft_score = max(0, min(100, round((racecraft_entry.get("overtakes", 0) / races_run) * 20)))
    overtaking_score = max(0, min(100, round(50 + (racecraft_entry.get("positions_gained", 0) / races_run) * 10)))

    # TODO: needs per-stint lap-time degradation from laps grouped by
    # Compound/Stint — not yet computed anywhere in this file.
    tyre_mgmt = None

    sub_scores = {
        "race_pace": race_pace,
        "qualifying": qualifying,
        "consistency": consistency,
        "racecraft": racecraft_score,
        "overtaking": overtaking_score,
        "tyre_mgmt": tyre_mgmt,
    }

    numeric = [v for v in sub_scores.values() if v is not None]
    overall = round(sum(numeric) / len(numeric)) if numeric else 0

    return {"overall": overall, **sub_scores}


def get_teammate_battle(code: str, driver_panel_data: list[dict]) -> dict | None:
    me = next((d for d in driver_panel_data if d["code"] == code), None)
    if not me:
        return None
    teammate = next(
        (d for d in driver_panel_data if d["team"] == me["team"] and d["code"] != code),
        None,
    )
    if not teammate:
        return None

    return {
        "driver": {k: me[k] for k in ("code", "name", "points", "podiums", "poles")},
        "teammate": {k: teammate[k] for k in ("code", "name", "points", "podiums", "poles")},
        "leader": me["code"] if me["points"] >= teammate["points"] else teammate["code"],
    }


def build_driver_full(code: str, season: int, static_drivers: list) -> dict:
    """Single entry point for the full driver detail page."""
    code = code.upper()
    panel = build_driver_panel(season, static_drivers)
    me = next((d for d in panel if d["code"] == code), None)
    if not me:
        return {}

    debut_raw = str(me.get("debut", ""))
    debut_year = int(debut_raw) if debut_raw.isdigit() else season

    season_stats = get_or_build_season_stats(season)
    entry = season_stats.get(code, {})
    racecraft_entry = get_racecraft_stats(season).get(code, {})

    return {
        **me,
        "career": get_career_stats(code, debut_year, season),
        "season_journey": get_season_journey(code, season, years_back=3),
        "circuit_dna": get_circuit_dna(code, season, years_back=3),
        "racecraft": racecraft_entry,
        "performance_index": get_performance_index(entry, racecraft_entry),
        "teammate_battle": get_teammate_battle(code, panel),
    }