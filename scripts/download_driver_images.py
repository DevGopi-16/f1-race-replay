"""
Download a face portrait for each F1 driver into
frontend/public/drivers/<driverId>.jpg and write manifest.json.

Source: the lead photo of the driver's Wikipedia article (Wikimedia Commons).
Because that photo is not always a portrait, every image is run through a face
detector: it is kept only if a clear face is found, then cropped to a square
around it. Drivers without a usable photo are listed in missing.txt (show
initials for those in the UI).

Setup (once, inside your venv):
    pip install opencv-python-headless

Run from the project root:
    python3 scripts/download_driver_images.py --only vettel hamilton   # test
    python3 scripts/download_driver_images.py                          # everyone

Re-running skips drivers that already have an image.
"""

import argparse
import json
import time
from pathlib import Path
from urllib.parse import unquote, urlparse
from suit_check import suit_score
import requests

JOLPICA = "https://api.jolpi.ca/ergast/f1"
WIKI_API = "https://en.wikipedia.org/w/api.php"

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "drivers"
MANIFEST = OUT / "manifest.json"

HEADERS = {
    "User-Agent": "f1-race-replay-web/1.0 (student project; personal use)",
}


def all_drivers() -> list[dict]:
    drivers, offset = [], 0
    while True:
        r = requests.get(
            f"{JOLPICA}/drivers.json",
            params={"limit": 100, "offset": offset},
            headers=HEADERS,
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()["MRData"]
        batch = data["DriverTable"]["Drivers"]
        drivers.extend(batch)
        offset += 100
        if offset >= int(data["total"]) or not batch:
            return drivers
        time.sleep(1)


def wiki_image_url(wiki_page_url: str) -> str | None:
    title = unquote(urlparse(wiki_page_url).path.rsplit("/", 1)[-1]).replace("_", " ")
    r = requests.get(
        WIKI_API,
        params={
            "action": "query",
            "titles": title,
            "prop": "pageimages",
            "piprop": "thumbnail",
            "pithumbsize": 800,
            "redirects": 1,
            "format": "json",
        },
        headers=HEADERS,
        timeout=20,
    )
    r.raise_for_status()
    pages = r.json().get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    return page.get("thumbnail", {}).get("source")

def get_with_retry(url: str, params: dict | None = None, tries: int = 4) -> requests.Response:
    for attempt in range(tries):
        r = requests.get(url, params=params, headers=HEADERS, timeout=30)
        if r.status_code == 429:  # rate limited: wait and retry
            time.sleep(5 * (attempt + 1))
            continue
        r.raise_for_status()
        return r
    r.raise_for_status()
    return r


SKIP_WORDS = ("logo", "flag", "signature", "icon", "fia_", "platinum", "badge")

def wiki_image_urls(wiki_page_url: str, limit: int = 8) -> list[str]:
    """Lead image first, then the other photos used on the article."""
    title = unquote(urlparse(wiki_page_url).path.rsplit("/", 1)[-1]).replace("_", " ")
    urls: list[str] = []
    lead = wiki_image_url(wiki_page_url)
    if lead:
        urls.append(lead)

    r = get_with_retry(WIKI_API, params={
        "action": "query", "titles": title, "generator": "images",
        "gimlimit": 30, "prop": "imageinfo", "iiprop": "url|mime",
        "iiurlwidth": 800, "redirects": 1, "format": "json",
    })
    for p in r.json().get("query", {}).get("pages", {}).values():
        name = p.get("title", "").lower()
        info = (p.get("imageinfo") or [{}])[0]
        if info.get("mime") not in ("image/jpeg", "image/png"):
            continue
        if any(w in name for w in SKIP_WORDS):
            continue
        u = info.get("thumburl") or info.get("url")
        if u and u not in urls:
            urls.append(u)
    return urls[:limit]

def crop_face(content: bytes, size: int = 400) -> bytes | None:
    """Return a square JPEG centred on the main face, or None if no clear face."""
    import cv2
    import numpy as np

    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return None

    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    gray = cv2.equalizeHist(gray)
    faces = cascade.detectMultiScale(
        gray, scaleFactor=1.08, minNeighbors=6, minSize=(50, 50)
    )
    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

    # Face too small relative to the photo = crowd / action shot
    if w < width * 0.08:
        return None

    # A real face is roughly square; a very stretched box is usually a
    # false positive (e.g. locking onto a mustache or sunglasses instead
    # of the whole face), which produces an extreme, wrongly-centred crop.
    if not (0.75 <= w / h <= 1.35):
        return None

    # Reject if no eyes are found inside the box - a strong sign the
    # detector matched the wrong region.
    eye_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_eye.xml"
    )
    face_gray = gray[y:y + h, x:x + w]
    eyes = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.1, minNeighbors=5)
    if len(eyes) == 0:
        return None

    cx, cy = x + w / 2, y + h / 2 + h * 0.15  # slightly lower to include shoulders
    half = int(min(w * 1.1, cx, cy, width - cx, height - cy))
    if half < w * 0.7:  # face touches the edge of the photo
        return None

    crop = img[int(cy) - half:int(cy) + half, int(cx) - half:int(cx) + half]
    crop = cv2.resize(crop, (size, size), interpolation=cv2.INTER_AREA)

    ok, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return buf.tobytes() if ok else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="stop after N downloads")
    parser.add_argument("--only", nargs="*", help="driverIds, e.g. vettel hamilton")
    parser.add_argument(
        "--no-face-filter",
        action="store_true",
        help="save the raw Wikipedia image without face detection",
    )
    parser.add_argument("--threshold", type=float, default=0.6)
    args = parser.parse_args()

    if not args.no_face_filter:
        try:
            import cv2  # noqa: F401
        except ImportError:
            raise SystemExit(
                "OpenCV is missing. Run: pip install opencv-python-headless"
            )

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

    drivers = all_drivers()
    print(f"{len(drivers)} drivers in Jolpica")

    if args.only:
        known = {d["driverId"] for d in drivers}
        unknown = [i for i in args.only if i not in known]
        if unknown:
            print(f"Unknown driver ids: {unknown}")
            for u in unknown:
                close = sorted(k for k in known if u in k or k in u)[:10]
                print(f"  similar to '{u}': {close}")

    downloaded = 0
    missing = []

    for d in drivers:
        driver_id = d["driverId"]
        if args.only and driver_id not in args.only:
            continue
        if any((OUT / f"{driver_id}{e}").exists() for e in (".jpg", ".jpeg", ".png", ".webp")):
            if args.only:
                print(f"  already have: {driver_id}")
            continue
        name = f"{d.get('givenName', '')} {d.get('familyName', '')}".strip()

        try:
            urls = wiki_image_urls(d["url"]) if d.get("url") else []
            if not urls:
                missing.append(driver_id)
                print(f"  no Wikipedia image: {name}")
                continue

            content, filename, suit = None, f"{driver_id}.jpg", None
            for url in urls:
                raw = get_with_retry(url).content
                time.sleep(1.5)  # stay under Wikimedia's rate limit
                score = suit_score(raw)

                if score < args.threshold:
                    time.sleep(0.3)
                    continue
                suit = score
                if args.no_face_filter:
                    content = raw
                    filename = f"{driver_id}{Path(urlparse(url).path).suffix.lower() or '.jpg'}"
                    break
                content = crop_face(raw)
                if content:
                    break
                time.sleep(0.3)

            if content is None:
                missing.append(driver_id)
                print(f"  no usable photo among {len(urls)} images: {name}")
                time.sleep(0.5)
                continue

            (OUT / filename).write_bytes(content)
            manifest[driver_id] = {
                "file": filename,
                "name": name,
                "source": d["url"],
                "suit_verified": round(suit, 2),
            }

            MANIFEST.write_text(json.dumps(manifest, indent=2))
            downloaded += 1
            print(f"  saved: {name} -> {filename}")
        except Exception as e:
            print(f"  failed: {name}: {e}")

        time.sleep(0.5)  # be polite

        if args.limit and downloaded >= args.limit:
            break

    print(f"\nDownloaded {downloaded}. Without a usable image: {len(missing)}")
    if missing:
        (OUT / "missing.txt").write_text("\n".join(missing))
        print("List saved to frontend/public/drivers/missing.txt")


if __name__ == "__main__":
    main()