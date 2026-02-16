# backend/error_handling.py
"""
Global error handling with structured logging
Prevents crashes and provides useful error tracking
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
import logging
import traceback
import uuid
from datetime import datetime
import json
from typing import Dict

logger = logging.getLogger(__name__)


class ErrorTracker:
    """Track errors with unique IDs for user reporting"""
    
    def __init__(self, max_recent: int = 1000):
        self.recent_errors: Dict[str, dict] = {}
        self.max_recent = max_recent
        self.error_count = 0
    
    def log_error(
        self,
        error: Exception,
        context: dict = None,
        error_type: str = "unknown",
    ) -> str:
        """
        Log error and return tracking ID
        
        Args:
            error: Exception object
            context: Additional context (path, user_id, etc.)
            error_type: Category of error
        
        Returns:
            error_id for user reporting
        """
        
        error_id = str(uuid.uuid4())[:8]
        self.error_count += 1
        
        error_data = {
            'error_id': error_id,
            'timestamp': datetime.now().isoformat(),
            'error_type': error_type or type(error).__name__,
            'message': str(error)[:500],
            'context': context or {},
            'count': self.error_count,
        }
        
        self.recent_errors[error_id] = error_data
        
        # Keep only recent errors
        if len(self.recent_errors) > self.max_recent:
            oldest_id = min(self.recent_errors.keys())
            del self.recent_errors[oldest_id]
        
        # Structured logging (JSON format for log aggregation)
        log_entry = {
            'level': 'ERROR',
            'error_id': error_id,
            'type': error_data['error_type'],
            'message': error_data['message'],
            'context': context or {},
            'timestamp': error_data['timestamp'],
            'traceback': traceback.format_exc()[:500],
        }
        
        logger.error(json.dumps(log_entry))
        
        return error_id
    
    def get_error(self, error_id: str) -> dict:
        """Retrieve error details"""
        return self.recent_errors.get(error_id, {})


error_tracker = ErrorTracker()


def add_exception_handlers(app: FastAPI):
    """Add comprehensive exception handlers to FastAPI app"""
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError
    ):
        """Handle Pydantic validation errors"""
        error_id = error_tracker.log_error(
            exc,
            context={
                'path': str(request.url.path),
                'method': request.method,
                'validation_errors': len(exc.errors()),
            },
            error_type='VALIDATION_ERROR'
        )
        
        return JSONResponse(
            status_code=422,
            content={
                'error_id': error_id,
                'status': 'invalid_request',
                'detail': 'Invalid request data',
                'errors': [
                    {
                        'field': '.'.join(str(x) for x in err['loc']),
                        'message': err['msg'],
                        'type': err['type'],
                    }
                    for err in exc.errors()[:3]  # Max 3 for security
                ],
            }
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException
    ):
        """Handle HTTP exceptions properly"""
        error_id = error_tracker.log_error(
            Exception(exc.detail),
            context={
                'path': str(request.url.path),
                'status_code': exc.status_code,
            },
            error_type='HTTP_ERROR'
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                'error_id': error_id,
                'status': 'error',
                'detail': exc.detail,
                'status_code': exc.status_code,
            },
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception
    ):
        """Catch-all for unhandled exceptions"""
        error_id = error_tracker.log_error(
            exc,
            context={
                'path': str(request.url.path),
                'method': request.method,
                'client_ip': request.client.host if request.client else 'unknown',
            },
            error_type='INTERNAL_ERROR'
        )
        
        # Don't expose internal errors to client
        return JSONResponse(
            status_code=500,
            content={
                'error_id': error_id,
                'status': 'server_error',
                'detail': f'An error occurred. Please report ID {error_id} to support.',
                'message': str(exc)[:100] if str(exc) else 'Unknown error',
            }
        )


# Monitoring/alerting helper
async def send_error_alert(error_id: str, severity: str = "WARNING"):
    """
    Send alert for critical errors
    
    In production, integrate with:
    - Sentry
    - New Relic
    - Datadog
    - Custom monitoring
    """
    error_data = error_tracker.get_error(error_id)
    
    if not error_data:
        return
    
    # Example: Send to monitoring service
    if severity == "CRITICAL":
        logger.critical(f"CRITICAL ERROR {error_id}: {error_data['message']}")
        # TODO: Send alert email, SMS, Slack notification, etc.
    elif severity == "WARNING":
        logger.warning(f"WARNING {error_id}: {error_data['message']}")


# Example usage:
"""
from fastapi import FastAPI
from backend.error_handling import add_exception_handlers

app = FastAPI()
add_exception_handlers(app)

@app.get("/organisms/{org_id}")
async def get_organism(org_id: str):
    try:
        organism = await db.organisms.find_one({"id": org_id})
        if not organism:
            raise HTTPException(status_code=404, detail="Organism not found")
        return organism
    except Exception as e:
        error_id = error_tracker.log_error(e)
        raise HTTPException(status_code=500, detail=f"Error {error_id}")
"""
