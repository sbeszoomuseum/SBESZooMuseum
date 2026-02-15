#!/usr/bin/env python
"""Simple test server to verify API works"""

import sys
import os
import asyncio
import signal

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import app

if __name__ == "__main__":
    import uvicorn
    
    # Disable signal handling on Windows to avoid event loop cancellation
    if sys.platform == "win32":
        signal.signal(signal.SIGTERM, signal.SIG_DFL)
        signal.signal(signal.SIGINT, signal.SIG_DFL)
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n[INFO] Server shutdown requested")
        sys.exit(0)
