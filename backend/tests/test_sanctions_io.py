"""
Tests for Sanctions.io API integration endpoints.
Tests: GET /api/settings/screening-status, POST /api/settings/sanctions-api-key, 
       DELETE /api/settings/sanctions-api-key, POST /api/screenings/run
"""
import pytest
import requests

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with auth token."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestScreeningStatus:
    """Tests for GET /api/settings/screening-status endpoint."""
    
    def test_get_screening_status_returns_demo_mode(self, auth_headers):
        """Test that screening status returns demo mode when no API key configured."""
        response = requests.get(
            f"{BASE_URL}/api/settings/screening-status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "sanctions_io" in data
        sanctions_io = data["sanctions_io"]
        
        # Verify demo mode fields
        assert sanctions_io["mode"] == "demo"
        assert sanctions_io["provider"] == "Sanctions.io"
        assert sanctions_io["api_key_configured"] == False
        assert "lists" in sanctions_io
    
    def test_get_screening_status_requires_auth(self):
        """Test that screening status endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/settings/screening-status")
        assert response.status_code == 401


class TestSanctionsApiKey:
    """Tests for POST/DELETE /api/settings/sanctions-api-key endpoints."""
    
    def test_save_invalid_api_key_returns_400(self, auth_headers):
        """Test that saving an invalid API key returns 400 error."""
        response = requests.post(
            f"{BASE_URL}/api/settings/sanctions-api-key",
            headers=auth_headers,
            json={"api_key": "invalid-test-key-12345"}
        )
        
        # Should return 400 for invalid key
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_save_empty_api_key_removes_key(self, auth_headers):
        """Test that saving empty API key removes the key and switches to demo mode."""
        response = requests.post(
            f"{BASE_URL}/api/settings/sanctions-api-key",
            headers=auth_headers,
            json={"api_key": ""}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "removed"
        assert data["mode"] == "demo"
    
    def test_delete_api_key_switches_to_demo(self, auth_headers):
        """Test that deleting API key switches to demo mode."""
        response = requests.delete(
            f"{BASE_URL}/api/settings/sanctions-api-key",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "removed"
        assert data["mode"] == "demo"
    
    def test_save_api_key_requires_auth(self):
        """Test that saving API key requires authentication."""
        response = requests.post(
            f"{BASE_URL}/api/settings/sanctions-api-key",
            json={"api_key": "test-key"}
        )
        assert response.status_code == 401
    
    def test_delete_api_key_requires_auth(self):
        """Test that deleting API key requires authentication."""
        response = requests.delete(f"{BASE_URL}/api/settings/sanctions-api-key")
        assert response.status_code == 401


class TestScreeningRun:
    """Tests for POST /api/screenings/run endpoint with Sanctions.io integration."""
    
    def test_run_screening_demo_mode_sanctions_only(self, auth_headers):
        """Test running screening with sanctions check only in demo mode."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_Sanctions_Check",
                "nationality": "US",
                "checks": ["sanctions"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify basic structure
        assert "id" in data
        assert data["full_name"] == "TEST_Sanctions_Check"
        assert data["mode"] == "demo"
        assert data["provider"] == "demo"
        assert "sanctions" in data["checks_run"]
        
        # Verify sanctions result structure
        assert "sanctions_result" in data
        assert data["sanctions_result"]["status"] in ["match", "clear"]
    
    def test_run_screening_demo_mode_all_checks(self, auth_headers):
        """Test running screening with all checks (sanctions, pep, adverse_media) in demo mode."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_All_Checks",
                "nationality": "IN",
                "checks": ["sanctions", "pep", "adverse_media"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all checks were run
        assert "sanctions" in data["checks_run"]
        assert "pep" in data["checks_run"]
        assert "adverse_media" in data["checks_run"]
        
        # Verify all result structures exist
        assert "sanctions_result" in data
        assert "pep_result" in data
        assert "adverse_media_result" in data
        
        # Verify demo mode
        assert data["mode"] == "demo"
        assert data["provider"] == "demo"
    
    def test_run_screening_returns_risk_score(self, auth_headers):
        """Test that screening returns risk score and level."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_Risk_Score",
                "checks": ["sanctions", "pep"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify risk scoring
        assert "risk_score" in data
        assert isinstance(data["risk_score"], int)
        assert 0 <= data["risk_score"] <= 100
        
        assert "risk_level" in data
        assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    
    def test_run_screening_with_high_risk_country(self, auth_headers):
        """Test screening with FATF high-risk country (Iran)."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_High_Risk_Country",
                "nationality": "IR",  # Iran - FATF high-risk
                "checks": ["sanctions", "pep"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify country risk flag
        assert data["country_risk"] == True
        # Risk score should be elevated due to high-risk country
        assert data["risk_score"] >= 15  # Base 5 + 10 for country risk
    
    def test_run_screening_requires_fullname(self, auth_headers):
        """Test that screening requires fullName field."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "nationality": "US",
                "checks": ["sanctions"]
            }
        )
        
        assert response.status_code == 400
    
    def test_run_screening_requires_auth(self):
        """Test that screening endpoint requires authentication."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            json={"fullName": "Test", "checks": ["sanctions"]}
        )
        assert response.status_code == 401
    
    def test_run_screening_returns_matched_entities(self, auth_headers):
        """Test that screening returns matched entities array."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_Matched_Entities",
                "checks": ["sanctions", "pep", "adverse_media"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify matched_entities array exists
        assert "matched_entities" in data
        assert isinstance(data["matched_entities"], list)
        
        # If there are matches, verify structure
        if data["matched_entities"]:
            match = data["matched_entities"][0]
            assert "id" in match
            assert "caption" in match
            assert "score" in match
            assert "match_type" in match


class TestScreeningHistory:
    """Tests for GET /api/screenings endpoint."""
    
    def test_get_screenings_list(self, auth_headers):
        """Test fetching screening history."""
        response = requests.get(
            f"{BASE_URL}/api/screenings",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "screenings" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
    
    def test_get_screenings_with_risk_filter(self, auth_headers):
        """Test filtering screenings by risk level."""
        response = requests.get(
            f"{BASE_URL}/api/screenings?risk_level=LOW",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned screenings should have LOW risk level
        for screening in data.get("screenings", []):
            assert screening["risk_level"] == "LOW"


class TestScreeningWithApiKeyInBody:
    """Tests for new feature: passing api_key in request body to /api/screenings/run."""
    
    def test_run_screening_without_api_key_returns_demo_mode(self, auth_headers):
        """Test that screening without api_key in body returns demo mode results."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_No_ApiKey",
                "nationality": "US",
                "checks": ["sanctions", "pep", "adverse_media"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should be in demo mode when no api_key provided
        assert data["mode"] == "demo"
        assert data["provider"] == "demo"
        # Should NOT have api_error since we didn't try live mode
        assert "api_error" not in data or data.get("api_error") is None
    
    def test_run_screening_with_fake_api_key_falls_back_to_demo(self, auth_headers):
        """Test that screening with invalid api_key falls back to demo with api_error field."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_Fake_ApiKey",
                "nationality": "US",
                "checks": ["sanctions", "pep"],
                "api_key": "fake-invalid-api-key-12345"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should fall back to demo mode
        assert data["mode"] == "demo"
        # Should have api_error field indicating the live call failed
        assert "api_error" in data
        assert data["api_error"] is not None
        assert len(data["api_error"]) > 0
        
        # Should still return valid screening results (demo data)
        assert "risk_score" in data
        assert "risk_level" in data
        assert "sanctions_result" in data
    
    def test_run_screening_with_api_key_returns_proper_structure(self, auth_headers):
        """Test that screening with api_key returns proper response structure."""
        response = requests.post(
            f"{BASE_URL}/api/screenings/run",
            headers=auth_headers,
            json={
                "fullName": "TEST_ApiKey_Structure",
                "nationality": "IN",
                "dateOfBirth": "1990-01-15",
                "checks": ["sanctions", "pep", "adverse_media"],
                "api_key": "test-key-for-structure"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        assert "id" in data
        assert "full_name" in data
        assert "risk_score" in data
        assert "risk_level" in data
        assert "mode" in data
        assert "provider" in data
        assert "sanctions_result" in data
        assert "pep_result" in data
        assert "adverse_media_result" in data
        assert "matched_entities" in data
        assert "checks_run" in data
        
        # Verify checks were run
        assert "sanctions" in data["checks_run"]
        assert "pep" in data["checks_run"]
        assert "adverse_media" in data["checks_run"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
