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
    role: str  # 'admin' or 'student'

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

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
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
        'password': hash_password(user_data.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_token(user_id, user_data.email, user_data.role)
    
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
    token = create_token(user['id'], user['email'], user['role'])
    
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