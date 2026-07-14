import os
import sys

# Add backend directory to system path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app
from config.database import db

def migrate():
    with app.app_context():
        try:
            print("Running database migration to add 'property_id' to 'user_integrations'...")
            # Alter table in PostgreSQL
            db.session.execute(db.text("ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS property_id VARCHAR(255);"))
            db.session.commit()
            print("Successfully added 'property_id' column to 'user_integrations' table!")
        except Exception as e:
            print(f"Migration failed: {e}")
            db.session.rollback()

if __name__ == "__main__":
    migrate()
