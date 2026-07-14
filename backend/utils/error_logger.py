import os
import traceback
from flask import request
from config.database import db
from models.error_log import ErrorLog


def log_error(workspace_id=None, error=None, user_id=None):
    """Log an error to the error_logs table."""
    try:
        path = request.path if request else "unknown"
        method = request.method if request else "unknown"
    except RuntimeError:
        path = "background"
        method = "N/A"

    entry = ErrorLog(
        workspace_id=workspace_id,
        route=path,
        method=method,
        error_message=str(error) if error else None,
        error_type=type(error).__name__ if error else None,
        user_id=user_id,
    )
    db.session.add(entry)
    db.session.commit()

    # Also send to Sentry if configured
    sentry_dsn = os.environ.get("SENTRY_DSN", "")
    if sentry_dsn and error:
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(error)
        except Exception:
            pass


def log_error_decorator(f):
    """Decorator to catch and log errors from route handlers."""
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            traceback.print_exc()
            log_error(error=e)
            raise
    return wrapper
