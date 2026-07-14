import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db

with app.app_context():
    conn = db.engine.connect()

    # Check user integrations
    result = conn.execute(db.text("SELECT id, user_id, provider, access_token IS NOT NULL as has_token, expires_at FROM user_integrations ORDER BY provider"))
    print("=== USER INTEGRATIONS ===")
    for r in result:
        print(f"  ID={r[0]} user={r[1]} provider={r[2]:20s} has_token={r[3]} expires={r[4]}")

    # Check notion_service and google_docs_service to see if they exist
    print("\n=== CHECKING NOTION SERVICE ===")
    try:
        from services.notion_service import get_notion_items
        print("  notion_service.get_notion_items: exists")
    except Exception as e:
        print(f"  notion_service error: {e}")

    print("\n=== CHECKING GOOGLE DOCS SERVICE ===")
    try:
        from services.google_docs_service import get_recent_documents, get_document
        print("  google_docs_service: exists")
    except Exception as e:
        print(f"  google_docs_service error: {e}")

    print("\n=== CHECKING CALENDLY SERVICE ===")
    try:
        from services.calendly_service import get_calendly_events
        print("  calendly_service: exists")
    except Exception as e:
        print(f"  calendly_service error: {e}")

    conn.close()
