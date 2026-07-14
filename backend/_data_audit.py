import sys, os
from dotenv import load_dotenv; load_dotenv()
from app import app
from config.database import db
from collections import Counter

with app.app_context():
    from models.decision_log import DecisionLog
    from models.meeting_notes import MeetingNotes
    from models.goal import Goal
    from models.blocker import Blocker
    from models.follow_up import FollowUp
    from models.standup import Standup
    from models.knowledge_item import KnowledgeItem
    from models.chronicle_event import ChronicleEvent
    from models.task import Task
    from models.workspace import Workspace

    ws = Workspace.query.first()
    ws_id = ws.id
    print(f"Workspace: id={ws_id} name={ws.name}")

    # MEMORY: DECISION LOG
    decisions = DecisionLog.query.filter_by(workspace_id=ws_id).all()
    ai_decisions = [d for d in decisions if d.source == "ai_pattern_engine"]
    print(f"\n=== MEMORY: DECISION LOG ===")
    print(f"Total: {len(decisions)} | AI-inferred: {len(ai_decisions)}")
    for d in ai_decisions[:3]:
        print(f"  [{d.ai_status}] {d.decision[:60]} (src={d.source_integration})")

    # MEMORY: MEETING NOTES
    meetings = MeetingNotes.query.filter_by(workspace_id=ws_id).all()
    print(f"\n=== MEMORY: MEETING NOTES ===")
    print(f"Total: {len(meetings)}")
    for m in meetings[:3]:
        print(f"  {m.title[:50]} ({m.meeting_type}) src={m.source_integration} status={m.status}")

    # MEMORY: KNOWLEDGE TRANSFER
    knowledge = KnowledgeItem.query.filter_by(workspace_id=ws_id).all()
    print(f"\n=== MEMORY: KNOWLEDGE TRANSFER ===")
    print(f"Total: {len(knowledge)}")
    for k in knowledge[:3]:
        print(f"  [{k.knowledge_type}] {k.title[:50]} confidence={k.confidence}")

    # MEMORY: CHRONICLE
    chronicle = ChronicleEvent.query.filter_by(workspace_id=ws_id).order_by(ChronicleEvent.created_at.desc()).all()
    print(f"\n=== MEMORY: CHRONICLE TIMELINE ===")
    print(f"Total events: {len(chronicle)}")
    print(f"Chronological order: {all(chronicle[i].created_at >= chronicle[i+1].created_at for i in range(len(chronicle)-1))}")
    for c in chronicle[:5]:
        print(f"  [{c.event_type}] {c.title[:50]} stage={c.stage}")

    # PLAN: FOLLOW-UPS
    followups = FollowUp.query.filter_by(workspace_id=ws_id).all()
    print(f"\n=== PLAN: FOLLOW-UPS ===")
    print(f"Total: {len(followups)}")
    for f in followups[:3]:
        print(f"  {f.person_name} status={f.status} context={str(f.context)[:60]}")

    # PLAN: GOALS
    goals = Goal.query.filter_by(workspace_id=ws_id).all()
    print(f"\n=== PLAN: GOALS ===")
    print(f"Total: {len(goals)}")
    for g in goals[:5]:
        print(f"  [{g.goal_type}] {g.title[:50]} status={g.status} date={g.date}")

    # PLAN: ACTIVE PHASE
    print(f"\n=== PLAN: ACTIVE PHASE ===")
    print(f"  phase={ws.active_phase}")

    # EXECUTE: TASKS
    tasks = Task.query.filter_by(workspace_id=ws_id).all()
    src_counts = Counter(t.source_integration or "manual" for t in tasks)
    print(f"\n=== EXECUTE: TASKS (Kanban/List) ===")
    print(f"Total: {len(tasks)}")
    for src, count in sorted(src_counts.items()):
        print(f"  {src}: {count}")

    # EXECUTE: BLOCKERS
    blockers = Blocker.query.filter_by(workspace_id=ws_id).all()
    print(f"\n=== EXECUTE: BLOCKERS ===")
    print(f"Total: {len(blockers)}")
    for b in blockers[:3]:
        print(f"  {b.title[:50]} severity={b.severity} status={b.status} src={b.source_integration}")

    # EXECUTE: STANDUPS
    standups = Standup.query.filter_by(workspace_id=ws_id).order_by(Standup.date.desc()).all()
    print(f"\n=== EXECUTE: STANDUPS ===")
    print(f"Total: {len(standups)}")
    for s in standups[:3]:
        has_enrichment = "+AI" if "summary" in str(s.q2_today).lower() or len(str(s.q2_today)) > 50 else ""
        print(f"  date={s.date} q2={str(s.q2_today)[:70]} {has_enrichment}")

    # Summary
    print(f"\n{'='*60}")
    print(f"RECONCILIATION TABLE")
    print(f"{'='*60}")
    print(f"{'Section':<30} {'Count':<8} {'Source':<20}")
    print(f"{'-'*60}")
    print(f"{'Decision Log':<30} {len(ai_decisions):<8} {'AI (Qwen Job 1)':<20}")
    print(f"{'Meeting Notes':<30} {len(meetings):<8} {'AI (Qwen Job 3)':<20}")
    print(f"{'Knowledge Transfer':<30} {len(knowledge):<8} {'AI (Qwen Job 7)':<20}")
    print(f"{'Chronicle Timeline':<30} {len(chronicle):<8} {'Auto (all jobs)':<20}")
    print(f"{'Follow-ups':<30} {len(followups):<8} {'AI (Qwen Job 8)':<20}")
    print(f"{'Goals':<30} {len(goals):<8} {'AI (Qwen Jobs 5/10)':<20}")
    print(f"{'Blockers':<30} {len(blockers):<8} {'AI (Qwen Job 9)':<20}")
    print(f"{'Standups':<30} {len(standups):<8} {'AI (Qwen Job 6)':<20}")
    print(f"{'Tasks':<30} {len(tasks):<8} {'Sync (Linear/Trello/etc)':<20}")
    print(f"{'Active Phase':<30} {ws.active_phase:<8} {'Computed':<20}")
