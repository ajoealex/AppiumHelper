import React from 'react';

export default function CapturesPreviewSection({
  captures,
  handleDeleteAll,
  setSelectedCapture,
  formatCaptureDateTime,
  handlePreview,
  api,
  handleRenameCaptureTile,
  handleDeleteCaptureTile,
  previewCapture,
  setPreviewCapture,
  autoRefreshScreenshot,
  fetchScreenshot,
  setAutoRefreshScreenshot,
  parsedScreenshotRefreshSeconds,
  screenshotRefreshSecondsInput,
  setScreenshotRefreshSecondsInput,
  handleSetScreenshotRefreshInterval,
  currentScreenshot,
  isLiveScreenshotInteractable,
  screenshotLiveImageRef,
  handleLiveScreenshotPointerDown,
  handleLiveScreenshotPointerMove,
  handleLiveScreenshotPointerUp,
  handleLiveScreenshotPointerCancel,
  screenshotGestureStart,
  screenshotGestureCurrent,
  isRunningScreenshotGesture,
  isScreenshotInteractExpanded,
  setIsScreenshotInteractExpanded,
  lastScreenshotPressCoordinates,
  showScreenshotSendKeysInput,
  setShowScreenshotSendKeysInput,
  screenshotSendKeysText,
  setScreenshotSendKeysText,
  sendingScreenshotKeys,
  handleSendScreenshotKeys
}) {
  const isScreenshotInteractMode = autoRefreshScreenshot && isScreenshotInteractExpanded;

  return (
    <div id="captures-preview-section" className="session-captures-preview-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div id="captures-list" className="session-captures-list-panel bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden max-h-125">
        <div className="session-captures-list-header flex items-start justify-between mb-4">
          <h2 className="session-captures-list-title text-lg font-semibold text-white">
            Captures ({captures.length})
          </h2>
          {captures.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="session-captures-delete-all-btn px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Delete All
            </button>
          )}
        </div>

        <div className="session-captures-list space-y-2 flex-1 overflow-y-auto">
          {captures.length === 0 ? (
            <p className="session-captures-empty text-gray-400 text-sm">No captures yet</p>
          ) : (
            captures.map((capture) => (
              <div
                key={capture.name}
                className={`session-capture-tile group w-full p-3 rounded-xl border transition-all ${
                  capture.metadata?.hasErrors
                    ? 'bg-gradient-to-b from-red-900/25 to-gray-800/90 border-red-700/60'
                    : 'bg-gradient-to-b from-gray-700/90 to-gray-800/90 border-gray-600/70'
                }`}
              >
                <button
                  onClick={() => setSelectedCapture(capture)}
                  className="session-capture-tile-open-btn w-full text-left cursor-pointer mb-3"
                  title="Open capture details"
                >
                  <div className="session-capture-tile-card rounded-lg border border-gray-600/70 bg-gray-900/50 px-3 py-2.5 group-hover:border-gray-500/80 transition-colors">
                    <div className="session-capture-tile-head flex items-start justify-between gap-2 mb-2">
                      <div className="session-capture-tile-name-wrap min-w-0">
                        <p className="session-capture-tile-kicker text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">Capture</p>
                        <p className="session-capture-tile-name text-sm font-semibold text-white break-all">{capture.name}</p>
                      </div>
                      <div className="session-capture-tile-status-wrap shrink-0 flex items-center gap-1.5">
                        {capture.metadata?.hasErrors ? (
                          <span className="session-capture-tile-status session-capture-tile-status-error inline-flex items-center px-1.5 py-0.5 rounded border border-red-700/70 bg-red-900/50 text-[10px] font-medium text-red-200">
                            Error
                          </span>
                        ) : (
                          <span className="session-capture-tile-status session-capture-tile-status-ok inline-flex items-center px-1.5 py-0.5 rounded border border-emerald-700/70 bg-emerald-900/40 text-[10px] font-medium text-emerald-200">
                            OK
                          </span>
                        )}
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    <div className="session-capture-tile-meta space-y-1.5">
                      <p className="session-capture-tile-context text-xs text-gray-300 break-all">
                        <span className="text-gray-500 mr-1">Context:</span>
                        <span className="text-gray-100">{capture.metadata?.contextName || 'N/A'}</span>
                      </p>
                      <p className="session-capture-tile-session-id text-xs text-gray-300 break-all">
                        <span className="text-gray-500 mr-1">Session ID:</span>
                        <span className="font-mono text-gray-100">{capture.metadata?.sessionId || 'N/A'}</span>
                      </p>
                      <p className="session-capture-tile-datetime text-xs text-gray-300 break-all">
                        <span className="text-gray-500 mr-1">Date/Time:</span>
                        <span className="text-gray-100">{formatCaptureDateTime(capture.metadata?.capturedAt || capture.createdAt)}</span>
                      </p>
                    </div>
                    {capture.metadata?.hasErrors && (
                      <p className="session-capture-tile-error-note text-[11px] text-red-300 mt-2">Capture has errors. Open details for diagnostics.</p>
                    )}
                  </div>
                </button>

                <div className="session-capture-tile-actions grid grid-cols-2 xl:grid-cols-4 gap-2">
                  <button
                    onClick={() => handlePreview(capture)}
                    className="session-capture-preview-btn px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-md transition-colors cursor-pointer"
                    title="Preview screenshot"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => window.open(api.getViewerUrl(capture.name), '_blank')}
                    className="session-capture-open-btn px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-md transition-colors cursor-pointer"
                    title="Open in viewer"
                  >
                    <span className="inline-flex items-center gap-1">
                      Open
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12v7a2 2 0 002 2h7" />
                      </svg>
                    </span>
                  </button>
                  <button
                    onClick={() => handleRenameCaptureTile(capture.name)}
                    className="session-capture-rename-btn px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white rounded-md transition-colors cursor-pointer"
                    title="Rename capture"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeleteCaptureTile(capture.name)}
                    className="session-capture-delete-btn px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 border border-red-500 text-white rounded-md transition-colors cursor-pointer"
                    title="Delete capture"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        id="screenshot-preview"
        className="session-screenshot-panel relative bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden transition-[height] duration-200"
        style={{ height: isScreenshotInteractExpanded ? 'calc(100vh - 120px)' : '700px' }}
      >
        <div className="session-screenshot-header-row flex items-start justify-between mb-3">
          <div className="session-screenshot-title-wrap flex items-center gap-2 min-w-0">
            <h2 className="session-screenshot-title text-lg font-semibold text-white truncate">
              {previewCapture ? `Preview: ${previewCapture.name}` : 'Screenshot'}
            </h2>
            {lastScreenshotPressCoordinates && (
              <span className="session-screenshot-last-press-badge shrink-0 px-2 py-0.5 rounded border border-cyan-700/70 bg-cyan-900/40 text-cyan-200 text-[11px] font-mono">
                x:{lastScreenshotPressCoordinates.x} y:{lastScreenshotPressCoordinates.y}
              </span>
            )}
          </div>
          <div className="session-screenshot-header-actions w-fit max-w-[380px] ml-auto">
            {previewCapture ? (
              <button
                onClick={() => setPreviewCapture(null)}
                className="session-screenshot-clear-preview-btn text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                Clear
              </button>
            ) : (
              <div className="session-screenshot-controls flex items-center justify-end gap-2">
                {autoRefreshScreenshot && (
                  <button
                    onClick={() => setIsScreenshotInteractExpanded((prev) => !prev)}
                    className={`session-screenshot-interact-toggle-btn px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer ${
                      isScreenshotInteractExpanded
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    title={isScreenshotInteractExpanded ? 'Return to compact preview size' : 'Expand screenshot for interaction'}
                  >
                    {isScreenshotInteractExpanded ? 'Compact' : 'Interact'}
                  </button>
                )}
                {isScreenshotInteractMode && (
                  <button
                    onClick={() => setShowScreenshotSendKeysInput((prev) => !prev)}
                    className={`session-screenshot-send-keys-toggle-btn h-8 w-8 rounded transition-colors cursor-pointer inline-flex items-center justify-center ${
                      showScreenshotSendKeysInput
                        ? 'bg-violet-700 text-white border border-violet-500'
                        : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }`}
                    title="Send keys via WebDriver actions"
                    aria-label="Send keys"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 11h1m2 0h1m2 0h1m2 0h1m2 0h1M8 15h8" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!autoRefreshScreenshot) fetchScreenshot();
                    setAutoRefreshScreenshot(!autoRefreshScreenshot);
                  }}
                  className={`session-screenshot-live-toggle-btn px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    autoRefreshScreenshot
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  title={autoRefreshScreenshot ? 'Stop auto-refresh' : `Auto-refresh every ${parsedScreenshotRefreshSeconds}s`}
                >
                  <svg className={`w-4 h-4 ${autoRefreshScreenshot ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Live
                </button>
                <div className="session-screenshot-interval-control flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    value={screenshotRefreshSecondsInput}
                    onChange={(e) => setScreenshotRefreshSecondsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSetScreenshotRefreshInterval();
                    }}
                    className="session-screenshot-interval-input w-16 bg-transparent text-white text-sm focus:outline-none"
                    title="Live refresh interval in seconds"
                  />
                  <span className="text-gray-300 text-xs">sec</span>
                  <button
                    onClick={handleSetScreenshotRefreshInterval}
                    className="session-screenshot-interval-set-btn px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[11px] transition-colors cursor-pointer"
                    title="Apply refresh interval"
                  >
                    Set
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!previewCapture && isScreenshotInteractMode && showScreenshotSendKeysInput && (
          <div className="session-screenshot-send-keys-wrap absolute top-16 right-6 z-30 w-[min(380px,calc(100%-3rem))] pointer-events-none">
            <div className="session-screenshot-send-keys-panel pointer-events-auto w-full rounded-lg border border-violet-700/40 bg-violet-950/95 p-2 space-y-2 shadow-2xl">
              <textarea
                value={screenshotSendKeysText}
                onChange={(e) => setScreenshotSendKeysText(e.target.value)}
                rows={3}
                placeholder="Type text to send to the active element..."
                className="session-screenshot-send-keys-textarea w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleSendScreenshotKeys}
                  disabled={sendingScreenshotKeys || screenshotSendKeysText.length === 0}
                  className="session-screenshot-send-keys-submit-btn px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 disabled:text-gray-300 text-white rounded text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                  {sendingScreenshotKeys ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="session-screenshot-canvas-wrap flex-1 flex items-start justify-center bg-gray-900 rounded-lg overflow-y-auto overflow-x-hidden min-h-[420px] p-2">
          {previewCapture ? (
            <div className="session-screenshot-preview-stage w-full h-full min-h-0 flex items-center justify-center">
              <img
                src={api.getScreenshotUrl(previewCapture.name)}
                alt={`Preview: ${previewCapture.name}`}
                className="session-screenshot-preview-image max-w-full max-h-full w-auto h-auto rounded"
              />
            </div>
          ) : currentScreenshot ? (
            isLiveScreenshotInteractable ? (
              <div className="session-screenshot-live-interact-mode w-full">
                <div className="session-screenshot-live-hint mb-2 text-[11px] text-gray-400">
                  Live gesture mode: tap image to send tap, drag on image to send swipe.
                </div>
                <div className="session-screenshot-live-stage relative w-full cursor-crosshair">
                  <img
                    ref={screenshotLiveImageRef}
                    src={`data:image/png;base64,${currentScreenshot}`}
                    alt="Current screenshot"
                    className="session-screenshot-live-image w-full h-auto rounded select-none"
                    onPointerDown={handleLiveScreenshotPointerDown}
                    onPointerMove={handleLiveScreenshotPointerMove}
                    onPointerUp={handleLiveScreenshotPointerUp}
                    onPointerCancel={handleLiveScreenshotPointerCancel}
                    style={{ touchAction: 'none' }}
                    title="Tap to send tap, drag to send swipe"
                  />
                  {screenshotGestureStart && screenshotGestureCurrent && (
                    <div className="session-screenshot-gesture-badge absolute left-2 top-2 pointer-events-none rounded bg-gray-900/80 border border-cyan-500/70 px-2 py-1 text-[11px] text-cyan-200 font-mono">
                      {screenshotGestureStart.x},{screenshotGestureStart.y}{' -> '}{screenshotGestureCurrent.x},{screenshotGestureCurrent.y}
                    </div>
                  )}
                  {isRunningScreenshotGesture && (
                    <div className="session-screenshot-gesture-running-badge absolute right-2 top-2 pointer-events-none rounded bg-gray-900/80 border border-amber-500/70 px-2 py-1 text-[11px] text-amber-200">
                      Sending gesture...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="session-screenshot-live-preview-stage w-full h-full min-h-0 flex items-center justify-center">
                <img
                  ref={screenshotLiveImageRef}
                  src={`data:image/png;base64,${currentScreenshot}`}
                  alt="Current screenshot"
                  className="session-screenshot-live-preview-image max-w-full max-h-full w-auto h-auto rounded"
                  title="Enable Live and click Interact for tap/swipe gestures"
                />
              </div>
            )
          ) : (
            <div className="session-screenshot-empty-state text-gray-500 text-sm text-center p-4">
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
  );
}
