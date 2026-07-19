import os
import sys
import pytest
import logging

for handler in logging.getLogger().handlers:
    handler.setLevel(logging.CRITICAL)

os.environ["FLASK_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["FRONTEND_URL"] = "http://localhost:5173"
os.environ["SKIP_SCHEDULER"] = "1"
os.environ["FLASK_RUN_PORT"] = "5001"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config.database import db as _db

@pytest.fixture(scope="function")
def app():
    from app import app as flask_app
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    flask_app.config["WTF_CSRF_ENABLED"] = False
    with flask_app.app_context():
        _db.create_all()
    yield flask_app
    with flask_app.app_context():
        _db.session.remove()
        _db.drop_all()

@pytest.fixture(scope="function")
def client(app):
    return app.test_client()
