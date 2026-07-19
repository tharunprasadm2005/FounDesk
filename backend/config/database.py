import os
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()

def init_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db_uri = os.getenv("DATABASE_URL", "")
    if db_uri and "sqlite" not in db_uri:
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_size': 10,
            'pool_recycle': 300,
            'pool_pre_ping': True,
            'max_overflow': 20,
        }
    db.init_app(app)