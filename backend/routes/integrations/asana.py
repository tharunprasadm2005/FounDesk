import json
import requests
from flask import jsonify
from config.database import db
from models.user_integration import UserIntegration
from utils.auth import token_required
from routes.integrations.main import integrations_bp, validate_asana_token


@integrations_bp.route('/debug/asana', methods=['GET'])
@token_required
def debug_asana(current_user_id):
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='asana').first()
    if not integration or not integration.access_token:
        return jsonify({"error": "Asana not connected. Reconnect the integration."}), 400
    token = integration.access_token
    is_valid, user_info = validate_asana_token(token)
    if not is_valid:
        return jsonify({
            "error": user_info,
            "hint": "Delete this integration in Settings and reconnect Asana."
        }), 400
    headers = {"Authorization": f"Bearer {token}"}
    result = {"user": user_info}
    try:
        ws_res = requests.get("https://app.asana.com/api/1.0/workspaces", headers=headers, timeout=10)
        result["workspaces"] = ws_res.json() if ws_res.status_code == 200 else {
            "error": ws_res.text, "http_status": ws_res.status_code
        }
        result["projects"] = {"note": "no workspace found"}
        if ws_res.status_code == 200:
            workspaces = result["workspaces"].get("data", [])
            if workspaces:
                proj_res = requests.get(
                    f"https://app.asana.com/api/1.0/projects?workspace={workspaces[0]['gid']}",
                    headers=headers, timeout=10
                )
                result["projects"] = proj_res.json() if proj_res.status_code == 200 else {
                    "error": proj_res.text, "http_status": proj_res.status_code
                }
        result["tasks"] = {"note": "no project found"}
        if isinstance(result["projects"], dict) and result["projects"].get("data"):
            proj_gid = result["projects"]["data"][0]["gid"]
            task_res = requests.get(
                f"https://app.asana.com/api/1.0/tasks?project={proj_gid}",
                headers=headers, timeout=10
            )
            result["tasks"] = task_res.json() if task_res.status_code == 200 else {
                "error": task_res.text, "http_status": task_res.status_code
            }
        return jsonify(result)
    except requests.exceptions.Timeout:
        return jsonify({"error": "Asana API timed out"}), 502
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Could not connect to Asana API"}), 502
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
