import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ArrowLeft, Download, CheckCircle, Clock, AlertTriangle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import FileUpload from '../components/FileUpload';
import { UploadResponse, JobStatus } from '../services/api';
import apiService from '../services/api';

const qualityModes = [
  { 
    label: 'Strict', 
    value: 'strict',
    description: 'Removes 15-25% of images. Best for high-precision applications.',
    icon: '🔴',
    retention: '75-85%'
  },
  { 
    label: 'Balanced', 
    value: 'balanced',
    description: 'Removes 5-15% of images. Good balance for most applications.',
    icon: '🟡',
    retention: '85-95%'
  },
  { 
    label: 'Lenient', 
    value: 'lenient',
    description: 'Removes 1-5% of images. Keeps most data for training.',
    icon: '🟢',
    retention: '95-99%'
  },
  { 
    label: 'Custom', 
    value: 'custom',
    description: 'Use your own quality parameters for fine-tuned control.',
    icon: '⚙️',
    retention: 'Variable'
  },
];

const System: React.FC = () => {
  const [uploadedJob, setUploadedJob] = useState<UploadResponse | null>(null);
  const [currentJobStatus, setCurrentJobStatus] = useState<JobStatus | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [selectedQualityMode, setSelectedQualityMode] = useState('balanced');
  const [showQualitySelector, setShowQualitySelector] = useState(false);

  const handleUploadSuccess = (response: UploadResponse) => {
    setUploadedJob(response);
    setShowUploadForm(false);
    setCurrentJobStatus(null);
    setSelectedQualityMode(response.quality_mode || 'balanced');
    console.log('Upload successful:', response);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
  };

  const startNewUpload = () => {
    setUploadedJob(null);
    setCurrentJobStatus(null);
    setShowUploadForm(true);
    setSelectedQualityMode('balanced');
    setShowQualitySelector(false);
  };

  const handleQualityModeChange = (mode: string) => {
    setSelectedQualityMode(mode);
    toast.success(`Quality mode changed to ${mode}`);
  };

  const handleCheckForDownload = async () => {
    if (!uploadedJob) return;
    
    setCheckingStatus(true);
    
    try {
      const status = await apiService.getJobStatus(uploadedJob.job_id);
      setCurrentJobStatus(status);
      
      if (status.status === 'completed' && status.download_url) {
        toast.success('Your dataset is ready for download! 🎉');
      } else if (status.status === 'failed') {
        toast.error('Processing failed: ' + status.message);
      } else {
        toast.loading(`Status: ${status.status} (${Math.round(status.progress)}% complete)`, {
          duration: 3000
        });
      }
    } catch (error) {
      toast.error('Could not check status. Please try again later.');
      console.error('Status check error:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDownload = () => {
    if (uploadedJob && currentJobStatus?.download_url) {
      const fullDownloadUrl = apiService.getDownloadUrl(uploadedJob.job_id);
      console.log('Starting download:', fullDownloadUrl);
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = fullDownloadUrl;
      link.download = `cleaned_dataset_${uploadedJob.job_id.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started! 📥');
    }
  };

  const selectedMode = qualityModes.find(mode => mode.value === selectedQualityMode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      {/* Navigation */}
      <div className="container mx-auto px-4 mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎯 Dataset Cleaning System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your image dataset and let our AI-powered system clean and optimize it for machine learning.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          {showUploadForm ? (
            <div className="card">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                Upload Your Dataset
              </h2>
              
              {/* Pre-upload Quality Mode Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  Select Quality Mode
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {qualityModes.map((mode) => (
                    <div
                      key={mode.value}
                      onClick={() => setSelectedQualityMode(mode.value)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedQualityMode === mode.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">{mode.icon}</div>
                        <h4 className="font-medium text-gray-900 mb-1">{mode.label}</h4>
                        <p className="text-xs text-gray-600 mb-2">{mode.retention} retention</p>
                        <p className="text-xs text-gray-500">{mode.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <FileUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                maxSize={1024}
                qualityMode={selectedQualityMode}
              />

              {/* Instructions */}
              <div className="mt-8 bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">📋 Instructions:</h3>
                <ul className="text-blue-800 space-y-2 list-disc list-inside">
                  <li>Upload a ZIP file containing your image dataset</li>
                  <li>Supported formats: JPG, PNG, BMP, TIFF, WebP</li>
                  <li>Maximum file size: 1GB</li>
                  <li>Processing typically takes 2-10 minutes depending on dataset size</li>
                  <li>You'll receive a download link once processing is complete</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Success Message & Status Tracking */
            <div className="space-y-6">
              {/* Upload Success Card */}
              <div className="card bg-green-50 border-green-200">
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold text-green-900 mb-4">
                      🎉 Upload Successful!
                    </h3>
                    <p className="text-lg text-green-800 mb-2">
                      {uploadedJob?.message || 'Your dataset has been uploaded successfully!'}
                    </p>
                    <p className="text-green-700">
                      Processing has started in the background. Check status below to see when your cleaned dataset is ready.
                    </p>
                  </div>

                  {/* Quality Mode Display & Change Button */}
                  <div className="bg-white rounded-lg p-6 border">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Current Quality Mode</h4>
                      <button
                        onClick={() => setShowQualitySelector(!showQualitySelector)}
                        className="btn-secondary flex items-center space-x-2 text-sm px-4 py-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Change Quality Mode</span>
                      </button>
                    </div>

                    {/* Current Quality Mode Info */}
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="text-2xl">{selectedMode?.icon}</div>
                      <div>
                        <h5 className="font-medium text-gray-900">{selectedMode?.label} Mode</h5>
                        <p className="text-sm text-gray-600">{selectedMode?.description}</p>
                        <p className="text-sm text-green-600">Expected retention: {selectedMode?.retention}</p>
                      </div>
                    </div>

                    {/* Quality Mode Selector (Collapsible) */}
                    {showQualitySelector && (
                      <div className="pt-4 border-t">
                        <h5 className="font-medium text-gray-900 mb-3">Select Different Quality Mode:</h5>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {qualityModes.map((mode) => (
                            <div
                              key={mode.value}
                              onClick={() => {
                                handleQualityModeChange(mode.value);
                                setShowQualitySelector(false);
                              }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                selectedQualityMode === mode.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-center">
                                <div className="text-xl mb-1">{mode.icon}</div>
                                <h6 className="font-medium text-gray-900 text-sm">{mode.label}</h6>
                                <p className="text-xs text-gray-600">{mode.retention}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Job Details */}
                  {uploadedJob && (
                    <div className="bg-white rounded-lg p-6 border">
                      <h4 className="font-semibold text-gray-900 mb-4">Processing Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Job ID:</span>
                          <span className="font-mono text-gray-900">
                            {uploadedJob.job_id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quality Mode:</span>
                          <span className="font-medium text-gray-900 capitalize">
                            {selectedQualityMode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected Retention:</span>
                          <span className="font-medium text-green-600">
                            {uploadedJob.expected_retention_rate}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Time:</span>
                          <span className="font-medium text-blue-600">
                            {uploadedJob.estimated_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Check Button */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleCheckForDownload}
                      disabled={checkingStatus}
                      className="btn-primary px-8 py-3 flex items-center justify-center"
                    >
                      {checkingStatus ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Checking Status...
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5 mr-2" />
                          Check if Ready for Download
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={startNewUpload}
                      className="btn-secondary px-8 py-3"
                    >
                      Process Another Dataset 📁
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Job Status Display */}
              {currentJobStatus && (
                <div className={`card border-2 ${
                  currentJobStatus.status === 'completed' 
                    ? 'border-green-200 bg-green-50' 
                    : currentJobStatus.status === 'failed'
                    ? 'border-red-200 bg-red-50'
                    : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="space-y-4">
                    {/* Status Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {currentJobStatus.status === 'completed' ? (
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        ) : currentJobStatus.status === 'failed' ? (
                          <AlertTriangle className="w-8 h-8 text-red-500" />
                        ) : (
                          <Clock className="w-8 h-8 text-blue-500" />
                        )}
                        
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 capitalize">
                            {currentJobStatus.status === 'completed' 
                              ? '✅ Processing Complete!' 
                              : currentJobStatus.status === 'failed'
                              ? '❌ Processing Failed'
                              : `🔄 ${currentJobStatus.status}`
                            }
                          </h3>
                          <p className="text-gray-600">
                            Job ID: {currentJobStatus.job_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>

                      {/* Download Button - Only show when completed and download_url exists */}
                      {currentJobStatus.status === 'completed' && currentJobStatus.download_url && (
                        <button
                          onClick={() => {
                            const fullDownloadUrl = apiService.getDownloadUrl(currentJobStatus.job_id);
                            window.open(fullDownloadUrl, '_blank');
                            toast.success('Download started! 📥');
                          }}
                          className="btn-primary bg-green-600 hover:bg-green-700 flex items-center space-x-2 px-6 py-3 text-lg"
                        >
                          <Download className="w-5 h-5" />
                          <span>Download Cleaned Dataset</span>
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{Math.round(currentJobStatus.progress)}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            currentJobStatus.status === 'completed' 
                              ? 'bg-green-500' 
                              : currentJobStatus.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${currentJobStatus.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-gray-700 font-medium">
                        {currentJobStatus.message}
                      </p>
                    </div>

                    {/* Dataset Info */}
                    {currentJobStatus.dataset_info && (
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {currentJobStatus.dataset_info.total_images}
                          </p>
                          <p className="text-sm text-gray-500">Images</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {currentJobStatus.dataset_info.file_size_mb.toFixed(1)}
                          </p>
                          <p className="text-sm text-gray-500">MB</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {currentJobStatus.dataset_info.formats.length}
                          </p>
                          <p className="text-sm text-gray-500">Formats</p>
                        </div>
                      </div>
                    )}

                    {/* Success Instructions */}
                    {currentJobStatus.status === 'completed' && (
                      <div className="bg-green-100 rounded-lg p-4">
                        <h5 className="font-semibold text-green-900 mb-2">🎉 Success!</h5>
                        <ul className="text-green-800 text-sm space-y-1 list-disc list-inside">
                          <li>Your dataset has been successfully cleaned and optimized</li>
                          <li>Click the "Download Cleaned Dataset" button above to get your results</li>
                          <li>The download includes all processed images in a ZIP file</li>
                          <li>You can now use this cleaned dataset for machine learning training</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="max-w-4xl mx-auto mt-16 grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-3xl mb-3">🧹</div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Cleaning</h3>
            <p className="text-gray-600 text-sm">
              AI-powered duplicate detection and quality filtering
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast Processing</h3>
            <p className="text-gray-600 text-sm">
              Efficient algorithms for quick dataset optimization
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-3">📥</div>
            <h3 className="font-semibold text-gray-900 mb-2">Easy Download</h3>
            <p className="text-gray-600 text-sm">
              Get your cleaned dataset ready for machine learning
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default System;
