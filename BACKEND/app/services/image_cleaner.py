import imagehash
from PIL import Image, ImageFilter, ImageStat
import cv2
import numpy as np
import os
import shutil
import zipfile
from typing import List, Tuple, Dict, Set
from app.models.schemas import CleaningOptions, QualityMode
from app.core.config import settings

class ImageCleaner:
    """
    Professional-grade image cleaning with user-selectable quality modes
    """
    
    def __init__(self, cleaning_options: CleaningOptions):
        self.options = cleaning_options
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        
        # Quality presets for different use cases
        self.quality_presets = {
            QualityMode.STRICT: {
                "blur_threshold": 500,
                "min_brightness": 10,
                "max_brightness": 245,
                "description": "High-precision cleaning for medical/scientific imaging"
            },
            QualityMode.BALANCED: {
                "blur_threshold": 100,
                "min_brightness": 5,
                "max_brightness": 250,
                "description": "Balanced approach for general machine learning datasets"
            },
            QualityMode.LENIENT: {
                "blur_threshold": 50,
                "min_brightness": 2,
                "max_brightness": 253,
                "description": "Preserve maximum data, remove only clearly corrupted images"
            }
        }
        
        # Get quality thresholds based on selected mode
        self.thresholds = self._get_quality_thresholds()
        
    def _get_quality_thresholds(self) -> Dict[str, float]:
        """Get quality thresholds based on user selection"""
        if self.options.quality_mode == QualityMode.CUSTOM:
            # Use custom parameters if provided
            return {
                "blur_threshold": self.options.custom_blur_threshold or 100,
                "min_brightness": self.options.custom_min_brightness or 5,
                "max_brightness": self.options.custom_max_brightness or 250
            }
        else:
            return self.quality_presets.get(
                self.options.quality_mode, 
                self.quality_presets[QualityMode.BALANCED]
            )
    
    def clean_dataset(self, job_id: str, progress_callback=None) -> Dict[str, any]:
        """Main cleaning pipeline with progress tracking"""
        
        job_dir = os.path.join(settings.upload_dir, job_id)
        extract_dir = os.path.join(job_dir, "extracted")
        output_dir = os.path.join(settings.processed_dir, job_id)
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Step 1: Collect all image files
        if progress_callback:
            progress_callback(10, f"🔍 Scanning for images (Mode: {self.options.quality_mode.value})...")
            
        image_paths = self._collect_image_paths(extract_dir)
        total_images = len(image_paths)
        
        if total_images == 0:
            raise ValueError("No valid images found in dataset")
        
        # Step 2: Duplicate detection (if enabled)
        unique_images = image_paths
        duplicates_removed = 0
        
        if self.options.remove_duplicates:
            if progress_callback:
                progress_callback(25, "🔍 Detecting duplicates...")
            unique_images, duplicates_removed = self._remove_duplicates(image_paths, progress_callback)
        
        # Step 3: Quality filtering
        if progress_callback:
            quality_desc = self.quality_presets[self.options.quality_mode]["description"]
            progress_callback(50, f"📊 Quality filtering ({quality_desc})...")
        high_quality_images, low_quality_removed = self._filter_quality(unique_images, progress_callback)
        
        # Step 4: Process and standardize remaining images
        if progress_callback:
            progress_callback(75, "🔄 Processing and standardizing...")
        final_images = self._process_images(high_quality_images, output_dir, progress_callback)
        
        # Step 5: Create output ZIP
        if progress_callback:
            progress_callback(90, "📦 Creating download package...")
        zip_path = self._create_output_zip(output_dir, job_id)
        
        if progress_callback:
            retention_rate = (len(final_images) / total_images) * 100
            progress_callback(100, f"✅ Cleaning completed! Retained {retention_rate:.1f}% of images")
        
        # Return cleaning statistics
        return {
            "original_count": total_images,
            "duplicates_removed": duplicates_removed,
            "low_quality_removed": low_quality_removed,
            "final_count": len(final_images),
            "cleaning_rate": round((1 - len(final_images) / total_images) * 100, 1),
            "retention_rate": round((len(final_images) / total_images) * 100, 1),
            "quality_mode_used": self.options.quality_mode.value,
            "output_zip": zip_path,
            "cleaned_images": final_images
        }
    
    def _collect_image_paths(self, directory: str) -> List[str]:
        """Recursively collect all image file paths"""
        image_paths = []
        
        for root, dirs, files in os.walk(directory):
            for file in files:
                if any(file.lower().endswith(ext) for ext in self.supported_formats):
                    image_paths.append(os.path.join(root, file))
                    
        return image_paths
    
    def _remove_duplicates(self, image_paths: List[str], progress_callback=None) -> Tuple[List[str], int]:
        """Remove duplicate images using perceptual hashing"""
        unique_hashes: Set[str] = set()
        unique_images: List[str] = []
        duplicates_count = 0
        
        for i, path in enumerate(image_paths):
            if progress_callback and i % 10 == 0:
                progress = 25 + (i / len(image_paths)) * 20
                progress_callback(progress, f"🔍 Checking duplicates... {i}/{len(image_paths)}")
            
            try:
                with Image.open(path) as img:
                    # Use perceptual hash for duplicate detection
                    img_hash = str(imagehash.phash(img, hash_size=16))
                    
                    if img_hash not in unique_hashes:
                        unique_hashes.add(img_hash)
                        unique_images.append(path)
                    else:
                        duplicates_count += 1
                        
            except Exception as e:
                print(f"Error processing {path} for duplicates: {e}")
                duplicates_count += 1
                
        return unique_images, duplicates_count
    
    def _filter_quality(self, image_paths: List[str], progress_callback=None) -> Tuple[List[str], int]:
        """Filter out low-quality images based on selected quality mode"""
        high_quality_images: List[str] = []
        low_quality_count = 0
        
        for i, path in enumerate(image_paths):
            if progress_callback and i % 5 == 0:
                progress = 50 + (i / len(image_paths)) * 20
                progress_callback(progress, f"📊 Quality check... {i}/{len(image_paths)}")
            
            try:
                with Image.open(path) as img:
                    # Basic size checks (if enabled)
                    if self.options.remove_tiny_images:
                        if img.size[0] < 64 or img.size[1] < 64:
                            low_quality_count += 1
                            continue
                    
                    # Aspect ratio check (if enabled)
                    if self.options.remove_stretched_images:
                        aspect_ratio = max(img.size) / min(img.size)
                        if aspect_ratio > 10:  # Too stretched
                            low_quality_count += 1
                            continue
                    
                    # Quality-mode specific checks
                    if self._is_blurry(img):
                        low_quality_count += 1
                        continue
                    
                    if self._is_too_dark_or_bright(img):
                        low_quality_count += 1
                        continue
                    
                    high_quality_images.append(path)
                    
            except Exception as e:
                print(f"Error processing {path} for quality: {e}")
                low_quality_count += 1
                
        return high_quality_images, low_quality_count
    
    def _is_blurry(self, image: Image.Image) -> bool:
        """Detect blurry images using quality-mode specific threshold"""
        try:
            # Convert to OpenCV format
            img_array = np.array(image.convert('L'))
            
            # Calculate Laplacian variance (higher = sharper)
            laplacian_var = cv2.Laplacian(img_array, cv2.CV_64F).var()
            
            # Use quality-mode specific threshold
            return laplacian_var < self.thresholds["blur_threshold"]
        except Exception:
            return False
    
    def _is_too_dark_or_bright(self, image: Image.Image) -> bool:
        """Check brightness using quality-mode specific thresholds"""
        try:
            # Calculate mean brightness
            stat = ImageStat.Stat(image.convert('L'))
            mean_brightness = stat.mean[0]
            
            # Use quality-mode specific brightness thresholds
            return (mean_brightness < self.thresholds["min_brightness"] or 
                   mean_brightness > self.thresholds["max_brightness"])
        except Exception:
            return False
    
    def _process_images(self, image_paths: List[str], output_dir: str, progress_callback=None) -> List[str]:
        """Process and standardize images"""
        processed_images: List[str] = []
        
        for i, path in enumerate(image_paths):
            if progress_callback and i % 3 == 0:
                progress = 75 + (i / len(image_paths)) * 10
                progress_callback(progress, f"🔄 Processing... {i}/{len(image_paths)}")
            
            try:
                with Image.open(path) as img:
                    # Convert to RGB if necessary
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    
                    # Resize if requested
                    if self.options.resize_images and self.options.target_size:
                        img = img.resize(self.options.target_size, Image.Resampling.LANCZOS)
                    
                    # Generate output filename
                    base_name = os.path.splitext(os.path.basename(path))[0]
                    if self.options.normalize_format:
                        ext = '.jpg' if self.options.target_format.upper() == 'JPEG' else f'.{self.options.target_format.lower()}'
                    else:
                        ext = os.path.splitext(path)[1]
                    
                    output_path = os.path.join(output_dir, f"{base_name}{ext}")
                    
                    # Save processed image
                    save_format = self.options.target_format if self.options.normalize_format else img.format
                    
                    # JPEG quality optimization
                    save_kwargs = {}
                    if save_format.upper() == 'JPEG':
                        save_kwargs['quality'] = 95
                        save_kwargs['optimize'] = True
                    
                    img.save(output_path, format=save_format, **save_kwargs)
                    processed_images.append(output_path)
                    
            except Exception as e:
                print(f"Error processing {path}: {e}")
                
        return processed_images
    
    def _create_output_zip(self, output_dir: str, job_id: str) -> str:
        """Create ZIP file of cleaned images"""
        zip_path = os.path.join(settings.processed_dir, f"{job_id}_cleaned.zip")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    if not file.endswith('.zip'):
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, output_dir)
                        zipf.write(file_path, arcname)
        
        return zip_path
