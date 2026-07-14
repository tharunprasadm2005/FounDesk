from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
import services.notion_service as notion_service

notion_bp = Blueprint("notion_bp", __name__)


@notion_bp.route("/notion/validate", methods=["GET"])
@token_required
def validate_notion(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    ok, info = notion_service.validate_token(integration.access_token)
    if ok:
        return jsonify({"valid": True, "info": info})
    return jsonify({"valid": False, "error": info}), 401


@notion_bp.route("/notion/user", methods=["GET"])
@token_required
def get_notion_user(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    try:
        user = notion_service.get_user_info(integration.access_token)
        return jsonify(user)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@notion_bp.route("/notion/pages", methods=["GET"])
@token_required
def get_notion_pages(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    try:
        pages = notion_service.search_pages(integration.access_token, {"value": "page", "property": "object"})
        enriched = []
        for p in pages:
            enriched.append({
                "id": p.get("id"),
                "title": notion_service.extract_title(p),
                "url": p.get("url"),
                "created_time": p.get("created_time"),
                "last_edited_time": p.get("last_edited_time"),
                "object": p.get("object"),
                "archived": p.get("archived", False)
            })
        return jsonify(enriched)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@notion_bp.route("/notion/databases", methods=["GET"])
@token_required
def get_notion_databases(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    try:
        dbs = notion_service.search_pages(integration.access_token, {"value": "database", "property": "object"})
        enriched = []
        for db in dbs:
            title = notion_service.extract_title(db)
            enriched.append({
                "id": db.get("id"),
                "title": title,
                "url": db.get("url"),
                "created_time": db.get("created_time"),
                "last_edited_time": db.get("last_edited_time"),
                "object": db.get("object")
            })
        return jsonify(enriched)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@notion_bp.route("/notion/pages/<page_id>/blocks", methods=["GET"])
@token_required
def get_page_blocks(current_user_id, page_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    try:
        blocks = notion_service.get_block_children(integration.access_token, page_id, 50)
        flat = notion_service.flatten_blocks(blocks)
        return jsonify(flat)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@notion_bp.route("/notion/pages/<page_id>/comments", methods=["GET"])
@token_required
def get_page_comments(current_user_id, page_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    try:
        comments = notion_service.get_comments(integration.access_token, page_id, 30)
        enriched = []
        for c in comments:
            enriched.append({
                "id": c.get("id"),
                "text": "".join(r.get("plain_text", "") for r in c.get("rich_text", [])),
                "created_time": c.get("created_time"),
                "created_by": c.get("created_by", {})
            })
        return jsonify(enriched)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@notion_bp.route("/notion/databases/<database_id>/items", methods=["GET"])
@token_required
def get_database_items(current_user_id, database_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    try:
        items = notion_service.query_database(integration.access_token, database_id, 20)
        enriched = []
        for item in items:
            enriched.append({
                "id": item.get("id"),
                "title": notion_service.extract_title(item),
                "url": item.get("url"),
                "created_time": item.get("created_time"),
                "last_edited_time": item.get("last_edited_time"),
                "object": item.get("object")
            })
        return jsonify(enriched)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@notion_bp.route("/notion/items", methods=["GET"])
@token_required
def get_notion_items_route(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="notion"
    ).first()

    if not integration:
        return jsonify({"error": "Notion not connected"}), 400

    try:
        items = notion_service.get_notion_items(integration.access_token)
        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 502
