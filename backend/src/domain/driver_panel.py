import os
import json
import time
import datetime

import requests
import fastf1
import pandas as pd
from fastf1.exceptions import RateLimitExceededError

from src.api.schedule import get_schedule_data


JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"
COMPUTED_DATA_DIR = os.environ.get(
    "COMPUTED_DATA_DIR",
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "computed_data",
    ),
)

STATS_CACHE_TTL_SECONDS = 24 * 60 * 60
CAREER_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60
ALLTIME_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

def _safe_number(value, default=0.0):
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


def _safe_int(value, default=None):
    if value is None:
        return default

    try:
        if value != value:
            return default
    except Exception:
        pass

    try:
        text = str(value).strip()
    except Exception:
        return default

    if not text:
        return default

    try:
        number = float(text)
    except (TypeError, ValueError, OverflowError):
        return default

    if number != number or number <= 0:
        return default

    try:
        return int(number)
    except (TypeError, ValueError, OverflowError):
        return default


def _safe_float(value, default=0.0):
    return _safe_number(value, default)


def _get_event_schedule(season: int) -> pd.DataFrame:
    weekends = get_schedule_data(season)
    return pd.DataFrame(
        [
            {
                "RoundNumber": event["round_number"],
                "EventName": event["event_name"],
                "EventDate": pd.Timestamp(event["date"]),
                "Country": event["country"],
            }
            for event in weekends
        ],
        columns=[
            "RoundNumber",
            "EventName",
            "EventDate",
            "Country",
        ],
    )


def fetch_driver_standings(
    season: int,
    round_: int | None = None,
) -> list[dict]:
    if round_:
        url = f"{JOLPICA_BASE}/{season}/{round_}/driverstandings/"
    else:
        url = f"{JOLPICA_BASE}/{season}/driverstandings/"

    response = requests.get(url, timeout=10)
    response.raise_for_status()

    standings_lists = (
        response.json()
        .get("MRData", {})
        .get("StandingsTable", {})
        .get("StandingsLists", [])
    )

    if not standings_lists:
        return []

    return standings_lists[0].get("DriverStandings", [])


def _completed_rounds(season: int) -> list[int]:
    schedule = _get_event_schedule(season)

    today = datetime.datetime.now()
    cutoff = today - datetime.timedelta(days=5)

    completed = schedule[schedule["EventDate"] < cutoff]

    return [
        int(round_number)
        for round_number in completed["RoundNumber"].tolist()
        if _safe_int(round_number) is not None
    ]


def _upcoming_races(
    season: int,
    count: int = 4,
) -> list[dict]:
    schedule = _get_event_schedule(season)

    completed = set(_completed_rounds(season))

    last_completed = max(completed) if completed else 0

    upcoming = schedule[
        schedule["RoundNumber"] > last_completed
    ]

    if upcoming.empty:
        return []

    races = []

    for _, event in upcoming.head(count).iterrows():
        event_date = event["EventDate"]

        races.append(
            {
                "name": event["EventName"],
                "date": event_date.strftime("%Y-%m-%d"),
                "display_date": event_date.strftime("%B %d, %Y"),
                "country": event.get("Country", ""),
            }
        )

    return races


def _race_session_data(
    season: int,
    round_: int,
):
    session = fastf1.get_session(
        season,
        round_,
        "R",
    )

    session.load(
        laps=True,
        telemetry=False,
        weather=False,
        messages=False,
    )

    results = session.results
    fastest_code = None
    laps = session.laps

    if laps is not None and not laps.empty:
        try:
            fastest = laps.pick_fastest()

            if fastest is not None:
                fastest_code = fastest.get("Driver")
        except Exception:
            fastest_code = None

    return results, fastest_code


def _qualifying_results(
    season: int,
    round_: int,
):
    session = fastf1.get_session(
        season,
        round_,
        "Q",
    )

    session.load(
        laps=False,
        telemetry=False,
        weather=False,
        messages=False,
    )

    return session.results


