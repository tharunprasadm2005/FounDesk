import os
from apscheduler.schedulers.background import BackgroundScheduler
from pattern_engine.pipeline import run_all
from services.notification_engine import run_notification_engine
from models.workspace import Workspace
from pattern_engine.models import PipelineLock
from config.database import db
from datetime import datetime

scheduler = BackgroundScheduler()

NOTIF_INTERVAL = 30  # minutes

LOCK_TTL_MINUTES = int(os.environ.get("PIPELINE_LOCK_TTL_MINUTES", "15"))


def start_scheduler(app):
    def job():
        with app.app_context():
            try:
                # Purge expired pipeline locks before every run
                expired = PipelineLock.query.filter(
                    PipelineLock.expires_at < datetime.utcnow()
                ).delete()
                if expired:
                    db.session.commit()
                    print(f"[SCHEDULER] Purged {expired} expired pipeline lock(s)")

                result = run_all()
                print(f"Pattern engine scheduled run: {result}")
            except Exception as e:
                print(f"Pattern engine scheduled run failed: {e}")

    def notif_job():
        with app.app_context():
            try:
                workspaces = Workspace.query.all()
                total = 0
                for ws in workspaces:
                    total += run_notification_engine(ws.id)
                if total > 0:
                    print(f"Notification engine: {total} notifications created")
            except Exception as e:
                print(f"Notification engine run failed: {e}")

    scheduler.add_job(job, "interval", minutes=15, id="pattern_engine_sync", max_instances=3)
    scheduler.add_job(notif_job, "interval", minutes=NOTIF_INTERVAL, id="notification_engine_sync")
    scheduler.start()
    print(f"Pattern engine scheduler started (every 15 min), notification engine (every {NOTIF_INTERVAL} min)")


def stop_scheduler():
    scheduler.shutdown(wait=False)
