# Production Architecture: BioMuseum SaaS Transformation

**Target**: Sub-5-second first load, reliable at 1000+ concurrent users, production-grade SaaS

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS (Browser)                          │
└────────┬────────────────────────────────────────────────────────┘
         │ (Progressive Loading + Skeleton UI)
         │ (Exponential Backoff + Offline Fallback)
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL CDN (Frontend)                                          │
│  - Static assets cached (images, JS, CSS)                       │
│  - Stale-while-revalidate for API responses                     │
│  - Geographic distribution (edge caching)                       │
└────────┬────────────────────────────────────────────────────────┘
         │ (HTTP requests with retry logic)
         ↓
┌─────────────────────────────────────────────────────────────────┐
│               API LOAD BALANCER (Future)                        │
│  - Round-robin to multiple Render instances                    │
│  - Health check every 5 seconds                                │
│  - Automatic fail-over                                         │
└────────┬────────────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌─────────┐
│ API #1  │ │ API #2  │ (Scalable: Add more instances)
│ Primary │ │ Standby │
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           ↓
    ┌─────────────────────────────────────┐
    │  In-Memory Cache (Redis Optional)   │
    │  - Hot endpoints (organisms, blogs) │
    │  - Session cache (JWT validation)   │
    │  - Rate limit buckets               │
    └────────┬────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │  Connection Pool (Persistent)       │
    │  - 50-100 MongoDB connections       │
    │  - 0-timeout idle timeout           │
    │  - Health checks every 30s          │
    └────────┬────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │  MongoDB Atlas (Cluster)            │
    │  - Read replicas for distribution   │
    │  - Automatic backups                │
    │  - Connection pooling service       │
    └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Background Worker Queue (BullMQ over Redis)                    │
│  - Heavy operations (image processing, email, AI)               │
│  - Decoupled from API response path                             │
│  - Auto-retry on failure                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Scheduled Jobs (Cron Service)                                  │
│  - Health check warm-up every 14 minutes                        │
│  - Database cleanup hourly                                      │
│  - Cache invalidation on schedule                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Monitoring & Observability                                     │
│  - Structured logging (JSON to stdout)                          │
│  - Error tracking (Sentry)                                      │
│  - Performance tracing (OpenTelemetry)                          │
│  - Uptime monitoring (Uptime Robot)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Cold-Start Mitigation

### 1.1 Health-Check Warm-Up Strategy

**Goal**: Prevent app from spinning down; keep connections alive

#### Solution A: Free Cron Service (Preferred)
Use **EasyCron** (free), **cron-job.org** (free), or **GitHub Actions** (free)

```
Every 14 minutes (less than Render's 15-minute spindown threshold):
  GET https://biomuseum.onrender.com/api/health
  → Server stays awake
  → MongoDB connection stays alive
  → Next user: <500ms response time
```

#### Solution B: Scheduled Health Checks (Built-in)
```python
# backend/health_checks.py
import asyncio
import httpx
import os
from datetime import datetime

async def warm_up_backend():
    """Ping backend every 14 minutes to prevent spindown"""
    while True:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                url = os.environ.get('BACKEND_URL', 'http://localhost:8000')
                response = await client.get(f"{url}/api/health")
                print(f"[HEALTH-CHECK] {datetime.now()}: {response.status_code}")
        except Exception as e:
            print(f"[HEALTH-CHECK-ERROR] {e}")
        
        # Wait 14 minutes before next check
        await asyncio.sleep(14 * 60)

# Run in background on startup
asyncio.create_task(warm_up_backend())
```

### 1.2 Lightweight Health Endpoint

