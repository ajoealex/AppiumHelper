import React from 'react';

export default function SessionHeader({
  sessionId,
  onDisconnect,
  error,
  success
}) {
  return (
    <>
      <div id="session-header" className="session-header-bar flex items-center justify-between mb-6">
        <div className="session-header-meta">
          <h1 className="session-header-title text-2xl font-bold text-white">Session Controls</h1>
          <p className="session-header-session-id text-gray-400 text-sm mt-1 font-mono">{sessionId}</p>
        </div>
        <button
          onClick={onDisconnect}
          className="session-header-disconnect-btn px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
        >
          Disconnect
        </button>
      </div>

      {(error || success) && (
        <div className="session-header-feedback fixed top-5 left-0 right-0 z-[10000] px-4 pointer-events-none">
          <div className="session-header-feedback-stack max-w-4xl mx-auto space-y-2">
            {error && (
              <div className="session-header-error-banner pointer-events-auto p-3 bg-red-900/70 border border-red-700 rounded-lg text-red-200 text-sm shadow-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="session-header-success-banner pointer-events-auto p-3 bg-green-900/70 border border-green-700 rounded-lg text-green-200 text-sm shadow-lg">
                {success}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
