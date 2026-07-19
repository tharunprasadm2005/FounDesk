import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from config.database import db
import models.user
import models.workspace
import models.workspace_member
import models.user_integration
import models.refresh_token
import models.activity_event
import models.task
import models.goal
import models.follow_up
import models.blocker
import models.standup
import models.meeting_notes
import models.decision_log
import models.chronicle_event
import models.knowledge_item
import models.invoice
import models.handoff_packet
import models.ai_feedback
import models.api_key
import models.api_key_audit
import models.recurring_workflow
import models.pinned_item
import models.phase_template
import models.notification_preference
import models.workspace_notification
import models.dismissed_calendar_alert
import models.email_notification
import models.error_log
import models.waitlist
import models.team_models

target_metadata = db.metadata


def run_migrations_offline():
    url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    db_url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    cfg_section = dict(config.get_section(config.config_ini_section, {}))
    cfg_section["sqlalchemy.url"] = db_url
    connectable = engine_from_config(
        cfg_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
