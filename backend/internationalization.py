"""
Multi-Language Support System
Provides translations for UI and organism descriptions
"""

from typing import Dict, Optional

class Translator:
    """Handle translations across the platform"""
    
    # Supported languages
    SUPPORTED_LANGUAGES = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "hi": "Hindi",
        "pt": "Portuguese",
        "ja": "Japanese",
        "zh": "Chinese"
    }
    
    # UI translations
    UI_TRANSLATIONS = {
        "en": {
            "suggest_organism": "Suggest Organism",
            "suggest_video": "Suggest Video",
            "search": "Search",
            "filters": "Filters",
            "kingdom": "Kingdom",
            "phylum": "Phylum",
            "class": "Class",
            "species": "Species",
            "scientific_name": "Scientific Name",
            "description": "Description",
            "images": "Images",
            "videos": "Videos",
            "comments": "Comments",
            "endangered": "Endangered",
            "habitat": "Habitat",
            "admin_panel": "Admin Panel",
            "leaderboard": "Leaderboard",
            "my_submissions": "My Submissions",
            "dashboard": "Dashboard",
            "logout": "Logout",
            "submit": "Submit",
            "cancel": "Cancel",
            "delete": "Delete",
            "edit": "Edit",
            "save": "Save",
            "search_organisms": "Search organisms...",
            "no_results": "No results found",
            "loading": "Loading...",
            "error": "An error occurred",
            "success": "Success!"
        },
        "es": {
            "suggest_organism": "Sugerir Organismo",
            "suggest_video": "Sugerir Video",
            "search": "Buscar",
            "filters": "Filtros",
            "kingdom": "Reino",
            "phylum": "Filo",
            "class": "Clase",
            "species": "Especie",
            "scientific_name": "Nombre Científico",
            "description": "Descripción",
            "images": "Imágenes",
            "videos": "Videos",
            "comments": "Comentarios",
            "endangered": "En Peligro",
            "habitat": "Hábitat",
            "admin_panel": "Panel de Administración",
            "leaderboard": "Clasificación",
            "my_submissions": "Mis Sugerencias",
            "dashboard": "Panel",
            "logout": "Cerrar Sesión",
            "submit": "Enviar",
            "cancel": "Cancelar",
            "delete": "Eliminar",
            "edit": "Editar",
            "save": "Guardar",
            "search_organisms": "Buscar organismos...",
            "no_results": "No se encontraron resultados",
            "loading": "Cargando...",
            "error": "Ocurrió un error",
            "success": "¡Éxito!"
        },
        "fr": {
            "suggest_organism": "Suggérer un Organisme",
            "suggest_video": "Suggérer une Vidéo",
            "search": "Rechercher",
            "filters": "Filtres",
            "kingdom": "Royaume",
            "phylum": "Embranchement",
            "class": "Classe",
            "species": "Espèce",
            "scientific_name": "Nom Scientifique",
            "description": "Description",
            "images": "Images",
            "videos": "Vidéos",
            "comments": "Commentaires",
            "endangered": "Menacé",
            "habitat": "Habitat",
            "admin_panel": "Panneau d'Administration",
            "leaderboard": "Classement",
            "my_submissions": "Mes Suggestions",
            "dashboard": "Tableau de Bord",
            "logout": "Déconnexion",
            "submit": "Soumettre",
            "cancel": "Annuler",
            "delete": "Supprimer",
            "edit": "Modifier",
            "save": "Enregistrer",
            "search_organisms": "Rechercher des organismes...",
            "no_results": "Aucun résultat trouvé",
            "loading": "Chargement...",
            "error": "Une erreur s'est produite",
            "success": "Succès!"
        },
        "hi": {
            "suggest_organism": "जीव सुझाव दें",
            "suggest_video": "वीडियो सुझाव दें",
            "search": "खोज",
            "filters": "फ़िल्टर",
            "kingdom": "राज्य",
            "phylum": "संघ",
            "class": "वर्ग",
            "species": "प्रजाति",
            "scientific_name": "वैज्ञानिक नाम",
            "description": "विवरण",
            "images": "चित्र",
            "videos": "वीडियो",
            "comments": "टिप्पणियाँ",
            "endangered": "संकटग्रस्त",
            "habitat": "आवास",
            "admin_panel": "व्यवस्थापक पैनल",
            "leaderboard": "लीडरबोर्ड",
            "my_submissions": "मेरे सुझाव",
            "dashboard": "डैशबोर्ड",
            "logout": "लॉग आउट",
            "submit": "जमा करें",
            "cancel": "रद्द करें",
            "delete": "हटाएं",
            "edit": "संपादित करें",
            "save": "सहेजें",
            "search_organisms": "जीव खोजें...",
            "no_results": "कोई परिणाम नहीं मिला",
            "loading": "लोड हो रहा है...",
            "error": "एक त्रुटि हुई",
            "success": "सफल!"
        }
    }
    
    @staticmethod
    def get_supported_languages() -> Dict[str, str]:
        """Get list of supported languages"""
        return Translator.SUPPORTED_LANGUAGES
    
    @staticmethod
    def translate_ui(key: str, language: str = "en") -> str:
        """Translate UI text"""
        if language not in Translator.UI_TRANSLATIONS:
            language = "en"
        
        return Translator.UI_TRANSLATIONS[language].get(key, key)
    
    @staticmethod
    def translate_text(text: str, target_language: str = "en") -> str:
        """
        Translate organism descriptions and content
        Uses external API (Google Translate, etc.)
        """
        if target_language == "en":
            return text
        
        # In production, use Google Translate API or similar
        # For now, return original text
        return text
    
    @staticmethod
    def get_language_preference(user_id: str, default: str = "en") -> str:
        """Get user's language preference from database/cache"""
        # This would typically fetch from database
        return default
    
    @staticmethod
    def set_language_preference(user_id: str, language: str) -> bool:
        """Set user's language preference"""
        if language in Translator.SUPPORTED_LANGUAGES:
            # Save to database/cache
            return True
        return False
    
    @staticmethod
    def get_localized_organism(organism: Dict, language: str = "en") -> Dict:
        """Get organism with localized description"""
        if language == "en":
            return organism
        
        localized = organism.copy()
        
        # Translate description if exists
        if 'description' in localized:
            localized['description'] = Translator.translate_text(
                localized['description'],
                language
            )
        
        return localized
    
    @staticmethod
    def get_ui_bundle(language: str = "en") -> Dict:
        """Get complete UI translation bundle for frontend"""
        if language not in Translator.UI_TRANSLATIONS:
            language = "en"
        
        return {
            "language": language,
            "translations": Translator.UI_TRANSLATIONS[language],
            "supported_languages": Translator.SUPPORTED_LANGUAGES
        }
