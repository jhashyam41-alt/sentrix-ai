"""
Settings Page Backend API Tests
Tests for: General, Risk Scoring, Integrations, Notifications, Team Members, Compliance Rules
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from shared config
from tests.conftest import TEST_EMAIL, TEST_PASSWORD


class TestSettingsAuth:
    """Test authentication for settings endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_settings_requires_auth(self):
        """Settings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 401
    
    def test_team_requires_auth(self):
        """Team endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/team")
        assert response.status_code == 401


class TestGetSettings:
    """Test GET /api/settings endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_get_settings_returns_200(self, session):
        """GET /api/settings returns 200"""
        response = session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
    
    def test_settings_has_general_section(self, session):
        """Settings has general section with company_name, timezone, currency"""
        response = session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        assert "general" in data
        general = data["general"]
        assert "company_name" in general
        assert "timezone" in general
        assert "currency" in general
    
    def test_settings_general_has_default_values(self, session):
        """General settings has expected default values"""
        response = session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        general = data["general"]
        
        # Check default company name
        assert general["company_name"] == "AMLGuard Demo"
        assert general["timezone"] == "Asia/Kolkata"
        assert general["currency"] == "INR"
    
    def test_settings_has_risk_scoring_section(self, session):
        """Settings has risk_scoring section with 5 weight fields"""
        response = session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        assert "risk_scoring" in data
        rs = data["risk_scoring"]
        assert "kyc_failure_weight" in rs
        assert "sanctions_match_weight" in rs
        assert "pep_match_weight" in rs
        assert "adverse_media_weight" in rs
        assert "country_risk_weight" in rs
    
    def test_settings_has_integrations_section(self, session):
        """Settings has integrations section with 3 providers"""
        response = session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        assert "integrations" in data
        integrations = data["integrations"]
        assert "signzy" in integrations
        assert "opensanctions" in integrations
        assert "sanction_scanner" in integrations
    
    def test_integration_has_required_fields(self, session):
        """Each integration has enabled, api_key, status fields"""
        response = session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        for provider in ["signzy", "opensanctions", "sanction_scanner"]:
            integration = data["integrations"][provider]
            assert "enabled" in integration
            assert "api_key" in integration
            assert "status" in integration
    
    def test_settings_has_notifications_section(self, session):
        """Settings has notifications section with 4 toggles"""
        response = session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        assert "notifications" in data
        notifs = data["notifications"]
        assert "high_risk_screening" in notifs
        assert "case_escalated" in notifs
        assert "daily_summary" in notifs
        assert "api_usage_threshold" in notifs
    
    def test_settings_has_compliance_rules_section(self, session):
        """Settings has compliance_rules section with 3 rules + rescreen interval"""
        response = session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        assert "compliance_rules" in data
        rules = data["compliance_rules"]
        assert "auto_create_case_high_risk" in rules
        assert "auto_escalate_unacceptable_risk" in rules
        assert "block_onboarding_kyc_fails" in rules
        assert "rescreen_interval_days" in rules


class TestGeneralSettings:
    """Test PUT /api/settings/general endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_update_company_name(self, session):
        """Can update company name"""
        response = session.put(f"{BASE_URL}/api/settings/general", json={
            "company_name": "Test Company Updated"
        })
        assert response.status_code == 200
        
        # Verify change
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        assert data["general"]["company_name"] == "Test Company Updated"
        
        # Restore original
        session.put(f"{BASE_URL}/api/settings/general", json={
            "company_name": "AMLGuard Demo"
        })
    
    def test_update_timezone(self, session):
        """Can update timezone"""
        response = session.put(f"{BASE_URL}/api/settings/general", json={
            "timezone": "America/New_York"
        })
        assert response.status_code == 200
        
        # Verify change
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        assert data["general"]["timezone"] == "America/New_York"
        
        # Restore original
        session.put(f"{BASE_URL}/api/settings/general", json={
            "timezone": "Asia/Kolkata"
        })
    
    def test_update_currency(self, session):
        """Can update currency"""
        response = session.put(f"{BASE_URL}/api/settings/general", json={
            "currency": "USD"
        })
        assert response.status_code == 200
        
        # Verify change
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        assert data["general"]["currency"] == "USD"
        
        # Restore original
        session.put(f"{BASE_URL}/api/settings/general", json={
            "currency": "INR"
        })