def _compute_season_stats(
    season: int,
) -> dict[str, dict]:
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

    schedule = _get_event_schedule(season)

    round_names = dict(
        zip(
            schedule["RoundNumber"],
            schedule["EventName"],
        )
    )

    for round_ in sorted(_completed_rounds(season)):
        try:
            race, fl_code = _race_session_data(
                season,
                round_,
            )

            if race is not None and not race.empty:
                for _, row in race.iterrows():
                    code = row.get("Abbreviation")

                    if not code:
                        continue

                    code = str(code).strip().upper()

                    entry = stats.setdefault(
                        code,
                        _new_entry(),
                    )

                    position = _safe_int(
                        row.get("Position")
                    )

                    if position is not None:
                        entry["finishes"].append(position)

                        if position <= 3:
                            entry["podiums"] += 1

                    points = round(
                        _safe_number(
                            row.get("Points"),
                            0.0,
                        ),
                        3,
                    )

                    status = row.get("Status")
                    status = str(status).strip() if status is not None else ""

                    entry["history"].append(
                        {
                            "round": int(round_),
                            "event_name": round_names.get(
                                round_,
                                f"Round {round_}",
                            ),
                            "position": position,
                            "points": points,
                            "status": status,
                        }
                    )





            if fl_code:
                fl_code = str(fl_code).strip().upper()

                fl_entry = stats.setdefault(
                    fl_code,
                    _new_entry(),
                )

                fl_entry["fastest_laps"] += 1

        except RateLimitExceededError:
            raise
        except Exception as exc:
            print(
                f"[driver_panel] skipping race round "
                f"{round_} ({season}): {exc}"
            )

        try:
            quali = _qualifying_results(
                season,
                round_,
            )

            if quali is not None and not quali.empty:
                for _, row in quali.iterrows():
                    code = row.get("Abbreviation")

                    if not code:
                        continue

                    code = str(code).strip().upper()

                    entry = stats.setdefault(
                        code,
                        _new_entry(),
                    )

                    qpos = _safe_int(
                        row.get("Position")
                    )

                    if qpos is not None:
                        quali_positions.setdefault(
                            code,
                            {},
                        )[int(round_)] = qpos

                        if qpos == 1:
                            entry["poles"] += 1

        except RateLimitExceededError:
            raise
        except Exception as exc:
            print(
                f"[driver_panel] skipping qualifying round "
                f"{round_} ({season}): {exc}"
            )

    for code, entry in stats.items():
        history = sorted(
            entry["history"],
            key=lambda item: item.get("round", 0),
        )

        cumulative = 0.0
        driver_quali = quali_positions.get(
            code,
            {},
        )

        for history_entry in history:
            cumulative += _safe_number(
                history_entry.get("points"),
                0.0,
            )

            history_entry["cumulative_points"] = round(
                cumulative,
                1,
            )

            history_entry["quali_position"] = (
                driver_quali.get(
                    history_entry.get("round")
                )
            )

        entry["history"] = history

        finishes = entry.pop(
            "finishes",
            [],
        )

        entry["avg_finish"] = (
            round(
                sum(finishes) / len(finishes),
                1,
            )
            if finishes
            else None
        )

    return stats


def _current_event_name(
    season: int,
) -> str | None:
    schedule = _get_event_schedule(season)

    completed = _completed_rounds(season)

    if not completed:
        return None

    last_round = max(completed)

    match = schedule[
        schedule["RoundNumber"] == last_round
    ]

    if match.empty:
        return None

    return str(
        match.iloc[0]["EventName"]
    )


def _disk_cache_path(
    season: int,
) -> str:
    return os.path.join(
        COMPUTED_DATA_DIR,
        f"driver_stats_{season}.json",
    )


def get_season_stats_cached(
    season: int,
) -> dict[str, dict]:
    path = _disk_cache_path(season)

    if not os.path.exists(path):
        return {}

    try:
        with open(path) as file:
            cached = json.load(file)

        if isinstance(cached, dict):
            return cached

    except (
        json.JSONDecodeError,
        OSError,
    ):
        pass

    return {}


def warm_season_stats(
    season: int,
) -> None:
    path = _disk_cache_path(season)

    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)

        if age < STATS_CACHE_TTL_SECONDS:
            try:
                with open(path) as file:
                    cached = json.load(file)

                if isinstance(cached, dict) and cached:
                    return

            except (
                json.JSONDecodeError,
                OSError,
            ):
                pass

    stats = _compute_season_stats(season)

    os.makedirs(
        COMPUTED_DATA_DIR,
        exist_ok=True,
    )

    temp_path = f"{path}.tmp"

    try:
        with open(temp_path, "w") as file:
            json.dump(
                stats,
                file,
                indent=2,
                allow_nan=False,
            )

            file.flush()
            os.fsync(file.fileno())

        os.replace(
            temp_path,
            path,
        )

    except Exception:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except OSError:
            pass

        raise


