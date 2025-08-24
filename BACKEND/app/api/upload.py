import os
import shutil
import asyncio
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse
from app.services.upload_service import upload_service
from app.services.job_manager import job_manager
from app.models.schemas import CleaningOptions, ProcessingStatus, ProcessingJob, QualityMode
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["upload"])


@router.post("/upload")
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    
    # Quality mode selection
    quality_mode: QualityMode = Query(
        default=QualityMode.BALANCED, 
        description="Choose cleaning strictness: strict (15-25% removed), balanced (5-15% removed), lenient (1-5% removed), or custom"
    ),
    
    # Custom quality parameters (only used when quality_mode = "custom")
    custom_blur_threshold: Optional[float] = Query(
        default=None, 
        ge=10.0, 
        le=1000.0, 
        description="Custom blur threshold (10-1000, lower=stricter). Only used in custom mode."
    ),
    custom_min_brightness: Optional[float] = Query(
        default=None, 
        ge=0.0, 
        le=50.0, 
        description="Custom minimum brightness (0-50). Only used in custom mode."
    ),
    custom_max_brightness: Optional[float] = Query(
        default=None, 
        ge=200.0, 
        le=255.0, 
        description="Custom maximum brightness (200-255). Only used in custom mode."
    ),
    
    # Standard cleaning options
    remove_duplicates: bool = Query(default=True, description="Remove duplicate images using perceptual hashing"),
    resize_images: bool = Query(default=False, description="Resize all images to target size"),
    target_width: Optional[int] = Query(default=None, ge=64, le=4096, description="Target width for resizing (64-4096px)"),
    target_height: Optional[int] = Query(default=None, ge=64, le=4096, description="Target height for resizing (64-4096px)"),
    normalize_format: bool = Query(default=True, description="Convert all images to target format"),
    target_format: str = Query(default="JPEG", description="Target format for conversion (JPEG, PNG, WebP)"),
    
    # Advanced filtering options
    remove_tiny_images: bool = Query(default=True, description="Remove images smaller than 64x64 pixels"),
    remove_stretched_images: bool = Query(default=True, description="Remove extremely stretched images (aspect ratio >10:1)")
):
    """
    Upload and process image dataset with user-selectable quality modes
    
    **Quality Modes:**
    
    🔴 **STRICT**: Removes 15-25% of images
    - Best for: Medical imaging, scientific research, high-precision applications
    - Criteria: Very strict blur detection, tight brightness ranges
    - Use when: Quality is more important than quantity
    
    🟡 **BALANCED**: Removes 5-15% of images (Recommended)
    - Best for: General machine learning, computer vision projects  
    - Criteria: Reasonable quality filters, good balance
    - Use when: Most real-world applications
    
    🟢 **LENIENT**: Removes 1-5% of images
    - Best for: Training data preservation, large-scale datasets
    - Criteria: Only removes clearly corrupted/unreadable images
    - Use when: You need maximum data for training
    
    ⚙️ **CUSTOM**: Use your own quality parameters
    - Best for: Fine-tuned control for specific requirements
    - Criteria: User-defined thresholds for all quality checks
    - Use when: You know your exact data requirements
    
    **Returns:** Job ID for tracking processing status
    """
    
    # Validate file upload
    if not file.filename:
        raise HTTPException(
            status_code=400, 
            detail="No file provided. Please select a ZIP file or single image."
        )
    
    # Validate target format
    valid_formats = {"JPEG", "PNG", "WebP", "BMP", "TIFF"}
    if target_format.upper() not in valid_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target format. Supported formats: {', '.join(valid_formats)}"
        )
    
    # Handle resize dimensions
    target_size = None
    if resize_images:
        if not target_width or not target_height:
            raise HTTPException(
                status_code=400,
                detail="Both target_width and target_height are required when resize_images=True"
            )
        target_size = (target_width, target_height)
    
    # Validate custom parameters if custom mode is selected
    if quality_mode == QualityMode.CUSTOM:
        if custom_blur_threshold is None or custom_min_brightness is None or custom_max_brightness is None:
            raise HTTPException(
                status_code=400,
                detail="custom_blur_threshold, custom_min_brightness, and custom_max_brightness are required when using custom quality mode"
            )
        
        if custom_min_brightness >= custom_max_brightness:
            raise HTTPException(
                status_code=400,
                detail="custom_min_brightness must be less than custom_max_brightness"
            )
    
    try:
        # Read file content BEFORE background task to avoid FastAPI file closure
        file_content = await file.read()
        logger.info(f"📥 File uploaded: {file.filename} ({len(file_content)} bytes)")
        
        # Create cleaning options with new quality mode parameters
        cleaning_options = CleaningOptions(
            remove_duplicates=remove_duplicates,
            quality_mode=quality_mode,
            custom_blur_threshold=custom_blur_threshold,
            custom_min_brightness=custom_min_brightness,
            custom_max_brightness=custom_max_brightness,
            resize_images=resize_images,
            target_size=target_size,
            normalize_format=normalize_format,
            target_format=target_format.upper(),
            remove_tiny_images=remove_tiny_images,
            remove_stretched_images=remove_stretched_images
        )
        
        # Create processing job
        job_id = await job_manager.create_job(cleaning_options)
        logger.info(f"🆔 Created job: {job_id} with {quality_mode.value} mode")
        
        # Start background processing with file content
        background_tasks.add_task(process_dataset_background, file, job_id, file_content)
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Dataset upload started successfully",
            "quality_mode": quality_mode.value,
            "quality_description": cleaning_options.get_quality_description(),
            "expected_retention_rate": _get_expected_retention_rate(quality_mode),
            "status_url": f"/api/v1/job/{job_id}",
            "estimated_time": "2-5 minutes depending on dataset size",
            "cleaning_options": cleaning_options.dict()
        }
        
    except Exception as e:
        logger.error(f"❌ Upload initialization failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Upload initialization failed: {str(e)}"
        )


