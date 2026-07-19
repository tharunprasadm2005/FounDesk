import os
import logging

logger = logging.getLogger(__name__)

def init_sentry(app):
    sentry_dsn = os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        logger.info("Sentry not configured (SENTRY_DSN not set)")
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[FlaskIntegration()],
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            environment=os.getenv("FLASK_ENV", "production"),
        )
        logger.info("Sentry initialized")
    except ImportError:
        logger.warning("sentry-sdk not installed, skipping Sentry setup")