def _static_lookup(
    static_drivers: list,
) -> dict:
    lookup = {}

    for entry in static_drivers:
        if not isinstance(entry, dict):
            continue

        key = (
            entry.get("driverId")
            or entry.get("id")
        )

        if key:
            lookup[str(key).lower()] = entry

    return lookup


def _compute_age(
    born_str: str | None,
) -> int | None:
    if not born_str:
        return None

    try:
        born_date = datetime.datetime.strptime(
            born_str,
            "%Y-%m-%d",
        )

        today = datetime.datetime.now()

        age = (
            today.year -
            born_date.year
        )

        if (
            today.month,
            today.day,
        ) < (
            born_date.month,
            born_date.day,
        ):
            age -= 1

        return age

    except ValueError:
        return None


def build_driver_panel(
    season: int,
    static_drivers: list,
    round_: int | None = None,
) -> list[dict]:
    standings = fetch_driver_standings(
        season,
        round_,
    )

    season_stats = (
        get_season_stats_cached(season)
        or {}
    )

    racecraft_stats = (
        get_racecraft_cached(season)
        or {}
    )

    static_by_key = _static_lookup(
        static_drivers
    )

    upcoming_races = _upcoming_races(
        season,
        count=4,
    )

    current_event_name = _current_event_name(
        season
    )

    merged = []

    for entry in standings:
        driver = entry.get(
            "Driver",
            {},
        )

        constructors = entry.get(
            "Constructors",
            [],
        )

        driver_id = driver.get(
            "driverId",
            "",
        )

        code = driver.get(
            "code",
            "",
        )

        code = str(code).upper().strip()

        static_entry = static_by_key.get(
            str(driver_id).lower(),
            {},
        )

        extra = season_stats.get(
            code,
            {},
        )

        racecraft = racecraft_stats.get(
            code,
            {},
        )

        team_name = (
            constructors[0].get("name", "")
            if (
                constructors
                and isinstance(
                    constructors[0],
                    dict,
                )
            )
            else ""
        )

        team_name = (
            team_name
            or static_entry.get("team", "")
        )

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

        country = (
            static_entry.get("country")
            or static_entry.get("nationality")
            or driver.get("nationality")
            or ""
        )

        merged.append(
            {
                **static_entry,
                "driverId": (
                    driver_id
                    or static_entry.get(
                        "driverId",
                        "",
                    )
                ),
                "code": (
                    code
                    or static_entry.get(
                        "code",
                        "",
                    )
                ),
                "name": driver_name,
                "team": team_name,
                "color": team_color,
                "teamLogo": team_logo,
                "carName": car_name,
                "image": driver_image,
                "banner": banner_image,
                "country": country,
                "position": _safe_int(
                    entry.get("position")
                ),
                "points": _safe_number(
                    entry.get("points"),
                    0.0,
                ),
                "wins": _safe_int(
                    entry.get("wins"),
                    0,
                ),
                "podiums": _safe_int(
                    extra.get("podiums"),
                    0,
                ),
                "poles": _safe_int(
                    extra.get("poles"),
                    0,
                ),
                "fastest_laps": _safe_int(
                    extra.get("fastest_laps"),
                    0,
                ),
                "avg_finish": extra.get(
                    "avg_finish"
                ),
                "avg_pit_stop": racecraft.get(
                    "avg_pit_stop"
                ),
                "fastest_pit_stop": racecraft.get(
                    "best_pit_stop"
                ),
                "history": (
                    extra.get("history", [])
                    or []
                ),
                "next_races": (
                    upcoming_races
                    or []
                ),
                "current_event_name": (
                    current_event_name
                ),
                "age": _compute_age(
                    static_entry.get("born")
                ),
            }
        )

    merged.sort(
        key=lambda driver: (
            driver["position"] is None,
            driver["position"] or 999,
        )
    )

    return merged


