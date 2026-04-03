import React, { useState } from 'react';
import { Cloud, Loader2, CheckCircle, AlertCircle, Server } from 'lucide-react';
import apiService from '../services/api';

const SharePointPage = () => {
  // Form inputs
  const [hostname, setHostname] = useState('');
  const [siteName, setSiteName] = useState('');
  const [folderPath, setFolderPath] = useState('Shared Documents');
  
  // State management
  const [siteId, setSiteId] = useState('');
  const [fetchingId, setFetchingId] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [fetchIdStatus, setFetchIdStatus] = useState(null); // 'success', 'error', null
  const [fetchIdMessage, setFetchIdMessage] = useState('');
  const [ingestStatus, setIngestStatus] = useState(null); // 'success', 'error', null
  const [ingestMessage, setIngestMessage] = useState('');

  // Validate hostname format
  const validateHostname = (value) => {
    // Basic validation: should look like domain.sharepoint.com
    return value && value.includes('sharepoint.com');
  };

  // Handle Fetch Site ID
  const handleFetchSiteId = async () => {
    if (!hostname.trim() || !siteName.trim()) {
      setFetchIdStatus('error');
      setFetchIdMessage('Please provide both Hostname and Site Name');
      return;
    }

    if (!validateHostname(hostname)) {
      setFetchIdStatus('error');
      setFetchIdMessage('Invalid hostname format. Expected format: tenant.sharepoint.com');
      return;
    }

    setFetchingId(true);
    setFetchIdStatus(null);
    setFetchIdMessage('');
    setSiteId(''); // Clear previous site ID

    const result = await apiService.getSiteId(hostname.trim(), siteName.trim());
    setFetchingId(false);

    if (result.success) {
      setSiteId(result.data.id);
      setFetchIdStatus('success');
      setFetchIdMessage(`Site ID fetched successfully!`);
    } else {
      setFetchIdStatus('error');
      setFetchIdMessage(`Failed to fetch Site ID: ${result.error}`);
    }
  };

  // Handle Start Ingestion
  const handleStartIngestion = async () => {
    if (!siteId) {
      setIngestStatus('error');
      setIngestMessage('Please fetch Site ID first');
      return;
    }

    if (!folderPath.trim()) {
      setIngestStatus('error');
      setIngestMessage('Please provide Folder Path');
      return;
    }

    setIngesting(true);
    setIngestStatus(null);
    setIngestMessage('');

    const result = await apiService.ingestSharePoint(siteId, folderPath.trim());
    setIngesting(false);

    if (result.success) {
      setIngestStatus('success');
      setIngestMessage('SharePoint documents ingested successfully!');
    } else {
      setIngestStatus('error');
      setIngestMessage(`Ingestion failed: ${result.error}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              SharePoint Ingestion
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dynamically ingest SharePoint documents into your knowledge base
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Step 1: Fetch Site ID */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fetch SharePoint Site ID
              </h3>
            </div>

            {/* Hostname Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hostname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="e.g., ragpoc.sharepoint.com"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                data-testid="hostname-input"
                disabled={fetchingId}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Format: tenant.sharepoint.com
              </p>
            </div>

            {/* Site Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g., AIProject"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                data-testid="sitename-input"
                disabled={fetchingId}
              />
            </div>

            {/* Fetch Button */}
            <button
              onClick={handleFetchSiteId}
              disabled={fetchingId || !hostname.trim() || !siteName.trim()}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
              data-testid="fetch-siteid-button"
            >
              {fetchingId ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Server className="w-5 h-5" />
                  <span>Fetch Site ID</span>
                </>
              )}
            </button>

            {/* Status Message for Fetch */}
            {fetchIdStatus === 'success' && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {fetchIdMessage}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1 break-all">
                    Site ID: {siteId}
                  </p>
                </div>
              </div>
            )}

            {fetchIdStatus === 'error' && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {fetchIdMessage}
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Start Ingestion */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 transition-opacity ${
            !siteId ? 'opacity-50' : 'opacity-100'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Start Document Ingestion
              </h3>
            </div>

            {/* Folder Path Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Folder Path <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="e.g., Shared Documents"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                data-testid="folderpath-input"
                disabled={!siteId || ingesting}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Default: "Shared Documents"
              </p>
            </div>

            {/* Ingest Button */}
            <button
              onClick={handleStartIngestion}
              disabled={!siteId || ingesting || !folderPath.trim()}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
              data-testid="start-ingestion-button"
            >
              {ingesting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-5 h-5" />
                  <span>Start Ingestion</span>
                </>
              )}
            </button>

            {!siteId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                ⚠️ Please fetch Site ID first to enable ingestion
              </p>
            )}

            {/* Status Message for Ingestion */}
            {ingestStatus === 'success' && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {ingestMessage}
                </p>
              </div>
            )}

            {ingestStatus === 'error' && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {ingestMessage}
                </p>
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              ℹ️ How SharePoint Ingestion Works
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Step 1: Provide your SharePoint hostname and site name</li>
              <li>• Step 2: Fetch the unique Site ID from SharePoint</li>
              <li>• Step 3: Specify the folder path to ingest documents from</li>
              <li>• Step 4: Start ingestion to add documents to your knowledge base</li>
              <li>• Documents will be available for AI-powered Q&A in the Chat</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePointPage;