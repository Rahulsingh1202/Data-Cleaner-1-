from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProcessingStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class QualityMode(str, Enum):
    STRICT = "strict"
    BALANCED = "balanced" 
    LENIENT = "lenient"
    CUSTOM = "custom"

class CleaningOptions(BaseModel):
    remove_duplicates: bool = True
    quality_mode: QualityMode = Field(default=QualityMode.BALANCED, description="Choose cleaning strictness level")
    
    # Custom quality parameters (used when quality_mode = "custom")
    custom_blur_threshold: Optional[float] = Field(default=None, ge=10.0, le=1000.0, description="Custom blur threshold (10-1000, lower=stricter)")
    custom_min_brightness: Optional[float] = Field(default=None, ge=0.0, le=50.0, description="Custom minimum brightness (0-50)")
    custom_max_brightness: Optional[float] = Field(default=None, ge=200.0, le=255.0, description="Custom maximum brightness (200-255)")
    
    resize_images: bool = False
    target_size: Optional[tuple[int, int]] = None
    normalize_format: bool = True
    target_format: str = "JPEG"
    
    # Advanced options
    remove_tiny_images: bool = Field(default=True, description="Remove images smaller than 64x64 pixels")
    remove_stretched_images: bool = Field(default=True, description="Remove extremely stretched images (>10:1 ratio)")
    
    def get_quality_description(self) -> str:
        """Get human-readable description of selected quality mode"""
        descriptions = {
            QualityMode.STRICT: "Removes 15-25% of images. Best for high-precision applications requiring only pristine images.",
            QualityMode.BALANCED: "Removes 5-15% of images. Good balance between quality and dataset size. Recommended for most use cases.",
            QualityMode.LENIENT: "Removes 1-5% of images. Keeps most images, removing only clearly corrupted files. Best for preserving maximum training data.",
            QualityMode.CUSTOM: "Uses your custom quality parameters for fine-tuned control."
        }
        return descriptions.get(self.quality_mode, "Unknown quality mode")

class DatasetInfo(BaseModel):
    total_images: int
    file_size_mb: float
    formats: List[str]
    avg_resolution: Optional[tuple[int, int]] = None

class ProcessingJob(BaseModel):
    job_id: str
    status: ProcessingStatus
    created_at: datetime
    dataset_info: Optional[DatasetInfo] = None
    cleaning_options: CleaningOptions
    progress: float = 0.0
    message: str = ""
    download_url: Optional[str] = None