```python
# backend/server.py - Priority 1 endpoint

@api_router.get("/health", tags=["System"])
async def health_check():
    """
    Lightweight health check endpoint
    
    Response time: <50ms if MongoDB responding
    Prevents Render spindown if called every 14 minutes
    """
    try:
        # Quick MongoDB ping (< 5ms if healthy)
        await asyncio.wait_for(
            db.admin.command('ping'),
            timeout=5.0  # Strict timeout
        )
        
        return {
            "status": "healthy",
            "timestamp": datetime.now(IST).isoformat(),
            "mongodb": "connected",
            "uptime_seconds": int((datetime.now(IST) - startup_time).total_seconds())
        }
    except asyncio.TimeoutError:
        return {
            "status": "degraded",
            "mongodb": "slow",
            "response_time_ms": 5000
        }, 503
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)[:100]
        }, 503
```

### 1.3 Minimal Boot Path

**Current Boot** (10-15 seconds):
```python
import google.generativeai    # 5s
import dns.resolver           # 2s
import requests              # 1s
# ... 10+ more imports
await init_mongodb()         # 10-120s
```

**Optimized Boot** (<3 seconds):
```python
# Fast imports only
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
# ... minimal core imports

# Defer heavy imports
def lazy_load_genai():
    global genai
    if genai is None:
        import google.generativeai
        genai = google.generativeai
    return genai

# Move MongoDB init to startup event (async, doesn't block responder)
@app.on_event("startup")
async def startup():
    await init_mongodb_background()  # Doesn't block route handlers
```

---

## Phase 2: Connection Pooling & Persistence

### 2.1 Optimized MongoDB Connection

```python
# backend/database.py

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
import os
import asyncio
from datetime import datetime, timedelta
import pytz

IST = pytz.timezone('Asia/Kolkata')

class MongoDBPool:
    _instance = None
    _client = None
    _db = None
    _connected = False
    
    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            cls._instance = MongoDBPool()
            await cls._instance._initialize()
        return cls._instance
    
    async def _initialize(self):
        """Initialize connection pool once at startup"""
        if self._connected:
            return
        
        MONGO_URL = os.environ.get('MONGO_URL')
        if not MONGO_URL:
            raise ValueError("MONGO_URL not set")
        
        # OPTIMIZED CONNECTION PARAMETERS
        self._client = AsyncIOMotorClient(
            MONGO_URL,
            # Connection pooling (CRITICAL)
            maxPoolSize=100,           # Max connections (was 3!)
            minPoolSize=10,            # Persistent baseline connections
            maxIdleTimeMS=600000,      # Keep idle connections for 10 minutes
            
            # Timeouts (balanced between stability and speed)
            serverSelectionTimeoutMS=5000,    # 5s to find server (was 120s)
            connectTimeoutMS=10000,           # 10s to connect (was 120s)
            socketTimeoutMS=30000,            # 30s per operation (was 120s)
            
            # Retry strategy
            retryWrites=True,
            retryReads=True,
            
            # Connection monitoring
            heartbeatFrequencyMS=10000,       # Check health every 10s
            serverMonitoringMode='auto',
            
            # SSL/TLS (Production required)
            ssl=True,
            tlsAllowInvalidCertificates=False,
            tlsAllowInvalidHostnames=False,
            
            # Application metadata
            appName='BioMuseum-SaaS',
            driverName='motor',
        )
        
        # Verify connection with quick test
        try:
            await asyncio.wait_for(
                self._client.admin.command('ping'),
                timeout=10.0
            )
            self._db = self._client['biomuseum']
            self._connected = True
            print("[✓] MongoDB connection pool initialized")
            
            # Create indexes for fast queries (run once)
            await self._create_indexes()
            
        except asyncio.TimeoutError:
            raise RuntimeError("MongoDB connection timeout - check network")
        except Exception as e:
            raise RuntimeError(f"MongoDB initialization failed: {e}")
    
    async def _create_indexes(self):
        """Create indexes for performance"""
        collections = {
            'organisms': [
                ([('name', ASCENDING)], {'unique': True}),
                ([('scientific_name', ASCENDING)], {}),
                ([('created_at', DESCENDING)], {}),
            ],
            'organisms_search': [  # Text search index
                ([('name', 'text'), ('description', 'text')], {}),
            ],
            'blogs': [
                ([('created_at', DESCENDING)], {}),
                ([('slug', ASCENDING)], {'unique': True}),
            ],
            'gmail_users': [
                ([('email', ASCENDING)], {'unique': True}),
                ([('google_id', ASCENDING)], {'unique': True}),
                ([('last_active', DESCENDING)], {}),
            ],
        }
        
        for coll_name, indexes in collections.items():
            try:
                coll = self._db[coll_name]
                for keys, options in indexes:
                    await coll.create_index(keys, **options)
            except Exception as e:
                print(f"[WARN] Could not create index on {coll_name}: {e}")
    
    def get_db(self):
        """Get database instance (non-async)"""
        if not self._connected:
            raise RuntimeError("Database not initialized - use await get_instance() first")
        return self._db
    
    async def close(self):
        """Close connections gracefully"""
        if self._client:
            self._client.close()
            self._connected = False
            print("[✓] MongoDB connections closed")

# Usage in FastAPI:
@app.on_event("startup")
async def startup():
    db_pool = await MongoDBPool.get_instance()

@app.on_event("shutdown")
async def shutdown():
    db_pool = await MongoDBPool.get_instance()
    await db_pool.close()

# In route handlers:
async def get_organisms():
    db_pool = await MongoDBPool.get_instance()
    db = db_pool.get_db()
    organisms = await db.organisms.find().to_list(None)
    return organisms
```