class TestRiskScoringSettings:
    """Test PUT /api/settings/risk-scoring endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_update_risk_weights(self, session):
        """Can update risk scoring weights"""
        response = session.put(f"{BASE_URL}/api/settings/risk-scoring", json={
            "kyc_failure_weight": 35,
            "sanctions_match_weight": 38,
            "pep_match_weight": 25,
            "adverse_media_weight": 18,
            "country_risk_weight": 12
        })
        assert response.status_code == 200
        
        # Verify changes
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        rs = data["risk_scoring"]
        assert rs["kyc_failure_weight"] == 35
        assert rs["sanctions_match_weight"] == 38
        assert rs["pep_match_weight"] == 25
        assert rs["adverse_media_weight"] == 18
        assert rs["country_risk_weight"] == 12
    
    def test_risk_weights_respect_max_limits(self, session):
        """Risk weights are capped at max values (40/40/30/20/15)"""
        response = session.put(f"{BASE_URL}/api/settings/risk-scoring", json={
            "kyc_failure_weight": 100,  # Max 40
            "sanctions_match_weight": 100,  # Max 40
            "pep_match_weight": 100,  # Max 30
            "adverse_media_weight": 100,  # Max 20
            "country_risk_weight": 100  # Max 15
        })
        assert response.status_code == 200
        
        # Verify capped values
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        rs = data["risk_scoring"]
        assert rs["kyc_failure_weight"] <= 40
        assert rs["sanctions_match_weight"] <= 40
        assert rs["pep_match_weight"] <= 30
        assert rs["adverse_media_weight"] <= 20
        assert rs["country_risk_weight"] <= 15
    
    def test_restore_default_weights(self, session):
        """Restore default risk weights"""
        response = session.put(f"{BASE_URL}/api/settings/risk-scoring", json={
            "kyc_failure_weight": 25,
            "sanctions_match_weight": 30,
            "pep_match_weight": 20,
            "adverse_media_weight": 15,
            "country_risk_weight": 10
        })
        assert response.status_code == 200


class TestIntegrationsSettings:
    """Test integration settings endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_update_signzy_api_key(self, session):
        """Can update Signzy API key"""
        response = session.put(f"{BASE_URL}/api/settings/integrations/signzy", json={
            "api_key": "test_signzy_key_123"
        })
        assert response.status_code == 200
        
        # Verify change
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        assert data["integrations"]["signzy"]["api_key"] == "test_signzy_key_123"
        assert data["integrations"]["signzy"]["status"] == "connected"
    
    def test_toggle_integration_enabled(self, session):
        """Can toggle integration enabled/disabled"""
        # Disable
        response = session.put(f"{BASE_URL}/api/settings/integrations/sanction_scanner", json={
            "enabled": False
        })
        assert response.status_code == 200
        
        # Verify disabled
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        assert data["integrations"]["sanction_scanner"]["enabled"] == False
        
        # Re-enable
        session.put(f"{BASE_URL}/api/settings/integrations/sanction_scanner", json={
            "enabled": True
        })
    
    def test_test_connection_with_key(self, session):
        """Test connection returns connected when API key exists"""
        # First set an API key
        session.put(f"{BASE_URL}/api/settings/integrations/opensanctions", json={
            "api_key": "test_key_for_connection"
        })
        
        # Test connection
        response = session.post(f"{BASE_URL}/api/settings/integrations/opensanctions/test")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "connected"
        assert "message" in data
    
    def test_test_connection_without_key(self, session):
        """Test connection returns demo when no API key"""
        # Clear API key
        session.put(f"{BASE_URL}/api/settings/integrations/sanction_scanner", json={
            "api_key": ""
        })
        
        # Test connection
        response = session.post(f"{BASE_URL}/api/settings/integrations/sanction_scanner/test")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "demo"
    
    def test_invalid_provider_returns_400(self, session):
        """Invalid provider returns 400"""
        response = session.put(f"{BASE_URL}/api/settings/integrations/invalid_provider", json={
            "api_key": "test"
        })
        assert response.status_code == 400
    
    def test_restore_integration_defaults(self, session):
        """Restore integration defaults"""
        # Clear test keys
        session.put(f"{BASE_URL}/api/settings/integrations/signzy", json={"api_key": ""})
        session.put(f"{BASE_URL}/api/settings/integrations/opensanctions", json={"api_key": ""})


class TestNotificationsSettings:
    """Test PUT /api/settings/notifications endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_update_notification_toggles(self, session):
        """Can update notification toggles"""
        response = session.put(f"{BASE_URL}/api/settings/notifications", json={
            "high_risk_screening": False,
            "case_escalated": False,
            "daily_summary": True,
            "api_usage_threshold": True
        })
        assert response.status_code == 200
        
        # Verify changes
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        notifs = data["notifications"]
        assert notifs["high_risk_screening"] == False
        assert notifs["case_escalated"] == False
        assert notifs["daily_summary"] == True
        assert notifs["api_usage_threshold"] == True
    
    def test_restore_notification_defaults(self, session):
        """Restore notification defaults"""
        response = session.put(f"{BASE_URL}/api/settings/notifications", json={
            "high_risk_screening": True,
            "case_escalated": True,
            "daily_summary": False,
            "api_usage_threshold": False
        })
        assert response.status_code == 200


class TestComplianceRulesSettings:
    """Test PUT /api/settings/compliance-rules endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_update_compliance_rules(self, session):
        """Can update compliance rules"""
        response = session.put(f"{BASE_URL}/api/settings/compliance-rules", json={
            "auto_create_case_high_risk": False,
            "auto_escalate_unacceptable_risk": False,
            "block_onboarding_kyc_fails": True
        })
        assert response.status_code == 200
        
        # Verify changes
        get_response = session.get(f"{BASE_URL}/api/settings")
        data = get_response.json()
        rules = data["compliance_rules"]
        assert rules["auto_create_case_high_risk"] == False
        assert rules["auto_escalate_unacceptable_risk"] == False
        assert rules["block_onboarding_kyc_fails"] == True
    
    def test_update_rescreen_interval(self, session):
        """Can update rescreen interval (30/60/90 days)"""
        for interval in [30, 60, 90]:
            response = session.put(f"{BASE_URL}/api/settings/compliance-rules", json={
                "rescreen_interval_days": interval
            })
            assert response.status_code == 200
            
            # Verify change
            get_response = session.get(f"{BASE_URL}/api/settings")
            data = get_response.json()
            assert data["compliance_rules"]["rescreen_interval_days"] == interval
    
    def test_restore_compliance_defaults(self, session):
        """Restore compliance rule defaults"""
        response = session.put(f"{BASE_URL}/api/settings/compliance-rules", json={
            "auto_create_case_high_risk": True,
            "auto_escalate_unacceptable_risk": True,
            "block_onboarding_kyc_fails": False,
            "rescreen_interval_days": 90
        })
        assert response.status_code == 200


