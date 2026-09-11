from typing import Optional

from src.driver_panel import (
    build_driver_panel,
    get_season_stats_cached,
    get_racecraft_stats,
    get_performance_index,
    get_teammate_battle,
)


def _safe_number(value, default=0.0):
    try:
        if value is None:
            return default
        number = float(value)
        if number != number:
            return default
        return number
    except (TypeError, ValueError, OverflowError):
        return default


def _safe_int(value, default=0):
    try:
        if value is None:
            return default

        number = float(value)

        if number != number:
            return default

        return int(number)

    except (TypeError, ValueError, OverflowError):
        return default

def _safe_position(value):
    try:
        if value is None:
            return None
        number = float(value)
        if number != number or number <= 0:
            return None
        return int(number)
    except (TypeError, ValueError, OverflowError):
        return None


def _history_entry(entry: dict) -> dict:
    return {
        "round": _safe_int(entry.get("round"), 0),
        "event_name": entry.get("event_name") or "",
        "position": _safe_position(entry.get("position")),
        "points": _safe_number(entry.get("points"), 0.0),
        "cumulative_points": _safe_number(
            entry.get("cumulative_points"),
            0.0,
        ),
        "quali_position": _safe_position(
            entry.get("quali_position")
        ),
    }


def _driver_summary(driver: dict) -> dict:
    return {
        "code": driver.get("code") or "",
        "name": driver.get("name") or driver.get("code") or "",
        "team": driver.get("team"),
        "country": driver.get("country"),
        "position": _safe_position(driver.get("position")),
        "points": _safe_number(driver.get("points"), 0.0),
        "wins": _safe_int(driver.get("wins"), 0),
        "podiums": _safe_int(driver.get("podiums"), 0),
        "poles": _safe_int(driver.get("poles"), 0),
    }


def _racecraft_summary(racecraft: dict) -> dict:
    return {
        "overtakes": _safe_int(
            racecraft.get("overtakes"),
            0,
        ),
        "positions_gained": _safe_int(
            racecraft.get("positions_gained"),
            0,
        ),
        "positions_lost": _safe_int(
            racecraft.get("positions_lost"),
            0,
        ),
        "pit_stops": _safe_int(
            racecraft.get("pit_stops"),
            0,
        ),
    }


def _performance_summary(
    season_entry: dict,
    racecraft_entry: dict,
) -> dict:
    performance = get_performance_index(
        season_entry,
        racecraft_entry,
    )

    return {
        "overall": _safe_number(
            performance.get("overall"),
            0.0,
        ),
        "score": (
            _safe_number(performance.get("score"))
            if performance.get("score") is not None
            else None
        ),
        "performance_index": (
            _safe_number(performance.get("performance_index"))
            if performance.get("performance_index") is not None
            else None
        ),
        "index": (
            _safe_number(performance.get("index"))
            if performance.get("index") is not None
            else None
        ),
        "rating": (
            _safe_number(performance.get("rating"))
            if performance.get("rating") is not None
            else None
        ),
        "race_pace": (
            _safe_number(performance.get("race_pace"))
            if performance.get("race_pace") is not None
            else None
        ),
        "qualifying": (
            _safe_number(performance.get("qualifying"))
            if performance.get("qualifying") is not None
            else None
        ),
        "consistency": (
            _safe_number(performance.get("consistency"))
            if performance.get("consistency") is not None
            else None
        ),
        "racecraft": (
            _safe_number(performance.get("racecraft"))
            if performance.get("racecraft") is not None
            else None
        ),
        "overtaking": (
            _safe_number(performance.get("overtaking"))
            if performance.get("overtaking") is not None
            else None
        ),
        "tyre_mgmt": (
            _safe_number(performance.get("tyre_mgmt"))
            if performance.get("tyre_mgmt") is not None
            else None
        ),
    }


