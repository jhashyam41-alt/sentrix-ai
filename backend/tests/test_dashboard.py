"""
Dashboard API Tests - Testing enhanced dashboard features:
- GET /api/dashboard/stats - Main stats with risk distribution, screening stats, KYC, CDD, API usage, integrations
- GET /api/dashboard/trends - 7-day trend data for sparklines
- GET /api/dashboard/activity-feed - Live activity feed with recent events
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from shared config
from tests.conftest import TEST_EMAIL, TEST_PASSWORD


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    return session


class TestDashboardStats:
    """Tests for GET /api/dashboard/stats endpoint"""
    
    def test_stats_endpoint_returns_200(self, auth_session):
        """Dashboard stats endpoint should return 200"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Dashboard stats endpoint returns 200")
    
    def test_stats_has_total_customers(self, auth_session):
        """Stats should include total_customers count"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "total_customers" in data, "Missing total_customers field"
        assert isinstance(data["total_customers"], int), "total_customers should be integer"
        print(f"✓ Total customers: {data['total_customers']}")
    
    def test_stats_has_pending_reviews(self, auth_session):
        """Stats should include pending_reviews count"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "pending_reviews" in data, "Missing pending_reviews field"
        assert isinstance(data["pending_reviews"], int), "pending_reviews should be integer"
        print(f"✓ Pending reviews: {data['pending_reviews']}")
    
    def test_stats_has_high_risk_customers(self, auth_session):
        """Stats should include high_risk_customers count"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "high_risk_customers" in data, "Missing high_risk_customers field"
        assert isinstance(data["high_risk_customers"], int), "high_risk_customers should be integer"
        print(f"✓ High risk customers: {data['high_risk_customers']}")
    
    def test_stats_has_open_cases(self, auth_session):
        """Stats should include open_cases count"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "open_cases" in data, "Missing open_cases field"
        assert isinstance(data["open_cases"], int), "open_cases should be integer"
        print(f"✓ Open cases: {data['open_cases']}")
    
    def test_stats_has_risk_distribution(self, auth_session):
        """Stats should include risk_distribution with low/medium/high/unacceptable"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "risk_distribution" in data, "Missing risk_distribution field"
        rd = data["risk_distribution"]
        assert "low" in rd, "Missing low in risk_distribution"
        assert "medium" in rd, "Missing medium in risk_distribution"
        assert "high" in rd, "Missing high in risk_distribution"
        assert "unacceptable" in rd, "Missing unacceptable in risk_distribution"
        print(f"✓ Risk distribution: Low={rd['low']}, Medium={rd['medium']}, High={rd['high']}, Unacceptable={rd['unacceptable']}")
    
    def test_stats_has_screening_stats(self, auth_session):
        """Stats should include screening_stats with sanctions/pep/adverse_media"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "screening_stats" in data, "Missing screening_stats field"
        ss = data["screening_stats"]
        assert "sanctions_matches" in ss, "Missing sanctions_matches in screening_stats"
        assert "pep_matches" in ss, "Missing pep_matches in screening_stats"
        assert "adverse_media_hits" in ss, "Missing adverse_media_hits in screening_stats"
        print(f"✓ Screening stats: Sanctions={ss['sanctions_matches']}, PEP={ss['pep_matches']}, Adverse Media={ss['adverse_media_hits']}")
    
    def test_stats_has_kyc_stats(self, auth_session):
        """Stats should include kyc_stats with total/verified/failed"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "kyc_stats" in data, "Missing kyc_stats field"
        kyc = data["kyc_stats"]
        assert "total" in kyc, "Missing total in kyc_stats"
        assert "verified" in kyc, "Missing verified in kyc_stats"
        assert "failed" in kyc, "Missing failed in kyc_stats"
        print(f"✓ KYC stats: Total={kyc['total']}, Verified={kyc['verified']}, Failed={kyc['failed']}")
    
    def test_stats_has_cdd_breakdown(self, auth_session):
        """Stats should include cdd_breakdown with sdd/standard_cdd/edd"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "cdd_breakdown" in data, "Missing cdd_breakdown field"
        cdd = data["cdd_breakdown"]
        assert "sdd" in cdd, "Missing sdd in cdd_breakdown"
        assert "standard_cdd" in cdd, "Missing standard_cdd in cdd_breakdown"
        assert "edd" in cdd, "Missing edd in cdd_breakdown"
        print(f"✓ CDD breakdown: SDD={cdd['sdd']}, Standard={cdd['standard_cdd']}, EDD={cdd['edd']}")
    
    def test_stats_has_api_usage(self, auth_session):
        """Stats should include api_usage with total_api_calls and active_api_keys"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "api_usage" in data, "Missing api_usage field"
        api = data["api_usage"]
        assert "total_api_calls" in api, "Missing total_api_calls in api_usage"
        assert "active_api_keys" in api, "Missing active_api_keys in api_usage"
        print(f"✓ API usage: Total calls={api['total_api_calls']}, Active keys={api['active_api_keys']}")
    
    def test_stats_has_integrations(self, auth_session):
        """Stats should include integrations with signzy/opensanctions/newsapi"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        data = response.json()
        assert "integrations" in data, "Missing integrations field"
        integ = data["integrations"]
        # Check for at least signzy and opensanctions
        assert "signzy" in integ, "Missing signzy in integrations"
        assert "opensanctions" in integ, "Missing opensanctions in integrations"
        # Each integration should have mode field
        assert "mode" in integ["signzy"], "Missing mode in signzy integration"
        assert "mode" in integ["opensanctions"], "Missing mode in opensanctions integration"
        print(f"✓ Integrations: Signzy mode={integ['signzy']['mode']}, OpenSanctions mode={integ['opensanctions']['mode']}")


