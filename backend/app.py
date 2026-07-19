from flask import Flask, request, jsonify
from flask_wtf.csrf import CSRFProtect
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from models.user import User
from config.database import db, init_db
from utils.rate_limit import limiter
import jwt
import datetime
import os
from dotenv import load_dotenv
from routes.google_data import google_bp
from routes.github_data import github_bp
from routes.monday_data import monday_bp
from routes.google_docs_data import google_docs_bp
from routes.trello_data import trello_bp
from routes.asana_data import asana_bp
from routes.calendly_data import calendly_bp
from routes.posthog_data import posthog_bp
from routes.linear_data import linear_bp
from routes.mixpanel_data import mixpanel_bp
from routes.amplitude_data import amplitude_bp
from routes.tracking import tracking_bp
from routes.hubspot_data import hubspot_bp
from routes.pipedrive_data import pipedrive_bp
from routes.zoho_data import zoho_bp
from routes.notion_data import notion_bp
from health import health_bp
import logging
import atexit
import signal

logging.basicConfig(
    level=logging.INFO if os.environ.get("FLASK_ENV") != "test" else logging.ERROR,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

REQUIRED_ENV_VARS = ["DATABASE_URL", "SECRET_KEY"]
missing = [v for v in REQUIRED_ENV_VARS if not os.environ.get(v)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

# Sentry error monitoring (opt-in via SENTRY_DSN env var)
sentry_dsn = os.environ.get("SENTRY_DSN", "")
if sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_RATE", "0.1")),
        environment=os.environ.get("APP_ENV", "development"),
    )

app = Flask(__name__)
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://foundesk.onrender.com")
app_env = os.getenv("APP_ENV", "development")
CORS_ORIGINS = [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"]

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get("Origin")
        if origin and origin in CORS_ORIGINS:
            response = jsonify({"status": "ok"})
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRFToken, X-Workspace-ID"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            return response

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin and origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRFToken, X-Workspace-ID"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request", "message": str(e)}), 400


@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": "Unauthorized", "message": "Authentication required"}), 401


@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": "Forbidden", "message": "You don't have permission to access this resource"}), 403


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found", "message": "The requested resource was not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed", "message": str(e)}), 405


@app.errorhandler(429)
def too_many_requests(e):
    return jsonify({"error": "Rate limit exceeded", "message": "Too many requests. Please try again later."}), 429


@app.errorhandler(500)
def internal_error(e):
    print(f"HTTP 500: {e}")
    return jsonify({"error": "Internal server error", "message": "An unexpected error occurred"}), 500


@app.errorhandler(Exception)
def handle_all_exceptions(e):
    import traceback
    print(f"Unhandled exception: {e}\n{traceback.format_exc()}")
    return jsonify({"error": "Internal server error", "message": str(e)}), 500


@app.errorhandler(502)
def bad_gateway(e):
    return jsonify({"error": "Bad gateway", "message": "Upstream service unavailable"}), 502


@app.errorhandler(503)
def service_unavailable(e):
    return jsonify({"error": "Service unavailable", "message": "Temporarily unavailable, please retry"}), 503


app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")
if not app.config['SECRET_KEY']:
    raise RuntimeError("SECRET_KEY environment variable is required")
app.config['WTF_CSRF_CHECK_DEFAULT'] = False
app.config['WTF_CSRF_TIME_LIMIT'] = 3600

init_db(app)
csrf = CSRFProtect(app)
csrf.exempt("/api/billing/webhook")
csrf.exempt("/api/health")
limiter.init_app(app)

