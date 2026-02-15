"""
Advanced Search and Filtering System
Enables users to find organisms using multiple criteria
"""

from typing import List, Optional, Dict
from datetime import datetime
import pytz
import uuid

# IST Timezone Configuration
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    """Get current time in IST (Indian Standard Time) UTC+5:30"""
    return datetime.now(IST).isoformat()

class OrganismFilter:
    """Advanced filtering for organisms"""
    
    @staticmethod
    def build_filter_query(
        search_term: Optional[str] = None,
        kingdom: Optional[str] = None,
        phylum: Optional[str] = None,
        organism_class: Optional[str] = None,
        species: Optional[str] = None,
        endangered: Optional[bool] = None,
        has_images: Optional[bool] = True,
        has_video: Optional[bool] = None,
        min_size: Optional[float] = None,
        max_size: Optional[float] = None,
        habitat: Optional[str] = None
    ) -> Dict:
        """Build MongoDB query from filters"""
        
        query = {}
        
        # Text search
        if search_term and search_term.strip():
            query["$or"] = [
                {"organism_name": {"$regex": search_term, "$options": "i"}},
                {"scientific_name": {"$regex": search_term, "$options": "i"}},
                {"description": {"$regex": search_term, "$options": "i"}}
            ]
        
        # Taxonomy filters
        if kingdom:
            query["kingdom"] = {"$regex": f"^{kingdom}$", "$options": "i"}
        if phylum:
            query["phylum"] = {"$regex": f"^{phylum}$", "$options": "i"}
        if organism_class:
            query["class"] = {"$regex": f"^{organism_class}$", "$options": "i"}
        if species:
            query["species"] = {"$regex": f"^{species}$", "$options": "i"}
        
        # Conservation status
        if endangered is not None:
            query["endangered_status"] = "endangered" if endangered else {"$ne": "endangered"}
        
        # Media filters
        if has_images:
            query["images"] = {"$exists": True, "$ne": []}
        if has_video is not None:
            if has_video:
                query["video_url"] = {"$exists": True, "$ne": ""}
            else:
                query["video_url"] = {"$in": [None, ""]}
        
        # Size range
        if min_size is not None or max_size is not None:
            size_query = {}
            if min_size is not None:
                size_query["$gte"] = min_size
            if max_size is not None:
                size_query["$lte"] = max_size
            if size_query:
                query["size_range"] = size_query
        
        # Habitat
        if habitat:
            query["habitat"] = {"$regex": habitat, "$options": "i"}
        
        return query
    
    @staticmethod
    def get_search_suggestions(search_term: str, organisms: List[Dict]) -> List[str]:
        """Get autocomplete suggestions"""
        suggestions = set()
        term_lower = search_term.lower()
        
        for organism in organisms:
            name = organism.get('organism_name', '')
            sci_name = organism.get('scientific_name', '')
            
            if name.lower().startswith(term_lower):
                suggestions.add(name)
            if sci_name.lower().startswith(term_lower):
                suggestions.add(sci_name)
        
        return sorted(list(suggestions))[:10]


class SearchHistory:
    """Track user search history"""
    
    @staticmethod
    def create_search_entry(
        user_identifier: str,
        search_term: str,
        filters_used: Dict,
        results_count: int
    ) -> Dict:
        """Create search history entry"""
        return {
            "id": str(uuid.uuid4()),
            "user_identifier": user_identifier,
            "search_term": search_term,
            "filters_used": filters_used,
            "results_count": results_count,
            "timestamp": get_ist_now(),
            "created_at": get_ist_now()
        }
    
    @staticmethod
    def get_trending_searches(searches: List[Dict], limit: int = 10) -> List[Dict]:
        """Get trending search terms"""
        from collections import Counter
        
        search_terms = [s.get('search_term', '') for s in searches if s.get('search_term')]
        trending = Counter(search_terms).most_common(limit)
        
        return [
            {
                "search_term": term,
                "count": count,
                "percentage": (count / len(search_terms) * 100) if search_terms else 0
            }
            for term, count in trending
        ]
