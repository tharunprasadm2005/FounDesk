import os
os.environ["DATABASE_URL"] = "sqlite:///C:/Users/tharu/FounDesk/backend/foundesk.db"
os.environ["SKIP_SCHEDULER"] = "1"

from app import app
from config.database import db

with app.app_context():
    db.create_all()

import sqlite3
c = sqlite3.connect("C:/Users/tharu/FounDesk/backend/foundesk.db")
rs = c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("tables:", len(rs))
print([r[0] for r in rs])
c.close()