@router.post("/upload-multiple")
async def upload_multiple_images(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="Multiple image files"),
    quality_mode: QualityMode = Query(default=QualityMode.BALANCED, description="Choose cleaning strictness level"),
    remove_duplicates: bool = Query(default=True),
    normalize_format: bool = Query(default=True),
    target_format: str = Query(default="JPEG")
):
    """
    Upload multiple individual image files (alternative to ZIP upload)
    """
    
    if not files:
        raise HTTPException(400, "No files provided")
    
    # Validate all files
    for file in files:
        if not upload_service._is_supported_file(file.filename):
            raise HTTPException(400, f"Unsupported file: {file.filename}")
    
    try:
        # Read all files content before background processing
        files_content = []
        for file in files:
            content = await file.read()
            files_content.append((file, content))
        
        logger.info(f"📥 Multiple files uploaded: {len(files)} files")
        
        # Create cleaning options
        cleaning_options = CleaningOptions(
            remove_duplicates=remove_duplicates,
            quality_mode=quality_mode,
            resize_images=False,  # Simplified for multiple upload
            normalize_format=normalize_format,
            target_format=target_format.upper(),
            remove_tiny_images=True,
            remove_stretched_images=True
        )
        
        # Create job
        job_id = await job_manager.create_job(cleaning_options)
        logger.info(f"🆔 Created multiple files job: {job_id}")
        
        # Process multiple files in background
        background_tasks.add_task(process_multiple_files_background, files_content, job_id)
        
        return {
            "success": True,
            "job_id": job_id,
            "files_count": len(files),
            "quality_mode": quality_mode.value,
            "message": f"Processing {len(files)} files with {quality_mode.value} quality mode",
            "status_url": f"/api/v1/job/{job_id}"
        }
        
    except Exception as e:
        logger.error(f"❌ Multiple upload failed: {str(e)}")
        raise HTTPException(500, f"Multiple upload failed: {str(e)}")


