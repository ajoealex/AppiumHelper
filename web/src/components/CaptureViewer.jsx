import { useState } from 'react';
import { api } from '../api';

export default function CaptureViewer({ capture, onClose, onRename, onDelete }) {
  const [newName, setNewName] = useState(capture.name);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this capture?')) {
      setDeleting(true);
      try {
        await onDelete(capture.name);
      } finally {
        setDeleting(false);
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
          {/* Error Banner */}
          {capture.metadata?.hasErrors && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <div className="flex items-center gap-2 text-red-300 font-medium mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Capture completed with errors
              </div>
              <div className="space-y-2">
                {capture.metadata.errors?.map((err, idx) => (
                  <div key={idx} className="text-sm bg-red-950/50 rounded p-2">
                    <span className="text-red-400 font-medium">{err.step}:</span>
                    <span className="text-red-200 ml-2">{err.message}</span>
                    {err.status && <span className="text-red-400 ml-2">(HTTP {err.status})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshot */}
          <div className="mb-6">
            {capture.metadata?.hasScreenshot === false ? (
              <div className="flex items-center justify-center h-48 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>Screenshot not available</p>
                </div>
              </div>
            ) : (
              <img
                src={api.getScreenshotUrl(capture.name)}
                alt="Screenshot"
                className="max-w-full h-auto rounded-lg border border-gray-700 mx-auto"
                style={{ maxHeight: '400px' }}
              />
            )}
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
              <div>
                <span className="text-gray-400">Source:</span>
                <span className={`ml-2 ${capture.metadata?.hasSource ? 'text-green-400' : 'text-red-400'}`}>
                  {capture.metadata?.hasSource ? 'Available' : 'Not available'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Screenshot:</span>
                <span className={`ml-2 ${capture.metadata?.hasScreenshot ? 'text-green-400' : 'text-red-400'}`}>
                  {capture.metadata?.hasScreenshot ? 'Available' : 'Not available'}
                </span>
              </div>
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

          {/* Delete */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete Capture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
