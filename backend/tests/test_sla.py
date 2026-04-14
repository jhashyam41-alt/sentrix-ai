"""
SLA Monitoring & Compliance API Tests
Tests for SLA Dashboard Widget, Breach Alerts, SLA Config, and Screening SLA Status
"""
import pytest
import requests

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session with cookies"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code != 200:
        pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    return session


class TestSLAMetricsEndpoint:
    """Tests for GET /api/sla-metrics - SLA Dashboard Widget data"""
    
    def test_sla_metrics_returns_200(self, auth_session):
        """SLA metrics endpoint should return 200 for authenticated user"""
        response = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_sla_metrics_has_screening_turnaround(self, auth_session):
        """SLA metrics should include screening_turnaround data"""
        response = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        data = response.json()
        
        assert "screening_turnaround" in data, "Missing screening_turnaround in response"
        st = data["screening_turnaround"]
        
        # Verify required fields
        assert "avg_hours" in st, "Missing avg_hours in screening_turnaround"
        assert "target_hrs" in st, "Missing target_hrs in screening_turnaround"
        assert "on_time" in st, "Missing on_time count"
        assert "breached" in st, "Missing breached count"
        assert "total" in st, "Missing total count"
        assert "compliance_pct" in st, "Missing compliance_pct"
        
        # Verify data types
        assert isinstance(st["avg_hours"], (int, float)), "avg_hours should be numeric"
        assert isinstance(st["target_hrs"], (int, float)), "target_hrs should be numeric"
        assert isinstance(st["compliance_pct"], (int, float)), "compliance_pct should be numeric"
    
    def test_sla_metrics_has_case_resolution(self, auth_session):
        """SLA metrics should include case_resolution data"""
        response = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        data = response.json()
        
        assert "case_resolution" in data, "Missing case_resolution in response"
        cr = data["case_resolution"]
        
        assert "avg_hours" in cr, "Missing avg_hours in case_resolution"
        assert "target_hrs" in cr, "Missing target_hrs in case_resolution"
        assert "resolved_on_time" in cr, "Missing resolved_on_time"
        assert "total" in cr, "Missing total"
        assert "compliance_pct" in cr, "Missing compliance_pct"
    
    def test_sla_metrics_has_escalation(self, auth_session):
        """SLA metrics should include escalation data"""
        response = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        data = response.json()
        
        assert "escalation" in data, "Missing escalation in response"
        esc = data["escalation"]
        
        assert "count" in esc, "Missing count in escalation"
        assert "sar_target_hrs" in esc, "Missing sar_target_hrs"
        assert "pending" in esc, "Missing pending count"
    
    def test_sla_metrics_has_weekly_trend(self, auth_session):
        """SLA metrics should include weekly_trend array"""
        response = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        data = response.json()
        
        assert "weekly_trend" in data, "Missing weekly_trend in response"
        trend = data["weekly_trend"]
        
        assert isinstance(trend, list), "weekly_trend should be a list"
        assert len(trend) > 0, "weekly_trend should not be empty"
        
        # Check first item structure
        first = trend[0]
        assert "week" in first, "Missing week in trend item"
        assert "compliance" in first, "Missing compliance in trend item"
    
    def test_sla_metrics_has_donut_data(self, auth_session):
        """SLA metrics should include donut chart data"""
        response = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        data = response.json()
        
        assert "donut" in data, "Missing donut in response"
        donut = data["donut"]
        
        assert "on_time" in donut, "Missing on_time in donut"
        assert "breached" in donut, "Missing breached in donut"
        assert "pending" in donut, "Missing pending in donut"
    
    def test_sla_metrics_requires_auth(self):
        """SLA metrics should require authentication"""
        response = requests.get(f"{BASE_URL}/api/sla-metrics")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestSLABreachesEndpoint:
    """Tests for GET /api/sla-breaches - SLA Breach Alerts"""
    
    def test_sla_breaches_returns_200(self, auth_session):
        """SLA breaches endpoint should return 200"""
        response = auth_session.get(f"{BASE_URL}/api/sla-breaches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_sla_breaches_has_breaches_list(self, auth_session):
        """Response should include breaches array"""
        response = auth_session.get(f"{BASE_URL}/api/sla-breaches")
        data = response.json()
        
        assert "breaches" in data, "Missing breaches in response"
        assert isinstance(data["breaches"], list), "breaches should be a list"
    
    def test_sla_breaches_has_unacknowledged_count(self, auth_session):
        """Response should include unacknowledged count"""
        response = auth_session.get(f"{BASE_URL}/api/sla-breaches")
        data = response.json()
        
        assert "unacknowledged" in data, "Missing unacknowledged count"
        assert isinstance(data["unacknowledged"], int), "unacknowledged should be integer"
    
    def test_sla_breach_item_structure(self, auth_session):
        """Each breach item should have required fields"""
        response = auth_session.get(f"{BASE_URL}/api/sla-breaches")
        data = response.json()
        
        if len(data["breaches"]) > 0:
            breach = data["breaches"][0]
            
            assert "id" in breach, "Missing id in breach"
            assert "type" in breach, "Missing type in breach"
            assert "severity" in breach, "Missing severity in breach"
            assert "title" in breach, "Missing title in breach"
            assert "description" in breach, "Missing description in breach"
            assert "breached_at" in breach, "Missing breached_at timestamp"
            assert "acknowledged" in breach, "Missing acknowledged flag"
            
            # Verify severity is valid
            assert breach["severity"] in ["critical", "high", "medium", "low"], \
                f"Invalid severity: {breach['severity']}"
    
    def test_sla_breaches_requires_auth(self):
        """SLA breaches should require authentication"""
        response = requests.get(f"{BASE_URL}/api/sla-breaches")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestSLABreachAcknowledge:
    """Tests for PUT /api/sla-breaches/{id}/acknowledge"""
    
    def test_acknowledge_breach_returns_200(self, auth_session):
        """Acknowledging a breach should return 200"""
        response = auth_session.put(f"{BASE_URL}/api/sla-breaches/breach-001/acknowledge")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_acknowledge_breach_returns_message(self, auth_session):
        """Acknowledge response should include confirmation message"""
        response = auth_session.put(f"{BASE_URL}/api/sla-breaches/breach-002/acknowledge")
        data = response.json()
        
        assert "message" in data, "Missing message in response"
        assert "breach-002" in data["message"], "Message should reference breach ID"
    
    def test_acknowledge_requires_auth(self):
        """Acknowledge endpoint should require authentication"""
        response = requests.put(f"{BASE_URL}/api/sla-breaches/breach-001/acknowledge")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestSLAConfigEndpoint:
    """Tests for PUT /api/settings/sla - SLA Configuration"""
    
    def test_update_sla_config_returns_200(self, auth_session):
        """Updating SLA config should return 200"""
        config = {
            "screening_target_hrs": 2,
            "case_resolution_target_hrs": 168,
            "str_filing_target_days": 7,
            "edd_completion_target_days": 7,
            "sar_filing_target_hrs": 24,
            "auto_escalate_on_breach": True,
            "template": "rbi_defaults"
        }
        response = auth_session.put(f"{BASE_URL}/api/settings/sla", json=config)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_update_sla_config_returns_message(self, auth_session):
        """Update response should include confirmation message"""
        config = {"screening_target_hrs": 2}
        response = auth_session.put(f"{BASE_URL}/api/settings/sla", json=config)
        data = response.json()
        
        assert "message" in data, "Missing message in response"
    
    def test_update_sla_config_custom_values(self, auth_session):
        """Should accept custom SLA target values"""
        config = {
            "screening_target_hrs": 3,
            "case_resolution_target_hrs": 120,
            "str_filing_target_days": 5,
            "edd_completion_target_days": 5,
            "sar_filing_target_hrs": 12,
            "auto_escalate_on_breach": False,
            "template": ""
        }
        response = auth_session.put(f"{BASE_URL}/api/settings/sla", json=config)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Restore RBI defaults
        rbi_config = {
            "screening_target_hrs": 2,
            "case_resolution_target_hrs": 168,
            "str_filing_target_days": 7,
            "edd_completion_target_days": 7,
            "sar_filing_target_hrs": 24,
            "auto_escalate_on_breach": True,
            "template": "rbi_defaults"
        }
        auth_session.put(f"{BASE_URL}/api/settings/sla", json=rbi_config)
    
    def test_update_sla_config_requires_auth(self):
        """SLA config update should require authentication"""
        config = {"screening_target_hrs": 2}
        response = requests.put(f"{BASE_URL}/api/settings/sla", json=config)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestSettingsIncludesSLAConfig:
    """Tests for GET /api/settings - should include sla_config"""
    
    def test_settings_returns_200(self, auth_session):
        """Settings endpoint should return 200"""
        response = auth_session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_settings_includes_sla_config(self, auth_session):
        """Settings should include sla_config section"""
        response = auth_session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        assert "sla_config" in data, "Missing sla_config in settings"
    
    def test_sla_config_has_rbi_defaults(self, auth_session):
        """SLA config should have RBI default values"""
        response = auth_session.get(f"{BASE_URL}/api/settings")
        data = response.json()
        sla = data.get("sla_config", {})
        
        # Verify RBI defaults are present
        assert "screening_target_hrs" in sla, "Missing screening_target_hrs"
        assert "case_resolution_target_hrs" in sla, "Missing case_resolution_target_hrs"
        assert "str_filing_target_days" in sla, "Missing str_filing_target_days"
        assert "edd_completion_target_days" in sla, "Missing edd_completion_target_days"
        assert "sar_filing_target_hrs" in sla, "Missing sar_filing_target_hrs"
        
        # Verify default values (RBI compliance)
        assert sla["screening_target_hrs"] == 2, f"Expected screening_target_hrs=2, got {sla['screening_target_hrs']}"
        assert sla["case_resolution_target_hrs"] == 168, f"Expected case_resolution_target_hrs=168, got {sla['case_resolution_target_hrs']}"
        assert sla["str_filing_target_days"] == 7, f"Expected str_filing_target_days=7, got {sla['str_filing_target_days']}"
        assert sla["edd_completion_target_days"] == 7, f"Expected edd_completion_target_days=7, got {sla['edd_completion_target_days']}"
        assert sla["sar_filing_target_hrs"] == 24, f"Expected sar_filing_target_hrs=24, got {sla['sar_filing_target_hrs']}"


class TestScreeningsSLAStatus:
    """Tests for GET /api/screenings - should include sla_status and sla_elapsed_hrs"""
    
    def test_screenings_returns_200(self, auth_session):
        """Screenings endpoint should return 200"""
        response = auth_session.get(f"{BASE_URL}/api/screenings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_screenings_have_sla_status(self, auth_session):
        """Each screening record should have sla_status"""
        response = auth_session.get(f"{BASE_URL}/api/screenings")
        data = response.json()
        
        screenings = data.get("screenings", [])
        if len(screenings) > 0:
            first = screenings[0]
            assert "sla_status" in first, "Missing sla_status in screening record"
            
            # Verify valid SLA status values
            valid_statuses = ["on_time", "at_risk", "breached", "pending", "unknown"]
            assert first["sla_status"] in valid_statuses, \
                f"Invalid sla_status: {first['sla_status']}"
    
    def test_screenings_have_sla_elapsed_hrs(self, auth_session):
        """Completed screenings should have sla_elapsed_hrs"""
        response = auth_session.get(f"{BASE_URL}/api/screenings")
        data = response.json()
        
        screenings = data.get("screenings", [])
        completed = [s for s in screenings if s.get("completed_at")]
        
        if len(completed) > 0:
            first = completed[0]
            # sla_elapsed_hrs should be present for completed screenings
            if first.get("sla_status") not in ["pending", "unknown"]:
                assert "sla_elapsed_hrs" in first, "Missing sla_elapsed_hrs for completed screening"
                assert isinstance(first["sla_elapsed_hrs"], (int, float)), "sla_elapsed_hrs should be numeric"
    
    def test_screenings_sla_status_distribution(self, auth_session):
        """Verify SLA status is computed for multiple records"""
        response = auth_session.get(f"{BASE_URL}/api/screenings?limit=30")
        data = response.json()
        
        screenings = data.get("screenings", [])
        statuses = [s.get("sla_status") for s in screenings]
        
        # Should have at least some records with SLA status
        assert len(statuses) > 0, "No screenings found"
        
        # Count status distribution
        status_counts = {}
        for s in statuses:
            status_counts[s] = status_counts.get(s, 0) + 1
        
        print(f"SLA Status Distribution: {status_counts}")


class TestSLAMetricsReflectsConfig:
    """Tests to verify SLA metrics use configured targets"""
    
    def test_metrics_use_configured_screening_target(self, auth_session):
        """SLA metrics should reflect configured screening target"""
        # Get current settings
        settings_resp = auth_session.get(f"{BASE_URL}/api/settings")
        settings = settings_resp.json()
        configured_target = settings.get("sla_config", {}).get("screening_target_hrs", 2)
        
        # Get metrics
        metrics_resp = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        metrics = metrics_resp.json()
        
        # Verify target matches
        assert metrics["screening_turnaround"]["target_hrs"] == configured_target, \
            f"Metrics target {metrics['screening_turnaround']['target_hrs']} != config {configured_target}"
    
    def test_metrics_use_configured_case_target(self, auth_session):
        """SLA metrics should reflect configured case resolution target"""
        settings_resp = auth_session.get(f"{BASE_URL}/api/settings")
        settings = settings_resp.json()
        configured_target = settings.get("sla_config", {}).get("case_resolution_target_hrs", 168)
        
        metrics_resp = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        metrics = metrics_resp.json()
        
        assert metrics["case_resolution"]["target_hrs"] == configured_target, \
            f"Metrics target {metrics['case_resolution']['target_hrs']} != config {configured_target}"
    
    def test_metrics_use_configured_sar_target(self, auth_session):
        """SLA metrics should reflect configured SAR filing target"""
        settings_resp = auth_session.get(f"{BASE_URL}/api/settings")
        settings = settings_resp.json()
        configured_target = settings.get("sla_config", {}).get("sar_filing_target_hrs", 24)
        
        metrics_resp = auth_session.get(f"{BASE_URL}/api/sla-metrics")
        metrics = metrics_resp.json()
        
        assert metrics["escalation"]["sar_target_hrs"] == configured_target, \
            f"Metrics SAR target {metrics['escalation']['sar_target_hrs']} != config {configured_target}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
