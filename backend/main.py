from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging
import os
from api.routes import health
from core.config import settings, is_production
from core.database import init_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Cloner API...")
    logger.info(f"Environment: {'production' if is_production() else 'development'}")
    logger.info(f"Debug mode: {settings.debug}")
    await init_db()
    logger.info("Database initialized successfully")
    yield
    # Shutdown
    logger.info("Shutting down Cloner API...")

app = FastAPI(
    title="Cloner API",
    description="Cloner application backend",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware configuration
logger.info("Configuring CORS middleware...")
logger.info(f"Production environment detected: {is_production()}")

# Define allowed origins based on environment
if is_production():
    allowed_origins = [
        "https://cloner.netlify.app",  # Update with actual Netlify URL
        "https://cloner-api.onrender.com"  # Backend self-reference
    ]
    allow_credentials = True
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000", 
        "http://127.0.0.1:5173"
    ]
    allow_credentials = True

logger.info(f"Allowed CORS origins: {allowed_origins}")
logger.info(f"Allow credentials: {allow_credentials}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

logger.info("CORS middleware configured successfully")

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    # Get current git revision
    try:
        import subprocess
        git_rev = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], 
                                        stderr=subprocess.DEVNULL).decode().strip()
    except:
        git_rev = "unknown"
    
    return {
        "message": "Cloner API", 
        "version": "0.1.0", 
        "build": f"{git_rev}-v1",
        "deploy_time": __import__('datetime').datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not is_production())