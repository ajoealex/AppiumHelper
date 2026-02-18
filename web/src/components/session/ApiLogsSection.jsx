import React from 'react';

export default function ApiLogsSection({
  logs,
  loadLogs,
  logsLoading,
  handleClearLogs,
  handleDeleteAllLogs,
  expandedLogIndex,
  setExpandedLogIndex
}) {
  return (
    <div id="api-logs-section" className="session-api-logs-panel bg-gray-800 rounded-lg p-6 mt-6">
      <div className="session-api-logs-header flex items-center justify-between mb-4">
        <h2 className="session-api-logs-title text-lg font-semibold text-white">
          WebDriver API Logs ({logs.length})
        </h2>
        <div className="session-api-logs-actions flex gap-2">
          <button
            onClick={loadLogs}
            disabled={logsLoading}
            className="session-api-logs-refresh-btn px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
            title="Refresh logs"
          >
            {logsLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="session-api-logs-clear-btn px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
            title="Clear logs from view"
          >
            Clear
          </button>
          <button
            onClick={handleDeleteAllLogs}
            disabled={logs.length === 0}
            className="session-api-logs-delete-all-btn px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
            title="Delete all log files from server"
          >
            Delete All
          </button>
        </div>
      </div>

      <div className="session-api-logs-table-wrap overflow-x-auto">
        {logs.length === 0 ? (
          <p className="session-api-logs-empty text-gray-400 text-sm">No logs available</p>
        ) : (
          <table className="session-api-logs-table w-full text-sm">
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
  );
}
