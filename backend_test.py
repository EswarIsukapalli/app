import requests
import sys
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import io

class DigitalWorkspaceTester:
    def __init__(self, base_url="https://submispot.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.student_token = None
        self.admin_user = None
        self.student_user = None
        self.tests_run = 0
        self.tests_passed = 0
        # New workspace-related variables
        self.created_workspace_id = None
        self.workspace_invite_code = None
        self.created_task_id = None
        self.submission_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")

    def make_request(self, method, endpoint, data=None, files=None, token=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        if files:
            headers.pop('Content-Type', None)  # Let requests set it for multipart

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_admin_signup(self):
        """Test admin user signup"""
        admin_data = {
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "AdminPass123!",
            "name": "Test Admin",
            "role": "admin"
        }
        
        success, response, status = self.make_request('POST', 'auth/signup', admin_data, expected_status=200)
        
        if success and 'user' in response and 'token' in response:
            self.admin_token = response['token']
            self.admin_user = response['user']
            self.log_test("Admin Signup", True)
            return True
        else:
            self.log_test("Admin Signup", False, f"Status: {status}, Response: {response}")
            return False

    def test_student_signup(self):
        """Test student user signup"""
        student_data = {
            "email": f"student_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "StudentPass123!",
            "name": "Test Student",
            "role": "student"
        }
        
        success, response, status = self.make_request('POST', 'auth/signup', student_data, expected_status=200)
        
        if success and 'user' in response and 'token' in response:
            self.student_token = response['token']
            self.student_user = response['user']
            self.log_test("Student Signup", True)
            return True
        else:
            self.log_test("Student Signup", False, f"Status: {status}, Response: {response}")
            return False

    def test_login(self):
        """Test login functionality"""
        if not self.admin_user:
            self.log_test("Admin Login", False, "No admin user to test login")
            return False
            
        login_data = {
            "email": self.admin_user['email'],
            "password": "AdminPass123!"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and 'token' in response:
            self.log_test("Admin Login", True)
            return True
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Response: {response}")
            return False

    def test_auth_me(self):
        """Test get current user endpoint"""
        success, response, status = self.make_request('GET', 'auth/me', token=self.admin_token, expected_status=200)
        
        if success and 'email' in response:
            self.log_test("Get Current User", True)
            return True
        else:
            self.log_test("Get Current User", False, f"Status: {status}, Response: {response}")
            return False

    def test_admin_stats(self):
        """Test admin statistics endpoint"""
        success, response, status = self.make_request('GET', 'admin/stats', token=self.admin_token, expected_status=200)
        
        if success and 'total_students' in response:
            self.log_test("Admin Stats", True)
            return True
        else:
            self.log_test("Admin Stats", False, f"Status: {status}, Response: {response}")
            return False

    def test_material_upload(self):
        """Test material upload functionality"""
        # Create a test file
        test_file_path = Path('/tmp/test_material.txt')
        test_file_path.write_text("This is a test learning material.")
        
        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_material.txt', f, 'text/plain')}
                data = {
                    'title': 'Test Material',
                    'type': 'note'
                }
                
                success, response, status = self.make_request(
                    'POST', 'materials', data=data, files=files, 
                    token=self.admin_token, expected_status=200
                )
                
                if success and 'id' in response:
                    self.created_material_id = response['id']
                    self.log_test("Material Upload", True)
                    return True
                else:
                    self.log_test("Material Upload", False, f"Status: {status}, Response: {response}")
                    return False
        finally:
            test_file_path.unlink(missing_ok=True)

    def test_get_materials(self):
        """Test get materials endpoint"""
        success, response, status = self.make_request('GET', 'materials', token=self.student_token, expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Materials", True)
            return True
        else:
            self.log_test("Get Materials", False, f"Status: {status}, Response: {response}")
            return False

    def test_create_task(self):
        """Test task creation"""
        deadline = (datetime.now() + timedelta(days=7)).isoformat()
        task_data = {
            "title": "Test Assignment",
            "description": "This is a test assignment for API testing",
            "deadline": deadline
        }
        
        success, response, status = self.make_request('POST', 'tasks', task_data, token=self.admin_token, expected_status=200)
        
        if success and 'id' in response:
            self.created_task_id = response['id']
            self.log_test("Create Task", True)
            return True
        else:
            self.log_test("Create Task", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_tasks(self):
        """Test get tasks endpoint"""
        success, response, status = self.make_request('GET', 'tasks', token=self.student_token, expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Tasks", True)
            return True
        else:
            self.log_test("Get Tasks", False, f"Status: {status}, Response: {response}")
            return False

    def test_complete_task(self):
        """Test task completion"""
        if not self.created_task_id:
            self.log_test("Complete Task", False, "No task ID available")
            return False
            
        success, response, status = self.make_request(
            'POST', f'tasks/{self.created_task_id}/complete', 
            token=self.student_token, expected_status=200
        )
        
        if success:
            self.log_test("Complete Task", True)
            return True
        else:
            self.log_test("Complete Task", False, f"Status: {status}, Response: {response}")
            return False

    def test_uncomplete_task(self):
        """Test task uncompletion"""
        if not self.created_task_id:
            self.log_test("Uncomplete Task", False, "No task ID available")
            return False
            
        success, response, status = self.make_request(
            'DELETE', f'tasks/{self.created_task_id}/complete', 
            token=self.student_token, expected_status=200
        )
        
        if success:
            self.log_test("Uncomplete Task", True)
            return True
        else:
            self.log_test("Uncomplete Task", False, f"Status: {status}, Response: {response}")
            return False

    def test_task_completions(self):
        """Test get task completions endpoint"""
        if not self.created_task_id:
            self.log_test("Get Task Completions", False, "No task ID available")
            return False
            
        success, response, status = self.make_request(
            'GET', f'tasks/{self.created_task_id}/completions', 
            token=self.admin_token, expected_status=200
        )
        
        if success and 'task' in response and 'completions' in response:
            self.log_test("Get Task Completions", True)
            return True
        else:
            self.log_test("Get Task Completions", False, f"Status: {status}, Response: {response}")
            return False

    def test_unauthorized_access(self):
        """Test unauthorized access protection"""
        # Test admin endpoint with student token
        success, response, status = self.make_request('GET', 'admin/stats', token=self.student_token, expected_status=403)
        
        if status == 403:
            self.log_test("Unauthorized Access Protection", True)
            return True
        else:
            self.log_test("Unauthorized Access Protection", False, f"Expected 403, got {status}")
            return False

    def cleanup(self):
        """Clean up created resources"""
        if self.created_material_id and self.admin_token:
            self.make_request('DELETE', f'materials/{self.created_material_id}', token=self.admin_token)

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting LMS Backend API Tests")
        print("=" * 50)
        
        # Authentication tests
        if not self.test_admin_signup():
            print("❌ Admin signup failed, stopping tests")
            return False
            
        if not self.test_student_signup():
            print("❌ Student signup failed, stopping tests")
            return False
            
        self.test_login()
        self.test_auth_me()
        self.test_unauthorized_access()
        
        # Admin functionality tests
        self.test_admin_stats()
        self.test_material_upload()
        
        # Student functionality tests
        self.test_get_materials()
        
        # Task management tests
        self.test_create_task()
        self.test_get_tasks()
        self.test_complete_task()
        self.test_task_completions()
        self.test_uncomplete_task()
        
        # Cleanup
        self.cleanup()
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = LMSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())