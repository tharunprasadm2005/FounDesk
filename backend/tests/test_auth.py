import json
from unittest.mock import patch

class TestAuth:
    def test_signup_success(self, client):
        resp = client.post("/api/auth/signup", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "StrongPass1!",
        })
        data = resp.get_json()
        print(f"[DEBUG] signup response: {resp.status_code} {data}")
        assert resp.status_code in (200, 201), f"Expected 200/201, got {resp.status_code}: {data}"
        assert "token" in data, f"No token in response: {data}"
        assert "refresh_token" in data, f"No refresh_token in response: {data}"

    def test_signup_missing_fields(self, client):
        resp = client.post("/api/auth/signup", json={"name": "Test"})
        assert resp.status_code == 400

    def test_signup_weak_password(self, client):
        resp = client.post("/api/auth/signup", json={
            "name": "Test",
            "email": "test2@example.com",
            "password": "short",
        })
        assert resp.status_code == 400

    def test_login_success(self, client):
        client.post("/api/auth/signup", json={
            "name": "Test User", "email": "login@example.com", "password": "StrongPass1!",
        })
        resp = client.post("/api/auth/login", json={
            "email": "login@example.com", "password": "StrongPass1!",
        })
        data = resp.get_json()
        print(f"[DEBUG] login response: {resp.status_code} {data}")
        assert resp.status_code in (200, 201), f"Expected 200/201, got {resp.status_code}: {data}"
        assert "token" in data, f"No token in response: {data}"

    def test_login_invalid_credentials(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com", "password": "WrongPass1!",
        })
        assert resp.status_code == 401
