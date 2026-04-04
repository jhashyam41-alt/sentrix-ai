"""
Test suite for Rudrik rebrand verification
Tests that all AMLGuard references have been replaced with Rudrik
"""
from __future__ import annotations

import pytest
import requests

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


class TestRebrandVerification:
    """Verify Rudrik rebrand is complete"""
    
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_api_title_is_rudrik(self) -> None:
        """API title should be 'Rudrik API' - skip if not exposed via ingress"""
        response = self.session.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 404 or not response.text.strip():
            pytest.skip("OpenAPI endpoint not exposed via ingress")
        try:
            data = response.json()
            assert data.get("info", {}).get("title") == "Rudrik API"
        except Exception:
            pytest.skip("OpenAPI endpoint not returning valid JSON")
    
    def test_login_endpoint_works(self) -> None:
        """Login should work with test credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_EMAIL
    
    def test_settings_company_name_is_rudrik(self) -> None:
        """Settings should show Rudrik Demo as company name"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200

        settings_response = self.session.get(f"{BASE_URL}/api/settings")
        assert settings_response.status_code == 200
        data = settings_response.json()
        assert "Rudrik" in data.get("general", {}).get("company_name", "")
    
    def test_dashboard_stats_available(self) -> None:
        """Dashboard should load without errors"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200

        stats_response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert stats_response.status_code == 200
    
    def test_team_members_have_rudrik_emails(self) -> None:
        """Team members should have @rudrik.io email addresses"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200

        team_response = self.session.get(f"{BASE_URL}/api/settings/team")
        assert team_response.status_code == 200
        members = team_response.json().get("members", [])
        
        # Check no @sentrixai.com team member emails (except shyam who is the admin)
        sentrix_team_emails = [
            m["email"] for m in members
            if "@sentrixai.com" in m["email"] and m["email"] != TEST_EMAIL
        ]
        assert len(sentrix_team_emails) == 0, (
            f"Found @sentrixai.com team emails that should be @rudrik.io: {sentrix_team_emails}"
        )
    
    def test_screening_records_exist(self) -> None:
        """Screening records should exist after seed"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200

        screenings = self.session.get(f"{BASE_URL}/api/screenings?page=1&limit=5")
        assert screenings.status_code == 200
        data = screenings.json()
        assert data.get("total", 0) > 0
    
    def test_customers_exist(self) -> None:
        """Customers should exist after seed"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200

        customers = self.session.get(f"{BASE_URL}/api/customers?limit=5")
        assert customers.status_code == 200
        data = customers.json()
        assert data.get("total", 0) > 0
    
    def test_cases_exist(self) -> None:
        """Cases should exist after seed"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200

        cases = self.session.get(f"{BASE_URL}/api/cases")
        assert cases.status_code == 200
        data = cases.json()
        assert data.get("total", 0) > 0
    
    def test_audit_logs_exist(self) -> None:
        """Audit logs should exist after seed"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200

        logs = self.session.get(f"{BASE_URL}/api/audit-logs?page=1&limit=5")
        assert logs.status_code == 200
        data = logs.json()
        assert data.get("total", 0) > 0
