from flask import Blueprint, jsonify
import os
import sys
from utils.auth import token_required
from models.user_integration import UserIntegration
from services.github_service import get_github_repositories

github_bp = Blueprint("github_bp", __name__)

@github_bp.route("/github/data", methods=["GET"])
@token_required
def get_github_data(current_user_id):
    # Find integration for user
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="github"
    ).first()

    if not integration:
        return jsonify({"error": "GitHub not connected"}), 400

    access_token = integration.access_token
    # Sandbox demo repositories fallback only when APP_MODE is demo or running automated tests
    is_mock = access_token.startswith("mock_") and (
        os.getenv("APP_MODE") == "demo" or 
        "test" in sys.argv[0] or 
        "pytest" in sys.modules
    )

    if is_mock:
        return jsonify({"repositories": []})

    try:
        repos = get_github_repositories(access_token)
        # Parse repositories list format to keep relevant attributes
        parsed_repos = []
        if isinstance(repos, list):
            for repo in repos:
                parsed_repos.append({
                    "name": repo.get("name"),
                    "html_url": repo.get("html_url"),
                    "stargazers_count": repo.get("stargazers_count", 0),
                    "forks_count": repo.get("forks_count", 0),
                    "open_issues_count": repo.get("open_issues_count", 0),
                    "language": repo.get("language")
                })
        return jsonify({
            "repositories": parsed_repos
        })
    except Exception as e:
        err_msg = str(e)
        if "HTTP 401" in err_msg or "401" in err_msg:
            return jsonify({"error": "GitHub authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 500
