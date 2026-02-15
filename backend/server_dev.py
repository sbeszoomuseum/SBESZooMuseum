from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import qrcode
import io
import base64
import hashlib
import json
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# In-memory database for local testing (no MongoDB required)
IN_MEMORY_DB = {}

# Define Models
class OrganismBase(BaseModel):
    name: str
    scientific_name: str
    classification: dict
    morphology: str
    physiology: str
    images: List[str] = []
    description: Optional[str] = ""

class Organism(OrganismBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    qr_code_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    qr_code_image: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

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

security = HTTPBearer()

def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    expected_token = hashlib.sha256("admin:adminSBES".encode()).hexdigest()
    if credentials.credentials != expected_token:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return True

def generate_qr_code(organism_id: str) -> str:
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

# Create app and router
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Root endpoint for health checks and load balancers
@app.get("/")
async def root_health():
    return {"status": "ok", "service": "Biology Museum API (DEV)", "version": "1.0.0"}

# Routes
@api_router.get("/")
async def root():
    return {"message": "Biology Museum API (LOCAL TEST MODE - In-Memory)"}

@api_router.get("/organisms", response_model=List[Organism])
async def get_organisms():
    try:
        organisms = list(IN_MEMORY_DB.values())
        return [Organism(**org) for org in organisms]
    except Exception as e:
        logging.error(f"Error fetching organisms: {e}")
        return []

@api_router.get("/organisms/{organism_id}", response_model=Organism)
async def get_organism(organism_id: str):
    try:
        if organism_id not in IN_MEMORY_DB:
            raise HTTPException(status_code=404, detail="Organism not found")
        organism = IN_MEMORY_DB[organism_id]
        return Organism(**organism)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/organisms/qr/{qr_code_id}", response_model=Organism)
async def get_organism_by_qr(qr_code_id: str):
    try:
        for org in IN_MEMORY_DB.values():
            if org.get('qr_code_id') == qr_code_id:
                return Organism(**org)
        raise HTTPException(status_code=404, detail="Organism not found")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching organism by QR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/search")
async def search_organisms(q: str):
    try:
        q_lower = q.lower()
        results = []
        for org in IN_MEMORY_DB.values():
            if (q_lower in org.get('name', '').lower() or 
                q_lower in org.get('scientific_name', '').lower()):
                results.append(Organism(**org))
        return results
    except Exception as e:
        logging.error(f"Error searching organisms: {e}")
        return []

@api_router.post("/admin/login", response_model=AdminToken)
async def admin_login(login: AdminLogin):
    if login.username == "admin" and login.password == "adminSBES":
        token = hashlib.sha256("admin:adminSBES".encode()).hexdigest()
        return AdminToken(access_token=token)
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/admin/organisms", response_model=Organism)
async def create_organism(organism: OrganismCreate, _: bool = Depends(verify_admin_token)):
    try:
        organism_obj = Organism(**organism.dict())
        organism_obj.qr_code_image = generate_qr_code(organism_obj.id)
        
        IN_MEMORY_DB[organism_obj.id] = organism_obj.model_dump()
        return organism_obj
    except Exception as e:
        logging.error(f"Error creating organism: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating organism: {str(e)}")

@api_router.put("/admin/organisms/{organism_id}", response_model=Organism)
async def update_organism(organism_id: str, updates: OrganismUpdate, _: bool = Depends(verify_admin_token)):
    try:
        if organism_id not in IN_MEMORY_DB:
            raise HTTPException(status_code=404, detail="Organism not found")
        
        existing = IN_MEMORY_DB[organism_id]
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        existing.update(update_data)
        IN_MEMORY_DB[organism_id] = existing
        return Organism(**existing)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/organisms/{organism_id}")
async def delete_organism(organism_id: str, _: bool = Depends(verify_admin_token)):
    try:
        if organism_id not in IN_MEMORY_DB:
            raise HTTPException(status_code=404, detail="Organism not found")
        del IN_MEMORY_DB[organism_id]
        return {"message": "Organism deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

# Parse CORS origins from environment variable
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')
cors_origins = [origin.strip() for origin in cors_origins]

print(f"[INFO] LOCAL TEST MODE - In-Memory Database")
print(f"[INFO] CORS Origins configured: {cors_origins}")
print(f"[INFO] NOTE: Using in-memory database. Data will NOT persist on restart.\n")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    
    # Run server without auto-reload to avoid signal issues
    uvicorn.run(
        "server_dev:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