@router.get("/quality-modes")
async def get_quality_modes():
    """
    Get detailed information about available quality modes
    """
    return {
        "quality_modes": {
            "strict": {
                "name": "Strict",
                "icon": "🔴",
                "retention_rate": "75-85%",
                "removal_rate": "15-25%",
                "description": "Removes 15-25% of images. Best for high-precision applications requiring only pristine images.",
                "use_cases": ["Medical imaging", "Scientific research", "High-precision computer vision"],
                "criteria": {
                    "blur_threshold": 500,
                    "min_brightness": 10,
                    "max_brightness": 245
                }
            },
            "balanced": {
                "name": "Balanced",
                "icon": "🟡",
                "retention_rate": "85-95%",
                "removal_rate": "5-15%",
                "description": "Removes 5-15% of images. Good balance between quality and dataset size. Recommended for most use cases.",
                "use_cases": ["General machine learning", "Computer vision projects", "Most applications"],
                "criteria": {
                    "blur_threshold": 100,
                    "min_brightness": 5,
                    "max_brightness": 250
                },
                "recommended": True
            },
            "lenient": {
                "name": "Lenient",
                "icon": "🟢",
                "retention_rate": "95-99%",
                "removal_rate": "1-5%",
                "description": "Removes 1-5% of images. Keeps most images, removing only clearly corrupted files. Best for preserving maximum training data.",
                "use_cases": ["Training data preservation", "Large-scale datasets", "Data augmentation"],
                "criteria": {
                    "blur_threshold": 50,
                    "min_brightness": 2,
                    "max_brightness": 253
                }
            },
            "custom": {
                "name": "Custom",
                "icon": "⚙️",
                "retention_rate": "Variable",
                "removal_rate": "Variable",
                "description": "Uses your custom quality parameters for fine-tuned control.",
                "use_cases": ["Expert users", "Specific requirements", "Fine-tuned control"],
                "criteria": "User-defined parameters"
            }
        },
        "parameter_ranges": {
            "blur_threshold": {
                "min": 10,
                "max": 1000,
                "description": "Lower values = stricter blur detection"
            },
            "min_brightness": {
                "min": 0,
                "max": 50,
                "description": "Images darker than this are removed"
            },
            "max_brightness": {
                "min": 200,
                "max": 255,
                "description": "Images brighter than this are removed"
            }
        }
    }


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """
    Get detailed processing job status with progress tracking
    """
    
    job = job_manager.get_job(job_id)
    if not job:
        logger.warning(f"🔍 Job not found: {job_id}")
        raise HTTPException(
            status_code=404, 
            detail=f"Job {job_id} not found. It may have been cleaned up or never existed."
        )
    
    # Add additional context for completed jobs
    response_data = job.dict()
    
    if job.status == ProcessingStatus.COMPLETED:
        response_data.update({
            "download_ready": True,
            "download_instructions": "Use the download_url to get your cleaned dataset",
            "download_url": f"/api/v1/download/{job_id}"  # ✅ Always include download URL when completed
        })
        logger.info(f"✅ Job status requested for completed job: {job_id}")
    elif job.status == ProcessingStatus.FAILED:
        response_data.update({
            "retry_allowed": True,
            "support_info": "Contact support if this error persists"
        })
        logger.warning(f"❌ Job status requested for failed job: {job_id}")
    elif job.status == ProcessingStatus.PROCESSING:
        response_data.update({
            "estimated_remaining": f"{max(0, 100 - job.progress):.0f}% remaining"
        })
        logger.info(f"🔄 Job status requested for processing job: {job_id} ({job.progress:.1f}%)")
    
    return response_data


@router.get("/jobs")
async def list_all_jobs(
    status: Optional[str] = Query(default=None, description="Filter by status: uploaded, processing, completed, failed"),
    limit: int = Query(default=50, ge=1, le=100, description="Maximum number of jobs to return")
):
    """
    List processing jobs with optional filtering (Admin/Debug endpoint)
    """
    
    all_jobs = job_manager.list_jobs()
    
    # Filter by status if provided
    if status:
        try:
            status_enum = ProcessingStatus(status.lower())
            filtered_jobs = {
                job_id: job for job_id, job in all_jobs.items() 
                if job.status == status_enum
            }
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Valid options: {[s.value for s in ProcessingStatus]}"
            )
    else:
        filtered_jobs = all_jobs
    
    # Limit results
    job_items = list(filtered_jobs.items())[:limit]
    
    return {
        "total_jobs": len(all_jobs),
        "filtered_jobs": len(filtered_jobs),
        "returned_jobs": len(job_items),
        "jobs": dict(job_items),
        "summary": {
            "uploaded": len([j for j in all_jobs.values() if j.status == ProcessingStatus.UPLOADED]),
            "processing": len([j for j in all_jobs.values() if j.status == ProcessingStatus.PROCESSING]),
            "completed": len([j for j in all_jobs.values() if j.status == ProcessingStatus.COMPLETED]),
            "failed": len([j for j in all_jobs.values() if j.status == ProcessingStatus.FAILED])
        }
    }


