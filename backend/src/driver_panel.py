# """
# backend/src/driver_panel.py

# Pulls live driver championship standings from the Jolpica F1 API
# (https://api.jolpi.ca/ergast/f1) — the community-maintained successor to
# Ergast — and merges them with static per-driver metadata (team color,
# banner, description) stored in data/drivers.json.

# Calling the standings endpoint WITHOUT a round number returns the
# standings as of the most recently completed race automatically, so no
# round needs to be chosen or guessed by the caller.
# """

# import requests

# JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"


# def fetch_driver_standings(season: int, round_: int | None = None) -> list[dict]:
#     """
#     Calls Jolpica for driver championship standings. This is just the
#     standings table — no session telemetry, no timing data — so it's
#     fast and available the same day as a race, unlike FastF1 session data.
#     """
#     if round_:
#         url = f"{JOLPICA_BASE}/{season}/{round_}/driverstandings/"
#     else:
#         url = f"{JOLPICA_BASE}/{season}/driverstandings/"

#     resp = requests.get(url, timeout=10)
#     resp.raise_for_status()

#     standings_lists = resp.json()["MRData"]["StandingsTable"]["StandingsLists"]
#     if not standings_lists:
#         return []

#     return standings_lists[0]["DriverStandings"]


# def _static_lookup(static_drivers: list) -> dict:
#     """
#     Index static driver entries (from drivers.json) by driverId, lowercased.
#     Jolpica's Driver.driverId (e.g. "max_verstappen") matches the driverId
#     field already used in drivers.json — direct join, no fuzzy matching.
#     """
#     lookup = {}
#     for entry in static_drivers:
#         key = entry.get("driverId") or entry.get("id")
#         if key:
#             lookup[str(key).lower()] = entry
#     return lookup


# def build_driver_panel(season: int, static_drivers: list, round_: int | None = None) -> list[dict]:
#     """
#     season, round_: which championship standings to fetch from Jolpica.
#                     round_=None returns the latest available standings —
#                     no need to know or guess which round is "safe" to use.
#     static_drivers: contents of data/drivers.json (a list of dicts).

#     Returns one merged list, sorted by championship position.
#     """
#     standings = fetch_driver_standings(season, round_)
#     static_by_key = _static_lookup(static_drivers)

#     merged = []
#     for entry in standings:
#         driver = entry.get("Driver", {})
#         constructors = entry.get("Constructors", [])
#         driver_id = driver.get("driverId", "")
#         static_entry = static_by_key.get(driver_id.lower(), {})

#         merged.append({
#             **static_entry,  # teamColor, banner, description, image, flag, etc.
#             "code": driver.get("code") or static_entry.get("code", ""),
#             "name": f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip(),
#             "team": constructors[0]["name"] if constructors else static_entry.get("team", ""),
#             "position": int(entry["position"]) if entry.get("position") else None,
#             "points": float(entry["points"]) if entry.get("points") else 0.0,
#             "wins": int(entry["wins"]) if entry.get("wins") else 0,
#             "color": static_entry.get("teamColor", "#888888"),
#         })

#     merged.sort(key=lambda d: (d["position"] is None, d["position"] or 999))
#     return merged



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

def _race_results(season: int, round_: int):
    session = fastf1.get_session(season, round_, "R")
    session.load(laps=False, telemetry=False, weather=False, messages=False)
    return session.results


def _qualifying_results(season: int, round_: int):
    session = fastf1.get_session(season, round_, "Q")
    session.load(laps=False, telemetry=False, weather=False, messages=False)
    return session.results

def _fastest_lap_driver_code(season: int, round_: int) -> str | None:
    """
    Determines the fastest-lap driver for a round. Needs full lap timing
    (unlike results/qualifying above), so it's kept separate and allowed
    to fail independently — a very recent race with incomplete lap data
    just won't count toward fastest-lap totals yet, without blocking the
    rest of the season's stats.
    """
    session = fastf1.get_session(season, round_, "R")
    session.load(laps=True, telemetry=False, weather=False, messages=False)
    laps = session.laps
    if laps.empty:
        return None
    fastest = laps.pick_fastest()
    return fastest["Driver"] if fastest is not None else None




