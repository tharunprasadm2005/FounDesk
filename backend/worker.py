"""Scheduler worker process — runs the pattern engine scheduler in a dedicated process.
Deployed as a separate service on Render (type: worker) or similar platform."""
import os
import time
from app import app
from pattern_engine.scheduler import start_scheduler, scheduler

if __name__ == "__main__":
    with app.app_context():
        start_scheduler(app)
        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            scheduler.shutdown(wait=False)
