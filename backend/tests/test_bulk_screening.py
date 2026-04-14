"""
Bulk Screening API Tests - Iteration 21
Tests for CSV template download, CSV upload, bulk screening run, progress, download, and history endpoints.
"""
import pytest
import requests
import io
import csv

from conftest import TEST_EMAIL, TEST_PASSWORD, BASE_URL


class TestBulkScreeningAuth:
    """Test authentication for bulk screening endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_csv_template_requires_auth(self):
        """GET /api/screenings/bulk/csv-template requires authentication"""
        response = requests.get(f"{BASE_URL}/api/screenings/bulk/csv-template")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: CSV template endpoint requires authentication")
    
    def test_upload_requires_auth(self):
        """POST /api/screenings/bulk/upload requires authentication"""
        files = {"file": ("test.csv", "name\nTest Name", "text/csv")}
        response = requests.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Upload endpoint requires authentication")
    
    def test_history_requires_auth(self):
        """GET /api/screenings/bulk/history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/screenings/bulk/history")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: History endpoint requires authentication")


class TestCSVTemplate:
    """Test CSV template download endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print(f"Logged in as {TEST_EMAIL}")
    
    def test_csv_template_returns_200(self):
        """GET /api/screenings/bulk/csv-template returns 200"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/csv-template")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: CSV template returns 200")
    
    def test_csv_template_content_type(self):
        """CSV template has correct content type"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/csv-template")
        assert "text/csv" in response.headers.get("Content-Type", ""), f"Expected text/csv, got {response.headers.get('Content-Type')}"
        print("PASS: CSV template has correct content type")
    
    def test_csv_template_has_correct_headers(self):
        """CSV template has correct column headers"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/csv-template")
        content = response.text
        reader = csv.reader(io.StringIO(content))
        headers = next(reader)
        expected_headers = ["name", "dob", "nationality", "id_type", "id_number"]
        assert headers == expected_headers, f"Expected headers {expected_headers}, got {headers}"
        print(f"PASS: CSV template has correct headers: {headers}")
    
    def test_csv_template_has_3_example_rows(self):
        """CSV template has 3 Indian example rows"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/csv-template")
        content = response.text
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        # First row is header, next 3 are examples
        assert len(rows) >= 4, f"Expected at least 4 rows (1 header + 3 examples), got {len(rows)}"
        
        # Check example rows have Indian names
        example_names = [rows[1][0], rows[2][0], rows[3][0]]
        print(f"Example names: {example_names}")
        
        # Verify at least one has Indian nationality
        nationalities = [rows[1][2] if len(rows[1]) > 2 else "", rows[2][2] if len(rows[2]) > 2 else "", rows[3][2] if len(rows[3]) > 2 else ""]
        assert "IN" in nationalities, f"Expected at least one Indian nationality, got {nationalities}"
        print(f"PASS: CSV template has 3 example rows with Indian data")


class TestCSVUpload:
    """Test CSV upload endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    def test_upload_valid_csv_returns_batch_id(self):
        """POST /api/screenings/bulk/upload accepts valid CSV and returns batch_id"""
        csv_content = "name,dob,nationality,id_type,id_number\nTest User One,1990-01-15,IN,PAN,ABCDE1234F\nTest User Two,1985-06-20,IN,AADHAAR,123456789012"
        files = {"file": ("test_upload.csv", csv_content, "text/csv")}
        
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "batch_id" in data, f"Response missing batch_id: {data}"
        assert "total" in data, f"Response missing total: {data}"
        assert "preview" in data, f"Response missing preview: {data}"
        assert data["total"] == 2, f"Expected 2 entities, got {data['total']}"
        print(f"PASS: Upload returns batch_id={data['batch_id']}, total={data['total']}")
        return data["batch_id"]
    
    def test_upload_empty_csv_returns_400(self):
        """POST /api/screenings/bulk/upload rejects empty CSV with 400"""
        csv_content = "name,dob,nationality\n"  # Header only, no data
        files = {"file": ("empty.csv", csv_content, "text/csv")}
        
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Empty CSV returns 400")
    
    def test_upload_invalid_csv_no_name_column_returns_400(self):
        """POST /api/screenings/bulk/upload rejects CSV without name column"""
        csv_content = "full_name,dob,nationality\nTest User,1990-01-15,IN"  # Wrong column name
        files = {"file": ("invalid.csv", csv_content, "text/csv")}
        
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: CSV without 'name' column returns 400")
    
    def test_upload_preview_contains_entity_data(self):
        """Upload preview contains parsed entity data"""
        csv_content = "name,dob,nationality,id_type,id_number\nRajesh Kumar,1988-03-10,IN,PAN,XYZPK5678A"
        files = {"file": ("preview_test.csv", csv_content, "text/csv")}
        
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        assert response.status_code == 200
        
        data = response.json()
        preview = data.get("preview", [])
        assert len(preview) >= 1, f"Expected at least 1 preview row, got {len(preview)}"
        
        first_row = preview[0]
        assert first_row.get("name") == "Rajesh Kumar", f"Expected name 'Rajesh Kumar', got {first_row.get('name')}"
        assert first_row.get("nationality") == "IN", f"Expected nationality 'IN', got {first_row.get('nationality')}"
        print(f"PASS: Preview contains correct entity data: {first_row}")


