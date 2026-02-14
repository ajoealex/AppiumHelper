import { useState } from 'react';
import { api } from '../api';

export default function CaptureViewer({ capture, onClose, onRename }) {
  const [newName, setNewName] = useState(capture.name);
  const [renaming, setRenaming] = useState(false);

  const handleRename = async () => {
    if (newName && newName !== capture.name) {
      setRenaming(true);
      try {
        await onRename(capture.name, newName);
      } finally {
        setRenaming(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Capture Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Screenshot */}
          <div className="mb-6">
            <img
              src={api.getScreenshotUrl(capture.name)}
              alt="Screenshot"
              className="max-w-full h-auto rounded-lg border border-gray-700 mx-auto"
              style={{ maxHeight: '400px' }}
            />
          </div>

          {/* Metadata */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Created:</span>
                <span className="text-white ml-2">
                  {new Date(capture.createdAt).toLocaleString()}
                </span>
              </div>
              {capture.metadata?.contextName && (
                <div>
                  <span className="text-gray-400">Context:</span>
                  <span className="text-white ml-2">{capture.metadata.contextName}</span>
                </div>
              )}
              {capture.metadata?.sessionId && (
                <div className="col-span-2">
                  <span className="text-gray-400">Session:</span>
                  <span className="text-white ml-2 font-mono text-xs">
                    {capture.metadata.sessionId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rename */}
          <div className="space-y-3">
            <label className="block text-gray-300 text-sm font-medium">
              Folder Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleRename}
                disabled={renaming || !newName || newName === capture.name}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {renaming ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
