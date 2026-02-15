// AI Service for generating organism data
import axios from 'axios';

// Local organism database for offline generation (No API key required!)
const LOCAL_ORGANISMS_DB = {
  'lion': {
    name: 'Lion',
    scientific_name: 'Panthera leo',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Carnivora',
    family: 'Felidae',
    genus: 'Panthera',
    species: 'P. leo',
    morphology: 'Large muscular cat with golden-tan coat. Males have distinctive mane around head and neck. Height 1.2m at shoulder, weight 150-250kg. Powerful build with sharp claws and teeth.',
    physiology: 'Carnivorous apex predator. Hunts large prey like zebras and wildebeest. Lives in prides of 5-30 individuals. Females do most hunting. Gestation 110 days, cubs born in groups of 2-4.',
    description: 'Found in African savannas and grasslands, with small population in Gir Forest, India. Listed as Vulnerable due to habitat loss and hunting. Social structure unique among cats.'
  },
  'elephant': {
    name: 'Elephant',
    scientific_name: 'Loxodonta africana',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Proboscidea',
    family: 'Elephantidae',
    genus: 'Loxodonta',
    species: 'L. africana',
    morphology: 'Largest land animal with gray wrinkled skin. Height up to 4m, weight 4,000-7,000kg. Long trunk with 40,000 muscles. Large ears, tusks (elongated incisor teeth). Columnar legs support massive body.',
    physiology: 'Herbivorous, consuming up to 300kg vegetation daily. Highly intelligent with complex social behavior. Females live in family groups led by matriarch. Gestation period 22 months, longest of any land mammal.',
    description: 'Native to African savannas, forests and grasslands. Listed as Vulnerable. Plays crucial role in ecosystem engineering by creating water holes and dispersing seeds through dung.'
  },
  'tiger': {
    name: 'Tiger',
    scientific_name: 'Panthera tigris',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Carnivora',
    family: 'Felidae',
    genus: 'Panthera',
    species: 'P. tigris',
    morphology: 'Largest cat with orange coat and black stripes. Length up to 3.3m, weight 100-300kg. White spots on back of ears. Sharp claws and canine teeth for hunting. Solitary hunters with excellent vision.',
    physiology: 'Carnivorous ambush predator. Hunts deer, wild boar and other large prey. Excellent swimmers unlike most cats. Breeding occurs year-round. Cubs stay with mother 2-3 years before independence.',
    description: 'Found in forests and grasslands of Asia (Russia, India, Southeast Asia). Critically Endangered with only 3,900 remaining in wild. Major threats include poaching and habitat loss.'
  },
  'zebra': {
    name: 'Zebra',
    scientific_name: 'Equus quagga',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Perissodactyla',
    family: 'Equidae',
    genus: 'Equus',
    species: 'E. quagga',
    morphology: 'Horse-like animal with distinctive black and white stripes covering entire body. Height 1.3m, weight 300kg. Each individual has unique stripe pattern. Hoofed ungulate with flowing mane.',
    physiology: 'Herbivorous grazer feeding on grasses. Lives in herds for protection from predators. Excellent runners reaching speeds up to 65km/h. Gestation 12-13 months, foals born with brown and white coloring.',
    description: 'Native to African savannas and grasslands. Migration patterns create spectacular wildlife scenes. Stripes possibly serve thermoregulation and predator confusion. Listed as Least Concern.'
  },
  'giraffe': {
    name: 'Giraffe',
    scientific_name: 'Giraffa camelopardalis',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Mammalia',
    order: 'Artiodactyla',
    family: 'Giraffidae',
    genus: 'Giraffa',
    species: 'G. camelopardalis',
    morphology: 'Tallest land animal reaching 5-6m height. Long neck (1.8m) with elongated legs. Tan coat with brown blotches. Ossicones (horn-like protrusions) on head. Weighs 800-1400kg with long prehensile tongue.',
    physiology: 'Herbivorous browser feeding on tree leaves, particularly acacia. Long tongue (45cm) reaches high foliage. Complex cardiovascular system to pump blood up long neck. Gestation 15 months, calves born 2m tall.',
    description: 'Native to African savannas from Sahara to South Africa. Social animals living in loose herds. Listed as Vulnerable due to habitat fragmentation and poaching. Play important role in seed dispersal.'
  }
};

// Unsplash API - For high quality animal photos
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const UNSPLASH_ACCESS_KEY = process.env.REACT_APP_UNSPLASH_ACCESS_KEY || 'YOUR_UNSPLASH_ACCESS_KEY';

// Generate organism data using local database (No API key needed!)
export const generateOrganismData = async (animalName) => {
  try {
    const normalizedName = animalName.toLowerCase().trim();
    
    // Check if animal exists in local database
    if (LOCAL_ORGANISMS_DB[normalizedName]) {
      const data = LOCAL_ORGANISMS_DB[normalizedName];
      return {
        success: true,
        data: data,
        source: 'local',
        message: `Data loaded for ${animalName} (No API key required!)`
      };
    }

    // For animals not in database, return a template
    return {
      success: true,
      data: {
        name: animalName,
        scientific_name: 'Scientific name not available',
        kingdom: 'Animalia',
        phylum: 'Chordata',
        class: 'Mammalia',
        order: 'Not specified',
        family: 'Not specified',
        genus: 'Not specified',
        species: 'Not specified',
        morphology: 'Physical characteristics not available. Please provide more details.',
        physiology: 'Biological functions not available. Please provide more details.',
        description: 'Information not available. Please add details manually.'
      },
      source: 'template',
      message: `Template created for ${animalName}. Please fill in details manually.`
    };

  } catch (error) {
    console.error('Error generating organism data:', error);
    return {
      success: false,
      error: 'Failed to generate data: ' + error.message
    };
  }
};

// Fetch images from Unsplash
export const fetchOrganismImages = async (animalName) => {
  try {
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
      return {
        success: false,
        images: [],
        message: 'Unsplash API key not configured. Add REACT_APP_UNSPLASH_ACCESS_KEY to .env.local'
      };
    }

    const query = `${animalName} animal wildlife`;
    
    const response = await axios.get(
      UNSPLASH_API_URL,
      {
        params: {
          query: query,
          per_page: 8,
          orientation: 'portrait'
        },
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        },
        timeout: 8000
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      return {
        success: true,
        images: response.data.results.map(photo => ({
          url: photo.urls.regular,
          alt: photo.alt_description || animalName,
          photographer: photo.user.name,
          attribution: `Photo by ${photo.user.name}`,
          download_url: photo.links.download
        })),
        message: `Found ${response.data.results.length} images for ${animalName}`
      };
    }

    return {
      success: false,
      images: [],
      message: `No images found for "${animalName}". Please upload images manually.`
    };

  } catch (error) {
    console.error('Error fetching images from Unsplash:', error);
    return {
      success: false,
      images: [],
      message: 'Could not fetch images from Unsplash. Please check your API key and internet connection.',
      error: error.message
    };
  }
};

export default {
  generateOrganismData,
  fetchOrganismImages
};
