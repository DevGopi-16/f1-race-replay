"""One-off script to inspect the raw shape of Position.z / CarData.z
before wiring the real parser.
"""

import sys
from src.live.capture import run_capture

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python test_telemetry_debug.py <year> <round> <session_type>")
        sys.exit(1)

    year = int(sys.argv[1])
    round_ = int(sys.argv[2])
    session_type = sys.argv[3]

    meta = {"event_name": "debug-run", "session_name": session_type}

    print(f"[test] Starting capture for {year} round {round_} session {session_type}...")
    print("[test] Watching for Position.z / CarData.z debug output. Ctrl+C to stop.\n")

    run_capture(year, round_, session_type, meta)