def get_or_build_season_stats(
    season: int,
) -> dict[str, dict]:
    cached = get_season_stats_cached(season)

    if cached:
        return cached

    warm_season_stats(season)

    return get_season_stats_cached(season)


def _career_cache_path(
    code: str,
) -> str:
    return os.path.join(
        COMPUTED_DATA_DIR,
        f"career_{code}.json",
    )

def get_head_to_head_record(
    code_a: str,
    code_b: str,
    start_year: int,
    end_year: int,
) -> dict:
    code_a = str(code_a).upper()
    code_b = str(code_b).upper()

    quali_a_wins = quali_b_wins = 0
    race_a_wins = race_b_wins = 0
    shared_races = 0
    by_season: dict[int, dict] = {}

    incomplete_years = []

    for year in range(start_year, end_year + 1):
        try:
            season_stats = get_or_build_season_stats(year)
        except Exception:
            incomplete_years.append(year)
            continue

        entry_a = season_stats.get(code_a)
        entry_b = season_stats.get(code_b)

        if not entry_a or not entry_b:
            incomplete_years.append(year)
            continue

        rounds_a = {
            h.get("round"): h
            for h in entry_a.get("history", [])
            if h.get("round") is not None
        }
        rounds_b = {
            h.get("round"): h
            for h in entry_b.get("history", [])
            if h.get("round") is not None
        }

        season_race_a = season_race_b = 0
        season_quali_a = season_quali_b = 0
        season_shared = 0

        for round_no, h_a in rounds_a.items():
            h_b = rounds_b.get(round_no)
            if not h_b:
                continue

            season_shared += 1

            pos_a = h_a.get("position")
            pos_b = h_b.get("position")
            if pos_a is not None and pos_b is not None:
                if pos_a < pos_b:
                    race_a_wins += 1
                    season_race_a += 1
                elif pos_b < pos_a:
                    race_b_wins += 1
                    season_race_b += 1

            q_a = h_a.get("quali_position")
            q_b = h_b.get("quali_position")
            if q_a is not None and q_b is not None:
                if q_a < q_b:
                    quali_a_wins += 1
                    season_quali_a += 1
                elif q_b < q_a:
                    quali_b_wins += 1
                    season_quali_b += 1

        if season_shared:
            shared_races += season_shared
            by_season[year] = {
                "shared_races": season_shared,
                "race": {code_a: season_race_a, code_b: season_race_b},
                "qualifying": {code_a: season_quali_a, code_b: season_quali_b},
            }

    return {
        "shared_races": shared_races,
        "qualifying": {code_a: quali_a_wins, code_b: quali_b_wins},
        "race": {code_a: race_a_wins, code_b: race_b_wins},
        "by_season": by_season,
        "incomplete_years": incomplete_years,
    }

def get_career_stats(
    code: str,
    debut_year: int,
    current_season: int,
) -> dict:
    code = str(code).upper()

    path = _career_cache_path(code)

    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)

        if age < CAREER_CACHE_TTL_SECONDS:
            try:
                with open(path) as file:
                    return json.load(file)
            except (
                json.JSONDecodeError,
                OSError,
            ):
                pass

    totals = {
        "wins": 0,
        "podiums": 0,
        "poles": 0,
        "fastest_laps": 0,
        "starts": 0,
        "first_win_year": None,
        "first_pole_year": None,
    }

    debut_year = (
        debut_year
        or current_season
    )

    for year in range(
        debut_year,
        current_season + 1,
    ):
        season_stats = (
            get_or_build_season_stats(
                year
            )
        )

        entry = season_stats.get(code)

        if not entry:
            continue

        history = sorted(
            entry.get("history", []),
            key=lambda item: item.get(
                "round",
                0,
            ),
        )

        totals["starts"] += len(history)

        totals["podiums"] += _safe_int(
            entry.get("podiums"),
            0,
        )

        totals["poles"] += _safe_int(
            entry.get("poles"),
            0,
        )

        totals["fastest_laps"] += _safe_int(
            entry.get("fastest_laps"),
            0,
        )

        for history_entry in history:
            if history_entry.get(
                "position"
            ) == 1:
                totals["wins"] += 1

                if (
                    totals["first_win_year"]
                    is None
                ):
                    totals["first_win_year"] = (
                        year
                    )

            if (
                history_entry.get(
                    "quali_position"
                ) == 1
                and totals[
                    "first_pole_year"
                ] is None
            ):
                totals["first_pole_year"] = (
                    year
                )

    os.makedirs(
        COMPUTED_DATA_DIR,
        exist_ok=True,
    )
    with open(path, "w") as file:
        json.dump(
            totals,
            file,
            indent=2,
        )

    return totals


