# backend/shutdown_manager.py
"""
Graceful shutdown and health check management
Prevents data corruption and ensures clean shutdowns
"""

import asyncio
import logging
from datetime import datetime
from typing import Callable, List

logger = logging.getLogger(__name__)


class GracefulShutdownManager:
    """
    Manages graceful application shutdown
    
    Features:
    - Stops accepting new requests
    - Waits for active requests to complete
    - Closes database connections cleanly
    - Timeout protection
    """
    
    def __init__(self, shutdown_timeout_seconds: int = 30):
        self.shutting_down = False
        self.active_requests = 0
        self.shutdown_timeout = shutdown_timeout_seconds
        self.startup_time = datetime.now()
        self.shutdown_callbacks: List[Callable] = []
    
    def register_shutdown_callback(self, callback: Callable):
        """Register a callback to run during shutdown"""
        self.shutdown_callbacks.append(callback)
    
    async def on_startup(self):
        """Called when app starts"""
        self.startup_time = datetime.now()
        logger.info(f"Application started at {self.startup_time}")
    
    async def on_shutdown(self):
        """Called when app receives shutdown signal"""
        logger.info("=" * 60)
        logger.info("GRACEFUL SHUTDOWN INITIATED")
        logger.info("=" * 60)
        
        self.shutting_down = True
        
        # Wait for active requests
        await self._wait_for_active_requests()
        
        # Run shutdown callbacks
        await self._run_shutdown_callbacks()
        
        # Final cleanup
        await self._final_cleanup()
        
        logger.info("=" * 60)
        logger.info("GRACEFUL SHUTDOWN COMPLETED")
        logger.info("=" * 60)
    
    async def _wait_for_active_requests(self):
        """Wait for active requests to complete"""
        logger.info("Waiting for active requests to complete...")
        
        start_time = datetime.now()
        checked_count = 0
        
        while self.active_requests > 0:
            elapsed = (datetime.now() - start_time).total_seconds()
            
            if elapsed > self.shutdown_timeout:
                logger.warning(
                    f"Shutdown timeout exceeded! "
                    f"{self.active_requests} request(s) still active. "
                    f"Forcing shutdown..."
                )
                break
            
            checked_count += 1
            if checked_count % 5 == 0:  # Log every 5 iterations (5 seconds)
                logger.info(
                    f"  Waiting for {self.active_requests} request(s) to complete "
                    f"({elapsed:.1f}s elapsed)..."
                )
            
            await asyncio.sleep(1)
        
        if self.active_requests == 0:
            logger.info("✓ All active requests completed")
        else:
            logger.warning(
                f"⚠ Shutdown with {self.active_requests} request(s) still active"
            )
    
    async def _run_shutdown_callbacks(self):
        """Run registered shutdown callbacks"""
        logger.info("Running shutdown callbacks...")
        
        for i, callback in enumerate(self.shutdown_callbacks):
            try:
                logger.info(f"  [{i+1}/{len(self.shutdown_callbacks)}] {callback.__name__}")
                
                # Handle both async and sync callbacks
                if asyncio.iscoroutinefunction(callback):
                    await asyncio.wait_for(callback(), timeout=10)
                else:
                    callback()
                
                logger.info(f"    ✓ {callback.__name__} completed")
            
            except asyncio.TimeoutError:
                logger.error(f"    ✗ {callback.__name__} timed out")
            except Exception as e:
                logger.error(f"    ✗ {callback.__name__} failed: {e}")
    
    async def _final_cleanup(self):
        """Final cleanup operations"""
        logger.info("Final cleanup...")
        
        try:
            # Close database if available
            from backend.database import MongoDBPool
            try:
                pool = await MongoDBPool.get_instance()
                await pool.close()
                logger.info("  ✓ Database connections closed")
            except Exception as e:
                logger.warning(f"  Could not close database: {e}")
        
        except ImportError:
            pass
        
        # Log shutdown summary
        uptime = (datetime.now() - self.startup_time).total_seconds()
        logger.info(f"Application uptime: {uptime:.0f} seconds")


class HealthCheckManager:
    """
    Health check endpoint management
    Prevents Render spindown and monitors system health
    """
    
    def __init__(self):
        self.is_healthy = True
        self.last_health_check = datetime.now()
        self.mongodb_health = "unknown"
    
    async def check_health(self) -> dict:
        """
        Lightweight health check
        Should respond in <100ms from cache
        """
        self.last_health_check = datetime.now()
        
        return {
            "status": "healthy" if self.is_healthy else "degraded",
            "timestamp": self.last_health_check.isoformat(),
            "components": {
                "api": "operational",
                "mongodb": self.mongodb_health,
            }
        }
    
    async def check_mongodb(self) -> bool:
        """Check MongoDB connectivity"""
        try:
            from backend.database import MongoDBPool
            pool = await MongoDBPool.get_instance()
            health = await pool.health_check()
            
            self.mongodb_health = health.get('status', 'unknown')
            return self.mongodb_health == 'healthy'
        
        except Exception as e:
            logger.error(f"MongoDB health check failed: {e}")
            self.mongodb_health = "unhealthy"
            return False
    
    def set_health(self, is_healthy: bool):
        """Manually set health status"""
        self.is_healthy = is_healthy


# Global instances
shutdown_manager = GracefulShutdownManager(shutdown_timeout_seconds=30)
health_check_manager = HealthCheckManager()


# Middleware to track active requests
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse


class ActiveRequestTrackerMiddleware(BaseHTTPMiddleware):
    """Middleware that tracks active requests and blocks during shutdown"""
    
    async def dispatch(self, request, call_next):
        # Reject requests during shutdown
        if shutdown_manager.shutting_down:
            return JSONResponse(
                status_code=503,
                content={
                    'status': 'shutting_down',
                    'detail': 'Server is shutting down. Please retry shortly.',
                }
            )
        
        # Track active requests
        shutdown_manager.active_requests += 1
        
        try:
            response = await call_next(request)
        finally:
            shutdown_manager.active_requests -= 1
        
        return response


# Example usage in FastAPI:
"""
from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.shutdown_manager import (
    shutdown_manager,
    health_check_manager,
    ActiveRequestTrackerMiddleware,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await shutdown_manager.on_startup()
    
    yield
    
    # Shutdown
    await shutdown_manager.on_shutdown()

app = FastAPI(lifespan=lifespan)

# Add middleware
app.add_middleware(ActiveRequestTrackerMiddleware)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    '''
    Health check endpoint
    Prevents Render spindown if called every 14 minutes
    '''
    return await health_check_manager.check_health()

# Register shutdown callbacks
async def close_database():
    from backend.database import MongoDBPool
    pool = await MongoDBPool.get_instance()
    await pool.close()

shutdown_manager.register_shutdown_callback(close_database)
"""
