from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import qrcode
import io
import base64
import hashlib
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Local JSON database fallback
LOCAL_DB_PATH = ROOT_DIR / 'organisms.json'
USE_LOCAL_DB = True

# Try to connect to MongoDB, but fall back to local JSON if it fails
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db = None
organisms_collection = None

async def init_db():
    global db, organisms_collection, USE_LOCAL_DB
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(
            mongo_url, 
            serverSelectionTimeoutMS=3000,
            tlsAllowInvalidCertificates=True,
            retryWrites=False
        )
        # Try to ping the database
        await client.admin.command('ping')
        db = client[os.environ.get('DB_NAME', 'biomuseum')]
        organisms_collection = db.organisms
        USE_LOCAL_DB = False
        print("✓ Connected to MongoDB")
    except Exception as e:
        print(f"⚠ MongoDB connection failed: {str(e)[:100]}...")
        print("✓ Using local JSON database instead")
        USE_LOCAL_DB = True

# Load local organisms database if it exists
def load_local_organisms():
    if LOCAL_DB_PATH.exists():
        with open(LOCAL_DB_PATH, 'r') as f:
            return json.load(f)
    return []

# Save organisms to local database
def save_local_organisms(organisms):
    with open(LOCAL_DB_PATH, 'w') as f:
        json.dump(organisms, f, indent=2, default=str)

# Get organisms from database (MongoDB or local)
async def get_organisms_from_db():
    if USE_LOCAL_DB:
        return load_local_organisms()
    else:
        return await organisms_collection.find().to_list(1000)

# Insert organism to database
async def insert_organism_to_db(organism_data):
    if USE_LOCAL_DB:
        organisms = load_local_organisms()
        organisms.append(organism_data)
        save_local_organisms(organisms)
    else:
        await organisms_collection.insert_one(organism_data)

# Find organism by ID
async def find_organism_by_id(organism_id):
    if USE_LOCAL_DB:
        organisms = load_local_organisms()
        for org in organisms:
            if org.get('id') == organism_id:
                return org
        return None
    else:
        return await organisms_collection.find_one({"id": organism_id})

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Define Models
class OrganismBase(BaseModel):
    name: str
    scientific_name: str
    classification: dict  # {"kingdom": "Animalia", "phylum": "Chordata", etc.}
    morphology: str
    physiology: str
    images: List[str] = []  # Base64 encoded images
    description: Optional[str] = ""

class Organism(OrganismBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    qr_code_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    qr_code_image: Optional[str] = None  # Base64 encoded QR code
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrganismCreate(OrganismBase):
    pass

class OrganismUpdate(BaseModel):
    name: Optional[str] = None
    scientific_name: Optional[str] = None
    classification: Optional[dict] = None
    morphology: Optional[str] = None
    physiology: Optional[str] = None
    images: Optional[List[str]] = None
    description: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Helper functions
def generate_qr_code(organism_id: str) -> str:
    """Generate QR code for organism and return as base64 string"""
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    qr_url = f"{frontend_url}/organism/{organism_id}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Simple token verification - in production use proper JWT"""
    expected_token = hashlib.sha256("admin:adminSBES".encode()).hexdigest()
    if credentials.credentials != expected_token:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return True

# Public routes
@api_router.get("/")
async def root():
    return {"message": "Biology Museum API"}

@api_router.get("/organisms", response_model=List[Organism])
async def get_organisms():
    try:
        organisms = await get_organisms_from_db()
        return [Organism(**organism) for organism in organisms]
    except Exception as e:
        logging.error(f"Error fetching organisms: {e}")
        return []

@api_router.get("/organisms/{organism_id}", response_model=Organism)
async def get_organism(organism_id: str):
    try:
        organism = await find_organism_by_id(organism_id)
        if not organism:
            raise HTTPException(status_code=404, detail="Organism not found")
        return Organism(**organism)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return [Organism(**organism) for organism in organisms]

@api_router.get("/organisms/{organism_id}", response_model=Organism)
async def get_organism(organism_id: str):
    organism = await db.organisms.find_one({"id": organism_id})
    if not organism:
        raise HTTPException(status_code=404, detail="Organism not found")
    return Organism(**organism)

@api_router.get("/organisms/qr/{qr_code_id}", response_model=Organism)
async def get_organism_by_qr(qr_code_id: str):
    organism = await db.organisms.find_one({"qr_code_id": qr_code_id})
    if not organism:
        raise HTTPException(status_code=404, detail="Organism not found")
    return Organism(**organism)

@api_router.get("/search")
async def search_organisms(q: str):
    """Search organisms by name or scientific name"""
    organisms = await db.organisms.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"scientific_name": {"$regex": q, "$options": "i"}}
        ]
    }).to_list(100)
    return [Organism(**organism) for organism in organisms]

# Admin routes
@api_router.post("/admin/login", response_model=AdminToken)
async def admin_login(login: AdminLogin):
    if login.username == "admin" and login.password == "adminSBES":
        token = hashlib.sha256("admin:adminSBES".encode()).hexdigest()
        return AdminToken(access_token=token)
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/admin/organisms", response_model=Organism)
async def create_organism(organism: OrganismCreate, _: bool = Depends(verify_admin_token)):
    try:
        organism_data = organism.dict()
        organism_obj = Organism(**organism_data)
        
        # Generate QR code
        organism_obj.qr_code_image = generate_qr_code(organism_obj.id)
        
        # Insert to database (MongoDB or local JSON)
        await insert_organism_to_db(organism_obj.dict(default=str))
        return organism_obj
    except Exception as e:
        logging.error(f"Error creating organism: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating organism: {str(e)}")

@api_router.put("/admin/organisms/{organism_id}", response_model=Organism)
async def update_organism(organism_id: str, updates: OrganismUpdate, _: bool = Depends(verify_admin_token)):
    existing = await db.organisms.find_one({"id": organism_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Organism not found")
    
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.organisms.update_one({"id": organism_id}, {"$set": update_data})
    
    updated_organism = await db.organisms.find_one({"id": organism_id})
    return Organism(**updated_organism)

@api_router.delete("/admin/organisms/{organism_id}")
async def delete_organism(organism_id: str, _: bool = Depends(verify_admin_token)):
    result = await db.organisms.delete_one({"id": organism_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organism not found")
    return {"message": "Organism deleted successfully"}

# Include the router in the main app
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