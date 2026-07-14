import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db
from datetime import datetime, timedelta

with app.app_context():
    conn = db.engine.connect()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = conn.execute(db.text("SELECT COUNT(*) FROM llm_usage_logs WHERE created_at >= :today"), {"today": today})
    count = result.scalar()
    print(f"LLM calls today: {count}")
    
    result = conn.execute(db.text("SELECT COUNT(*) FROM llm_usage_logs"))
    total = result.scalar()
    print(f"LLM calls total: {total}")
    
    conn.close()
