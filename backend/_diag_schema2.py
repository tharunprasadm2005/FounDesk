import os, sys
sys.path.insert(0, os.path.abspath('.'))
with open(os.devnull, 'w') as n:
    from app import app
    from config.database import db
with app.app_context():
    from sqlalchemy import inspect
    insp = inspect(db.engine)
    for t in ['raw_events', 'meeting_notes']:
        print(f'=== {t} ===')
        cols = insp.get_columns(t)
        for c in cols:
            print(f'  {c["name"]:25s} {str(c["type"]):30s}')
        for ix in insp.get_indexes(t):
            print(f'  Index: {ix["name"]} cols={ix["column_names"]} unique={ix["unique"]}')
        for uc in insp.get_unique_constraints(t):
            print(f'  Unique: {uc["name"]} cols={uc["column_names"]}')
        print()
