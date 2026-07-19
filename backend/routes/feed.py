from flask import Blueprint, jsonify, request
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from models.activity_event import ActivityEvent
from models.pinned_item import PinnedItem
from config.database import db
from services.activity_compiler import compile_activity_feed
from services.decision_engine import extract_priority_actions, extract_alerts
from datetime import datetime, timedelta
import re
import hashlib

feed_bp = Blueprint('feed', __name__)

def extract_url(text):
    if not text:
        return None
    urls = re.findall(r'(https?://[^\s]+)', text)
    if urls:
        url = urls[0]
        if url.endswith(')'):
            url = url[:-1]
        return url
    return None


@feed_bp.route('/feed', methods=['GET'])
@token_required
def get_legacy_feed(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    per_page = min(per_page, 200)

    try:
        compile_activity_feed(workspace_id)
    except Exception as e:
        print("Warning: compile_activity_feed failed during legacy feed:", e)

    base = ActivityEvent.query.filter(ActivityEvent.workspace_id == workspace_id)
    total = base.count()

    events = base.order_by(ActivityEvent.external_timestamp.desc()).paginate(page=page, per_page=per_page, error_out=False)

    feed_data = []
    for ev in events.items:
        feed_data.append({
            "type": ev.activity_type or "",
            "source": ev.provider or "",
            "title": ev.title or "",
            "content": ev.details or "",
            "user": ev.actor or "Unknown",
            "timestamp": ev.external_timestamp.isoformat() if ev.external_timestamp else None,
            "priority": ev.priority or "normal"
        })

    return jsonify({
        "items": feed_data,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }), 200


def clean_task_title(name, status):
    if not name:
        return ""
    status_lower = status.lower() if status else ""
    if name.startswith(("✅", "🚧", "⚠️", "📋")):
        return name
        
    name_clean = name
    if name_clean.startswith("Monday:"):
        name_clean = name_clean[len("Monday:"):].strip()
    if name_clean.startswith("|") and name_clean.endswith("|"):
        parts = [p.strip() for p in name_clean.split("|") if p.strip()]
        if len(parts) >= 1:
            name_clean = parts[0]
            if len(parts) >= 2 and not status:
                status_lower = parts[1].lower()
                
    if any(s in status_lower for s in ("done", "complete", "finished", "won", "ready")):
        return f"✅ {name_clean} completed"
    elif any(s in status_lower for s in ("stuck", "blocked", "fail", "error", "critical")):
        return f"⚠️ {name_clean} blocked"
    elif any(s in status_lower for s in ("progress", "working", "run", "review")):
        return f"🚧 {name_clean} in progress"
    else:
        return f"📋 {name_clean} ({status if status else 'Pending'})"


def extract_actionable_signal(title, details, actor, provider):
    title_lower = title.lower() if title else ""
    details_lower = details.lower() if details else ""
    actor_lower = actor.lower() if actor else ""
    
    if any(k in title_lower or k in details_lower for k in ("downtime", "maintenance", "outage", "system upgrade")):
        return "⚠️ Service downtime announced"
        
    if any(k in title_lower or k in details_lower for k in ("approved", "approval", "activated", "live status")) and any(p in actor_lower or p in title_lower for p in ("stripe", "merchant", "payment")):
        return "✅ Merchant account approved"
        
    if any(k in title_lower or k in details_lower for k in ("credits applied", "credits loaded", "credit applied", "free credits")):
        return "💰 Startup cloud credits applied"
        
    if any(k in title_lower or k in details_lower for k in ("cors", "headers blocker", "preflight")):
        return "⚠️ Backend CORS block detected"
        
    if any(k in title_lower or k in details_lower for k in ("figma", "mockup", "wireframe", "prototype")):
        if any(k in title_lower or k in details_lower for k in ("review", "sync", "share", "preview")):
            return "🎨 Design assets review needed"
            
    if any(k in title_lower or k in details_lower for k in ("custom integration", "api custom", "client integration")):
        return "💡 Client request: Integration expansion"
        
    if any(k in title_lower or k in details_lower for k in ("seed round", "investor target", "funding sync", "pitch deck review")):
        return "🔴 Investor sync required"
        
    return title


def get_normalized_feed_data(workspace_id):
    events = ActivityEvent.query.filter_by(workspace_id=workspace_id).all()
    normalized_feed = []
    
    for ev in events:
        if not ev.provider or not ev.activity_type:
            continue
        source = ev.provider.lower()
        if source == 'google_calendar' or source == 'outlook_calendar' or source == 'calendly' or source == 'zoom' or source == 'google_meet':
            mapped_source = 'calendar'
        elif source == 'outlook':
            mapped_source = 'gmail'
        elif source == 'teams' or source == 'whatsapp':
            mapped_source = 'slack'
        elif source == 'notion_docs' or source == 'google_docs':
            mapped_source = 'docs'
        elif source == 'google_analytics' or source == 'posthog' or source == 'mixpanel' or source == 'amplitude':
            mapped_source = 'analytics'
        else:
            mapped_source = source

        act_type = ev.activity_type.lower()
        if act_type == 'email':
            mapped_type = 'email'
        elif act_type in ('message', 'chat'):
            mapped_type = 'message'
        elif act_type in ('task', 'issue', 'ticket'):
            mapped_type = 'task'
        elif act_type in ('event', 'meeting', 'calendar_event'):
            mapped_type = 'meeting'
        elif act_type in ('document', 'doc', 'wiki'):
            mapped_type = 'doc'
        elif act_type in ('pull_request', 'mr', 'commit', 'merge_request'):
            mapped_type = 'commit'
        else:
            mapped_type = act_type

        raw_title = ev.title or ""
        title_mapped = extract_actionable_signal(raw_title, ev.details, ev.actor, mapped_source)
        if mapped_type == 'task':
            final_title = clean_task_title(title_mapped, ev.status)
        else:
            final_title = title_mapped

        final_title = final_title or ""
        title_lower = final_title.lower()
        details_lower = (ev.details or "").lower()
        status_lower = ev.status.lower() if ev.status else ""
        
        priority = "low"
        is_stuck_task = False
        if mapped_type == 'task':
            if any(w in status_lower or w in title_lower or w in details_lower for w in ("stuck", "blocked", "critical", "danger")):
                is_stuck_task = True

        if is_stuck_task:
            priority = "high"
        elif mapped_source == 'gmail':
            priority = "high"
        elif mapped_source == 'calendar':
            is_soon = False
            if ev.external_timestamp:
                time_diff = ev.external_timestamp - datetime.utcnow()
                if timedelta(hours=-1) <= time_diff <= timedelta(hours=24):
                    is_soon = True
            
            high_keys = ["pitch", "demo", "investor", "board", "meeting"]
            if is_soon or any(k in title_lower for k in high_keys):
                priority = "high"
            else:
                priority = "medium"
        elif mapped_source == 'slack':
            high_keys = ["@you", "@founder", "urgent", "blocker", "critical", "help"]
            if any(k in title_lower or k in details_lower for k in high_keys):
                priority = "high"
            else:
                priority = "low"
        elif mapped_source == 'github':
            priority = "medium"
        elif mapped_type == 'task' or mapped_source == 'docs':
            priority = "medium"
        elif mapped_source == 'analytics':
            priority = ev.priority or "low"
        else:
            priority = "low"

        link = extract_url(ev.details)
        if not link and ev.provider == 'google_calendar' and ev.details and 'meet.google.com' in ev.details:
            meet_urls = re.findall(r'(https://meet\.google\.com/[^\s]+)', ev.details)
            if meet_urls:
                link = meet_urls[0]
        if not link:
            provider_links = {
                "slack": "https://slack.com/",
                "github": "https://github.com/",
                "gmail": "https://mail.google.com/",
                "calendar": "https://calendar.google.com/",
                "monday": "https://monday.com/",
                "notion": "https://notion.so/",
                "docs": "https://docs.google.com/",
                "analytics": "https://analytics.google.com/",
                "asana": "https://app.asana.com/",
                "linear": "https://linear.app/",
                "posthog": "https://us.posthog.com/",
                "mixpanel": "https://mixpanel.com/",
                "amplitude": "https://amplitude.com/",
                "hubspot": "https://app.hubspot.com/",
                "pipedrive": "https://app.pipedrive.com/",
                "zoho_crm": "https://crm.zoho.in/"
            }
            link = provider_links.get(ev.provider) or provider_links.get(mapped_source, "https://google.com/")

        # Stable hash generation
        timestamp_str = ev.external_timestamp.isoformat() if ev.external_timestamp else "1970-01-01T00:00:00"
        hash_input = f"{final_title}_{timestamp_str}_{mapped_source}"
        activity_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

        normalized_feed.append({
            "id": ev.id,
            "hash": activity_hash,
            "source": mapped_source,
            "type": mapped_type,
            "title": final_title,
            "description": ev.details or "",
            "timestamp": timestamp_str,
            "link": link,
            "priority": priority,
            "actor": ev.actor or "System"
        })

    normalized_feed.sort(
        key=lambda x: x["timestamp"] if x["timestamp"] else "1970-01-01T00:00:00",
        reverse=True
    )

    unique_feed = []
    seen_events = []
    
    for item in normalized_feed:
        title = item["title"] or ""
        ts_str = item["timestamp"]
        ts = None
        if ts_str:
            try:
                ts = datetime.fromisoformat(ts_str)
            except (ValueError, TypeError):
                ts = None
        
        cleaned_title = re.sub(r'[^a-zA-Z0-9]', '', title).lower()
        
        duplicate = False
        if ts:
            for seen_title, seen_ts in seen_events:
                if seen_title == cleaned_title or (len(seen_title) > 15 and (seen_title in cleaned_title or cleaned_title in seen_title)):
                    if abs((ts - seen_ts).total_seconds()) < 7200:
                        duplicate = True
                        break
        
        if not duplicate:
            unique_feed.append(item)
            if ts:
                seen_events.append((cleaned_title, ts))

    return unique_feed


@feed_bp.route('/unified-feed', methods=['GET'])
@token_required
def get_unified_feed(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    per_page = min(per_page, 200)

    newest_event = ActivityEvent.query.filter_by(workspace_id=workspace_id).order_by(ActivityEvent.fetched_at.desc()).first()
    should_compile = True
    if newest_event:
        time_since_fetch = datetime.utcnow() - newest_event.fetched_at
        if time_since_fetch < timedelta(seconds=45):
            should_compile = False

    if should_compile:
        try:
            compile_activity_feed(workspace_id)
        except Exception as e:
            print("Warning: compile_activity_feed failed during unified feed:", e)

    unique_feed = get_normalized_feed_data(workspace_id)
    total = len(unique_feed)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = unique_feed[start:end]

    blocked_count = 0
    important_emails = 0
    meetings_today = 0

    for item in unique_feed[:100]:
        title = (item.get("title") or "").lower()
        if "blocked" in title or "stuck" in title or (item.get("priority") == "high" and item.get("type") == "task"):
            blocked_count += 1
        if item.get("source") == "gmail" and item.get("priority") == "high":
            important_emails += 1
        if item.get("type") == "meeting":
            meetings_today += 1

    summary = {
        "blocked": blocked_count,
        "emails": important_emails,
        "meetings": meetings_today
    }

    return jsonify({
        "feed": page_items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "summary": summary
    }), 200


@feed_bp.route('/priority-actions', methods=['GET'])
@token_required
def get_priority_actions(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    unique_feed = get_normalized_feed_data(workspace_id)
    actions_payload = extract_priority_actions(unique_feed)
    return jsonify(actions_payload), 200


@feed_bp.route('/alerts', methods=['GET'])
@token_required
def get_alerts(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    unique_feed = get_normalized_feed_data(workspace_id)
    alerts_payload = extract_alerts(unique_feed)
    return jsonify(alerts_payload), 200


@feed_bp.route('/pinned-items', methods=['GET'])
@token_required
def get_pinned_items(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    pinned = PinnedItem.query.filter_by(user_id=current_user_id).all()
    pinned_hashes = {p.activity_hash for p in pinned}
    
    unique_feed = get_normalized_feed_data(workspace_id)
    pinned_feed_items = [item for item in unique_feed if item.get("hash") in pinned_hashes]
    
    return jsonify(pinned_feed_items), 200


@feed_bp.route('/pin-item', methods=['POST'])
@token_required
def pin_item(current_user_id):
    data = request.get_json() or {}
    activity_hash = data.get("activity_hash")
    if not activity_hash:
        return jsonify({"error": "activity_hash is required"}), 400

    existing = PinnedItem.query.filter_by(user_id=current_user_id, activity_hash=activity_hash).first()
    if existing:
        return jsonify({"message": "Item already pinned", "pinned_item": existing.to_dict()}), 200

    pinned = PinnedItem(user_id=current_user_id, activity_hash=activity_hash)
    db.session.add(pinned)
    db.session.commit()

    return jsonify({"message": "Pinned successfully", "pinned_item": pinned.to_dict()}), 201


@feed_bp.route('/pin-item/<string:activity_hash>', methods=['DELETE'])
@token_required
def unpin_item(current_user_id, activity_hash):
    pinned = PinnedItem.query.filter_by(user_id=current_user_id, activity_hash=activity_hash).first()
    if not pinned:
        return jsonify({"error": "Pinned item not found"}), 404

    db.session.delete(pinned)
    db.session.commit()

    return jsonify({"message": "Unpinned successfully"}), 200
