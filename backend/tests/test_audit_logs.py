"""
Audit Log Feature Tests
Tests for:
- GET /api/audit-logs - List audit logs with filtering
- GET /api/audit-logs/filters - Get filter options (action_types, modules, users)
- GET /api/audit-logs/export/csv - Export logs as CSV
- GET /api/audit-logs/export/pdf - Export logs as PDF
- Immutability verification - No PUT/DELETE endpoints for audit logs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "shyam@sentrixai.com"
ADMIN_PASSWORD = "Sentrix@2024"


class TestAuditLogAuthentication:
    """Test authentication for audit log endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_and_get_token(self):
        """Login and verify we can authenticate"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        assert data["user"]["role"] == "super_admin", "User should be super_admin"
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        return data["access_token"]


class TestAuditLogEndpoints:
    """Test audit log CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login and get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_audit_logs_returns_list(self):
        """GET /api/audit-logs returns logs with proper structure"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "logs" in data, "Response should have 'logs' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["logs"], list), "logs should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        
        print(f"✓ GET /api/audit-logs returned {len(data['logs'])} logs, total: {data['total']}")
        
        # Verify log entry structure if logs exist
        if data["logs"]:
            log = data["logs"][0]
            required_fields = ["timestamp", "user_name", "user_role", "action_type", "module", "ip_address"]
            for field in required_fields:
                assert field in log, f"Log entry missing required field: {field}"
            print(f"✓ Log entry has all required fields: {required_fields}")
    
    def test_get_audit_logs_with_pagination(self):
        """GET /api/audit-logs supports pagination with limit and skip"""
        # Get first page
        response1 = self.session.get(f"{BASE_URL}/api/audit-logs?limit=5&skip=0")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = self.session.get(f"{BASE_URL}/api/audit-logs?limit=5&skip=5")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify pagination works (if enough data)
        if data1["total"] > 5:
            assert len(data1["logs"]) == 5, "First page should have 5 logs"
            # Second page should have different logs
            if data2["logs"]:
                first_ids = [l.get("id") for l in data1["logs"]]
                second_ids = [l.get("id") for l in data2["logs"]]
                assert first_ids != second_ids, "Pagination should return different logs"
        
        print(f"✓ Pagination working - Page 1: {len(data1['logs'])} logs, Page 2: {len(data2['logs'])} logs")
    
    def test_filter_by_action_type(self):
        """GET /api/audit-logs supports filtering by action_type"""
        # First get available action types
        filters_response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        if filters_response.status_code == 200:
            filters = filters_response.json()
            if filters.get("action_types"):
                action_type = filters["action_types"][0]
                
                response = self.session.get(f"{BASE_URL}/api/audit-logs?action_type={action_type}")
                assert response.status_code == 200
                data = response.json()
                
                # All returned logs should have the filtered action_type
                for log in data["logs"]:
                    assert log["action_type"] == action_type, f"Log action_type mismatch: {log['action_type']} != {action_type}"
                
                print(f"✓ Filter by action_type '{action_type}' returned {len(data['logs'])} logs")
    
    def test_filter_by_module(self):
        """GET /api/audit-logs supports filtering by module"""
        filters_response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        if filters_response.status_code == 200:
            filters = filters_response.json()
            if filters.get("modules"):
                module = filters["modules"][0]
                
                response = self.session.get(f"{BASE_URL}/api/audit-logs?module={module}")
                assert response.status_code == 200
                data = response.json()
                
                for log in data["logs"]:
                    assert log["module"] == module, f"Log module mismatch: {log['module']} != {module}"
                
                print(f"✓ Filter by module '{module}' returned {len(data['logs'])} logs")
    
    def test_filter_by_user_name(self):
        """GET /api/audit-logs supports filtering by user_name"""
        filters_response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        if filters_response.status_code == 200:
            filters = filters_response.json()
            if filters.get("users"):
                user_name = filters["users"][0]
                
                response = self.session.get(f"{BASE_URL}/api/audit-logs?user_name={user_name}")
                assert response.status_code == 200
                data = response.json()
                
                # user_name filter uses regex, so partial match is allowed
                for log in data["logs"]:
                    assert user_name.lower() in log["user_name"].lower(), f"User name filter failed"
                
                print(f"✓ Filter by user_name '{user_name}' returned {len(data['logs'])} logs")
    
    def test_filter_by_date_range(self):
        """GET /api/audit-logs supports filtering by date range"""
        # Use a wide date range to ensure we get results
        response = self.session.get(f"{BASE_URL}/api/audit-logs?start_date=2024-01-01&end_date=2030-12-31")
        assert response.status_code == 200
        data = response.json()
        
        print(f"✓ Filter by date range returned {len(data['logs'])} logs")
    
    def test_get_audit_log_filters(self):
        """GET /api/audit-logs/filters returns distinct values for dropdowns"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "action_types" in data, "Response should have 'action_types'"
        assert "modules" in data, "Response should have 'modules'"
        assert "users" in data, "Response should have 'users'"
        
        assert isinstance(data["action_types"], list), "action_types should be a list"
        assert isinstance(data["modules"], list), "modules should be a list"
        assert isinstance(data["users"], list), "users should be a list"
        
        print(f"✓ GET /api/audit-logs/filters returned:")
        print(f"  - action_types: {data['action_types']}")
        print(f"  - modules: {data['modules']}")
        print(f"  - users: {data['users']}")


