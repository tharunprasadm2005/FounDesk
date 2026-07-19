import os
import sys
import logging
import uuid
from flask import g, request

def configure_logging(app):
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )
    app.logger.setLevel(log_level)

    @app.before_request
    def assign_request_id():
        g.request_id = request.headers.get("X-Request-Id", uuid.uuid4().hex[:12])
        g.start_time = None

    @app.before_request
    def log_request_start():
        g.start_time = __import__("time").time()

    @app.after_request
    def log_request(response):
        if g.get("start_time"):
            elapsed = __import__("time").time() - g.start_time
            app.logger.info(
                "%s %s %s %.3fms [%s]",
                request.method, request.path, response.status_code, elapsed * 1000, g.get("request_id", "-"),
            )
            if elapsed > 2:
                app.logger.warning("SLOW REQUEST: %s %s (%.2fs)", request.method, request.path, elapsed)
        return response
