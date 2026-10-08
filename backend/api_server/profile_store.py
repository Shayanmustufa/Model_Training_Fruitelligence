"""
profile_store.py — Lightweight JSON-file profile persistence.
Reads and writes a single user_profile.json file in the api_server directory.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger("classifier")

PROFILE_PATH = Path(__file__).parent / "user_profile.json"


def save_profile(data: dict[str, Any]) -> None:
    """Atomically write profile data to disk (commented out as requested)."""
    # Persistence disabled:
    # tmp = PROFILE_PATH.with_suffix(".tmp")
    # tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    # tmp.replace(PROFILE_PATH)
    # log.info("Profile saved to %s", PROFILE_PATH)
    pass


def load_profile() -> dict[str, Any] | None:
    """Return saved profile, or None if it does not exist (commented out as requested)."""
    # Persistence disabled:
    # if not PROFILE_PATH.exists():
    #     return None
    # try:
    #     return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    # except Exception as exc:
    #     log.warning("Could not read profile: %s", exc)
    #     return None
    return None
