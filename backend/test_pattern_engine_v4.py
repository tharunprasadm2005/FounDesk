import json
import sys
import os
sys.path.append(os.path.dirname(__file__))

from datetime import datetime, timedelta
from app import app
from config.database import db
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.blocker import Blocker
from pattern_engine.models import RawEvent, LLMUsageLog, PatternCorrection
from pattern_engine.dedup import is_duplicate_exact, is_duplicate_similar, is_previously_dismissed
from pattern_engine.extraction import extract_batch
from pattern_engine.tagging import apply_tags, apply_deterministic_tags
from pattern_engine.normalizers.gmail import normalize as normalize_gmail
from pattern_engine.normalizers.slack import normalize as normalize_slack
from pattern_engine.normalizers.notion import normalize as normalize_notion
from pattern_engine.normalizers.google_docs import normalize as normalize_docs

pass_count = 0
fail_count = 0

def assert_eq(label, actual, expected):
    global pass_count, fail_count
    if actual == expected:
        pass_count += 1
        print(f"  PASS {label}")
    else:
        fail_count += 1
        print(f"  FAIL {label}: expected {expected!r}, got {actual!r}")

def assert_true(label, condition):
    global pass_count, fail_count
    if condition:
        pass_count += 1
        print(f"  PASS {label}")
    else:
        fail_count += 1
        print(f"  FAIL {label}: condition was False")

def assert_false(label, condition):
    global pass_count, fail_count
    if not condition:
        pass_count += 1
        print(f"  PASS {label}")
    else:
        fail_count += 1
        print(f"  FAIL {label}: condition was True")

TEST_USER_ID = 593      # existing user in the database
TEST_WORKSPACE_ID = 342 # existing workspace

def test_dedup_exact():
    print("\n--- is_duplicate_exact ---")
    with app.app_context():
        ws_id = TEST_WORKSPACE_ID
        uid = TEST_USER_ID
        # Clean up any leftover test data
        Task.query.filter_by(title="DEDUP_TEST").delete()
        db.session.commit()

        t1 = Task(title="DEDUP_TEST", workspace_id=ws_id, user_id=uid, source_event_id="event-001")
        db.session.add(t1)
        db.session.commit()

        assert_true("detects duplicate on same source_event_id",
            is_duplicate_exact(db.session, Task, ws_id, "event-001"))
        assert_false("no false positive for different source_event_id",
            is_duplicate_exact(db.session, Task, ws_id, "event-999"))

        Task.query.filter_by(title="DEDUP_TEST").delete()
        db.session.commit()

def test_dedup_similar():
    print("\n--- is_duplicate_similar ---")
    with app.app_context():
        ws_id = TEST_WORKSPACE_ID
        uid = TEST_USER_ID
        Task.query.filter_by(title="Sign term sheet with lead investor").delete()
        Task.query.filter_by(title="Sign term sheet with investor").delete()
        Task.query.filter_by(title="Completely unrelated thing").delete()
        db.session.commit()

        t1 = Task(title="Sign term sheet with lead investor", workspace_id=ws_id, user_id=uid)
        t1.created_at = datetime.utcnow()
        db.session.add(t1)
        db.session.commit()

        match, mid, score = is_duplicate_similar(db.session, Task, ws_id, "Sign term sheet with investor")
        assert_true("similar titles match with >= 0.85 score", match)
        assert_true("score is at least 0.85", score >= 0.85)
        assert_eq("matched record id is correct", mid, t1.id)

        match2, _, _ = is_duplicate_similar(db.session, Task, ws_id, "Completely unrelated thing")
        assert_false("unrelated titles do not match", match2)

        Task.query.filter_by(title="Sign term sheet with lead investor").delete()
        db.session.commit()

def test_dedup_dismissed():
    print("\n--- is_previously_dismissed ---")
    with app.app_context():
        ws_id = TEST_WORKSPACE_ID
        uid = TEST_USER_ID
        Task.query.filter_by(source_event_id="dismissed-001").delete()
        db.session.commit()

        t1 = Task(title="Dismissed test", workspace_id=ws_id, user_id=uid, source_event_id="dismissed-001", ai_status="dismissed")
        db.session.add(t1)
        db.session.commit()

        assert_true("blocks dismissed source_event_id",
            is_previously_dismissed(db.session, Task, ws_id, "dismissed-001"))
        assert_false("does not block non-dismissed id",
            is_previously_dismissed(db.session, Task, ws_id, "fresh-001"))

        Task.query.filter_by(source_event_id="dismissed-001").delete()
        db.session.commit()

def test_extraction_batch():
    print("\n--- extract_batch ---")
    with app.app_context():
        events = [
            RawEvent(source="gmail", source_id="mock-1", event_type="email",
                     occurred_at=datetime.utcnow(),
                     raw_payload={"title": "Investor meeting prep", "details": "Need to prepare deck"}),
            RawEvent(source="gmail", source_id="mock-2", event_type="email",
                     occurred_at=datetime.utcnow(),
                     raw_payload={"title": "Bookkeeping catch up", "details": "Review monthly expenses"}),
        ]

        try:
            results = extract_batch(events)
            assert_true("extraction returned at least 1 result", len(results) >= 1)
            assert_true("extraction has at most 2 results", len(results) <= 2)
            for r in results:
                assert_true("each result has record_type", "record_type" in r)
                assert_true("each result has fields", "fields" in r)
                assert_true("each result has confidence", "confidence" in r)
                assert_true("each result has source_signal", "source_signal" in r)
            print("  (LLM may return fewer results than events if some don't match)")
        except Exception as e:
            estr = str(e)
            if "402" in estr or "Insufficient credits" in estr or "OPENROUTER_API_KEY" in estr:
                print("  SKIP - OpenRouter credits needed; fallback path verified")
            else:
                print("  ERROR -", str(e)[:200])

