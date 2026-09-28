"""
Structured security event log (one JSON object per line).

Every event automatically gets the request's IP and user agent from the
request context. Rotates at 5 MB, keeping 5 old files.

The log contains emails and IP addresses, which are personal data: keep it
out of git (it is), restrict file access, and mention it in a privacy policy.
"""

import json
import logging
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

from src.auth.sessions.context import get_ip_address, get_user_agent

LOG_DIR = Path(__file__).resolve().parents[3] / "logs"
LOG_FILE = LOG_DIR / "security_events.log"

_logger = logging.getLogger("security_events")
_logger.setLevel(logging.INFO)
_logger.propagate = False

if not _logger.handlers:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    _handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    _handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(_handler)


def log_event(event_type: str, **details) -> None:
    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": event_type,
    }

    ip = get_ip_address()
    if ip and "ip" not in details:
        entry["ip"] = ip

    user_agent = get_user_agent()
    if user_agent and "user_agent" not in details:
        entry["user_agent"] = user_agent[:120]

    entry.update(details)

    try:
        _logger.info(json.dumps(entry))
    except Exception as e:
        print(f"[security_log] failed to write event: {e}")