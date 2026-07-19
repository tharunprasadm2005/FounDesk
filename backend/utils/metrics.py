import time
import logging
from flask import g, request

logger = logging.getLogger(__name__)

_slow_request_thresholds = {
    "/api/goals": 1.0,
    "/api/workspaces": 1.0,
    "/api/dashboard": 1.5,
    "/api/integrations": 2.0,
}

def track_request(response):
    if not g.get("start_time"):
        return response
    elapsed = time.time() - g.start_time
    path = request.path
    threshold = 0.5
    for prefix, t in _slow_request_thresholds.items():
        if path.startswith(prefix):
            threshold = t
            break
    if elapsed > threshold:
        logger.warning("SLOW: %s %s (%.2fs > %.2fs threshold)", request.method, path, elapsed, threshold)
    return response
