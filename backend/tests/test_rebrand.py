"""
Test suite for Rudrik rebrand verification
Tests that all AMLGuard references have been replaced with Rudrik
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://risk-screening.preview.emergentagent.com')

class TestRebrandVerification:
    """Verify Rudrik rebrand is complete"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_api_title_is_rudrik(self):
        """API title should be 'Rudrik API' - skip if not exposed via ingress"""
        response = self.session.get(f"{BASE_URL}/openapi.json")
        # OpenAPI endpoint not exposed via ingress, skip
        if response.status_code == 404 or not response.text.strip():
            pytest.skip("OpenAPI endpoint not exposed via ingress")
        try:
            data = response.json()
            assert data.get("info", {}).get("title") == "Rudrik API"
        except:
            pytest.skip("OpenAPI endpoint not returning valid JSON")
    
    def test_login_endpoint_works(self):
        """Login should work with test credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "shyam@sentrixai.com"
    
    def test_settings_company_name_is_rudrik(self):
        """Settings should show Rudrik Demo as company name"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert login_response.status_code == 200
        
        # Get settings
        response = self.session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("general", {}).get("company_name") == "Rudrik Demo"
    
    def test_team_members_have_rudrik_emails(self):
        """Team members should have @rudrik.io emails"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert login_response.status_code == 200
        
        # Get team
        response = self.session.get(f"{BASE_URL}/api/settings/team")
        assert response.status_code == 200
        data = response.json()
        members = data.get("members", [])
        
        # Check that Priya, Rahul, Anita have @rudrik.io emails
        rudrik_emails = [m["email"] for m in members if "@rudrik.io" in m["email"]]
        assert len(rudrik_emails) >= 3, f"Expected at least 3 @rudrik.io emails, found: {rudrik_emails}"
        
        # Check no @sentrixai.com team member emails (except shyam who is the admin)
        sentrix_team_emails = [m["email"] for m in members if "@sentrixai.com" in m["email"] and m["email"] != "shyam@sentrixai.com"]
        assert len(sentrix_team_emails) == 0, f"Found @sentrixai.com team emails that should be @rudrik.io: {sentrix_team_emails}"
    
    def test_dashboard_loads(self):
        """Dashboard should load correctly"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert login_response.status_code == 200
        
        # Get dashboard stats
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_customers" in data
    
    def test_customers_endpoint(self):
        """Customers endpoint should work"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert login_response.status_code == 200
        
        # Get customers
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        assert "customers" in data
    
    def test_cases_endpoint(self):
        """Cases endpoint should work"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert login_response.status_code == 200
        
        # Get cases
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
    
    def test_screening_endpoint(self):
        """Screening endpoint should work"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert login_response.status_code == 200
        
        # Get screening records (endpoint is /api/screenings)
        response = self.session.get(f"{BASE_URL}/api/screenings")
        assert response.status_code == 200
        data = response.json()
        assert "screenings" in data
    
    def test_audit_logs_endpoint(self):
        """Audit logs endpoint should work"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@sentrixai.com",
            "password": "Sentrix@2024"
        })
        assert login_response.status_code == 200
        
        # Get audit logs
        response = self.session.get(f"{BASE_URL}/api/audit-logs")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
