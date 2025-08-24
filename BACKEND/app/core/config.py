from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Configuration
    api_v1_str: str = "/api/v1"
    project_name: str = "Dataset Cleaner"
    
    # File handling
    max_file_size: int = 1024 * 1024 * 1024  # 1GB
    upload_dir: str = "temp_uploads"
    processed_dir: str = "processed"
    
    # Processing limits
    max_concurrent_jobs: int = 3
    cleanup_interval_hours: int = 24
    
    # Storage (we'll implement TeraBox integration later)
    storage_provider: str = "local"  # local, terabox, s3
    
    class Config:
        env_file = ".env"

settings = Settings()

# Remove the os.makedirs calls from here - they're now in main.py startup event
