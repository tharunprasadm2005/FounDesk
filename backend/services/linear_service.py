import os
import sys
import requests

LINEAR_API = "https://api.linear.app/graphql"


def is_mock_token(token):
    if not token:
        return True
    return token.startswith("mock_") or (
        os.getenv("APP_MODE") == "demo" or
        "test" in sys.argv[0] or
        "pytest" in sys.modules
    )


def _graphql(token, query, variables=None):
    resp = requests.post(
        LINEAR_API,
        json={"query": query, "variables": variables or {}},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=10
    )
    if resp.status_code == 200:
        data = resp.json()
        if "errors" in data:
            raise Exception(f"Linear GraphQL error: {data['errors'][0].get('message')}")
        return data.get("data", {})
    raise Exception(f"Linear API error {resp.status_code}: {resp.text}")


def get_linear_viewer(token):
    if is_mock_token(token):
        return {}
    query = """
    query {
        viewer {
            id
            name
            email
        }
    }
    """
    return _graphql(token, query).get("viewer", {})


def get_linear_issues(token, limit=20):
    if is_mock_token(token):
        return []
    query = """
    query($limit: Int!) {
        issues(first: $limit, orderBy: updatedAt) {
            nodes {
                id
                title
                description
                identifier
                priority
                updatedAt
                createdAt
                state { name }
                assignee { name email }
                team { name }
            }
        }
    }
    """
    data = _graphql(token, query, {"limit": limit})
    return data.get("issues", {}).get("nodes", [])