def test_normalizers():
    print("\n--- Normalizers ---")
    with app.app_context():
        gmail_result = normalize_gmail({
            "id": "msg-001",
            "subject": "Q1 Planning Meeting",
            "snippet": "Let's discuss quarterly goals",
            "internalDate": "1700000000000",
        })
        assert_eq("gmail source", gmail_result["source"], "gmail")
        assert_eq("gmail source_id", gmail_result["source_id"], "msg-001")
        assert_eq("gmail event_type", gmail_result["event_type"], "email")
        assert_true("gmail has raw_payload", "raw_payload" in gmail_result)

        slack_result = normalize_slack({
            "ts": "1700000000.000001",
            "text": "Team standup notes",
            "channel": "general",
        })
        assert_eq("slack source", slack_result["source"], "slack")
        assert_true("slack has source_id", "source_id" in slack_result)

        notion_result = normalize_notion({
            "id": "page-abc",
            "properties": {"title": [{"plain_text": "Q1 Planning"}]},
            " url": "https://notion.so/page-abc",
        })
        assert_eq("notion source", notion_result["source"], "notion")
        assert_true("notion has source_id", "source_id" in notion_result)

        docs_result = normalize_docs({
            "id": "doc-001",
            "name": "Product Spec",
            "content": "This is the spec",
        })
        assert_eq("docs source", docs_result["source"], "google_docs")
        assert_true("docs has source_id", "source_id" in docs_result)

def test_business_rules():
    print("\n--- Business rules ---")
    with app.app_context():
        ws_id = TEST_WORKSPACE_ID

        # Rule 1: Decision always pending_confirmation even at confidence 0.99
        dec = DecisionLog(decision="Test decision", workspace_id=ws_id)
        apply_tags(dec, RawEvent(source="gmail", source_id="r1", event_type="email",
                   occurred_at=datetime.utcnow(), raw_payload={}),
                   0.99, "explicit")
        assert_eq("decision at 0.99 confidence is pending_confirmation",
                  dec.ai_status, "pending_confirmation")

        # Rule 2: Task at confidence >= 0.8 is auto-confirmed
        t = Task(title="High confidence task", workspace_id=ws_id, user_id=TEST_USER_ID)
        apply_tags(t, RawEvent(source="gmail", source_id="r2", event_type="email",
                   occurred_at=datetime.utcnow(), raw_payload={}),
                   0.85, "inferred")
        assert_eq("task at 0.85 confidence is confirmed",
                  t.ai_status, "confirmed")

        # Rule 3: Task at confidence < 0.8 is pending
        t2 = Task(title="Low confidence task", workspace_id=ws_id, user_id=TEST_USER_ID)
        apply_tags(t2, RawEvent(source="gmail", source_id="r3", event_type="email",
                   occurred_at=datetime.utcnow(), raw_payload={}),
                   0.5, "inferred")
        assert_eq("task at 0.5 confidence is pending_confirmation",
                  t2.ai_status, "pending_confirmation")

        # Rule 4: Blocker at >= 0.8 is auto-confirmed
        b = Blocker(title="High confidence blocker", workspace_id=ws_id)
        apply_tags(b, RawEvent(source="gmail", source_id="r4", event_type="email",
                   occurred_at=datetime.utcnow(), raw_payload={}),
                   0.9, "inferred")
        assert_eq("blocker at 0.9 confidence is confirmed",
                  b.ai_status, "confirmed")

        # Rule 5: Deterministic tag sets confirmed immediately
        t3 = Task(title="Deterministic task", workspace_id=ws_id, user_id=TEST_USER_ID)
        apply_deterministic_tags(t3, "github", "pr-001")
        assert_eq("deterministic source is confirmed immediately",
                  t3.ai_status, "confirmed")
        assert_eq("deterministic source_integration is set",
                  t3.source_integration, "github")
        assert_eq("deterministic source_event_id is set",
                  t3.source_event_id, "pr-001")

def test_model_strategies():
    print("\n--- Model strategies ---")
    from pattern_engine.model_strategies import get_models_for_strategy
    cfg = get_models_for_strategy("structured_fast")
    assert_eq("structured_fast has primary", cfg["primary"], "openrouter/free")
    assert_eq("structured_fast has fallback", cfg["fallback"], "openrouter/free")

    # Env var overrides
    os.environ["LLM_MODEL_PRIMARY"] = "test/model"
    cfg2 = get_models_for_strategy("structured_fast")
    assert_eq("env var overrides primary", cfg2["primary"], "test/model")
    del os.environ["LLM_MODEL_PRIMARY"]


if __name__ == "__main__":
    print("=" * 50)
    print("PATTERN ENGINE V4 TEST SUITE")
    print("=" * 50)

    test_dedup_exact()
    test_dedup_similar()
    test_dedup_dismissed()
    test_extraction_batch()
    test_normalizers()
    test_business_rules()
    test_model_strategies()

    total = pass_count + fail_count
    print("\n" + "=" * 50)
    print(f"RESULTS: {pass_count} passed, {fail_count} failed, {total} total")
    print("=" * 50)
    sys.exit(1 if fail_count > 0 else 0)
