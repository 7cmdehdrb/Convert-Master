"""
Multi-Tool Web Converter - Main Application

A modular web application for various file conversion operations.
Features a clean architecture with separate converters, routes, and utilities.
"""

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import logging

from config import settings
from routes import converter_router

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description="Modern web converter supporting multiple file conversion types",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

# Include routers
app.include_router(converter_router)

# Mount static files (must be after routers to avoid conflicts)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_root():
    """Redirect root to the main application page."""
    return RedirectResponse(url="/static/index.html")


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": settings.app_title,
        "version": settings.app_version,
    }


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting {settings.app_title} v{settings.app_version}")

    uvicorn.run(
        "main:app", host=settings.host, port=settings.port, reload=settings.reload
    )
