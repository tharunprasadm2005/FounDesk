import os, sys
os.environ['SKIP_SCHEDULER'] = '1'
sys.path.insert(0, 'C:\\Users\\tharu\\FounDesk\\backend')
os.chdir('C:\\Users\\tharu\\FounDesk\\backend')
from dotenv import load_dotenv
load_dotenv('.env')
from app import app
from config.database import db
from models.task import Task
from models.blocker import Blocker
from datetime import datetime

with app.app_context():
    ws_id = 384

    # Check if synthetic tasks are on Kanban
    synthetic_ids = [1083, 1084, 1085, 1086]
    syn_tasks = Task.query.filter(Task.id.in_(synthetic_ids)).all()
    for t in syn_tasks:
        print(f'Synthetic task id={t.id} status={t.status} source={t.source} title="{t.title[:60]}"')

    # Check if they would appear in the default task list (no parent, not flat)
    all_tasks = Task.query.filter_by(workspace_id=ws_id, parent_id=None).order_by(Task.id).all()
    print(f'\nAll top-level tasks (kanban visible): {len(all_tasks)}')
    for t in all_tasks:
        marker = ''
        if t.id in synthetic_ids:
            marker = ' <<< SYNTHETIC'
        print(f'  id={t.id:<5} status={t.status:<15} source={t.source:<15} "{t.title[:50]}"{marker}')

    # Check original blocker records
    orig_blockers = Blocker.query.filter(Blocker.id.in_([70,71,72,73])).all()
    print(f'\nOriginal Blocker records still exist: {len(orig_blockers)}')
    for b in orig_blockers:
        print(f'  id={b.id} status={b.status} sev={b.severity} title="{b.title[:50]}"')

    # REVERT: Delete synthetic tasks
    deleted = Task.query.filter(Task.id.in_(synthetic_ids)).delete(synchronize_session='fetch')
    print(f'\nDeleted {deleted} synthetic tasks')
    
    # Also revert the Monday tasks back to In Progress
    for tid in [1065, 1066]:
        t = Task.query.get(tid)
        if t and t.status == 'Blocked':
            t.status = 'In Progress'
            t.blocked_at = None
            t.blocker_description = None
            print(f'Reverted task {tid} from Blocked back to {t.status}')

    db.session.commit()

    # Verify blockers still exist
    verify = Blocker.query.filter(Blocker.id.in_([70,71,72,73])).all()
    print(f'\nBlocker records after revert: {len(verify)}')
    for b in verify:
        print(f'  id={b.id} status={b.status} title="{b.title[:50]}"')

    # Check kanban is clean
    clean = Task.query.filter_by(workspace_id=ws_id, parent_id=None).count()
    print(f'\nKanban task count after revert: {clean}')
