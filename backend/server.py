from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import pytz
import qrcode
import io
import base64
import hashlib
import json
import requests
import ssl
import asyncio
import socket
import dns.resolver
import jwt

# IST Timezone Configuration
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    """Get current time in IST (Indian Standard Time) UTC+5:30"""
    return datetime.now(IST).isoformat()

# Google Generative AI - with graceful fallback
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    genai = None

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB setup - REQUIRED, no fallback
MONGO_URL = os.environ.get('MONGO_URL')
if not MONGO_URL:
    raise ValueError("ERROR: MONGO_URL environment variable is not set. MongoDB is required.")

# Google Gemini API Setup
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY and HAS_GENAI:
    genai.configure(api_key=GEMINI_API_KEY)
    print("[OK] Google Gemini API configured successfully")
else:
    print("[WARN] GEMINI_API_KEY not set - AI organism feature will not work")

db = None
organisms_collection = None
suggestions_collection = None
biotube_videos_collection = None
video_suggestions_collection = None
video_comments_collection = None
blogs_collection = None
blog_suggestions_collection = None
gmail_users_collection = None
mongodb_connected = False

async def init_mongodb():
    global db, organisms_collection, suggestions_collection, biotube_videos_collection, video_suggestions_collection, video_comments_collection, blogs_collection, blog_suggestions_collection, gmail_users_collection, mongodb_connected
    max_retries = 15  # Increased from 10 to 15
    retry_count = 0
    
    # Test DNS resolution first
    try:
        print("[INFO] Testing DNS resolution for MongoDB...")
        dns_records = await asyncio.get_event_loop().getaddrinfo(
            'ac-ojscwyo-shard-00-00.m30zoo4.mongodb.net', 27017
        )
        print(f"[OK] DNS resolved successfully: {len(dns_records)} records found")
    except Exception as e:
        print(f"[WARN] DNS resolution failed: {str(e)[:100]}")
    
    while retry_count < max_retries:
        try:
            print(f"[INFO] Attempting MongoDB connection (attempt {retry_count + 1}/{max_retries})...")
            
            # Build connection options with extended timeouts for Render
            client_kwargs = {
                'serverSelectionTimeoutMS': 120000,     # 120 seconds
                'connectTimeoutMS': 120000,              # 120 seconds
                'socketTimeoutMS': 120000,               # 120 seconds
                'maxPoolSize': 3,
                'minPoolSize': 0,
                'retryWrites': True,
                'retryReads': True,
                'ssl': True,
                'tlsAllowInvalidCertificates': False,
                'tlsAllowInvalidHostnames': False,
                'appName': 'biomuseum',
            }
            
            print(f"[INFO] MongoDB URL: {MONGO_URL[:50]}...")
            client = AsyncIOMotorClient(MONGO_URL, **client_kwargs)
            
            # Verify connection with extended timeout
            print("[INFO] Verifying MongoDB connection with ping command...")
            await asyncio.wait_for(client.admin.command('ping'), timeout=120)
            
            db = client[os.environ.get('DB_NAME', 'biomuseum')]
            organisms_collection = db.organisms
            suggestions_collection = db.suggestions
            biotube_videos_collection = db.biotube_videos
            video_suggestions_collection = db.video_suggestions
            video_comments_collection = db.video_comments
            blogs_collection = db.blogs
            blog_suggestions_collection = db.blog_suggestions
            gmail_users_collection = db.gmail_users
            
            # Test that we can actually query
            test_count = await organisms_collection.count_documents({})
            test_suggestions = await suggestions_collection.count_documents({})
            test_videos = await biotube_videos_collection.count_documents({})
            test_video_suggestions = await video_suggestions_collection.count_documents({})
            test_comments = await video_comments_collection.count_documents({})
            
            mongodb_connected = True
            print(f"[OK] ✓ Successfully connected to MongoDB! Found {test_count} organisms, {test_videos} videos in database")
            return
            
        except asyncio.TimeoutError:
            retry_count += 1
            print(f"[WARN] MongoDB connection timeout (attempt {retry_count}/{max_retries})")
            if retry_count < max_retries:
                wait_time = min(20, 5 ** (retry_count - 1) // 50)  # Increased wait time
                print(f"[INFO] Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
        except Exception as e:
            retry_count += 1
            error_msg = str(e)[:200]
            print(f"[WARN] MongoDB connection error (attempt {retry_count}/{max_retries}): {error_msg}")
            if retry_count < max_retries:
                wait_time = min(20, 5 ** (retry_count - 1) // 50)  # Increased wait time
                print(f"[INFO] Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
    
    # FAIL HARD - No fallback to unreliable local storage
    error_msg = (
        "\n" + "="*80 + "\n"
        "[CRITICAL] ✗ MONGODB CONNECTION FAILED - APPLICATION WILL NOT START\n"
        "\n"
        "REQUIRED ACTIONS:\n"
        "1. Configure MongoDB Atlas IP Whitelist IMMEDIATELY:\n"
        "   - Go to: https://cloud.mongodb.com\n"
        "   - Log in with your account\n"
        "   - Select 'biomuseum' cluster\n"
        "   - Go to 'Network Access' in the left sidebar\n"
        "   - Click 'ADD IP ADDRESS'\n"
        "   - Click 'ALLOW ACCESS FROM ANYWHERE'\n"
        "   - Enter 0.0.0.0/0 (allows all IPs)\n"
        "   - Click 'Confirm'\n"
        "   - WAIT 5-10 MINUTES for the rule to apply\n"
        "\n"
        "2. Verify your MongoDB cluster is running:\n"
        "   - Go to MongoDB Atlas Dashboard\n"
        "   - Check cluster status is 'Running'\n"
        "   - No alerts or warnings\n"
        "\n"
        "3. After whitelist is configured, REDEPLOY on Render:\n"
        "   - Go to your Render dashboard\n"
        "   - Click 'Manual Deploy' or push new commit to GitHub\n"
        "\n"
        "Current credentials:\n"
        f"   - URL: {MONGO_URL[:60]}...\n"
        f"   - Database: {os.environ.get('DB_NAME', 'biomuseum')}\n"
        "\n"
        "NOTE: This application requires MongoDB. There is NO fallback\n"
        "to local storage. All data MUST persist in MongoDB.\n"
        "="*80
    )
    print(error_msg)
    raise RuntimeError("MongoDB connection failed after 15 retry attempts. See error message above.")

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
    created_at: str = Field(default_factory=get_ist_now)
    updated_at: str = Field(default_factory=get_ist_now)

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

# Gmail User Models
class GmailUserCreate(BaseModel):
    email: str
    name: str
    profile_picture: Optional[str] = None
    google_id: str

class GmailUser(GmailUserCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    login_timestamp: str = Field(default_factory=get_ist_now)
    last_active: str = Field(default_factory=get_ist_now)
    is_active: bool = True
    jwt_token: Optional[str] = None

class GmailUserResponse(BaseModel):
    id: str
    email: str
    name: str
    profile_picture: Optional[str] = None
    login_timestamp: str
    last_active: str
    is_active: bool

class GoogleLoginRequest(BaseModel):
    token: str  # Google ID token from frontend

class GoogleLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: GmailUserResponse

class Suggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    organism_name: str
    description: Optional[str] = ""
    educational_level: str  # 11th, 12th, B.Sc 1st, B.Sc 2nd, B.Sc 3rd, B.Sc 4th, BCS, BCA, B.Voc, Teacher, etc.
    status: str = "pending"  # pending, approved, rejected
    ai_verification: Optional[dict] = None
    created_at: str = Field(default_factory=get_ist_now)
    updated_at: str = Field(default_factory=get_ist_now)

class SuggestionCreate(BaseModel):
    user_name: str
    organism_name: str
    description: Optional[str] = ""
    educational_level: str  # Required field

class VerifyOrganismRequest(BaseModel):
    organism_name: str
    scientific_name: Optional[str] = None

class BiotubVideo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    youtube_url: str
    embed_code: str
    kingdom: str
    phylum: str
    class_name: str
    species: str
    description: str = ""
    thumbnail_url: str = ""
    qr_code: str = ""
    visibility: str = "public"  # public, private, draft
    created_at: str = Field(default_factory=get_ist_now)
    updated_at: str = Field(default_factory=get_ist_now)

class BiotubVideoCreate(BaseModel):
    title: str
    youtube_url: str
    kingdom: str
    phylum: str
    class_name: str
    species: str
    description: Optional[str] = ""
    thumbnail_url: Optional[str] = ""

class BiotubVideoUpdate(BaseModel):
    title: Optional[str] = None
    youtube_url: Optional[str] = None
    kingdom: Optional[str] = None
    phylum: Optional[str] = None
    class_name: Optional[str] = None
    species: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    visibility: Optional[str] = None

class VideoSuggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    user_class: str
    video_title: str
    video_description: Optional[str] = ""
    status: str = "pending"  # pending, reviewed, added, dismissed
    created_at: str = Field(default_factory=get_ist_now)
    updated_at: str = Field(default_factory=get_ist_now)

class VideoSuggestionCreate(BaseModel):
    user_name: str
    user_class: str
    video_title: str
    video_description: Optional[str] = ""

class VideoComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    video_id: str
    user_name: str
    user_class: str
    text: str
    likes: int = 0
    created_at: str = Field(default_factory=get_ist_now)

class VideoCommentCreate(BaseModel):
    user_name: str
    user_class: str
    text: str

class Blog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    content: str
    image_url: str = ""
    author: str = "BioMuseum AI"
    qr_code: str = ""
    visibility: str = "public"  # public, private, draft
    views: int = 0
    likes: int = 0
    created_at: str = Field(default_factory=get_ist_now)
    updated_at: str = Field(default_factory=get_ist_now)
    is_ai_generated: bool = True

class BlogCreate(BaseModel):
    title: str
    subject: str
    content: str
    image_url: Optional[str] = ""
    author: Optional[str] = "BioMuseum"
    is_ai_generated: Optional[bool] = True

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    author: Optional[str] = None
    visibility: Optional[str] = None

class BlogSuggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    user_email: str
    blog_subject: str
    blog_description: Optional[str] = ""
    status: str = "pending"  # pending, reviewed, added, dismissed
    created_at: str = Field(default_factory=get_ist_now)
    updated_at: str = Field(default_factory=get_ist_now)

class BlogSuggestionCreate(BaseModel):
    user_name: str
    user_email: str
    blog_subject: str

class BiologyQuestion(BaseModel):
    question: str = Field(..., description="User's biology question")
    context: Optional[str] = None  # Optional: what organism they're asking about

class BiologyAnswer(BaseModel):
    answer: str
    related_organisms: List[str] = []
    confidence: str  # "high", "medium", "low"
    suggestions: List[str] = []  # Follow-up questions
    blog_description: Optional[str] = ""

class BlogGenerateRequest(BaseModel):
    subject: str
    tone: Optional[str] = "educational"  # educational, casual, formal

# Database functions - MongoDB only (no JSON fallback)
async def get_organisms_list():
    return await organisms_collection.find().to_list(1000)

async def insert_organism(organism_data):
    await organisms_collection.insert_one(organism_data)

async def find_organism(organism_id):
    return await organisms_collection.find_one({"id": organism_id})

async def find_organism_by_qr(qr_code_id):
    return await organisms_collection.find_one({"qr_code_id": qr_code_id})

async def update_organism_db(organism_id, update_data):
    await organisms_collection.update_one({"id": organism_id}, {"$set": update_data})
    return await organisms_collection.find_one({"id": organism_id})

async def delete_organism_db(organism_id):
    result = await organisms_collection.delete_one({"id": organism_id})
    return result.deleted_count > 0

# Helper functions
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

security = HTTPBearer()

def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify admin token from either username/password or Google OAuth login.
    Accepts tokens from:
    1. Username/password: admin:adminSBES
    2. Google OAuth: admin:{authorized_email}
    """
    received_token = credentials.credentials
    
    # Check for username/password token
    expected_token_admin = hashlib.sha256("admin:adminSBES".encode()).hexdigest()
    if received_token == expected_token_admin:
        return True
    
    # Check for Google OAuth tokens from authorized emails
    authorized_emails_str = os.environ.get('AUTHORIZED_ADMIN_EMAILS', '')
    if authorized_emails_str:
        authorized_emails = [e.strip().lower() for e in authorized_emails_str.split(',')]
        for email in authorized_emails:
            expected_token_email = hashlib.sha256(f"admin:{email}".encode()).hexdigest()
            if received_token == expected_token_email:
                return True
    
    # If no token matches, raise error
    raise HTTPException(status_code=401, detail="Invalid admin token")

def verify_gmail_token(authorization: str = Header(None)):
    """
    Verify Gmail JWT token and return user info.
    Used for protecting authenticated endpoints.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = parts[1]
        
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET_KEY", "biomuseum-secret"), algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authorization")

# Create app and router
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Async function to fetch images from web
async def get_images_from_unsplash(query: str, max_images: int = 5) -> List[str]:
    """
    Fetch images from Unsplash API
    Returns list of image URLs directly (not base64)
    """
    try:
        # Use Unsplash API with access key
        unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
        
        if not unsplash_access_key:
            logging.warning("UNSPLASH_ACCESS_KEY not configured, returning empty list")
            return []
        
        # Unsplash API endpoint
        unsplash_url = "https://api.unsplash.com/search/photos"
        
        headers = {
            'Authorization': f'Client-ID {unsplash_access_key}',
            'Accept-Version': 'v1'
        }
        
        params = {
            'query': query,
            'per_page': max_images,
            'order_by': 'relevant'
        }
        
        response = requests.get(unsplash_url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            images = []
            
            if 'results' in data:
                for photo in data['results']:
                    # Get the regular size URL (good balance between quality and size)
                    if 'urls' in photo and 'regular' in photo['urls']:
                        img_url = photo['urls']['regular']
                        images.append(img_url)
                        logging.info(f"Found image from Unsplash: {img_url[:50]}...")
            
            return images[:max_images]
        else:
            logging.warning(f"Unsplash API error: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        logging.warning(f"Error fetching images from Unsplash for '{query}': {e}")
        return []

async def get_images_from_web_async(organism_name: str, max_images: int = 5) -> List[str]:
    """
    Fetch images of an organism - try Unsplash first, then fallback to Wikimedia
    Returns list of URLs or base64 encoded images
    """
    try:
        # Try Unsplash first
        images = await get_images_from_unsplash(organism_name, max_images)
        
        if images and len(images) > 0:
            logging.info(f"Got {len(images)} images from Unsplash for '{organism_name}'")
            return images
        
        # Fallback to Wikimedia Commons
        logging.info(f"Unsplash returned no results, trying Wikimedia Commons for '{organism_name}'")
        images = []
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        try:
            wiki_url = f"https://commons.wikimedia.org/w/api.php?action=query&list=allimages&aisort=timestamp&aidir=descending&aifrom={organism_name}&ailimit=10&format=json"
            response = requests.get(wiki_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'query' in data and 'allimages' in data['query']:
                    for img in data['query']['allimages'][:max_images]:
                        if 'url' in img:
                            img_url = img['url']
                            images.append(img_url)
                            logging.info(f"Found image from Wikimedia: {img_url[:50]}...")
        except Exception as e:
            logging.warning(f"Wikimedia API error: {e}")
        
        if images:
            logging.info(f"Got {len(images)} images from Wikimedia for '{organism_name}'")
            return images
        
        # If still no images, return empty list (no placeholders)
        logging.warning(f"No images found for '{organism_name}' from any source")
        return []
        
    except Exception as e:
        logging.warning(f"Error fetching images for {organism_name}: {e}")
        return []

# Root endpoint for health checks and load balancers
@app.get("/")
async def root_health():
    return {"status": "ok", "service": "Biology Museum API", "version": "1.0.0"}

# Routes
@api_router.get("/")
async def root():
    return {"message": "Biology Museum API"}

@api_router.get("/organisms", response_model=List[Organism])
async def get_organisms():
    try:
        organisms = await get_organisms_list()
        return [Organism(**org) for org in organisms]
    except Exception as e:
        logging.error(f"Error fetching organisms: {e}")
        return []

@api_router.get("/organisms/{organism_id}", response_model=Organism)
async def get_organism(organism_id: str):
    try:
        organism = await find_organism(organism_id)
        if not organism:
            raise HTTPException(status_code=404, detail="Organism not found")
        return Organism(**organism)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/organisms/qr/{qr_code_id}", response_model=Organism)
async def get_organism_by_qr(qr_code_id: str):
    try:
        organism = await find_organism_by_qr(qr_code_id)
        if not organism:
            raise HTTPException(status_code=404, detail="Organism not found")
        return Organism(**organism)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching organism by QR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/search")
async def search_organisms(q: str):
    try:
        organisms = await get_organisms_list()
        q_lower = q.lower()
        results = []
        for org in organisms:
            if (q_lower in org.get('name', '').lower() or 
                q_lower in org.get('scientific_name', '').lower()):
                results.append(Organism(**org))
        return results
    except Exception as e:
        logging.error(f"Error searching organisms: {e}")
        return []

# Pydantic model for AI organism generation request
class OrganismNameRequest(BaseModel):
    organism_name: str = Field(..., description="Common name of the organism")

# AI Image Generation Endpoint - Generate images for an organism
@api_router.post("/admin/organisms/ai-generate-images")
async def generate_organism_images(request: OrganismNameRequest, _: bool = Depends(verify_admin_token)):
    """
    Generate images for an organism using Unsplash API
    """
    try:
        organism_name = request.organism_name.strip()
        
        if not organism_name:
            raise HTTPException(status_code=400, detail="Organism name is required")
        
        # Try to fetch images from Unsplash
        images = await get_images_from_unsplash(organism_name, max_images=5)
        
        if images:
            logging.info(f"Generated {len(images)} images for organism '{organism_name}'")
            return {
                "success": True,
                "image_urls": images,
                "message": f"Successfully generated {len(images)} images for '{organism_name}'"
            }
        else:
            logging.warning(f"No images found on Unsplash for organism '{organism_name}'")
            return {
                "success": False,
                "image_urls": [],
                "message": f"Could not find images for '{organism_name}' on Unsplash. Please try another organism name."
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating images for organism: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate images: {str(e)}")

# AI Endpoint - Generate organism data using Gemini
@api_router.post("/admin/organisms/ai-complete")
async def generate_organism_data_ai(request: OrganismNameRequest):
    """
    Generate organism data using Google Gemini AI.
    Admin only needs to provide the organism name.
    Includes image generation from Unsplash.
    """
    if not GEMINI_API_KEY:
        error_msg = "AI feature is not configured. GEMINI_API_KEY is missing. Please set the GEMINI_API_KEY environment variable in your .env file or on Render dashboard."
        logging.error(error_msg)
        raise HTTPException(status_code=503, detail=error_msg)
    
    try:
        organism_name = request.organism_name.strip()
        if not organism_name:
            raise HTTPException(status_code=400, detail="Organism name cannot be empty")
        
        # Create prompt for Gemini
        prompt = f"""You are an expert biologist and zoologist. I need you to provide detailed biological information about "{organism_name}".

Please provide the information in JSON format ONLY (no markdown, no explanations). Return ONLY valid JSON:

{{
    "name": "Common name of the organism",
    "scientific_name": "Scientific name (binomial nomenclature)",
    "classification": {{
        "kingdom": "Kingdom",
        "phylum": "Phylum",
        "class": "Class",
        "order": "Order",
        "family": "Family",
        "genus": "Genus",
        "species": "Species"
    }},
    "morphology": "Physical description including size, color, distinctive features (2-3 sentences)",
    "physiology": "How the organism functions, internal systems, key biological processes (2-3 sentences)",
    "general_description": "General overview of the organism, its habitat, and interesting facts (2-3 sentences)",
    "habitat": "Where it lives and environmental preferences",
    "behavior": "Behavioral characteristics if applicable",
    "diet": "What it eats (if applicable)",
    "conservation_status": "Conservation status (e.g., Least Concern, Endangered, etc.)"
}}

Be accurate and scientific. If you cannot find specific information, make reasonable educated guesses based on the organism's taxonomy.
Make sure the JSON is valid and properly formatted."""

        # Call Gemini API
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # Parse the response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Parse JSON
        organism_data = json.loads(response_text)
        
        # Validate required fields
        required_fields = ['name', 'scientific_name', 'classification', 'morphology', 'physiology', 'general_description']
        for field in required_fields:
            if field not in organism_data:
                organism_data[field] = ""
        
        # Generate images using Unsplash
        images = []
        try:
            search_term = organism_data.get('name', organism_name) or organism_name
            images = search_unsplash_images(search_term, count=5)
            logging.info(f"Generated {len(images)} images for {search_term}")
        except Exception as e:
            logging.warning(f"Error generating images: {e}")
            images = []
        
        # Return the generated data with images
        return {
            "success": True,
            "data": {
                **organism_data,
                "images": images
            },
            "source": "ai_generated"
        }

        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logging.error(f"Error generating organism data with AI: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating organism data: {str(e)}")


def search_unsplash_images(organism_name: str, count: int = 6):
    """Search Unsplash API for organism images with fallback options."""
    UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
    UNSPLASH_API_URL = "https://api.unsplash.com"
    images = []
    
    # Define search terms with fallbacks
    search_terms = [
        organism_name,  # Primary: organism name
        organism_name.lower(),  # Lowercase version
    ]
    
    # Add first word if multi-word organism name
    if ' ' in organism_name:
        search_terms.append(organism_name.split()[0])
    
    # Add generic fallbacks
    search_terms.extend(["animal", "nature", "wildlife"])
    
    # Try each search term
    for query in search_terms:
        if len(images) >= count:
            break
        
        try:
            logging.info(f"Searching Unsplash for: {query}")
            response = requests.get(
                f"{UNSPLASH_API_URL}/search/photos",
                params={
                    'query': query,
                    'client_id': UNSPLASH_ACCESS_KEY,
                    'per_page': 10,
                    'orientation': 'landscape'
                },
                timeout=10,
                headers={'User-Agent': 'BioMuseum/1.0'}
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                logging.info(f"Found {len(results)} results for '{query}'")
                
                for result in results:
                    if len(images) >= count:
                        break
                    
                    img_url = result.get('urls', {}).get('regular', '')
                    if img_url and img_url not in images:
                        # Add quality parameters
                        if '?' in img_url:
                            img_url += '&w=800&q=90'
                        else:
                            img_url += '?w=800&q=90'
                        images.append(img_url)
                        logging.info(f"Added image: {img_url[:50]}...")
            else:
                logging.warning(f"Unsplash returned status {response.status_code} for '{query}'")
                
        except Exception as e:
            logging.warning(f"Error searching Unsplash for '{query}': {e}")
            continue
    
    logging.info(f"Retrieved {len(images)} total images for '{organism_name}'")
    return images[:count]

def get_search_terms_from_gemini(organism_name: str):
    """Use Gemini to generate better search terms for organism images."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f'Given the organism name "{organism_name}", generate 3-5 search keywords that would find relevant images on Unsplash. Each keyword should be a single word or short phrase. Return ONLY the keywords as comma-separated list. Example: "cobra, snake, reptile"'
        response = model.generate_content(prompt)
        search_terms = [term.strip() for term in response.text.split(',')]
        return search_terms
    except Exception as e:
        logging.warning(f"Could not get search terms from Gemini: {e}")
        return [organism_name.lower()]

# Root endpoint for health checks and load balancers
@app.get("/")
async def root_health():
    return {"status": "ok", "service": "Biology Museum API", "version": "1.0.0"}

@api_router.post("/admin/identify-organism")
async def identify_organism_from_camera(request: dict):
    """
    Identify organism from camera image using Gemini Vision AI.
    
    Request:
    {
        "image_data": "base64_encoded_image_with_data_uri"
    }
    
    Response:
    {
        "success": true,
        "organism_name": "Bengal Tiger",
        "scientific_name": "Panthera tigris",
        "confidence": 94,
        "description": "Large carnivorous cat...",
        "classification": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Mammalia",
            "order": "Carnivora",
            "family": "Felidae",
            "genus": "Panthera",
            "species": "tigris"
        },
        "characteristics": ["Orange coat", "Black stripes", ...]
    }
    """
    try:
        if not HAS_GENAI or not GEMINI_API_KEY:
            raise ValueError("Gemini API not configured")
        
        image_data = request.get("image_data", "")
        
        if not image_data:
            raise ValueError("image_data is required")
        
        print(f"[INFO] Identifying organism from camera image...")
        
        # Create identification prompt
        prompt = """Analyze this photograph and identify the organism shown. Be precise and scientific.

IMPORTANT: Respond ONLY in valid JSON format with no other text.

{
    "is_organism": boolean (true if a living organism is clearly visible),
    "organism_name": "Common name if identifiable, or null if cannot identify",
    "scientific_name": "Scientific name if known, or null",
    "confidence": number (0-100, your confidence level),
    "description": "Brief 2-3 sentence description of the organism visible in photo",
    "characteristics": ["list", "of", "visible", "characteristics", "like", "color", "size", "markings"],
    "classification": {
        "kingdom": "e.g., Animalia (required if organism identified)",
        "phylum": "e.g., Chordata",
        "class": "e.g., Mammalia",
        "order": "e.g., Carnivora",
        "family": "e.g., Felidae",
        "genus": "e.g., Panthera",
        "species": "e.g., tigris"
    }
}

Guidelines:
- Only identify if you are reasonably confident (>50% confidence minimum)
- Be specific: avoid vague identifications like "bird" or "animal"
- For unknown organisms, set confidence to 0 and organism_name to null
- Classification should be as complete as possible, or empty strings for unknown levels
- Characteristics should be observable features from the photo"""

        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Remove data:image/... prefix if present
        if ',' in image_data:
            image_data_clean = image_data.split(',')[1]
        else:
            image_data_clean = image_data
        
        # Decode base64
        image_bytes = base64.b64decode(image_data_clean)
        
        response = model.generate_content([
            prompt,
            {
                "mime_type": "image/jpeg",
                "data": base64.b64encode(image_bytes).decode()
            }
        ])
        
        # Parse response
        response_text = response.text
        print(f"[INFO] Gemini response: {response_text[:200]}...")
        
        # Extract JSON
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        
        if start_idx < 0 or end_idx <= 0:
            raise ValueError("Could not parse AI response as JSON")
        
        json_str = response_text[start_idx:end_idx]
        result = json.loads(json_str)
        
        # Validate response
        if not result.get("is_organism", False):
            return {
                "success": False,
                "error": "No organism detected in image. Please take a clearer photo.",
                "confidence": 0
            }
        
        if result.get("confidence", 0) < 40:
            return {
                "success": False,
                "error": f"Could not confidently identify organism (confidence: {result.get('confidence', 0)}%). Please try another photo.",
                "confidence": result.get("confidence", 0)
            }
        
        print(f"[OK] Identified: {result.get('organism_name')} (confidence: {result.get('confidence')}%)")
        
        return {
            "success": True,
            "organism_name": result.get("organism_name"),
            "scientific_name": result.get("scientific_name"),
            "confidence": min(100, max(0, result.get("confidence", 50))),  # Clamp 0-100
            "description": result.get("description", ""),
            "characteristics": result.get("characteristics", []),
            "classification": result.get("classification", {})
        }
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return {
            "success": False,
            "error": "Failed to parse AI response. Please try again.",
            "message": "AI response parsing failed"
        }
    except Exception as e:
        logger.error(f"Organism identification error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to identify organism"
        }

@api_router.post("/admin/login", response_model=AdminToken)
async def admin_login(login: AdminLogin):
    if login.username == "admin" and login.password == "adminSBES":
        token = hashlib.sha256("admin:adminSBES".encode()).hexdigest()
        return AdminToken(access_token=token)
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/admin/verify-email")
async def verify_admin_email(request: dict):
    """Verify if an email is in the authorized admin whitelist."""
    try:
        email = request.get("email", "").strip().lower()
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Get authorized emails from environment
        authorized_emails_str = os.environ.get('AUTHORIZED_ADMIN_EMAILS', '')
        if not authorized_emails_str:
            raise HTTPException(status_code=503, detail="Admin email whitelist not configured")
        
        # Parse authorized emails (comma-separated)
        authorized_emails = [e.strip().lower() for e in authorized_emails_str.split(',')]
        
        # Check if email is authorized
        if email in authorized_emails:
            # Generate admin token for this email
            token = hashlib.sha256(f"admin:{email}".encode()).hexdigest()
            return {
                "success": True,
                "email": email,
                "access_token": token,
                "message": f"Successfully logged in as {email}"
            }
        else:
            raise HTTPException(status_code=403, detail="Email not authorized. Access denied.")
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Email verification error: {e}")
        raise HTTPException(status_code=500, detail="Email verification failed")

@api_router.post("/admin/google-login")
async def google_login(request: dict):
    """Verify Google OAuth token and check if email is authorized."""
    try:
        google_token = request.get("token", "").strip()
        
        if not google_token:
            raise HTTPException(status_code=400, detail="Google token is required")
        
        # Verify Google token using google-auth library
        try:
            from google.auth.transport import requests
            from google.oauth2 import id_token
            
            # Get Google Client ID from environment
            google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
            if not google_client_id:
                raise HTTPException(status_code=503, detail="Google OAuth not configured")
            
            # Verify the token
            idinfo = id_token.verify_oauth2_token(google_token, requests.Request(), google_client_id)
            
            # Extract email from token
            email = idinfo.get('email', '').strip().lower()
            if not email:
                raise HTTPException(status_code=400, detail="No email in Google token")
            
            # Verify email is authorized
            authorized_emails_str = os.environ.get('AUTHORIZED_ADMIN_EMAILS', '')
            if not authorized_emails_str:
                raise HTTPException(status_code=503, detail="Admin email whitelist not configured")
            
            authorized_emails = [e.strip().lower() for e in authorized_emails_str.split(',')]
            
            if email not in authorized_emails:
                raise HTTPException(status_code=403, detail=f"Email {email} is not authorized. Access denied.")
            
            # Generate admin token for this email
            token = hashlib.sha256(f"admin:{email}".encode()).hexdigest()
            
            return {
                "success": True,
                "email": email,
                "name": idinfo.get('name', ''),
                "picture": idinfo.get('picture', ''),
                "access_token": token,
                "message": f"Successfully logged in with Google as {email}"
            }
            
        except ValueError as e:
            logging.error(f"Invalid Google token: {e}")
            raise HTTPException(status_code=401, detail="Invalid Google token")
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Google login error: {e}")
        raise HTTPException(status_code=500, detail=f"Google login failed: {str(e)}")

# ==================== GMAIL USER AUTHENTICATION ====================
@api_router.post("/auth/gmail/login", response_model=GoogleLoginResponse)
async def gmail_login(request: GoogleLoginRequest):
    """
    Authenticate user with Google ID token.
    Creates or updates user record in MongoDB.
    Returns JWT token for subsequent requests.
    """
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
        
        # Get Google Client ID from environment
        google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
        if not google_client_id:
            raise HTTPException(status_code=503, detail="Google OAuth not configured")
        
        # Verify the token
        try:
            idinfo = id_token.verify_oauth2_token(request.token, google_requests.Request(), google_client_id)
        except ValueError as e:
            logging.error(f"Invalid Google token: {e}")
            raise HTTPException(status_code=401, detail="Invalid Google token")
        
        # Extract user info
        email = idinfo.get('email', '').strip().lower()
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        google_id = idinfo.get('sub', '')  # Google's unique user ID
        
        if not email or not google_id:
            raise HTTPException(status_code=400, detail="Missing required info in Google token")
        
        # Check if user exists
        existing_user = await gmail_users_collection.find_one({"email": email})
        
        if existing_user:
            # Update last_active timestamp
            await gmail_users_collection.update_one(
                {"email": email},
                {
                    "$set": {
                        "last_active": get_ist_now(),
                        "is_active": True,
                        "profile_picture": picture,  # Update picture in case it changed
                        "name": name  # Update name in case it changed
                    }
                }
            )
            user_record = await gmail_users_collection.find_one({"email": email})
        else:
            # Create new user
            new_user = GmailUser(
                email=email,
                name=name,
                profile_picture=picture,
                google_id=google_id
            )
            await gmail_users_collection.insert_one(new_user.model_dump())
            user_record = await gmail_users_collection.find_one({"email": email})
        
        # Generate JWT token
        payload = {
            "sub": user_record["id"],
            "email": email,
            "name": name,
            "exp": datetime.now(IST) + timedelta(days=30)  # 30-day expiration
        }
        jwt_token = jwt.encode(payload, os.environ.get("JWT_SECRET_KEY", "biomuseum-secret"), algorithm="HS256")
        
        # Update token in database
        await gmail_users_collection.update_one(
            {"email": email},
            {"$set": {"jwt_token": jwt_token}}
        )
        
        user_response = GmailUserResponse(
            id=user_record["id"],
            email=email,
            name=name,
            profile_picture=picture,
            login_timestamp=user_record["login_timestamp"],
            last_active=user_record["last_active"],
            is_active=True
        )
        
        return GoogleLoginResponse(
            access_token=jwt_token,
            user=user_response
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Gmail login error: {e}")
        raise HTTPException(status_code=500, detail=f"Gmail login failed: {str(e)}")

@api_router.get("/auth/verify")
async def verify_token(authorization: str = Header(None)):
    """
    Verify JWT token and return user info.
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization header")
        
        # Extract token from "Bearer <token>"
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = parts[1]
        
        # Verify token
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET_KEY", "biomuseum-secret"), algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        user = await gmail_users_collection.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update last_active
        await gmail_users_collection.update_one(
            {"id": user["id"]},
            {"$set": {"last_active": get_ist_now()}}
        )
        
        return GmailUserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            profile_picture=user.get("profile_picture"),
            login_timestamp=user["login_timestamp"],
            last_active=user["last_active"],
            is_active=user.get("is_active", True)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Token verification error: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@api_router.get("/auth/user")
async def get_current_user(authorization: str = Header(None)):
    """
    Get current authenticated user info.
    """
    try:
        if not authorization:
            return None
        
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        
        token = parts[1]
        
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET_KEY", "biomuseum-secret"), algorithms=["HS256"])
        except:
            return None
        
        user = await gmail_users_collection.find_one({"id": payload["sub"]})
        if not user:
            return None
        
        return GmailUserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            profile_picture=user.get("profile_picture"),
            login_timestamp=user["login_timestamp"],
            last_active=user["last_active"],
            is_active=user.get("is_active", True)
        )
    
    except Exception as e:
        logging.error(f"Get user error: {e}")
        return None

@api_router.post("/auth/logout")
async def logout(authorization: str = Header(None)):
    """
    Mark user as inactive (logout).
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization header")
        
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = parts[1]
        
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET_KEY", "biomuseum-secret"), algorithms=["HS256"])
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Mark user as inactive
        result = await gmail_users_collection.update_one(
            {"id": payload["sub"]},
            {"$set": {"is_active": False, "jwt_token": None}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Successfully logged out"}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")

# ==================== END GMAIL USER AUTHENTICATION ====================

@api_router.post("/admin/organisms", response_model=Organism)
async def create_organism(organism: OrganismCreate, _: bool = Depends(verify_admin_token)):
    try:
        organism_obj = Organism(**organism.dict())
        organism_obj.qr_code_image = generate_qr_code(organism_obj.id)
        
        await insert_organism(organism_obj.model_dump())
        return organism_obj
    except Exception as e:
        logging.error(f"Error creating organism: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating organism: {str(e)}")

@api_router.put("/admin/organisms/{organism_id}", response_model=Organism)
async def update_organism(organism_id: str, updates: OrganismUpdate, _: bool = Depends(verify_admin_token)):
    try:
        existing = await find_organism(organism_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Organism not found")
        
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        update_data['updated_at'] = get_ist_now()
        
        updated_org = await update_organism_db(organism_id, update_data)
        if not updated_org:
            raise HTTPException(status_code=404, detail="Organism not found")
        return Organism(**updated_org)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/organisms/{organism_id}")
async def delete_organism(organism_id: str, _: bool = Depends(verify_admin_token)):
    try:
        deleted = await delete_organism_db(organism_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Organism not found")
        return {"message": "Organism deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SUGGESTION ENDPOINTS ====================

# Get all suggestions (admin only)
@api_router.get("/admin/suggestions")
async def get_all_suggestions(_: bool = Depends(verify_admin_token)):
    try:
        suggestions = await suggestions_collection.find().to_list(1000)
        result = []
        for sugg in suggestions:
            # Remove MongoDB's _id field to avoid Pydantic validation error
            sugg_copy = {k: v for k, v in sugg.items() if k != '_id'}
            # Add default values for missing fields
            sugg_copy.setdefault('educational_level', 'Not specified')
            sugg_copy.setdefault('description', '')
            sugg_copy.setdefault('status', 'pending')
            result.append(Suggestion(**sugg_copy))
        return result
    except Exception as e:
        logging.error(f"Error fetching suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get pending suggestions (admin only)
@api_router.get("/admin/suggestions/pending")
async def get_pending_suggestions(_: bool = Depends(verify_admin_token)):
    try:
        suggestions = await suggestions_collection.find({"status": "pending"}).to_list(1000)
        result = []
        for sugg in suggestions:
            # Remove MongoDB's _id field to avoid Pydantic validation error
            sugg_copy = {k: v for k, v in sugg.items() if k != '_id'}
            # Add default values for missing fields
            sugg_copy.setdefault('educational_level', 'Not specified')
            sugg_copy.setdefault('description', '')
            sugg_copy.setdefault('status', 'pending')
            result.append(Suggestion(**sugg_copy))
        return result
    except Exception as e:
        logging.error(f"Error fetching pending suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Create new suggestion (public)
@api_router.post("/suggestions")
async def create_suggestion(suggestion: SuggestionCreate):
    try:
        if not suggestion.user_name.strip() or not suggestion.organism_name.strip():
            raise HTTPException(status_code=400, detail="User name and organism name are required")
        
        if not suggestion.educational_level or not suggestion.educational_level.strip():
            raise HTTPException(status_code=400, detail="Class/Standard is required")
        
        suggestion_data = Suggestion(
            user_name=suggestion.user_name,
            organism_name=suggestion.organism_name,
            description=suggestion.description or "",
            educational_level=suggestion.educational_level
        )
        
        await suggestions_collection.insert_one(suggestion_data.dict())
        return {"message": "Suggestion submitted successfully", "id": suggestion_data.id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Update suggestion status (admin only)
@api_router.put("/admin/suggestions/{suggestion_id}/status")
async def update_suggestion_status(suggestion_id: str, status: str = Query(...), _: bool = Depends(verify_admin_token)):
    try:
        if status not in ["pending", "approved", "rejected"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        result = await suggestions_collection.update_one(
            {"id": suggestion_id},
            {"$set": {"status": status, "updated_at": get_ist_now()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        return {"message": f"Suggestion {status} successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Verify suggestion with AI (admin only)
@api_router.post("/admin/suggestions/{suggestion_id}/verify")
async def verify_suggestion_ai(suggestion_id: str, _: bool = Depends(verify_admin_token)):
    try:
        suggestion = await suggestions_collection.find_one({"id": suggestion_id})
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        if not HAS_GENAI or not GEMINI_API_KEY:
            raise HTTPException(status_code=503, detail="AI service not available")
        
        # Use Gemini to verify organism
        model = genai.GenerativeModel('gemini-2.5-flash')
        verification_prompt = f"""
        Is "{suggestion['organism_name']}" a real organism/animal/plant species that exists in nature?
        
        Respond with a JSON object:
        {{
            "is_authentic": true/false,
            "reason": "explanation",
            "type": "animal/plant/microorganism/fungus/other",
            "common_name": "if authentic",
            "scientific_name": "if authentic"
        }}
        """
        
        response = model.generate_content(verification_prompt)
        response_text = response.text.strip()
        
        # Extract JSON from response
        import json
        try:
            # Try to find JSON in the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                verification_data = json.loads(response_text[json_start:json_end])
            else:
                verification_data = {"is_authentic": False, "reason": "Could not parse response"}
        except json.JSONDecodeError:
            verification_data = {"is_authentic": False, "reason": "Invalid response format"}
        
        # Update suggestion with verification
        await suggestions_collection.update_one(
            {"id": suggestion_id},
            {
                "$set": {
                    "ai_verification": verification_data,
                    "updated_at": get_ist_now()
                }
            }
        )
        
        return verification_data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error verifying suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Approve suggestion and generate complete organism data (admin only)
@api_router.post("/admin/suggestions/{suggestion_id}/approve")
async def approve_suggestion_and_generate(suggestion_id: str, _: bool = Depends(verify_admin_token)):
    try:
        suggestion = await suggestions_collection.find_one({"id": suggestion_id})
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        if not HAS_GENAI or not GEMINI_API_KEY:
            raise HTTPException(status_code=503, detail="AI service not available")
        
        organism_name = suggestion['organism_name']
        
        # Generate complete organism data using the AI endpoint
        prompt = f"""You are an expert biologist and zoologist. I need you to provide detailed biological information about "{organism_name}".

Please provide the information in JSON format ONLY (no markdown, no explanations). Return ONLY valid JSON:

{{
    "name": "Common name of the organism",
    "scientific_name": "Scientific name (binomial nomenclature)",
    "classification": {{
        "kingdom": "Kingdom",
        "phylum": "Phylum",
        "class": "Class",
        "order": "Order",
        "family": "Family",
        "genus": "Genus",
        "species": "Species"
    }},
    "morphology": "Physical description including size, color, distinctive features (2-3 sentences)",
    "physiology": "How the organism functions, internal systems, key biological processes (2-3 sentences)",
    "description": "General overview of the organism, its habitat, and interesting facts (3-4 sentences)"
}}

Be accurate and scientific. If you cannot find specific information, make reasonable educated guesses based on the organism's taxonomy.
Make sure the JSON is valid and properly formatted."""

        # Call Gemini API to generate organism data
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # Parse the response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Parse JSON
        organism_data = json.loads(response_text)
        
        # Now generate images using Unsplash
        images = []
        try:
            search_terms = [
                organism_data.get('name', organism_name),
                organism_data.get('scientific_name', ''),
                organism_name
            ]
            
            # Try each search term until we get real images
            for search_term in search_terms:
                if search_term:
                    try:
                        images = await get_images_from_unsplash(search_term, max_images=5)
                        if images and len(images) > 0:
                            logging.info(f"Generated {len(images)} images from Unsplash for term '{search_term}'")
                            break
                    except Exception as e:
                        logging.warning(f"Error searching Unsplash for term '{search_term}': {e}")
                        continue
        except Exception as e:
            logging.warning(f"Could not fetch images from Unsplash: {e}")
            images = []
        
        # Update suggestion status to approved
        await suggestions_collection.update_one(
            {"id": suggestion_id},
            {
                "$set": {
                    "status": "approved",
                    "updated_at": get_ist_now(),
                    "ai_verification": {
                        "is_authentic": True,
                        "reason": "Admin approved and generated complete data"
                    }
                }
            }
        )
        
        # Return organism data with images ready for auto-fill
        return {
            "success": True,
            "organism_data": {
                "name": organism_data.get('name', organism_name),
                "scientific_name": organism_data.get('scientific_name', ''),
                "classification": organism_data.get('classification', {
                    "kingdom": "",
                    "phylum": "",
                    "class": "",
                    "order": "",
                    "family": "",
                    "genus": "",
                    "species": ""
                }),
                "morphology": organism_data.get('morphology', ''),
                "physiology": organism_data.get('physiology', ''),
                "description": organism_data.get('description', ''),
                "images": images
            },
            "suggestion_id": suggestion_id,
            "message": "Suggestion approved and organism data generated successfully"
        }
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logging.error(f"Error approving suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Delete suggestion (admin only)
@api_router.delete("/admin/suggestions/{suggestion_id}")
async def delete_suggestion(suggestion_id: str, _: bool = Depends(verify_admin_token)):
    try:
        result = await suggestions_collection.delete_one({"id": suggestion_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        return {"message": "Suggestion deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Verify if organism exists in database (for both suggestions and camera feature)
@api_router.post("/admin/verify-organism-exists")
async def verify_organism_exists(request: VerifyOrganismRequest, _: bool = Depends(verify_admin_token)):
    """
    Check if an organism already exists in the database by name or scientific name.
    Used for both camera suggestions and manual suggestions to avoid duplicates.
    """
    try:
        organism_name = request.organism_name.strip()
        scientific_name = request.scientific_name.strip() if request.scientific_name else ""
        
        if not organism_name:
            raise HTTPException(status_code=400, detail="Organism name is required")
        
        # Search for organism by name (case-insensitive) or scientific name
        query = {
            "$or": [
                {"name": {"$regex": f"^{organism_name}$", "$options": "i"}},
            ]
        }
        
        if scientific_name:
            query["$or"].append({"scientific_name": {"$regex": f"^{scientific_name}$", "$options": "i"}})
        
        existing_organism = await organisms_collection.find_one(query)
        
        if existing_organism:
            # Organism exists - return details
            return {
                "exists": True,
                "organism": {
                    "id": existing_organism.get("id"),
                    "name": existing_organism.get("name"),
                    "scientific_name": existing_organism.get("scientific_name"),
                    "classification": existing_organism.get("classification", {})
                },
                "message": f"'{organism_name}' already exists in the database"
            }
        else:
            # Organism does not exist - can be added
            return {
                "exists": False,
                "message": f"'{organism_name}' is not in the database yet. This suggestion can be approved."
            }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error verifying organism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Auto-reject duplicate suggestions (called when suggestion is created)
@api_router.post("/admin/check-and-auto-reject-duplicate")
async def check_and_auto_reject_duplicate(suggestion_id: str, _: bool = Depends(verify_admin_token)):
    """
    Check if a suggestion is for an existing organism and auto-reject it if found.
    """
    try:
        suggestion = await suggestions_collection.find_one({"id": suggestion_id})
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        organism_name = suggestion.get('organism_name', '').strip()
        
        # Search for organism by name (case-insensitive)
        existing_organism = await organisms_collection.find_one(
            {"name": {"$regex": f"^{organism_name}$", "$options": "i"}}
        )
        
        if existing_organism:
            # Auto-reject the suggestion
            await suggestions_collection.update_one(
                {"id": suggestion_id},
                {
                    "$set": {
                        "status": "rejected",
                        "rejection_reason": f"Duplicate: '{organism_name}' already exists in database (ID: {existing_organism.get('id')})",
                        "auto_rejected": True,
                        "updated_at": get_ist_now()
                    }
                }
            )
            
            return {
                "auto_rejected": True,
                "reason": f"'{organism_name}' already exists in the database",
                "existing_organism": {
                    "id": existing_organism.get("id"),
                    "name": existing_organism.get("name")
                }
            }
        else:
            return {
                "auto_rejected": False,
                "message": "Suggestion is for a new organism and can be reviewed"
            }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error checking for duplicates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BIOTUBE ENDPOINTS ====================

# Get all videos (public)
@api_router.get("/biotube/videos")
async def get_biotube_videos(kingdom: Optional[str] = None, phylum: Optional[str] = None, class_name: Optional[str] = None, species: Optional[str] = None, search: Optional[str] = None):
    try:
        query = {"visibility": "public"}
        
        if kingdom:
            query["kingdom"] = {"$regex": f"^{kingdom}$", "$options": "i"}
        if phylum:
            query["phylum"] = {"$regex": f"^{phylum}$", "$options": "i"}
        if class_name:
            query["class_name"] = {"$regex": f"^{class_name}$", "$options": "i"}
        if species:
            query["species"] = {"$regex": f"^{species}$", "$options": "i"}
        
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"kingdom": {"$regex": search, "$options": "i"}},
                {"species": {"$regex": search, "$options": "i"}}
            ]
        
        videos = await biotube_videos_collection.find(query).sort("created_at", -1).to_list(1000)
        result = []
        for video in videos:
            video_copy = {k: v for k, v in video.items() if k != '_id'}
            result.append(BiotubVideo(**video_copy))
        return result
    except Exception as e:
        logging.error(f"Error fetching biotube videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get single video by ID
@api_router.get("/biotube/videos/{video_id}")
async def get_biotube_video(video_id: str):
    try:
        video = await biotube_videos_collection.find_one({"id": video_id, "visibility": "public"})
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        video_copy = {k: v for k, v in video.items() if k != '_id'}
        return BiotubVideo(**video_copy)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get related videos
@api_router.get("/biotube/videos/{video_id}/related")
async def get_related_videos(video_id: str):
    try:
        video = await biotube_videos_collection.find_one({"id": video_id})
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Find videos with same kingdom or phylum
        related = await biotube_videos_collection.find({
            "visibility": "public",
            "id": {"$ne": video_id},
            "$or": [
                {"kingdom": video.get("kingdom")},
                {"phylum": video.get("phylum")}
            ]
        }).limit(6).to_list(6)
        
        result = []
        for vid in related:
            video_copy = {k: v for k, v in vid.items() if k != '_id'}
            result.append(BiotubVideo(**video_copy))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching related videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get available filters
@api_router.get("/biotube/filters")
async def get_biotube_filters():
    try:
        kingdoms = await biotube_videos_collection.distinct("kingdom", {"visibility": "public"})
        phylums = await biotube_videos_collection.distinct("phylum", {"visibility": "public"})
        classes = await biotube_videos_collection.distinct("class_name", {"visibility": "public"})
        species_list = await biotube_videos_collection.distinct("species", {"visibility": "public"})
        
        return {
            "kingdoms": sorted(kingdoms),
            "phylums": sorted(phylums),
            "classes": sorted(classes),
            "species": sorted(species_list)
        }
    except Exception as e:
        logging.error(f"Error fetching filters: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Create video suggestion (public)
@api_router.post("/biotube/suggest-video")
async def create_video_suggestion(suggestion: VideoSuggestionCreate):
    try:
        if not suggestion.user_name.strip() or not suggestion.video_title.strip():
            raise HTTPException(status_code=400, detail="User name and video title are required")
        
        if not suggestion.user_class.strip():
            raise HTTPException(status_code=400, detail="Class/Standard is required")
        
        suggestion_data = VideoSuggestion(
            user_name=suggestion.user_name,
            user_class=suggestion.user_class,
            video_title=suggestion.video_title,
            video_description=suggestion.video_description or ""
        )
        
        await video_suggestions_collection.insert_one(suggestion_data.dict())
        return {"message": "Video suggestion submitted successfully", "id": suggestion_data.id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating video suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BIOTUBE ADMIN ENDPOINTS ====================

# Get biotube dashboard stats (admin only)
@api_router.get("/admin/biotube/dashboard")
async def get_biotube_dashboard(_: bool = Depends(verify_admin_token)):
    try:
        total_videos = await biotube_videos_collection.count_documents({})
        public_videos = await biotube_videos_collection.count_documents({"visibility": "public"})
        pending_suggestions = await video_suggestions_collection.count_documents({"status": "pending"})
        
        # Get most viewed (by counting if we had view tracking - for now just recently added)
        recent_videos = await biotube_videos_collection.find().sort("created_at", -1).limit(5).to_list(5)
        
        kingdoms = await biotube_videos_collection.distinct("kingdom")
        
        recent = []
        for v in recent_videos:
            video_copy = {k: v for k, v in v.items() if k != '_id'}
            recent.append({
                "id": video_copy.get("id"),
                "title": video_copy.get("title"),
                "created_at": video_copy.get("created_at")
            })
        
        return {
            "total_videos": total_videos,
            "public_videos": public_videos,
            "pending_suggestions": pending_suggestions,
            "categories_count": len(kingdoms),
            "recently_added": recent
        }
    except Exception as e:
        logging.error(f"Error fetching biotube dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add video (admin only)
@api_router.post("/admin/biotube/videos")
async def add_biotube_video(video: BiotubVideoCreate, _: bool = Depends(verify_admin_token)):
    try:
        # Extract video ID from YouTube URL
        import re
        youtube_regex = r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)'
        match = re.search(youtube_regex, video.youtube_url)
        
        if not match:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        video_id = match.group(1)
        embed_code = f'<iframe width="100%" height="600" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
        
        # Check for duplicates
        existing = await biotube_videos_collection.find_one({"youtube_url": video.youtube_url})
        if existing:
            raise HTTPException(status_code=400, detail="This YouTube video has already been added")
        
        # Get thumbnail - IMPORTANT: Always set a thumbnail URL
        if video.thumbnail_url and video.thumbnail_url.strip():
            thumbnail_url = video.thumbnail_url.strip()
        else:
            # Auto-generate from YouTube if not provided
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        
        # Generate QR code for the video page
        new_video_id = str(uuid.uuid4())
        qr_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/biotube/watch/{new_video_id}"
        
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(qr_url)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        img_buffer = io.BytesIO()
        qr_img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        qr_code_base64 = f"data:image/png;base64,{base64.b64encode(img_buffer.getvalue()).decode()}"
        
        video_data = BiotubVideo(
            id=new_video_id,
            title=video.title,
            youtube_url=video.youtube_url,
            embed_code=embed_code,
            kingdom=video.kingdom,
            phylum=video.phylum,
            class_name=video.class_name,
            species=video.species,
            description=video.description or "",
            thumbnail_url=thumbnail_url,
            qr_code=qr_code_base64
        )
        
        await biotube_videos_collection.insert_one(video_data.dict())
        return {"message": "Video added successfully", "id": video_data.id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error adding biotube video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Update video (admin only)
@api_router.put("/admin/biotube/videos/{video_id}")
async def update_biotube_video(video_id: str, update_data: BiotubVideoUpdate, _: bool = Depends(verify_admin_token)):
    try:
        video = await biotube_videos_collection.find_one({"id": video_id})
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = get_ist_now()
        
        await biotube_videos_collection.update_one({"id": video_id}, {"$set": update_dict})
        return {"message": "Video updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating biotube video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Delete video (admin only)
@api_router.delete("/admin/biotube/videos/{video_id}")
async def delete_biotube_video(video_id: str, _: bool = Depends(verify_admin_token)):
    try:
        result = await biotube_videos_collection.delete_one({"id": video_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Video not found")
        return {"message": "Video deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting biotube video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all videos for admin (including private)
@api_router.get("/admin/biotube/videos")
async def get_admin_biotube_videos(_: bool = Depends(verify_admin_token)):
    try:
        videos = await biotube_videos_collection.find().sort("created_at", -1).to_list(1000)
        result = []
        for video in videos:
            video_copy = {k: v for k, v in video.items() if k != '_id'}
            result.append(BiotubVideo(**video_copy))
        return result
    except Exception as e:
        logging.error(f"Error fetching admin biotube videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get video suggestions (admin only)
@api_router.get("/admin/biotube/suggestions")
async def get_video_suggestions(status: Optional[str] = None, _: bool = Depends(verify_admin_token)):
    try:
        query = {}
        if status:
            query["status"] = status
        
        suggestions = await video_suggestions_collection.find(query).sort("created_at", -1).to_list(1000)
        logging.info(f"[Biotube] Found {len(suggestions)} suggestions in database")
        
        result = []
        for i, sugg in enumerate(suggestions):
            try:
                sugg_copy = {k: v for k, v in sugg.items() if k != '_id'}
                # Convert to model and back to dict to ensure proper serialization
                sugg_obj = VideoSuggestion(**sugg_copy)
                result.append(sugg_obj.dict())
            except Exception as item_error:
                logging.error(f"[Biotube] Error processing suggestion {i}: {item_error}")
                logging.error(f"[Biotube] Suggestion data: {sugg}")
                # Skip this suggestion and continue
                continue
        
        logging.info(f"[Biotube] Returning {len(result)} processed suggestions")
        return result
    except Exception as e:
        logging.error(f"[Biotube] Error fetching video suggestions: {e}")
        import traceback
        logging.error(f"[Biotube] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# Update suggestion status (admin only)
@api_router.put("/admin/biotube/suggestions/{suggestion_id}/status")
async def update_video_suggestion_status(suggestion_id: str, new_status: str = Query(...), _: bool = Depends(verify_admin_token)):
    try:
        if new_status not in ["pending", "reviewed", "added", "dismissed"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        result = await video_suggestions_collection.update_one(
            {"id": suggestion_id},
            {"$set": {"status": new_status, "updated_at": get_ist_now()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        return {"message": f"Suggestion status updated to {new_status}"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating suggestion status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get user suggestion history (admin only)
@api_router.get("/admin/biotube/user-history/{user_name}")
async def get_user_suggestion_history(user_name: str, _: bool = Depends(verify_admin_token)):
    try:
        suggestions = await video_suggestions_collection.find({"user_name": {"$regex": f"^{user_name}$", "$options": "i"}}).sort("created_at", -1).to_list(1000)
        result = []
        for sugg in suggestions:
            sugg_copy = {k: v for k, v in sugg.items() if k != '_id'}
            result.append(VideoSuggestion(**sugg_copy))
        return result
    except Exception as e:
        logging.error(f"Error fetching user history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all user suggestion history (admin only)
@api_router.get("/admin/biotube/user-history")
async def get_all_user_suggestion_history(_: bool = Depends(verify_admin_token)):
    try:
        suggestions = await video_suggestions_collection.find().sort("created_at", -1).to_list(10000)
        logging.info(f"[Biotube] Found {len(suggestions)} total suggestions for history")
        
        # Group by user_name
        history_dict = {}
        for sugg in suggestions:
            user = sugg.get("user_name", "Unknown")
            if user not in history_dict:
                history_dict[user] = []
            sugg_copy = {k: v for k, v in sugg.items() if k != '_id'}
            history_dict[user].append(sugg_copy)
        
        logging.info(f"[Biotube] Grouped suggestions into {len(history_dict)} users")
        return history_dict
    except Exception as e:
        logging.error(f"[Biotube] Error fetching all user history: {e}")
        import traceback
        logging.error(f"[Biotube] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/gmail-users")
async def get_all_gmail_users(_: bool = Depends(verify_admin_token)):
    """
    Get all logged-in Gmail users for admin panel.
    Shows email, name, profile pic, login time, last active, and status.
    """
    try:
        users = await gmail_users_collection.find().sort("login_timestamp", -1).to_list(1000)
        
        # Remove MongoDB's _id field and return clean data
        users_list = []
        for user in users:
            user_copy = {k: v for k, v in user.items() if k != '_id'}
            users_list.append(user_copy)
        
        logging.info(f"[Auth] Fetched {len(users_list)} Gmail users for admin panel")
        return users_list
    except Exception as e:
        logging.error(f"[Auth] Error fetching Gmail users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/biotube/suggestions/{suggestion_id}")
async def delete_suggestion(suggestion_id: str, _: bool = Depends(verify_admin_token)):
    try:
        result = await video_suggestions_collection.delete_one({"id": suggestion_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        return {"message": "Suggestion deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= VIDEO COMMENTS ENDPOINTS =============

# Get comments for a video
@api_router.get("/biotube/videos/{video_id}/comments")
async def get_video_comments(video_id: str):
    try:
        comments = await video_comments_collection.find({"video_id": video_id}).sort("created_at", -1).to_list(1000)
        result = []
        for comment in comments:
            comment_copy = {k: v for k, v in comment.items() if k != '_id'}
            result.append(VideoComment(**comment_copy))
        return result
    except Exception as e:
        logging.error(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Post a comment on a video
@api_router.post("/biotube/videos/{video_id}/comments")
async def post_video_comment(video_id: str, comment: VideoCommentCreate):
    try:
        # Verify video exists
        video = await biotube_videos_collection.find_one({"id": video_id, "visibility": "public"})
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        new_comment = VideoComment(
            video_id=video_id,
            user_name=comment.user_name,
            user_class=comment.user_class,
            text=comment.text
        )
        
        await video_comments_collection.insert_one(new_comment.dict())
        return {"message": "Comment posted successfully", "id": new_comment.id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error posting comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Delete a comment (admin only)
@api_router.delete("/admin/biotube/comments/{comment_id}")
async def delete_video_comment(comment_id: str, _: bool = Depends(verify_admin_token)):
    try:
        result = await video_comments_collection.delete_one({"id": comment_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Like a comment
@api_router.put("/biotube/comments/{comment_id}/like")
async def like_video_comment(comment_id: str):
    try:
        result = await video_comments_collection.update_one(
            {"id": comment_id},
            {"$inc": {"likes": 1}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment liked successfully"}
    except Exception as e:
        logging.error(f"Error liking comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= BLOG ROUTES =============

# Generate blog using Gemini AI
@api_router.post("/blogs/generate")
async def generate_blog_ai(request: BlogGenerateRequest, _: bool = Depends(verify_admin_token)):
    try:
        if not HAS_GENAI or not GEMINI_API_KEY:
            raise HTTPException(status_code=400, detail="Gemini API not configured. Please add GEMINI_API_KEY to .env")
        
        prompt = f"""Write a comprehensive {request.tone} biology blog post about: {request.subject}

TITLE: [Create an engaging title about {request.subject}]

INTRODUCTION:
[2-3 paragraphs introducing the topic and why it matters]

SECTION 1: [Main Concept]
[Explain the core concept in detail]

SECTION 2: [How It Works]
[Describe the mechanism or process]

SECTION 3: [Real-World Applications]
[Provide examples and uses]

SECTION 4: [Key Takeaways]
- Point 1
- Point 2
- Point 3
- Point 4
- Point 5

CONCLUSION:
[Summary and why this matters]

Write it in a {request.tone} tone, suitable for biology students and science enthusiasts."""

        # Try different models to find one that works
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro']
        response = None
        last_error = None
        
        for model_name in models_to_try:
            try:
                logging.info(f"Attempting to use model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                logging.info(f"Successfully generated content using {model_name}")
                break
            except Exception as model_error:
                last_error = model_error
                logging.warning(f"Model {model_name} failed: {str(model_error)}")
                continue
        
        if response is None or not response.text:
            error_msg = f"All models failed. Last error: {str(last_error)}"
            logging.error(error_msg)
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to generate blog with Gemini. Error: {str(last_error)}. Please check your Gemini API key has proper access."
            )
        
        content = response.text
        title = f"{request.subject}: A Comprehensive Guide"
        
        if "TITLE:" in content:
            try:
                title_part = content.split("INTRODUCTION:")[0]
                title = title_part.replace("TITLE:", "").strip()[:200]
            except:
                pass
        
        return {
            "title": title,
            "subject": request.subject,
            "content": content,
            "success": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in blog generation: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Blog generation failed: {str(e)}. Make sure your Gemini API key is valid and has access to generative models."
        )

# Get all blogs (public)
@api_router.get("/blogs")
async def get_all_blogs():
    try:
        blogs = await blogs_collection.find(
            {"visibility": "public"}
        ).sort("created_at", -1).to_list(None)
        
        # Format blogs for response
        for blog in blogs:
            blog["_id"] = str(blog.get("_id", ""))
        
        return blogs
    except Exception as e:
        logging.error(f"Error fetching blogs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get specific blog by ID
@api_router.get("/blogs/{blog_id}")
async def get_blog_detail(blog_id: str):
    try:
        from bson import ObjectId
        blog = await blogs_collection.find_one(
            {"id": blog_id, "visibility": "public"}
        )
        
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        # Increment view count
        await blogs_collection.update_one(
            {"id": blog_id},
            {"$inc": {"views": 1}}
        )
        
        blog["_id"] = str(blog.get("_id", ""))
        return blog
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching blog: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Create blog (admin - manual or AI generated)
@api_router.post("/admin/blogs")
async def create_blog(blog: BlogCreate, _: bool = Depends(verify_admin_token)):
    try:
        # Generate QR code for the blog
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(f"https://biomuseumsbes.vercel.app/blog/{blog.id if hasattr(blog, 'id') else 'temp'}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert QR code to base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_code_b64 = base64.b64encode(buffered.getvalue()).decode()
        
        new_blog = Blog(
            **blog.dict(),
            qr_code=qr_code_b64
        )
        
        # Update QR code with actual blog ID
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(f"https://biomuseumsbes.vercel.app/blog/{new_blog.id}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        new_blog.qr_code = base64.b64encode(buffered.getvalue()).decode()
        
        await blogs_collection.insert_one(new_blog.dict())
        return {"message": "Blog created successfully", "id": new_blog.id}
    except Exception as e:
        logging.error(f"Error creating blog: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Update blog
@api_router.put("/admin/blogs/{blog_id}")
async def update_blog(blog_id: str, updates: BlogUpdate, _: bool = Depends(verify_admin_token)):
    try:
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        update_data["updated_at"] = get_ist_now()
        
        result = await blogs_collection.update_one(
            {"id": blog_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        return {"message": "Blog updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating blog: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Delete blog
@api_router.delete("/admin/blogs/{blog_id}")
async def delete_blog(blog_id: str, _: bool = Depends(verify_admin_token)):
    try:
        result = await blogs_collection.delete_one({"id": blog_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Blog not found")
        return {"message": "Blog deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting blog: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get admin blog dashboard
@api_router.get("/admin/blogs/dashboard")
async def get_blog_dashboard(_: bool = Depends(verify_admin_token)):
    try:
        total_blogs = await blogs_collection.count_documents({})
        total_views = 0
        total_likes = 0
        
        blogs = await blogs_collection.find({}).to_list(None)
        for blog in blogs:
            total_views += blog.get("views", 0)
            total_likes += blog.get("likes", 0)
        
        # Get recent blogs with proper formatting
        recent_blogs_data = await blogs_collection.find({}).sort("created_at", -1).limit(5).to_list(None)
        recent_blogs_formatted = []
        for blog in recent_blogs_data:
            recent_blogs_formatted.append({
                "id": str(blog.get("id", "")),
                "title": blog.get("title", ""),
                "subject": blog.get("subject", ""),
                "views": blog.get("views", 0),
                "likes": blog.get("likes", 0),
                "created_at": blog.get("created_at", ""),
                "is_ai_generated": blog.get("is_ai_generated", False)
            })
        
        return {
            "total_blogs": total_blogs,
            "total_views": total_views,
            "total_likes": total_likes,
            "recent_blogs": recent_blogs_formatted
        }
    except Exception as e:
        logging.error(f"Error fetching blog dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all blogs (admin can see all)
@api_router.get("/admin/blogs")
async def get_all_blogs_admin(_: bool = Depends(verify_admin_token)):
    try:
        blogs = await blogs_collection.find({}).sort("created_at", -1).to_list(None)
        for blog in blogs:
            blog["_id"] = str(blog.get("_id", ""))
        return blogs
    except Exception as e:
        logging.error(f"Error fetching blogs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Like a blog
@api_router.put("/blogs/{blog_id}/like")
async def like_blog(blog_id: str):
    try:
        result = await blogs_collection.update_one(
            {"id": blog_id},
            {"$inc": {"likes": 1}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Blog not found")
        return {"message": "Blog liked successfully"}
    except Exception as e:
        logging.error(f"Error liking blog: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Create blog suggestion
@api_router.post("/blogs/suggestions")
async def create_blog_suggestion(suggestion: BlogSuggestionCreate):
    try:
        new_suggestion = BlogSuggestion(**suggestion.dict())
        await blog_suggestions_collection.insert_one(new_suggestion.dict())
        return {"message": "Blog suggestion submitted successfully", "id": new_suggestion.id}
    except Exception as e:
        logging.error(f"Error creating blog suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get blog suggestions (admin)
@api_router.get("/admin/blogs/suggestions")
async def get_blog_suggestions(_: bool = Depends(verify_admin_token)):
    try:
        suggestions = await blog_suggestions_collection.find({}).sort("created_at", -1).to_list(None)
        # Format suggestions to ensure consistency
        formatted = []
        for sugg in suggestions:
            formatted.append({
                "id": str(sugg.get("id", "")),
                "blog_subject": sugg.get("blog_subject", ""),
                "user_name": sugg.get("user_name", ""),
                "user_email": sugg.get("user_email", ""),
                "blog_description": sugg.get("blog_description", ""),
                "status": sugg.get("status", "pending"),
                "created_at": sugg.get("created_at", ""),
                "updated_at": sugg.get("updated_at", "")
            })
        return formatted
    except Exception as e:
        logging.error(f"Error fetching blog suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Update blog suggestion status
@api_router.put("/admin/blogs/suggestions/{suggestion_id}/status")
async def update_blog_suggestion_status(suggestion_id: str, status: dict, _: bool = Depends(verify_admin_token)):
    try:
        result = await blog_suggestions_collection.update_one(
            {"id": suggestion_id},
            {"$set": {"status": status.get("status"), "updated_at": get_ist_now()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        return {"message": "Suggestion status updated successfully"}
    except Exception as e:
        logging.error(f"Error updating suggestion status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# BioMuseum AI Chatbot Endpoint
@api_router.post("/ai/ask")
async def ask_biology_question(request: BiologyQuestion):
    """
    Ask BioMuseum Intelligence about any biology topic (Classes 1-12, NEET, degree, PhD level)
    Only answers biology-related questions
    """
    try:
        if not HAS_GENAI or not GEMINI_API_KEY:
            raise HTTPException(status_code=503, detail="AI service not available")
        
        question = request.question.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # Use same model as organism generation (gemini-2.5-flash)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Shorter, more efficient prompt to reduce token usage
        comprehensive_prompt = f"""You are BioMuseum Intelligence. ONLY answer biology questions.

Question: {question}

Respond ONLY with JSON (no other text):
{{"answer": "2-3 paragraphs, clear and scientific", "organisms": ["org1", "org2"], "suggestions": ["Q1?", "Q2?"]}}

If NOT biology: {{"answer": "I only help with biology questions!", "organisms": [], "suggestions": ["Ask about animals", "Ask about plants", "Ask about genetics"]}}"""
        
        response = model.generate_content(comprehensive_prompt)
        response_text = response.text.strip()
        
        # Parse JSON response - handle various formats
        try:
            response_text = response_text.strip()
            
            # Remove 'json' prefix if present (e.g., ```json {"...})
            if response_text.startswith('```json'):
                response_text = response_text[7:].strip()
            if response_text.startswith('json'):
                response_text = response_text[4:].strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text[3:].strip()
            if response_text.endswith('```'):
                response_text = response_text[:-3].strip()
            
            # Find JSON object
            if "{" in response_text:
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                json_str = response_text[json_start:json_end]
            else:
                json_str = response_text
                
            result = json.loads(json_str)
            
            return {
                "answer": result.get("answer", "").strip(),
                "related_organisms": result.get("organisms", [])[:5],
                "confidence": "high",
                "suggestions": result.get("suggestions", [])[:3]
            }
        except json.JSONDecodeError as e:
            # If JSON parsing fails, try to extract answer text anyway
            if "answer" in response_text.lower():
                # Try to find content between "answer" and next field
                try:
                    start = response_text.lower().find('"answer"') + 8
                    end = response_text.find('"', start + 2)
                    if end > start:
                        answer = response_text[start:end].strip().strip('":,')
                        return {
                            "answer": answer,
                            "related_organisms": [],
                            "confidence": "medium",
                            "suggestions": ["Can you explain more?", "What are related topics?"]
                        }
                except:
                    pass
            
            return {
                "answer": response_text[:500],  # Return first 500 chars if parsing fails
                "related_organisms": [],
                "confidence": "low",
                "suggestions": ["Ask another question?"]
            }
        
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error in AI chatbot: {error_msg}")
        
        # Check for rate limit errors
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429, 
                detail="API quota exceeded. Please try again in a few moments. The free tier has limited requests per day."
            )
        elif "SAFETY" in error_msg or "safety" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="The question contains content that I cannot discuss. Please ask a different biology question."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Error processing question: {error_msg[:100]}")


app.include_router(api_router)

# Parse CORS origins from environment variable
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')
cors_origins = [origin.strip() for origin in cors_origins]  # Remove whitespace

print(f"[INFO] CORS Origins configured: {cors_origins}")

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

@app.on_event("startup")
async def startup_event():
    try:
        await init_mongodb()
        logging.info("Startup event completed successfully")
    except Exception as e:
        logging.error(f"Startup event failed: {e}", exc_info=True)
        # Don't re-raise - let the server continue even if startup fails

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
