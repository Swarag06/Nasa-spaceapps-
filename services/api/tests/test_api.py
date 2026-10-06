"""Unit tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from services.api.app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /health returns 200 with status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_get_targets_list():
    """Verify GET /targets returns a list containing mock-target."""
    response = client.get("/targets")
    assert response.status_code == 200
    targets = response.json()
    assert isinstance(targets, list)
    assert len(targets) >= 1

    target_ids = [t["id"] for t in targets]
    assert "mock-target" in target_ids

    # Check summary schema fields
    mock = next(t for t in targets if t["id"] == "mock-target")
    assert mock["title"] == "Mock target"
    assert mock["ra"] == 0.0
    assert mock["dec"] == 0.0
    assert mock["frame_count"] == 6


def test_get_target_frames_existing():
    """Verify GET /targets/mock-target/frames returns valid index.json schema."""
    response = client.get("/targets/mock-target/frames")
    assert response.status_code == 200
    data = response.json()

    assert data["target"] == "mock-target"
    assert data["title"] == "Mock target"
    assert data["ra"] == 0.0
    assert data["dec"] == 0.0
    assert isinstance(data["frames"], list)
    assert len(data["frames"]) == 6

    # Verify first frame metadata schema
    frame0 = data["frames"][0]
    assert frame0["file"] == "frame_000.webp"
    assert frame0["obs_id"] == "mock-000"
    assert "time_utc" in frame0
    assert "wavelength_um" in frame0
    assert frame0["detector"] == 1


def test_get_target_frames_not_found():
    """Verify GET /targets/{non_existent}/frames returns 404."""
    response = client.get("/targets/non-existent-target-999/frames")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_static_frames_served():
    """Verify static WebP frame can be retrieved via /static/frames."""
    response = client.get("/static/frames/mock-target/frame_000.webp")
    assert response.status_code == 200
    assert response.headers["content-type"] in ["image/webp", "application/octet-stream"]
    assert len(response.content) > 0