---

## Phase 2: API Pagination & Projection

### 2.2 Smart Pagination Implementation

```python
# backend/pagination.py

from pydantic import BaseModel
from typing import TypeVar, Generic, List, Optional
from pymongo import DESCENDING

T = TypeVar('T')

class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 50  # Max 100
    sort_by: str = 'created_at'
    sort_order: int = -1  # -1 for descending, 1 for ascending
    
    @classmethod
    def validate_limits(cls, v):
        """Prevent abuse"""
        if v > 100:
            v = 100
        if v < 1:
            v = 1
        return v

class PagedResponse(BaseModel, Generic[T]):
    data: List[T]
    page: int
    limit: int
    total: int
    pages: int
    has_next: bool
    has_prev: bool

async def paginate_collection(
    collection,
    filters: dict = None,
    skip: int = 0,
    limit: int = 50,
    sort_fields: List[tuple] = None,
    projection: dict = None
):
    """Reusable pagination helper"""
    
    if filters is None:
        filters = {}
    
    # Count total (cached if possible)
    total = await collection.count_documents(filters)
    
    # Execute query with projection + pagination
    cursor = collection.find(
        filters,
        projection=projection
    )
    
    # Apply sorting
    if sort_fields:
        cursor = cursor.sort(sort_fields)
    
    # Apply pagination
    cursor = cursor.skip(skip).limit(limit)
    
    data = await cursor.to_list(None)
    
    pages = (total + limit - 1) // limit
    current_page = (skip // limit) + 1
    
    return {
        "data": data,
        "page": current_page,
        "limit": limit,
        "total": total,
        "pages": pages,
        "has_next": current_page < pages,
        "has_prev": current_page > 1,
    }

# Usage in routes:
@api_router.get("/organisms", response_model=dict)
async def get_organisms_paginated(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    sort_by: str = Query('created_at'),
):
    db = (await MongoDBPool.get_instance()).get_db()
    
    skip = (page - 1) * limit
    
    # Only fetch needed fields (75% less bandwidth)
    projection = {
        "_id": 0,
        "id": 1,
        "name": 1,
        "scientific_name": 1,
        "description": 1,
        "images": {"$slice": 1},  # Only first image
        "created_at": 1,
    }
    
    result = await paginate_collection(
        db.organisms,
        skip=skip,
        limit=limit,
        sort_fields=[(sort_by, -1)],
        projection=projection
    )
    
    return result
```

### 2.3 HTTP Caching Headers