# Auto-migrate: add missing model columns to existing tables
with app.app_context():
    try:
        from sqlalchemy import text as sa_text
        _COLUMNS = {
            "users": [
                ("email_verified", "BOOLEAN NOT NULL DEFAULT FALSE"),
                ("email_verify_token", "VARCHAR(200)"),
                ("token_version", "INTEGER NOT NULL DEFAULT 0"),
                ("week_start_day", "VARCHAR(10) NOT NULL DEFAULT 'monday'"),
                ("recovery_codes", "TEXT"),
                ("avatar_updated_at", "TIMESTAMP"),
            ],
            "workspaces": [
                ("logo_url", "VARCHAR(500)"),
                ("website", "VARCHAR(500)"),
                ("industry", "VARCHAR(100)"),
                ("size", "VARCHAR(50)"),
                ("tags", "JSON"),
                ("template_source", "VARCHAR(100)"),
            ],
            "api_keys": [
                ("permissions", "JSON"),
                ("last_used_ip", "VARCHAR(45)"),
            ],
            "refresh_tokens": [
                ("user_agent", "VARCHAR(500)"),
                ("ip_address", "VARCHAR(45)"),
                ("last_used_at", "TIMESTAMP"),
            ],
        }
        for table, cols in _COLUMNS.items():
            for col_name, col_type in cols:
                try:
                    db.session.execute(sa_text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
        # Ensure workspace_notifications table exists
        try:
            db.session.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS workspace_notifications (
                    id SERIAL PRIMARY KEY,
                    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    notification_type VARCHAR(100) NOT NULL,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    channel VARCHAR(50) NOT NULL DEFAULT 'all',
                    frequency VARCHAR(50) NOT NULL DEFAULT 'immediate',
                    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()
    except Exception as e:
        print(f"Auto-migration init: {e}")

from utils.auth import token_required
from routes.goals import goals_bp
from routes.integrations import integrations_bp
from routes.briefing_routes import briefing_bp
from routes.tasks import tasks_bp
from routes.decisions import decisions_bp
from routes.meeting_notes import notes_bp
from routes.workspaces import workspaces_bp
from routes.standups import standups_bp
from routes.notifications import notifications_bp
from routes.follow_ups import follow_ups_bp
from routes.calendar_defense import calendar_defense_bp
from routes.templates import templates_bp
from routes.memory import memory_bp
from routes.feed import feed_bp
from routes.dashboard import dashboard_bp
from routes.pattern_engine_routes import pattern_engine_bp
from routes.ai_layer import ai_bp
from routes.waitlist_routes import waitlist_bp
from routes.knowledge_routes import knowledge_bp

# Import new models to register with db context
from models.follow_up import FollowUp
from models.phase_template import PhaseTemplate, PhaseTemplateGoal, PhaseTemplateTask
from pattern_engine.models import RawEvent, LLMUsageLog, ProviderUsage, PatternCorrection
from models.recurring_workflow import RecurringWorkflow
from models.chronicle_event import ChronicleEvent
from models.dismissed_calendar_alert import DismissedCalendarAlert
from models.activity_event import ActivityEvent
from models.blocker import Blocker
from models.pinned_item import PinnedItem
from models.ai_feedback import AiFeedback
from models.waitlist import Waitlist
from models.knowledge_item import KnowledgeItem
from models.notification_preference import NotificationPreference, InAppNotification
from models.workspace_notification import WorkspaceNotification
from models.api_key import ApiKey
from models.error_log import ErrorLog
from models.invoice import Invoice
from models.api_key_audit import ApiKeyAuditLog
from models.email_notification import EmailNotification

from routes.auth import auth_bp
from models.refresh_token import RefreshToken
from routes.users import users_bp
from routes.billing import billing_bp
from routes.developer import developer_bp
from routes.team_space import team_space_bp


app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(users_bp, url_prefix='/api')
app.register_blueprint(billing_bp, url_prefix='/api')
app.register_blueprint(developer_bp, url_prefix='/api')
app.register_blueprint(google_bp, url_prefix='/api')
app.register_blueprint(github_bp, url_prefix='/api')
app.register_blueprint(monday_bp, url_prefix='/api')
app.register_blueprint(google_docs_bp, url_prefix='/api')
app.register_blueprint(trello_bp, url_prefix='/api')
app.register_blueprint(asana_bp, url_prefix='/api')
app.register_blueprint(calendly_bp, url_prefix='/api')
app.register_blueprint(posthog_bp, url_prefix='/api')
app.register_blueprint(linear_bp, url_prefix='/api')
app.register_blueprint(mixpanel_bp, url_prefix='/api')
app.register_blueprint(amplitude_bp, url_prefix='/api')
app.register_blueprint(tracking_bp, url_prefix='/api')
app.register_blueprint(hubspot_bp, url_prefix='/api')
app.register_blueprint(pipedrive_bp, url_prefix='/api')
app.register_blueprint(zoho_bp, url_prefix='/api')
app.register_blueprint(notion_bp, url_prefix='/api')
app.register_blueprint(goals_bp, url_prefix='/api')
app.register_blueprint(integrations_bp, url_prefix='/api')
app.register_blueprint(briefing_bp, url_prefix='/api')
app.register_blueprint(tasks_bp, url_prefix='/api')
app.register_blueprint(decisions_bp, url_prefix='/api')
app.register_blueprint(notes_bp, url_prefix='/api')
app.register_blueprint(workspaces_bp, url_prefix='/api')
app.register_blueprint(standups_bp, url_prefix='/api')
app.register_blueprint(notifications_bp, url_prefix='/api')
app.register_blueprint(follow_ups_bp, url_prefix='/api')
app.register_blueprint(calendar_defense_bp, url_prefix='/api')
app.register_blueprint(templates_bp, url_prefix='/api')
app.register_blueprint(memory_bp, url_prefix='/api')
app.register_blueprint(feed_bp, url_prefix='/api')
app.register_blueprint(dashboard_bp, url_prefix='/api')
app.register_blueprint(pattern_engine_bp, url_prefix='/api')
app.register_blueprint(ai_bp, url_prefix='/api')
app.register_blueprint(waitlist_bp, url_prefix='/api')
app.register_blueprint(team_space_bp, url_prefix='/api')
app.register_blueprint(knowledge_bp, url_prefix='/api')
app.register_blueprint(health_bp)


@app.route('/auth/google', methods=['POST'])
@limiter.limit("10 per minute")
def google_auth():
    import traceback
    from models.workspace import Workspace
    from models.workspace_member import WorkspaceMember
    data = request.get_json()
    if not data or not data.get('token'):
        return jsonify({"error": "Missing token"}), 400
    token = data.get('token')

    try:
        google_client_id = os.getenv("GOOGLE_INTEGRATION_CLIENT_ID", "174203078115-lgbiq9ekbd01sr82us4ulb4nsb0boc3q.apps.googleusercontent.com")
        idinfo = id_token.verify_oauth2_token(
            token,
            grequests.Request(),
            google_client_id
        )

        google_id = idinfo['sub']
        email = idinfo.get('email', '')
        name = idinfo.get('name', 'User')

        # Check if user exists by google_id or email
        user = User.query.filter_by(google_id=google_id).first()

        if not user:
            existing = User.query.filter_by(email=email).first()
            if existing:
                existing.google_id = google_id
                if not existing.name:
                    existing.name = name
                user = existing
                print("LINKED GOOGLE ACCOUNT TO EXISTING USER")
            else:
                user = User(
                    google_id=google_id,
                    email=email,
                    name=name
                )
                db.session.add(user)
                db.session.flush()
                # Create workspace for Google OAuth users
                workspace = Workspace(
                    name=f"{name.split(' ')[0]}'s Workspace",
                    stage="Build",
                    creator_id=user.id,
                    subscription_status="trial",
                    plan="starter",
                )
                db.session.add(workspace)
                db.session.flush()
                member = WorkspaceMember(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    email=email,
                    role="owner",
                    status="active",
                )
                db.session.add(member)
                print("NEW USER CREATED WITH WORKSPACE")
            db.session.commit()
        else:
            print("USER ALREADY EXISTS")

        raw_token = jwt.encode({
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        jwt_token = raw_token.decode("utf-8") if isinstance(raw_token, bytes) else raw_token

        return jsonify({
            "message": "Login successful",
            "token": jwt_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name
            }
        })

    except ValueError as e:
        print("Google auth ValueError:", e)
        return jsonify({"error": "Invalid token"}), 400
    except Exception as e:
        traceback.print_exc()
        print("Google auth error:", str(e))
        return jsonify({"error": "Authentication failed", "detail": str(e)}), 500

@app.route('/auth/slack', methods=['GET'])
def slack_auth():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required to connect Slack"}), 400
        
    client_id = os.getenv("SLACK_CLIENT_ID")
    redirect_uri = os.getenv("SLACK_REDIRECT_URI", f"{FRONTEND_URL}/settings?callback=slack")
    from urllib.parse import urlencode
    
    url = "https://slack.com/oauth/v2/authorize?" + urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "channels:read,channels:history,users:read",
        "state": f"slack_user_{user_id}"
    })
    from flask import redirect
    return redirect(url)

@app.route('/auth/slack/callback', methods=['GET'])
def slack_auth_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    if not code or not state or not state.startswith("slack_user_"):
        return jsonify({"error": "Invalid Slack callback parameters"}), 400
        
    user_id = int(state.replace("slack_user_", ""))
    client_id = os.getenv("SLACK_CLIENT_ID")
    client_secret = os.getenv("SLACK_CLIENT_SECRET")
    redirect_uri = os.getenv("SLACK_REDIRECT_URI", f"{FRONTEND_URL}/settings?callback=slack")
    
    import requests
    res = requests.post("https://slack.com/api/oauth.v2.access", data={
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri
    }, timeout=15)
    token_data = res.json()
    if not token_data.get("ok"):
        return jsonify({"error": token_data.get("error", "OAuth exchange failed")}), 400
        
    access_token = token_data.get("access_token")
    team_name = token_data.get("team", {}).get("name", "Slack Workspace")
    
    from models.user_integration import UserIntegration
    integration = UserIntegration.query.filter_by(user_id=user_id, provider="slack").first()
    if not integration:
        integration = UserIntegration(
            user_id=user_id,
            provider="slack",
            access_token=access_token,
            connected_email=team_name
        )
        db.session.add(integration)
    else:
        integration.access_token = access_token
        integration.connected_email = team_name
        
    db.session.commit()
    
    from flask import redirect
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return redirect(f"{frontend_url}/settings?status=slack_connected")

@app.route('/dashboard', methods=['GET'])
@token_required
def dashboard(current_user_id):
    user = User.query.get(current_user_id)

    return jsonify({
        "message": "Welcome to dashboard",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
    })

# Reload trigger for dotenv: 2026-06-17T18:39


@app.route('/api/admin/db-status', methods=['GET'])
def admin_db_status():
    admin_token = request.headers.get("X-Admin-Token")
    expected = os.environ.get("ADMIN_API_TOKEN", "")
    if expected and admin_token != expected:
        return jsonify({"error": "Unauthorized"}), 401
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    result = {}
    conn = db.engine.connect()
    for t in sorted(tables):
        try:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            result[t] = count
        except Exception:
            result[t] = -1
    conn.close()
    return jsonify({"table_count": len(tables), "rows": result})

@limiter.exempt
@app.route('/api/health', methods=['GET', 'POST', 'HEAD'])
def health():
    return jsonify({"status": "ok"})

@app.route('/api/internal/run-pipeline', methods=['POST'])
def trigger_pipeline():
    admin_token = request.headers.get("X-Admin-Token")
    expected = os.environ.get("ADMIN_API_TOKEN", "")
    if expected and admin_token != expected:
        return jsonify({"error": "Unauthorized"}), 401
    import threading
    def _run():
        with app.app_context():
            from pattern_engine.pipeline.core import run_all
            from models.workspace import Workspace
            for ws in Workspace.query.all():
                try:
                    run_all(workspace_id=ws.id)
                except Exception as e:
                    print(f"Pipeline error for workspace {ws.id}: {e}")
    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"status": "accepted"}), 202

