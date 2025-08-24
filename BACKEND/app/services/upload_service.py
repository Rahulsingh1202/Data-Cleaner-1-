import os
import uuid
import zipfile
import shutil
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
from app.core.config import settings
from app.models.schemas import DatasetInfo
from app.services.image_cleaner import ImageCleaner
from PIL import Image
import aiofiles

class UploadService:
    """
    Professional file upload service with dataset analysis and cleaning
    FIXED: Robust error handling for tuple index errors and corrupted files
    """
    
    def __init__(self):
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        self.max_file_size = settings.max_file_size
        
    async def save_upload_file(self, upload_file: UploadFile, file_content: bytes = None) -> tuple[str, str]:
        """
        Save uploaded file with proper error handling and validation
        FIXED: Handles pre-read file content to avoid FastAPI file closure
        Returns: (job_id, file_path)
        """
        
        # Validate file existence
        if not upload_file.filename:
            raise HTTPException(400, "No file provided")
        
        # Validate file size
        if file_content and len(file_content) > self.max_file_size:
            size_mb = len(file_content) / (1024 * 1024)
            limit_mb = self.max_file_size / (1024 * 1024)
            raise HTTPException(400, f"File size ({size_mb:.1f}MB) exceeds limit ({limit_mb:.1f}MB)")
        
        # Validate file type
        if not self._is_supported_file(upload_file.filename):
            raise HTTPException(400, 
                "Unsupported file type. Please upload ZIP files or image files (JPEG, PNG, BMP, TIFF, WebP)")
        
        # Generate unique job ID and create job directory
        job_id = str(uuid.uuid4())
        job_dir = os.path.join(settings.upload_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)
        
        # Create file path
        safe_filename = self._sanitize_filename(upload_file.filename)
        file_path = os.path.join(job_dir, safe_filename)
        
        try:
            # Use pre-read content if available, otherwise read from file
            if file_content is not None:
                with open(file_path, 'wb') as f:
                    f.write(file_content)
            else:
                # Fallback for direct calls without pre-read content
                async with aiofiles.open(file_path, 'wb') as f:
                    while chunk := await upload_file.read(8192):
                        await f.write(chunk)
                    
        except Exception as e:
            # Cleanup on failure
            if os.path.exists(job_dir):
                shutil.rmtree(job_dir)
            raise HTTPException(500, f"Failed to save file: {str(e)}")
        
        return job_id, file_path
    
    def extract_and_analyze(self, file_path: str, job_id: str) -> DatasetInfo:
        """
        Extract uploaded file (if ZIP) and analyze dataset characteristics
        FIXED: Enhanced error handling for corrupted or empty archives
        """
        job_dir = os.path.join(settings.upload_dir, job_id)
        extract_dir = os.path.join(job_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        
        try:
            # Verify file exists and is readable
            if not os.path.exists(file_path):
                raise Exception(f"Uploaded file not found: {file_path}")
            
            if os.path.getsize(file_path) == 0:
                raise Exception("Uploaded file is empty")
            
            # Handle ZIP files
            if file_path.lower().endswith('.zip'):
                self._extract_zip_file(file_path, extract_dir)
            else:
                # Handle single image files
                shutil.copy2(file_path, extract_dir)
            
            # Verify extraction worked
            if not os.listdir(extract_dir):
                raise Exception("No files were extracted from the archive")
            
            # Analyze extracted content
            return self._analyze_dataset(extract_dir)
            
        except Exception as e:
            raise Exception(f"Failed to extract and analyze dataset: {str(e)}")
    
    async def process_with_cleaning(self, job_id: str, cleaning_options, progress_callback=None) -> Dict[str, Any]:
        """
        Process dataset with advanced cleaning algorithms
        """
        try:
            cleaner = ImageCleaner(cleaning_options)
            results = cleaner.clean_dataset(job_id, progress_callback)
            return results
            
        except Exception as e:
            raise Exception(f"Cleaning failed: {str(e)}")
    
    def _is_supported_file(self, filename: str) -> bool:
        """Check if file type is supported"""
        if not filename:
            return False
            
        filename_lower = filename.lower()
        
        # Support ZIP files
        if filename_lower.endswith('.zip'):
            return True
            
        # Support image files
        return any(filename_lower.endswith(ext) for ext in self.supported_formats)
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent directory traversal and other issues"""
        # Remove path components
        filename = os.path.basename(filename)
        
        # Remove or replace dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        for char in dangerous_chars:
            filename = filename.replace(char, '_')
        
        # Limit filename length
        name, ext = os.path.splitext(filename)
        if len(name) > 100:
            name = name[:100]
        
        return name + ext
    
    def _extract_zip_file(self, zip_path: str, extract_dir: str) -> None:
        """
        Safely extract ZIP file with comprehensive security checks
        FIXED: Enhanced validation and error handling
        """
        try:
            # Verify ZIP file integrity first
            if not zipfile.is_zipfile(zip_path):
                raise Exception("File is not a valid ZIP archive")
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # Security and integrity checks
                total_size = 0
                file_count = 0
                
                for file_info in zip_ref.filelist:
                    # Check for directory traversal attempts
                    if (os.path.isabs(file_info.filename) or 
                        ".." in file_info.filename or
                        file_info.filename.startswith('/')):
                        print(f"Skipping unsafe path: {file_info.filename}")
                        continue
                    
                    # Check total uncompressed size (prevent zip bombs)
                    total_size += file_info.file_size
                    if total_size > self.max_file_size * 10:  # Allow 10x expansion
                        raise Exception("ZIP archive too large when uncompressed (potential zip bomb)")
                    
                    file_count += 1
                    if file_count > 10000:  # Reasonable limit
                        raise Exception("ZIP archive contains too many files")
                
                if file_count == 0:
                    raise Exception("ZIP archive is empty or contains no extractable files")
                
                # Extract safe files only
                extracted_count = 0
                for file_info in zip_ref.filelist:
                    try:
                        if (not os.path.isabs(file_info.filename) and 
                            ".." not in file_info.filename and
                            not file_info.filename.startswith('/')):
                            
                            # Extract directories and supported image files
                            if (file_info.filename.endswith('/') or  # Directory
                                any(file_info.filename.lower().endswith(ext) for ext in self.supported_formats)):
                                
                                zip_ref.extract(file_info, extract_dir)
                                if not file_info.filename.endswith('/'):
                                    extracted_count += 1
                                    
                    except Exception as extract_error:
                        print(f"Failed to extract {file_info.filename}: {str(extract_error)}")
                        continue
                
                if extracted_count == 0:
                    raise Exception("No supported image files found in ZIP archive")
                    
                print(f"Successfully extracted {extracted_count} files from ZIP archive")
                            
        except zipfile.BadZipFile:
            raise Exception("Corrupted or invalid ZIP file")
        except zipfile.LargeZipFile:
            raise Exception("ZIP file is too large (>4GB)")
        except PermissionError:
            raise Exception("Permission denied accessing ZIP file")
        except Exception as e:
            if "potential zip bomb" in str(e) or "too many files" in str(e) or "empty" in str(e):
                raise e
            else:
                raise Exception(f"Failed to extract ZIP file: {str(e)}")
    
    def _analyze_dataset(self, directory: str) -> DatasetInfo:
        """
        Analyze dataset characteristics with comprehensive error handling
        FIXED: Robust handling of corrupted images and tuple access errors
        """
        image_files = []
        formats = set()
        total_size = 0
        resolutions = []
        
        if not os.path.exists(directory):
            raise Exception(f"Analysis directory does not exist: {directory}")
        
        # Recursively scan directory for images
        for root, dirs, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                
                # Check if it's a supported image format by extension
                if any(file.lower().endswith(ext) for ext in self.supported_formats):
                    try:
                        # Verify it's actually a readable image
                        with Image.open(file_path) as img:
                            # Verify image has valid properties
                            if not hasattr(img, 'size'):
                                print(f"Skipping image without size property: {file_path}")
                                continue
                            
                            # Verify size is a valid tuple with 2 elements
                            if not isinstance(img.size, tuple) or len(img.size) != 2:
                                print(f"Skipping image with invalid size: {file_path} - size: {getattr(img, 'size', 'None')}")
                                continue
                            
                            # Verify dimensions are positive integers
                            width, height = img.size
                            if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
                                print(f"Skipping image with invalid dimensions: {file_path} - {width}x{height}")
                                continue
                            
                            # If we get here, the image is valid
                            image_files.append(file_path)
                            
                            # Collect format information
                            file_ext = os.path.splitext(file)[1].lower()
                            formats.add(file_ext)
                            
                            # Get file size safely
                            try:
                                file_size = os.path.getsize(file_path)
                                total_size += file_size
                            except OSError:
                                print(f"Could not get size for: {file_path}")
                                continue
                            
                            # Collect resolution information
                            resolutions.append(img.size)
                            
                    except Exception as e:
                        # Skip corrupted, unreadable, or invalid image files
                        print(f"Skipping invalid image {file_path}: {str(e)}")
                        continue
        
        # Verify we found at least one valid image
        if not image_files:
            raise Exception("No valid images found in dataset. Please check your files and try again.")
        
        # Calculate average resolution safely
        avg_resolution = None
        if resolutions:
            try:
                avg_width = sum(r[0] for r in resolutions) / len(resolutions)
                avg_height = sum(r[11] for r in resolutions) / len(resolutions)
                avg_resolution = (int(avg_width), int(avg_height))
            except Exception as e:
                print(f"Could not calculate average resolution: {str(e)}")
                avg_resolution = None
        
        # Convert total size to MB
        total_size_mb = total_size / (1024 * 1024)
        
        return DatasetInfo(
            total_images=len(image_files),
            file_size_mb=round(total_size_mb, 2),
            formats=sorted(list(formats)),
            avg_resolution=avg_resolution
        )
    
    def get_job_directory(self, job_id: str) -> str:
        """Get the directory path for a specific job"""
        return os.path.join(settings.upload_dir, job_id)
    
    def get_processed_directory(self, job_id: str) -> str:
        """Get the processed directory path for a specific job"""
        return os.path.join(settings.processed_dir, job_id)
    
    def cleanup_job_files(self, job_id: str) -> bool:
        """
        Clean up all files associated with a job
        """
        try:
            # Remove upload directory
            upload_dir = self.get_job_directory(job_id)
            if os.path.exists(upload_dir):
                shutil.rmtree(upload_dir)
            
            # Remove processed directory
            processed_dir = self.get_processed_directory(job_id)
            if os.path.exists(processed_dir):
                shutil.rmtree(processed_dir)
            
            # Remove processed ZIP file
            zip_path = os.path.join(settings.processed_dir, f"{job_id}_cleaned.zip")
            if os.path.exists(zip_path):
                os.remove(zip_path)
            
            return True
            
        except Exception as e:
            print(f"Failed to cleanup job {job_id}: {str(e)}")
            return False
    
    def get_dataset_stats(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive statistics about a dataset
        """
        try:
            extract_dir = os.path.join(self.get_job_directory(job_id), "extracted")
            if not os.path.exists(extract_dir):
                return None
            
            dataset_info = self._analyze_dataset(extract_dir)
            
            return {
                "total_images": dataset_info.total_images,
                "total_size_mb": dataset_info.file_size_mb,
                "formats": dataset_info.formats,
                "avg_resolution": dataset_info.avg_resolution,
                "directory_path": extract_dir
            }
            
        except Exception as e:
            print(f"Failed to get dataset stats for job {job_id}: {str(e)}")
            return None

# Global upload service instance
upload_service = UploadService()
