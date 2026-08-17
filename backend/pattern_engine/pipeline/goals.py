from datetime import datetime, timedelta
from config.database import db
from models.task import Task
from models.goal import Goal, goal_decisions
from models.decision_log import DecisionLog
from models.workspace import Workspace
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent

from .utils import _get_workspace_creator


def _auto_align_goals(workspace_id):
    from pattern_engine.extraction import check_goal_alignment, suggest_goal_from_signal
    from difflib import SequenceMatcher
    creator_id = _get_workspace_creator(workspace_id)
    if not creator_id:
        return

    existing_goals = Goal.query.filter_by(workspace_id=workspace_id).filter(Goal.status != 'duplicate').all()
    existing_titles = [g.title for g in existing_goals]
    existing_titles_lower = [t.lower() for t in existing_titles]

    def _is_valid_goal_title(title):
        if not title or not title.strip():
            return False
        t = title.strip().lower()
        if t in ("untitled goal", "untitled", "new goal", "goal", "", "my goal", "new"):
            return False
        if len(t) < 5:
            return False
        return True

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.goal_type == "daily",
        Goal.created_at >= today_start,
    ).first()
    if not today_goals:
        recent_decisions = DecisionLog.query.filter(
            DecisionLog.workspace_id == workspace_id,
            DecisionLog.created_at >= (datetime.utcnow() - timedelta(hours=24)),
        ).limit(5).all()
        recent_tasks = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.created_at >= (datetime.utcnow() - timedelta(hours=24)),
        ).limit(5).all()

        signals = []
        for d in recent_decisions:
            if d.decision and len(d.decision) > 10:
                signals.append(("decision", d.decision))
        for t in recent_tasks:
            if t.title and len(t.title) > 10:
                signals.append(("task", t.title))

        for item_type, item_title in signals[:3]:
            try:
                if existing_titles:
                    result = check_goal_alignment(item_type, item_title, existing_titles)
                    if result and result.get("aligned_goal") and result.get("alignment_confidence", 0) > 0.8:
                        matched = result["aligned_goal"]
                        if not _is_valid_goal_title(matched):
                            continue
                        existing_titles.append(matched)
                        existing_titles_lower.append(matched.lower())
                        goal = Goal(
                            title=matched[:255],
                            description=f"Auto-aligned from {item_type}: {item_title[:200]}",
                            goal_type="daily",
                            status="pending",
                            user_id=creator_id,
                            workspace_id=workspace_id,
                            date=datetime.utcnow().date(),
                        )
                        db.session.add(goal)
                        print(f"[GOAL] Auto-created daily goal '{matched[:50]}' from {item_type}")
                else:
                    result = suggest_goal_from_signal(item_type, item_title)
                    if result and result.get("suggested_goal") and result.get("confidence", 0) > 0.7:
                        suggested = result["suggested_goal"]
                        if not _is_valid_goal_title(suggested):
                            continue
                        gtype = result.get("goal_type", "daily")
                        existing_titles.append(suggested)
                        existing_titles_lower.append(suggested.lower())
                        goal = Goal(
                            title=suggested[:255],
                            description=f"Suggested from {item_type}: {item_title[:200]}",
                            goal_type=gtype,
                            status="pending",
                            user_id=creator_id,
                            workspace_id=workspace_id,
                            date=datetime.utcnow().date(),
                        )
                        db.session.add(goal)
                        print(f"[GOAL] Created new goal '{suggested[:50]}' ({gtype}) from {item_type}")
            except Exception as e:
                from pattern_engine.llm_client import LLMQuotaExhausted
                if isinstance(e, LLMQuotaExhausted):
                    raise
                print(f"[GOAL] Error processing signal '{item_title[:40]}': {e}")

    # Dedup across all goal types by title similarity
    all_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status != 'duplicate',
    ).all()
    for g in all_goals:
        for other in all_goals:
            if g.id >= other.id:
                continue
            ratio = SequenceMatcher(None, g.title.lower(), other.title.lower()).ratio()
            if ratio > 0.8:
                print(f"[GOAL] Dedup: '{g.title[:40]}' ~ '{other.title[:40]}' (ratio={ratio:.2f}) \u2014 marking older as duplicate")
                older = g if g.id < other.id else other
                older.status = "duplicate"


