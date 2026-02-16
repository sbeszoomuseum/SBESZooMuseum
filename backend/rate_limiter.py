# backend/rate_limiter.py
"""
Rate limiting to prevent overload and DDoS attacks
Protects backend from traffic spikes and abuse
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List
from fastapi import Request, HTTPException, Depends
from collections import defaultdict
import logging
import asyncio

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Simple in-memory rate limiter
    For production with Redis, use the RedisRateLimiter instead
    
    Limits:
    - Per-IP: 100 requests/minute, 5000/hour
    - Per-user (authenticated): 1000 requests/minute, 50000/hour
    - Per-endpoint: Global burst protection
    """
    
    def __init__(self):
        self.buckets: Dict[str, List[datetime]] = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def check_rate_limit(
        self,
        key: str,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
    ) -> Tuple[bool, Optional[float]]:
        """
        Check if request is within rate limit
        
        Args:
            key: Identifier (IP, user_id, etc.)
            requests_per_minute: Burst limit
            requests_per_hour: Sustained limit
        
        Returns:
            (allowed: bool, retry_after_seconds: Optional[float])
        
        Example:
            allowed, retry_after = await rate_limiter.check_rate_limit(
                f"ip:{client_ip}",
                requests_per_minute=100,
                requests_per_hour=5000
            )
            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many requests. Retry after {retry_after} seconds"
                )
        """
        
        now = datetime.now()
        
        async with self.lock:
            # Get or initialize bucket
            if key not in self.buckets:
                self.buckets[key] = []
            
            bucket = self.buckets[key]
            
            # Remove old entries outside our window
            one_hour_ago = now - timedelta(hours=1)
            self.buckets[key] = [ts for ts in bucket if ts > one_hour_ago]
            bucket = self.buckets[key]
            
            # Check minute limit
            one_minute_ago = now - timedelta(minutes=1)
            recent_minute = [ts for ts in bucket if ts > one_minute_ago]
            
            if len(recent_minute) >= requests_per_minute:
                # Calculate retry-after
                oldest_in_window = recent_minute[0]
                retry_after = (oldest_in_window - one_minute_ago).total_seconds()
                logger.warning(f"Rate limit (minute) exceeded for {key}")
                return False, max(1, retry_after)
            
            # Check hour limit
            if len(bucket) >= requests_per_hour:
                oldest_in_window = bucket[0]
                retry_after = (oldest_in_window - one_hour_ago).total_seconds()
                logger.warning(f"Rate limit (hour) exceeded for {key}")
                return False, max(1, retry_after)
            
            # Within limits - record this request
            self.buckets[key].append(now)
            return True, None
    
    async def get_usage(self, key: str) -> dict:
        """Get current usage for a key"""
        now = datetime.now()
        bucket = self.buckets.get(key, [])
        
        one_minute_ago = now - timedelta(minutes=1)
        one_hour_ago = now - timedelta(hours=1)
        
        minute_usage = len([ts for ts in bucket if ts > one_minute_ago])
        hour_usage = len([ts for ts in bucket if ts > one_hour_ago])
        
        return {
            "minute": minute_usage,
            "hour": hour_usage,
            "last_reset": bucket[0].isoformat() if bucket else None,
        }


class RateLimitByIP:
    """
    Per-IP rate limiting dependency
    
    Example:
        @app.get("/sensitive-endpoint")
        async def endpoint(_: bool = Depends(rate_limit_by_ip)):
            return {"data": "..."}
    """
    
    def __init__(self, limiter: RateLimiter):
        self.limiter = limiter
    
    async def __call__(self, request: Request) -> bool:
        client_ip = request.client.host if request.client else "unknown"
        
        allowed, retry_after = await self.limiter.check_rate_limit(
            f"ip:{client_ip}",
            requests_per_minute=120,      # 2 per second
            requests_per_hour=10000,      # ~3 per second sustained
        )
        
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too many requests from your IP address",
                headers={"Retry-After": str(int(retry_after))},
            )
        
        return True


class RateLimitByUser:
    """
    Per-user (authenticated) rate limiting
    Higher limits than per-IP (trusted users)
    
    Example:
        @app.post("/api/create-organism")
        async def create_organism(
            auth: str = Depends(verify_admin_token),
            _: bool = Depends(rate_limit_by_user),
        ):
            return {"id": "..."}
    """
    
    def __init__(self, limiter: RateLimiter):
        self.limiter = limiter
    
    async def __call__(self, request: Request, user_id: Optional[str] = None) -> bool:
        if not user_id:
            # Fallback to IP if no user
            user_id = request.client.host if request.client else "unknown"
        
        allowed, retry_after = await self.limiter.check_rate_limit(
            f"user:{user_id}",
            requests_per_minute=500,      # 8+ per second
            requests_per_hour=50000,      # ~14 per second sustained
        )
        
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="You have exceeded your rate limit",
                headers={"Retry-After": str(int(retry_after))},
            )
        
        return True


class CircuitBreaker:
    """
    Circuit breaker pattern for external service calls
    Prevents cascading failures when external APIs are slow/down
    
    States:
    - CLOSED: Normal operation
    - OPEN: Failing, reject requests
    - HALF_OPEN: Testing if service recovered
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        
        # Check if we should attempt recovery
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
                logger.info(f"Circuit breaker entering HALF_OPEN state")
            else:
                raise Exception(f"Circuit breaker is OPEN. Service unavailable.")
        
        try:
            result = await func(*args, **kwargs)
            
            if self.state == "HALF_OPEN":
                # Success in half-open state - reset
                self._reset()
            
            return result
        
        except self.expected_exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(
                    f"Circuit breaker OPEN after {self.failure_count} failures. "
                    f"Service will be unavailable for {self.recovery_timeout}s"
                )
            
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt recovery"""
        if not self.last_failure_time:
            return True
        
        elapsed = (datetime.now() - self.last_failure_time).total_seconds()
        return elapsed >= self.recovery_timeout
    
    def _reset(self):
        """Reset circuit breaker to healthy state"""
        self.state = "CLOSED"
        self.failure_count = 0
        self.last_failure_time = None
        logger.info("Circuit breaker reset to CLOSED state")


# Global instances
rate_limiter = RateLimiter()
rate_limit_by_ip_dep = RateLimitByIP(rate_limiter)
rate_limit_by_user_dep = RateLimitByUser(rate_limiter)

# Circuit breaker for external services
external_api_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
)


# Example usage:
"""
from fastapi import FastAPI, Depends

app = FastAPI()

@app.get("/organisms")
async def get_organisms(
    _: bool = Depends(rate_limit_by_ip_dep),
):
    # Route implementation
    pass

@app.post("/admin/organisms")
async def create_organism(
    _: bool = Depends(rate_limit_by_user_dep),
):
    # Admin route with higher rate limits
    pass

# Check status
@app.get("/admin/rate-limit-status/{key}")
async def get_rate_limit_status(key: str):
    usage = await rate_limiter.get_usage(key)
    return usage
"""
