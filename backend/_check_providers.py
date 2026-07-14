import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"
from app import app
from config.database import db
from sqlalchemy import text

with app.app_context():
    cur = db.session.execute(text("SELECT provider, date, tokens_used, requests_count FROM provider_usage ORDER BY date DESC, provider"))
    print("=== Provider usage ===")
    for r in cur:
        print(f"  {r[0]} on {r[1]}: {r[2]} tokens in {r[3]} requests")

    cur = db.session.execute(text("SELECT COUNT(*) FROM llm_usage_logs"))
    print(f"\nTotal LLM call logs: {cur.scalar()}")

    cur = db.session.execute(text("SELECT model, COUNT(*) as calls FROM llm_usage_logs GROUP BY model ORDER BY calls DESC"))
    print("LLM calls by model:")
    for r in cur:
        print(f"  {r[0]}: {r[1]}")

    # Check if the active_phase computation ran
    cur = db.session.execute(text("SELECT id, name, active_phase FROM workspaces"))
    print("\nWorkspace phases:")
    for r in cur:
        print(f"  ws={r[0]} '{r[1]}' phase={r[2]}")
