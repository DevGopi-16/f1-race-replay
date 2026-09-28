import sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.domain.driver_panel import warm_season_stats

for year in range(2007, 2027):
    try:
        print(f"warming {year}...")
        warm_season_stats(year)
        print("  done")
    except Exception as e:
        print(f"  failed: {e}")
    time.sleep(8)