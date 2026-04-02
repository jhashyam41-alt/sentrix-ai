"""
Test Case Management Module for AMLGuard
Tests: Cases CRUD, Notes, Escalation, SAR Filing, Case Closure, Auto-case creation on screening
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://risk-screening.preview.emergentagent.com').rstrip('/')

# Test credentials from environment
TEST_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')
EXISTING_CUSTOMER_ID = os.environ.get('TEST_CUSTOMER_ID', '')


class TestAuthentication:
    """Authentication tests - run first"""
    
    def test_login_success(self, api_client):
        """Test login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestCasesListEndpoint:
    """Test GET /api/cases endpoint"""
    
    def test_list_cases_success(self, authenticated_client):
        """Test listing all cases"""
        response = authenticated_client.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200, f"Failed to list cases: {response.text}"
        data = response.json()
        assert "cases" in data
        assert "total" in data
        assert isinstance(data["cases"], list)
        print(f"✓ Listed {len(data['cases'])} cases (total: {data['total']})")
    
    def test_list_cases_filter_by_status(self, authenticated_client):
        """Test filtering cases by status"""
        response = authenticated_client.get(f"{BASE_URL}/api/cases?status=open")
        assert response.status_code == 200
        data = response.json()
        # All returned cases should have status=open
        for case in data["cases"]:
            assert case["status"] == "open", f"Case {case['case_id']} has status {case['status']}, expected 'open'"
        print(f"✓ Status filter working - {len(data['cases'])} open cases")
    
    def test_list_cases_filter_by_priority(self, authenticated_client):
        """Test filtering cases by priority"""
        response = authenticated_client.get(f"{BASE_URL}/api/cases?priority=high")
        assert response.status_code == 200
        data = response.json()
        for case in data["cases"]:
            assert case["priority"] == "high", f"Case {case['case_id']} has priority {case['priority']}, expected 'high'"
        print(f"✓ Priority filter working - {len(data['cases'])} high priority cases")


class TestCaseDetailEndpoint:
    """Test GET /api/cases/{id} endpoint"""
    
    def test_get_case_detail(self, authenticated_client, existing_case_id):
        """Test getting case details"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        response = authenticated_client.get(f"{BASE_URL}/api/cases/{existing_case_id}")
        assert response.status_code == 200, f"Failed to get case: {response.text}"
        data = response.json()
        assert "id" in data
        assert "case_id" in data
        assert "customer_id" in data
        assert "status" in data
        assert "priority" in data
        print(f"✓ Got case detail: {data['case_id']} - {data['status']}")
    
    def test_get_case_not_found(self, authenticated_client):
        """Test getting non-existent case"""
        response = authenticated_client.get(f"{BASE_URL}/api/cases/non-existent-id")
        assert response.status_code == 404
        print("✓ 404 returned for non-existent case")


class TestCaseNotesEndpoint:
    """Test case notes endpoints"""
    
    def test_add_note_to_case(self, authenticated_client, existing_case_id):
        """Test adding a note to a case"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        note_text = f"TEST_NOTE: Test note added at {time.time()}"
        response = authenticated_client.post(
            f"{BASE_URL}/api/cases/{existing_case_id}/notes",
            json={"note": note_text}
        )
        assert response.status_code == 200, f"Failed to add note: {response.text}"
        data = response.json()
        assert "note" in data
        assert data["note"]["note"] == note_text
        print(f"✓ Added note to case: {note_text[:50]}...")
    
    def test_get_case_notes(self, authenticated_client, existing_case_id):
        """Test getting notes for a case"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        response = authenticated_client.get(f"{BASE_URL}/api/cases/{existing_case_id}/notes")
        assert response.status_code == 200, f"Failed to get notes: {response.text}"
        data = response.json()
        assert "notes" in data
        assert isinstance(data["notes"], list)
        print(f"✓ Got {len(data['notes'])} notes for case")


class TestCaseEscalation:
    """Test case escalation endpoint"""
    
    def test_escalate_case(self, authenticated_client, existing_case_id):
        """Test escalating a case"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/cases/{existing_case_id}/escalate",
            json={"reason": "TEST_ESCALATION: High risk customer requires senior review", "escalated_to": None}
        )
        assert response.status_code == 200, f"Failed to escalate: {response.text}"
        data = response.json()
        assert "message" in data
        assert "escalated" in data["message"].lower()
        
        # Verify case status changed
        case_response = authenticated_client.get(f"{BASE_URL}/api/cases/{existing_case_id}")
        case_data = case_response.json()
        assert case_data["status"] == "escalated", f"Case status should be 'escalated', got {case_data['status']}"
        print("✓ Case escalated successfully")


