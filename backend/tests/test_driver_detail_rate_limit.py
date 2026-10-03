import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastf1.exceptions import RateLimitExceededError

from src.api import driver_detail, schedule as schedule_api
from src.domain import driver_panel


class DriverDetailRateLimitTests(unittest.TestCase):
    year = 2026
    weekend = {
        "round_number": 1,
        "event_name": "Test Grand Prix",
        "date": "2099-03-01",
        "country": "Test Country",
        "type": "conventional",
    }
    standings = [
        {
            "Driver": {
                "driverId": "antonelli",
                "code": "ANT",
                "givenName": "Andrea Kimi",
                "familyName": "Antonelli",
            },
            "Constructors": [{"name": "Test Team"}],
            "position": "1",
            "points": "25",
            "wins": "1",
        }
    ]

    def test_fresh_schedule_cache_skips_fastf1(self):
        with (
            patch.dict(
                schedule_api._memory,
                {self.year: (time.time(), [self.weekend])},
                clear=True,
            ),
            patch.object(
                schedule_api,
                "get_race_weekends_by_year",
                side_effect=RateLimitExceededError("rate limited"),
            ) as fetch_schedule,
        ):
            result = schedule_api.get_schedule_data(self.year)

        self.assertEqual(result, [self.weekend])
        fetch_schedule.assert_not_called()

    def test_stale_disk_and_memory_caches_are_used_on_rate_limit(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_dir = Path(temp_dir)
            cache_file = cache_dir / f"{self.year}.json"
            original_bytes = json.dumps([self.weekend]).encode()
            cache_file.write_bytes(original_bytes)
            stale_time = time.time() - schedule_api.CURRENT_YEAR_TTL - 60
            os.utime(cache_file, (stale_time, stale_time))

            with (
                patch.object(schedule_api, "CACHE_DIR", cache_dir),
                patch.dict(schedule_api._memory, {}, clear=True),
                patch.object(
                    schedule_api,
                    "get_race_weekends_by_year",
                    side_effect=RateLimitExceededError("rate limited"),
                ) as fetch_schedule,
            ):
                disk_result = schedule_api.get_schedule_data(self.year)

            self.assertEqual(disk_result, [self.weekend])
            self.assertEqual(cache_file.read_bytes(), original_bytes)
            fetch_schedule.assert_called_once_with(self.year)

        stale_saved_at = time.time() - schedule_api.CURRENT_YEAR_TTL - 60
        with (
            patch.dict(
                schedule_api._memory,
                {self.year: (stale_saved_at, [self.weekend])},
                clear=True,
            ),
            patch.object(
                schedule_api,
                "get_race_weekends_by_year",
                side_effect=RateLimitExceededError("rate limited"),
            ) as fetch_schedule,
        ):
            memory_result = schedule_api.get_schedule_data(self.year)

        self.assertEqual(memory_result, [self.weekend])
        fetch_schedule.assert_called_once_with(self.year)

    def test_no_schedule_cache_and_rate_limit_returns_429(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with (
                patch.object(schedule_api, "CACHE_DIR", Path(temp_dir)),
                patch.dict(schedule_api._memory, {}, clear=True),
                patch.object(
                    schedule_api,
                    "get_race_weekends_by_year",
                    side_effect=RateLimitExceededError("rate limited"),
                ),
                patch.object(
                    driver_panel,
                    "fetch_driver_standings",
                    return_value=self.standings,
                ),
            ):
                with self.assertRaises(HTTPException) as raised:
                    driver_detail.driver_full("ANT", self.year)

        self.assertEqual(raised.exception.status_code, 429)
        self.assertIn("FastF1 rate limit", raised.exception.detail)

    def test_normal_cache_miss_fetches_and_caches_schedule(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_dir = Path(temp_dir)
            with (
                patch.object(schedule_api, "CACHE_DIR", cache_dir),
                patch.dict(schedule_api._memory, {}, clear=True),
                patch.object(
                    schedule_api,
                    "get_race_weekends_by_year",
                    return_value=[self.weekend],
                ) as fetch_schedule,
            ):
                result = schedule_api.get_schedule_data(self.year)
                cached_result = schedule_api.get_schedule_data(self.year)

            self.assertEqual(result, [self.weekend])
            self.assertEqual(cached_result, [self.weekend])
            fetch_schedule.assert_called_once_with(self.year)
            self.assertEqual(
                json.loads((cache_dir / f"{self.year}.json").read_text()),
                [self.weekend],
            )

    def test_successful_driver_detail_response_shape_is_unchanged(self):
        panel_entry = {
            "code": "ANT",
            "driverId": "antonelli",
            "debut": "2025",
            "name": "Andrea Kimi Antonelli",
            "team": "Test Team",
        }
        expected_extra_fields = {
            "career",
            "season_journey",
            "circuit_dna",
            "racecraft",
            "performance_index",
            "teammate_battle",
            "career_alltime",
        }
        with (
            patch.object(
                driver_panel,
                "build_driver_panel",
                return_value=[panel_entry],
            ),
            patch.object(
                driver_panel,
                "get_or_build_season_stats",
                return_value={"ANT": {"history": []}},
            ),
            patch.object(driver_panel, "get_racecraft_stats", return_value={}),
            patch.object(driver_panel, "get_career_stats", return_value={}),
            patch.object(driver_panel, "get_season_journey", return_value=[]),
            patch.object(driver_panel, "get_circuit_dna", return_value={}),
            patch.object(driver_panel, "get_performance_index", return_value={}),
            patch.object(driver_panel, "get_teammate_battle", return_value=None),
            patch.object(driver_panel, "get_alltime_career_stats", return_value={}),
        ):
            response = driver_panel.build_driver_full(
                "ANT",
                self.year,
                [],
            )

        self.assertEqual(response["code"], "ANT")
        self.assertTrue(expected_extra_fields.issubset(response))
        self.assertEqual(response["career"], {})
        self.assertEqual(response["season_journey"], [])


if __name__ == "__main__":
    unittest.main()
