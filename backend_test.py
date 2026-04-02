#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class AMLGuardAPITester:
    def __init__(self, base_url="https://risk-screening.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.cookies = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, cookies=self.cookies)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, cookies=self.cookies)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, cookies=self.cookies)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        print(f"\n🔐 Testing login with {email}")
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success:
            if 'access_token' in response:
                self.token = response['access_token']
                self.user_data = response.get('user', {})
                print(f"✅ Login successful - Token received")
                print(f"   User: {self.user_data.get('name', 'Unknown')} ({self.user_data.get('role', 'Unknown')})")
                return True
            elif response.get('totp_required'):
                print(f"⚠️  2FA required - temp token: {response.get('temp_token', 'None')}")
                return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            # Validate response structure
            required_fields = ['total_customers', 'pending_reviews', 'high_risk_customers', 'open_cases']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False
            print(f"✅ Dashboard stats structure valid")
        
        return success

    def test_create_customer(self):
        """Test customer creation"""
        customer_data = {
            "customer_type": "individual",
            "customer_data": {
                "full_name": "John Test Customer",
                "date_of_birth": "1990-01-01",
                "nationality": "US",
                "country_of_residence": "US",
                "city": "New York",
                "occupation": "Software Engineer",
                "source_of_funds": "Employment",
                "source_of_wealth": "Salary",
                "purpose_of_relationship": "Banking"
            }
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            self.customer_id = response['id']
            print(f"✅ Customer created with ID: {self.customer_id}")
            return True
        return False

    def test_list_customers(self):
        """Test listing customers"""
        success, response = self.run_test(
            "List Customers",
            "GET",
            "customers",
            200
        )
        
        if success:
            if 'customers' in response and 'total' in response:
                print(f"✅ Customer list structure valid - Total: {response.get('total', 0)}")
                return True
        return False

    def test_screening_mock(self):
        """Test mock screening functionality"""
        if not hasattr(self, 'customer_id'):
            print("❌ No customer ID available for screening test")
            return False
            
        success, response = self.run_test(
            "Run Screening (Mock)",
            "POST",
            f"screening/run/{self.customer_id}",
            200
        )
        
        if success and 'results' in response:
            results = response['results']
            if 'sanctions' in results and 'pep' in results and 'adverse_media' in results:
                print(f"✅ Mock screening results structure valid")
                return True
        return False

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting AMLGuard API Tests")
    print("=" * 50)
    
    # Setup
    tester = AMLGuardAPITester()
    
    # Test credentials from test_credentials.md
    admin_email = "admin@amlguard.com"
    admin_password = "AMLGuard2026!"

    # Run authentication tests
    if not tester.test_login(admin_email, admin_password):
        print("❌ Login failed, stopping tests")
        return 1

    # Test authenticated endpoints
    tests = [
        tester.test_get_current_user,
        tester.test_dashboard_stats,
        tester.test_list_customers,
        tester.test_create_customer,
        tester.test_screening_mock,
        tester.test_logout
    ]

    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())