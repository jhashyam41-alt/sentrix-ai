"""
Test suite for Screening Hub endpoints:
- GET /api/screenings - List screenings with pagination, filters
- POST /api/screenings/run - Run a new screening
- GET /api/screenings/{id} - Get single screening record
"""
from __future__ import annotations

import pytest
import requests

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


class TestScreeningEndpoints:
    """Screening Hub API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        """Setup - login and get auth cookies"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.auth_token: str = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
        print(f"Login successful, token obtained")
    
    def test_list_screenings_returns_paginated_results(self):
        """GET /api/screenings should return paginated list with 30+ seeded records"""
        response = self.session.get(f"{BASE_URL}/api/screenings?page=1&limit=15")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "screenings" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        # Should have 30+ seeded records
        assert data["total"] >= 30, f"Expected 30+ records, got {data['total']}"
        assert len(data["screenings"]) <= 15, "Should return max 15 per page"
        print(f"Total screenings: {data['total']}, Page 1 has {len(data['screenings'])} records")
    
    def test_list_screenings_page_2(self):
        """GET /api/screenings page 2 should return more records"""
        response = self.session.get(f"{BASE_URL}/api/screenings?page=2&limit=15")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["page"] == 2
        assert len(data["screenings"]) > 0, "Page 2 should have records"
        print(f"Page 2 has {len(data['screenings'])} records")
    
    def test_list_screenings_filter_by_risk_level_high(self):
        """GET /api/screenings with risk_level=HIGH filter"""
        response = self.session.get(f"{BASE_URL}/api/screenings?risk_level=HIGH")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        for s in data["screenings"]:
            assert s["risk_level"] == "HIGH", f"Expected HIGH, got {s['risk_level']}"
        print(f"Found {len(data['screenings'])} HIGH risk screenings")
    
    def test_list_screenings_filter_by_risk_level_low(self):
        """GET /api/screenings with risk_level=LOW filter"""
        response = self.session.get(f"{BASE_URL}/api/screenings?risk_level=LOW")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        for s in data["screenings"]:
            assert s["risk_level"] == "LOW", f"Expected LOW, got {s['risk_level']}"
        print(f"Found {len(data['screenings'])} LOW risk screenings")
    
    def test_list_screenings_search_by_name(self):
        """GET /api/screenings with search filter"""
        # Search for a name that should exist in seeded data
        response = self.session.get(f"{BASE_URL}/api/screenings?search=Sharma")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        for s in data["screenings"]:
            assert "sharma" in s["full_name"].lower(), f"Search mismatch: {s['full_name']}"
        print(f"Found {len(data['screenings'])} screenings matching 'Sharma'")
    
    def test_screening_record_has_required_fields(self):
        """Verify screening records have all required fields"""
        response = self.session.get(f"{BASE_URL}/api/screenings?page=1&limit=1")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["screenings"]) > 0
        
        record = data["screenings"][0]
        required_fields = ["id", "full_name", "risk_score", "risk_level", "status", 
                          "checks_run", "created_at"]
        for field in required_fields:
            assert field in record, f"Missing field: {field}"
        
        # Verify risk_level is valid
        assert record["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        # Verify risk_score is 0-100
        assert 0 <= record["risk_score"] <= 100
        print(f"Record verified: {record['full_name']} - {record['risk_level']} ({record['risk_score']})")
    
    def test_run_screening_basic(self):
        """POST /api/screenings/run with basic data"""
        payload = {
            "fullName": "TEST_John Doe",
            "checks": ["sanctions", "pep"]
        }
        response = self.session.post(f"{BASE_URL}/api/screenings/run", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["full_name"] == "TEST_John Doe"
        assert "risk_score" in data
        assert "risk_level" in data
        assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert "sanctions_result" in data
        assert "pep_result" in data
        print(f"Screening result: {data['risk_level']} ({data['risk_score']})")
    
    def test_run_screening_with_all_checks(self):
        """POST /api/screenings/run with all checks enabled"""
        payload = {
            "fullName": "TEST_Priya Patel",
            "dateOfBirth": "1990-05-15",
            "nationality": "IN",
            "idType": "PAN",
            "idNumber": "ABCDE1234F",
            "checks": ["kyc", "sanctions", "pep", "adverse_media"]
        }
        response = self.session.post(f"{BASE_URL}/api/screenings/run", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["full_name"] == "TEST_Priya Patel"
        assert data["nationality"] == "IN"
        assert data["id_type"] == "PAN"
        
        # Verify all check results present
        assert "kyc_result" in data
        assert "sanctions_result" in data
        assert "pep_result" in data
        assert "adverse_media_result" in data
        
        # Verify checks_run list
        assert set(data["checks_run"]) == {"kyc", "sanctions", "pep", "adverse_media"}
        print(f"Full screening: {data['risk_level']} ({data['risk_score']}), KYC: {data.get('kyc_result', {}).get('status')}")
    
    def test_run_screening_without_name_fails(self):
        """POST /api/screenings/run without fullName should return 400"""
        payload = {"checks": ["sanctions"]}
        response = self.session.post(f"{BASE_URL}/api/screenings/run", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Correctly rejected screening without name")
    
    def test_run_screening_persists_record(self):
        """POST /api/screenings/run should persist the record"""
        import uuid
        unique_name = f"TEST_Persist_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "fullName": unique_name,
            "checks": ["sanctions", "pep"]
        }
        response = self.session.post(f"{BASE_URL}/api/screenings/run", json=payload)
        assert response.status_code == 200
        
        screening_id = response.json()["id"]
        
        # Verify we can fetch it
        get_response = self.session.get(f"{BASE_URL}/api/screenings/{screening_id}")
        assert get_response.status_code == 200, f"Failed to fetch: {get_response.text}"
        
        fetched = get_response.json()
        assert fetched["full_name"] == unique_name
        print(f"Persisted and fetched screening: {screening_id}")
    
    def test_get_single_screening(self):
        """GET /api/screenings/{id} returns single record"""
        # First get a screening ID from the list
        list_response = self.session.get(f"{BASE_URL}/api/screenings?page=1&limit=1")
        assert list_response.status_code == 200
        
        screening_id = list_response.json()["screenings"][0]["id"]
        
        # Fetch single record
        response = self.session.get(f"{BASE_URL}/api/screenings/{screening_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == screening_id
        print(f"Fetched single screening: {data['full_name']}")
    
    def test_get_nonexistent_screening_returns_404(self):
        """GET /api/screenings/{id} with invalid ID returns 404"""
        response = self.session.get(f"{BASE_URL}/api/screenings/nonexistent-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for nonexistent screening")
    
    def test_screening_result_structure(self):
        """Verify screening result has complete structure"""
        payload = {
            "fullName": "TEST_Structure Check",
            "nationality": "IN",
            "checks": ["sanctions", "pep"]
        }
        response = self.session.post(f"{BASE_URL}/api/screenings/run", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify sanctions_result structure
        if data.get("sanctions_result"):
            assert "status" in data["sanctions_result"]
            assert data["sanctions_result"]["status"] in ["clear", "match"]
        
        # Verify pep_result structure
        if data.get("pep_result"):
            assert "status" in data["pep_result"]
            assert data["pep_result"]["status"] in ["clear", "match"]
        
        # Verify matched_entities is a list
        assert isinstance(data.get("matched_entities", []), list)
        
        print(f"Structure verified: sanctions={data.get('sanctions_result', {}).get('status')}, pep={data.get('pep_result', {}).get('status')}")
    
    def test_high_risk_country_increases_score(self):
        """Screening with high-risk country should increase risk score"""
        # Iran is a FATF high-risk country
        payload = {
            "fullName": "TEST_High Risk Country",
            "nationality": "IR",
            "checks": ["sanctions", "pep"]
        }
        response = self.session.post(f"{BASE_URL}/api/screenings/run", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # Should have country_risk flag
        assert data.get("country_risk") is not None or data["risk_score"] > 5
        print(f"High-risk country screening: {data['risk_level']} ({data['risk_score']}), country_risk={data.get('country_risk')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
