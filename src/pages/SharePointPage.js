import React, { useState } from 'react';
import { Cloud, Loader2, CheckCircle, AlertCircle, Server } from 'lucide-react';
import apiService from '../services/api';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

const STAGE_LABELS = {
  fetching:   'Fetching file list from SharePoint...',
  ingesting:  'Ingesting files...',
  done:       'Complete!',
  error:      'Error',
  heartbeat:  'Processing...',
};

const SharePointPage = () => {
  const [hostname, setHostname]       = useState('');
  const [siteName, setSiteName]       = useState('');
  const [folderPath, setFolderPath]   = useState('Shared Documents');
  const [siteId, setSiteId]           = useState('');
  const [fetchingId, setFetchingId]   = useState(false);
  const [ingesting, setIngesting]     = useState(false);
  const [ingestProgress, setIngestProgress] = useState(0);
  const [stageLabel, setStageLabel]   = useState('');
  const [fetchIdStatus, setFetchIdStatus]   = useState(null);
  const [fetchIdMessage, setFetchIdMessage] = useState('');
  const [ingestStatus, setIngestStatus]     = useState(null);
  const [ingestMessage, setIngestMessage]   = useState('');

  const validateHostname = (v) => v && v.includes('sharepoint.com');

  // ── Step 1: Fetch Site ID ──────────────────────────────────
  const handleFetchSiteId = async () => {
    if (!hostname.trim() || !siteName.trim()) {
      setFetchIdStatus('error');
      setFetchIdMessage('Please provide both Hostname and Site Name');
      return;
    }
    if (!validateHostname(hostname)) {
      setFetchIdStatus('error');
      setFetchIdMessage('Invalid hostname format. Expected: tenant.sharepoint.com');
      return;
    }

    setFetchingId(true);
    setFetchIdStatus(null);
    setFetchIdMessage('');
    setSiteId('');

    const result = await apiService.getSiteId(hostname.trim(), siteName.trim());
    setFetchingId(false);

    if (result.success) {
      setSiteId(result.data.id);
      setFetchIdStatus('success');
      setFetchIdMessage('Site ID fetched successfully!');
    } else {
      setFetchIdStatus('error');
      setFetchIdMessage(`Failed to fetch Site ID: ${result.error}`);
    }
  };

  // ── Step 2: Ingest via SSE ────────────────────────────────
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
    setIngestProgress(5);
    setStageLabel('Starting SharePoint ingestion...');
    setIngestStatus(null);
    setIngestMessage('');

    // Step 1: POST → get job_id
    const result = await apiService.ingestSharePoint(siteId, folderPath.trim());
    if (!result.success) {
      setIngesting(false);
      setIngestStatus('error');
      setIngestMessage(result.error || 'Failed to start ingestion');
      return;
    }

    const { job_id } = result.data;
    setIngestProgress(10);
    setStageLabel('Job queued — connecting to progress stream...');

    // Step 2: SSE stream
    const token = sessionStorage.getItem('token');
    let reader;
    try {
      const resp = await fetch(
        `${BASE_URL}/ingest_sharepoint/progress/${job_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
        }
      );

      if (!resp.ok) throw new Error(`SSE connect failed: ${resp.status}`);

      reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const { stage, percent, message } = event;

            if (stage === 'heartbeat') {
              setStageLabel('Processing SharePoint files...');
              continue;
            }

            if (percent >= 0) setIngestProgress(percent);
            setStageLabel(STAGE_LABELS[stage] || message);

            if (stage === 'done') {
              setIngestStatus('success');
              setIngestMessage(message || 'SharePoint documents ingested successfully!');
              setIngesting(false);
              return;
            }
            if (stage === 'error') {
              setIngestStatus('error');
              setIngestMessage(message || 'Ingestion failed');
              setIngesting(false);
              return;
            }
          } catch { /* malformed line */ }
        }
      }
    } catch (err) {
      setIngestStatus('error');
      setIngestMessage(err.message || 'Connection lost during ingestion');
    } finally {
      setIngesting(false);
      if (reader) { try { reader.cancel(); } catch { /* ignore */ } }
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">SharePoint Ingestion</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dynamically ingest SharePoint documents into your knowledge base
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Step 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fetch SharePoint Site ID</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hostname <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="e.g., ragpoc.sharepoint.com"
                disabled={fetchingId}
                data-testid="hostname-input"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
              <p className="text-xs text-gray-500">Format: tenant.sharepoint.com</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g., AIProject"
                disabled={fetchingId}
                data-testid="sitename-input"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            <button
              onClick={handleFetchSiteId}
              disabled={fetchingId || !hostname.trim() || !siteName.trim()}
              data-testid="fetch-siteid-button"
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              {fetchingId
                ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Fetching...</span></>
                : <><Server className="w-5 h-5" /><span>Fetch Site ID</span></>
              }
            </button>

            {fetchIdStatus === 'success' && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">{fetchIdMessage}</p>
              </div>
            )}
            {fetchIdStatus === 'error' && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm font-medium text-red-800 dark:text-red-300">{fetchIdMessage}</p>
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 transition-opacity ${!siteId ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Start Document Ingestion</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Folder Path <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="e.g., Shared Documents"
                disabled={!siteId || ingesting}
                data-testid="folderpath-input"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
              <p className="text-xs text-gray-500">Default: "Shared Documents"</p>
            </div>

            {/* SSE progress bar */}
            {ingesting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{stageLabel}</span>
                  <span>{ingestProgress > 0 ? `${ingestProgress}%` : ''}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-500"
                    style={{ width: `${ingestProgress}%` }}
                    data-testid="ingest-progress"
                  />
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Please keep this tab open while ingestion runs
                </p>
              </div>
            )}

            <button
              onClick={handleStartIngestion}
              disabled={!siteId || ingesting || !folderPath.trim()}
              data-testid="start-ingestion-button"
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              {ingesting
                ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Ingesting...</span></>
                : <><Cloud className="w-5 h-5" /><span>Start Ingestion</span></>
              }
            </button>

            {!siteId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                ⚠️ Please fetch Site ID first to enable ingestion
              </p>
            )}

            {ingestStatus === 'success' && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">{ingestMessage}</p>
              </div>
            )}
            {ingestStatus === 'error' && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm font-medium text-red-800 dark:text-red-300">{ingestMessage}</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              ℹ️ How SharePoint Ingestion Works
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Provide your SharePoint hostname and site name, then fetch the Site ID</li>
              <li>• Specify the folder path and start ingestion</li>
              <li>• Real-time progress is streamed — each file's status is shown as it's processed</li>
              <li>• Documents become available for AI-powered Q&A in Chat immediately after</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePointPage;