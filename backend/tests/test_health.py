class TestHealth:
    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"
        assert "uptime" in data
        assert "service" in data

    def test_ready_endpoint(self, client):
        resp = client.get("/health/ready")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ready"

    def test_live_endpoint(self, client):
        resp = client.get("/health/live")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "alive"
