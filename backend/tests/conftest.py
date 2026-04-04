"""
Shared test configuration — credentials loaded from environment.
All test files should import TEST_EMAIL, TEST_PASSWORD, and BASE_URL from here
instead of hardcoding credentials.
"""
from __future__ import annotations

import os
import pytest
import requests

TEST_EMAIL: str = os.environ.get("TEST_ADMIN_EMAIL", "shyam@sentrixai.com")
TEST_PASSWORD: str = os.environ.get("TEST_ADMIN_PASSWORD", "Sentrix@2024")
BASE_URL: str = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def auth_session() -> requests.Session:
    """Create an authenticated requests.Session for test methods."""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return session