```python
# backend/caching.py

from fastapi.responses import JSONResponse
from datetime import datetime, timedelta

def cache_response(max_age_seconds: int = 300, public: bool = True):
    """
    Decorator for HTTP caching
    
    Example:
        @api_router.get("/organisms")
        @cache_response(max_age_seconds=3600)  # 1 hour
        async def get_organisms():
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Add cache headers
            response = JSONResponse(content=result)
            response.headers["Cache-Control"] = (
                f"public, max-age={max_age_seconds}, "
                "stale-while-revalidate=86400"
            )
            response.headers["ETag"] = f'"{hash(str(result))}"'
            response.headers["Vary"] = "Accept-Encoding"
            
            # Expiry time
            expires = datetime.utcnow() + timedelta(seconds=max_age_seconds)
            response.headers["Expires"] = expires.strftime("%a, %d %b %Y %H:%M:%S GMT")
            
            return response
        
        return wrapper
    return decorator

# Enable gzip compression
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

---

## Phase 3: High-Concurrency Design

### 3.1 Rate Limiting & Queue System

```python
# backend/rate_limiter.py

from datetime import datetime, timedelta
from typing import Dict, Optional
import asyncio
import redis.asyncio as redis

class RateLimiter:
    def __init__(self, redis_url: str = None):
        self.redis = None
        self.redis_url = redis_url or os.environ.get('REDIS_URL')
        self.local_buckets: Dict[str, list] = {}  # Fallback if Redis unavailable
    
    async def initialize(self):
        """Connect to Redis if available"""
        if self.redis_url:
            try:
                self.redis = await redis.from_url(self.redis_url)
                await self.redis.ping()
                print("[✓] Redis connected for rate limiting")
            except Exception as e:
                print(f"[WARN] Redis unavailable, using local rate limiting: {e}")
                self.redis = None
    
    async def check_rate_limit(
        self,
        key: str,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000
    ) -> tuple[bool, Optional[float]]:
        """
        Check if request is within rate limit
        
        Returns: (allowed: bool, retry_after_seconds: Optional[float])
        """
        if self.redis:
            return await self._check_redis(key, requests_per_minute, requests_per_hour)
        else:
            return await self._check_local(key, requests_per_minute, requests_per_hour)
    
    async def _check_redis(self, key: str, rpm: int, rph: int) -> tuple[bool, Optional[float]]:
        """Redis-backed rate limiting"""
        minute_key = f"rl:min:{key}:{datetime.now().strftime('%Y%m%d%H%M')}"
        hour_key = f"rl:hour:{key}:{datetime.now().strftime('%Y%m%d%H')}"
        
        minute_count = await self.redis.incr(minute_key)
        hour_count = await self.redis.incr(hour_key)
        
        # Set expiry
        await self.redis.expire(minute_key, 60)
        await self.redis.expire(hour_key, 3600)
        
        if minute_count > rpm:
            retry_after = 60 - (datetime.now().second)
            return False, float(retry_after)
        
        if hour_count > rph:
            retry_after = 3600 - (datetime.now().minute * 60 + datetime.now().second)
            return False, float(retry_after)
        
        return True, None
    
    async def _check_local(self, key: str, rpm: int, rph: int) -> tuple[bool, Optional[float]]:
        """Local in-memory rate limiting"""
        now = datetime.now()
        
        if key not in self.local_buckets:
            self.local_buckets[key] = []
        
        # Clean old entries
        self.local_buckets[key] = [
            ts for ts in self.local_buckets[key]
            if (now - ts).total_seconds() < 3600
        ]
        
        # Check minute limit
        recent_minute = [
            ts for ts in self.local_buckets[key]
            if (now - ts).total_seconds() < 60
        ]
        
        if len(recent_minute) >= rpm:
            retry_after = 60 - (now - recent_minute[0]).total_seconds()
            return False, max(0, retry_after)
        
        # Check hour limit
        if len(self.local_buckets[key]) >= rph:
            return False, 3600.0
        
        # Record this request
        self.local_buckets[key].append(now)
        return True, None

