from app import app
from config.database import db
from sqlalchemy import text

with app.app_context():
    db.session.rollback()
    
    total = db.session.execute(text("SELECT COUNT(*) FROM tasks")).scalar()
    print(f"Total tasks: {total}")

    by_status = db.session.execute(text("SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status ORDER BY cnt DESC")).fetchall()
    print("By status:")
    for s, c in by_status:
        print(f"  {s}: {c}")

    untitled = db.session.execute(text("SELECT id, title, status, priority, source, source_integration FROM tasks WHERE title = 'Untitled' OR title LIKE 'Untitled%' OR title LIKE 'Task %' ORDER BY id")).fetchall()
    print(f"\nUntitled/placeholder tasks: {len(untitled)}")
    for row in untitled:
        print(f"  id={row.id} status={row.status} priority={row.priority} source={row.source} integration={row.source_integration} title=\"{row.title}\"")

    blocked = db.session.execute(text("SELECT id, title, status, priority, source FROM tasks WHERE status = 'Blocked' OR status = 'blocked' ORDER BY id")).fetchall()
    print(f"\nBlocked tasks: {len(blocked)}")
    for row in blocked:
        print(f"  id={row.id} title=\"{row.title}\" priority={row.priority} source={row.source}")

    in_progress = db.session.execute(text("SELECT id, title, status, priority, source FROM tasks WHERE status = 'In Progress' OR status = 'in_progress' ORDER BY id")).fetchall()
    print(f"\nIn Progress tasks: {len(in_progress)}")
    for row in in_progress:
        print(f"  id={row.id} title=\"{row.title}\" priority={row.priority} source={row.source}")
