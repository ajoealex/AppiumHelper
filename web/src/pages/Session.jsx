import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import CaptureViewer from '../components/CaptureViewer';

export default function Session({ appiumUrl, sessionId, onDisconnect }) {
  const [contexts, setContexts] = useState([]);
  const [selectedContext, setSelectedContext] = useState('');
  const [captures, setCaptures] = useState([]);
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [refreshingContexts, setRefreshingContexts] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadContexts = useCallback(async () => {
    try {
      const data = await api.getContexts(appiumUrl, sessionId);
      const contextList = data.value || [];
      setContexts(contextList);
      if (contextList.length > 0) {
        setSelectedContext(contextList[0]);
      }
    } catch (err) {
      setError('Failed to load contexts: ' + err.message);
    }
  }, [appiumUrl, sessionId]);

  const loadCaptures = useCallback(async () => {
    try {
      const data = await api.getCaptures();
      setCaptures(data);
    } catch (err) {
      console.error('Failed to load captures:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadContexts(), loadCaptures()]).finally(() => setLoading(false));
  }, [loadContexts, loadCaptures]);

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

  const handleCapture = async () => {
    if (!selectedContext) return;

    setCapturing(true);
    setError('');
    setSuccess('');

    try {
      const result = await api.capture(appiumUrl, sessionId, selectedContext);
      setSuccess(`Captured successfully: ${result.folderName}`);
      await loadCaptures();
    } catch (err) {
      setError('Capture failed: ' + err.message);
    } finally {
      setCapturing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Session Controls</h1>
            <p className="text-gray-400 text-sm mt-1 font-mono">{sessionId}</p>
          </div>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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

        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4">Capture Controls</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Context
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedContext}
                    onChange={(e) => setSelectedContext(e.target.value)}
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
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
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

              <button
                onClick={handleCapture}
                disabled={capturing || !selectedContext}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {capturing ? 'Capturing...' : 'Capture Source'}
              </button>
            </div>
          </div>

          {/* Captures List */}
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Captures ({captures.length})
              </h2>
              {captures.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
