import json

class TestWorkspaces:
    def test_create_workspace_unauthenticated(self, client):
        resp = client.post("/api/workspaces", json={"name": "Test WS"})
        assert resp.status_code == 401

    def test_get_workspaces_unauthenticated(self, client):
        resp = client.get("/api/workspaces")
        assert resp.status_code == 401
