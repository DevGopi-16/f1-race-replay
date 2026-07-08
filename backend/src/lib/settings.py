"""STUB — I don't have your original src/lib/settings.py, so this is a
minimal implementation matching the interface f1_data.py actually uses
(settings.cache_location). Replace this file with your real one if it has
more configuration than just the cache path.
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    cache_location: str = os.path.join(os.getcwd(), ".fastf1-cache")


def get_settings() -> Settings:
    return Settings()
