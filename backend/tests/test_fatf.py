"""
FATF Country Risk Classification API Tests
Tests for Black List (KP, IR, MM) and Grey List (25 countries) classification
"""
import pytest
import requests

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


class TestFATFEndpoints:
    """FATF Country Risk API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_cookies):
        """Setup for each test"""
        self.client = api_client
        self.cookies = auth_cookies
    
    # ==================== GET /api/fatf/lists ====================
    
    def test_get_fatf_lists_returns_black_and_grey_lists(self):
        """GET /api/fatf/lists returns black_list and grey_list"""
        response = self.client.get(f"{BASE_URL}/api/fatf/lists", cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "black_list" in data, "Response should contain black_list"
        assert "grey_list" in data, "Response should contain grey_list"
        
        # Verify black list contains expected countries
        black_codes = [c["code"] for c in data["black_list"]]
        assert "KP" in black_codes, "Black list should contain KP (North Korea)"
        assert "IR" in black_codes, "Black list should contain IR (Iran)"
        assert "MM" in black_codes, "Black list should contain MM (Myanmar)"
        assert len(data["black_list"]) == 3, f"Black list should have 3 countries, got {len(data['black_list'])}"
        
        # Verify grey list contains expected countries
        grey_codes = [c["code"] for c in data["grey_list"]]
        assert "PK" in grey_codes, "Grey list should contain PK (Pakistan)"
        assert "NG" in grey_codes, "Grey list should contain NG (Nigeria)"
        assert "TR" in grey_codes, "Grey list should contain TR (Turkey)"
        assert len(data["grey_list"]) == 25, f"Grey list should have 25 countries, got {len(data['grey_list'])}"
        
        print(f"✓ FATF lists returned: {len(data['black_list'])} black list, {len(data['grey_list'])} grey list")
    
    def test_fatf_lists_black_list_has_country_names(self):
        """GET /api/fatf/lists black_list entries have country names"""
        response = self.client.get(f"{BASE_URL}/api/fatf/lists", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        for country in data["black_list"]:
            assert "code" in country, "Each country should have a code"
            assert "name" in country, "Each country should have a name"
        print("✓ Black list entries have country codes and names")
    
    # ==================== GET /api/fatf/check/{country_code} ====================
    
    def test_check_black_list_country_kp(self):
        """GET /api/fatf/check/KP returns black_list with risk_score_impact 25"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/KP", cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["level"] == "black_list", f"Expected black_list, got {data['level']}"
        assert data["risk_score_impact"] == 25, f"Expected risk_score_impact 25, got {data['risk_score_impact']}"
        assert data["list_type"] == "FATF Black List", f"Expected 'FATF Black List', got {data['list_type']}"
        assert data["country_name"] == "North Korea", f"Expected 'North Korea', got {data['country_name']}"
        print(f"✓ KP (North Korea) classified as black_list with +25 risk impact")
    
    def test_check_black_list_country_ir(self):
        """GET /api/fatf/check/IR returns black_list"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/IR", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        assert data["level"] == "black_list"
        assert data["risk_score_impact"] == 25
        assert data["country_name"] == "Iran"
        print(f"✓ IR (Iran) classified as black_list")
    
    def test_check_black_list_country_mm(self):
        """GET /api/fatf/check/MM returns black_list"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/MM", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        assert data["level"] == "black_list"
        assert data["risk_score_impact"] == 25
        assert data["country_name"] == "Myanmar"
        print(f"✓ MM (Myanmar) classified as black_list")
    
    def test_check_grey_list_country_pk(self):
        """GET /api/fatf/check/PK returns grey_list with risk_score_impact 10"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/PK", cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["level"] == "grey_list", f"Expected grey_list, got {data['level']}"
        assert data["risk_score_impact"] == 10, f"Expected risk_score_impact 10, got {data['risk_score_impact']}"
        assert data["list_type"] == "FATF Grey List", f"Expected 'FATF Grey List', got {data['list_type']}"
        assert data["country_name"] == "Pakistan", f"Expected 'Pakistan', got {data['country_name']}"
        print(f"✓ PK (Pakistan) classified as grey_list with +10 risk impact")
    
    def test_check_grey_list_country_ng(self):
        """GET /api/fatf/check/NG returns grey_list"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/NG", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        assert data["level"] == "grey_list"
        assert data["risk_score_impact"] == 10
        assert data["country_name"] == "Nigeria"
        print(f"✓ NG (Nigeria) classified as grey_list")
    
    def test_check_grey_list_country_tr(self):
        """GET /api/fatf/check/TR returns grey_list"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/TR", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        assert data["level"] == "grey_list"
        assert data["risk_score_impact"] == 10
        assert data["country_name"] == "Turkey"
        print(f"✓ TR (Turkey) classified as grey_list")
    
    def test_check_standard_country_in(self):
        """GET /api/fatf/check/IN returns standard with risk_score_impact 0"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/IN", cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["level"] == "standard", f"Expected standard, got {data['level']}"
        assert data["risk_score_impact"] == 0, f"Expected risk_score_impact 0, got {data['risk_score_impact']}"
        assert data["list_type"] is None, f"Expected list_type None, got {data['list_type']}"
        print(f"✓ IN (India) classified as standard with 0 risk impact")
    
    def test_check_standard_country_us(self):
        """GET /api/fatf/check/US returns standard"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/US", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        assert data["level"] == "standard"
        assert data["risk_score_impact"] == 0
        print(f"✓ US (United States) classified as standard")
    
    def test_check_country_case_insensitive(self):
        """GET /api/fatf/check/{code} is case insensitive"""
        # Test lowercase
        response = self.client.get(f"{BASE_URL}/api/fatf/check/pk", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert data["level"] == "grey_list", "Lowercase 'pk' should be classified as grey_list"
        
        # Test mixed case
        response = self.client.get(f"{BASE_URL}/api/fatf/check/Pk", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert data["level"] == "grey_list", "Mixed case 'Pk' should be classified as grey_list"
        print(f"✓ Country code check is case insensitive")
    
    def test_check_unknown_country_returns_standard(self):
        """GET /api/fatf/check/{unknown_code} returns standard classification"""
        response = self.client.get(f"{BASE_URL}/api/fatf/check/XX", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        assert data["level"] == "standard", f"Unknown country should be standard, got {data['level']}"
        assert data["risk_score_impact"] == 0
        print("✓ Unknown country code returns standard classification")


class TestCustomerFATFIntegration:
    """Tests for FATF integration with customer creation and updates"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_cookies):
        """Setup for each test"""
        self.client = api_client
        self.cookies = auth_cookies
    
    def test_create_customer_with_grey_list_nationality_auto_flags(self):
        """POST /api/customers with nationality PK auto-flags country_risk as grey_list"""
        customer_data = {
            "customer_type": "individual",
            "customer_data": {
                "full_name": "TEST_FATF_GreyListCustomer",
                "nationality": "PK",
                "date_of_birth": "1990-01-15",
                "occupation": "Engineer"
            }
        }
        
        response = self.client.post(f"{BASE_URL}/api/customers", json=customer_data, cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "country_risk" in data, "Response should contain country_risk"
        assert data["country_risk"]["level"] == "grey_list", f"Expected grey_list, got {data['country_risk']['level']}"
        assert data["country_risk"]["risk_score_impact"] == 10, f"Expected risk_score_impact 10, got {data['country_risk']['risk_score_impact']}"
        assert data["risk_score"] >= 10, f"Risk score should be at least 10, got {data['risk_score']}"
        assert data["risk_level"] == "medium", f"Expected risk_level medium for grey list, got {data['risk_level']}"
        
        # Store customer ID for cleanup
        self.grey_list_customer_id = data["id"]
        print(f"✓ Customer with PK nationality auto-flagged as grey_list with risk_score {data['risk_score']}")
        
        # Cleanup
        self.client.delete(f"{BASE_URL}/api/customers/{data['id']}", cookies=self.cookies)
    
    def test_create_customer_with_black_list_nationality_auto_flags(self):
        """POST /api/customers with nationality KP auto-flags country_risk as black_list"""
        customer_data = {
            "customer_type": "individual",
            "customer_data": {
                "full_name": "TEST_FATF_BlackListCustomer",
                "nationality": "KP",
                "date_of_birth": "1985-06-20",
                "occupation": "Trader"
            }
        }
        
        response = self.client.post(f"{BASE_URL}/api/customers", json=customer_data, cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "country_risk" in data, "Response should contain country_risk"
        assert data["country_risk"]["level"] == "black_list", f"Expected black_list, got {data['country_risk']['level']}"
        assert data["country_risk"]["risk_score_impact"] == 25, f"Expected risk_score_impact 25, got {data['country_risk']['risk_score_impact']}"
        assert data["risk_score"] >= 25, f"Risk score should be at least 25, got {data['risk_score']}"
        assert data["risk_level"] == "high", f"Expected risk_level high for black list, got {data['risk_level']}"
        assert data["cdd_tier"] == "edd", f"Expected cdd_tier edd for black list, got {data['cdd_tier']}"
        
        print(f"✓ Customer with KP nationality auto-flagged as black_list with risk_score {data['risk_score']}, EDD required")
        
        # Cleanup
        self.client.delete(f"{BASE_URL}/api/customers/{data['id']}", cookies=self.cookies)
    
    def test_create_customer_with_standard_nationality_no_flag(self):
        """POST /api/customers with nationality IN has standard country_risk"""
        customer_data = {
            "customer_type": "individual",
            "customer_data": {
                "full_name": "TEST_FATF_StandardCustomer",
                "nationality": "IN",
                "date_of_birth": "1992-03-10",
                "occupation": "Software Developer"
            }
        }
        
        response = self.client.post(f"{BASE_URL}/api/customers", json=customer_data, cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "country_risk" in data, "Response should contain country_risk"
        assert data["country_risk"]["level"] == "standard", f"Expected standard, got {data['country_risk']['level']}"
        assert data["country_risk"]["risk_score_impact"] == 0, f"Expected risk_score_impact 0, got {data['country_risk']['risk_score_impact']}"
        assert data["risk_level"] == "low", f"Expected risk_level low for standard country, got {data['risk_level']}"
        
        print(f"✓ Customer with IN nationality has standard country_risk with no risk impact")
        
        # Cleanup
        self.client.delete(f"{BASE_URL}/api/customers/{data['id']}", cookies=self.cookies)
    
    def test_refresh_customer_country_risk(self):
        """POST /api/customers/{id}/refresh-country-risk updates FATF classification"""
        # First create a customer with grey list nationality
        customer_data = {
            "customer_type": "individual",
            "customer_data": {
                "full_name": "TEST_FATF_RefreshCustomer",
                "nationality": "PK",
                "date_of_birth": "1988-07-25",
                "occupation": "Consultant"
            }
        }
        
        create_response = self.client.post(f"{BASE_URL}/api/customers", json=customer_data, cookies=self.cookies)
        assert create_response.status_code == 200
        customer_id = create_response.json()["id"]
        
        # Refresh country risk
        refresh_response = self.client.post(f"{BASE_URL}/api/customers/{customer_id}/refresh-country-risk", cookies=self.cookies)
        assert refresh_response.status_code == 200, f"Expected 200, got {refresh_response.status_code}: {refresh_response.text}"
        
        data = refresh_response.json()
        assert data["level"] == "grey_list", f"Expected grey_list, got {data['level']}"
        assert data["risk_score_impact"] == 10, f"Expected risk_score_impact 10, got {data['risk_score_impact']}"
        assert "risk_score" in data, "Response should contain updated risk_score"
        
        print(f"✓ Customer country risk refreshed successfully, risk_score: {data['risk_score']}")
        
        # Cleanup
        self.client.delete(f"{BASE_URL}/api/customers/{customer_id}", cookies=self.cookies)
    
    def test_refresh_country_risk_invalid_customer(self):
        """POST /api/customers/{invalid_id}/refresh-country-risk returns 404"""
        response = self.client.post(f"{BASE_URL}/api/customers/invalid-customer-id/refresh-country-risk", cookies=self.cookies)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Refresh country risk returns 404 for invalid customer")
    
    def test_get_customer_enriches_country_risk(self):
        """GET /api/customers/{id} enriches country_risk if not present"""
        # Create customer with nationality
        customer_data = {
            "customer_type": "individual",
            "customer_data": {
                "full_name": "TEST_FATF_EnrichCustomer",
                "nationality": "NG",
                "date_of_birth": "1995-11-30",
                "occupation": "Banker"
            }
        }
        
        create_response = self.client.post(f"{BASE_URL}/api/customers", json=customer_data, cookies=self.cookies)
        assert create_response.status_code == 200
        customer_id = create_response.json()["id"]
        
        # Get customer - should have country_risk enriched
        get_response = self.client.get(f"{BASE_URL}/api/customers/{customer_id}", cookies=self.cookies)
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert "country_risk" in data, "Customer should have country_risk"
        assert data["country_risk"]["level"] == "grey_list", f"Expected grey_list for NG, got {data['country_risk']['level']}"
        
        print(f"✓ Customer GET enriches country_risk for NG (Nigeria) as grey_list")
        
        # Cleanup
        self.client.delete(f"{BASE_URL}/api/customers/{customer_id}", cookies=self.cookies)


class TestExistingCustomerFATF:
    """Tests for FATF badge on existing customer 'Amit Bhatia' with PK nationality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_cookies):
        """Setup for each test"""
        self.client = api_client
        self.cookies = auth_cookies
    
    def test_find_amit_bhatia_customer(self):
        """Find customer 'Amit Bhatia' with PK nationality"""
        response = self.client.get(f"{BASE_URL}/api/customers?search=Amit%20Bhatia", cookies=self.cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        customers = data.get("customers", [])
        
        # Find Amit Bhatia
        amit = None
        for c in customers:
            if c.get("customer_data", {}).get("full_name") == "Amit Bhatia":
                amit = c
                break
        
        if amit:
            assert amit["customer_data"].get("nationality") == "PK", f"Expected nationality PK, got {amit['customer_data'].get('nationality')}"
            print(f"✓ Found Amit Bhatia with nationality PK")
            
            # Check country_risk
            if "country_risk" in amit:
                assert amit["country_risk"]["level"] == "grey_list", f"Expected grey_list, got {amit['country_risk']['level']}"
                print(f"✓ Amit Bhatia has country_risk grey_list")
            else:
                print("⚠ Amit Bhatia does not have country_risk in list response (will be enriched on detail view)")
        else:
            print("⚠ Amit Bhatia not found in customers - may need to be created")


# ==================== Fixtures ====================

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_cookies(api_client):
    """Get authentication cookies"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        print(f"✓ Authenticated as {TEST_EMAIL}")
        return response.cookies.get_dict()
    else:
        pytest.fail(f"Authentication failed: {response.status_code} - {response.text}")
