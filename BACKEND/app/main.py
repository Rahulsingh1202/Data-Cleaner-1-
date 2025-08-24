from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.upload import router as upload_router
from app.services.job_manager import job_manager
import os

app = FastAPI(
    title="Dataset Cleaner API",
    description="Professional image dataset cleaning service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload_router)

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    # Create directories
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.processed_dir, exist_ok=True)
    print(f"✅ Created directories: {settings.upload_dir}, {settings.processed_dir}")
    
    # Start cleanup task
    await job_manager.start_cleanup_task()
    print("✅ Started job cleanup task")

@app.get("/")
async def root():
    return {"message": "Dataset Cleaner API v1.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "dataset-cleaner"}

@app.get("/test-dirs")
async def test_directories():
    return {
        "upload_dir_exists": os.path.exists(settings.upload_dir),
        "processed_dir_exists": os.path.exists(settings.processed_dir),
        "upload_dir_path": settings.upload_dir,
        "processed_dir_path": settings.processed_dir
    }
