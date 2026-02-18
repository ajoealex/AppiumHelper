import React from 'react';

export default function AdvancedSections({
  executeScriptEndpoint,
  setExecuteScriptEndpoint,
  executeScriptMode,
  setExecuteScriptMode,
  executeScript,
  setExecuteScript,
  executeScriptWithArgsJson,
  setExecuteScriptWithArgsJson,
  handleExecuteScript,
  executingScript,
  canSendExecuteScript,
  executeScriptStatus,
  isSuccessStatusCode,
  executeScriptResult,
  REQUEST_HISTORY_LIMIT,
  executedScripts,
  handleExportExecutedScripts,
  setExpandedExecutedScriptId,
  expandedExecutedScriptId,
  handleCopyScript,
  selectedWebDriverPresetTitle,
  handleSelectWebDriverPreset,
  WEBDRIVER_REFERENCE_PRESETS,
  GENERIC_SESSION_ENDPOINT_PREFIX,
  genericEndpoint,
  setGenericEndpoint,
  trimLeadingSlashes,
  genericMethod,
  setGenericMethod,
  genericPayload,
  setGenericPayload,
  handleGenericRequest,
  sendingGeneric,
  genericStatus,
  genericResult,
  executedGenericApis,
  handleExportExecutedGenericApis,
  setExpandedExecutedGenericId,
  expandedExecutedGenericId
}) {
  return (
    <div id="advanced-sections" className="session-advanced-sections-grid grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div id="execute-script-section" className="session-execute-script-panel bg-gray-800 rounded-lg p-6 max-h-175 overflow-y-auto">
        <h2 className="session-execute-script-title text-lg font-semibold text-white mb-4">Execute Script</h2>

        <div className="session-execute-script-body space-y-4">
          <div className="session-execute-endpoint-group">
            <label className="session-execute-endpoint-label block text-gray-300 text-sm font-medium mb-2">
              Endpoint
            </label>
            <select
              value={executeScriptEndpoint}
              onChange={(e) => setExecuteScriptEndpoint(e.target.value)}
              className="session-execute-endpoint-select w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            >
              <option value="/session/{session id}/execute/sync">POST /session/{'{session id}'}/execute/sync</option>
              <option value="/session/{session id}/execute">POST /session/{'{session id}'}/execute</option>
            </select>
          </div>

          <div className="session-execute-mode-group">
            <label className="session-execute-mode-label block text-gray-300 text-sm font-medium mb-2">
              Mode
            </label>
            <select
              value={executeScriptMode}
              onChange={(e) => setExecuteScriptMode(e.target.value)}
              className="session-execute-mode-select w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="scriptOnly">Script only</option>
              <option value="scriptWithArgs">Script + args (JSON)</option>
            </select>
          </div>

          {executeScriptMode === 'scriptOnly' ? (
            <div>
              <label className="session-execute-script-label block text-gray-300 text-sm font-medium mb-2">
                Script
              </label>
              <textarea
                value={executeScript}
                onChange={(e) => setExecuteScript(e.target.value)}
                placeholder="mobile: deviceScreenInfo"
                rows={4}
                className="session-execute-script-textarea w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
              />
            </div>
          ) : (
            <div>
              <label className="session-execute-script-args-label block text-gray-300 text-sm font-medium mb-2">
                Script + Args Payload (JSON)
              </label>
              <textarea
                value={executeScriptWithArgsJson}
                onChange={(e) => setExecuteScriptWithArgsJson(e.target.value)}
                rows={6}
                className="session-execute-script-args-textarea w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
              />
            </div>
          )}

          <button
            onClick={handleExecuteScript}
            disabled={executingScript || !canSendExecuteScript}
            className="session-execute-send-btn w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
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
                  isSuccessStatusCode(executeScriptStatus)
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/50 text-red-400'
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300 text-sm font-medium">
                Executed Scripts (last {REQUEST_HISTORY_LIMIT}) - {executedScripts.length}
              </label>
              <button
                onClick={handleExportExecutedScripts}
                disabled={executedScripts.length === 0}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-[11px] cursor-pointer"
                title="Export execute script history"
              >
                Export JSON
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {executedScripts.length === 0 ? (
                <p className="text-gray-500 text-sm">No scripts executed yet</p>
              ) : (
                executedScripts.map((item) => (
                  <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedExecutedScriptId((prev) => (prev === item.id ? null : item.id))}
                      className="w-full px-3 py-2 hover:bg-gray-800/70 text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg
                            className={`w-3 h-3 text-gray-400 transition-transform ${expandedExecutedScriptId === item.id ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 shrink-0">
                            {item.method}
                          </span>
                          <span className="text-cyan-300 text-[11px] font-mono truncate">{item.endpoint}</span>
                        </div>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                          isSuccessStatusCode(item.statusCode)
                            ? 'bg-green-900/50 text-green-400'
                            : item.statusCode === null
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-red-900/50 text-red-400'
                        }`}>
                          {item.statusCode ?? '-'}
                        </span>
                      </div>
                      <p className="text-gray-500 text-[10px] mt-1 ml-5">
                        {new Date(item.executedAt).toLocaleString()}
                      </p>
                    </button>
                    {expandedExecutedScriptId === item.id && (
                      <div className="border-t border-gray-700 px-3 py-3 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-gray-400 text-xs">Payload</p>
                            <button
                              onClick={() => handleCopyScript(item.payloadText || '')}
                              disabled={!item.payloadText}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-[11px] cursor-pointer"
                              title="Copy payload"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {item.payloadText || '(empty)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Response</p>
                          <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {item.responseText || '(empty)'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="generic-api-section" className="session-generic-api-panel bg-gray-800 rounded-lg p-6 max-h-175 overflow-y-auto">
        <div className="session-generic-api-header flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="session-generic-api-title text-lg font-semibold text-white">Generic WebDriver API</h2>
            <p className="session-generic-api-help text-gray-400 text-xs mt-1">Send any WebDriver command</p>
          </div>
          <div className="session-generic-api-preset-wrap w-80 shrink-0">
            <label className="session-generic-api-preset-label block text-gray-300 text-xs font-medium mb-1">
              WebDriver API Preset
            </label>
            <select
              value={selectedWebDriverPresetTitle}
              onChange={(e) => handleSelectWebDriverPreset(e.target.value)}
              className="session-generic-api-preset-select w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="none">none</option>
              {WEBDRIVER_REFERENCE_PRESETS.map((preset) => (
                <option key={preset.title} value={preset.title}>
                  {preset.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="session-generic-api-body space-y-4">
          <div className="session-generic-api-endpoint-group">
            <label className="session-generic-api-endpoint-label block text-gray-300 text-sm font-medium mb-2">
              Endpoint
            </label>
            <div className="session-generic-api-endpoint-input-wrap flex w-full border border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
              <span className="session-generic-api-endpoint-prefix px-3 py-2 bg-gray-900 text-gray-400 font-mono text-xs whitespace-nowrap border-r border-gray-600">
                {GENERIC_SESSION_ENDPOINT_PREFIX}
              </span>
              <input
                type="text"
                value={genericEndpoint}
                onChange={(e) => setGenericEndpoint(trimLeadingSlashes(e.target.value))}
                placeholder="url (or status for absolute preset)"
                className="session-generic-api-endpoint-input flex-1 px-3 py-2 bg-gray-700 text-white placeholder-gray-400 focus:outline-none font-mono text-sm min-w-0"
              />
            </div>
          </div>

          <div className="session-generic-api-method-group">
            <label className="session-generic-api-method-label block text-gray-300 text-sm font-medium mb-2">
              Method
            </label>
            <select
              value={genericMethod}
              onChange={(e) => setGenericMethod(e.target.value)}
              className="session-generic-api-method-select w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {genericMethod === 'POST' && (
            <div>
              <label className="session-generic-api-payload-label block text-gray-300 text-sm font-medium mb-2">
                Payload (JSON)
              </label>
              <textarea
                value={genericPayload}
                onChange={(e) => setGenericPayload(e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
                className="session-generic-api-payload-textarea w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-none"
              />
            </div>
          )}

          <button
            onClick={handleGenericRequest}
            disabled={sendingGeneric || !genericEndpoint.trim()}
            className="session-generic-api-send-btn w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
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
                  isSuccessStatusCode(genericStatus)
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/50 text-red-400'
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300 text-sm font-medium">
                Executed WebDriver APIs (last {REQUEST_HISTORY_LIMIT}) - {executedGenericApis.length}
              </label>
              <button
                onClick={handleExportExecutedGenericApis}
                disabled={executedGenericApis.length === 0}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-[11px] cursor-pointer"
                title="Export generic API history"
              >
                Export JSON
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {executedGenericApis.length === 0 ? (
                <p className="text-gray-500 text-sm">No APIs executed yet</p>
              ) : (
                executedGenericApis.map((item) => (
                  <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedExecutedGenericId((prev) => (prev === item.id ? null : item.id))}
                      className="w-full px-3 py-2 hover:bg-gray-800/70 text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg
                            className={`w-3 h-3 text-gray-400 transition-transform ${expandedExecutedGenericId === item.id ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                            item.method === 'GET' ? 'bg-green-900/50 text-green-400' :
                            item.method === 'POST' ? 'bg-blue-900/50 text-blue-400' :
                            item.method === 'DELETE' ? 'bg-red-900/50 text-red-400' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {item.method}
                          </span>
                          <span className="text-cyan-300 text-[11px] font-mono truncate">{item.endpoint}</span>
                        </div>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                          isSuccessStatusCode(item.statusCode)
                            ? 'bg-green-900/50 text-green-400'
                            : item.statusCode === null
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-red-900/50 text-red-400'
                        }`}>
                          {item.statusCode ?? '-'}
                        </span>
                      </div>
                      <p className="text-gray-500 text-[10px] mt-1 ml-5">
                        {new Date(item.executedAt).toLocaleString()}
                      </p>
                    </button>
                    {expandedExecutedGenericId === item.id && (
                      <div className="border-t border-gray-700 px-3 py-3 space-y-3">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Payload</p>
                          <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {item.payloadText || '(empty)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Response</p>
                          <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {item.responseText || '(empty)'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
