# backend/database.py
"""
Optimized MongoDB Connection Pool Management
Replaces manual connection initialization with high-performance pooling
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
import os
import asyncio
from datetime import datetime, timedelta
import pytz
import logging

logger = logging.getLogger(__name__)
IST = pytz.timezone('Asia/Kolkata')

class MongoDBPool:
    """
    Singleton MongoDB connection pool with:
    - Persistent connections (minPoolSize: 10)
    - Max 100 connections (vs 3 before)
    - Optimized timeouts (5-30s vs 120s before)
    - Automatic health checks
    - Graceful shutdown
    """
    
    _instance = None
    _lock = asyncio.Lock()
    _client: AsyncIOMotorClient = None
    _db: AsyncIOMotorDatabase = None
    _connected = False
    
    @classmethod
    async def get_instance(cls):
        """Get singleton instance with thread-safe initialization"""
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = MongoDBPool()
                    await cls._instance._initialize()
        return cls._instance
    
    async def _initialize(self):
        """Initialize connection pool on first use"""
        if self._connected:
            return
        
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            raise ValueError("MONGO_URL environment variable not set")
        
        try:
            # Optimized connection parameters
            self._client = AsyncIOMotorClient(
                mongo_url,
                # ========== CRITICAL OPTIMIZATIONS ==========
                # Connection Pooling
                maxPoolSize=100,              # Increased from 3 to 100
                minPoolSize=10,               # Keep 10 warm connections
                maxIdleTimeMS=600000,         # 10 minutes before reusing idle connections
                waitQueueTimeoutMS=10000,     # 10 seconds to wait for available connection
                
                # Timeouts (balanced between responsiveness and stability)
                serverSelectionTimeoutMS=5000,    # 5s to discover server (vs 120s)
                connectTimeoutMS=10000,           # 10s to connect (vs 120s)
                socketTimeoutMS=30000,            # 30s per socket operation (vs 120s)
                
                # Retry Strategy
                retryWrites=True,                 # Automatic retry on transient write errors
                retryReads=True,                  # Automatic retry on transient read errors
                
                # Connection Health Monitoring
                heartbeatFrequencyMS=10000,       # Check health every 10 seconds
                serverMonitoringMode='auto',      # Automatic monitoring
                
                # SSL/TLS (Required for production)
                ssl=True,
                tlsAllowInvalidCertificates=False,
                tlsAllowInvalidHostnames=False,
                
                # Application metadata
                appName='BioMuseum-SaaS',
                driverName='motor',
            )
            
            # Verify connection with quick test
            logger.info("Testing MongoDB connection...")
            await asyncio.wait_for(
                self._client.admin.command('ping'),
                timeout=10.0
            )
            
            self._db = self._client[os.environ.get('DB_NAME', 'biomuseum')]
            self._connected = True
            
            logger.info("✓ MongoDB connection pool initialized successfully")
            logger.info(f"  Pool: {self._client._MongoClient__options.pool_options}")
            
            # Create indexes asynchronously (doesn't block startup)
            asyncio.create_task(self._create_indexes())
            
        except asyncio.TimeoutError:
            logger.error("MongoDB connection timeout - network issue detected")
            raise RuntimeError(
                "MongoDB connection timeout. Check your network and "
                "MongoDB Atlas IP whitelist at https://cloud.mongodb.com"
            )
        except Exception as e:
            logger.error(f"MongoDB initialization failed: {e}")
            raise RuntimeError(f"MongoDB initialization failed: {e}")
    
    async def _create_indexes(self):
        """Create indexes for optimal query performance"""
        if not self._db:
            return
        
        try:
            indexes = {
                'organisms': [
                    ([('name', ASCENDING)], {'unique': True, 'sparse': True}),
                    ([('scientific_name', ASCENDING)], {'sparse': True}),
                    ([('created_at', DESCENDING)], {}),
                    ([('kingdom', ASCENDING), ('phylum', ASCENDING)], {}),
                ],
                'blogs': [
                    ([('created_at', DESCENDING)], {}),
                    ([('slug', ASCENDING)], {'unique': True, 'sparse': True}),
                    ([('published_at', DESCENDING)], {}),
                ],
                'gmail_users': [
                    ([('email', ASCENDING)], {'unique': True}),
                    ([('google_id', ASCENDING)], {'unique': True}),
                    ([('last_active', DESCENDING)], {}),
                ],
                'biotube_videos': [
                    ([('created_at', DESCENDING)], {}),
                    ([('kingdom', ASCENDING)], {}),
                ],
            }
            
            for coll_name, idx_list in indexes.items():
                try:
                    coll = self._db[coll_name]
                    for keys, options in idx_list:
                        await coll.create_index(keys, **options)
                    logger.info(f"✓ Indexes created for {coll_name}")
                except Exception as e:
                    logger.warning(f"Could not create index on {coll_name}: {e}")
        
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
    
    def get_db(self) -> AsyncIOMotorDatabase:
        """Get database instance (non-async)"""
        if not self._connected or not self._db:
            raise RuntimeError(
                "Database not initialized. Call 'await MongoDBPool.get_instance()' first."
            )
        return self._db
    
    async def close(self):
        """Close all connections gracefully"""
        if self._client:
            self._client.close()
            self._connected = False
            logger.info("✓ MongoDB connections closed gracefully")
    
    async def health_check(self) -> dict:
        """Quick health check of connection pool"""
        if not self._connected:
            return {"status": "disconnected"}
        
        try:
            await asyncio.wait_for(
                self._client.admin.command('ping'),
                timeout=5.0
            )
            return {
                "status": "healthy",
                "connected": True,
                "timestamp": datetime.now(IST).isoformat(),
            }
        except asyncio.TimeoutError:
            return {"status": "slow", "response_time_ms": 5000}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)[:100]}


# Singleton instance (lazy-loaded)
_db_pool_instance = None


async def get_db_pool() -> MongoDBPool:
    """Get or create the singleton MongoDB pool"""
    global _db_pool_instance
    if _db_pool_instance is None:
        _db_pool_instance = await MongoDBPool.get_instance()
    return _db_pool_instance


async def get_db() -> AsyncIOMotorDatabase:
    """Convenience function to get database"""
    pool = await get_db_pool()
    return pool.get_db()
