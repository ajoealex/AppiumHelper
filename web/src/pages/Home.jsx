import { useState } from 'react';
import { api } from '../api';

const APPIUM_URL_KEY = 'appiumHelper_lastAppiumUrl';
const REMOTE_VENDOR_KEY = 'appiumHelper_remoteVendor';
const REMOTE_CREDENTIALS_KEY = 'appiumHelper_remoteCredentials';
const CUSTOM_HEADERS_KEY = 'appiumHelper_customHeaders';

const VENDORS = {
  browserstack: {
    name: 'BrowserStack',
    baseUrl: 'hub-cloud.browserstack.com/wd/hub',
    fields: ['username', 'accessKey'],
    buildUrl: (creds) => `https://${creds.username}:${creds.accessKey}@hub-cloud.browserstack.com/wd/hub`
  },
  saucelabs: {
    name: 'Sauce Labs',
    baseUrl: 'ondemand.<region>.saucelabs.com/wd/hub',
    fields: ['username', 'accessKey', 'region'],
    regions: ['us-west-1', 'us-east-4', 'eu-central-1', 'apac-southeast-1'],
    buildUrl: (creds) => `https://${creds.username}:${creds.accessKey}@ondemand.${creds.region}.saucelabs.com/wd/hub`
  },
  lambdatest: {
    name: 'LambdaTest',
    baseUrl: 'mobile-hub.lambdatest.com/wd/hub',
    fields: ['username', 'accessKey'],
    buildUrl: (creds) => `https://${creds.username}:${creds.accessKey}@mobile-hub.lambdatest.com/wd/hub`
  },
  digitalai: {
    name: 'Digital.ai',
    baseUrl: '<host>/wd/hub',
    fields: ['host', 'accessKey'],
    buildUrl: (creds) => {
      const host = creds.host.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return creds.accessKey
        ? `https://${creds.accessKey}@${host}/wd/hub`
        : `https://${host}/wd/hub`;
    }
  },
  custom: {
    name: 'Custom URL',
    fields: ['customUrl', 'customUsername', 'customAccessKey'],
    buildUrl: (creds) => creds.customUrl
  }
};

