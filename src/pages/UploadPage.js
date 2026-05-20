import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import apiService from '../services/api';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

const STAGE_LABELS = {
  loading:    'Loading document...',
  chunking:   'Splitting into chunks...',
  embedding:  'Embedding chunks (this may take a moment)...',
  done:       'Complete!',
  error:      'Error',
  heartbeat:  'Processing...',
};

const UploadPage = () => {
  const permissions = JSON.parse(sessionStorage.getItem('permissions') || '[]');
  const canUpload = permissions.includes('ingest');

  const [file, setFile]                 = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stageLabel, setStageLabel]     = useState('');
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [uploadMessage, setUploadMessage] = useState('');
  const [isDragging, setIsDragging]     = useState(false);
  const fileInputRef = useRef(null);

  const acceptedTypes = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.ppt'];

  // ── File selection ─────────────────────────────────────────
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!acceptedTypes.includes(ext)) {
      setUploadStatus('error');
      setUploadMessage(`Invalid file type. Supported: ${acceptedTypes.join(', ')}`);
      return;
    }
    setFile(selectedFile);
    setUploadStatus(null);
    setUploadMessage('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
    setStageLabel('');
    setUploadStatus(null);
    setUploadMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  // ── Upload + SSE ────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(5);
    setStageLabel('Uploading file...');
    setUploadStatus(null);
    setUploadMessage('');

    // Step 1: POST file → get job_id
    const result = await apiService.uploadDocument(file);
    if (!result.success) {
      setUploading(false);
      setUploadStatus('error');
      setUploadMessage(result.error || 'Upload failed');
      return;
    }

    const { job_id } = result.data;
    setUploadProgress(10);
    setStageLabel('File saved — starting ingestion...');

    // Step 2: Open fetch-based SSE stream with auth header
    const token = sessionStorage.getItem('token');
    let reader;
    try {
      const resp = await fetch(
        `${BASE_URL}/upload_doc/progress/${job_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
        }
      );

      if (!resp.ok) {
        throw new Error(`SSE connect failed: ${resp.status}`);
      }

      reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const { stage, percent, message } = event;

            if (stage === 'heartbeat') {
              setStageLabel('Processing...');
              continue;
            }

            if (percent >= 0) setUploadProgress(percent);
            setStageLabel(STAGE_LABELS[stage] || message);

            if (stage === 'done') {
              setUploadStatus('success');
              setUploadMessage(message || 'Document uploaded and ingested successfully!');
              setUploading(false);
              setTimeout(clearFile, 8000);
              return;
            }

            if (stage === 'error') {
              setUploadStatus('error');
              setUploadMessage(message || 'Ingestion failed');
              setUploading(false);
              return;
            }
          } catch {
            // malformed SSE line — ignore
          }
        }
      }
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(err.message || 'Connection lost during ingestion');
    } finally {
      setUploading(false);
      if (reader) {
        try { reader.cancel(); } catch { /* ignore */ }
      }
    }
  };

  // ── Permission guard ────────────────────────────────────────
  if (!canUpload) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            You do not have permission to upload documents.
          </p>
        </div>
      </div>
    );
  }

  // ── UI ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Document</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add documents to your knowledge base for AI-powered Q&A
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Drop your document here
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    data-testid="browse-button"
                  >
                    Browse Files
                  </button>
                  <p className="text-xs text-gray-400">Supported: {acceptedTypes.join(', ')}</p>
                </>
              ) : (
                <div className="space-y-4">
                  {/* File row */}
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    {!uploading && uploadStatus !== 'success' && (
                      <button onClick={clearFile} className="ml-2 p-1 text-gray-400 hover:text-gray-600" data-testid="clear-file-button">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* SSE-driven progress bar */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{stageLabel}</span>
                        <span>{uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${uploadProgress}%` }}
                          data-testid="upload-progress"
                        />
                      </div>
                    </div>
                  )}

                  {/* Status */}
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

                  {/* Upload button */}
                  {!uploading && uploadStatus !== 'success' && (
                    <button
                      onClick={handleUpload}
                      className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                      data-testid="upload-button"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Upload to Knowledge Base</span>
                    </button>
                  )}

                  {uploading && (
                    <div className="flex items-center justify-center space-x-2 text-indigo-600 dark:text-indigo-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Processing — please keep this tab open</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">📚 How it works</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• File is saved to the server immediately</li>
              <li>• Text is extracted, split into chunks, and embedded via AWS Bedrock</li>
              <li>• Progress is streamed in real time — no fake percentages</li>
              <li>• Once complete, the document is available for AI-powered Q&A</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;