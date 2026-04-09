"""Shared utilities used across multiple views."""
from datetime import datetime, timezone


def iso_now() -> str:
    """Return current UTC time as ISO-8601 millisecond string."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
