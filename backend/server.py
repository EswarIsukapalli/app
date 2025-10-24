from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import shutil
import secrets
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Create API router
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str  # 'admin', 'student', or 'department_admin'
    department: Optional[str] = None  # Department name (e.g., "Computer Science", "MCA")
    section: Optional[str] = None  # Section (A, B, C, etc.) - optional for students

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str

class UserResponse(BaseModel):
    user: User
    token: str

class Material(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: str  # 'note' or 'video'
    title: str
    filename: str
    file_path: str
    uploaded_by: str
    created_at: str

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    deadline: str
    created_by: str
    created_at: str

class TaskCreate(BaseModel):
    title: str
    description: str
    deadline: str

class TaskCompletion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    task_id: str
    student_id: str
    student_name: str
    completed_at: str

class TaskWithCompletion(Task):
    completed: bool = False
    completed_at: Optional[str] = None

class TaskCompletionStatus(BaseModel):
    task: Task
    completions: List[TaskCompletion]
    total_students: int
    completed_count: int

# New Workspace Models
class WorkspaceBase(BaseModel):
    name: str
    description: str
    subject: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class Workspace(WorkspaceBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    invite_code: str
    created_by: str
    created_at: str
    member_count: Optional[int] = 0

class WorkspaceJoin(BaseModel):
    invite_code: str

class WorkspaceMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    workspace_id: str
    student_id: str
    student_name: str
    joined_at: str

# Enhanced Task Models
class TaskCreateWorkspace(BaseModel):
    workspace_id: str
    title: str
    description: str
    deadline: str
    submission_type: str  # 'image', 'file', 'link', 'any'

class TaskWorkspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workspace_id: str
    title: str
    description: str
    deadline: str
    submission_type: str
    created_by: str
    created_at: str

class TaskWithSubmission(TaskWorkspace):
    submission_status: Optional[str] = "not_submitted"  # not_submitted, pending, approved, rejected
    submission_id: Optional[str] = None
    submitted_at: Optional[str] = None

# Submission Models
class SubmissionCreate(BaseModel):
    task_id: str
    submission_type: str  # 'file' or 'link'
    link: Optional[str] = None

class Submission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    task_id: str
    workspace_id: str
    student_id: str
    student_name: str
    submission_type: str  # 'file' or 'link'
    file_path: Optional[str] = None
    link: Optional[str] = None
    status: str  # 'pending', 'approved', 'rejected'
    submitted_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_comment: Optional[str] = None

class SubmissionReview(BaseModel):
    status: str  # 'approved' or 'rejected'
    comment: Optional[str] = None

class TaskSubmissionReport(BaseModel):
    task: TaskWorkspace
    submissions: List[Submission]
    total_students: int
    submitted_count: int
    approved_count: int
    rejected_count: int
    pending_count: int

# Department Updates Models
class DepartmentUpdateCreate(BaseModel):
    title: str
    description: str
    category: str  # 'Workshop', 'Sports', 'Club', 'Announcement', 'General'
    attachments: Optional[List[str]] = []  # URLs or file paths
    visible_to_sections: Optional[List[str]] = []  # ['A', 'B', 'C'] or empty for all
    event_date: Optional[str] = None  # ISO format date for events

class DepartmentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    category: str
    department: str
    attachments: List[str]
    visible_to_sections: List[str]
    event_date: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str
    interested_users: List[str] = []
    attending_users: List[str] = []

class DepartmentUpdateWithInterest(DepartmentUpdate):
    is_interested: bool = False
    is_attending: bool = False
    interested_count: int = 0
    attending_count: int = 0

# Leaderboard Models
class PointActivity(BaseModel):
    activity_type: str  # 'task_submission', 'event_participation', 'event_winning'
    points: int
    description: str
    timestamp: str
    related_id: Optional[str] = None  # task_id or event_id

class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    department: str
    section: Optional[str] = None
    semester: str  # e.g., "2025-1" for Jan-May 2025
    total_points: int
    tasks_completed: int
    tasks_on_time: int
    tasks_late: int
    tasks_missed: int
    events_attended: int
    task_completion_rate: float
    rank: int
    rank_change: int  # positive for up, negative for down
    last_updated: str

class LeaderboardStats(BaseModel):
    user_id: str
    user_name: str
    rank: int
    total_points: int
    tasks_completed: int
    events_attended: int
    task_completion_rate: float
    recent_activities: List[PointActivity]

# Points Configuration (hardcoded as per requirements)
POINTS_CONFIG = {
    'task_on_time': 10,
    'task_late': -5,
    'task_missed': -10,
    'event_participation': 20,
    'event_winning': 30
}

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str, department: str = None) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'department': department,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0, 'password': 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_department_admin_user(user: dict = Depends(get_current_user)):
    if user['role'] != 'department_admin':
        raise HTTPException(status_code=403, detail="Department admin access required")
    return user

async def send_email(to_email: str, subject: str, body: str):
    """Send email notification"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logging.warning(f"Email not sent to {to_email}: SMTP credentials not configured")
        return
    
    try:
        message = MIMEMultipart()
        message['From'] = SMTP_USER
        message['To'] = to_email
        message['Subject'] = subject
        message.attach(MIMEText(body, 'html'))

        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True
        )
        logging.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")

def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

# Routes
@api_router.post("/auth/signup", response_model=UserResponse)
async def signup(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_dict = {
        'id': user_id,
        'email': user_data.email,
        'name': user_data.name,
        'role': user_data.role,
        'department': user_data.department,
        'section': user_data.section,
        'password': hash_password(user_data.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_token(user_id, user_data.email, user_data.role, user_data.department)
    
    # Return user without password
    user_dict.pop('password')
    return {'user': user_dict, 'token': token}

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({'email': credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_token(user['id'], user['email'], user['role'], user.get('department'))
    
    # Return user without password
    user.pop('password')
    user.pop('_id')
    return {'user': user, 'token': token}

@api_router.get("/auth/me", response_model=User)
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/materials", response_model=Material)
async def upload_material(
    file: UploadFile = File(...),
    title: str = Form(...),
    type: str = Form(...),
    user: dict = Depends(get_admin_user)
):
    # Save file
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    filename = f"{file_id}{file_extension}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create material record
    material = {
        'id': str(uuid.uuid4()),
        'type': type,
        'title': title,
        'filename': file.filename,
        'file_path': f"/uploads/{filename}",
        'uploaded_by': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.materials.insert_one(material)
    material.pop('_id', None)
    return material

@api_router.get("/materials", response_model=List[Material])
async def get_materials(user: dict = Depends(get_current_user)):
    materials = await db.materials.find({}, {'_id': 0}).to_list(1000)
    return materials

@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str, user: dict = Depends(get_admin_user)):
    material = await db.materials.find_one({'id': material_id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Delete file
    file_path = UPLOADS_DIR / Path(material['file_path']).name
    if file_path.exists():
        file_path.unlink()
    
    await db.materials.delete_one({'id': material_id})
    return {'message': 'Material deleted successfully'}

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, user: dict = Depends(get_admin_user)):
    task = {
        'id': str(uuid.uuid4()),
        'title': task_data.title,
        'description': task_data.description,
        'deadline': task_data.deadline,
        'created_by': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.insert_one(task)
    
    # Send email notifications to all students
    students = await db.users.find({'role': 'student'}, {'_id': 0}).to_list(1000)
    for student in students:
        subject = f"New Assignment: {task_data.title}"
        body = f"""
        <html>
        <body>
            <h2>New Assignment Posted</h2>
            <p>Hello {student['name']},</p>
            <p>A new assignment has been posted:</p>
            <h3>{task_data.title}</h3>
            <p>{task_data.description}</p>
            <p><strong>Deadline:</strong> {task_data.deadline}</p>
            <p>Please complete the assignment before the deadline.</p>
        </body>
        </html>
        """
        await send_email(student['email'], subject, body)
    
    task.pop('_id', None)
    return task

@api_router.get("/tasks", response_model=List[TaskWithCompletion])
async def get_tasks(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({}, {'_id': 0}).to_list(1000)
    
    # For students, check completion status
    if user['role'] == 'student':
        for task in tasks:
            completion = await db.task_completions.find_one({
                'task_id': task['id'],
                'student_id': user['id']
            })
            task['completed'] = bool(completion)
            task['completed_at'] = completion['completed_at'] if completion else None
    
    return tasks

@api_router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, user: dict = Depends(get_current_user)):
    if user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can complete tasks")
    
    # Check if task exists
    task = await db.tasks.find_one({'id': task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if already completed
    existing = await db.task_completions.find_one({
        'task_id': task_id,
        'student_id': user['id']
    })
    if existing:
        raise HTTPException(status_code=400, detail="Task already completed")
    
    # Create completion record
    completion = {
        'id': str(uuid.uuid4()),
        'task_id': task_id,
        'student_id': user['id'],
        'student_name': user['name'],
        'completed_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.task_completions.insert_one(completion)
    return {'message': 'Task marked as completed'}

@api_router.delete("/tasks/{task_id}/complete")
async def uncomplete_task(task_id: str, user: dict = Depends(get_current_user)):
    if user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can uncomplete tasks")
    
    result = await db.task_completions.delete_one({
        'task_id': task_id,
        'student_id': user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Completion not found")
    
    return {'message': 'Task marked as incomplete'}

@api_router.get("/tasks/{task_id}/completions", response_model=TaskCompletionStatus)
async def get_task_completions(task_id: str, user: dict = Depends(get_admin_user)):
    task = await db.tasks.find_one({'id': task_id}, {'_id': 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    completions = await db.task_completions.find({'task_id': task_id}, {'_id': 0}).to_list(1000)
    total_students = await db.users.count_documents({'role': 'student'})
    
    return {
        'task': task,
        'completions': completions,
        'total_students': total_students,
        'completed_count': len(completions)
    }

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_students = await db.users.count_documents({'role': 'student'})
    total_materials = await db.materials.count_documents({})
    total_tasks = await db.tasks.count_documents({})
    
    return {
        'total_students': total_students,
        'total_materials': total_materials,
        'total_tasks': total_tasks
    }

# ================== NEW WORKSPACE ENDPOINTS ==================

@api_router.post("/workspaces", response_model=Workspace)
async def create_workspace(workspace_data: WorkspaceCreate, user: dict = Depends(get_admin_user)):
    """Create a new workspace (admin only)"""
    workspace = {
        'id': str(uuid.uuid4()),
        'name': workspace_data.name,
        'description': workspace_data.description,
        'subject': workspace_data.subject,
        'invite_code': generate_invite_code(),
        'created_by': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.workspaces.insert_one(workspace)
    workspace.pop('_id', None)
    workspace['member_count'] = 0
    return workspace

@api_router.get("/workspaces", response_model=List[Workspace])
async def get_workspaces(user: dict = Depends(get_current_user)):
    """Get workspaces - admin sees all they created, students see joined ones"""
    if user['role'] == 'admin':
        workspaces = await db.workspaces.find({'created_by': user['id']}, {'_id': 0}).to_list(1000)
        # Add member count
        for workspace in workspaces:
            member_count = await db.workspace_members.count_documents({'workspace_id': workspace['id']})
            workspace['member_count'] = member_count
    else:
        # Get workspaces student has joined
        memberships = await db.workspace_members.find({'student_id': user['id']}, {'_id': 0}).to_list(1000)
        workspace_ids = [m['workspace_id'] for m in memberships]
        workspaces = await db.workspaces.find({'id': {'$in': workspace_ids}}, {'_id': 0}).to_list(1000)
        for workspace in workspaces:
            member_count = await db.workspace_members.count_documents({'workspace_id': workspace['id']})
            workspace['member_count'] = member_count
    
    return workspaces

@api_router.get("/workspaces/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    """Get a specific workspace"""
    workspace = await db.workspaces.find_one({'id': workspace_id}, {'_id': 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Check access
    if user['role'] == 'student':
        member = await db.workspace_members.find_one({'workspace_id': workspace_id, 'student_id': user['id']})
        if not member:
            raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    member_count = await db.workspace_members.count_documents({'workspace_id': workspace_id})
    workspace['member_count'] = member_count
    return workspace

@api_router.post("/workspaces/join")
async def join_workspace(join_data: WorkspaceJoin, user: dict = Depends(get_current_user)):
    """Join a workspace using invite code (students only)"""
    if user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can join workspaces")
    
    workspace = await db.workspaces.find_one({'invite_code': join_data.invite_code})
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Check if already a member
    existing = await db.workspace_members.find_one({
        'workspace_id': workspace['id'],
        'student_id': user['id']
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this workspace")
    
    # Add member
    member = {
        'workspace_id': workspace['id'],
        'student_id': user['id'],
        'student_name': user['name'],
        'joined_at': datetime.now(timezone.utc).isoformat()
    }
    await db.workspace_members.insert_one(member)
    
    return {'message': 'Successfully joined workspace', 'workspace_name': workspace['name']}

@api_router.get("/workspaces/{workspace_id}/members", response_model=List[WorkspaceMember])
async def get_workspace_members(workspace_id: str, user: dict = Depends(get_admin_user)):
    """Get all members of a workspace (admin only)"""
    workspace = await db.workspaces.find_one({'id': workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if workspace['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to view members")
    
    members = await db.workspace_members.find({'workspace_id': workspace_id}, {'_id': 0}).to_list(1000)
    return members

# ================== ENHANCED TASK ENDPOINTS ==================

@api_router.post("/workspaces/{workspace_id}/tasks", response_model=TaskWorkspace)
async def create_workspace_task(
    workspace_id: str, 
    task_data: TaskCreateWorkspace, 
    user: dict = Depends(get_admin_user)
):
    """Create a task in a workspace"""
    workspace = await db.workspaces.find_one({'id': workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if workspace['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to create tasks in this workspace")
    
    task = {
        'id': str(uuid.uuid4()),
        'workspace_id': workspace_id,
        'title': task_data.title,
        'description': task_data.description,
        'deadline': task_data.deadline,
        'submission_type': task_data.submission_type,
        'created_by': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.workspace_tasks.insert_one(task)
    task.pop('_id', None)
    return task

@api_router.get("/workspaces/{workspace_id}/tasks", response_model=List[TaskWithSubmission])
async def get_workspace_tasks(workspace_id: str, user: dict = Depends(get_current_user)):
    """Get all tasks in a workspace"""
    # Check workspace access
    if user['role'] == 'student':
        member = await db.workspace_members.find_one({'workspace_id': workspace_id, 'student_id': user['id']})
        if not member:
            raise HTTPException(status_code=403, detail="Not a member of this workspace")
    else:
        workspace = await db.workspaces.find_one({'id': workspace_id, 'created_by': user['id']})
        if not workspace:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    tasks = await db.workspace_tasks.find({'workspace_id': workspace_id}, {'_id': 0}).to_list(1000)
    
    # For students, add submission status
    if user['role'] == 'student':
        for task in tasks:
            submission = await db.submissions.find_one({
                'task_id': task['id'],
                'student_id': user['id']
            })
            if submission:
                task['submission_status'] = submission['status']
                task['submission_id'] = submission['id']
                task['submitted_at'] = submission['submitted_at']
            else:
                task['submission_status'] = 'not_submitted'
    
    return tasks

# ================== SUBMISSION ENDPOINTS ==================

@api_router.post("/tasks/{task_id}/submit", response_model=Submission)
async def submit_task(
    task_id: str,
    file: Optional[UploadFile] = File(None),
    link: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """Submit proof for a task"""
    if user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can submit tasks")
    
    task = await db.workspace_tasks.find_one({'id': task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check workspace membership
    member = await db.workspace_members.find_one({
        'workspace_id': task['workspace_id'],
        'student_id': user['id']
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Check if already submitted
    existing = await db.submissions.find_one({
        'task_id': task_id,
        'student_id': user['id']
    })
    
    file_path = None
    submission_type = None
    
    # Handle file upload
    if file:
        # Validate file size (10MB limit)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
        
        # Save file
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        filename = f"{file_id}{file_extension}"
        file_path_obj = UPLOADS_DIR / filename
        
        with open(file_path_obj, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_path = f"/uploads/{filename}"
        submission_type = 'file'
    elif link:
        submission_type = 'link'
    else:
        raise HTTPException(status_code=400, detail="Either file or link must be provided")
    
    if existing:
        # Update existing submission
        update_data = {
            'submission_type': submission_type,
            'file_path': file_path,
            'link': link,
            'status': 'pending',
            'submitted_at': datetime.now(timezone.utc).isoformat(),
            'reviewed_at': None,
            'reviewed_by': None,
            'review_comment': None
        }
        await db.submissions.update_one({'id': existing['id']}, {'$set': update_data})
        existing.update(update_data)
        return existing
    else:
        # Create new submission
        submission = {
            'id': str(uuid.uuid4()),
            'task_id': task_id,
            'workspace_id': task['workspace_id'],
            'student_id': user['id'],
            'student_name': user['name'],
            'submission_type': submission_type,
            'file_path': file_path,
            'link': link,
            'status': 'pending',
            'submitted_at': datetime.now(timezone.utc).isoformat(),
            'reviewed_at': None,
            'reviewed_by': None,
            'review_comment': None
        }
        await db.submissions.insert_one(submission)
        submission.pop('_id', None)
        return submission

@api_router.get("/tasks/{task_id}/submissions", response_model=TaskSubmissionReport)
async def get_task_submissions(task_id: str, user: dict = Depends(get_admin_user)):
    """Get all submissions for a task (admin only)"""
    task = await db.workspace_tasks.find_one({'id': task_id}, {'_id': 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check authorization
    workspace = await db.workspaces.find_one({'id': task['workspace_id']})
    if workspace['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await db.submissions.find({'task_id': task_id}, {'_id': 0}).to_list(1000)
    total_students = await db.workspace_members.count_documents({'workspace_id': task['workspace_id']})
    
    approved_count = sum(1 for s in submissions if s['status'] == 'approved')
    rejected_count = sum(1 for s in submissions if s['status'] == 'rejected')
    pending_count = sum(1 for s in submissions if s['status'] == 'pending')
    
    return {
        'task': task,
        'submissions': submissions,
        'total_students': total_students,
        'submitted_count': len(submissions),
        'approved_count': approved_count,
        'rejected_count': rejected_count,
        'pending_count': pending_count
    }

@api_router.post("/submissions/{submission_id}/review")
async def review_submission(
    submission_id: str,
    review_data: SubmissionReview,
    user: dict = Depends(get_admin_user)
):
    """Approve or reject a submission (admin only)"""
    submission = await db.submissions.find_one({'id': submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check authorization
    task = await db.workspace_tasks.find_one({'id': submission['task_id']})
    workspace = await db.workspaces.find_one({'id': task['workspace_id']})
    if workspace['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if review_data.status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    update_data = {
        'status': review_data.status,
        'reviewed_at': datetime.now(timezone.utc).isoformat(),
        'reviewed_by': user['id'],
        'review_comment': review_data.comment
    }
    
    await db.submissions.update_one({'id': submission_id}, {'$set': update_data})
    
    return {'message': f'Submission {review_data.status}', 'submission_id': submission_id}

@api_router.get("/my-submissions", response_model=List[Submission])
async def get_my_submissions(user: dict = Depends(get_current_user)):
    """Get all submissions by the current student"""
    if user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can view their submissions")
    
    submissions = await db.submissions.find({'student_id': user['id']}, {'_id': 0}).to_list(1000)
    return submissions

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()