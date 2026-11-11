import os


class TestRouting:
    def test_health_get_and_head(self, client):
        resp_get = client.get("/health")
        assert resp_get.status_code == 200
        assert resp_get.get_json()["status"] == "ok"

        resp_head = client.head("/health")
        assert resp_head.status_code == 200

    def test_api_unknown_route_returns_json_404(self, client):
        resp = client.get("/api/nonexistent-endpoint")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data is not None
        assert data.get("error") == "Not found"

    def test_frontend_spa_serving(self, client):
        resp_root = client.get("/")
        # If frontend/dist is built, it returns 200 with index.html; otherwise 404 JSON
        if resp_root.status_code == 200:
            assert b"html" in resp_root.data.lower() or b"<!doctype html>" in resp_root.data.lower()
            # Test SPA client-side routes (direct navigation and page refresh)
            resp_login = client.get("/login")
            assert resp_login.status_code == 200
            assert resp_login.data == resp_root.data

            resp_dashboard = client.get("/dashboard")
            assert resp_dashboard.status_code == 200
            assert resp_dashboard.data == resp_root.data
        else:
            assert resp_root.status_code == 404

