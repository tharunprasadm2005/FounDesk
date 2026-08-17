from flask_limiter import Limiter
from flask import request


def _client_ip():
    """Return the real client IP for rate-limit keying.

    Behind Render's proxy every request's ``request.remote_addr`` is the
    same internal IP, which would collapse all users into one shared
    rate-limit bucket (one user's burst blocks everyone). Use the client
    IP forwarded by the proxy when present, falling back to remote_addr.
    """
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        first = xff.split(",")[0].strip()
        if first and first.lower() != "unknown":
            return first
    return request.remote_addr or "127.0.0.1"


limiter = Limiter(
    key_func=_client_ip,
    default_limits=["500 per day", "200 per hour"],
    storage_uri="memory://",
)