@router.get("/download/{job_id}")
async def download_cleaned_dataset(job_id: str):
    """
    Download processed and cleaned dataset as ZIP file
    """
    
    job = job_manager.get_job(job_id)
    if not job:
        logger.warning(f"🔍 Download requested for non-existent job: {job_id}")
        raise HTTPException(
            status_code=404,
            detail="Job not found or has been cleaned up"
        )
    
    if job.status != ProcessingStatus.COMPLETED:
        logger.warning(f"⏳ Download requested for incomplete job: {job_id} (status: {job.status.value})")
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed yet. Current status: {job.status.value}"
        )
    
    # Construct expected ZIP file path
    zip_filename = f"{job_id}_cleaned.zip"
    zip_path = os.path.join(settings.processed_dir, zip_filename)
    
    if not os.path.exists(zip_path):
        logger.error(f"📁 Download file not found: {zip_path}")
        raise HTTPException(
            status_code=404,
            detail="Cleaned dataset file not found. It may have been automatically cleaned up."
        )
    
    try:
        logger.info(f"📥 Download started for job: {job_id}")
        return FileResponse(
            path=zip_path,
            filename=f"cleaned_dataset_{job_id[:8]}.zip",
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=cleaned_dataset_{job_id[:8]}.zip"
            }
        )
    except Exception as e:
        logger.error(f"💥 Download failed for job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to serve download: {str(e)}"
        )


@router.delete("/job/{job_id}")
async def cancel_or_delete_job(job_id: str):
    """
    Cancel processing job or delete completed job with cleanup
    """
    
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )
    
    try:
        logger.info(f"🗑️ Deleting job: {job_id}")
        
        # Clean up files
        cleanup_success = upload_service.cleanup_job_files(job_id)
        
        # Mark as cancelled if processing
        if job.status == ProcessingStatus.PROCESSING:
            job_manager.update_job(
                job_id,
                status=ProcessingStatus.FAILED,
                message="Job cancelled by user",
                progress=0.0
            )
        
        # Remove from job manager
        job_manager.remove_job(job_id)
        
        logger.info(f"✅ Job {job_id} deleted successfully")
        
        return {
            "success": True,
            "message": f"Job {job_id} cancelled/deleted successfully",
            "files_cleaned": cleanup_success
        }
        
    except Exception as e:
        logger.error(f"💥 Failed to delete job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel/delete job: {str(e)}"
        )


@router.get("/stats")
async def get_system_stats():
    """
    Get system statistics and health information
    """
    
    try:
        all_jobs = job_manager.list_jobs()
        
        # Calculate storage usage
        upload_size = 0
        processed_size = 0
        
        if os.path.exists(settings.upload_dir):
            for root, dirs, files in os.walk(settings.upload_dir):
                upload_size += sum(os.path.getsize(os.path.join(root, file)) for file in files)
        
        if os.path.exists(settings.processed_dir):
            for root, dirs, files in os.walk(settings.processed_dir):
                processed_size += sum(os.path.getsize(os.path.join(root, file)) for file in files)
        
        # Calculate quality mode usage statistics
        quality_mode_usage = {}
        for job in all_jobs.values():
            mode = job.cleaning_options.quality_mode.value
            quality_mode_usage[mode] = quality_mode_usage.get(mode, 0) + 1
        
        return {
            "system_health": "healthy",
            "job_statistics": {
                "total_jobs": len(all_jobs),
                "active_jobs": len([j for j in all_jobs.values() if j.status == ProcessingStatus.PROCESSING]),
                "completed_jobs": len([j for j in all_jobs.values() if j.status == ProcessingStatus.COMPLETED]),
                "failed_jobs": len([j for j in all_jobs.values() if j.status == ProcessingStatus.FAILED])
            },
            "quality_mode_usage": quality_mode_usage,
            "storage_usage": {
                "upload_storage_mb": round(upload_size / (1024 * 1024), 2),
                "processed_storage_mb": round(processed_size / (1024 * 1024), 2),
                "total_storage_mb": round((upload_size + processed_size) / (1024 * 1024), 2)
            },
            "configuration": {
                "max_file_size_mb": settings.max_file_size / (1024 * 1024),
                "max_concurrent_jobs": settings.max_concurrent_jobs,
                "cleanup_interval_hours": settings.cleanup_interval_hours
            }
        }
        
    except Exception as e:
        logger.error(f"💥 System stats failed: {str(e)}")
        return {
            "system_health": "degraded",
            "error": str(e)
        }


