"""
Test suite for Customers page endpoints
Tests: GET /api/customers, GET /api/customers/{id}, GET /api/customers/{id}/timeline,
       GET /api/customers/{id}/notes, POST /api/customers/{id}/notes, GET /api/customers/{id}/screenings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "shyam@sentrixai.com"
TEST_PASSWORD = "Sentrix@2024"

# PEP match customer names for verification
PEP_CUSTOMERS = [
    {"name": "Rajendra Prasad Yadav", "risk": 72, "position": "MLA Bihar"},
    {"name": "Smt. Laxmi Devi Sharma", "risk": 65, "position": "Cabinet Minister Rajasthan"},
    {"name": "Balakrishnan Nair Pillai", "risk": 78, "position": "Former Secretary Ministry of Finance"},
]


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session for all tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    data = response.json()
    if "access_token" in data:
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    
    return session


class TestCustomersListEndpoint:
    """Tests for GET /api/customers endpoint"""
    
    def test_get_customers_returns_list(self, auth_session):
        """GET /api/customers returns paginated list"""
        response = auth_session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
        assert isinstance(data["customers"], list)
        assert data["total"] >= 25, f"Expected at least 25 demo customers, got {data['total']}"
    
    def test_customers_have_required_fields(self, auth_session):
        """Customers have all required fields"""
        response = auth_session.get(f"{BASE_URL}/api/customers?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["customers"]) > 0
        
        customer = data["customers"][0]
        required_fields = ["id", "tenant_id", "customer_type", "status", "risk_score", 
                          "risk_level", "cdd_tier", "kyc_status", "id_type", "customer_data"]
        for field in required_fields:
            assert field in customer, f"Missing field: {field}"
    
    def test_filter_by_risk_level_high(self, auth_session):
        """Filter customers by risk_level=high"""
        response = auth_session.get(f"{BASE_URL}/api/customers?risk_level=high")
        assert response.status_code == 200
        
        data = response.json()
        # All returned customers should be high risk
        for customer in data["customers"]:
            assert customer["risk_level"] == "high", f"Expected high risk, got {customer['risk_level']}"
    
    def test_filter_by_risk_level_low(self, auth_session):
        """Filter customers by risk_level=low"""
        response = auth_session.get(f"{BASE_URL}/api/customers?risk_level=low")
        assert response.status_code == 200
        
        data = response.json()
        for customer in data["customers"]:
            assert customer["risk_level"] == "low", f"Expected low risk, got {customer['risk_level']}"
    
    def test_filter_by_kyc_status_verified(self, auth_session):
        """Filter customers by kyc_status=verified"""
        response = auth_session.get(f"{BASE_URL}/api/customers?kyc_status=verified")
        assert response.status_code == 200
        
        data = response.json()
        for customer in data["customers"]:
            assert customer["kyc_status"] == "verified", f"Expected verified, got {customer['kyc_status']}"
    
    def test_filter_by_nationality(self, auth_session):
        """Filter customers by nationality=IN"""
        response = auth_session.get(f"{BASE_URL}/api/customers?nationality=IN")
        assert response.status_code == 200
        
        data = response.json()
        for customer in data["customers"]:
            nat = customer.get("customer_data", {}).get("nationality")
            assert nat == "IN", f"Expected IN nationality, got {nat}"
    
    def test_search_by_name(self, auth_session):
        """Search customers by name"""
        response = auth_session.get(f"{BASE_URL}/api/customers?search=Rajendra")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["customers"]) >= 1, "Expected at least 1 customer matching 'Rajendra'"
        
        # Verify the search result contains the name
        found = False
        for customer in data["customers"]:
            name = customer.get("customer_data", {}).get("full_name", "")
            if "Rajendra" in name:
                found = True
                break
        assert found, "Search result should contain customer with 'Rajendra' in name"
    
    def test_pagination_works(self, auth_session):
        """Pagination with skip and limit works"""
        # Get first page
        response1 = auth_session.get(f"{BASE_URL}/api/customers?limit=5&skip=0")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = auth_session.get(f"{BASE_URL}/api/customers?limit=5&skip=5")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Pages should have different customers
        ids1 = {c["id"] for c in data1["customers"]}
        ids2 = {c["id"] for c in data2["customers"]}
        assert ids1.isdisjoint(ids2), "Pagination should return different customers"


class TestPEPCustomers:
    """Tests for PEP match customers"""
    
    def test_pep_customers_exist(self, auth_session):
        """3 PEP match customers should exist"""
        response = auth_session.get(f"{BASE_URL}/api/customers?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        customers = data["customers"]
        
        pep_found = []
        for customer in customers:
            if customer.get("pep_status") == "match":
                name = customer.get("customer_data", {}).get("full_name", "")
                pep_found.append(name)
        
        assert len(pep_found) >= 3, f"Expected at least 3 PEP match customers, found {len(pep_found)}: {pep_found}"
    
    def test_rajendra_prasad_yadav_pep(self, auth_session):
        """Rajendra Prasad Yadav is a PEP match with risk 72"""
        response = auth_session.get(f"{BASE_URL}/api/customers?search=Rajendra Prasad Yadav")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["customers"]) >= 1, "Rajendra Prasad Yadav should exist"
        
        customer = data["customers"][0]
        assert customer["pep_status"] == "match", "Should be PEP match"
        assert customer["risk_score"] == 72, f"Expected risk 72, got {customer['risk_score']}"
    
    def test_laxmi_devi_sharma_pep(self, auth_session):
        """Smt. Laxmi Devi Sharma is a PEP match with risk 65"""
        response = auth_session.get(f"{BASE_URL}/api/customers?search=Laxmi Devi Sharma")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["customers"]) >= 1, "Smt. Laxmi Devi Sharma should exist"
        
        customer = data["customers"][0]
        assert customer["pep_status"] == "match", "Should be PEP match"
        assert customer["risk_score"] == 65, f"Expected risk 65, got {customer['risk_score']}"
    
    def test_balakrishnan_nair_pillai_pep(self, auth_session):
        """Balakrishnan Nair Pillai is a PEP match with risk 78"""
        response = auth_session.get(f"{BASE_URL}/api/customers?search=Balakrishnan Nair Pillai")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["customers"]) >= 1, "Balakrishnan Nair Pillai should exist"
        
        customer = data["customers"][0]
        assert customer["pep_status"] == "match", "Should be PEP match"
        assert customer["risk_score"] == 78, f"Expected risk 78, got {customer['risk_score']}"


class TestCustomerDetailEndpoint:
    """Tests for GET /api/customers/{id} endpoint"""
    
    @pytest.fixture
    def customer_id(self, auth_session):
        """Get a customer ID for testing"""
        response = auth_session.get(f"{BASE_URL}/api/customers?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["customers"]) > 0
        return data["customers"][0]["id"]
    
    def test_get_customer_by_id(self, auth_session, customer_id):
        """GET /api/customers/{id} returns customer details"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{customer_id}")
        assert response.status_code == 200
        
        customer = response.json()
        assert customer["id"] == customer_id
        assert "customer_data" in customer
        assert "risk_score" in customer
        assert "risk_level" in customer
    
    def test_get_customer_not_found(self, auth_session):
        """GET /api/customers/{id} returns 404 for invalid ID"""
        response = auth_session.get(f"{BASE_URL}/api/customers/invalid-id-12345")
        assert response.status_code == 404
    
    def test_customer_has_risk_breakdown(self, auth_session, customer_id):
        """Customer detail includes risk_breakdown"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{customer_id}")
        assert response.status_code == 200
        
        customer = response.json()
        assert "risk_breakdown" in customer
        
        breakdown = customer["risk_breakdown"]
        expected_keys = ["kyc", "sanctions", "pep", "adverse_media", "country_risk", "occupation_risk"]
        for key in expected_keys:
            assert key in breakdown, f"Missing breakdown key: {key}"


class TestCustomerTimelineEndpoint:
    """Tests for GET /api/customers/{id}/timeline endpoint"""
    
    @pytest.fixture
    def pep_customer_id(self, auth_session):
        """Get a PEP customer ID for testing timeline"""
        response = auth_session.get(f"{BASE_URL}/api/customers?search=Rajendra Prasad Yadav")
        assert response.status_code == 200
        data = response.json()
        assert len(data["customers"]) > 0
        return data["customers"][0]["id"]
    
    def test_get_timeline(self, auth_session, pep_customer_id):
        """GET /api/customers/{id}/timeline returns events"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{pep_customer_id}/timeline")
        assert response.status_code == 200
        
        data = response.json()
        assert "events" in data
        assert isinstance(data["events"], list)
        assert len(data["events"]) > 0, "PEP customer should have timeline events"
    
    def test_timeline_has_required_fields(self, auth_session, pep_customer_id):
        """Timeline events have required fields"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{pep_customer_id}/timeline")
        assert response.status_code == 200
        
        data = response.json()
        event = data["events"][0]
        required_fields = ["id", "customer_id", "event_type", "label", "timestamp"]
        for field in required_fields:
            assert field in event, f"Missing timeline field: {field}"
    
    def test_pep_customer_has_pep_match_event(self, auth_session, pep_customer_id):
        """PEP customer timeline includes PEP Match Found event"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{pep_customer_id}/timeline")
        assert response.status_code == 200
        
        data = response.json()
        event_types = [e["event_type"] for e in data["events"]]
        assert "pep_match" in event_types, f"Expected pep_match event, got: {event_types}"
    
    def test_pep_customer_has_case_opened_event(self, auth_session, pep_customer_id):
        """PEP customer timeline includes Investigation Case Opened event"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{pep_customer_id}/timeline")
        assert response.status_code == 200
        
        data = response.json()
        event_types = [e["event_type"] for e in data["events"]]
        assert "case_opened" in event_types, f"Expected case_opened event, got: {event_types}"


class TestCustomerNotesEndpoint:
    """Tests for GET/POST /api/customers/{id}/notes endpoints"""
    
    @pytest.fixture
    def customer_id(self, auth_session):
        """Get a customer ID for testing notes"""
        response = auth_session.get(f"{BASE_URL}/api/customers?limit=1")
        assert response.status_code == 200
        data = response.json()
        return data["customers"][0]["id"]
    
    def test_get_notes(self, auth_session, customer_id):
        """GET /api/customers/{id}/notes returns notes list"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{customer_id}/notes")
        assert response.status_code == 200
        
        data = response.json()
        assert "notes" in data
        assert isinstance(data["notes"], list)
    
    def test_add_note(self, auth_session, customer_id):
        """POST /api/customers/{id}/notes creates a new note"""
        note_text = "TEST_Note: This is a test compliance note for verification"
        
        response = auth_session.post(
            f"{BASE_URL}/api/customers/{customer_id}/notes",
            json={"text": note_text}
        )
        assert response.status_code == 200
        
        note = response.json()
        assert note["text"] == note_text
        assert "id" in note
        assert "created_at" in note
        assert "created_by_name" in note
    
    def test_add_note_persists(self, auth_session, customer_id):
        """Added note can be retrieved via GET"""
        note_text = "TEST_Note: Persistence verification note"
        
        # Add note
        post_response = auth_session.post(
            f"{BASE_URL}/api/customers/{customer_id}/notes",
            json={"text": note_text}
        )
        assert post_response.status_code == 200
        note_id = post_response.json()["id"]
        
        # Verify it appears in GET
        get_response = auth_session.get(f"{BASE_URL}/api/customers/{customer_id}/notes")
        assert get_response.status_code == 200
        
        notes = get_response.json()["notes"]
        note_ids = [n["id"] for n in notes]
        assert note_id in note_ids, "Added note should appear in notes list"
    
    def test_add_note_empty_text_fails(self, auth_session, customer_id):
        """POST /api/customers/{id}/notes with empty text returns 400"""
        response = auth_session.post(
            f"{BASE_URL}/api/customers/{customer_id}/notes",
            json={"text": ""}
        )
        assert response.status_code == 400


