import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path so routers and services can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

TEST_API_KEY = "test-ai-service-key-0123456789abcdef"
os.environ["AI_SERVICE_API_KEY"] = TEST_API_KEY

from main import app

client = TestClient(app, headers={"X-API-Key": TEST_API_KEY})
anon_client = TestClient(app)

def test_root_health_check():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "RetailMind AI"
    assert data["status"] == "running"

def test_forecast_rejects_insufficient_history():
    payload = {
        "product_id": "PROD-TEST-001",
        "history": [
            {"ds": "2026-10-01", "y": 10},
            {"ds": "2026-10-02", "y": 12},
            {"ds": "2026-10-03", "y": 11},
        ],
        "horizon_days": 7,
        "model_preference": "auto"
    }
    response = client.post("/api/v1/forecast", json=payload)
    assert response.status_code == 400
    assert "Insufficient data: minimum 5 days required" in response.json()["detail"]

def test_forecast_generates_predictions():
    # Provide 7 days of historical sales
    payload = {
        "product_id": "PROD-TEST-002",
        "history": [
            {"ds": "2026-10-01", "y": 20},
            {"ds": "2026-10-02", "y": 22},
            {"ds": "2026-10-03", "y": 25},
            {"ds": "2026-10-04", "y": 23},
            {"ds": "2026-10-05", "y": 28},
            {"ds": "2026-10-06", "y": 30},
            {"ds": "2026-10-07", "y": 32},
        ],
        "horizon_days": 5,
        "model_preference": "auto"
    }
    response = client.post("/api/v1/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == "PROD-TEST-002"
    assert len(data["forecasts"]) == 5
    assert data["confidence_score"] > 0
    assert "model_used" in data
    assert "generated_at" in data

def test_dynamic_pricing_calculation():
    payload = {
        "product_id": "PROD-PRICING-001",
        "current_price": 500.0,
        "cost_price": 300.0,
        "on_hand": 5,              # Critical low stock (<= safety_stock 10)
        "reorder_point": 25,
        "safety_stock": 10,
        "avg_daily_sales": 8.0,
        "forecast_demand": 12.0,   # Rising demand
        "category": "Electronics",
        "peak_months": [10, 11, 12],
        "current_month": 10        # Peak season
    }
    response = client.post("/api/v1/price", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == "PROD-PRICING-001"
    assert data["suggested_price"] > 500.0  # Low stock + peak season should raise price
    assert data["direction"] == "increase"
    assert "factors" in data

def test_model_evaluation_mape():
    payload = {
        "actuals": [100.0, 110.0, 105.0, 120.0, 115.0],
        "predicted": [98.0, 112.0, 104.0, 118.0, 116.0]
    }
    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "mape" in data
    assert "accuracy_percent" in data
    assert data["accuracy_percent"] > 95.0


def test_api_requires_key():
    response = anon_client.post("/api/v1/evaluate", json={"actuals": [1.0], "predicted": [1.0]})
    assert response.status_code == 401


def test_api_rejects_wrong_key():
    response = anon_client.post(
        "/api/v1/evaluate",
        json={"actuals": [1.0], "predicted": [1.0]},
        headers={"X-API-Key": "wrong"},
    )
    assert response.status_code == 401


def test_api_returns_503_when_key_unset(monkeypatch):
    monkeypatch.delenv("AI_SERVICE_API_KEY", raising=False)
    response = client.get("/api/v1/health")
    assert response.status_code == 503


def test_forecast_rejects_excessive_horizon():
    payload = {
        "product_id": "PROD-BOUNDS",
        "history": [{"ds": f"2026-10-0{i}", "y": 1} for i in range(1, 8)],
        "horizon_days": 366,
    }
    response = client.post("/api/v1/forecast", json=payload)
    assert response.status_code == 422


def test_batch_rejects_more_than_50():
    item = {
        "product_id": "P",
        "history": [{"ds": "2026-10-01", "y": 1}],
        "horizon_days": 1,
    }
    response = client.post("/api/v1/batch-forecast", json=[item] * 51)
    assert response.status_code in (400, 422)