def _alltime_cache_path(driver_id: str) -> str:
    return os.path.join(
        COMPUTED_DATA_DIR,
        f"alltime_{driver_id}.json",
    )


def get_alltime_career_stats(driver_id: str) -> dict:
    driver_id = str(driver_id).lower()

    path = _alltime_cache_path(driver_id)

    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)

        if age < ALLTIME_CACHE_TTL_SECONDS:
            try:
                with open(path) as file:
                    return json.load(file)
            except (json.JSONDecodeError, OSError):
                pass

    def _fetch_all(resource: str, table_key: str, list_key: str) -> list[dict]:
        items: list[dict] = []
        offset = 0
        page_size = 100

        while True:
            url = f"{JOLPICA_BASE}/drivers/{driver_id}/{resource}/?limit={page_size}&offset={offset}"
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            payload = resp.json().get("MRData", {})

            page_items = payload.get(table_key, {}).get(list_key, [])
            items.extend(page_items)

            total = _safe_int(payload.get("total"), 0) or 0
            offset += page_size

            if offset >= total or not page_items:
                break

        return items

    races = _fetch_all("results", "RaceTable", "Races")

    wins = podiums = fastest_laps = 0
    first_win_year = None

    for race in races:
        result = (race.get("Results") or [{}])[0]
        pos = result.get("position")
        year = _safe_int(race.get("season"))

        if pos == "1":
            wins += 1
            if first_win_year is None and year is not None:
                first_win_year = year

        if pos in ("1", "2", "3"):
            podiums += 1

        if result.get("FastestLap", {}).get("rank") == "1":
            fastest_laps += 1

    starts = len(races)

    quali_races = _fetch_all("qualifying", "RaceTable", "Races")



    poles = 0
    first_pole_year = None

    for race in quali_races:
        q = (race.get("QualifyingResults") or [{}])[0]
        if q.get("position") == "1":
            poles += 1
            year = _safe_int(race.get("season"))
            if first_pole_year is None and year is not None:
                first_pole_year = year

    seasons_url = f"{JOLPICA_BASE}/drivers/{driver_id}/seasons/?limit=100"
    seasons_resp = requests.get(seasons_url, timeout=15)
    seasons_resp.raise_for_status()
    season_list = (
        seasons_resp.json()
        .get("MRData", {})
        .get("SeasonTable", {})
        .get("Seasons", [])
    )

    seasons = len(season_list)
    championships = 0

    for season_entry in season_list:
        year = season_entry.get("season")
        if not year:
            continue

        champ_url = f"{JOLPICA_BASE}/{year}/driverstandings/1/"
        try:
            champ_resp = requests.get(champ_url, timeout=10)
            champ_resp.raise_for_status()
            champ_lists = (
                champ_resp.json()
                .get("MRData", {})
                .get("StandingsTable", {})
                .get("StandingsLists", [])
            )
            if not champ_lists:
                continue
            champ_standing = (champ_lists[0].get("DriverStandings") or [{}])[0]
            champ_id = champ_standing.get("Driver", {}).get("driverId")
            if champ_id == driver_id:
                championships += 1
        except requests.RequestException:
            continue

    data = {
        "wins": wins,
        "podiums": podiums,
        "poles": poles,
        "fastest_laps": fastest_laps,
        "starts": starts,
        "championships": championships,
        "seasons": seasons,
        "first_win_year": first_win_year,
        "first_pole_year": first_pole_year,
    }

    os.makedirs(COMPUTED_DATA_DIR, exist_ok=True)

    with open(path, "w") as file:
        json.dump(data, file, indent=2)

    return data


