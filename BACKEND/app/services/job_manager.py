import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
from app.models.schemas import ProcessingJob, ProcessingStatus, CleaningOptions
from app.core.config import settings

class JobManager:
    """Thread-safe job management for processing tasks"""
    
    def __init__(self):
        self._jobs: Dict[str, ProcessingJob] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        
    async def create_job(self, cleaning_options: CleaningOptions) -> str:
        """Create a new processing job"""
        job_id = str(uuid.uuid4())
        
        job = ProcessingJob(
            job_id=job_id,
            status=ProcessingStatus.UPLOADED,
            created_at=datetime.now(),
            cleaning_options=cleaning_options,
            progress=0.0,
            message="Job created, ready for processing"
        )
        
        self._jobs[job_id] = job
        return job_id
    
    def get_job(self, job_id: str) -> Optional[ProcessingJob]:
        """Get job by ID"""
        return self._jobs.get(job_id)
    
    def update_job(self, job_id: str, **kwargs) -> bool:
        """Update job fields"""
        if job_id not in self._jobs:
            return False
            
        job = self._jobs[job_id]
        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)
        
        return True
    
    def list_jobs(self) -> Dict[str, ProcessingJob]:
        """List all jobs (for debugging)"""
        return self._jobs.copy()
    
    async def start_cleanup_task(self):
        """Start background cleanup of old jobs"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_old_jobs())
    
    async def _cleanup_old_jobs(self):
        """Background task to cleanup old completed jobs"""
        while True:
            try:
                cutoff_time = datetime.now() - timedelta(hours=settings.cleanup_interval_hours)
                
                jobs_to_remove = [
                    job_id for job_id, job in self._jobs.items()
                    if job.created_at < cutoff_time and 
                       job.status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]
                ]
                
                for job_id in jobs_to_remove:
                    del self._jobs[job_id]
                    print(f"🧹 Cleaned up old job: {job_id}")
                
                # Sleep for 1 hour before next cleanup
                await asyncio.sleep(3600)
                
            except Exception as e:
                print(f"❌ Cleanup task error: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error

# Global job manager instance
job_manager = JobManager()
