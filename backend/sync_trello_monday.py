"""
Verify Trello and Monday tokens, then sync all task-tool data.
"""
import os
os.environ["LLM_DAILY_LIMIT"] = "500"
os.environ["LLM_ROUTING_STRATEGY"] = "qwen"
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

from app import app
with app.app_context():
    from models.user_integration import UserIntegration
    from pattern_engine.models import RawEvent
    from models.task import Task
    from models.activity_event import ActivityEvent
    from config.database import db
    from datetime import datetime
    from collections import Counter

    WID = 384

    # 1. Check tokens
    print("=" * 50)
    print("TOKEN STATUS")
    print("=" * 50)
    for provider in ["trello", "monday"]:
        ui = UserIntegration.query.filter_by(provider=provider).first()
        if ui:
            token_ok = bool(ui.access_token) and not ui.access_token.startswith("mock_")
            print(f"  {provider:8s}: {'✅ CONNECTED' if token_ok else '❌ BAD'} (token={ui.access_token[:25] if ui.access_token else 'NONE'}...)")
        else:
            print(f"  {provider:8s}: ❌ NO INTEGRATION ROW")

    # 2. Compile activity feed to fetch Trello and Monday data
    print("\n" + "=" * 50)
    print("COMPILING ACTIVITY FEED")
    print("=" * 50)
    from services.activity_compiler import compile_activity_feed
    result = compile_activity_feed(WID)
    print(f"  Activity feed compiled: {len(result) if result else 0} events")

    # 3. Check ActivityEvents created for trello and monday
    for provider in ["trello", "monday"]:
        events = ActivityEvent.query.filter_by(provider=provider, workspace_id=WID).all()
        print(f"  {provider} ActivityEvents: {len(events)}")
        for e in events[:5]:
            print(f"    [{e.id}] status={e.status:10s} title={e.title[:55]}")
        if len(events) > 5:
            print(f"    ... and {len(events)-5} more")

    # 4. Fetch raw events from ActivityEvents
    print("\n" + "=" * 50)
    print("CONVERTING TO RAW EVENTS")
    print("=" * 50)
    from pattern_engine.pipeline import _fetch_raw_events
    from pattern_engine.pipeline import _process_task_tool_events
    
    for provider in ["trello", "monday"]:
        raw = _fetch_raw_events([provider], WID)
        print(f"  {provider}: {len(raw)} new RawEvents created")

    # Also find any unprocessed raw events
    unprocessed = RawEvent.query.filter(
        RawEvent.source.in_(["trello", "monday"]),
        RawEvent.processed_at.is_(None),
    ).all()
    print(f"  Unprocessed trello/monday RawEvents: {len(unprocessed)}")

    # 5. Process task-tool events
    print("\n" + "=" * 50)
    print("PROCESSING TASK-TOOL EVENTS")
    print("=" * 50)
    all_tt_events = RawEvent.query.filter(
        RawEvent.source.in_(["linear", "trello", "asana", "monday"]),
        RawEvent.processing_status != 'done',
    ).all()
    print(f"  Unprocessed task-tool events: {len(all_tt_events)}")
    if all_tt_events:
        _process_task_tool_events(WID, all_tt_events)
        db.session.commit()
        print("  ✅ Events processed")

    # 6. Final Kanban state
    print("\n" + "=" * 50)
    print("FINAL KANBAN STATE")
    print("=" * 50)
    all_tasks = Task.query.filter_by(workspace_id=WID).all()
    by_source = Counter(t.source for t in all_tasks)
    by_status = Counter(t.status for t in all_tasks)
    print(f"Total tasks: {len(all_tasks)}")
    for src, cnt in by_source.most_common():
        print(f"  {src:15s}: {cnt}")
    print("Status:")
    for s in ["Not Started", "In Progress", "Blocked", "Done", "Cancelled"]:
        print(f"  {s:15s}: {by_status.get(s, 0)}")

    # Show new Trello and Monday tasks
    for provider in ["trello", "monday"]:
        tasks = Task.query.filter_by(workspace_id=WID, source=provider).all()
        if tasks:
            print(f"\n  {provider.upper()} tasks:")
            for t in tasks:
                print(f"    [{t.id}] [{t.status:15s}] {t.title[:55]}")