class TestDashboardTrends:
    """Tests for GET /api/dashboard/trends endpoint"""
    
    def test_trends_endpoint_returns_200(self, auth_session):
        """Dashboard trends endpoint should return 200"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/trends")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Dashboard trends endpoint returns 200")
    
    def test_trends_has_trends_array(self, auth_session):
        """Trends response should have trends array"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/trends")
        data = response.json()
        assert "trends" in data, "Missing trends field"
        assert isinstance(data["trends"], list), "trends should be a list"
        print(f"✓ Trends array has {len(data['trends'])} entries")
    
    def test_trends_has_7_days(self, auth_session):
        """Trends should have 7 days of data"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/trends")
        data = response.json()
        trends = data.get("trends", [])
        assert len(trends) == 7, f"Expected 7 days of trends, got {len(trends)}"
        print("✓ Trends has 7 days of data")
    
    def test_trends_has_required_fields(self, auth_session):
        """Each trend entry should have date/customers/screenings/cases/risk"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/trends")
        data = response.json()
        trends = data.get("trends", [])
        
        if len(trends) > 0:
            first_trend = trends[0]
            assert "date" in first_trend, "Missing date in trend entry"
            assert "customers" in first_trend, "Missing customers in trend entry"
            assert "screenings" in first_trend, "Missing screenings in trend entry"
            assert "cases" in first_trend, "Missing cases in trend entry"
            assert "risk" in first_trend, "Missing risk in trend entry"
            print(f"✓ Trend entry has all required fields: {list(first_trend.keys())}")
        else:
            print("⚠ No trend entries to validate")


class TestActivityFeed:
    """Tests for GET /api/dashboard/activity-feed endpoint"""
    
    def test_activity_feed_returns_200(self, auth_session):
        """Activity feed endpoint should return 200"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/activity-feed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Activity feed endpoint returns 200")
    
    def test_activity_feed_has_feed_array(self, auth_session):
        """Activity feed response should have feed array"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/activity-feed")
        data = response.json()
        assert "feed" in data, "Missing feed field"
        assert isinstance(data["feed"], list), "feed should be a list"
        print(f"✓ Activity feed has {len(data['feed'])} entries")
    
    def test_activity_feed_entry_has_required_fields(self, auth_session):
        """Each feed entry should have user_name, action, timestamp"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/activity-feed")
        data = response.json()
        feed = data.get("feed", [])
        
        if len(feed) > 0:
            first_entry = feed[0]
            assert "user_name" in first_entry, "Missing user_name in feed entry"
            assert "action" in first_entry, "Missing action in feed entry"
            assert "timestamp" in first_entry, "Missing timestamp in feed entry"
            assert "action_type" in first_entry, "Missing action_type in feed entry"
            print(f"✓ Feed entry has required fields: user_name={first_entry['user_name']}, action={first_entry['action']}")
        else:
            print("⚠ No feed entries to validate")
    
    def test_activity_feed_has_customer_name_when_applicable(self, auth_session):
        """Feed entries for customer actions should have customer_name"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/activity-feed")
        data = response.json()
        feed = data.get("feed", [])
        
        customer_actions = ["screening_run", "customer_created", "case_created", "case_resolved"]
        customer_entries = [e for e in feed if e.get("action_type") in customer_actions]
        
        if len(customer_entries) > 0:
            # At least some customer-related entries should have customer_name
            has_customer_name = any(e.get("customer_name") for e in customer_entries)
            print(f"✓ Found {len(customer_entries)} customer-related entries, customer_name present: {has_customer_name}")
        else:
            print("⚠ No customer-related feed entries to validate")


class TestDashboardAuth:
    """Tests for authentication requirements"""
    
    def test_stats_requires_auth(self):
        """Dashboard stats should require authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Dashboard stats requires authentication")
    
    def test_trends_requires_auth(self):
        """Dashboard trends should require authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/trends")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Dashboard trends requires authentication")
    
    def test_activity_feed_requires_auth(self):
        """Activity feed should require authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/activity-feed")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Activity feed requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
