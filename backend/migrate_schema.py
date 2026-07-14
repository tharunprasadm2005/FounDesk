import os
import sys
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app
from config.database import db
from sqlalchemy import inspect

MISSING_COLUMNS = {
    "raw_events": [
        ("source", "VARCHAR(100) NOT NULL DEFAULT ''"),
        ("source_id", "VARCHAR(255) NOT NULL DEFAULT ''"),
        ("event_type", "VARCHAR(100) NOT NULL DEFAULT ''"),
        ("occurred_at", "TIMESTAMP"),
        ("raw_payload", "JSON"),
        ("is_mock", "BOOLEAN DEFAULT FALSE"),
        ("processed_at", "TIMESTAMP"),
    ],
    "tasks": [
        ("source_integration", "VARCHAR(100)"),
        ("source_event_id", "INTEGER REFERENCES raw_events(id) ON DELETE SET NULL"),
        ("confidence_score", "FLOAT"),
        ("source_signal", "VARCHAR(50)"),
        ("ai_status", "VARCHAR(50)"),
        ("confirmed_at", "TIMESTAMP"),
        ("dismissed_at", "TIMESTAMP"),
    ],
    "goals": [
        ("source_integration", "VARCHAR(100)"),
        ("source_event_id", "INTEGER REFERENCES raw_events(id) ON DELETE SET NULL"),
        ("confidence_score", "FLOAT"),
        ("source_signal", "VARCHAR(50)"),
        ("ai_status", "VARCHAR(50)"),
        ("confirmed_at", "TIMESTAMP"),
        ("dismissed_at", "TIMESTAMP"),
    ],
    "meeting_notes": [
        ("meeting_type", "VARCHAR(100)"),
        ("tags", "TEXT"),
        ("agenda", "TEXT"),
        ("recording_url", "VARCHAR(500)"),
        ("calendar_event_id", "VARCHAR(255)"),
        ("status", "VARCHAR(50) NOT NULL DEFAULT 'Draft'"),
    ],
    "decision_logs": [
        ("status", "VARCHAR(50) NOT NULL DEFAULT 'Proposed'"),
        ("consequences", "TEXT"),
        ("superseded_by_id", "INTEGER REFERENCES decision_logs(id) ON DELETE SET NULL"),
        ("source_integration", "VARCHAR(100)"),
        ("source_event_id", "INTEGER REFERENCES raw_events(id) ON DELETE SET NULL"),
        ("confidence_score", "FLOAT"),
        ("source_signal", "VARCHAR(50)"),
        ("ai_status", "VARCHAR(50)"),
        ("confirmed_at", "TIMESTAMP"),
        ("dismissed_at", "TIMESTAMP"),
    ],
    "blockers": [
        ("source_integration", "VARCHAR(100)"),
        ("source_event_id", "INTEGER REFERENCES raw_events(id) ON DELETE SET NULL"),
        ("confidence_score", "FLOAT"),
        ("source_signal", "VARCHAR(50)"),
        ("ai_status", "VARCHAR(50)"),
        ("confirmed_at", "TIMESTAMP"),
        ("dismissed_at", "TIMESTAMP"),
    ],
    "llm_usage_logs": [
        ("model", "VARCHAR(255) NOT NULL DEFAULT ''"),
        ("prompt_tokens", "INTEGER DEFAULT 0"),
        ("completion_tokens", "INTEGER DEFAULT 0"),
        ("total_tokens", "INTEGER DEFAULT 0"),
        ("latency_ms", "FLOAT"),
    ],
    "chronicle_events": [
        ("source_type", "VARCHAR(50)"),
        ("source_id", "INTEGER"),
        ("meta_data", "JSON"),
    ],
    "handoff_packets": [
        ("reassign_to_user_id", "INTEGER"),
        ("reassign_to_name", "VARCHAR(255)"),
        ("reassigned_count", "INTEGER DEFAULT 0"),
    ],
    "knowledge_items": [
        ("source_event_id", "VARCHAR(255)"),
        ("source_integration", "VARCHAR(100)"),
        ("ai_status", "VARCHAR(50)"),
        ("confirmed_at", "TIMESTAMP"),
        ("dismissed_at", "TIMESTAMP"),
    ],
    "pattern_corrections": [
        ("record_type", "VARCHAR(50) NOT NULL DEFAULT ''"),
        ("record_id", "INTEGER NOT NULL DEFAULT 0"),
        ("ai_extracted_fields", "JSON"),
        ("founder_action", "VARCHAR(50) NOT NULL DEFAULT ''"),
        ("corrected_fields", "JSON"),
        ("dismissal_reason", "VARCHAR(500)"),
    ],
}

def migrate():
    with app.app_context():
        print("Creating missing tables (raw_events, blockers)...")
        db.create_all()

        inspector = inspect(db.engine)
        conn = db.engine.connect()

        for table_name, columns in MISSING_COLUMNS.items():
            existing = {c["name"] for c in inspector.get_columns(table_name)} if inspector.has_table(table_name) else set()
            for col_name, col_type in columns:
                if col_name not in existing:
                    sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{col_name}" {col_type};'
                    print(f"  + {table_name}.{col_name}")
                    conn.execute(db.text(sql))
                else:
                    print(f"  ~ {table_name}.{col_name} (already exists)")

        conn.commit()
        conn.close()
        print("Migration complete!")

if __name__ == "__main__":
    migrate()
