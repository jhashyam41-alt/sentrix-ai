"""
Backend tests for Cases page (Kanban board) endpoints.
Tests: GET /api/cases, GET /api/cases/stats, PATCH /api/cases/{id}/status,
       POST /api/cases/{id}/resolve, PUT /api/cases/{id}/assign,
       POST /api/cases/{id}/generate-sar, GET /api/team-members,
       GET /api/cases/{id}/notes, POST /api/cases/{id}/notes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCasesBackend:
    """Test suite for Cases page backend endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "shyam@sentrixai.com", "password": "Sentrix@2024"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        # Set cookie for subsequent requests
        self.session.cookies.set("access_token", self.token)
    
    # ==========================================
    # GET /api/cases - List all cases
    # ==========================================
    
    def test_get_cases_returns_list(self):
        """GET /api/cases returns list of cases"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        assert "total" in data
        assert isinstance(data["cases"], list)
        print(f"✓ GET /api/cases returns {len(data['cases'])} cases, total: {data['total']}")
    
    def test_cases_have_required_fields(self):
        """Cases have all required fields for Kanban display"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()["cases"]
        
        if len(cases) > 0:
            case = cases[0]
            required_fields = ["id", "case_id", "customer_name", "case_type", "priority", "status", "created_at"]
            for field in required_fields:
                assert field in case, f"Missing field: {field}"
            print(f"✓ Case has all required fields: {required_fields}")
    
    def test_cases_have_valid_statuses(self):
        """All cases have valid Kanban column statuses"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()["cases"]
        
        valid_statuses = ["open", "in_progress", "escalated", "closed"]
        for case in cases:
            assert case["status"] in valid_statuses, f"Invalid status: {case['status']}"
        print(f"✓ All {len(cases)} cases have valid statuses")
    
    def test_cases_have_valid_priorities(self):
        """All cases have valid priority levels"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()["cases"]
        
        valid_priorities = ["critical", "high", "medium", "low"]
        for case in cases:
            assert case["priority"] in valid_priorities, f"Invalid priority: {case['priority']}"
        print(f"✓ All {len(cases)} cases have valid priorities")
    
    def test_cases_have_valid_case_types(self):
        """All cases have valid case types"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()["cases"]
        
        valid_types = ["pep_match", "sanctions_match", "adverse_media", "suspicious_transaction"]
        for case in cases:
            assert case["case_type"] in valid_types, f"Invalid case_type: {case['case_type']}"
        print(f"✓ All {len(cases)} cases have valid case types")
    
    # ==========================================
    # GET /api/cases/stats - Stats for top bar
    # ==========================================
    
    def test_get_case_stats(self):
        """GET /api/cases/stats returns status counts"""
        response = self.session.get(f"{BASE_URL}/api/cases/stats")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["total", "open", "in_progress", "escalated", "closed", "sar_filed"]
        for field in required_fields:
            assert field in data, f"Missing stat field: {field}"
            assert isinstance(data[field], int), f"Stat {field} should be int"
        
        print(f"✓ Stats: total={data['total']}, open={data['open']}, escalated={data['escalated']}, sar_filed={data['sar_filed']}")
    
    def test_stats_total_matches_sum(self):
        """Stats total equals sum of status counts"""
        response = self.session.get(f"{BASE_URL}/api/cases/stats")
        assert response.status_code == 200
        data = response.json()
        
        calculated_total = data["open"] + data["in_progress"] + data["escalated"] + data["closed"]
        assert data["total"] == calculated_total, f"Total {data['total']} != sum {calculated_total}"
        print(f"✓ Stats total ({data['total']}) matches sum of status counts")
    
    # ==========================================
    # GET /api/team-members - Assignment dropdown
    # ==========================================
    
    def test_get_team_members(self):
        """GET /api/team-members returns 3 team members"""
        response = self.session.get(f"{BASE_URL}/api/team-members")
        assert response.status_code == 200
        data = response.json()
        
        assert "members" in data
        assert len(data["members"]) == 3, f"Expected 3 team members, got {len(data['members'])}"
        print(f"✓ GET /api/team-members returns {len(data['members'])} members")
    
    def test_team_members_have_required_fields(self):
        """Team members have id, name, role"""
        response = self.session.get(f"{BASE_URL}/api/team-members")
        assert response.status_code == 200
        members = response.json()["members"]
        
        expected_names = ["Priya Sharma", "Rahul Verma", "Anita Desai"]
        expected_roles = ["Compliance Officer", "Senior Analyst", "MLRO"]
        
        for member in members:
            assert "id" in member
            assert "name" in member
            assert "role" in member
            assert member["name"] in expected_names, f"Unexpected member: {member['name']}"
        
        print(f"✓ Team members: {[m['name'] for m in members]}")
    
    # ==========================================
    # PATCH /api/cases/{id}/status - Kanban DnD
    # ==========================================
    
    def test_update_case_status(self):
        """PATCH /api/cases/{id}/status updates status"""
        # Get a case to update
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        # Find an open case to update
        open_case = next((c for c in cases if c["status"] == "open"), None)
        if not open_case:
            pytest.skip("No open case available for status update test")
        
        case_id = open_case["id"]
        original_status = open_case["status"]
        
        # Update to in_progress
        response = self.session.patch(
            f"{BASE_URL}/api/cases/{case_id}/status",
            json={"status": "in_progress"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "in_progress"
        print(f"✓ Updated case {open_case['case_id']} from {original_status} to in_progress")
        
        # Revert back to original status
        self.session.patch(
            f"{BASE_URL}/api/cases/{case_id}/status",
            json={"status": original_status}
        )
    
    def test_update_status_invalid_status(self):
        """PATCH /api/cases/{id}/status rejects invalid status"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        if len(cases) == 0:
            pytest.skip("No cases available")
        
        case_id = cases[0]["id"]
        response = self.session.patch(
            f"{BASE_URL}/api/cases/{case_id}/status",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400
        print("✓ Invalid status rejected with 400")
    
    def test_update_status_nonexistent_case(self):
        """PATCH /api/cases/{id}/status returns 404 for nonexistent case"""
        response = self.session.patch(
            f"{BASE_URL}/api/cases/nonexistent-id/status",
            json={"status": "open"}
        )
        assert response.status_code == 404
        print("✓ Nonexistent case returns 404")
    
    # ==========================================
    # POST /api/cases/{id}/resolve - Resolution modal
    # ==========================================
    
    def test_resolve_case_valid_types(self):
        """POST /api/cases/{id}/resolve accepts valid resolution types"""
        valid_types = ["true_match_sar_filed", "true_match_risk_accepted", "false_positive", "duplicate"]
        
        # Get an in_progress case to resolve
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        in_progress_case = next((c for c in cases if c["status"] == "in_progress"), None)
        if not in_progress_case:
            pytest.skip("No in_progress case available for resolve test")
        
        case_id = in_progress_case["id"]
        
        # Resolve with false_positive (least impactful)
        response = self.session.post(
            f"{BASE_URL}/api/cases/{case_id}/resolve",
            json={"resolution_type": "false_positive"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["resolution_type"] == "false_positive"
        print(f"✓ Resolved case {in_progress_case['case_id']} as false_positive")
        
        # Revert to in_progress for other tests
        self.session.patch(
            f"{BASE_URL}/api/cases/{case_id}/status",
            json={"status": "in_progress"}
        )
    
    def test_resolve_case_invalid_type(self):
        """POST /api/cases/{id}/resolve rejects invalid resolution type"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        if len(cases) == 0:
            pytest.skip("No cases available")
        
        case_id = cases[0]["id"]
        response = self.session.post(
            f"{BASE_URL}/api/cases/{case_id}/resolve",
            json={"resolution_type": "invalid_type"}
        )
        assert response.status_code == 400
        print("✓ Invalid resolution type rejected with 400")
    
    # ==========================================
    # PUT /api/cases/{id}/assign - Assignment
    # ==========================================
    
    def test_assign_case_to_team_member(self):
        """PUT /api/cases/{id}/assign assigns case to team member"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        # Find an unassigned case
        unassigned_case = next((c for c in cases if not c.get("assigned_to")), None)
        if not unassigned_case:
            # Use any case
            unassigned_case = cases[0] if cases else None
        
        if not unassigned_case:
            pytest.skip("No cases available for assignment test")
        
        case_id = unassigned_case["id"]
        original_assigned = unassigned_case.get("assigned_to")
        
        # Assign to Priya Sharma
        response = self.session.put(
            f"{BASE_URL}/api/cases/{case_id}/assign",
            json={"assigned_to": "Priya Sharma"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["assigned_to"] == "Priya Sharma"
        print(f"✓ Assigned case {unassigned_case['case_id']} to Priya Sharma")
        
        # Verify assignment persisted
        verify_response = self.session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert verify_response.status_code == 200
        assert verify_response.json()["assigned_to"] == "Priya Sharma"
        print("✓ Assignment persisted in database")
        
        # Revert assignment
        self.session.put(
            f"{BASE_URL}/api/cases/{case_id}/assign",
            json={"assigned_to": original_assigned}
        )
    
    def test_unassign_case(self):
        """PUT /api/cases/{id}/assign with null unassigns case"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        # Find an assigned case
        assigned_case = next((c for c in cases if c.get("assigned_to")), None)
        if not assigned_case:
            pytest.skip("No assigned case available")
        
        case_id = assigned_case["id"]
        original_assigned = assigned_case["assigned_to"]
        
        # Unassign
        response = self.session.put(
            f"{BASE_URL}/api/cases/{case_id}/assign",
            json={"assigned_to": None}
        )
        assert response.status_code == 200
        print(f"✓ Unassigned case {assigned_case['case_id']}")
        
        # Revert
        self.session.put(
            f"{BASE_URL}/api/cases/{case_id}/assign",
            json={"assigned_to": original_assigned}
        )
    
    # ==========================================
    # POST /api/cases/{id}/generate-sar - SAR Report
    # ==========================================
    
    def test_generate_sar_report(self):
        """POST /api/cases/{id}/generate-sar returns mock SAR report"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        if len(cases) == 0:
            pytest.skip("No cases available")
        
        case_id = cases[0]["id"]
        response = self.session.post(f"{BASE_URL}/api/cases/{case_id}/generate-sar")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["sar_reference", "generated_at", "subject", "risk_assessment", "narrative", "status"]
        for field in required_fields:
            assert field in data, f"Missing SAR field: {field}"
        
        # Verify subject has customer data
        assert "full_name" in data["subject"]
        assert "date_of_birth" in data["subject"]
        assert "nationality" in data["subject"]
        
        # Verify risk assessment
        assert "risk_score" in data["risk_assessment"]
        assert "risk_level" in data["risk_assessment"]
        
        print(f"✓ Generated SAR report: {data['sar_reference']}")
        print(f"  Subject: {data['subject']['full_name']}")
        print(f"  Risk: {data['risk_assessment']['risk_score']}/{data['risk_assessment']['risk_level']}")
    
    def test_generate_sar_nonexistent_case(self):
        """POST /api/cases/{id}/generate-sar returns 404 for nonexistent case"""
        response = self.session.post(f"{BASE_URL}/api/cases/nonexistent-id/generate-sar")
        assert response.status_code == 404
        print("✓ Nonexistent case returns 404 for SAR generation")
    
    # ==========================================
    # GET/POST /api/cases/{id}/notes - Activity log
    # ==========================================
    
    def test_get_case_notes(self):
        """GET /api/cases/{id}/notes returns notes list"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        if len(cases) == 0:
            pytest.skip("No cases available")
        
        case_id = cases[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/cases/{case_id}/notes")
        assert response.status_code == 200
        
        data = response.json()
        assert "notes" in data
        assert isinstance(data["notes"], list)
        print(f"✓ GET /api/cases/{case_id}/notes returns {len(data['notes'])} notes")
    
    def test_add_case_note(self):
        """POST /api/cases/{id}/notes adds a comment"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        if len(cases) == 0:
            pytest.skip("No cases available")
        
        case_id = cases[0]["id"]
        test_note = "TEST_NOTE: Automated test comment for case activity log"
        
        response = self.session.post(
            f"{BASE_URL}/api/cases/{case_id}/notes",
            json={"note": test_note}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "note" in data
        assert data["note"]["note"] == test_note
        print(f"✓ Added note to case: {test_note[:50]}...")
        
        # Verify note persisted
        notes_response = self.session.get(f"{BASE_URL}/api/cases/{case_id}/notes")
        notes = notes_response.json()["notes"]
        assert any(n["note"] == test_note for n in notes), "Note not found in notes list"
        print("✓ Note persisted in database")
    
    def test_case_notes_have_required_fields(self):
        """Case notes have required fields"""
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()["cases"]
        
        if len(cases) == 0:
            pytest.skip("No cases available")
        
        case_id = cases[0]["id"]
        notes_response = self.session.get(f"{BASE_URL}/api/cases/{case_id}/notes")
        notes = notes_response.json()["notes"]
        
        if len(notes) > 0:
            note = notes[0]
            required_fields = ["id", "case_id", "note", "created_at"]
            for field in required_fields:
                assert field in note, f"Missing note field: {field}"
            print(f"✓ Notes have required fields: {required_fields}")
    
    # ==========================================
    # Demo data verification
    # ==========================================
    
    def test_demo_cases_seeded(self):
        """8 demo cases are seeded"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()["cases"]
        
        # Should have at least 8 demo cases
        assert len(cases) >= 8, f"Expected at least 8 cases, got {len(cases)}"
        print(f"✓ {len(cases)} cases exist (expected at least 8 demo cases)")
    
    def test_demo_cases_have_urgency_data(self):
        """Demo cases have created_at for urgency calculation"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        cases = response.json()["cases"]
        
        for case in cases:
            assert "created_at" in case, f"Case {case['case_id']} missing created_at"
        print("✓ All cases have created_at for urgency dot calculation")
    
    def test_demo_cases_distribution(self):
        """Demo cases are distributed across statuses"""
        response = self.session.get(f"{BASE_URL}/api/cases/stats")
        stats = response.json()
        
        # Should have cases in multiple columns
        non_empty_columns = sum(1 for s in ["open", "in_progress", "escalated", "closed"] if stats.get(s, 0) > 0)
        assert non_empty_columns >= 2, f"Expected cases in at least 2 columns, got {non_empty_columns}"
        print(f"✓ Cases distributed: open={stats['open']}, in_progress={stats['in_progress']}, escalated={stats['escalated']}, closed={stats['closed']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
