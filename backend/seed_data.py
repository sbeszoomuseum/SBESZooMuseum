import asyncio
import base64
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    },
    {
        "name": "Giant Sequoia",
        "scientific_name": "Sequoiadendron giganteum",
        "classification": {
            "kingdom": "Plantae",
            "phylum": "Pinophyta",
            "class": "Pinopsida",
            "order": "Pinales",
            "family": "Cupressaceae",
            "genus": "Sequoiadendron",
            "species": "S. giganteum"
        },
        "morphology": "Massive evergreen coniferous trees that can reach heights of 50-85 meters and diameters of 6-8 meters. The bark is fibrous, thick (30-60 cm), and cinnamon-red in color. Leaves are scale-like and arranged spirally on the branches.",
        "physiology": "Extremely long-lived trees, some specimens are over 3,000 years old. They have a shallow root system that spreads widely but doesn't go deep. Reproduction occurs through small cones, and they can also reproduce vegetatively through root sprouting.",
        "images": [],
        "description": "Giant Sequoias are among the largest trees in the world by volume. They are found naturally only in the western slopes of the Sierra Nevada mountain range in California. These ancient trees have survived ice ages and are considered living monuments."
    },
    {
        "name": "Great White Shark",
        "scientific_name": "Carcharodon carcharias",
        "classification": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Chondrichthyes",
            "order": "Lamniformes",
            "family": "Lamnidae",
            "genus": "Carcharodon",
            "species": "C. carcharias"
        },
        "morphology": "Large predatory sharks with a torpedo-shaped body, conical snout, and triangular serrated teeth. Can reach lengths of 4-6 meters and weights of 1,500-2,400 kg. Counter-shaded with dark gray upper body and white underside for camouflage.",
        "physiology": "Cartilaginous skeleton, multiple rows of teeth that are continuously replaced, and excellent sensory systems including electroreception and lateral line system. They are warm-blooded (regional endothermy) which gives them an advantage in cold waters.",
        "images": [],
        "description": "Great White Sharks are apex predators found in coastal and offshore waters worldwide. They play a crucial role in maintaining marine ecosystem balance. Despite their fearsome reputation, they are vulnerable to overfishing and are protected in many regions."
    }
]

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Clear existing organisms
    await db.organisms.delete_many({})
    print("Cleared existing organisms")
    
    # Add sample organisms
    for organism_data in sample_organisms:
        # Import the Organism model functionality
        import sys
        sys.path.append('/app/backend')
        from server import Organism, generate_qr_code
        
        # Create organism object with UUID and QR code
        organism_obj = Organism(**organism_data)
        organism_obj.qr_code_image = generate_qr_code(organism_obj.id)
        
        # Insert into database
        await db.organisms.insert_one(organism_obj.dict())
        print(f"Added organism: {organism_data['name']}")
    
    print(f"Successfully seeded {len(sample_organisms)} organisms")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())