class TestAuditLogExport:
    """Test audit log export functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_export_csv(self):
        """GET /api/audit-logs/export/csv returns valid CSV file"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv")
        assert response.status_code == 200, f"CSV export failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Check content disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert ".csv" in content_disp, "Filename should have .csv extension"
        
        # Verify CSV content
        csv_content = response.text
        lines = csv_content.strip().split("\n")
        assert len(lines) >= 1, "CSV should have at least header row"
        
        # Check header row
        header = lines[0]
        expected_headers = ["Timestamp", "User", "Role", "Action", "Module", "Record ID", "IP Address"]
        for h in expected_headers:
            assert h in header, f"CSV header missing: {h}"
        
        print(f"✓ CSV export successful - {len(lines)} rows (including header)")
        print(f"  Headers: {header}")
    
    def test_export_pdf(self):
        """GET /api/audit-logs/export/pdf returns valid PDF file"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export/pdf")
        assert response.status_code == 200, f"PDF export failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        
        # Check content disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert ".pdf" in content_disp, "Filename should have .pdf extension"
        
        # Verify PDF content starts with PDF magic bytes
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', "PDF should start with %PDF magic bytes"
        
        print(f"✓ PDF export successful - {len(pdf_content)} bytes")
    
    def test_export_csv_with_filters(self):
        """CSV export respects filter parameters"""
        # Get filters first
        filters_response = self.session.get(f"{BASE_URL}/api/audit-logs/filters")
        if filters_response.status_code == 200:
            filters = filters_response.json()
            if filters.get("modules"):
                module = filters["modules"][0]
                
                response = self.session.get(f"{BASE_URL}/api/audit-logs/export/csv?module={module}")
                assert response.status_code == 200
                
                csv_content = response.text
                lines = csv_content.strip().split("\n")
                
                # Skip header, check data rows contain the module
                if len(lines) > 1:
                    for line in lines[1:]:
                        assert module in line, f"Filtered CSV should only contain module '{module}'"
                
                print(f"✓ CSV export with module filter '{module}' successful")


class TestAuditLogImmutability:
    """Test that audit logs cannot be modified or deleted"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_no_put_endpoint_for_audit_logs(self):
        """PUT /api/audit-logs/{id} should not exist (405 or 404)"""
        # Get a log ID first
        response = self.session.get(f"{BASE_URL}/api/audit-logs?limit=1")
        if response.status_code == 200 and response.json().get("logs"):
            log_id = response.json()["logs"][0].get("id", "test-id")
            
            # Try to update - should fail
            put_response = self.session.put(
                f"{BASE_URL}/api/audit-logs/{log_id}",
                json={"action_type": "modified"}
            )
            # Should return 404 (not found) or 405 (method not allowed)
            assert put_response.status_code in [404, 405, 422], \
                f"PUT should not be allowed, got {put_response.status_code}"
            
            print(f"✓ PUT /api/audit-logs/{log_id} correctly returns {put_response.status_code}")
    
    def test_no_delete_endpoint_for_audit_logs(self):
        """DELETE /api/audit-logs/{id} should not exist (405 or 404)"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs?limit=1")
        if response.status_code == 200 and response.json().get("logs"):
            log_id = response.json()["logs"][0].get("id", "test-id")
            
            # Try to delete - should fail
            delete_response = self.session.delete(f"{BASE_URL}/api/audit-logs/{log_id}")
            # Should return 404 (not found) or 405 (method not allowed)
            assert delete_response.status_code in [404, 405], \
                f"DELETE should not be allowed, got {delete_response.status_code}"
            
            print(f"✓ DELETE /api/audit-logs/{log_id} correctly returns {delete_response.status_code}")
    
    def test_no_post_endpoint_for_manual_audit_creation(self):
        """POST /api/audit-logs should not exist (logs are auto-created only)"""
        post_response = self.session.post(
            f"{BASE_URL}/api/audit-logs",
            json={
                "action_type": "manual_entry",
                "module": "test",
                "user_name": "Hacker"
            }
        )
        # Should return 404 (not found) or 405 (method not allowed)
        assert post_response.status_code in [404, 405], \
            f"POST should not be allowed, got {post_response.status_code}"
        
        print(f"✓ POST /api/audit-logs correctly returns {post_response.status_code}")


class TestAuditLogAccessControl:
    """Test role-based access control for audit logs"""
    
    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests should be denied"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/audit-logs")
        assert response.status_code in [401, 403], \
            f"Unauthenticated access should be denied, got {response.status_code}"
        
        print(f"✓ Unauthenticated access correctly denied with {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