def get_season_journey(
    code: str,
    current_season: int,
    years_back: int = 3,
    start_year: int | None = None,
) -> list[dict]:
    code = str(code).upper()

    journey = []

    start_year = (
        start_year
        if start_year is not None
        else current_season - years_back + 1
    )

    for year in range(
        start_year,
        current_season + 1,
    ):
        season_stats = (
            get_or_build_season_stats(
                year
            )
        )

        entry = season_stats.get(code)

        if not entry:
            journey.append(
                {
                    "year": year,
                    "points": 0,
                    "wins": 0,
                    "avg_finish": None,
                }
            )

            continue

        history = entry.get(
            "history",
            [],
        )

        points = (
            history[-1].get(
                "cumulative_points",
                0,
            )
            if history
            else 0
        )

        wins = sum(
            1
            for history_entry in history
            if history_entry.get(
                "position"
            ) == 1
        )

        journey.append(
            {
                "year": year,
                "points": points,
                "wins": wins,
                "avg_finish": entry.get(
                    "avg_finish"
                ),
            }
        )

    return journey


def get_circuit_dna(
    code: str,
    current_season: int,
    years_back: int = 3,
) -> dict:
    code = str(code).upper()

    by_circuit: dict[
        str,
        list[int],
    ] = {}

    start_year = (
        current_season -
        years_back +
        1
    )

    for year in range(
        start_year,
        current_season + 1,
    ):
        season_stats = (
            get_or_build_season_stats(
                year
            )
        )

        entry = season_stats.get(code)

        if not entry:
            continue

        for history_entry in entry.get(
            "history",
            [],
        ):
            position = history_entry.get(
                "position"
            )

            event_name = history_entry.get(
                "event_name"
            )

            if (
                position is None
                or not event_name
            ):
                continue

            by_circuit.setdefault(
                event_name,
                [],
            ).append(position)

    ratings = []

    for circuit, positions in by_circuit.items():
        avg_position = (
            sum(positions)
            / len(positions)
        )

        score = max(
            0,
            min(
                100,
                round(
                    100
                    - (
                        avg_position - 1
                    )
                    * (
                        100 / 19
                    )
                ),
            ),
        )

        ratings.append(
            {
                "circuit": circuit,
                "score": score,
                "races": len(positions),
            }
        )

    ratings.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return {
        "best": (
            ratings[0]
            if ratings
            else None
        ),
        "weakest": (
            ratings[-1]
            if ratings
            else None
        ),
        "ratings": ratings,
    }


def _compute_racecraft_for_round(
    season: int,
    round_: int,
) -> dict[str, dict]:
    session = fastf1.get_session(
        season,
        round_,
        "R",
    )

    session.load(
        laps=True,
        telemetry=False,
        weather=False,
        messages=False,
    )

    laps = session.laps

    if laps is None or laps.empty:
        return {}

    result: dict[str, dict] = {}

    for code, driver_laps in laps.groupby(
        "Driver"
    ):
        driver_laps = driver_laps.sort_values(
            "LapNumber"
        )

        positions = (
            driver_laps["Position"]
            .dropna()
            .tolist()
        )

        overtakes = 0
        lost = 0

        for previous, current in zip(
            positions,
            positions[1:],
        ):
            if current < previous:
                overtakes += 1
            elif current > previous:
                lost += 1

        pit_laps = driver_laps[
            driver_laps["PitInTime"].notna()
        ]

        pit_durations = []

        for _, lap in pit_laps.iterrows():
            pit_in = lap.get(
                "PitInTime"
            )

            next_lap = driver_laps[
                driver_laps["LapNumber"]
                == lap["LapNumber"] + 1
            ]

            if next_lap.empty:
                continue

            pit_out = next_lap.iloc[0].get(
                "PitOutTime"
            )

            if (
                pit_in is None
                or pit_out is None
            ):
                continue

            try:
                duration = (
                    pit_out - pit_in
                ).total_seconds()

                if 0 < duration < 60:
                    pit_durations.append(
                        duration
                    )
            except Exception:
                pass

        grid = (
            positions[0]
            if positions
            else None
        )

        finish = (
            positions[-1]
            if positions
            else None
        )

        gained = (
            grid - finish
            if (
                grid is not None
                and finish is not None
            )
            else 0
        )

        result[str(code).upper()] = {
            "overtakes": overtakes,
            "positions_lost": lost,
            "positions_gained": gained,
            "pit_stops": len(pit_laps),
            "pit_durations": pit_durations,
        }

    return result


