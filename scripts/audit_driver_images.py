import argparse
import html
import json
import shutil
from pathlib import Path

from download_driver_images import MANIFEST, OUT, all_drivers

ROOT = Path(__file__).resolve().parents[1]
REJECTED = OUT / "rejected"
EXTS = (".png", ".jpg")
TRUSTED_SOURCES = ("formula1.com", "manual")


def find_image(driver_id: str, folder: Path = OUT) -> Path | None:
    for ext in EXTS:
        p = folder / f"{driver_id}{ext}"
        if p.exists():
            return p
    return None


def is_trusted(entry: dict) -> bool:
    return str(entry.get("source", "")).startswith(TRUSTED_SOURCES) or "suit_verified" in entry


def write_sheet(names: dict[str, str], manifest: dict, scores: dict[str, float]) -> Path:
    cards = []
    for driver_id, name in names.items():
        path, status = find_image(driver_id), "ok"
        if path is None:
            path, status = find_image(driver_id, REJECTED), "rejected"
        if path is None:
            continue
        entry = manifest.get(driver_id, {})
        src = str(entry.get("source", "unknown"))
        score = scores.get(driver_id, entry.get("suit_verified"))
        score_txt = f"{score:.2f}" if isinstance(score, (int, float)) else "-"
        rel = "../" + path.relative_to(ROOT).as_posix()
        cards.append(
            f'<div class="c {status}"><img src="{html.escape(rel)}" loading="lazy">'
            f"<b>{html.escape(name)}</b><small>{html.escape(driver_id)}</small>"
            f"<small>{status} | score {score_txt}</small>"
            f"<small>{html.escape(src[:40])}</small></div>"
        )
    page = (
        "<!doctype html><meta charset=utf-8><title>Driver image review</title>"
        "<style>body{background:#111;color:#eee;font:13px sans-serif;margin:16px}"
        ".g{display:grid;grid-template-columns:repeat(auto-fill,150px);gap:10px}"
        ".c{border:2px solid #2a6;padding:6px;border-radius:6px;background:#1b1b1b}"
        ".c.rejected{border-color:#c33}.c img{width:100%;aspect-ratio:1;object-fit:cover}"
        ".c b,.c small{display:block;margin-top:2px}.c small{color:#999}</style>"
        f'<h2>{len(cards)} images (green = kept, red = rejected)</h2><div class="g">'
        + "".join(cards)
        + "</div>"
    )
    out = Path(__file__).parent / "review.html"
    out.write_text(page, encoding="utf-8")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true", help="run the race-suit check")
    ap.add_argument("--threshold", type=float, default=0.6, help="min suit score to keep (0-1)")
    ap.add_argument("--sheet", action="store_true", help="write scripts/review.html")
    ap.add_argument("--trust", nargs="*", default=[], help="driverIds to mark as manually OK")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

    for driver_id in args.trust:
        path = find_image(driver_id)
        if path is None:
            print(f"--trust: no image for {driver_id} in {OUT}")
            continue
        manifest[driver_id] = {**manifest.get(driver_id, {}), "file": path.name, "source": "manual"}
        print(f"trusted: {driver_id}")

    drivers = all_drivers()
    names = {d["driverId"]: f"{d.get('givenName', '')} {d.get('familyName', '')}".strip() for d in drivers}
    scores: dict[str, float] = {}

    if args.verify:
        from suit_check import suit_score

        REJECTED.mkdir(parents=True, exist_ok=True)
        for driver_id in names:
            path = find_image(driver_id)
            if path is None or is_trusted(manifest.get(driver_id, {})):
                continue
            score = suit_score(path)
            scores[driver_id] = score
            if score < args.threshold:
                shutil.move(str(path), str(REJECTED / path.name))
                manifest.pop(driver_id, None)
                print(f"  rejected {driver_id} ({score:.2f})")
            else:
                entry = manifest.get(driver_id, {})
                manifest[driver_id] = {
                    **entry,
                    "file": path.name,
                    "name": names[driver_id],
                    "source": entry.get("source", "unknown"),
                    "suit_verified": round(score, 2),
                }
                print(f"  kept     {driver_id} ({score:.2f})")

    if args.verify or args.trust:
        MANIFEST.write_text(json.dumps(manifest, indent=2))

    valid = [i for i in names if find_image(i)]
    rejected = [i for i in names if not find_image(i) and find_image(i, REJECTED)]
    never = [i for i in names if i not in valid and i not in rejected]
    unchecked = [i for i in valid if not is_trusted(manifest.get(i, {}))]

    print(f"\n{len(names)} drivers total")
    print(f"  valid (shown in app):        {len(valid)}")
    print(f"    of which still unchecked:  {len(unchecked)}  (run with --verify)")
    print(f"  rejected (not a race suit):  {len(rejected)}")
    print(f"  no image found:              {len(never)}")
    if unchecked:
        print(f"  unchecked sample: {unchecked[:10]}")

    lines = []
    for d in drivers:
        i = d["driverId"]
        status = "valid" if i in valid else "rejected" if i in rejected else "missing"
        lines.append(f"{i}\t{names[i]}\t{status}\t{d.get('url', '')}")
    (Path(__file__).parent / "missing_report.tsv").write_text("\n".join(lines))

    if args.sheet:
        print(f"\nContact sheet: {write_sheet(names, manifest, scores)}")


if __name__ == "__main__":
    main()