# Global instance
rate_limiter = RateLimiter()

@app.on_event("startup")
async def startup():
    await rate_limiter.initialize()

# Dependency: Check rate limit before processing
async def check_user_rate_limit(request: Request):
    """Rate limit by IP or user ID"""
    client_ip = request.client.host
    allowed, retry_after = await rate_limiter.check_rate_limit(
        f"ip:{client_ip}",
        requests_per_minute=100,
        requests_per_hour=5000
    )
    
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Retry after {int(retry_after)} seconds",
            headers={"Retry-After": str(int(retry_after))}
        )
    
    return True

# Use in routes:
@api_router.get("/organisms")
async def get_organisms(_: bool = Depends(check_user_rate_limit)):
    # Route implementation
    pass
```

### 3.2 Queue System for Heavy Operations

```python
# backend/queue_system.py

from typing import Callable, Any, Dict
import asyncio
import json
from datetime import datetime
import uuid

class TaskQueue:
    """
    Simple in-memory task queue (no external dependency)
    For production, use BullMQ over Redis
    """
    
    def __init__(self, max_workers: int = 5):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.max_workers = max_workers
        self.tasks: Dict[str, dict] = {}
        self.workers_running = False
    
    async def start_workers(self):
        """Start background workers"""
        if self.workers_running:
            return
        
        self.workers_running = True
        for i in range(self.max_workers):
            asyncio.create_task(self._worker(i))
        print(f"[✓] Task queue started with {self.max_workers} workers")
    
    async def _worker(self, worker_id: int):
        """Background worker processing tasks"""
        while self.workers_running:
            try:
                task = await asyncio.wait_for(self.queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            
            task_id = task['id']
            self.tasks[task_id] = {'status': 'running', 'started_at': datetime.now()}
            
            try:
                result = await task['func'](*task['args'], **task['kwargs'])
                self.tasks[task_id] = {
                    'status': 'completed',
                    'result': result,
                    'completed_at': datetime.now()
                }
                print(f"[✓] Task {task_id} completed")
            except Exception as e:
                self.tasks[task_id] = {
                    'status': 'failed',
                    'error': str(e),
                    'failed_at': datetime.now()
                }
                print(f"[✗] Task {task_id} failed: {e}")
            
            self.queue.task_done()
    
    async def enqueue(
        self,
        func: Callable,
        *args,
        **kwargs
    ) -> str:
        """Enqueue a task for background processing"""
        task_id = str(uuid.uuid4())
        
        await self.queue.put({
            'id': task_id,
            'func': func,
            'args': args,
            'kwargs': kwargs,
            'created_at': datetime.now()
        })
        
        self.tasks[task_id] = {'status': 'queued'}
        return task_id
    
    async def get_task_status(self, task_id: str) -> dict:
        """Get status of a queued task"""
        return self.tasks.get(task_id, {'status': 'not_found'})

# Global queue
task_queue = TaskQueue(max_workers=10)

@app.on_event("startup")
async def startup():
    await task_queue.start_workers()

# Example: Heavy image processing in background
async def process_organism_image(organism_id: str, image_url: str):
    """Process image without blocking API response"""
    # This runs in background worker
    # Resize, compress, generate thumbnail, etc.
    await asyncio.sleep(5)  # Simulate heavy work
    print(f"Image processed for {organism_id}")

@api_router.post("/admin/organisms/{organism_id}/process-image")
async def queue_image_processing(organism_id: str):
    # Enqueue immediately, return to user
    task_id = await task_queue.enqueue(
        process_organism_image,
        organism_id=organism_id,
        image_url="..."
    )
    
    return {
        "task_id": task_id,
        "status": "queued",
        "check_status_url": f"/api/tasks/{task_id}/status"
    }

@api_router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    return await task_queue.get_task_status(task_id)
```

---

## Phase 4: Crash Prevention & Recovery

### 4.1 Global Error Handling

```python
# backend/error_handling.py

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import traceback
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class ErrorTracker:
    """Track errors with unique IDs for user reporting"""
    
    def __init__(self):
        self.recent_errors = {}
    
    def log_error(self, error: Exception, context: dict = None) -> str:
        """Log error and return tracking ID"""
        error_id = str(uuid.uuid4())[:8]
        
        self.recent_errors[error_id] = {
            'timestamp': datetime.now().isoformat(),
            'error_type': type(error).__name__,
            'message': str(error)[:200],
            'context': context or {},
        }
        
        logger.error(
            f"[ERROR-{error_id}] {type(error).__name__}: {str(error)[:200]}",
            extra={'context': context, 'traceback': traceback.format_exc()}
        )
        
        return error_id

error_tracker = ErrorTracker()

def add_exception_handlers(app: FastAPI):
    """Add global exception handlers"""
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        error_id = error_tracker.log_error(exc, {'path': request.url.path})
        return JSONResponse(
            status_code=422,
            content={
                'error_id': error_id,
                'detail': 'Invalid request',
                'errors': exc.errors()[:3]  # Limit for security
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        error_id = error_tracker.log_error(exc, {'path': request.url.path})
        
        # Don't expose internal error details to clients
        return JSONResponse(
            status_code=500,
            content={
                'error_id': error_id,
                'detail': f'Server error. Report ID: {error_id}',
                'status': 'error'
            }
        )

# Use in main server.py:
# add_exception_handlers(app)
```

### 4.2 Graceful Shutdown

```python
# backend/graceful_shutdown.py

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

logger = logging.getLogger(__name__)

class GracefulShutdown:
    def __init__(self):
        self.shutting_down = False
        self.active_requests = 0
        self.shutdown_timeout = 30  # seconds
    
    async def on_startup(self, app: FastAPI):
        """Register shutdown handlers"""
        pass
    
    async def on_shutdown(self, app: FastAPI):
        """Graceful shutdown sequence"""
        logger.info("Starting graceful shutdown...")
        self.shutting_down = True
        
        # Stop accepting new requests
        logger.info("Stopping to accept new requests")
        
        # Wait for active requests to complete (with timeout)
        start_time = asyncio.get_event_loop().time()
        while self.active_requests > 0:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > self.shutdown_timeout:
                logger.warning(f"Shutdown timeout exceeded with {self.active_requests} active requests")
                break
            
            logger.info(f"Waiting for {self.active_requests} active requests to complete...")
            await asyncio.sleep(1)
        
        # Close database connections
        try:
            db_pool = await MongoDBPool.get_instance()
            await db_pool.close()
            logger.info("Database connections closed")
        except Exception as e:
            logger.error(f"Error closing database: {e}")
        
        logger.info("Graceful shutdown completed")

graceful_shutdown = GracefulShutdown()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await graceful_shutdown.on_startup(app)
    yield
    # Shutdown
    await graceful_shutdown.on_shutdown(app)

# Use in FastAPI:
# app = FastAPI(lifespan=lifespan)

# Middleware to track active requests
from starlette.middleware.base import BaseHTTPMiddleware

class ActiveRequestTracker(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if graceful_shutdown.shutting_down:
            return JSONResponse(
                status_code=503,
                content={'detail': 'Server is shutting down'}
            )
        
        graceful_shutdown.active_requests += 1
        try:
            response = await call_next(request)
        finally:
            graceful_shutdown.active_requests -= 1
        
        return response

# app.add_middleware(ActiveRequestTracker)
```

---

## Phase 5: Frontend UX Optimization

### 5.1 Progressive Data Loading

```javascript
// frontend/src/hooks/useProgressiveData.js

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,        // 1 second
  maxDelay: 30000,        // 30 seconds
  backoffMultiplier: 2,
};

export const useProgressiveData = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  
  const fetchWithRetry = useCallback(async () => {
    let lastError;
    
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: options.timeout || 15000,
          params: { ...options.params },
        });
        
        setData(response.data);
        setError(null);
        setLoading(false);
        return response.data;
        
      } catch (err) {
        lastError = err;
        
        // Don't retry on validation errors
        if (err.response?.status === 422) {
          throw err;
        }
        
        // Calculate backoff
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
          RETRY_CONFIG.maxDelay
        );
        
        console.warn(
          `Fetch failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}). ` +
          `Retrying in ${delay}ms...`,
          err.message
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries exhausted
    setError(lastError?.message || 'Failed to load data');
    setLoading(false);
    throw lastError;
  }, [url, options]);
  
  useEffect(() => {
    // Debounce: only refetch if retry count changes
    const timer = setTimeout(() => {
      fetchWithRetry();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [retry, fetchWithRetry]);
  
  return {
    data,
    loading,
    error,
    refetch: () => setRetry(r => r + 1),
  };
};
```

### 5.2 Skeleton Loader UI

```javascript
// frontend/src/components/SkeletonLoader.jsx

export const OrganismSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-gray-300 rounded mb-4 w-3/4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-32 bg-gray-200 rounded mb-4"></div>
    </div>
  </div>
);

export const ListSkeleton = ({ count = 10 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <OrganismSkeleton key={i} />
    ))}
  </div>
);
```

### 5.3 Offline Fallback

```javascript
// frontend/src/components/SystemStatus.jsx