class TestSARFiling:
    """Test SAR filing endpoint"""
    
    def test_file_sar(self, authenticated_client, existing_case_id):
        """Test filing SAR for a case"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        sar_reference = f"SAR-TEST-{int(time.time())}"
        response = authenticated_client.post(
            f"{BASE_URL}/api/cases/{existing_case_id}/sar",
            json={"sar_reference": sar_reference}
        )
        assert response.status_code == 200, f"Failed to file SAR: {response.text}"
        data = response.json()
        assert "message" in data
        
        # Verify SAR was filed
        case_response = authenticated_client.get(f"{BASE_URL}/api/cases/{existing_case_id}")
        case_data = case_response.json()
        assert case_data["sar_filed"] is True, "SAR should be marked as filed"
        assert case_data["sar_reference"] == sar_reference, "SAR reference mismatch"
        print(f"✓ SAR filed successfully: {sar_reference}")


class TestCaseClosure:
    """Test case closure endpoint"""
    
    def test_close_case_missing_fields(self, authenticated_client, existing_case_id):
        """Test closing case without required fields"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        # Missing disposition_note
        response = authenticated_client.post(
            f"{BASE_URL}/api/cases/{existing_case_id}/close",
            json={"disposition": "no_further_action"}
        )
        assert response.status_code == 400, "Should fail without disposition_note"
        print("✓ Validation works - requires both disposition and note")
    
    def test_close_case_invalid_disposition(self, authenticated_client, existing_case_id):
        """Test closing case with invalid disposition"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/cases/{existing_case_id}/close",
            json={"disposition": "invalid_disposition", "disposition_note": "Test note"}
        )
        assert response.status_code == 400, "Should fail with invalid disposition"
        print("✓ Validation works - rejects invalid disposition")


class TestCaseStatusUpdate:
    """Test case status/priority update endpoint"""
    
    def test_update_case_priority(self, authenticated_client, existing_case_id):
        """Test updating case priority"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/cases/{existing_case_id}",
            json={"priority": "critical"}
        )
        assert response.status_code == 200, f"Failed to update priority: {response.text}"
        
        # Verify update
        case_response = authenticated_client.get(f"{BASE_URL}/api/cases/{existing_case_id}")
        case_data = case_response.json()
        assert case_data["priority"] == "critical", f"Priority should be 'critical', got {case_data['priority']}"
        print("✓ Case priority updated to critical")
    
    def test_update_case_status(self, authenticated_client, existing_case_id):
        """Test updating case status"""
        if not existing_case_id:
            pytest.skip("No existing case to test")
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/cases/{existing_case_id}",
            json={"status": "in_progress"}
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        
        # Verify update
        case_response = authenticated_client.get(f"{BASE_URL}/api/cases/{existing_case_id}")
        case_data = case_response.json()
        assert case_data["status"] == "in_progress", f"Status should be 'in_progress', got {case_data['status']}"
        print("✓ Case status updated to in_progress")


