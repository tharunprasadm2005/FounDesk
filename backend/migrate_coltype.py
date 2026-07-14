import sys, os
sys.path.append(os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')

from app import app
from config.database import db

with app.app_context():
    conn = db.engine.connect()

    # Drop FK constraints referencing raw_events
    result = conn.execute(db.text("""
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE confrelid = (SELECT oid FROM pg_class WHERE relname = 'raw_events')
        AND contype = 'f'
    """))
    for fk in result.fetchall():
        sql = f'ALTER TABLE {fk[1]} DROP CONSTRAINT {fk[0]}'
        print(f'Dropping FK: {sql}')
        conn.execute(db.text(sql))

    # Alter source_event_id from INTEGER to VARCHAR(255)
    for table in ['tasks', 'goals', 'decision_logs', 'blockers']:
        sql = f'ALTER TABLE "{table}" ALTER COLUMN source_event_id TYPE VARCHAR(255) USING source_event_id::text'
        print(f'Altering {table}: {sql}')
        conn.execute(db.text(sql))

    conn.commit()
    conn.close()
    print('Column type migration complete!')
