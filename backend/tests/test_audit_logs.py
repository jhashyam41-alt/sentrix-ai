"""
Audit Logs API Tests
Tests for: GET /api/audit-logs, GET /api/audit-logs/stats, GET /api/audit-logs/filters, GET /api/audit-logs/export/csv
"""
from __future__ import annotations

import pytest
import requests
from datetime import datetime, timedelta

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


class TestAuditLogsAPI:
    """Audit Logs endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        """Login and get session with auth cookie"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    # ==================== GET /api/audit-logs/stats ====================
    def test_audit_stats_returns_200(self):
        """Stats endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_audit_stats_has_required_fields(self):
        """Stats response has all 4 required fields"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/stats")
        data = response.json()
        assert "total_today" in data, "Missing total_today"
        assert "unique_users" in data, "Missing unique_users"
        assert "screenings_today" in data, "Missing screenings_today"
        assert "cases_resolved_today" in data, "Missing cases_resolved_today"
    
    def test_audit_stats_values_are_integers(self):
        """Stats values are integers"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/stats")
        data = response.json()
        assert isinstance(data["total_today"], int), "total_today should be int"
        assert isinstance(data["unique_users"], int), "unique_users should be int"
        assert isinstance(data["screenings_today"], int), "screenings_today should be int"
        assert isinstance(data["cases_resolved_today"], int), "cases_resolved_today should be int"
    
    # ==================== GET /api/audit-logs ====================
    def test_audit_logs_returns_200(self):
        """Audit logs endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_audit_logs_has_logs_and_total(self):
        """Response has logs array and total count"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs")
        data = response.json()
        assert "logs" in data, "Missing logs array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["logs"], list), "logs should be a list"
        assert isinstance(data["total"], int), "total should be int"
    
    def test_audit_logs_have_required_fields(self):
        """Each log entry has required fields"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?limit=10")
        data = response.json()
        assert len(data["logs"]) > 0, "No logs returned"
        
        required_fields = ["id", "timestamp", "user_name", "action_type", "module", "ip_address"]
        for log in data["logs"]:
            for field in required_fields:
                assert field in log, f"Log missing field: {field}"
    
    def test_audit_logs_seeded_100_demo_entries(self):
        """At least 100 demo audit logs were seeded"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?limit=1")
        data = response.json()
        # Should have at least 100 from seeding (may have more from actual usage)
        assert data["total"] >= 100, f"Expected at least 100 logs, got {data['total']}"
    
    def test_audit_logs_pagination_works(self):
        """Pagination with skip and limit works"""
        # Get first page
        page1 = self.session.get(f"{BASE_URL}/api/audit-logs?limit=10&skip=0").json()
        # Get second page
        page2 = self.session.get(f"{BASE_URL}/api/audit-logs?limit=10&skip=10").json()
        
        assert len(page1["logs"]) == 10, "First page should have 10 logs"
        assert len(page2["logs"]) == 10, "Second page should have 10 logs"
        # Ensure different logs
        page1_ids = {log["id"] for log in page1["logs"]}
        page2_ids = {log["id"] for log in page2["logs"]}
        assert page1_ids.isdisjoint(page2_ids), "Pages should have different logs"
    
    def test_audit_logs_filter_by_action_type(self):
        """Filter by action_type works"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?action_type=user_login")
        data = response.json()
        # All returned logs should have action_type=user_login
        for log in data["logs"]:
            assert log["action_type"] == "user_login", f"Expected user_login, got {log['action_type']}"
    
    def test_audit_logs_filter_by_user_name(self):
        """Filter by user_name works"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?user_name=Shyam")
        data = response.json()
        # All returned logs should contain Shyam in user_name
        for log in data["logs"]:
            assert "shyam" in log["user_name"].lower(), f"Expected Shyam in user_name, got {log['user_name']}"
    
    def test_audit_logs_filter_by_module(self):
        """Filter by module works"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?module=cases")
        data = response.json()
        for log in data["logs"]:
            assert log["module"] == "cases", f"Expected cases module, got {log['module']}"
    
    def test_audit_logs_filter_by_date_range(self):
        """Filter by date range works"""
        today = datetime.now().strftime("%Y-%m-%d")
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = self.session.get(f"{BASE_URL}/api/audit-logs?start_date={yesterday}&end_date={today}")
        data = response.json()
        # Should return logs (may be 0 if no activity in range)
        assert "logs" in data
        assert "total" in data
    
    # ==================== GET /api/audit-logs/filters ====================
    def test_audit_filters_returns_200(self):
        """Filters endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_audit_filters_has_required_fields(self):
        """Filters response has action_types, modules, users"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        data = response.json()
        assert "action_types" in data, "Missing action_types"
        assert "modules" in data, "Missing modules"
        assert "users" in data, "Missing users"
    
    def test_audit_filters_action_types_not_empty(self):
        """Action types list is not empty"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        data = response.json()
        assert len(data["action_types"]) > 0, "action_types should not be empty"
    
    def test_audit_filters_contains_expected_action_types(self):
        """Action types include expected values from seeded data"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        data = response.json()
        expected_types = ["screening_run", "case_created", "user_login", "customer_created"]
        for action_type in expected_types:
            assert action_type in data["action_types"], f"Missing expected action_type: {action_type}"
    
    def test_audit_filters_modules_not_empty(self):
        """Modules list is not empty"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        data = response.json()
        assert len(data["modules"]) > 0, "modules should not be empty"
    
    def test_audit_filters_users_not_empty(self):
        """Users list is not empty"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        data = response.json()
        assert len(data["users"]) > 0, "users should not be empty"
    
    # ==================== GET /api/audit-logs/export/csv ====================
    def test_audit_export_csv_returns_200(self):
        """CSV export returns 200"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_audit_export_csv_content_type(self):
        """CSV export has correct content type"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv")
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
    
    def test_audit_export_csv_has_content_disposition(self):
        """CSV export has Content-Disposition header for download"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv")
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Missing attachment in Content-Disposition"
        assert "audit_log" in content_disp, "Missing audit_log in filename"
        assert ".csv" in content_disp, "Missing .csv extension"
    
    def test_audit_export_csv_has_headers(self):
        """CSV export has expected column headers"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv")
        content = response.text
        first_line = content.split('\n')[0]
        expected_headers = ["Timestamp", "User", "Role", "Action", "Module", "Record ID", "IP Address", "Details"]
        for header in expected_headers:
            assert header in first_line, f"Missing header: {header}"
    
    def test_audit_export_csv_has_data_rows(self):
        """CSV export has data rows"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv")
        lines = response.text.strip().split('\n')
        # Should have header + at least some data rows
        assert len(lines) > 1, "CSV should have data rows beyond header"
    
    def test_audit_export_csv_with_filters(self):
        """CSV export respects filters"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv?action_type=user_login")
        content = response.text
        lines = content.strip().split('\n')
        # Skip header, check data rows
        for line in lines[1:]:
            if line.strip():
                assert "user_login" in line, f"Filtered CSV should only have user_login actions"
    
    # ==================== Action Type Colors (verify data exists) ====================
    def test_audit_logs_have_various_action_types(self):
        """Logs include various action types for color coding"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?limit=100")
        data = response.json()
        action_types = {log["action_type"] for log in data["logs"]}
        
        # Should have multiple action types
        assert len(action_types) >= 5, f"Expected at least 5 different action types, got {len(action_types)}"
    
    def test_audit_logs_have_details_field(self):
        """Some logs have details field for expandable rows"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?limit=50")
        data = response.json()
        
        logs_with_details = [log for log in data["logs"] if log.get("details")]
        assert len(logs_with_details) > 0, "Some logs should have details for expandable rows"
    
    def test_audit_logs_details_is_dict(self):
        """Details field is a dictionary when present"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?limit=50")
        data = response.json()
        
        for log in data["logs"]:
            if log.get("details"):
                assert isinstance(log["details"], dict), f"Details should be dict, got {type(log['details'])}"


class TestAuditLogsAccessControl:
    """Test access control for audit logs"""
    
    def test_audit_logs_requires_auth(self):
        """Audit logs endpoint requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/audit-logs")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_audit_stats_requires_auth(self):
        """Stats endpoint requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/audit-logs/stats")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_audit_filters_requires_auth(self):
        """Filters endpoint requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/audit-logs/filters")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_audit_export_requires_auth(self):
        """CSV export requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/audit-logs/export/csv")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