def build_analytics(
    season: int,
    static_drivers: list,
    round_: Optional[int] = None,
) -> dict:
    driver_panel = build_driver_panel(
        season,
        static_drivers,
        round_=round_,
    )

    season_stats = get_season_stats_cached(season) or {}
    racecraft_stats = get_racecraft_stats(season) or {}

    standings = [
        _driver_summary(driver)
        for driver in driver_panel
        if driver.get("code")
    ]

    standings.sort(
        key=lambda driver: (
            driver["position"] is None,
            driver["position"] if driver["position"] is not None else 999,
        )
    )

    drivers = []

    for driver in driver_panel:
        code = driver.get("code")

        if not code:
            continue

        season_entry = season_stats.get(code, {}) or {}
        racecraft_entry = racecraft_stats.get(code, {}) or {}

        history = [
            _history_entry(item)
            for item in season_entry.get("history", [])
            if isinstance(item, dict)
        ]

        history.sort(
            key=lambda item: item["round"]
        )

        championship = {
            "position": _safe_position(
                driver.get("position")
            ),
            "points": _safe_number(
                driver.get("points"),
                0.0,
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
        }

        drivers.append(
            {
                "code": code,
                "name": (
                    driver.get("name")
                    or code
                ),
                "team": driver.get("team"),
                "country": driver.get("country"),
                "championship": championship,
                "performance": _performance_summary(
                    season_entry,
                    racecraft_entry,
                ),
                "racecraft": _racecraft_summary(
                    racecraft_entry
                ),
                "history": history,
            }
        )

    teammate_battles = []
    seen_pairs = set()

    for driver in driver_panel:
        code = driver.get("code")

        if not code:
            continue

        battle = get_teammate_battle(
            code,
            driver_panel,
        )

        if not battle:
            continue

        driver_data = battle.get("driver") or {}
        teammate_data = battle.get("teammate") or {}

        driver_code = driver_data.get("code")
        teammate_code = teammate_data.get("code")

        if not driver_code or not teammate_code:
            continue

        pair = tuple(
            sorted(
                (
                    str(driver_code),
                    str(teammate_code),
                )
            )
        )

        if pair in seen_pairs:
            continue

        seen_pairs.add(pair)

        battle["driver"] = {
            "code": driver_code,
            "name": driver_data.get("name") or driver_code,
            "team": driver_data.get("team"),
            "country": driver_data.get("country"),
            "position": _safe_position(
                driver_data.get("position")
            ),
            "points": _safe_number(
                driver_data.get("points"),
                0.0,
            ),
            "wins": _safe_int(
                driver_data.get("wins"),
                0,
            ),
            "podiums": _safe_int(
                driver_data.get("podiums"),
                0,
            ),
            "poles": _safe_int(
                driver_data.get("poles"),
                0,
            ),
            "fastest_laps": _safe_int(
                driver_data.get("fastest_laps"),
                0,
            ),
            "avg_finish": (
                _safe_number(
                    driver_data.get("avg_finish")
                )
                if driver_data.get("avg_finish") is not None
                else None
            ),
        }

        battle["teammate"] = {
            "code": teammate_code,
            "name": (
                teammate_data.get("name")
                or teammate_code
            ),
            "team": teammate_data.get("team"),
            "country": teammate_data.get("country"),
            "position": _safe_position(
                teammate_data.get("position")
            ),
            "points": _safe_number(
                teammate_data.get("points"),
                0.0,
            ),
            "wins": _safe_int(
                teammate_data.get("wins"),
                0,
            ),
            "podiums": _safe_int(
                teammate_data.get("podiums"),
                0,
            ),
            "poles": _safe_int(
                teammate_data.get("poles"),
                0,
            ),
            "fastest_laps": _safe_int(
                teammate_data.get("fastest_laps"),
                0,
            ),
            "avg_finish": (
                _safe_number(
                    teammate_data.get("avg_finish")
                )
                if teammate_data.get("avg_finish") is not None
                else None
            ),
        }

        battle["leader"] = (
            battle.get("leader")
            or driver_code
        )

        teammate_battles.append(battle)

    total_points = sum(
        _safe_number(
            driver.get("points"),
            0.0,
        )
        for driver in standings
    )

    total_wins = sum(
        _safe_int(
            driver.get("wins"),
            0,
        )
        for driver in standings
    )

    total_podiums = sum(
        _safe_int(
            driver.get("podiums"),
            0,
        )
        for driver in standings
    )

    total_poles = sum(
        _safe_int(
            driver.get("poles"),
            0,
        )
        for driver in standings
    )

    resolved_round = round_

    if resolved_round is None:
        completed_rounds = []

        for driver in drivers:
            for history_entry in driver.get("history", []):
                history_round = history_entry.get("round")

                if history_round:
                    completed_rounds.append(
                        history_round
                    )

        if completed_rounds:
            resolved_round = max(
                completed_rounds
            )

    return {
        "meta": {
            "season": season,
            "round": resolved_round,
        },
        "overview": {
            "drivers": len(standings),
            "total_points": round(
                total_points,
                3,
            ),
            "total_wins": total_wins,
            "total_podiums": total_podiums,
            "total_poles": total_poles,
        },
        "standings": standings,
        "drivers": drivers,
        "teammate_battles": teammate_battles,
    }