class TestCustomerScreeningsEndpoint:
    """Tests for GET /api/customers/{id}/screenings endpoint"""
    
    @pytest.fixture
    def customer_id(self, auth_session):
        """Get a customer ID for testing"""
        response = auth_session.get(f"{BASE_URL}/api/customers?limit=1")
        assert response.status_code == 200
        data = response.json()
        return data["customers"][0]["id"]
    
    def test_get_screenings(self, auth_session, customer_id):
        """GET /api/customers/{id}/screenings returns screenings list"""
        response = auth_session.get(f"{BASE_URL}/api/customers/{customer_id}/screenings")
        assert response.status_code == 200
        
        data = response.json()
        assert "screenings" in data
        assert isinstance(data["screenings"], list)
    
    def test_screenings_not_found_for_invalid_customer(self, auth_session):
        """GET /api/customers/{id}/screenings returns 404 for invalid customer"""
        response = auth_session.get(f"{BASE_URL}/api/customers/invalid-id-12345/screenings")
        assert response.status_code == 404


class TestCustomerDocuments:
    """Tests for customer documents field"""
    
    def test_customer_has_documents(self, auth_session):
        """Customers have documents array"""
        response = auth_session.get(f"{BASE_URL}/api/customers?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        for customer in data["customers"]:
            # Documents may be empty but should exist
            if "documents" in customer:
                assert isinstance(customer["documents"], list)


class TestCDDTiers:
    """Tests for CDD tier values"""
    
    def test_cdd_tiers_are_valid(self, auth_session):
        """CDD tiers are sdd, standard_cdd, or edd"""
        response = auth_session.get(f"{BASE_URL}/api/customers?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        valid_tiers = {"sdd", "standard_cdd", "edd"}
        
        for customer in data["customers"]:
            tier = customer.get("cdd_tier")
            assert tier in valid_tiers, f"Invalid CDD tier: {tier}"
    
    def test_high_risk_customers_have_edd(self, auth_session):
        """High risk customers should have EDD tier"""
        response = auth_session.get(f"{BASE_URL}/api/customers?risk_level=high")
        assert response.status_code == 200
        
        data = response.json()
        for customer in data["customers"]:
            assert customer["cdd_tier"] == "edd", f"High risk customer should have EDD, got {customer['cdd_tier']}"
    
    def test_low_risk_customers_have_sdd(self, auth_session):
        """Low risk customers should have SDD tier"""
        response = auth_session.get(f"{BASE_URL}/api/customers?risk_level=low")
        assert response.status_code == 200
        
        data = response.json()
        for customer in data["customers"]:
            assert customer["cdd_tier"] == "sdd", f"Low risk customer should have SDD, got {customer['cdd_tier']}"
