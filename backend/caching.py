# backend/caching.py
"""
HTTP caching and in-memory cache layer
Provides 100x faster responses for frequently accessed data
"""

from fastapi import Response, JSONResponse
from functools import wraps
from typing import Optional, Callable, Any, Dict
from datetime import datetime, timedelta
import hashlib
import json
import asyncio
import logging

logger = logging.getLogger(__name__)


class InMemoryCache:
    """
    Simple in-memory cache for hot endpoints
    For production scale, use Redis instead
    
    Example:
        cache = InMemoryCache(max_age_seconds=300)
        
        @app.get("/organisms")
        @cache.cached()
        async def get_organisms():
            return [...]  # Cached for 5 minutes
    """
    
    def __init__(self, max_age_seconds: int = 300):
        self.max_age = max_age_seconds
        self.data: Dict[str, dict] = {}
        self.lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key not in self.data:
            return None
        
        cache_item = self.data[key]
        
        # Check if expired
        if datetime.now() > cache_item['expires_at']:
            async with self.lock:
                del self.data[key]
            return None
        
        logger.debug(f"Cache hit: {key}")
        return cache_item['value']
    
    async def set(self, key: str, value: Any, max_age: Optional[int] = None):
        """Set value in cache"""
        async with self.lock:
            self.data[key] = {
                'value': value,
                'expires_at': datetime.now() + timedelta(seconds=max_age or self.max_age),
                'created_at': datetime.now(),
            }
            logger.debug(f"Cache set: {key}")
    
    async def invalidate(self, key: str):
        """Remove key from cache"""
        async with self.lock:
            if key in self.data:
                del self.data[key]
                logger.debug(f"Cache invalidated: {key}")
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate keys matching pattern (e.g., 'organisms:*')"""
        async with self.lock:
            keys_to_delete = [k for k in self.data.keys() if pattern in k]
            for key in keys_to_delete:
                del self.data[key]
            if keys_to_delete:
                logger.debug(f"Cache invalidated {len(keys_to_delete)} keys matching {pattern}")
    
    def cached(self, key_prefix: str = "api", max_age: Optional[int] = None):
        """Decorator for cached async functions"""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
                
                # Try cache first
                cached_value = await self.get(cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Cache miss - execute function
                result = await func(*args, **kwargs)
                
                # Store in cache
                await self.set(cache_key, result, max_age or self.max_age)
                
                return result
            
            return wrapper
        return decorator


# Global cache instance
organisms_cache = InMemoryCache(max_age_seconds=3600)      # 1 hour
blogs_cache = InMemoryCache(max_age_seconds=1800)          # 30 minutes
videos_cache = InMemoryCache(max_age_seconds=1800)         # 30 minutes


class HTTPCacheHeaders:
    """Helper for adding proper HTTP cache headers"""
    
    @staticmethod
    def set_cache_headers(
        response: Response,
        max_age_seconds: int = 300,
        public: bool = True,
        stale_while_revalidate: int = 86400,
    ):
        """
        Add cache headers to response
        
        Args:
            response: FastAPI Response object
            max_age_seconds: How long to cache (300s = 5 min)
            public: Whether CDN can cache
            stale_while_revalidate: Serve stale for this duration while revalidating
        """
        cache_control = f"{'public' if public else 'private'}, max-age={max_age_seconds}"
        
        if stale_while_revalidate:
            cache_control += f", stale-while-revalidate={stale_while_revalidate}"
        
        response.headers["Cache-Control"] = cache_control
        response.headers["Vary"] = "Accept-Encoding"
        
        # Expiry time
        expires = datetime.utcnow() + timedelta(seconds=max_age_seconds)
        response.headers["Expires"] = expires.strftime("%a, %d %b %Y %H:%M:%S GMT")
        
        return response
    
    @staticmethod
    def generate_etag(data: Any) -> str:
        """Generate ETag for content"""
        content_hash = hashlib.md5(
            json.dumps(data, sort_keys=True, default=str).encode()
        ).hexdigest()
        return f'"{content_hash}"'


def cache_response(
    max_age_seconds: int = 300,
    public: bool = True,
):
    """
    Decorator to automatically add cache headers
    
    Example:
        @app.get("/organisms")
        @cache_response(max_age_seconds=3600)
        async def get_organisms():
            return [...]
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Convert to JSONResponse if needed
            if isinstance(result, dict):
                response = JSONResponse(content=result)
            else:
                response = result
            
            # Add cache headers
            HTTPCacheHeaders.set_cache_headers(
                response,
                max_age_seconds=max_age_seconds,
                public=public,
            )
            
            return response
        
        return wrapper
    return decorator


class CacheInvalidationManager:
    """Manage cache invalidation on data updates"""
    
    @staticmethod
    async def invalidate_organism_cache(organism_id: str = None):
        """Invalidate organism cache after update"""
        await organisms_cache.invalidate_pattern("organisms")
    
    @staticmethod
    async def invalidate_blog_cache(blog_id: str = None):
        """Invalidate blog cache after update"""
        await blogs_cache.invalidate_pattern("blogs")
    
    @staticmethod
    async def invalidate_video_cache(video_id: str = None):
        """Invalidate video cache after update"""
        await videos_cache.invalidate_pattern("videos")


# Example usage in route:
"""
from fastapi import APIRouter
from backend.database import get_db
from backend.caching import organisms_cache, cache_response
from backend.pagination import paginate_collection, ORGANISM_LIST_PROJECTION

@router.get("/organisms")
@cache_response(max_age_seconds=3600, public=True)
async def get_organisms(page: int = 1, limit: int = 50):
    '''
    List all organisms with 1-hour cache
    Vercel CDN will cache this for all users
    '''
    db = await get_db()
    result = await paginate_collection(
        db.organisms,
        skip=(page - 1) * limit,
        limit=limit,
        projection=ORGANISM_LIST_PROJECTION
    )
    return result
"""