def _racecraft_cache_path(
    season: int,
) -> str:
    return os.path.join(
        COMPUTED_DATA_DIR,
        f"racecraft_{season}.json",
    )


def get_racecraft_cached(
    season: int,
) -> dict:
    path = _racecraft_cache_path(
        season
    )

    if not os.path.exists(path):
        return {}

    try:
        with open(path) as file:
            data = json.load(file)

        return data if isinstance(
            data,
            dict,
        ) else {}

    except (
        json.JSONDecodeError,
        OSError,
    ):
        return {}


def warm_racecraft_stats(
    season: int,
) -> None:
    path = _racecraft_cache_path(
        season
    )

    if os.path.exists(path):
        age = time.time() - os.path.getmtime(
            path
        )

        if age < STATS_CACHE_TTL_SECONDS:
            return

    aggregate: dict[str, dict] = {}

    for round_ in sorted(
        _completed_rounds(season)
    ):
        try:
            round_data = (
                _compute_racecraft_for_round(
                    season,
                    round_,
                )
            )

        except Exception as exc:
            print(
                f"[driver_panel] racecraft "
                f"skip round {round_} "
                f"({season}): {exc}"
            )

            continue

        for code, stats in round_data.items():
            entry = aggregate.setdefault(
                code,
                {
                    "overtakes": 0,
                    "positions_lost": 0,
                    "positions_gained": 0,
                    "pit_stops": 0,
                    "pit_durations": [],
                },
            )

            entry["overtakes"] += _safe_int(
                stats.get("overtakes"),
                0,
            )

            entry["positions_lost"] += _safe_int(
                stats.get("positions_lost"),
                0,
            )

            entry["positions_gained"] += _safe_int(
                stats.get("positions_gained"),
                0,
            )

            entry["pit_stops"] += _safe_int(
                stats.get("pit_stops"),
                0,
            )

            entry["pit_durations"].extend(
                stats.get(
                    "pit_durations",
                    [],
                )
            )

    for code, entry in aggregate.items():
        durations = entry.pop(
            "pit_durations",
            [],
        )

        entry["avg_pit_stop"] = (
            round(
                sum(durations)
                / len(durations),
                2,
            )
            if durations
            else None
        )

        entry["best_pit_stop"] = (
            round(
                min(durations),
                2,
            )
            if durations
            else None
        )

    os.makedirs(
        COMPUTED_DATA_DIR,
        exist_ok=True,
    )

    temp_path = f"{path}.tmp"

    with open(temp_path, "w") as file:
        json.dump(
            aggregate,
            file,
            indent=2,
        )

    os.replace(
        temp_path,
        path,
    )


def get_racecraft_stats(
    season: int,
) -> dict:
    return get_racecraft_cached(
        season
    )


def get_performance_index(
    season_entry: dict,
    racecraft_entry: dict,
) -> dict:
    history = season_entry.get(
        "history",
        [],
    )

    finishes = [
        entry["position"]
        for entry in history
        if entry.get("position") is not None
    ]

    qualis = [
        entry["quali_position"]
        for entry in history
        if entry.get("quali_position") is not None
    ]

    def _normalize_position(
        position: float,
    ) -> int:
        return max(
            0,
            min(
                100,
                round(
                    100
                    - (
                        position - 1
                    )
                    * (
                        100 / 19
                    )
                ),
            ),
        )

    race_pace = (
        _normalize_position(
            sum(finishes)
            / len(finishes)
        )
        if finishes
        else 0
    )

    qualifying = (
        _normalize_position(
            sum(qualis)
            / len(qualis)
        )
        if qualis
        else 0
    )

    if len(finishes) > 1:
        mean = (
            sum(finishes)
            / len(finishes)
        )

        variance = (
            sum(
                (finish - mean) ** 2
                for finish in finishes
            )
            / len(finishes)
        )

        consistency = max(
            0,
            min(
                100,
                round(
                    100
                    - (
                        variance ** 0.5
                    )
                    * 10
                ),
            ),
        )
    else:
        consistency = 0

    races_run = len(history) or 1

    overtakes = _safe_number(
        racecraft_entry.get(
            "overtakes",
            0,
        ),
        0,
    )

    positions_gained = _safe_number(
        racecraft_entry.get(
            "positions_gained",
            0,
        ),
        0,
    )

    racecraft_score = max(
        0,
        min(
            100,
            round(
                (
                    overtakes
                    / races_run
                )
                * 20
            ),
        ),
    )

    overtaking_score = max(
        0,
        min(
            100,
            round(
                50
                + (
                    positions_gained
                    / races_run
                )
                * 10
            ),
        ),
    )

    tyre_mgmt = None

    sub_scores = {
        "race_pace": race_pace,
        "qualifying": qualifying,
        "consistency": consistency,
        "racecraft": racecraft_score,
        "overtaking": overtaking_score,
        "tyre_mgmt": tyre_mgmt,
    }

    numeric = [
        value
        for value in sub_scores.values()
        if value is not None
    ]

    overall = (
        round(
            sum(numeric)
            / len(numeric)
        )
        if numeric
        else 0
    )

    return {
        "overall": overall,
        **sub_scores,
    }


