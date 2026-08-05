"""Connects to F1's live SignalR timing feed and keeps live_state updated
in real time.

Subclasses fastf1's SignalRClient rather than reimplementing the
connection/auth/reconnect handling it already does — we only override
_on_message to ALSO route each message through TimingFeedParser into
live_state, in addition to its normal behavior of writing the raw
message to a file (kept as a free debug recording — useful if parsing
ever looks wrong and you want to see exactly what F1 sent).

This still writes a file (SignalRClient requires a filename), but we
don't care about reading it back — live_state is the source of truth
while capture is running.
"""

import json
import time
import threading
from datetime import datetime
from pathlib import Path

from fastf1.livetiming.client import SignalRClient
from signalrcore.messages.completion_message import CompletionMessage

from src.live.parse_timing import TimingFeedParser
from src.live.state import live_state

#RELEVANT_TOPICS = ["DriverList", "TimingData", "TimingAppData", "SessionInfo"]

RELEVANT_TOPICS = ["DriverList", "TimingData", "TimingAppData", "SessionInfo", "Position.z", "CarData.z"]
class LiveCapture(SignalRClient):
    def __init__(self, year: int, round_: int, session_type: str, meta: dict):
        recordings_dir = Path(__file__).resolve().parent / "recordings"
        recordings_dir.mkdir(exist_ok=True)
        filename = str(
            recordings_dir
            / f"{year}_{round_}_{session_type}_{datetime.now():%Y%m%d_%H%M%S}.txt"
        )

        super().__init__(filename=filename, filemode="w", timeout=90, no_auth=False)

        self.topics = RELEVANT_TOPICS

        self._year = year
        self._round = round_
        self._session_type = session_type
        self._parser = TimingFeedParser()

        live_state.start_session(year, round_, session_type, meta)

    def _on_message(self, msg):
        super()._on_message(msg)

        try:
            self._route_message(msg)
        except Exception as e:
            self.logger.error(f"Error parsing live message: {e}")

    def _route_message(self, msg):
        if isinstance(msg, CompletionMessage):
            if not msg.result:
                return
            for topic, data in msg.result.items():
                self._apply(topic, data)

        elif isinstance(msg, list) and len(msg) >= 2:
            topic, data = msg[0], msg[1]
            self._apply(topic, data)

        else:
            return

        live_state.update_rows(self._parser.build_rows())

    # def _apply(self, topic: str, data):
    #     if not isinstance(data, dict):
    #         return
    #     if topic == "DriverList":
    #         self._parser.apply_driver_list(data)
    #     elif topic == "TimingData":
    #         self._parser.apply_timing_data(data)
    #     elif topic == "TimingAppData":
    #         self._parser.apply_timing_app_data(data)

    def _apply(self, topic: str, data):
        if topic in ("Position.z", "CarData.z"):
            print(f"[debug] {topic} -> type={type(data)}")
            if isinstance(data, str):
                print(f"[debug] {topic} sample (first 100 chars): {data[:100]}")
            elif isinstance(data, dict):
                print(f"[debug] {topic} keys: {list(data.keys())[:5]}")
            return  # bail early, don't try to parse yet

        if not isinstance(data, dict):
            return
        if topic == "DriverList":
            self._parser.apply_driver_list(data)
        elif topic == "TimingData":
            self._parser.apply_timing_data(data)
        elif topic == "TimingAppData":
            self._parser.apply_timing_app_data(data)

    def _on_close(self):
        super()._on_close()
        live_state.stop_session()


def run_capture(year: int, round_: int, session_type: str, meta: dict):
    """Blocking call — intended to run in a background thread via
    loop.run_in_executor(), same pattern as warm_driver_stats_cache
    in main.py. Returns when the connection drops or times out.
    """
    client = LiveCapture(year, round_, session_type, meta)
    try:
        client.start()
    finally:
        live_state.stop_session()
