import asyncio
import os
import uuid
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import pytz

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# IST Timezone
IST = pytz.timezone('Asia/Kolkata')

print("\n" + "="*80)
print("  🗄️  BIOMUSEUM DATABASE SEED SCRIPT")
print("="*80)

# Sample organism data
sample_organisms = [
    {
        "name": "African Elephant",
        "scientific_name": "Loxodonta africana",
        "classification": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Mammalia",
            "order": "Proboscidea",
            "family": "Elephantidae",
            "genus": "Loxodonta",
            "species": "L. africana"
        },
        "morphology": "Large mammals with distinctive trunk (elongated nose), large ears, and thick, gray skin. Adults can reach heights of 4 meters at the shoulder and weigh up to 6 tons. The trunk contains over 40,000 muscles and serves multiple functions including breathing, smelling, touching, and grasping.",
        "physiology": "Herbivorous with a complex digestive system. They have a four-chambered stomach and can consume up to 300kg of vegetation daily. Their large ears help regulate body temperature through heat dissipation. Elephants have excellent memory and complex social behaviors.",
        "images": [],
        "description": "The African Elephant is the largest land mammal on Earth. They play a crucial role in their ecosystem as 'ecosystem engineers,' modifying their environment and creating habitats for other species. Unfortunately, they face threats from poaching and habitat loss."
    },
    {
        "name": "Monarch Butterfly",
        "scientific_name": "Danaus plexippus",
        "classification": {
            "kingdom": "Animalia",
            "phylum": "Arthropoda",
            "class": "Insecta",
            "order": "Lepidoptera",
            "family": "Nymphalidae",
            "genus": "Danaus",
            "species": "D. plexippus"
        },
        "morphology": "Medium-sized butterfly with distinctive orange wings bordered with black bands and white spots. Wingspan typically 8.9-10.2 cm. Males have distinctive black scent spots on their hindwings. The body is black with white spots.",
        "physiology": "Complete metamorphosis lifecycle: egg → larva (caterpillar) → pupa (chrysalis) → adult butterfly. Adults feed primarily on nectar from flowers, while caterpillars exclusively eat milkweed plants. Famous for their incredible migration spanning multiple generations.",
        "images": [],
        "description": "Monarch Butterflies are renowned for their extraordinary annual migration, traveling thousands of miles from North America to overwintering grounds in Mexico. This migration is considered one of the most remarkable phenomena in the natural world."
    }
]