class TestTeamMembers:
    """Test team member endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_get_team_members(self, session):
        """GET /api/settings/team returns team members list"""
        response = session.get(f"{BASE_URL}/api/settings/team")
        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert isinstance(data["members"], list)
    
    def test_team_members_have_required_fields(self, session):
        """Team members have id, name, email, role, status fields"""
        response = session.get(f"{BASE_URL}/api/settings/team")
        data = response.json()
        
        for member in data["members"]:
            assert "id" in member
            assert "name" in member
            assert "email" in member
            assert "role" in member
            assert "status" in member
    
    def test_invite_new_member(self, session):
        """Can invite new team member"""
        import uuid
        test_email = f"test_invite_{uuid.uuid4().hex[:8]}@example.com"
        
        response = session.post(f"{BASE_URL}/api/settings/team/invite", json={
            "name": "Test Invited User",
            "email": test_email,
            "role": "analyst"
        })
        assert response.status_code == 200
        data = response.json()
        assert "member" in data
        assert data["member"]["email"] == test_email
        assert data["member"]["role"] == "analyst"
        assert data["member"]["status"] == "invited"
        
        # Store member_id for cleanup
        return data["member"]["id"]
    
    def test_invite_requires_name_and_email(self, session):
        """Invite requires name and email"""
        response = session.post(f"{BASE_URL}/api/settings/team/invite", json={
            "name": "",
            "email": "",
            "role": "analyst"
        })
        assert response.status_code == 400
    
    def test_invite_validates_role(self, session):
        """Invite validates role (compliance_officer, analyst, read_only_auditor)"""
        import uuid
        test_email = f"test_role_{uuid.uuid4().hex[:8]}@example.com"
        
        response = session.post(f"{BASE_URL}/api/settings/team/invite", json={
            "name": "Test Role User",
            "email": test_email,
            "role": "invalid_role"
        })
        assert response.status_code == 400
    
    def test_invite_duplicate_email_fails(self, session):
        """Cannot invite existing email"""
        response = session.post(f"{BASE_URL}/api/settings/team/invite", json={
            "name": "Duplicate User",
            "email": TEST_EMAIL,  # Already exists
            "role": "analyst"
        })
        assert response.status_code == 400
    
    def test_update_member_role(self, session):
        """Can update team member role"""
        # Get team members
        response = session.get(f"{BASE_URL}/api/settings/team")
        members = response.json()["members"]
        
        # Find a non-admin member to update
        target_member = None
        for m in members:
            if m["role"] != "super_admin" and m["email"] != TEST_EMAIL:
                target_member = m
                break
        
        if target_member:
            original_role = target_member["role"]
            new_role = "compliance_officer" if original_role != "compliance_officer" else "analyst"
            
            response = session.put(f"{BASE_URL}/api/settings/team/{target_member['id']}/role", json={
                "role": new_role
            })
            assert response.status_code == 200
            
            # Restore original role
            session.put(f"{BASE_URL}/api/settings/team/{target_member['id']}/role", json={
                "role": original_role
            })
    
    def test_remove_team_member(self, session):
        """Can remove team member"""
        import uuid
        test_email = f"test_remove_{uuid.uuid4().hex[:8]}@example.com"
        
        # First invite a member
        invite_response = session.post(f"{BASE_URL}/api/settings/team/invite", json={
            "name": "Test Remove User",
            "email": test_email,
            "role": "analyst"
        })
        assert invite_response.status_code == 200
        member_id = invite_response.json()["member"]["id"]
        
        # Remove the member
        response = session.delete(f"{BASE_URL}/api/settings/team/{member_id}")
        assert response.status_code == 200
        
        # Verify removed
        team_response = session.get(f"{BASE_URL}/api/settings/team")
        members = team_response.json()["members"]
        member_ids = [m["id"] for m in members]
        assert member_id not in member_ids
    
    def test_cannot_remove_self(self, session):
        """Cannot remove yourself"""
        # Get current user's ID
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        my_id = me_response.json()["id"]
        
        response = session.delete(f"{BASE_URL}/api/settings/team/{my_id}")
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
