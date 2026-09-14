"""
App-wide configuration: environment variables, constants, feature flags.
"""
import os

FASTF1_CACHE_DIR = os.getenv("FASTF1_CACHE_DIR", "backend/.fastf1-cache")
DATA_DIR = os.getenv("DATA_DIR", "backend/data")
FIREBASE_CREDENTIALS_PATH = os.getenv(
    "FIREBASE_CREDENTIALS_PATH", "backend/firebase-service-account.json"
)
