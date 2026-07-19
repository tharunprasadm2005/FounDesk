import time
from flask import Blueprint, jsonify
from config.database import db

health_bp = Blueprint("health", __name__)

start_time = time.time()

@health_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "uptime": time.time() - start_time, "service": "foundesk-api"})

@health_bp.route("/health/ready", methods=["GET"])
def ready():
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({"status": "ready", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "not ready", "database": str(e)}), 503

@health_bp.route("/health/live", methods=["GET"])
def live():
    return jsonify({"status": "alive"})
