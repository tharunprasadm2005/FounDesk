import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db
with app.app_context():
    from sqlalchemy import inspect
    insp = inspect(db.engine)
    cols = insp.get_columns('activity_events')
    for c in cols:
        print(f"  {c['name']:25s} {c['type']}")
    print()
    # Check if there's a unique constraint
    for ix in insp.get_indexes('activity_events'):
        print(f"  Index: {ix['name']} columns={ix['column_names']} unique={ix['unique']}")
    for c in insp.get_unique_constraints('activity_events'):
        print(f"  Unique: {c['name']} columns={c['column_names']}")
