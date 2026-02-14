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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls Panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Capture Controls</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Context
                </label>
                <select
                  value={selectedContext}
                  onChange={(e) => setSelectedContext(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Captures ({captures.length})
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {captures.length === 0 ? (
                <p className="text-gray-400 text-sm">No captures yet</p>
              ) : (
                captures.map((capture) => (
                  <button
                    key={capture.name}
                    onClick={() => setSelectedCapture(capture)}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-white font-medium truncate">
                      {capture.name}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(capture.createdAt).toLocaleString()}
                    </div>
                  </button>
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
          />
        )}
      </div>
    </div>
  );
}