class TestPEPScreeningAutoCaseCreation:
    """Test auto-case creation on PEP screening match"""
    
    def test_pep_screening_creates_case_on_match(self, authenticated_client):
        """Test that PEP screening creates a case when match is found"""
        # Get initial case count
        initial_response = authenticated_client.get(f"{BASE_URL}/api/cases")
        initial_count = initial_response.json()["total"]
        
        # Run PEP screening multiple times to get a match (30% chance)
        pep_match_found = False
        for i in range(10):  # Try up to 10 times
            response = authenticated_client.post(
                f"{BASE_URL}/api/screening/pep/{EXISTING_CUSTOMER_ID}",
                json={}
            )
            assert response.status_code == 200, f"PEP screening failed: {response.text}"
            data = response.json()
            
            if data["pep_screening"]["is_pep"]:
                pep_match_found = True
                print(f"✓ PEP match found on attempt {i+1}: tier={data['pep_screening']['pep_tier']}")
                break
        
        if not pep_match_found:
            print("⚠ No PEP match found after 10 attempts (expected ~97% chance of at least one match)")
            pytest.skip("No PEP match found - random result")
        
        # Check if case was created
        time.sleep(0.5)  # Small delay for DB write
        final_response = authenticated_client.get(f"{BASE_URL}/api/cases")
        final_count = final_response.json()["total"]
        
        assert final_count > initial_count, f"Case should have been created. Initial: {initial_count}, Final: {final_count}"
        print(f"✓ Auto-case created on PEP match. Cases: {initial_count} -> {final_count}")


class TestAdverseMediaScreening:
    """Test adverse media screening endpoint"""
    
    def test_adverse_media_screening_success(self, authenticated_client):
        """Test adverse media screening works without 500 error"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/screening/adverse-media/{EXISTING_CUSTOMER_ID}",
            json={}
        )
        assert response.status_code == 200, f"Adverse media screening failed with {response.status_code}: {response.text}"
        data = response.json()
        assert "adverse_media_screening" in data
        screening = data["adverse_media_screening"]
        assert "has_hits" in screening
        assert "hits" in screening
        print(f"✓ Adverse media screening completed: has_hits={screening['has_hits']}, hit_count={len(screening['hits'])}")


class TestBulkScreeningAutoCaseCreation:
    """Test auto-case creation on bulk screening with sanctions match"""
    
    def test_bulk_screening_endpoint(self, authenticated_client):
        """Test bulk screening endpoint works"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/screening/run/{EXISTING_CUSTOMER_ID}",
            json={}
        )
        assert response.status_code == 200, f"Bulk screening failed: {response.text}"
        data = response.json()
        assert "results" in data
        assert "sanctions" in data["results"]
        assert "pep" in data["results"]
        assert "adverse_media" in data["results"]
        print(f"✓ Bulk screening completed: sanctions={data['results']['sanctions']['status']}, pep={data['results']['pep']['is_pep']}")


class TestCustomerRelatedCases:
    """Test that cases are shown on customer detail"""
    
    def test_customer_detail_includes_cases(self, authenticated_client):
        """Test that customer detail endpoint includes related cases"""
        response = authenticated_client.get(f"{BASE_URL}/api/customers/{EXISTING_CUSTOMER_ID}")
        assert response.status_code == 200, f"Failed to get customer: {response.text}"
        data = response.json()
        assert "cases" in data, "Customer detail should include 'cases' field"
        assert isinstance(data["cases"], list)
        print(f"✓ Customer detail includes {len(data['cases'])} related cases")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth cookie"""
    # Login to get cookies
    api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    # Cookies are automatically stored in session
    return api_client


@pytest.fixture
def existing_case_id(authenticated_client):
    """Get an existing case ID for testing"""
    response = authenticated_client.get(f"{BASE_URL}/api/cases")
    if response.status_code == 200:
        cases = response.json().get("cases", [])
        if cases:
            # Find an open case for testing
            for case in cases:
                if case["status"] != "closed":
                    return case["id"]
            # If all closed, return first one
            return cases[0]["id"]
    return None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