def _compute_season_stats(season: int) -> dict[str, dict]:
    stats: dict[str, dict] = {}

    schedule = fastf1.get_event_schedule(season, include_testing=False)
    round_names = dict(zip(schedule["RoundNumber"], schedule["EventName"]))

    for round_ in sorted(_completed_rounds(season)):
        try:
            race = _race_results(season, round_)
            for _, row in race.iterrows():
                code = row.get("Abbreviation")
                if not code:
                    continue
                entry = stats.setdefault(code, {
                    "podiums": 0, "poles": 0, "fastest_laps": 0,
                    "finishes": [], "history": [],
                })

                pos_str = row.get("Position")
                pos = None
                if pos_str and not (isinstance(pos_str, float) and pos_str != pos_str):
                    pos = int(pos_str)
                    entry["finishes"].append(pos)
                    if pos <= 3:
                        entry["podiums"] += 1

                points_val = row.get("Points")
                points = float(points_val) if points_val is not None and not (
                    isinstance(points_val, float) and points_val != points_val
                ) else 0.0

                entry["history"].append({
                    "round": round_,
                    "event_name": round_names.get(round_, f"Round {round_}"),
                    "position": pos,
                    "points": points,
                })
        except Exception as e:
            print(f"[driver_panel] skipping race round {round_} ({season}): {e}")

        try:
            quali = _qualifying_results(season, round_)
            for _, row in quali.iterrows():
                code = row.get("Abbreviation")
                if not code:
                    continue
                entry = stats.setdefault(code, {
                    "podiums": 0, "poles": 0, "fastest_laps": 0,
                    "finishes": [], "history": [],
                })
                if row.get("Position") == 1:
                    entry["poles"] += 1
        except Exception as e:
            print(f"[driver_panel] skipping qualifying round {round_} ({season}): {e}")

        try:
            fl_code = _fastest_lap_driver_code(season, round_)
            if fl_code:
                entry = stats.setdefault(fl_code, {
                    "podiums": 0, "poles": 0, "fastest_laps": 0,
                    "finishes": [], "history": [],
                })
                entry["fastest_laps"] += 1
        except Exception as e:
            print(f"[driver_panel] skipping fastest-lap calc for round {round_} ({season}): {e}")

    for entry in stats.values():
        # Sort by round, then compute a running cumulative-points total
        history = sorted(entry["history"], key=lambda h: h["round"])
        cumulative = 0.0
        for h in history:
            cumulative += h["points"]
            h["cumulative_points"] = round(cumulative, 1)
        entry["history"] = history

        finishes = entry.pop("finishes")
        entry["avg_finish"] = round(sum(finishes) / len(finishes), 1) if finishes else None

    return stats


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


# def warm_season_stats(season: int) -> None:
#     """Computes and persists stats to disk. Call only from a background thread."""
#     path = _disk_cache_path(season)
#     if os.path.exists(path):
#         age = time.time() - os.path.getmtime(path)
#         if age < STATS_CACHE_TTL_SECONDS:
#             return  # already fresh, nothing to do

#     stats = _compute_season_stats(season)
#     os.makedirs(COMPUTED_DATA_DIR, exist_ok=True)
#     with open(path, "w") as f:
#         json.dump(stats, f, indent=2)


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
    with open(path, "w") as f:
        json.dump(stats, f, indent=2)


# ---------- Merge ----------

def _static_lookup(static_drivers: list) -> dict:
    lookup = {}
    for entry in static_drivers:
        key = entry.get("driverId") or entry.get("id")
        if key:
            lookup[str(key).lower()] = entry
    return lookup

def build_driver_panel(season: int, static_drivers: list, round_: int | None = None) -> list[dict]:
    standings = fetch_driver_standings(season, round_)
    season_stats = get_season_stats_cached(season) or {}
    static_by_key = _static_lookup(static_drivers)

    merged = []
    for entry in standings:
        driver = entry.get("Driver", {})
        constructors = entry.get("Constructors", [])
        driver_id = driver.get("driverId", "")
        code = driver.get("code", "")
        static_entry = static_by_key.get(driver_id.lower(), {})
        extra = season_stats.get(code, {})

        merged.append({
            **static_entry,
            "code": code or static_entry.get("code", ""),
            "name": f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip(),
            "team": constructors[0]["name"] if constructors else static_entry.get("team", ""),
            "position": int(entry["position"]) if entry.get("position") else None,
            "points": float(entry["points"]) if entry.get("points") else 0.0,
            "wins": int(entry["wins"]) if entry.get("wins") else 0,
            "podiums": extra.get("podiums", 0),
            "poles": extra.get("poles", 0),
            "fastest_laps": extra.get("fastest_laps", 0),
            "avg_finish": extra.get("avg_finish"),
            "color": static_entry.get("teamColor", "#888888"),
            "history": extra.get("history", []),
        })

    merged.sort(key=lambda d: (d["position"] is None, d["position"] or 999))
    return merged