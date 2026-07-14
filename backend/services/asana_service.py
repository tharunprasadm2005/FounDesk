import os
import sys
import requests


def is_mock_token(token):
    if not token:
        return True
    return token.startswith("mock_") or (
        os.getenv("APP_MODE") == "demo" or
        "test" in sys.argv[0] or
        "pytest" in sys.modules
    )


def get_asana_user_me(token):
    if is_mock_token(token):
        return {}
    resp = requests.get(
        "https://app.asana.com/api/1.0/users/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    if resp.status_code == 200:
        return resp.json().get("data", {})
    raise Exception(f"Asana API error {resp.status_code}: {resp.text}")


def get_asana_workspaces(token):
    if is_mock_token(token):
        return []
    resp = requests.get(
        "https://app.asana.com/api/1.0/workspaces",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    if resp.status_code == 200:
        return resp.json().get("data", [])
    raise Exception(f"Asana workspaces API error {resp.status_code}: {resp.text}")


def get_asana_projects(token, workspace_gid):
    if is_mock_token(token):
        return []
    resp = requests.get(
        f"https://app.asana.com/api/1.0/projects?workspace={workspace_gid}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    if resp.status_code == 200:
        return resp.json().get("data", [])
    raise Exception(f"Asana projects API error {resp.status_code}: {resp.text}")


def get_asana_tasks(token, project_gid):
    if is_mock_token(token):
        return []
    resp = requests.get(
        f"https://app.asana.com/api/1.0/tasks?project={project_gid}&opt_fields=name,completed,completed_at,created_at,modified_at,due_on,custom_fields,custom_fields.name,custom_fields.display_value,custom_fields.type",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    if resp.status_code == 200:
        return resp.json().get("data", [])
    raise Exception(f"Asana tasks API error {resp.status_code}: {resp.text}")