export default function Home({ onConnect }) {
  // Local Appium state
  const [appiumUrl, setAppiumUrl] = useState(() => {
    return localStorage.getItem(APPIUM_URL_KEY) || 'http://localhost:4723/wd/hub';
  });
  const [localSessions, setLocalSessions] = useState([]);
  const [selectedLocalSession, setSelectedLocalSession] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localConnected, setLocalConnected] = useState(false);

  // Remote vendor state
  const [selectedVendor, setSelectedVendor] = useState(() => {
    return localStorage.getItem(REMOTE_VENDOR_KEY) || 'browserstack';
  });
  const [credentials, setCredentials] = useState(() => {
    const saved = localStorage.getItem(REMOTE_CREDENTIALS_KEY);
    return saved ? JSON.parse(saved) : {
      username: '',
      accessKey: '',
      region: 'us-west-1',
      host: '',
      customUrl: '',
      customUsername: '',
      customAccessKey: ''
    };
  });
  const [customHeaders, setCustomHeaders] = useState(() => {
    const saved = localStorage.getItem(CUSTOM_HEADERS_KEY);
    return saved || '{}';
  });
  const [headersError, setHeadersError] = useState('');
  const [selectedRemoteSession, setSelectedRemoteSession] = useState('');
  const handleLocalCheckConnection = async () => {
    setLocalLoading(true);
    setLocalError('');
    setLocalSessions([]);
    setSelectedLocalSession('');
    setLocalConnected(false);

    try {
      const data = await api.getSessions(appiumUrl);
      const sessionList = data.value || [];
      setLocalSessions(sessionList);
      setLocalConnected(true);
      localStorage.setItem(APPIUM_URL_KEY, appiumUrl);
      if (sessionList.length > 0) {
        setSelectedLocalSession(sessionList[0].id);
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to connect to Appium');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLocalConnect = () => {
    if (selectedLocalSession) {
      onConnect(appiumUrl, selectedLocalSession);
    }
  };

  const getRemoteHeaders = () => {
    if (selectedVendor === 'custom') {
      try {
        return JSON.parse(customHeaders);
      } catch {
        return {};
      }
    }
    return {};
  };


  const handleRemoteConnect = () => {
    const sessionId = selectedRemoteSession.trim();
    if (!sessionId || !isRemoteValid()) {
      return;
    }

    const vendor = VENDORS[selectedVendor];
    const remoteUrl = vendor.buildUrl(credentials);
    const headers = getRemoteHeaders();

    localStorage.setItem(REMOTE_VENDOR_KEY, selectedVendor);
    localStorage.setItem(REMOTE_CREDENTIALS_KEY, JSON.stringify(credentials));
    if (selectedVendor === 'custom') {
      localStorage.setItem(CUSTOM_HEADERS_KEY, customHeaders);
    }

    onConnect(remoteUrl, sessionId, headers);
  };

  const updateCredential = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleSetCustomAuth = () => {
    const { customUsername, customAccessKey } = credentials;
    if (!customUsername && !customAccessKey) {
      setHeadersError('');
      return;
    }

    try {
      const currentHeaders = JSON.parse(customHeaders || '{}');
      const authValue = btoa(`${customUsername}:${customAccessKey}`);
      currentHeaders['Authorization'] = `Basic ${authValue}`;
      setCustomHeaders(JSON.stringify(currentHeaders, null, 2));
      setHeadersError('');
    } catch {
      setHeadersError('Invalid JSON in headers');
    }
  };

  const handleHeadersChange = (value) => {
    setCustomHeaders(value);
    try {
      JSON.parse(value);
      setHeadersError('');
    } catch {
      setHeadersError('Invalid JSON');
    }
  };

  const renderVendorFields = () => {
    const vendor = VENDORS[selectedVendor];

    return (
      <div className="space-y-3">
        {vendor.fields.includes('username') && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => updateCredential('username', e.target.value)}
              placeholder="Your username"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        {vendor.fields.includes('accessKey') && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Access Key
            </label>
            <input
              type="password"
              value={credentials.accessKey}
              onChange={(e) => updateCredential('accessKey', e.target.value)}
              placeholder="Your access key"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        {vendor.fields.includes('region') && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Region
            </label>
            <select
              value={credentials.region}
              onChange={(e) => updateCredential('region', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              {vendor.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        )}

        {vendor.fields.includes('host') && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Host
            </label>
            <input
              type="text"
              value={credentials.host}
              onChange={(e) => updateCredential('host', e.target.value)}
              placeholder="your-instance.digitalai.com"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        {vendor.fields.includes('customUrl') && (
          <>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                WebDriver URL
              </label>
              <input
                type="text"
                value={credentials.customUrl}
                onChange={(e) => updateCredential('customUrl', e.target.value)}
                placeholder="https://host/wd/hub"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="border-t border-gray-600 pt-3">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Authentication (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={credentials.customUsername}
                  onChange={(e) => updateCredential('customUsername', e.target.value)}
                  placeholder="Username"
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <input
                  type="password"
                  value={credentials.customAccessKey}
                  onChange={(e) => updateCredential('customAccessKey', e.target.value)}
                  placeholder="Access Key"
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleSetCustomAuth}
                className="mt-2 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors cursor-pointer"
              >
                Set Authorization Header
              </button>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Custom Headers (JSON)
              </label>
              <textarea
                value={customHeaders}
                onChange={(e) => handleHeadersChange(e.target.value)}
                placeholder='{"Authorization": "Basic ...", "X-Custom-Header": "value"}'
                rows={4}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono ${
                  headersError ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {headersError && (
                <p className="text-red-400 text-xs mt-1">{headersError}</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const isRemoteValid = () => {
    if (selectedVendor === 'custom') {
      return credentials.customUrl.trim() !== '' && !headersError;
    }
    if (selectedVendor === 'digitalai') {
      return credentials.host.trim() !== '';
    }
    return credentials.username.trim() !== '' && credentials.accessKey.trim() !== '';
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Appium Helper
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Local Appium Connection */}
          <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-white">Local Appium</h2>
            </div>

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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <button
                onClick={handleLocalCheckConnection}
                disabled={localLoading || !appiumUrl}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {localLoading ? 'Connecting...' : 'Check Connection'}
              </button>

              {localError && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                  {localError}
                </div>
              )}

              {localConnected && (
                <div className="space-y-4">
                  {localSessions.length === 0 ? (
                    <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-sm">
                      No active sessions found.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                          Select Session
                        </label>
                        <select
                          value={selectedLocalSession}
                          onChange={(e) => setSelectedLocalSession(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {localSessions.map((session) => (
                            <option key={session.id} value={session.id}>
                              {session.id}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleLocalConnect}
                        disabled={!selectedLocalSession}
                        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        Connect
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Remote Vendor Connection */}
          <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-white">Remote Vendor</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Select Vendor
                </label>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {Object.entries(VENDORS).map(([key, vendor]) => (
                    <option key={key} value={key}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              {renderVendorFields()}

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Session ID
                </label>
                <input
                  type="text"
                  value={selectedRemoteSession}
                  onChange={(e) => setSelectedRemoteSession(e.target.value)}
                  placeholder="Enter active remote session id"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
                />
              </div>

              <button
                onClick={handleRemoteConnect}
                disabled={!isRemoteValid() || !selectedRemoteSession.trim()}
                className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