def _compute_active_phase(workspace_id):
    from datetime import datetime, timedelta
    total_goals = Goal.query.filter_by(workspace_id=workspace_id).count()
    done_goals = Goal.query.filter_by(workspace_id=workspace_id, status="completed").count()
    goal_completion = (done_goals / total_goals * 100) if total_goals > 0 else 0

    total_tasks = Task.query.filter_by(workspace_id=workspace_id).count()
    done_tasks = Task.query.filter_by(workspace_id=workspace_id, status="Done").count()
    task_completion = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0

    recent_window = datetime.utcnow() - timedelta(days=7)
    recent_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.updated_at >= recent_window,
    ).count()
    recent_done = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "Done",
        Task.updated_at >= recent_window,
    ).count()
    velocity = (recent_done / recent_tasks * 100) if recent_tasks > 0 else 0

    integrations = UserIntegration.query.filter_by(user_id=_get_workspace_creator(workspace_id)).count()
    integration_bonus = min(integrations * 5, 25)

    # Calendar overload penalty: if no deep work blocks found today, apply -10 penalty
    calendar_penalty = 0
    try:
        from models.activity_event import ActivityEvent
        from models.workspace import Workspace as WsModel
        ws_obj = WsModel.query.get(workspace_id)
        if ws_obj:
            rules = ws_obj.calendar_rules or {}
            start_hour = int(rules.get("start_hour", 9))
            end_hour = int(rules.get("end_hour", 18))
            work_minutes = (end_hour - start_hour) * 60
            busy_window = datetime.utcnow() - timedelta(hours=24)
            today_events = ActivityEvent.query.filter(
                ActivityEvent.workspace_id == workspace_id,
                ActivityEvent.provider == "google_calendar",
                ActivityEvent.external_timestamp >= busy_window,
            ).count()
            if today_events > work_minutes // 30:  # More events than available half-hour slots
                calendar_penalty = 10
    except Exception:
        pass

    score = goal_completion * 0.3 + task_completion * 0.3 + velocity * 0.25 + integration_bonus - calendar_penalty
    score = max(score, 0)  # floor at 0

    if score < 15:
        phase = "Think"
    elif score < 40:
        phase = "Build"
    elif score < 70:
        phase = "Launch"
    else:
        phase = "Scale"

    ws = Workspace.query.get(workspace_id)
    scores = {
        "goal_completion": round(goal_completion, 1),
        "task_completion": round(task_completion, 1),
        "velocity": round(velocity, 1),
        "integration_bonus": integration_bonus,
        "calendar_penalty": calendar_penalty,
        "total_score": round(score, 1),
    }
    # Compute 3-tier health status (on_track / needs_attention / stale_workspace)
    if total_goals == 0 and total_tasks == 0:
        health = "stale_workspace"
    elif goal_completion < 10 and task_completion < 10 and velocity < 10:
        health = "stale_workspace"
    elif goal_completion < 30 or task_completion < 30 or velocity < 20:
        health = "needs_attention"
    else:
        health = "on_track"

    if ws:
        if ws.active_phase != phase:
            ws.active_phase = phase
        if ws.active_health != health:
            ws.active_health = health
        ws.active_phase_scores = scores
        print(f"[PHASE] Workspace {workspace_id}: {phase} (health={health}, score={score:.0f}, goals={goal_completion:.0f}%, tasks={task_completion:.0f}%, velocity={velocity:.0f}%, cal_penalty={calendar_penalty})")


def _auto_link_decisions_to_goals(workspace_id):
    """Link decisions to goals using temporal+topical heuristics.
    Threshold raised from 0.25 to 0.45 to avoid false positive links.
    0.25 is too low \u2014 e.g. 'Offer Volume Discount?' scoring 0.33 against
    'Finalize Discount Tiers' has some topical overlap but not enough to
    confidently say that decision represents progress toward that goal.
    A secondary temporal check is applied: decision must be within 7 days
    of goal creation (before or after) to be linked, preventing stale matches.
    """
    from models.goal import Goal, goal_decisions
    from models.decision_log import DecisionLog
    from pattern_engine.dedup import _tokenize, _cosine_similarity

    active_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status.in_(["pending", "in_progress"]),
    ).all()
    if not active_goals:
        return

    linked_ids = set()
    for g in active_goals:
        for d in g.linked_decisions:
            linked_ids.add(d.id)
    all_decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        ~DecisionLog.id.in_(linked_ids) if linked_ids else True,
    ).limit(20).all()

    for dec in all_decisions:
        if not dec.decision:
            continue
        dec_tokens = _tokenize(dec.decision)
        if not dec_tokens:
            continue

        best_goal = None
        best_score = 0.0
        for goal in active_goals:
            goal_tokens = _tokenize(goal.title)
            if not goal_tokens:
                continue
            score = _cosine_similarity(dec_tokens, goal_tokens)
            if score > best_score:
                best_score = score
                best_goal = goal

        # Raised threshold: 0.45 + temporal proximity within 7 days
        if best_score >= 0.45 and best_goal:
            time_diff = abs((dec.created_at - best_goal.created_at).days)
            if time_diff <= 7:
                best_goal.linked_decisions.append(dec)
                print(f"[GOAL] Linked decision '{dec.decision[:40]}...' to goal '{best_goal.title[:40]}' (score={best_score:.2f}, temporal_diff={time_diff}d)")
            else:
                print(f"[GOAL] Skipped link: '{dec.decision[:40]}...' score={best_score:.2f} but temporal_diff={time_diff}d > 7d")


