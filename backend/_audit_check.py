import os
from app import app
from config.database import db
from models.workspace import Workspace
from datetime import datetime, timedelta
from pattern_engine.models import RawEvent, ProviderUsage, PipelineLock

with app.app_context():
    ws = Workspace.query.first()
    print(f"Workspace: id={ws.id} name={ws.name}")
    print(f"  subscription_status={ws.subscription_status}")
    print(f"  plan={ws.plan}")
    print(f"  trial_ends_at={ws.trial_ends_at}")
    print(f"  created_at={ws.created_at}")

    trial_days = 14
    trial_end = ws.trial_ends_at or (ws.created_at + timedelta(days=trial_days))
    print(f"  Calculated trial_end={trial_end}")
    is_trial_expired = ws.subscription_status == 'trial' and trial_end < datetime.utcnow()
    print(f"  Is trial expired? {is_trial_expired}")

    rp_key = os.environ.get('RAZORPAY_KEY_ID', '')
    rp_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
    print(f"  RAZORPAY_KEY_ID={'[SET]' if rp_key else '[EMPTY]'}")
    print(f"  RAZORPAY_KEY_SECRET={'[SET]' if rp_secret else '[EMPTY]'}")

    # Stuck events check
    processing = RawEvent.query.filter_by(processing_status='processing').all()
    print(f"\nStuck processing events: {len(processing)}")
    for e in processing[:5]:
        print(f"  id={e.id} src={e.source} pipeline={e.pipeline_name} error={e.last_error}")
    if len(processing) > 5:
        print(f"  ... and {len(processing)-5} more")

    # Test: retry_count and last_error population
    failed = RawEvent.query.filter(RawEvent.retry_count > 0).all()
    print(f"\nEvents with retries: {len(failed)}")
    for e in failed[:5]:
        print(f"  id={e.id} src={e.source} retries={e.retry_count} error={e.last_error}")

    # PipelineLock test
    print(f"\nPipeline locks: {PipelineLock.query.count()}")
    for l in PipelineLock.query.all():
        expired = l.expires_at < datetime.utcnow() if l.expires_at else True
        print(f"  name={l.pipeline_name} expires={l.expires_at} expired={expired}")