class TestBulkScreeningRun:
    """Test bulk screening run endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    def _upload_csv(self, csv_content):
        """Helper to upload CSV and return batch_id"""
        files = {"file": ("test.csv", csv_content, "text/csv")}
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        return response.json()["batch_id"]
    
    def test_run_screening_returns_results(self):
        """POST /api/screenings/bulk/{batch_id}/run screens all entities and returns results"""
        csv_content = "name,dob,nationality,id_type,id_number\nBulk Test User,1992-05-20,IN,PAN,BULKP1234A"
        batch_id = self._upload_csv(csv_content)
        
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/{batch_id}/run")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "completed", f"Expected status 'completed', got {data.get('status')}"
        assert "results" in data, f"Response missing results: {data}"
        assert data.get("total") == 1, f"Expected total 1, got {data.get('total')}"
        print(f"PASS: Bulk screening completed with {data.get('total')} results")
        return batch_id, data
    
    def test_run_screening_results_have_required_fields(self):
        """Screening results have has_match, risk_score, sla_status"""
        csv_content = "name,dob,nationality\nField Test User,1990-01-01,IN"
        batch_id = self._upload_csv(csv_content)
        
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/{batch_id}/run")
        assert response.status_code == 200
        
        data = response.json()
        results = data.get("results", [])
        assert len(results) >= 1, f"Expected at least 1 result, got {len(results)}"
        
        result = results[0]
        required_fields = ["full_name", "has_match", "risk_score", "risk_level", "sla_status"]
        for field in required_fields:
            assert field in result, f"Result missing required field '{field}': {result}"
        
        # Validate field types
        assert isinstance(result["has_match"], bool), f"has_match should be bool, got {type(result['has_match'])}"
        assert isinstance(result["risk_score"], int), f"risk_score should be int, got {type(result['risk_score'])}"
        assert result["sla_status"] in ["on_time", "at_risk", "breached"], f"Invalid sla_status: {result['sla_status']}"
        print(f"PASS: Results have all required fields: {required_fields}")
    
    def test_run_screening_invalid_batch_returns_404(self):
        """POST /api/screenings/bulk/{invalid_batch_id}/run returns 404"""
        response = self.session.post(f"{BASE_URL}/api/screenings/bulk/invalid-batch-id-12345/run")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid batch_id returns 404")
    
    def test_run_screening_already_completed_returns_400(self):
        """POST /api/screenings/bulk/{batch_id}/run on completed batch returns 400"""
        csv_content = "name\nDouble Run Test"
        batch_id = self._upload_csv(csv_content)
        
        # First run
        response1 = self.session.post(f"{BASE_URL}/api/screenings/bulk/{batch_id}/run")
        assert response1.status_code == 200, f"First run failed: {response1.text}"
        
        # Second run should fail
        response2 = self.session.post(f"{BASE_URL}/api/screenings/bulk/{batch_id}/run")
        assert response2.status_code == 400, f"Expected 400 for already completed batch, got {response2.status_code}"
        print("PASS: Running already completed batch returns 400")


class TestBulkScreeningProgress:
    """Test bulk screening progress endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
    
    def test_progress_returns_screened_count_and_total(self):
        """GET /api/screenings/bulk/{batch_id}/progress returns screened_count and total"""
        # Upload and run a batch first
        csv_content = "name\nProgress Test User"
        files = {"file": ("progress.csv", csv_content, "text/csv")}
        upload_response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        batch_id = upload_response.json()["batch_id"]
        
        # Run screening
        self.session.post(f"{BASE_URL}/api/screenings/bulk/{batch_id}/run")
        
        # Check progress
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/{batch_id}/progress")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "screened_count" in data, f"Response missing screened_count: {data}"
        assert "total_entities" in data, f"Response missing total_entities: {data}"
        assert data["status"] == "completed", f"Expected status 'completed', got {data['status']}"
        print(f"PASS: Progress returns screened_count={data['screened_count']}, total_entities={data['total_entities']}")
    
    def test_progress_invalid_batch_returns_404(self):
        """GET /api/screenings/bulk/{invalid_batch_id}/progress returns 404"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/nonexistent-batch-xyz/progress")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid batch_id progress returns 404")


class TestBulkScreeningDownload:
    """Test bulk screening Excel download endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
    
    def _create_completed_batch(self):
        """Helper to create and complete a batch"""
        csv_content = "name,dob,nationality\nDownload Test User,1995-08-15,IN"
        files = {"file": ("download.csv", csv_content, "text/csv")}
        upload_response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        batch_id = upload_response.json()["batch_id"]
        self.session.post(f"{BASE_URL}/api/screenings/bulk/{batch_id}/run")
        return batch_id
    
    def test_download_returns_xlsx_file(self):
        """GET /api/screenings/bulk/{batch_id}/download returns .xlsx file"""
        batch_id = self._create_completed_batch()
        
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/{batch_id}/download")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, f"Expected Excel content type, got {content_type}"
        
        content_disposition = response.headers.get("Content-Disposition", "")
        assert ".xlsx" in content_disposition, f"Expected .xlsx in Content-Disposition, got {content_disposition}"
        
        # Verify content is not empty
        assert len(response.content) > 0, "Downloaded file is empty"
        print(f"PASS: Download returns .xlsx file ({len(response.content)} bytes)")
    
    def test_download_invalid_batch_returns_404(self):
        """GET /api/screenings/bulk/{invalid_batch_id}/download returns 404"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/invalid-batch-download/download")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid batch_id download returns 404")
    
    def test_download_incomplete_batch_returns_400(self):
        """GET /api/screenings/bulk/{batch_id}/download on incomplete batch returns 400"""
        # Upload but don't run
        csv_content = "name\nIncomplete Batch User"
        files = {"file": ("incomplete.csv", csv_content, "text/csv")}
        upload_response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        batch_id = upload_response.json()["batch_id"]
        
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/{batch_id}/download")
        assert response.status_code == 400, f"Expected 400 for incomplete batch, got {response.status_code}"
        print("PASS: Download incomplete batch returns 400")


class TestBulkScreeningHistory:
    """Test bulk screening history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
    
    def test_history_returns_batches_list(self):
        """GET /api/screenings/bulk/history returns last 10 batches"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "batches" in data, f"Response missing batches: {data}"
        assert isinstance(data["batches"], list), f"batches should be a list, got {type(data['batches'])}"
        print(f"PASS: History returns {len(data['batches'])} batches")
    
    def test_history_batch_has_required_fields(self):
        """History batch items have required fields"""
        # First create a batch
        csv_content = "name\nHistory Test User"
        files = {"file": ("history.csv", csv_content, "text/csv")}
        upload_response = self.session.post(f"{BASE_URL}/api/screenings/bulk/upload", files=files)
        batch_id = upload_response.json()["batch_id"]
        self.session.post(f"{BASE_URL}/api/screenings/bulk/{batch_id}/run")
        
        # Get history
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/history")
        assert response.status_code == 200
        
        data = response.json()
        batches = data.get("batches", [])
        assert len(batches) >= 1, f"Expected at least 1 batch in history, got {len(batches)}"
        
        batch = batches[0]
        required_fields = ["batch_id", "status", "total_entities", "created_at"]
        for field in required_fields:
            assert field in batch, f"Batch missing required field '{field}': {batch}"
        
        # Verify entities and results are excluded for performance
        assert "entities" not in batch, "entities should be excluded from history"
        assert "results" not in batch, "results should be excluded from history"
        print(f"PASS: History batch has required fields and excludes large arrays")
    
    def test_history_shows_completed_batches_with_match_count(self):
        """Completed batches in history show match_count"""
        response = self.session.get(f"{BASE_URL}/api/screenings/bulk/history")
        data = response.json()
        
        completed_batches = [b for b in data.get("batches", []) if b.get("status") == "completed"]
        if completed_batches:
            batch = completed_batches[0]
            assert "match_count" in batch, f"Completed batch missing match_count: {batch}"
            print(f"PASS: Completed batch has match_count={batch.get('match_count')}")
        else:
            print("SKIP: No completed batches in history to verify match_count")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
