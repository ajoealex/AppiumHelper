import { useState } from 'react';
import { api } from '../api';

const APPIUM_URL_KEY = 'appiumHelper_lastAppiumUrl';

export default function Home({ onConnect }) {
  const [appiumUrl, setAppiumUrl] = useState(() => {
    return localStorage.getItem(APPIUM_URL_KEY) || 'http://localhost:4723/wd/hub';
  });
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const handleCheckConnection = async () => {
    setLoading(true);
    setError('');
    setSessions([]);
    setSelectedSession('');
    setConnected(false);

    try {
      const data = await api.getSessions(appiumUrl);
      const sessionList = data.value || [];
      setSessions(sessionList);
      setConnected(true);
      localStorage.setItem(APPIUM_URL_KEY, appiumUrl);
      if (sessionList.length > 0) {
        setSelectedSession(sessionList[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to Appium');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (selectedSession) {
      onConnect(appiumUrl, selectedSession);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Appium Helper
        </h1>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Appium Server URL
            </label>
            <input
              type="text"
              value={appiumUrl}
              onChange={(e) => setAppiumUrl(e.target.value)}
              placeholder="http://localhost:4723/wd/hub"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleCheckConnection}
            disabled={loading || !appiumUrl}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Connecting...' : 'Check Connection'}
          </button>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {connected && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-sm">
                  No active sessions found on this Appium server.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Select Session
                    </label>
                    <select
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={!selectedSession}
                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
