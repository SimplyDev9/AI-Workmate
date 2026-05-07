import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import apiService from '../services/api';

const UploadPage = () => {
  const permissions = JSON.parse(sessionStorage.getItem("permissions") || "[]");
  const canUpload = permissions.includes("ingest");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [uploadMessage, setUploadMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const acceptedTypes = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.ppt'];
  const acceptedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const fileExt = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!acceptedTypes.includes(fileExt)) {
      setUploadStatus('error');
      setUploadMessage(
        `Invalid file type. Please upload: ${acceptedTypes.join(', ')}`
      );
      return;
    }

    setFile(selectedFile);
    setUploadStatus(null);
    setUploadMessage('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    const result = await apiService.uploadDocument(file, (progress) => {
      setUploadProgress(progress);
    });

    setUploading(false);

    if (result.success) {
      setUploadStatus('success');
      setUploadMessage('Document uploaded and processed successfully!');
      // Clear file after 8 seconds
      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
        setUploadStatus(null);
        setUploadMessage('');
      }, 8000);
    } else {
      setUploadStatus('error');
      setUploadMessage(`Upload failed: ${result.error}`);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadStatus(null);
    setUploadMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!canUpload) {
    return (
      <div className="p-6 text-red-500 text-lg">
        🚫 You do not have permission to upload documents
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload Document
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add documents to your knowledge base for AI-powered Q&A
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
            data-testid="upload-dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
              data-testid="file-input"
            />

            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>

              {!file ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Drop your document here
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      or click to browse files
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                    data-testid="browse-button"
                  >
                    Browse Files
                  </button>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Supported: {acceptedTypes.join(', ')}
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    {!uploading && uploadStatus !== 'success' && (
                      <button
                        onClick={clearFile}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        data-testid="clear-file-button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                          data-testid="upload-progress"
                        />
                      </div>
                      <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  {/* Status Messages */}
                  {uploadStatus === 'success' && (
                    <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{uploadMessage}</span>
                    </div>
                  )}

                  {uploadStatus === 'error' && (
                    <div className="flex items-center justify-center space-x-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{uploadMessage}</span>
                    </div>
                  )}

                  {/* Upload Button */}
                  {!uploading && uploadStatus !== 'success' && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                      data-testid="upload-button"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Upload to Knowledge Base</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              📚 How it works
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Upload documents to build your AI knowledge base</li>
              <li>• Documents are processed and embedded using ChromaDB</li>
              <li>• Ask questions in the chat to get AI-powered answers</li>
              <li>• RAG technology ensures accurate, context-aware responses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;