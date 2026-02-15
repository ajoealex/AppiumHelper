import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import CaptureViewer from '../components/CaptureViewer';

export default function Session({ appiumUrl, sessionId, customHeaders = {}, onDisconnect }) {
  const [contexts, setContexts] = useState([]);
  const [selectedContext, setSelectedContext] = useState('');
  const [captures, setCaptures] = useState([]);
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [refreshingContexts, setRefreshingContexts] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [previewCapture, setPreviewCapture] = useState(null);
  const [autoRefreshScreenshot, setAutoRefreshScreenshot] = useState(false);

  // Execute Script state
  const [executeScript, setExecuteScript] = useState('mobile: deviceScreenInfo');
  const [executeScriptResult, setExecuteScriptResult] = useState('');
  const [executeScriptStatus, setExecuteScriptStatus] = useState(null);
  const [executingScript, setExecutingScript] = useState(false);

  // Generic API state
  const [genericEndpoint, setGenericEndpoint] = useState('');
  const [genericMethod, setGenericMethod] = useState('GET');
  const [genericPayload, setGenericPayload] = useState('');
  const [genericResult, setGenericResult] = useState('');
  const [genericStatus, setGenericStatus] = useState(null);
  const [sendingGeneric, setSendingGeneric] = useState(false);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState(null);

  const loadContexts = useCallback(async () => {
    try {
      const data = await api.getContexts(appiumUrl, sessionId, customHeaders);
      const contextList = data.value || [];
      setContexts(contextList);
      if (contextList.length > 0) {
        setSelectedContext(contextList[0]);
      }
    } catch (err) {
      setError('Failed to load contexts: ' + err.message);
    }
  }, [appiumUrl, sessionId, customHeaders]);

  const loadCaptures = useCallback(async () => {
    try {
      const data = await api.getCaptures();
      setCaptures(data);
    } catch (err) {
      console.error('Failed to load captures:', err);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await api.getLogs(10);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadContexts(), loadCaptures(), loadLogs()]).finally(() => setLoading(false));
  }, [loadContexts, loadCaptures, loadLogs]);

  // Auto-refresh logs every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  // Auto-refresh screenshot every 10 seconds when enabled
  useEffect(() => {
    if (!autoRefreshScreenshot) return;
    const interval = setInterval(() => {
      fetchScreenshot();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefreshScreenshot]);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleRefreshContexts = async () => {
    setRefreshingContexts(true);
    setError('');
    try {
      await loadContexts();
    } finally {
      setRefreshingContexts(false);
    }
  };

  const handleContextChange = async (contextName) => {
    setSelectedContext(contextName);
    setError('');
    try {
      await api.setContext(appiumUrl, sessionId, contextName, customHeaders);
      setSuccess(`Context set to: ${contextName}`);
    } catch (err) {
      setError('Failed to set context: ' + err.message);
    }
  };

  const fetchScreenshot = async () => {
    try {
      const screenshotData = await api.getScreenshot(appiumUrl, sessionId, customHeaders);
      if (screenshotData?.value) {
        setCurrentScreenshot(screenshotData.value);
        setPreviewCapture(null); // Clear preview when fetching live screenshot
      }
    } catch (err) {
      console.error('Failed to fetch screenshot:', err);
    }
  };

  const handlePreview = (capture) => {
    setPreviewCapture(capture);
    setCurrentScreenshot(null); // Clear live screenshot when previewing
    setAutoRefreshScreenshot(false); // Turn off auto-refresh when viewing a capture
  };

  const handleCapture = async () => {
    if (!selectedContext) return;

    setCapturing(true);
    setError('');
    setSuccess('');

    try {
      // Fetch screenshot first to display
      await fetchScreenshot();

      const result = await api.capture(appiumUrl, sessionId, selectedContext, customHeaders);
      setSuccess(`Captured successfully: ${result.folderName}`);
      await loadCaptures();
    } catch (err) {
      setError('Capture failed: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };

  const handleCaptureScreenshot = async () => {
    setCapturingScreenshot(true);
    setError('');

    try {
      await fetchScreenshot();
      setSuccess('Screenshot captured');
    } catch (err) {
      setError('Screenshot failed: ' + err.message);
    } finally {
      setCapturingScreenshot(false);
    }
  };

  const handleRename = async (oldName, newName) => {
    try {
      await api.renameCapture(oldName, newName);
      await loadCaptures();
      setSelectedCapture(null);
    } catch (err) {
      setError('Rename failed: ' + err.message);
    }
  };

  const handleDelete = async (name) => {
    try {
      await api.deleteCapture(name);
      await loadCaptures();
      setSelectedCapture(null);
      setSuccess('Capture deleted successfully');
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handleDeleteAll = async () => {
    if (captures.length === 0) return;
    if (confirm(`Are you sure you want to delete all ${captures.length} captures?`)) {
      try {
        await api.deleteAllCaptures();
        await loadCaptures();
        setSuccess('All captures deleted successfully');
      } catch (err) {
        setError('Delete all failed: ' + err.message);
      }
    }
  };

  const handleExecuteScript = async () => {
    if (!executeScript.trim()) return;

    setExecutingScript(true);
    setExecuteScriptResult('');
    setExecuteScriptStatus(null);

    try {
      const result = await api.executeScript(appiumUrl, sessionId, executeScript, [], customHeaders);
      setExecuteScriptResult(JSON.stringify(result, null, 2));
      setExecuteScriptStatus(200);
    } catch (err) {
      setExecuteScriptResult(`Error: ${err.message}`);
      setExecuteScriptStatus('Error');
    } finally {
      setExecutingScript(false);
    }
  };

  const handleGenericRequest = async () => {
    if (!genericEndpoint.trim()) return;

    setSendingGeneric(true);
    setGenericResult('');
    setGenericStatus(null);

    try {
      // Prepend /session/{session id}/ to the endpoint
      const fullEndpoint = `/session/{session id}/${genericEndpoint.replace(/^\//, '')}`;
      const result = await api.genericRequest(
        appiumUrl,
        sessionId,
        fullEndpoint,
        genericMethod,
        genericMethod === 'POST' ? genericPayload : null,
        customHeaders
      );
      setGenericResult(JSON.stringify(result, null, 2));
      setGenericStatus(200);
    } catch (err) {
      setGenericResult(`Error: ${err.message}`);
      setGenericStatus('Error');
    } finally {
      setSendingGeneric(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDeleteAllLogs = async () => {
    if (logs.length === 0) return;
    if (confirm('Are you sure you want to delete all log files from the server?')) {
      try {
        await api.deleteLogs();
        setLogs([]);
        setSuccess('All logs deleted successfully');
      } catch (err) {
        setError('Failed to delete logs: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div id="session-header" className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Session Controls</h1>
            <p className="text-gray-400 text-sm mt-1 font-mono">{sessionId}</p>
          </div>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
            {success}
          </div>
        )}

        {/* Controls Panel */}
        <div id="capture-controls" className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Capture Controls</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Context
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedContext}
                  onChange={(e) => handleContextChange(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {contexts.length === 0 ? (
                    <option value="">No contexts available</option>
                  ) : (
                    contexts.map((ctx) => (
                      <option key={ctx} value={ctx}>
                        {ctx}
                      </option>
                    ))
                  )}
                </select>
                <button
                  onClick={handleRefreshContexts}
                  disabled={refreshingContexts}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors cursor-pointer"
                  title="Refresh contexts"
                >
                  <svg
                    className={`w-5 h-5 ${refreshingContexts ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCapture}
                disabled={capturing || capturingScreenshot || !selectedContext}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {capturing ? 'Capturing...' : 'Capture Source'}
              </button>
              <button
                onClick={handleCaptureScreenshot}
                disabled={capturing || capturingScreenshot}
                className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {capturingScreenshot ? 'Capturing...' : 'Capture Screenshot'}
              </button>
            </div>
          </div>
        </div>

        {/* Captures List and Screenshot Preview */}
        <div id="captures-preview-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Captures List */}
          <div id="captures-list" className="bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden max-h-125">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Captures ({captures.length})
              </h2>
              {captures.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Delete All
                </button>
              )}
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {captures.length === 0 ? (
                <p className="text-gray-400 text-sm">No captures yet</p>
              ) : (
                captures.map((capture) => (
                  <div
                    key={capture.name}
                    className={`w-full p-3 rounded-lg transition-colors ${
                      capture.metadata?.hasErrors
                        ? 'bg-red-900/30 border border-red-700/50'
                        : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedCapture(capture)}
                        className="flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {capture.metadata?.hasErrors && (
                            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                          <span className="text-white font-medium truncate">
                            {capture.name}
                          </span>
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {new Date(capture.createdAt).toLocaleString()}
                          {capture.metadata?.hasErrors && (
                            <span className="text-red-400 ml-2">- Has errors</span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => handlePreview(capture)}
                        className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors shrink-0 cursor-pointer"
                        title="Preview screenshot"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => window.open(api.getViewerUrl(capture.name), '_blank')}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shrink-0 cursor-pointer"
                        title="Open in viewer"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Screenshot Preview */}
          <div id="screenshot-preview" className="bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden max-h-125">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {previewCapture ? `Preview: ${previewCapture.name}` : 'Screenshot'}
              </h2>
              <div className="flex items-center gap-2">
                {!previewCapture && (
                  <button
                    onClick={() => {
                      if (!autoRefreshScreenshot) fetchScreenshot();
                      setAutoRefreshScreenshot(!autoRefreshScreenshot);
                    }}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      autoRefreshScreenshot
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    title={autoRefreshScreenshot ? 'Stop auto-refresh' : 'Auto-refresh every 10s'}
                  >
                    <svg className={`w-4 h-4 ${autoRefreshScreenshot ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {autoRefreshScreenshot ? 'Live' : 'Auto'}
                  </button>
                )}
                {previewCapture && (
                  <button
                    onClick={() => setPreviewCapture(null)}
                    className="text-gray-400 hover:text-white text-sm cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden min-h-64">
              {previewCapture ? (
                <img
                  src={api.getScreenshotUrl(previewCapture.name)}
                  alt={`Preview: ${previewCapture.name}`}
                  className="max-w-full max-h-96 object-contain"
                />
              ) : currentScreenshot ? (
                <img
                  src={`data:image/png;base64,${currentScreenshot}`}
                  alt="Current screenshot"
                  className="max-w-full max-h-96 object-contain"
                />
              ) : (
                <div className="text-gray-500 text-sm text-center p-4">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No screenshot captured yet</p>
                  <p className="text-xs mt-1">Click "Capture Source", "Capture Screenshot", or "Preview" to view</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Sections */}
        <div id="advanced-sections" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Execute Script Section */}
          <div id="execute-script-section" className="bg-gray-800 rounded-lg p-6 max-h-175 overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Execute Script</h2>
            <p className="text-gray-400 text-xs mb-3">POST /session/{'{session id}'}/execute/sync</p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Script
                </label>
                <textarea
                  value={executeScript}
                  onChange={(e) => setExecuteScript(e.target.value)}
                  placeholder="mobile: deviceScreenInfo"
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                />
              </div>

              <button
                onClick={handleExecuteScript}
                disabled={executingScript || !executeScript.trim()}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {executingScript ? 'Executing...' : 'Send'}
              </button>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Response
                  </label>
                  {executeScriptStatus !== null && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      executeScriptStatus === 200 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {executeScriptStatus}
                    </span>
                  )}
                </div>
                <textarea
                  value={executeScriptResult}
                  readOnly
                  rows={6}
                  placeholder="Response will appear here..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-300 placeholder-gray-500 font-mono text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Generic API Section */}
          <div id="generic-api-section" className="bg-gray-800 rounded-lg p-6 max-h-175 overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Generic WebDriver API</h2>
            <p className="text-gray-400 text-xs mb-3">Send any WebDriver command</p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Endpoint
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-2 bg-gray-600 border border-r-0 border-gray-600 rounded-l-lg text-gray-400 font-mono text-sm">
                    /session/{'{session id}'}/
                  </span>
                  <input
                    type="text"
                    value={genericEndpoint}
                    onChange={(e) => setGenericEndpoint(e.target.value)}
                    placeholder="url"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Method
                </label>
                <select
                  value={genericMethod}
                  onChange={(e) => setGenericMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              {genericMethod === 'POST' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Payload (JSON)
                  </label>
                  <textarea
                    value={genericPayload}
                    onChange={(e) => setGenericPayload(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-none"
                  />
                </div>
              )}

              <button
                onClick={handleGenericRequest}
                disabled={sendingGeneric || !genericEndpoint.trim()}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {sendingGeneric ? 'Sending...' : 'Send'}
              </button>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Response
                  </label>
                  {genericStatus !== null && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      genericStatus === 200 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {genericStatus}
                    </span>
                  )}
                </div>
                <textarea
                  value={genericResult}
                  readOnly
                  rows={6}
                  placeholder="Response will appear here..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-300 placeholder-gray-500 font-mono text-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* API Logs Section */}
        <div id="api-logs-section" className="bg-gray-800 rounded-lg p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              WebDriver API Logs ({logs.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={loadLogs}
                disabled={logsLoading}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
                title="Refresh logs"
              >
                {logsLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
                title="Clear logs from view"
              >
                Clear
              </button>
              <button
                onClick={handleDeleteAllLogs}
                disabled={logs.length === 0}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
                title="Delete all log files from server"
              >
                Delete All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm">No logs available</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 font-medium py-2 px-2">Timestamp</th>
                    <th className="text-left text-gray-400 font-medium py-2 px-2">Method</th>
                    <th className="text-left text-gray-400 font-medium py-2 px-2">URL</th>
                    <th className="text-left text-gray-400 font-medium py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const hasError = log.error || log.errorResponse;
                    const isExpanded = expandedLogIndex === index;
                    return (
                      <React.Fragment key={index}>
                        <tr
                          className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${hasError ? 'cursor-pointer' : ''}`}
                          onClick={() => hasError && setExpandedLogIndex(isExpanded ? null : index)}
                        >
                          <td className="py-2 px-2 text-gray-300 font-mono text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {hasError && (
                                <svg className={`w-3 h-3 text-red-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                              {log.timestamp}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                              log.method === 'GET' ? 'bg-green-900/50 text-green-400' :
                              log.method === 'POST' ? 'bg-blue-900/50 text-blue-400' :
                              log.method === 'DELETE' ? 'bg-red-900/50 text-red-400' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {log.method}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-300 font-mono text-xs max-w-md truncate" title={log.url}>
                            {log.url}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`font-mono text-xs ${
                              log.status >= 200 && log.status < 300 ? 'text-green-400' :
                              log.status >= 400 ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && hasError && (
                          <tr className="bg-red-900/20">
                            <td colSpan={4} className="py-3 px-4">
                              <div className="space-y-2">
                                {log.error && (
                                  <div>
                                    <span className="text-red-400 text-xs font-medium">Error: </span>
                                    <span className="text-gray-300 text-xs font-mono">{log.error}</span>
                                  </div>
                                )}
                                {log.errorResponse && (
                                  <div>
                                    <span className="text-red-400 text-xs font-medium">Response: </span>
                                    <pre className="mt-1 text-gray-300 text-xs font-mono bg-gray-900 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                                      {typeof log.errorResponse === 'string'
                                        ? log.errorResponse
                                        : JSON.stringify(log.errorResponse, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Capture Viewer Modal */}
        {selectedCapture && (
          <CaptureViewer
            capture={selectedCapture}
            onClose={() => setSelectedCapture(null)}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
