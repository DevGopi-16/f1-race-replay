"""Settings shim: exposes the interface f1_data.py expects
(settings.cache_location), backed by the real app config in
src/config/settings.py instead of a hardcoded/disconnected path.
"""

from dataclasses import dataclass

from src.config.settings import FASTF1_CACHE_DIR


@dataclass
class Settings:
    cache_location: str = FASTF1_CACHE_DIR


def get_settings() -> Settings:
    return Settings()