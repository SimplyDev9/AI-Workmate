import React, { useState, useEffect } from 'react';
import {
  Trash2, FileText, Loader2, AlertCircle, RefreshCw, Database, Calendar
} from 'lucide-react';
import apiService from '../services/api';

const FILE_STYLES = {
  pdf:  { bg: '#FEE2E2', color: '#DC2626', label: 'PDF' },
  docx: { bg: '#DBEAFE', color: '#2563EB', label: 'W' },
  doc:  { bg: '#DBEAFE', color: '#2563EB', label: 'W' },
  txt:  { bg: '#F3F4F6', color: '#6B7280', label: 'TXT' },
  pptx: { bg: '#FEF3C7', color: '#D97706', label: 'P' },
  ppt:  { bg: '#FEF3C7', color: '#D97706', label: 'P' },
};

const getFileStyle = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return FILE_STYLES[ext] || { bg: '#F3F4F6', color: '#6B7280', label: '?' };
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return '—'; }
};

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const KnowledgeBasePage = () => {
  const [documents, setDocuments]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog]   = useState(null);
  const [showClearDialog, setShowClearDialog]     = useState(false);
  const [clearLoading, setClearLoading]   = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    const result = await apiService.listDocuments();
    setLoading(false);
    if (result.success) {
      const raw = result.data.files || [];
      // Support both old format (string[]) and new format (object[])
      const normalised = raw.map((f) =>
        typeof f === 'string' ? { filename: f, size: null, uploaded_on: null } : f
      );
      setDocuments(normalised);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleDelete = async (filename) => {
    setDeleteLoading(filename);
    const result = await apiService.deleteDocument(filename);
    setDeleteLoading(null);
    setShowDeleteDialog(null);
    if (result.success) {
      fetchDocuments();
    } else {
      setError(`Failed to delete: ${result.error}`);
    }
  };

  const handleClearDB = async () => {
    setClearLoading(true);
    const result = await apiService.clearDatabase();
    setClearLoading(false);
    setShowClearDialog(false);
    if (result.success) {
      setDocuments([]);
    } else {
      setError(`Failed to clear: ${result.error}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Knowledge Base
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage your documents and knowledge base
            </p>
          </div>
          <button
            onClick={() => setShowClearDialog(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            data-testid="clear-db-button"
          >
            <Trash2 className="w-4 h-4" />
            Clear DB
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">

          {/* Section header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">Documents</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">All documents in your knowledge base</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!loading && (
                <span className="text-xs font-medium px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                  {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
                </span>
              )}
              <button
                onClick={fetchDocuments}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                data-testid="refresh-documents-button"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading documents...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3 max-w-sm">
                <div className="w-11 h-11 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Error loading documents</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                <button
                  onClick={fetchDocuments}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-base font-medium text-gray-900 dark:text-white">No documents yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload your first document to start building your knowledge base.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 w-1/2">
                    Document Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">
                    Uploaded On
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">
                    Size
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {documents.map((doc, idx) => {
                  const style = getFileStyle(doc.filename);
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      data-testid="document-item"
                    >
                      {/* Name + icon */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {style.label}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {doc.filename}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                          {doc.uploaded_on && (
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          {formatDate(doc.uploaded_on)}
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatSize(doc.size)}
                      </td>

                      {/* Delete */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setShowDeleteDialog(doc.filename)}
                          disabled={deleteLoading === doc.filename}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          data-testid={`delete-button-${doc.filename}`}
                        >
                          {deleteLoading === doc.filename
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Delete single doc dialog ── */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Document?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{showDeleteDialog}</strong>?
              This will remove the document and all its embeddings from the knowledge base.
            </p>
            <div className="flex gap-3">
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

      {/* ── Clear DB dialog ── */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Clear Entire Knowledge Base?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete <strong className="text-gray-900 dark:text-white">all {documents.length} documents</strong> and
              their embeddings from the vector database. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearDialog(false)}
                disabled={clearLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearDB}
                disabled={clearLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="confirm-clear-button"
              >
                {clearLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {clearLoading ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;