import { useEffect, useState } from 'react';

export const SystemStatus = () => {
  const [status, setStatus] = useState('unknown');
  const [lastCheck, setLastCheck] = useState(null);
  
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health', { timeout: 5000 });
        setStatus(response.ok ? 'healthy' : 'degraded');
      } catch {
        setStatus('unhealthy');
      }
      setLastCheck(new Date());
    };
    
    // Check every 30 seconds
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (status === 'unhealthy') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="font-semibold text-yellow-800">⚠️ Server Slow</p>
        <p className="text-sm text-yellow-700 mt-1">
          The backend is slow to respond. Data may be cached or incomplete.
        </p>
        {lastCheck && (
          <p className="text-xs text-yellow-600 mt-2">
            Last checked: {lastCheck.toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  }
  
  return null;
};
```

---

## Cost Analysis & Scaling

### Free-Tier Deployment

| Service | Cost | Capacity | Notes |
|---------|------|----------|-------|
| **Render Hobby** | $7/month | 100-500 users | Keeps app alive, 1 vCPU |
| **MongoDB Atlas M0** | FREE | 128 connections | Adequate if optimized |
| **Vercel** | FREE | 1TB bandwidth | Handles frontend well |
| **Redis (optional)** | FREE tier | Limited cache | Use if budget allows |
| **Total** | **$7/month** | **100-500 users** | **Sustainable free-tier** |

### Scaling Roadmap

```
Stage 1 (0-500 users): $7/month
├─ Render Hobby × 1
├─ MongoDB M0
└─ Vercel

Stage 2 (500-2000 users): $50-100/month
├─ Render Standard × 2
├─ MongoDB M2
├─ Redis $15/month
└─ Vercel

Stage 3 (2000-10000 users): $500-1000/month
├─ Render Standard × 4
├─ MongoDB M5
├─ Redis $30/month
├─ Load Balancer $15-30/month
└─ Cloudflare Pro

Stage 4 (10000+ users): Custom enterprise
├─ Kubernetes cluster
├─ Database cluster (read replicas)
├─ Message queue system
├─ Micro-services architecture
└─ Enterprise monitoring
```

---

## Implementation Priority

1. **Week 1**: Optimize MongoDB connection pool + add health endpoint
2. **Week 2**: Add pagination + HTTP caching + rate limiting
3. **Week 3**: Implement graceful shutdown + error handling
4. **Week 4**: Frontend progressive loading + retry logic
5. **Week 5**: Setup monitoring + CI/CD pipeline
6. **Week 6**: Load testing + performance validation

