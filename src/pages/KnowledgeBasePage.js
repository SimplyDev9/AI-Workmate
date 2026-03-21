import React, { useState, useEffect } from 'react';
import { Trash2, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import apiService from '../services/api';

const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    const result = await apiService.listDocuments();
    setLoading(false);

    if (result.success) {
      setDocuments(result.data.files || []);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (filename) => {
    setDeleteLoading(filename);
    const result = await apiService.deleteDocument(filename);
    setDeleteLoading(null);
    setShowDeleteDialog(null);

    if (result.success) {
      // Refresh the list
      fetchDocuments();
    } else {
      setError(`Failed to delete: ${result.error}`);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const colors = {
      pdf: 'text-red-500',
      docx: 'text-blue-500',
      doc: 'text-blue-500',
      txt: 'text-gray-500',
      pptx: 'text-orange-500',
      ppt: 'text-orange-500',
    };
    return colors[ext] || 'text-gray-500';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Knowledge Base
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage documents in your AI knowledge base
            </p>
          </div>
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
            data-testid="refresh-documents-button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">Loading documents...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3 max-w-md">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Error loading documents
              </h3>
              <p className="text-gray-500 dark:text-gray-400">{error}</p>
              <button
                onClick={fetchDocuments}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                No documents yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Upload your first document to start building your knowledge base.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
                  </span>
                </div>
              </div>

              {/* Document List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {documents.map((filename, index) => (
                  <div
                    key={index}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    data-testid="document-item"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileText className={`w-5 h-5 flex-shrink-0 ${getFileIcon(filename)}`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {filename}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowDeleteDialog(filename)}
                        disabled={deleteLoading === filename}
                        className="ml-4 flex items-center space-x-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        data-testid={`delete-button-${filename}`}
                      >
                        {deleteLoading === filename ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Document?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <strong>{showDeleteDialog}</strong>? This will
              remove the document and its embeddings from the knowledge base.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                data-testid="cancel-delete-button"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteDialog)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                data-testid="confirm-delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;