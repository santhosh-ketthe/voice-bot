import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["status"] == "healthy"
    assert "uptime_seconds" in data


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    # When frontend/dist is built, root serves SPA index.html; otherwise JSON info
    content_type = response.headers.get("content-type", "")
    if "text/html" in content_type:
        assert "<!doctype html>" in response.text.lower()
        assert "root" in response.text
    else:
        data = response.json()
        assert data["status"] == "online"
        assert "/api/health" in data["health"]