async def seed_database():
    """Initialize MongoDB with all required collections and sample data"""
    try:
        # Connect to MongoDB
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        
        if not mongo_url:
            print("ERROR: MONGO_URL environment variable not set!")
            return False
        
        if not db_name:
            print("ERROR: DB_NAME environment variable not set!")
            return False
        
        print(f"[INFO] Connecting to MongoDB: {mongo_url[:60]}...")
        print(f"[INFO] Database: {db_name}")
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=120000)
        
        # Test connection
        await client.admin.command('ping')
        print("[OK] ✓ Connected to MongoDB")
        
        db = client[db_name]
        
        # Create all required collections with indexes
        print("\n[INFO] Initializing collections...")
        
        # 1. Organisms collection
        print("  - organisms")
        organisms_col = db.organisms
        await organisms_col.create_index("name")
        await organisms_col.create_index("scientific_name")
        
        # 2. Suggestions collection
        print("  - suggestions")
        suggestions_col = db.suggestions
        await suggestions_col.create_index("organism_name")
        
        # 3. Biotube Videos collection
        print("  - biotube_videos")
        videos_col = db.biotube_videos
        await videos_col.create_index("title")
        await videos_col.create_index("uploaded_at")
        
        # 4. Video Suggestions collection
        print("  - video_suggestions")
        video_sugg_col = db.video_suggestions
        await video_sugg_col.create_index("video_id")
        
        # 5. Video Comments collection
        print("  - video_comments")
        comments_col = db.video_comments
        await comments_col.create_index("video_id")
        await comments_col.create_index("user_email")
        
        # 6. Blogs collection
        print("  - blogs")
        blogs_col = db.blogs
        await blogs_col.create_index("title")
        await blogs_col.create_index("created_at")
        
        # 7. Blog Suggestions collection
        print("  - blog_suggestions")
        blog_sugg_col = db.blog_suggestions
        await blog_sugg_col.create_index("blog_id")
        
        # 8. Gmail Users collection
        print("  - gmail_users")
        users_col = db.gmail_users
        await users_col.create_index("email", unique=True)
        
        # 9. Admin collection (for storing admin credentials and info)
        print("  - admins")
        admins_col = db.admins
        await admins_col.create_index("username", unique=True)
        await admins_col.create_index("email", unique=True)
        
        # 10. Site Settings collection (for personalization)
        print("  - site_settings")
        site_settings_col = db.site_settings
        await site_settings_col.create_index("id", unique=True)
        
        print("[OK] ✓ All collections created with indexes")
        
        # Seed sample organisms
        print("\n[INFO] Seeding sample organisms...")
        
        # Clear existing organisms (optional)
        await organisms_col.delete_many({})
        
        for organism_data in sample_organisms:
            organism_obj = {
                "id": str(uuid.uuid4()),
                "qr_code_id": str(uuid.uuid4()),
                "name": organism_data["name"],
                "scientific_name": organism_data["scientific_name"],
                "classification": organism_data["classification"],
                "morphology": organism_data["morphology"],
                "physiology": organism_data["physiology"],
                "images": organism_data["images"],
                "description": organism_data["description"],
                "created_at": datetime.now(IST).isoformat(),
                "qr_code_image": None
            }
            
            await organisms_col.insert_one(organism_obj)
            print(f"  ✓ Added: {organism_data['name']}")
        
        # Seed sample blogs
        print("\n[INFO] Seeding sample blogs...")
        await blogs_col.delete_many({})
        
        sample_blogs = [
            {
                "id": str(uuid.uuid4()),
                "title": "The Incredible Migration of Monarch Butterflies",
                "subject": "Monarch Butterfly Migration",
                "content": """<h2>Understanding Nature's Greatest Journey</h2>
<p>The annual migration of monarch butterflies is one of the most remarkable phenomena in the natural world. Each year, millions of monarchs travel thousands of miles from Canada and the northern United States to central Mexico, a journey that no individual butterfly completes in both directions.</p>

<h3>The Science Behind Navigation</h3>
<p>Scientists have long puzzled over how monarchs navigate this incredible distance. Research suggests they use a combination of:</p>
<ul>
<li><strong>Solar compass:</strong> Using the position of the sun to determine direction</li>
<li><strong>Geomagnetic field:</strong> The Earth's magnetic field for navigation</li>
<li><strong>Celestial cues:</strong> Stars and other astronomical markers</li>
</ul>

<h3>Multi-Generational Journey</h3>
<p>Interestingly, the migration takes multiple generations. Spring monarchs fly north and lay eggs, and their offspring continue the journey. Only the fall generation, called the "super-generation," completes the full migration south due to their extended lifespan.</p>

<h3>Conservation Challenges</h3>
<p>Monarch populations face threats from habitat loss, pesticides, and climate change. Conservation efforts focus on protecting milkweed—the only plant monarch caterpillars eat—and creating migration corridors through the United States and Mexico.</p>""",
                "author": "BioMuseum Team",
                "image_url": "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800",
                "visibility": "public",
                "is_ai_generated": False,
                "likes": 42,
                "views": 156,
                "created_at": datetime.now(IST).isoformat(),
                "updated_at": datetime.now(IST).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "African Elephants: Architects of the Savanna",
                "subject": "African Elephants and Ecosystem Engineering",
                "content": """<h2>More Than Just Large Animals</h2>
<p>African elephants are far more than impressive megafauna—they are "ecosystem engineers" whose actions shape the landscape and create habitats for countless other species.</p>

<h3>How Elephants Engineer Their Environment</h3>
<p>When elephants forage, they knock down trees and strip bark, creating open grasslands. This process:</p>
<ul>
<li>Creates grazing opportunities for herbivores</li>
<li>Allows sunlight to reach the forest floor</li>
<li>Creates water holes when they dig for water during droughts</li>
<li>Disperses seeds through their dung across vast distances</li>
</ul>

<h3>Social Intelligence</h3>
<p>Elephants are highly intelligent, socially complex animals with strong family bonds. They mourn their dead, use tools, and have been observed helping injured herd members. Their long lifespan allows knowledge transfer across generations.</p>

<h3>Conservation Status</h3>
<p>Despite their importance, African elephants face declining populations due to poaching and habitat loss. International efforts are underway to protect these magnificent creatures and ensure their survival for future generations.</p>""",
                "author": "BioMuseum Team",
                "image_url": "https://images.unsplash.com/photo-1564485215077-d4b944b01250?w=800",
                "visibility": "public",
                "is_ai_generated": False,
                "likes": 87,
                "views": 234,
                "created_at": datetime.now(IST).isoformat(),
                "updated_at": datetime.now(IST).isoformat()
            }
        ]
        
        for blog in sample_blogs:
            await blogs_col.insert_one(blog)
            print(f"  ✓ Added blog: {blog['title']}")
        
        # Seed admin credentials
        print("\n[INFO] Seeding admin users...")
        await admins_col.delete_many({})
        
        admin_users = [
            {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "password_hash": hashlib.sha256("adminSBES".encode()).hexdigest(),
                "email": "admin@biomuseum.com",
                "full_name": "Administrator",
                "role": "super_admin",
                "is_active": True,
                "created_at": datetime.now(IST).isoformat(),
                "last_login": None,
                "notes": "Default admin user - username: admin, password: adminSBES"
            }
        ]
        
        for admin in admin_users:
            await admins_col.insert_one(admin)
            print(f"  ✓ Added admin: {admin['username']} ({admin['email']})")
        
        # Seed default site settings
        print("\n[INFO] Seeding site settings...")
        await site_settings_col.delete_many({})
        
        default_settings = {
            "id": "site_settings",
            "website_name": "BioMuseum",
            "initiative_text": "An Initiative by",
            "college_name": "SBES College of Science",
            "department_name": "Zoology Department",
            "logo_url": None,
            "primary_color": "#7c3aed",
            "secondary_color": "#3b82f6",
            "font_url": "",
            "font_family": "Poppins",
            "created_at": datetime.now(IST).isoformat(),
            "updated_at": datetime.now(IST).isoformat()
        }
        
        await site_settings_col.insert_one(default_settings)
        print("  ✓ Default site settings added")
        
        print("\n[INFO] Authorized admin emails from environment:")
        authorized_emails_str = os.environ.get('AUTHORIZED_ADMIN_EMAILS', '')
        if authorized_emails_str:
            emails = [e.strip() for e in authorized_emails_str.split(',')]
            for email in emails:
                print(f"  ✓ {email}")
        else:
            print("  (none configured)")
        
        print("\n[OK] ✓ Database seeding completed successfully!")
        print(f"\n✅ Database '{db_name}' is ready with:")
        print(f"  ✓ 10 collections initialized (added 'site_settings' collection)")
        print(f"  ✓ Database indexes created")
        print(f"  ✓ {len(sample_organisms)} sample organisms added")
        print(f"  ✓ {len(sample_blogs)} sample blogs added")
        print(f"  ✓ {len(admin_users)} admin user(s) added")
        print("\n📋 ADMIN LOGIN CREDENTIALS:")
        print("  Username: admin")
        print("  Password: adminSBES")
        print("\n🔐 DO NOT share these credentials!")
        print("="*80 + "\n")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Failed to seed database: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(seed_database())
    exit(0 if success else 1)