@app.route('/api/admin/llm-usage', methods=['GET'])
def admin_llm_usage():
    admin_token = request.headers.get("X-Admin-Token")
    expected = os.environ.get("ADMIN_API_TOKEN", "")
    if expected and admin_token != expected:
        return jsonify({"error": "Unauthorized"}), 401
    from datetime import date
    from pattern_engine.models import ProviderUsage
    records = ProviderUsage.query.filter_by(date=date.today()).all()
    return jsonify({
        "date": date.today().isoformat(),
        "providers": [r.to_dict() for r in records],
    })


if os.environ.get("SKIP_SCHEDULER", "0") != "1":
    with app.app_context():
        try:
            from pattern_engine.scheduler import start_scheduler
            start_scheduler(app)
        except Exception as e:
            print(f"Scheduler init skipped: {e}")

def graceful_shutdown(*args):
    try:
        if hasattr(db, 'engine'):
            try:
                db.engine.dispose()
            except Exception:
                pass
    except Exception:
        pass

if os.environ.get("FLASK_ENV") != "test":
    atexit.register(graceful_shutdown)
    signal.signal(signal.SIGTERM, graceful_shutdown)
    signal.signal(signal.SIGINT, graceful_shutdown)

if __name__ == '__main__':
    port = int(os.environ.get("FLASK_RUN_PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(debug=debug, port=port)