# Helper function for expected retention rates
def _get_expected_retention_rate(quality_mode: QualityMode) -> str:
    """Get expected retention rate for quality mode"""
    rates = {
        QualityMode.STRICT: "75-85%",
        QualityMode.BALANCED: "85-95%", 
        QualityMode.LENIENT: "95-99%",
        QualityMode.CUSTOM: "Variable"
    }
    return rates.get(quality_mode, "Unknown")


# Enhanced background processing function with comprehensive error handling
async def process_dataset_background(file: UploadFile, job_id: str, file_content: bytes):
    """
    Enhanced background processing pipeline with quality mode support and error handling
    """
    
    def update_progress(progress: float, message: str):
        try:
            job_manager.update_job(job_id, progress=min(100.0, max(0.0, progress)), message=message)
        except Exception as e:
            logger.error(f"Failed to update progress for job {job_id}: {str(e)}")
    
    try:
        logger.info(f"🚀 Starting background processing for job: {job_id}")
        
        # Phase 1: File Saving (0-10%)
        job_manager.update_job(
            job_id, 
            status=ProcessingStatus.PROCESSING,
            message="🔄 Initializing processing...",
            progress=1.0
        )
        
        # Create job directory
        job_dir = os.path.join(settings.upload_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)
        
        # Save file using pre-read content
        update_progress(3.0, "💾 Saving uploaded file...")
        safe_filename = upload_service._sanitize_filename(file.filename)
        file_path = os.path.join(job_dir, safe_filename)
        
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        logger.info(f"📁 File saved: {file_path}")
        
        # Phase 2: Dataset Analysis (10-15%)
        update_progress(10.0, "🔍 Extracting and analyzing dataset...")
        dataset_info = upload_service.extract_and_analyze(file_path, job_id)
        
        # Get job to access quality mode
        job = job_manager.get_job(job_id)
        if not job:
            raise Exception("Job disappeared during processing")
        
        quality_mode = job.cleaning_options.quality_mode.value
        expected_retention = _get_expected_retention_rate(job.cleaning_options.quality_mode)
        
        job_manager.update_job(
            job_id,
            dataset_info=dataset_info,
            message=f"📊 Found {dataset_info.total_images} images ({dataset_info.file_size_mb:.1f}MB). Using {quality_mode} mode (expected retention: {expected_retention})...",
            progress=15.0
        )
        
        logger.info(f"📊 Dataset analyzed: {dataset_info.total_images} images, {dataset_info.file_size_mb:.1f}MB")
        
        # Phase 3: Image Cleaning Pipeline (15-95%)
        update_progress(20.0, f"🧹 Starting {quality_mode} quality cleaning...")
        
        # Run comprehensive cleaning with selected quality mode
        cleaning_results = await upload_service.process_with_cleaning(
            job_id, 
            job.cleaning_options, 
            update_progress
        )
        
        # Phase 4: Finalization (95-100%)
        update_progress(95.0, "📦 Finalizing cleaned dataset...")
        
        # Calculate improvement statistics
        improvement_stats = {
            "original_count": cleaning_results.get("original_count", 0),
            "final_count": cleaning_results.get("final_count", 0),
            "duplicates_removed": cleaning_results.get("duplicates_removed", 0),
            "low_quality_removed": cleaning_results.get("low_quality_removed", 0),
            "retention_rate": cleaning_results.get("retention_rate", 0),
            "quality_mode": cleaning_results.get("quality_mode_used", quality_mode)
        }
        
        # Success completion with quality mode info
        success_message = (
            f"✅ Dataset cleaned successfully using {quality_mode} mode! "
            f"Retained {improvement_stats['final_count']}/{improvement_stats['original_count']} images "
            f"({improvement_stats['retention_rate']:.1f}% retention rate)"
        )
        
        # ✅ Always include download URL when completing
        job_manager.update_job(
            job_id,
            status=ProcessingStatus.COMPLETED,
            message=success_message,
            progress=100.0,
            download_url=f"/api/v1/download/{job_id}"
        )
        
        logger.info(f"🎉 Job {job_id} completed successfully with {quality_mode} mode: {improvement_stats}")
        
    except Exception as e:
        # Comprehensive error handling
        error_message = f"❌ Processing failed: {str(e)}"
        logger.error(f"💥 Job {job_id} failed with error: {str(e)}")
        
        try:
            job_manager.update_job(
                job_id,
                status=ProcessingStatus.FAILED,
                message=error_message,
                progress=0.0
            )
        except Exception as update_error:
            logger.error(f"Failed to update job status for {job_id}: {str(update_error)}")
        
        try:
            # Clean up files on failure
            upload_service.cleanup_job_files(job_id)
            logger.info(f"🧹 Cleaned up files for failed job {job_id}")
        except Exception as cleanup_error:
            logger.error(f"⚠️ Failed to cleanup job {job_id}: {str(cleanup_error)}")