def get_teammate_battle(
    code: str,
    driver_panel_data: list[dict],
) -> dict | None:
    code = str(code).upper()

    me = next(
        (
            driver
            for driver in driver_panel_data
            if str(
                driver.get("code", "")
            ).upper()
            == code
        ),
        None,
    )

    if not me:
        return None

    teammate = next(
        (
            driver
            for driver in driver_panel_data
            if driver.get("team")
            == me.get("team")
            and str(
                driver.get("code", "")
            ).upper()
            != code
        ),
        None,
    )

    if not teammate:
        return None

    def build_driver(
        driver: dict,
    ) -> dict:
        avg_finish = driver.get(
            "avg_finish"
        )

        try:
            avg_finish = (
                float(avg_finish)
                if avg_finish is not None
                else None
            )
        except (
            TypeError,
            ValueError,
        ):
            avg_finish = None

        return {
            "code": driver.get(
                "code"
            ),
            "name": driver.get(
                "name"
            ),
            "team": driver.get(
                "team"
            ),
            "country": driver.get(
                "country"
            ),
            "position": _safe_int(
                driver.get("position")
            ),
            "points": _safe_number(
                driver.get("points")
            ),
            "wins": _safe_int(
                driver.get("wins"),
                0,
            ),
            "podiums": _safe_int(
                driver.get("podiums"),
                0,
            ),
            "poles": _safe_int(
                driver.get("poles"),
                0,
            ),
            "fastest_laps": _safe_int(
                driver.get("fastest_laps"),
                0,
            ),
            "avg_finish": avg_finish,
        }

    me_data = build_driver(me)
    teammate_data = build_driver(
        teammate
    )

    leader = (
        me_data["code"]
        if me_data["points"]
        >= teammate_data["points"]
        else teammate_data["code"]
    )

    return {
        "driver": me_data,
        "teammate": teammate_data,
        "leader": leader,
    }


def build_driver_full(
    code: str,
    season: int,
    static_drivers: list,
) -> dict:
    code = str(code).upper()

    panel = build_driver_panel(
        season,
        static_drivers,
    )

    me = next(
        (
            driver
            for driver in panel
            if str(
                driver.get("code", "")
            ).upper()
            == code
        ),
        None,
    )

    if not me:
        return {}

    debut_raw = str(
        me.get(
            "debut",
            "",
        )
    )

    debut_year = (
        int(debut_raw)
        if debut_raw.isdigit()
        else season
    )

    season_stats = (
        get_or_build_season_stats(
            season
        )
    )

    entry = season_stats.get(
        code,
        {},
    )

    racecraft_entry = (
        get_racecraft_stats(
            season
        ).get(
            code,
            {},
        )
    )

    return {
        **me,
        "career": get_career_stats(
            code,
            debut_year,
            season,
        ),
        "season_journey": get_season_journey(
            code,
            season,
            start_year=debut_year,
        ),
        "circuit_dna": get_circuit_dna(
            code,
            season,
            years_back=3,
        ),
        "racecraft": racecraft_entry,
        "performance_index": get_performance_index(
            entry,
            racecraft_entry,
        ),
                "teammate_battle": get_teammate_battle(
            code,
            panel,
        ),
        "career_alltime": get_alltime_career_stats(
            me.get("driverId", "")
        ),
    }
        