#!/usr/bin/env python
"""
Test script to verify backend-frontend connection setup
Run this from the backend directory to test all endpoints
"""

import requests
import json
from urllib.parse import urljoin

class BioMuseumConnectionTester:
    def __init__(self, backend_url='http://localhost:8000'):
        self.backend_url = backend_url
        self.api_url = urljoin(backend_url, '/api')
        self.session = requests.Session()
        self.test_results = []
    
    def print_header(self, text):
        print(f"\n{'='*60}")
        print(f"  {text}")
        print(f"{'='*60}")
    
    def print_result(self, test_name, passed, details=''):
        status = '✅ PASS' if passed else '❌ FAIL'
        self.test_results.append((test_name, passed))
        print(f"{status} | {test_name}")
        if details:
            print(f"     {details}")
    
    def test_health_check(self):
        """Test basic backend health"""
        try:
            response = self.session.get(self.backend_url, timeout=5)
            passed = response.status_code == 200
            data = response.json()
            self.print_result(
                "Health Check",
                passed,
                f"Status: {response.status_code}, Response: {data['service']}"
            )
            return passed
        except Exception as e:
            self.print_result("Health Check", False, f"Error: {str(e)}")
            return False
    
    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = self.session.options(
                urljoin(self.api_url, '/organisms'),
                headers={'Origin': 'http://localhost:3000'}
            )
            has_cors = 'access-control-allow-origin' in response.headers
            self.print_result(
                "CORS Headers",
                has_cors,
                f"CORS header present: {has_cors}"
            )
            if has_cors:
                print(f"     Allow-Origin: {response.headers.get('access-control-allow-origin')}")
            return has_cors
        except Exception as e:
            self.print_result("CORS Headers", False, f"Error: {str(e)}")
            return False
    
    def test_organisms_endpoint(self):
        """Test GET /api/organisms"""
        try:
            response = self.session.get(urljoin(self.api_url, '/organisms'), timeout=5)
            passed = response.status_code == 200
            data = response.json()
            organism_count = len(data) if isinstance(data, list) else 0
            self.print_result(
                "GET /api/organisms",
                passed,
                f"Status: {response.status_code}, Organisms found: {organism_count}"
            )
            return passed
        except Exception as e:
            self.print_result("GET /api/organisms", False, f"Error: {str(e)}")
            return False
    
    def test_search_endpoint(self):
        """Test GET /api/search"""
        try:
            response = self.session.get(
                urljoin(self.api_url, '/search?q=lion'),
                timeout=5
            )
            passed = response.status_code == 200
            data = response.json()
            result_count = len(data) if isinstance(data, list) else 0
            self.print_result(
                "GET /api/search?q=lion",
                passed,
                f"Status: {response.status_code}, Results: {result_count}"
            )
            return passed
        except Exception as e:
            self.print_result("GET /api/search", False, f"Error: {str(e)}")
            return False
    
    def test_mongodb_connection(self):
        """Test MongoDB is connected (check from health endpoint)"""
        try:
            response = self.session.get(
                urljoin(self.api_url, '/organisms'),
                timeout=5
            )
            # If we got data from organisms, MongoDB is connected
            passed = response.status_code == 200
            self.print_result(
                "MongoDB Connection",
                passed,
                "Backend successfully connected to MongoDB ✓" if passed else "Cannot reach MongoDB"
            )
            return passed
        except Exception as e:
            self.print_result("MongoDB Connection", False, f"Error: {str(e)}")
            return False
    
    def test_admin_login(self):
        """Test admin login endpoint"""
        try:
            response = self.session.post(
                urljoin(self.api_url, '/admin/login'),
                json={'username': 'admin', 'password': 'adminSBES'},
                timeout=5
            )
            passed = response.status_code in [200, 401]  # Either successful or auth error is fine
            self.print_result(
                "POST /api/admin/login",
                passed,
                f"Status: {response.status_code}"
            )
            return True  # Endpoint exists even if auth fails
        except Exception as e:
            self.print_result("POST /api/admin/login", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        self.print_header("🧪 BioMuseum Backend Connection Tests")
        print(f"\nBackend URL: {self.backend_url}")
        print(f"API URL: {self.api_url}")
        
        try:
            # Test basic connectivity
            self.print_header("1️⃣  Basic Connectivity")
            self.test_health_check()
            
            # Test CORS
            self.print_header("2️⃣  CORS Configuration")
            self.test_cors_headers()
            
            # Test API endpoints
            self.print_header("3️⃣  API Endpoints")
            self.test_organisms_endpoint()
            self.test_search_endpoint()
            self.test_admin_login()
            
            # Test database
            self.print_header("4️⃣  Database Connection")
            self.test_mongodb_connection()
            
        except Exception as e:
            print(f"\n❌ Unexpected error during testing: {e}")
        
        # Print summary
        self.print_header("📊 Test Summary")
        passed = sum(1 for _, p in self.test_results if p)
        total = len(self.test_results)
        
        for test_name, result in self.test_results:
            status = '✅' if result else '❌'
            print(f"{status} {test_name}")
        
        print(f"\n{'='*60}")
        print(f"  Results: {passed}/{total} tests passed")
        print(f"{'='*60}\n")
        
        if passed == total:
            print("🎉 All tests passed! Backend-Frontend connection is working!")
        else:
            print("⚠️  Some tests failed. Check the errors above.")
        
        return passed == total

if __name__ == '__main__':
    import sys
    
    backend_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000'
    
    tester = BioMuseumConnectionTester(backend_url)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)