# Enhanced background processing for multiple files
async def process_multiple_files_background(files_content: List[tuple], job_id: str):
    """
    Process multiple individual files with quality mode support and error handling
    """
    
    def update_progress(progress: float, message: str):
        try:
            job_manager.update_job(job_id, progress=min(100.0, max(0.0, progress)), message=message)
        except Exception as e:
            logger.error(f"Failed to update progress for job {job_id}: {str(e)}")
    
    try:
        logger.info(f"🚀 Starting multiple files processing for job: {job_id}")
        
        job = job_manager.get_job(job_id)
        quality_mode = job.cleaning_options.quality_mode.value if job else "balanced"
        
        job_manager.update_job(
            job_id,
            status=ProcessingStatus.PROCESSING,
            message=f"🔄 Processing {len(files_content)} files with {quality_mode} mode...",
            progress=5.0
        )
        
        # Create job directory
        job_dir = os.path.join(settings.upload_dir, job_id)
        extract_dir = os.path.join(job_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        
        # Save all files
        update_progress(10.0, f"💾 Saving {len(files_content)} files...")
        
        for i, (file, content) in enumerate(files_content):
            safe_filename = upload_service._sanitize_filename(file.filename)
            file_path = os.path.join(extract_dir, safe_filename)
            
            with open(file_path, 'wb') as f:
                f.write(content)
            
            progress = 10.0 + (i / len(files_content)) * 10.0
            update_progress(progress, f"Saved {i+1}/{len(files_content)} files...")
        
        logger.info(f"📁 Saved {len(files_content)} files to {extract_dir}")
        
        # Continue with standard cleaning process
        update_progress(25.0, "🔍 Analyzing images...")
        dataset_info = upload_service._analyze_dataset(extract_dir)
        
        expected_retention = _get_expected_retention_rate(job.cleaning_options.quality_mode)
        job_manager.update_job(
            job_id,
            dataset_info=dataset_info,
            message=f"📊 Found {dataset_info.total_images} images. Using {quality_mode} mode (expected retention: {expected_retention})...",
            progress=30.0
        )
        
        # Run cleaning with quality mode
        cleaning_results = await upload_service.process_with_cleaning(
            job_id,
            job.cleaning_options,
            update_progress
        )
        
        # Complete
        success_message = (
            f"✅ Multiple files processed successfully with {quality_mode} mode! "
            f"Retained {cleaning_results['final_count']}/{cleaning_results['original_count']} images "
            f"({cleaning_results['retention_rate']:.1f}% retention rate)"
        )
        
        # ✅ Always include download URL when completing
        job_manager.update_job(
            job_id,
            status=ProcessingStatus.COMPLETED,
            message=success_message,
            progress=100.0,
            download_url=f"/api/v1/download/{job_id}"
        )
        
        logger.info(f"🎉 Multiple files job {job_id} completed successfully with {quality_mode} mode")
        
    except Exception as e:
        logger.error(f"💥 Multiple files job {job_id} failed: {str(e)}")
        
        try:
            job_manager.update_job(
                job_id,
                status=ProcessingStatus.FAILED,
                message=f"❌ Multiple files processing failed: {str(e)}",
                progress=0.0
            )
        except Exception as update_error:
            logger.error(f"Failed to update job status for {job_id}: {str(update_error)}")
        
        try:
            upload_service.cleanup_job_files(job_id)
            logger.info(f"🧹 Cleaned up files for failed multiple files job {job_id}")
        except Exception as cleanup_error:
            logger.error(f"⚠️ Failed to cleanup multiple files job {job_id}: {str(cleanup_error)}")
