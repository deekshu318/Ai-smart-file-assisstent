import pytest
import time
from fastapi.testclient import TestClient
from src.api import app

client = TestClient(app)

def test_register_strong_password():
    unique_suffix = int(time.time() * 1000)
    payload = {
        "full_name": "Test User",
        "username": f"user_{unique_suffix}",
        "email": f"user_{unique_suffix}@example.com",
        "password": "Strong123!"
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_register_short_password():
    unique_suffix = int(time.time() * 1000)
    payload = {
        "full_name": "Test User",
        "username": f"user_{unique_suffix}",
        "email": f"user_{unique_suffix}@example.com",
        "password": "St12!" # 5 chars
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 400
    assert "at least 8 characters" in response.json()["detail"]

def test_register_no_uppercase():
    unique_suffix = int(time.time() * 1000)
    payload = {
        "full_name": "Test User",
        "username": f"user_{unique_suffix}",
        "email": f"user_{unique_suffix}@example.com",
        "password": "strong123!" # no caps
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 400
    assert "at least one uppercase letter" in response.json()["detail"]

def test_register_no_digit():
    unique_suffix = int(time.time() * 1000)
    payload = {
        "full_name": "Test User",
        "username": f"user_{unique_suffix}",
        "email": f"user_{unique_suffix}@example.com",
        "password": "Strong!!!" # no digit
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 400
    assert "at least one number" in response.json()["detail"]

def test_register_no_special_character():
    unique_suffix = int(time.time() * 1000)
    payload = {
        "full_name": "Test User",
        "username": f"user_{unique_suffix}",
        "email": f"user_{unique_suffix}@example.com",
        "password": "Strong123" # no special character
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 400
    assert "at least one special character" in response.json()["detail"]
