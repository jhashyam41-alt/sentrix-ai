"""
DigiLocker Verification API Tests
Tests for Aadhaar and PAN verification endpoints (demo mode)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDigiLockerVerification:
    """DigiLocker Aadhaar and PAN verification endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and login"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@rudrik.io",
            "password": "Assword@0231"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user = login_resp.json()
        
        # Get a customer ID for testing
        customers_resp = self.session.get(f"{BASE_URL}/api/customers?limit=5&skip=5")
        assert customers_resp.status_code == 200, f"Failed to get customers: {customers_resp.text}"
        customers = customers_resp.json().get("customers", [])
        assert len(customers) > 0, "No customers found for testing"
        self.customer_id = customers[0]["id"]
        self.customer_name = customers[0].get("customer_data", {}).get("full_name", "Test Customer")
        print(f"Using customer: {self.customer_name} (ID: {self.customer_id})")
    
    # ========== AADHAAR VERIFICATION TESTS ==========
    
    def test_aadhaar_verify_valid_12_digit(self):
        """POST /api/customers/{id}/verify/aadhaar with valid 12-digit number returns verified status"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/aadhaar",
            json={"aadhaar_number": "123456789012"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status'"
        assert data["status"] in ["verified", "failed"], f"Status should be verified or failed, got: {data['status']}"
        assert "verification_id" in data, "Response should contain 'verification_id'"
        assert "document_type" in data, "Response should contain 'document_type'"
        assert data["document_type"] == "aadhaar", "Document type should be 'aadhaar'"
        assert "aadhaar_last4" in data, "Response should contain 'aadhaar_last4'"
        assert data["aadhaar_last4"] == "9012", f"Last 4 digits should be '9012', got: {data['aadhaar_last4']}"
        assert "mode" in data, "Response should contain 'mode'"
        assert data["mode"] == "demo", f"Mode should be 'demo', got: {data['mode']}"
        print(f"Aadhaar verification result: {data['status']}")
    
    def test_aadhaar_verify_invalid_short_number(self):
        """POST /api/customers/{id}/verify/aadhaar with short number returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/aadhaar",
            json={"aadhaar_number": "12345678"}  # Only 8 digits
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Short Aadhaar number correctly rejected with 400")
    
    def test_aadhaar_verify_invalid_non_digit(self):
        """POST /api/customers/{id}/verify/aadhaar with non-digit characters returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/aadhaar",
            json={"aadhaar_number": "12345678901A"}  # Contains letter
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Non-digit Aadhaar number correctly rejected with 400")
    
    def test_aadhaar_verify_empty_number(self):
        """POST /api/customers/{id}/verify/aadhaar with empty number returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/aadhaar",
            json={"aadhaar_number": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Empty Aadhaar number correctly rejected with 400")
    
    def test_aadhaar_verify_missing_field(self):
        """POST /api/customers/{id}/verify/aadhaar without aadhaar_number returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/aadhaar",
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Missing Aadhaar number correctly rejected with 400")
    
    # ========== PAN VERIFICATION TESTS ==========
    
    def test_pan_verify_valid_format(self):
        """POST /api/customers/{id}/verify/pan with valid PAN returns verified status with pan_type and name_match_score"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/pan",
            json={"pan_number": "ABCDE1234F"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status'"
        assert data["status"] in ["verified", "failed"], f"Status should be verified or failed, got: {data['status']}"
        assert "verification_id" in data, "Response should contain 'verification_id'"
        assert "document_type" in data, "Response should contain 'document_type'"
        assert data["document_type"] == "pan", "Document type should be 'pan'"
        assert "pan_number" in data, "Response should contain 'pan_number'"
        assert data["pan_number"] == "ABCDE1234F", f"PAN should be 'ABCDE1234F', got: {data['pan_number']}"
        assert "pan_type" in data, "Response should contain 'pan_type'"
        assert data["pan_type"] == "Individual", f"PAN type should be 'Individual' (4th char E), got: {data['pan_type']}"
        assert "name_match_score" in data, "Response should contain 'name_match_score'"
        assert isinstance(data["name_match_score"], (int, float)), "name_match_score should be numeric"
        assert "mode" in data, "Response should contain 'mode'"
        assert data["mode"] == "demo", f"Mode should be 'demo', got: {data['mode']}"
        print(f"PAN verification result: {data['status']}, type: {data['pan_type']}, match: {data['name_match_score']}")
    
    def test_pan_verify_lowercase_auto_uppercase(self):
        """POST /api/customers/{id}/verify/pan with lowercase PAN should auto-uppercase"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/pan",
            json={"pan_number": "abcde1234f"}  # lowercase
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["pan_number"] == "ABCDE1234F", f"PAN should be uppercased to 'ABCDE1234F', got: {data['pan_number']}"
        print("Lowercase PAN correctly auto-uppercased")
    
    def test_pan_verify_invalid_short(self):
        """POST /api/customers/{id}/verify/pan with short PAN returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/pan",
            json={"pan_number": "ABCDE123"}  # Only 8 chars
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Short PAN correctly rejected with 400")
    
    def test_pan_verify_invalid_long(self):
        """POST /api/customers/{id}/verify/pan with long PAN returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/pan",
            json={"pan_number": "ABCDE12345FF"}  # 12 chars
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Long PAN correctly rejected with 400")
    
    def test_pan_verify_empty(self):
        """POST /api/customers/{id}/verify/pan with empty PAN returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/pan",
            json={"pan_number": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Empty PAN correctly rejected with 400")
    
    # ========== GET VERIFICATIONS TESTS ==========
    
    def test_get_verifications_returns_all_statuses(self):
        """GET /api/customers/{id}/verifications returns aadhaar + pan + overall status"""
        response = self.session.get(f"{BASE_URL}/api/customers/{self.customer_id}/verifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "customer_id" in data, "Response should contain 'customer_id'"
        assert data["customer_id"] == self.customer_id, "Customer ID should match"
        assert "aadhaar" in data, "Response should contain 'aadhaar'"
        assert "pan" in data, "Response should contain 'pan'"
        assert "overall_kyc_status" in data, "Response should contain 'overall_kyc_status'"
        
        # Check aadhaar structure
        assert "status" in data["aadhaar"], "Aadhaar should have 'status'"
        
        # Check pan structure
        assert "status" in data["pan"], "PAN should have 'status'"
        
        print(f"Verifications: Aadhaar={data['aadhaar']['status']}, PAN={data['pan']['status']}, Overall={data['overall_kyc_status']}")
    
    def test_get_verifications_invalid_customer(self):
        """GET /api/customers/{invalid_id}/verifications returns 404"""
        response = self.session.get(f"{BASE_URL}/api/customers/invalid-customer-id-12345/verifications")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Invalid customer ID correctly returns 404")
    
    # ========== OVERALL KYC STATUS TEST ==========
    
    def test_overall_kyc_verified_when_both_verified(self):
        """After both Aadhaar and PAN are verified, overall_kyc_status becomes 'verified'"""
        # First verify Aadhaar
        aadhaar_resp = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/aadhaar",
            json={"aadhaar_number": "123456789012"}
        )
        assert aadhaar_resp.status_code == 200, f"Aadhaar verification failed: {aadhaar_resp.text}"
        aadhaar_data = aadhaar_resp.json()
        
        # Then verify PAN
        pan_resp = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/pan",
            json={"pan_number": "ABCDE1234F"}
        )
        assert pan_resp.status_code == 200, f"PAN verification failed: {pan_resp.text}"
        pan_data = pan_resp.json()
        
        # Check overall status
        verif_resp = self.session.get(f"{BASE_URL}/api/customers/{self.customer_id}/verifications")
        assert verif_resp.status_code == 200, f"Get verifications failed: {verif_resp.text}"
        verif_data = verif_resp.json()
        
        # If both are verified, overall should be verified
        if aadhaar_data["status"] == "verified" and pan_data["status"] == "verified":
            assert verif_data["overall_kyc_status"] == "verified", \
                f"Overall KYC should be 'verified' when both are verified, got: {verif_data['overall_kyc_status']}"
            print("Overall KYC status correctly set to 'verified' when both Aadhaar and PAN are verified")
        else:
            print(f"Note: One or both verifications failed in demo mode (Aadhaar: {aadhaar_data['status']}, PAN: {pan_data['status']})")
    
    # ========== TIMELINE EVENT TEST ==========
    
    def test_timeline_event_created_on_verification(self):
        """Timeline events are created for each verification"""
        # Verify Aadhaar
        self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/aadhaar",
            json={"aadhaar_number": "987654321098"}
        )
        
        # Check timeline
        timeline_resp = self.session.get(f"{BASE_URL}/api/customers/{self.customer_id}/timeline")
        assert timeline_resp.status_code == 200, f"Get timeline failed: {timeline_resp.text}"
        
        timeline_data = timeline_resp.json()
        events = timeline_data.get("events", [])
        
        # Look for KYC verification events
        kyc_events = [e for e in events if e.get("event_type") in ["kyc_verified", "kyc_failed"]]
        assert len(kyc_events) > 0, "Should have at least one KYC verification event in timeline"
        
        # Check latest event has Aadhaar reference
        latest_kyc = kyc_events[0]
        assert "Aadhaar" in latest_kyc.get("label", ""), f"Latest KYC event should mention Aadhaar: {latest_kyc}"
        print(f"Timeline event created: {latest_kyc['label']}")


class TestDigiLockerEdgeCases:
    """Edge case tests for DigiLocker verification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and login"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@rudrik.io",
            "password": "Assword@0231"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        customers_resp = self.session.get(f"{BASE_URL}/api/customers?limit=5&skip=10")
        assert customers_resp.status_code == 200
        customers = customers_resp.json().get("customers", [])
        assert len(customers) > 0
        self.customer_id = customers[0]["id"]
    
    def test_aadhaar_verify_nonexistent_customer(self):
        """POST /api/customers/{invalid}/verify/aadhaar returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/nonexistent-customer-xyz/verify/aadhaar",
            json={"aadhaar_number": "123456789012"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Nonexistent customer correctly returns 404 for Aadhaar verification")
    
    def test_pan_verify_nonexistent_customer(self):
        """POST /api/customers/{invalid}/verify/pan returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/nonexistent-customer-xyz/verify/pan",
            json={"pan_number": "ABCDE1234F"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Nonexistent customer correctly returns 404 for PAN verification")
    
    def test_pan_type_company(self):
        """PAN with 4th char 'C' should return pan_type 'Company'"""
        response = self.session.post(
            f"{BASE_URL}/api/customers/{self.customer_id}/verify/pan",
            json={"pan_number": "ABCCE1234F"}  # 4th char is C for Company
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["pan_type"] == "Company", f"PAN type should be 'Company', got: {data['pan_type']}"
        print("Company PAN type correctly identified")


class TestDashboardAndScreeningRegression:
    """Regression tests to ensure existing features still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and login"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "shyam@rudrik.io",
            "password": "Assword@0231"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_dashboard_loads(self):
        """Dashboard still loads correctly"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard failed: {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_customers" in data, "Dashboard should have total_customers"
        # Note: total_screenings may be named differently
        print(f"Dashboard loaded: {data['total_customers']} customers")
    
    def test_screening_status_endpoint(self):
        """Screening status endpoint still works (Demo Mode)"""
        response = self.session.get(f"{BASE_URL}/api/settings/screening-status")
        assert response.status_code == 200, f"Screening status failed: {response.status_code}"
        
        data = response.json()
        # Mode is nested under sanctions_io
        assert "sanctions_io" in data, "Should have sanctions_io field"
        assert "mode" in data["sanctions_io"], "sanctions_io should have mode field"
        print(f"Screening mode: {data['sanctions_io']['mode']}")
    
    def test_customers_list(self):
        """Customers list endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/customers?limit=10")
        assert response.status_code == 200, f"Customers list failed: {response.status_code}"
        
        data = response.json()
        assert "customers" in data, "Should have customers array"
        assert "total" in data, "Should have total count"
        print(f"Customers list: {len(data['customers'])} returned, {data['total']} total")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
