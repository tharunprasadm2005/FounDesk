import os
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent
_DB = _BACKEND / "foundesk.db"

os.environ["DATABASE_URL"] = f"sqlite:///{_DB.as_posix()}"
os.environ["SKIP_SCHEDULER"] = "1"

from app import app
from config.database import db

with app.app_context():
    db.create_all()

import sqlite3
c = sqlite3.connect(_DB)
rs = c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("tables:", len(rs))
print([r[0] for r in rs])
c.close()