def _auto_progress(workspace_id):
    from datetime import datetime, timedelta
    goals = Goal.query.filter_by(workspace_id=workspace_id, status="pending").all()
    for goal in goals:
        total = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id).count()
        done = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id, status="Done").count()
        if total > 0:
            progress = round((done / total) * 100)
            if progress == 100:
                goal.status = "completed"
            continue


def _auto_progress_v2(workspace_id):
    """Enhanced progress: considers linked tasks, decisions, and time-based goals."""
    from datetime import datetime, timedelta
    from models.goal import Goal
    from models.task import Task
    from models.decision_log import DecisionLog
    now = datetime.utcnow()

    for goal in Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status.in_(["pending", "in_progress"]),
    ).all():
        # 1. Linked tasks
        linked_tasks = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id).all()
        total_tasks = len(linked_tasks)
        done_tasks = sum(1 for t in linked_tasks if t.status == "Done")

        # 2. Linked decisions (via goal_decisions join)
        linked_decisions = goal.linked_decisions
        total_decisions = len(linked_decisions)
        confirmed_decisions = sum(1 for d in linked_decisions if d.status in ("Confirmed", "Implemented"))

        # 3. Compute progress
        numerator = done_tasks + confirmed_decisions
        denominator = total_tasks + total_decisions

        if denominator > 0:
            progress = round((numerator / denominator) * 100)
        elif goal.date:
            # Time-based: elapsed vs total duration
            created = goal.created_at.date()
            deadline = goal.date
            total_days = (deadline - created).days if deadline > created else 1
            elapsed = (now.date() - created).days
            progress = min(round((elapsed / total_days) * 100), 99)
        else:
            continue

        # 4. Auto-transition
        children = Goal.query.filter_by(parent_id=goal.id, workspace_id=workspace_id).all()
        if children:
            # Parent goals roll up from their sub-goals. Never complete a parent
            # from linked decisions alone while its sub-goals are still open.
            child_statuses = set(c.status for c in children)
            if child_statuses == {"completed"}:
                goal.status = "completed"
                print(f"[GOAL] Auto-completed '{goal.title[:40]}' ({goal.goal_type}) \u2014 all sub-goals done")
            elif "in_progress" in child_statuses:
                goal.status = "in_progress"
            else:
                goal.status = "pending"
            continue

        if progress >= 100:
            goal.status = "completed"
            print(f"[GOAL] Auto-completed '{goal.title[:40]}' ({goal.goal_type}) \u2014 all linked work done")
            # Cascade: if parent exists and all sub-goals done -> complete parent
            if goal.parent_id:
                parent = Goal.query.get(goal.parent_id)
                if parent and parent.status != "completed":
                    siblings = Goal.query.filter_by(parent_id=goal.parent_id).all()
                    if all(s.status == "completed" for s in siblings):
                        parent.status = "completed"
                        print(f"[GOAL] Cascade: parent '{parent.title[:40]}' also completed")
        elif progress > 0 and goal.status == "pending":
            goal.status = "in_progress"
        elif progress == 0 and goal.status == "in_progress":
            goal.status = "pending"


def _stale_goal_detection(workspace_id, stale_days=5):
    """Flag goals with no linked activity for stale_days as at_risk."""
    from datetime import datetime, timedelta
    from models.goal import Goal
    from models.task import Task
    from models.decision_log import DecisionLog
    cutoff = datetime.utcnow() - timedelta(days=stale_days)

    for goal in Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status.in_(["pending", "in_progress"]),
    ).all():
        # Check linked tasks
        latest_task = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id).order_by(Task.updated_at.desc()).first()
        latest_decision = None
        if goal.linked_decisions:
            latest_decision = max(goal.linked_decisions, key=lambda d: d.created_at)

        latest_activity = None
        if latest_task and latest_task.updated_at:
            latest_activity = latest_task.updated_at
        if latest_decision and latest_decision.created_at:
            if not latest_activity or latest_decision.created_at > latest_activity:
                latest_activity = latest_decision.created_at

        if latest_activity and latest_activity < cutoff:
            goal.status = "at_risk"
            print(f"[GOAL] Stale: '{goal.title[:40]}' \u2014 no activity since {latest_activity.date()}")
        elif not latest_activity and goal.created_at < cutoff:
            goal.status = "at_risk"
            print(f"[GOAL] Stale: '{goal.title[:40]}' \u2014 never linked to any work")
