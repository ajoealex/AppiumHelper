import React from 'react';

export default function CaptureControlsSection({
  selectedContext,
  handleContextChange,
  contexts,
  handleRefreshContexts,
  refreshingContexts,
  handleSetSelectedContext,
  settingContext,
  handleGetCurrentContext,
  gettingCurrentContext,
  handleCapture,
  capturing,
  capturingScreenshot,
  handleCaptureScreenshot
}) {
  return (
    <div id="capture-controls" className="session-capture-controls bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="session-capture-controls-title text-lg font-semibold text-white mb-4">Capture Controls</h2>

      <div className="session-capture-controls-body space-y-4">
        <div className="session-context-block">
          <label className="session-context-label block text-gray-300 text-sm font-medium mb-2">
            Context
          </label>
          <p className="session-context-help text-xs text-gray-400 mb-2">
            Context list is fetched only. Selection is applied when you run capture.
          </p>
          <div className="session-context-row flex gap-2">
            <select
              value={selectedContext}
              onChange={(e) => handleContextChange(e.target.value)}
              className="session-context-select flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {contexts.length === 0 ? (
                <option value="">No contexts available</option>
              ) : (
                <>
                  <option value="">Select a context</option>
                  {contexts.map((ctx) => (
                    <option key={ctx} value={ctx}>
                      {ctx}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button
              onClick={handleRefreshContexts}
              disabled={refreshingContexts}
              className="session-context-refresh-btn px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors cursor-pointer"
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
            <button
              onClick={handleSetSelectedContext}
              disabled={settingContext || !selectedContext}
              className="session-context-set-btn px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 border border-blue-600 rounded-lg text-white text-sm transition-colors cursor-pointer"
              title="Set selected context"
            >
              {settingContext ? 'Setting...' : 'Set'}
            </button>
            <button
              onClick={handleGetCurrentContext}
              disabled={gettingCurrentContext}
              className="session-context-get-current-btn px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 border border-cyan-600 rounded-lg text-white text-sm transition-colors cursor-pointer"
              title="Get current context from Appium"
            >
              {gettingCurrentContext ? 'Getting...' : 'Get Current'}
            </button>
          </div>
        </div>

        <div className="session-capture-actions-row flex gap-3">
          <button
            onClick={handleCapture}
            disabled={capturing || capturingScreenshot || !selectedContext}
            className="session-capture-source-btn flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            {capturing ? 'Capturing...' : 'Capture Source'}
          </button>
          <button
            onClick={handleCaptureScreenshot}
            disabled={capturing || capturingScreenshot}
            className="session-capture-screenshot-btn flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            {capturingScreenshot ? 'Capturing...' : 'Capture Screenshot'}
          </button>
        </div>
      </div>
    </div>
  );
}
