"""Run the FastAPI application."""

import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    # For Railway deployment, use environment variables
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )
