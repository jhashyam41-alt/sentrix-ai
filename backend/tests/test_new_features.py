"""
Test suite for Rudrik features:
- KYC Verification endpoints (Signzy mock)
- API Key management
- Public API v1 endpoints
- Quick screening endpoint
"""
from __future__ import annotations

import pytest
import requests
import time

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "super_admin"


class TestDashboard:
    """Dashboard endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check main stats
        assert "total_customers" in data
        assert "pending_reviews" in data
        assert "high_risk_customers" in data
        assert "open_cases" in data
        
        # Check risk distribution
        assert "risk_distribution" in data
        rd = data["risk_distribution"]
        assert "low" in rd
        assert "medium" in rd
        assert "high" in rd
        assert "unacceptable" in rd
        
        # Check screening stats
        assert "screening_stats" in data
        ss = data["screening_stats"]
        assert "pep_matches" in ss
        assert "sanctions_matches" in ss
        assert "adverse_media_hits" in ss
        
        # Check KYC stats
        assert "kyc_stats" in data
        kyc = data["kyc_stats"]
        assert "total" in kyc
        assert "verified" in kyc
        assert "failed" in kyc
        
        # Check CDD breakdown
        assert "cdd_breakdown" in data
        cdd = data["cdd_breakdown"]
        assert "sdd" in cdd
        assert "standard_cdd" in cdd
        assert "edd" in cdd
        
        # Check integrations
        assert "integrations" in data
        integrations = data["integrations"]
        assert "signzy" in integrations
        assert "opensanctions" in integrations
        
        # Check API usage (for super_admin)
        assert "api_usage" in data


class TestKYCVerification:
    """KYC Verification endpoint tests (Signzy mock)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_verify_pan_valid_format(self, auth_headers):
        """Test PAN verification with valid format"""
        response = requests.post(f"{BASE_URL}/api/kyc/verify-pan", 
            json={"panNumber": "ABCDE1234F", "fullName": "Test User"},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["verified", "failed"]  # Mock has 80% success rate
        assert "pan_number" in data
        assert data["pan_number"] == "ABCDE1234F"
        assert "mode" in data
        assert data["mode"] == "demo"
    
    def test_verify_pan_invalid_format(self, auth_headers):
        """Test PAN verification with invalid format"""
        response = requests.post(f"{BASE_URL}/api/kyc/verify-pan", 
            json={"panNumber": "INVALID", "fullName": "Test User"},
            headers=auth_headers)
        assert response.status_code == 400
    
    def test_verify_aadhaar_valid_format(self, auth_headers):
        """Test Aadhaar verification with valid format"""
        response = requests.post(f"{BASE_URL}/api/kyc/verify-aadhaar", 
            json={"aadhaarNumber": "123456789012"},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["verified", "failed"]
        assert "aadhaar_masked" in data
        assert data["aadhaar_masked"] == "XXXX-XXXX-9012"
        assert data["mode"] == "demo"
    
    def test_verify_aadhaar_invalid_format(self, auth_headers):
        """Test Aadhaar verification with invalid format"""
        response = requests.post(f"{BASE_URL}/api/kyc/verify-aadhaar", 
            json={"aadhaarNumber": "12345"},
            headers=auth_headers)
        assert response.status_code == 400
    
    def test_verify_passport_valid_format(self, auth_headers):
        """Test Passport verification with valid format"""
        response = requests.post(f"{BASE_URL}/api/kyc/verify-passport", 
            json={"passportNumber": "A1234567"},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["verified", "failed"]
        assert data["mode"] == "demo"
    
    def test_verify_voter_id_valid_format(self, auth_headers):
        """Test Voter ID verification with valid format"""
        response = requests.post(f"{BASE_URL}/api/kyc/verify-voter-id", 
            json={"voterIdNumber": "ABC1234567"},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["verified", "failed"]
        assert data["mode"] == "demo"
    
    def test_verify_driving_license_valid_format(self, auth_headers):
        """Test Driving License verification with valid format"""
        response = requests.post(f"{BASE_URL}/api/kyc/verify-driving-license", 
            json={"dlNumber": "KA0120201234567"},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["verified", "failed"]
        assert data["mode"] == "demo"
    
    def test_get_kyc_verifications(self, auth_headers):
        """Test getting KYC verification history for a customer"""
        # Use a test customer ID (may not exist, but endpoint should return empty list)
        response = requests.get(f"{BASE_URL}/api/kyc/verifications/test-customer-id", 
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "verifications" in data
        assert isinstance(data["verifications"], list)
    
    def test_kyc_status(self, auth_headers):
        """Test KYC integration status endpoint"""
        response = requests.get(f"{BASE_URL}/api/kyc/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "signzy" in data
        assert data["signzy"]["mode"] == "demo"


class TestAPIKeyManagement:
    """API Key management endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def created_key(self, auth_headers):
        """Create an API key for testing"""
        response = requests.post(f"{BASE_URL}/api/api-keys", 
            json={"client_name": "TEST_PyTestClient", "rate_limit": 60},
            headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_create_api_key(self, auth_headers):
        """Test creating a new API key"""
        response = requests.post(f"{BASE_URL}/api/api-keys", 
            json={"client_name": "TEST_NewClient", "rate_limit": 100},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "api_key" in data
        assert "secret_key" in data
        assert "client_name" in data
        assert data["client_name"] == "TEST_NewClient"
        assert data["api_key"].startswith("sk_test_")
    
    def test_create_api_key_missing_name(self, auth_headers):
        """Test creating API key without client name fails"""
        response = requests.post(f"{BASE_URL}/api/api-keys", 
            json={"rate_limit": 60},
            headers=auth_headers)
        assert response.status_code == 400
    
    def test_list_api_keys(self, auth_headers, created_key):
        """Test listing API keys"""
        response = requests.get(f"{BASE_URL}/api/api-keys", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "api_keys" in data
        assert isinstance(data["api_keys"], list)
        # Should have at least the created key
        assert len(data["api_keys"]) >= 1
    
    def test_get_api_usage(self, auth_headers):
        """Test getting API usage stats"""
        response = requests.get(f"{BASE_URL}/api/api-keys/usage", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_calls" in data
        assert "today_calls" in data
        assert "active_keys" in data
    
    def test_get_integration_status(self, auth_headers):
        """Test getting integration status"""
        response = requests.get(f"{BASE_URL}/api/api-keys/integration-status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "signzy" in data
        assert "opensanctions" in data
        assert data["signzy"]["mode"] == "demo"
        assert data["opensanctions"]["mode"] == "demo"
    
    def test_revoke_api_key(self, auth_headers, created_key):
        """Test revoking an API key"""
        key_id = created_key["id"]
        response = requests.put(f"{BASE_URL}/api/api-keys/{key_id}/revoke", 
            json={},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "API key revoked"


class TestPublicAPIv1:
    """Public API v1 endpoint tests (requires API key)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def api_key(self, auth_headers):
        """Create an API key for v1 testing"""
        response = requests.post(f"{BASE_URL}/api/api-keys", 
            json={"client_name": "TEST_V1Client", "rate_limit": 60},
            headers=auth_headers)
        assert response.status_code == 200
        return response.json()["api_key"]
    
    def test_v1_screen_missing_api_key(self):
        """Test v1/screen without API key fails"""
        response = requests.post(f"{BASE_URL}/api/v1/screen", 
            json={"name": "John Smith"})
        assert response.status_code == 401
    
    def test_v1_screen_with_api_key(self, api_key):
        """Test v1/screen with valid API key"""
        response = requests.post(f"{BASE_URL}/api/v1/screen", 
            json={"name": "John Smith", "checks": ["sanctions", "pep"]},
            headers={"X-API-Key": api_key})
        assert response.status_code == 200
        data = response.json()
        assert "screeningId" in data
        assert "status" in data
        assert data["status"] == "completed"
        assert "name" in data
        assert data["name"] == "John Smith"
        assert "mode" in data
        assert data["mode"] == "demo"
    
    def test_v1_screening_individual(self, api_key):
        """Test v1/screening/individual endpoint"""
        response = requests.post(f"{BASE_URL}/api/v1/screening/individual", 
            json={"name": "Jane Doe", "nationality": "US"},
            headers={"X-API-Key": api_key})
        assert response.status_code == 200
        data = response.json()
        assert "screening_id" in data
        assert "screened_name" in data
        assert data["screened_name"] == "Jane Doe"
        assert "risk_level" in data
        assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
        assert data["mode"] == "demo"
    
    def test_v1_screening_batch(self, api_key):
        """Test v1/screening/batch endpoint"""
        response = requests.post(f"{BASE_URL}/api/v1/screening/batch", 
            json={"individuals": [
                {"name": "Person One", "nationality": "US"},
                {"name": "Person Two", "nationality": "GB"}
            ]},
            headers={"X-API-Key": api_key})
        assert response.status_code == 200
        data = response.json()
        assert "batch_id" in data
        assert "summary" in data
        assert "results" in data
        assert data["summary"]["total"] == 2
        assert len(data["results"]) == 2
        assert data["mode"] == "demo"
    
    def test_v1_screening_batch_empty(self, api_key):
        """Test v1/screening/batch with empty array fails"""
        response = requests.post(f"{BASE_URL}/api/v1/screening/batch", 
            json={"individuals": []},
            headers={"X-API-Key": api_key})
        assert response.status_code == 400
    
    def test_v1_risk_score(self, api_key, auth_headers):
        """Test v1/risk/score endpoint"""
        # First create a customer to get a valid ID
        customer_response = requests.post(f"{BASE_URL}/api/customers", 
            json={
                "customer_type": "individual",
                "customer_data": {"full_name": "TEST_RiskScoreCustomer"}
            },
            headers=auth_headers)
        
        if customer_response.status_code == 200:
            customer_id = customer_response.json()["id"]
            
            response = requests.post(f"{BASE_URL}/api/v1/risk/score", 
                json={"customerId": customer_id},
                headers={"X-API-Key": api_key})
            assert response.status_code == 200
            data = response.json()
            assert "risk_score_id" in data
            assert "customer_id" in data
            assert "risk_score" in data
            assert "risk_level" in data
            assert "breakdown" in data
            assert "recommendations" in data
    
    def test_v1_risk_score_missing_customer_id(self, api_key):
        """Test v1/risk/score without customerId fails"""
        response = requests.post(f"{BASE_URL}/api/v1/risk/score", 
            json={},
            headers={"X-API-Key": api_key})
        assert response.status_code == 400


class TestQuickScreening:
    """Quick screening endpoint tests (authenticated)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_quick_screening_basic(self, auth_headers):
        """Test quick screening with basic name"""
        response = requests.post(f"{BASE_URL}/api/screening/run-quick", 
            json={"name": "John Smith", "checks": ["sanctions", "pep"]},
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "screeningId" in data
        assert "status" in data
        assert data["status"] == "completed"
        assert "name" in data
        assert data["name"] == "John Smith"
        assert "mode" in data
        assert data["mode"] == "demo"
    
    def test_quick_screening_with_kyc(self, auth_headers):
        """Test quick screening with KYC check"""
        response = requests.post(f"{BASE_URL}/api/screening/run-quick", 
            json={
                "name": "Test User",
                "checks": ["sanctions", "pep", "kyc"],
                "idType": "PAN",
                "idNumber": "ABCDE1234F"
            },
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "screeningId" in data
        assert "kyc" in data
        assert data["kyc"]["status"] in ["verified", "failed"]
    
    def test_quick_screening_missing_name(self, auth_headers):
        """Test quick screening without name fails"""
        response = requests.post(f"{BASE_URL}/api/screening/run-quick", 
            json={"checks": ["sanctions"]},
            headers=auth_headers)
        assert response.status_code == 400


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_api_keys(self, auth_headers):
        """Cleanup TEST_ prefixed API keys"""
        response = requests.get(f"{BASE_URL}/api/api-keys", headers=auth_headers)
        if response.status_code == 200:
            keys = response.json().get("api_keys", [])
            for key in keys:
                if key.get("client_name", "").startswith("TEST_") and key.get("is_active"):
                    requests.put(f"{BASE_URL}/api/api-keys/{key['id']}/revoke", 
                        json={}, headers=auth_headers)
        assert True  # Cleanup is best-effort
