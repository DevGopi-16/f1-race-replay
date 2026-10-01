import argparse
import json
import shutil
import time
from pathlib import Path

import requests

JOLPICA = "https://api.jolpi.ca/ergast/f1"
HEADERS = {"User-Agent": "f1-race-replay-web/1.0 (student project; personal use)"}

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "drivers"
MANIFEST = OUT / "manifest.json"


def season_codes(year: int) -> dict[str, tuple[str, str]]:
    r = requests.get(
        f"{JOLPICA}/{year}/drivers.json",
        params={"limit": 100},
        headers=HEADERS,
        timeout=20,
    )
    r.raise_for_status()
    drivers = r.json()["MRData"]["DriverTable"]["Drivers"]
    return {
        d["code"]: (d["driverId"], f"{d['givenName']} {d['familyName']}")
        for d in drivers
        if d.get("code")
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--src",
        default="/tmp/f1-headshots/out/headshots",
        help="the out/headshots folder created by the f1-headshots tool",
    )
    args = parser.parse_args()

    src = Path(args.src)
    if not src.exists():
        raise SystemExit(f"Not found: {src}\nRun `bun run start` in the f1-headshots repo first.")

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

    year_dirs = sorted(
        (p for p in src.iterdir() if p.is_dir() and p.name.isdigit()),
        key=lambda p: int(p.name),
        reverse=True,
    )

    latest_done: set[str] = set()
    unmatched: list[str] = []
    copied = 0

    for year_dir in year_dirs:
        year = int(year_dir.name)
        try:
            codes = season_codes(year)
        except Exception as e:
            print(f"{year}: couldn't load drivers from Jolpica ({e})")
            continue
        time.sleep(1)

        print(f"{year}: {len(list(year_dir.glob('*.png')))} images")

        for png in sorted(year_dir.glob("*.png")):
            info = codes.get(png.stem)
            if not info:
                unmatched.append(f"{year}/{png.stem}")
                continue

            driver_id, name = info

            shutil.copyfile(png, OUT / f"{driver_id}-{year}.png")
            copied += 1

            if driver_id not in latest_done:
                shutil.copyfile(png, OUT / f"{driver_id}.png")
                for old in OUT.glob(f"{driver_id}.*"):
                    if old.suffix.lower() in {".jpg", ".jpeg", ".webp"}:
                        old.unlink()
                manifest[driver_id] = {
                    "file": f"{driver_id}.png",
                    "name": name,
                    "source": "formula1.com (via f1-headshots)",
                    "season": year,
                }
                latest_done.add(driver_id)

    MANIFEST.write_text(json.dumps(manifest, indent=2))

    print(f"\nDrivers with a latest headshot: {len(latest_done)}")
    print(f"Per-season files copied: {copied}")
    if unmatched:
        print(f"No Jolpica match for {len(unmatched)} images: {unmatched[:20]}")


if __name__ == "__main__":
    main()