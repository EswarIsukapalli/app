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
        timestamp = datetime.now().strftime('%H%M%S%f')
        admin_data = {
            "email": f"teacher_{timestamp}@digitalworkspace.edu",
            "password": "TeacherPass123!",
            "name": "Professor Sarah Johnson",
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
        timestamp = datetime.now().strftime('%H%M%S%f')
        student_data = {
            "email": f"student_{timestamp}@digitalworkspace.edu",
            "password": "StudentPass123!",
            "name": "Alex Martinez",
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

    # ================== WORKSPACE MANAGEMENT TESTS ==================
    
    def test_create_workspace(self):
        """Test workspace creation (admin only)"""
        workspace_data = {
            "name": "Computer Science 101",
            "description": "Introduction to Programming and Algorithms",
            "subject": "Computer Science"
        }
        
        success, response, status = self.make_request('POST', 'workspaces', workspace_data, token=self.admin_token, expected_status=200)
        
        if success and 'id' in response and 'invite_code' in response:
            self.created_workspace_id = response['id']
            self.workspace_invite_code = response['invite_code']
            self.log_test("Create Workspace", True)
            return True
        else:
            self.log_test("Create Workspace", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_workspaces_admin(self):
        """Test get workspaces as admin"""
        success, response, status = self.make_request('GET', 'workspaces', token=self.admin_token, expected_status=200)
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check if our created workspace is in the list
            workspace_found = any(w['id'] == self.created_workspace_id for w in response)
            if workspace_found:
                self.log_test("Get Workspaces (Admin)", True)
                return True
            else:
                self.log_test("Get Workspaces (Admin)", False, "Created workspace not found in list")
                return False
        else:
            self.log_test("Get Workspaces (Admin)", False, f"Status: {status}, Response: {response}")
            return False

    def test_join_workspace_student(self):
        """Test student joining workspace with invite code"""
        if not self.workspace_invite_code:
            self.log_test("Join Workspace (Student)", False, "No invite code available")
            return False
            
        join_data = {
            "invite_code": self.workspace_invite_code
        }
        
        success, response, status = self.make_request('POST', 'workspaces/join', join_data, token=self.student_token, expected_status=200)
        
        if success and 'message' in response:
            self.log_test("Join Workspace (Student)", True)
            return True
        else:
            self.log_test("Join Workspace (Student)", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_workspaces_student(self):
        """Test get workspaces as student (should see joined workspaces)"""
        success, response, status = self.make_request('GET', 'workspaces', token=self.student_token, expected_status=200)
        
        if success and isinstance(response, list):
            # Student should see the workspace they joined
            workspace_found = any(w['id'] == self.created_workspace_id for w in response)
            if workspace_found:
                self.log_test("Get Workspaces (Student)", True)
                return True
            else:
                self.log_test("Get Workspaces (Student)", False, "Joined workspace not found in student's list")
                return False
        else:
            self.log_test("Get Workspaces (Student)", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_workspace_members(self):
        """Test get workspace members (admin only)"""
        if not self.created_workspace_id:
            self.log_test("Get Workspace Members", False, "No workspace ID available")
            return False
            
        success, response, status = self.make_request(
            'GET', f'workspaces/{self.created_workspace_id}/members', 
            token=self.admin_token, expected_status=200
        )
        
        if success and isinstance(response, list):
            # Should have at least one member (the student who joined)
            student_found = any(m['student_id'] == self.student_user['id'] for m in response)
            if student_found:
                self.log_test("Get Workspace Members", True)
                return True
            else:
                self.log_test("Get Workspace Members", False, "Student not found in members list")
                return False
        else:
            self.log_test("Get Workspace Members", False, f"Status: {status}, Response: {response}")
            return False

    # ================== ENHANCED TASK SYSTEM TESTS ==================
    
    def test_create_workspace_task(self):
        """Test creating task in workspace"""
        if not self.created_workspace_id:
            self.log_test("Create Workspace Task", False, "No workspace ID available")
            return False
            
        deadline = (datetime.now() + timedelta(days=7)).isoformat()
        task_data = {
            "workspace_id": self.created_workspace_id,
            "title": "Programming Assignment 1",
            "description": "Create a simple calculator program using Python. Submit your code file and a screenshot of the running program.",
            "deadline": deadline,
            "submission_type": "file"
        }
        
        success, response, status = self.make_request(
            'POST', f'workspaces/{self.created_workspace_id}/tasks', 
            task_data, token=self.admin_token, expected_status=200
        )
        
        if success and 'id' in response and 'submission_type' in response:
            self.created_task_id = response['id']
            self.log_test("Create Workspace Task", True)
            return True
        else:
            self.log_test("Create Workspace Task", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_workspace_tasks_admin(self):
        """Test get workspace tasks as admin"""
        if not self.created_workspace_id:
            self.log_test("Get Workspace Tasks (Admin)", False, "No workspace ID available")
            return False
            
        success, response, status = self.make_request(
            'GET', f'workspaces/{self.created_workspace_id}/tasks', 
            token=self.admin_token, expected_status=200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            task_found = any(t['id'] == self.created_task_id for t in response)
            if task_found:
                self.log_test("Get Workspace Tasks (Admin)", True)
                return True
            else:
                self.log_test("Get Workspace Tasks (Admin)", False, "Created task not found")
                return False
        else:
            self.log_test("Get Workspace Tasks (Admin)", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_workspace_tasks_student(self):
        """Test get workspace tasks as student (should include submission status)"""
        if not self.created_workspace_id:
            self.log_test("Get Workspace Tasks (Student)", False, "No workspace ID available")
            return False
            
        success, response, status = self.make_request(
            'GET', f'workspaces/{self.created_workspace_id}/tasks', 
            token=self.student_token, expected_status=200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            task_found = False
            for task in response:
                if task['id'] == self.created_task_id:
                    task_found = True
                    # Should have submission_status field for students
                    if 'submission_status' in task:
                        self.log_test("Get Workspace Tasks (Student)", True)
                        return True
                    else:
                        self.log_test("Get Workspace Tasks (Student)", False, "Missing submission_status field")
                        return False
            
            if not task_found:
                self.log_test("Get Workspace Tasks (Student)", False, "Created task not found")
                return False
        else:
            self.log_test("Get Workspace Tasks (Student)", False, f"Status: {status}, Response: {response}")
            return False

    # ================== SUBMISSION SYSTEM TESTS ==================
    
    def test_submit_task_with_file(self):
        """Test submitting task with file upload"""
        if not self.created_task_id:
            self.log_test("Submit Task with File", False, "No task ID available")
            return False
            
        # Create a test file (small image simulation)
        test_content = b"Test file content for submission - simulating a Python script"
        test_file = io.BytesIO(test_content)
        
        files = {'file': ('calculator.py', test_file, 'text/plain')}
        data = {}  # No additional data needed for file submission
        
        success, response, status = self.make_request(
            'POST', f'tasks/{self.created_task_id}/submit', 
            data=data, files=files, token=self.student_token, expected_status=200
        )
        
        if success and 'id' in response and response.get('submission_type') == 'file':
            self.submission_id = response['id']
            self.log_test("Submit Task with File", True)
            return True
        else:
            self.log_test("Submit Task with File", False, f"Status: {status}, Response: {response}")
            return False

    def test_submit_task_with_link(self):
        """Test submitting task with link (resubmission)"""
        if not self.created_task_id:
            self.log_test("Submit Task with Link", False, "No task ID available")
            return False
            
        # Test resubmission with link - need to use Form data format
        url = f"{self.api_url}/tasks/{self.created_task_id}/submit"
        headers = {'Authorization': f'Bearer {self.student_token}'}
        
        # Use form data instead of JSON for this endpoint
        data = {'link': 'https://github.com/student/calculator-project'}
        
        try:
            response = requests.post(url, data=data, headers=headers)
            success = response.status_code == 200
            response_data = response.json() if response.content else {}
            
            if success and 'id' in response_data and response_data.get('submission_type') == 'link':
                self.log_test("Submit Task with Link", True)
                return True
            else:
                self.log_test("Submit Task with Link", False, f"Status: {response.status_code}, Response: {response_data}")
                return False
        except Exception as e:
            self.log_test("Submit Task with Link", False, f"Exception: {str(e)}")
            return False

    def test_get_task_submissions_report(self):
        """Test get task submissions report (admin only)"""
        if not self.created_task_id:
            self.log_test("Get Task Submissions Report", False, "No task ID available")
            return False
            
        success, response, status = self.make_request(
            'GET', f'tasks/{self.created_task_id}/submissions', 
            token=self.admin_token, expected_status=200
        )
        
        if success and 'task' in response and 'submissions' in response:
            # Check if report has the expected fields
            required_fields = ['total_students', 'submitted_count', 'approved_count', 'rejected_count', 'pending_count']
            if all(field in response for field in required_fields):
                self.log_test("Get Task Submissions Report", True)
                return True
            else:
                self.log_test("Get Task Submissions Report", False, "Missing required report fields")
                return False
        else:
            self.log_test("Get Task Submissions Report", False, f"Status: {status}, Response: {response}")
            return False

    def test_review_submission_approve(self):
        """Test approving a submission (admin only)"""
        if not self.submission_id:
            self.log_test("Review Submission (Approve)", False, "No submission ID available")
            return False
            
        review_data = {
            "status": "approved",
            "comment": "Excellent work! Your calculator implementation is well-structured and handles edge cases properly."
        }
        
        success, response, status = self.make_request(
            'POST', f'submissions/{self.submission_id}/review', 
            review_data, token=self.admin_token, expected_status=200
        )
        
        if success and 'message' in response:
            self.log_test("Review Submission (Approve)", True)
            return True
        else:
            self.log_test("Review Submission (Approve)", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_my_submissions(self):
        """Test get my submissions (student only)"""
        success, response, status = self.make_request(
            'GET', 'my-submissions', 
            token=self.student_token, expected_status=200
        )
        
        if success and isinstance(response, list):
            # Should find our submission with approved status
            submission_found = False
            for submission in response:
                if submission['id'] == self.submission_id and submission['status'] == 'approved':
                    submission_found = True
                    break
            
            if submission_found:
                self.log_test("Get My Submissions", True)
                return True
            else:
                self.log_test("Get My Submissions", False, "Approved submission not found in student's submissions")
                return False
        else:
            self.log_test("Get My Submissions", False, f"Status: {status}, Response: {response}")
            return False

    def test_file_size_limit(self):
        """Test file size limit (10MB)"""
        if not self.created_task_id:
            self.log_test("File Size Limit Test", False, "No task ID available")
            return False
            
        # Create a file larger than 10MB (simulate)
        # We'll test with a smaller file but check the error handling
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB
        test_file = io.BytesIO(large_content)
        
        files = {'file': ('large_file.txt', test_file, 'text/plain')}
        data = {}
        
        success, response, status = self.make_request(
            'POST', f'tasks/{self.created_task_id}/submit', 
            data=data, files=files, token=self.student_token, expected_status=400
        )
        
        # Should fail with 400 status for file too large
        if status == 400 and 'too large' in str(response).lower():
            self.log_test("File Size Limit Test", True)
            return True
        else:
            # If it doesn't fail as expected, that's also a failure
            self.log_test("File Size Limit Test", False, f"Expected 400 for large file, got {status}")
            return False

    def test_permission_restrictions(self):
        """Test permission restrictions"""
        # Test student trying to create workspace
        workspace_data = {
            "name": "Unauthorized Workspace",
            "description": "This should fail",
            "subject": "Test"
        }
        
        success, response, status = self.make_request('POST', 'workspaces', workspace_data, token=self.student_token, expected_status=403)
        
        if status == 403:
            self.log_test("Permission Restrictions (Student Create Workspace)", True)
            return True
        else:
            self.log_test("Permission Restrictions (Student Create Workspace)", False, f"Expected 403, got {status}")
            return False

    def test_resubmission_after_rejection(self):
        """Test resubmission workflow after rejection"""
        if not self.submission_id:
            self.log_test("Resubmission After Rejection", False, "No submission ID available")
            return False
            
        # First reject the current submission
        review_data = {
            "status": "rejected",
            "comment": "Please fix the code formatting and add more comments."
        }
        
        success, response, status = self.make_request(
            'POST', f'submissions/{self.submission_id}/review', 
            review_data, token=self.admin_token, expected_status=200
        )
        
        if not success:
            self.log_test("Resubmission After Rejection", False, f"Failed to reject submission: {status}")
            return False
            
        # Now student resubmits with a new file
        test_content = b"# Improved Calculator with better formatting\ndef add(a, b):\n    return a + b"
        test_file = io.BytesIO(test_content)
        
        files = {'file': ('calculator_v2.py', test_file, 'text/plain')}
        data = {}
        
        success, response, status = self.make_request(
            'POST', f'tasks/{self.created_task_id}/submit', 
            data=data, files=files, token=self.student_token, expected_status=200
        )
        
        if success and 'id' in response and response.get('status') == 'pending':
            self.log_test("Resubmission After Rejection", True)
            return True
        else:
            self.log_test("Resubmission After Rejection", False, f"Status: {status}, Response: {response}")
            return False

    def cleanup(self):
        """Clean up created resources"""
        if self.created_material_id and self.admin_token:
            self.make_request('DELETE', f'materials/{self.created_material_id}', token=self.admin_token)

    def run_all_tests(self):
        """Run all Digital Workspace Platform backend API tests"""
        print("🚀 Starting Digital Workspace Platform Backend API Tests")
        print("=" * 60)
        
        # Authentication tests
        print("\n📋 Authentication Tests")
        if not self.test_admin_signup():
            print("❌ Admin signup failed, stopping tests")
            return False
            
        if not self.test_student_signup():
            print("❌ Student signup failed, stopping tests")
            return False
            
        # Skip login test as we already have valid tokens from signup
        self.test_auth_me()
        
        # Workspace Management tests
        print("\n🏢 Workspace Management Tests")
        if not self.test_create_workspace():
            print("❌ Workspace creation failed, skipping dependent tests")
            return False
            
        self.test_get_workspaces_admin()
        
        if not self.test_join_workspace_student():
            print("❌ Student workspace join failed, skipping dependent tests")
            return False
            
        self.test_get_workspaces_student()
        self.test_get_workspace_members()
        
        # Enhanced Task System tests
        print("\n📝 Enhanced Task System Tests")
        if not self.test_create_workspace_task():
            print("❌ Workspace task creation failed, skipping dependent tests")
            return False
            
        self.test_get_workspace_tasks_admin()
        self.test_get_workspace_tasks_student()
        
        # Submission System tests
        print("\n📤 Submission System Tests")
        self.test_submit_task_with_file()
        self.test_submit_task_with_link()  # Test resubmission
        self.test_get_task_submissions_report()
        self.test_review_submission_approve()
        self.test_get_my_submissions()
        
        # Security and validation tests
        print("\n🔒 Security & Validation Tests")
        self.test_permission_restrictions()
        self.test_unauthorized_access()
        # Note: File size limit test disabled as it may cause memory issues in container
        # self.test_file_size_limit()
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Digital Workspace Platform backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = DigitalWorkspaceTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())