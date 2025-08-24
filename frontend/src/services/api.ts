import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for file uploads
});

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export interface UploadResponse {
  success: boolean;
  job_id: string;
  message: string;
  quality_mode: string;
  quality_description: string;
  expected_retention_rate: string;
  status_url: string;
  estimated_time: string;
  download_url?: string; // Added for completed jobs
}

export interface JobStatus {
  job_id: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  download_url?: string; // ✅ Key field for download functionality
  download_ready?: boolean;
  dataset_info?: {
    total_images: number;
    file_size_mb: number;
    formats: string[];
  };
  cleaning_options?: any;
}

export const apiService = {
  // Upload dataset with options
  uploadDataset: async (
    file: File, 
    options: {
      quality_mode?: string;
      remove_duplicates?: boolean;
      resize_images?: boolean;
      target_width?: number;
      target_height?: number;
      normalize_format?: boolean;
      target_format?: string;
    } = {}
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add options as query parameters
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.post(`/api/v1/upload?${params}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data;
  },

  // Get job status
  getJobStatus: async (jobId: string): Promise<JobStatus> => {
    const response = await api.get(`/api/v1/job/${jobId}`);
    return response.data;
  },

  // Get download URL
  getDownloadUrl: (jobId: string): string => {
    return `${API_BASE_URL}/api/v1/download/${jobId}`;
  },

  // Get quality modes info
  getQualityModes: async () => {
    const response = await api.get('/api/v1/quality-modes');
    return response.data;
  },

  // List all jobs
  listJobs: async () => {
    const response = await api.get('/api/v1/jobs');
    return response.data;
  },

  // Delete job
  deleteJob: async (jobId: string) => {
    const response = await api.delete(`/api/v1/job/${jobId}`);
    return response.data;
  },

  // Get system stats
  getSystemStats: async () => {
    const response = await api.get('/api/v1/stats');
    return response.data;
  },
};

export default apiService;
