"""STUB — I don't have your original src/lib/tyres.py, so I don't know
your exact compound-name -> int mapping. This is a reasonable guess.
IMPORTANT: if your real mapping differs, tyre colors/icons in both the
desktop app's cache files and this web version's leaderboard will be
wrong relative to each other — replace this with your real file before
relying on tyre data, and re-run with --refresh-data to rebuild caches
that were computed with this stub's mapping.
"""

TYRE_COMPOUND_TO_INT = {
    "SOFT": 1,
    "MEDIUM": 2,
    "HARD": 3,
    "INTERMEDIATE": 4,
    "WET": 5,
    "UNKNOWN": 0,
}

INT_TO_TYRE_COMPOUND = {v: k for k, v in TYRE_COMPOUND_TO_INT.items()}


def get_tyre_compound_int(compound) -> int:
    if compound is None:
        return TYRE_COMPOUND_TO_INT["UNKNOWN"]
    return TYRE_COMPOUND_TO_INT.get(str(compound).upper(), TYRE_COMPOUND_TO_INT["UNKNOWN"])
