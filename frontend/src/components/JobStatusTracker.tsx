import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader, 
  Download, 
  AlertCircle,
  Activity 
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService, { JobStatus } from '../services/api';
import { usePolling } from '../hooks/usePolling';

interface JobStatusTrackerProps {
  jobId: string;
  onComplete?: (job: JobStatus) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

const JobStatusTracker: React.FC<JobStatusTrackerProps> = ({
  jobId,
  onComplete,
  onError,
  autoStart = true
}) => {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(autoStart);

  // Fetch job status
  const fetchJobStatus = async () => {
    try {
      const status = await apiService.getJobStatus(jobId);
      setJob(status);
      setError(null);

      // Handle completion
      if (status.status === 'completed') {
        setIsPolling(false);
        toast.success('Dataset processing completed! 🎉');
        if (onComplete) {
          onComplete(status);
        }
      }

      // Handle failure
      if (status.status === 'failed') {
        setIsPolling(false);
        toast.error('Dataset processing failed');
        if (onError) {
          onError(status.message || 'Job failed');
        }
      }

    } catch (err: any) {
      console.error('Error fetching job status:', err);
      setError(err.response?.data?.detail || 'Failed to fetch job status');
      
      // Don't stop polling on temporary errors
      if (err.response?.status === 404) {
        setIsPolling(false);
        if (onError) {
          onError('Job not found');
        }
      }
    }
  };

  // Set up polling using our custom hook
  const { stop } = usePolling(fetchJobStatus, {
    interval: 2000, // Poll every 2 seconds
    enabled: isPolling,
    immediate: true
  });

  // Manual stop function
  const handleStop = () => {
    setIsPolling(false);
    stop();
  };

  // Get status icon
  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="w-6 h-6 text-red-500" />;
    }

    switch (job?.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'processing':
        return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'uploaded':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      default:
        return <Activity className="w-6 h-6 text-gray-400" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (error) return 'text-red-600 bg-red-50 border-red-200';

    switch (job?.status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'uploaded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Handle download
  const handleDownload = () => {
    if (job?.download_url) {
      const downloadUrl = apiService.getDownloadUrl(jobId);
      window.open(downloadUrl, '_blank');
      toast.success('Download started!');
    }
  };

  if (error && !job) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
          <div>
            <h3 className="font-medium text-gray-900">Loading</h3>
            <p className="text-gray-600 text-sm">Fetching job status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card border-2 ${getStatusColor()}`}>
      <div className="space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {job.status.replace('_', ' ')} 
                {isPolling && job.status === 'processing' && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Live
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600">
                Job ID: {jobId.slice(0, 8)}...
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {job.status === 'completed' && job.download_url && (
              <button
                onClick={handleDownload}
                className="btn-primary flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}

            {isPolling && (
              <button
                onClick={handleStop}
                className="btn-secondary text-sm"
              >
                Stop Tracking
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(job.progress)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                job.status === 'completed' 
                  ? 'bg-green-500' 
                  : job.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        {/* Current Message */}
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-sm text-gray-700 font-medium">
            {job.message}
          </p>
        </div>

        {/* Dataset Information */}
        {job.dataset_info && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {job.dataset_info.total_images}
              </p>
              <p className="text-xs text-gray-500">Images</p>
            </div>
            
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {job.dataset_info.file_size_mb.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">MB</p>
            </div>
            
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {job.dataset_info.formats.length}
              </p>
              <p className="text-xs text-gray-500">Formats</p>
            </div>
          </div>
        )}

        {/* Polling Indicator */}
        {isPolling && job.status === 'processing' && (
          <div className="flex items-center justify-center space-x-2 text-xs text-blue-600 pt-2 border-t">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Checking status every 2 seconds</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobStatusTracker;
