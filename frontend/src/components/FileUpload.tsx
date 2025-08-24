import React, { useState, useRef } from 'react';
import { Upload, File, X, Check, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService, { UploadResponse } from '../services/api';

interface FileUploadProps {
  onUploadSuccess?: (response: UploadResponse) => void;
  onUploadError?: (error: string) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  qualityMode?: string; // ✅ New prop for quality mode
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  acceptedTypes = ".zip,.jpg,.jpeg,.png,.bmp,.tiff,.webp",
  maxSize = 1024, // 1GB default
  qualityMode = 'balanced' // ✅ Default quality mode
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Validate and set file
  const handleFileSelect = (file: File) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      toast.error('Please select a supported file type');
      return;
    }

    setSelectedFile(file);
    toast.success('File selected successfully!');
  };

  // Upload file to API with quality mode
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    const uploadingToast = toast.loading('Uploading dataset...');

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // ✅ Pass qualityMode as option in upload call
      const response = await apiService.uploadDataset(selectedFile, { 
        quality_mode: qualityMode,
        remove_duplicates: true,
        normalize_format: true,
        target_format: 'JPEG'
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.dismiss(uploadingToast);
      toast.success('Upload successful! Processing started.');
      
      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }

    } catch (error: any) {
      toast.dismiss(uploadingToast);
      
      const errorMessage = error.response?.data?.detail || 'Upload failed. Please try again.';
      toast.error(errorMessage);
      
      // Call error callback
      if (onUploadError) {
        onUploadError(errorMessage);
      }
      
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clear selection
  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Open file picker
  const openFilePicker = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFilePicker}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes}
          onChange={handleFileChange}
          disabled={uploading}
        />

        {!selectedFile ? (
          // Upload prompt
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload your dataset
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop your file here, or click to browse
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openFilePicker();
                }}
                disabled={uploading}
              >
                Choose File
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>Supported: ZIP, JPG, PNG, BMP, TIFF, WebP</p>
              <p>Maximum size: {maxSize}MB</p>
            </div>
          </div>
        ) : (
          // Selected file display
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                File Selected
              </h3>
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <File className="w-6 h-6 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  
                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center space-x-3 mb-3">
            <Loader className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="font-medium text-gray-900">Uploading...</span>
            <span className="text-sm text-gray-500">({uploadProgress}%)</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Please wait while we upload and analyze your dataset...
          </p>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !uploading && (
        <div className="text-center">
          <button
            onClick={handleUpload}
            className="btn-primary text-lg px-8 py-3"
            disabled={uploading}
          >
            Start Processing Dataset 🚀
          </button>
          
          <p className="text-sm text-gray-500 mt-2">
            Using <strong className="capitalize">{qualityMode}</strong> quality mode
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
