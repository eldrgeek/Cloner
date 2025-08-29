from fastapi import APIRouter
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("Health check endpoint accessed")
    return {
        "status": "healthy",
        "service": "Cloner API",
        "timestamp": datetime.now().isoformat(),
        "version": "0.1.0"
    }