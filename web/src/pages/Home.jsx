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
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => updateCredential('username', e.target.value)}
              placeholder="Your username"
              className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            />
          </div>
        )}

        {vendor.fields.includes('accessKey') && (
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Access Key
            </label>
            <input
              type="password"
              value={credentials.accessKey}
              onChange={(e) => updateCredential('accessKey', e.target.value)}
              placeholder="Your access key"
              className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            />
          </div>
        )}

        {vendor.fields.includes('region') && (
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Region
            </label>
            <select
              value={credentials.region}
              onChange={(e) => updateCredential('region', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
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
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Host
            </label>
            <input
              type="text"
              value={credentials.host}
              onChange={(e) => updateCredential('host', e.target.value)}
              placeholder="your-instance.digitalai.com"
              className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            />
          </div>
        )}

        {vendor.fields.includes('customUrl') && (
          <>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                WebDriver URL
              </label>
              <input
                type="text"
                value={credentials.customUrl}
                onChange={(e) => updateCredential('customUrl', e.target.value)}
                placeholder="https://host/wd/hub"
                className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <div className="border-t border-gray-700/50 pt-3 mt-3">
              <label className="block text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">
                Authentication (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={credentials.customUsername}
                  onChange={(e) => updateCredential('customUsername', e.target.value)}
                  placeholder="Username"
                  className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                />
                <input
                  type="password"
                  value={credentials.customAccessKey}
                  onChange={(e) => updateCredential('customAccessKey', e.target.value)}
                  placeholder="Access Key"
                  className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleSetCustomAuth}
                className="mt-2 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors cursor-pointer"
              >
                Set Authorization Header
              </button>
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                Custom Headers (JSON)
              </label>
              <textarea
                value={customHeaders}
                onChange={(e) => handleHeadersChange(e.target.value)}
                placeholder='{"Authorization": "Basic ...", "X-Custom-Header": "value"}'
                rows={3}
                className={`w-full px-3 py-2 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono transition-all ${headersError ? 'border-red-500' : 'border-gray-700'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-8 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Appium Helper
          </h1>
          <p className="text-gray-400 text-lg">
            Connect to local or cloud Appium sessions, reattach to active session IDs, and debug with screenshots, XML source, and WebDriver actions
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Local Appium Connection */}
            <div className="group relative">
              <div className="relative overflow-hidden bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                  <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                </div>
                <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-xl">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Local Appium</h2>
                    <p className="text-gray-500 text-xs">Connect to a local Appium server</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Server URL
                    </label>
                    <input
                      type="text"
                      value={appiumUrl}
                      onChange={(e) => setAppiumUrl(e.target.value)}
                      placeholder="http://localhost:4723/wd/hub"
                      className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono transition-all"
                    />
                  </div>

                  <button
                    onClick={handleLocalCheckConnection}
                    disabled={localLoading || !appiumUrl}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {localLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Check Connection
                      </>
                    )}
                  </button>

                  {localError && (
                    <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {localError}
                    </div>
                  )}

                  {localConnected && (
                    <div className="space-y-4 pt-2">
                      {localSessions.length === 0 ? (
                        <div className="p-3 bg-yellow-900/30 border border-yellow-800/50 rounded-lg text-yellow-300 text-sm flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          No active sessions found
                        </div>
                      ) : (
                        <>
                          <div className="p-3 bg-green-900/30 border border-green-800/50 rounded-lg text-green-300 text-sm flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Found {localSessions.length} session{localSessions.length !== 1 ? 's' : ''}
                          </div>

                          <div>
                            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                              Select Session
                            </label>
                            <select
                              value={selectedLocalSession}
                              onChange={(e) => setSelectedLocalSession(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono transition-all"
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
                            className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            Connect to Session
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>

            {/* Remote Vendor Connection */}
            <div className="relative overflow-hidden bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700/50 hover:border-purple-500/30 transition-colors">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
                  <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
                </div>
                <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-xl">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Remote Vendor</h2>
                    <p className="text-gray-500 text-xs">Connect to cloud testing platforms</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Provider
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {Object.entries(VENDORS).map(([key]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedVendor(key)}
                          className={`py-2 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${selectedVendor === key
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                            }`}
                        >
                          {key === 'browserstack' ? 'BS' :
                            key === 'saucelabs' ? 'SL' :
                              key === 'lambdatest' ? 'LT' :
                                key === 'digitalai' ? 'DAI' : 'URL'}
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs mt-1.5">{VENDORS[selectedVendor].name}</p>
                  </div>

                  {renderVendorFields()}

                  <div className="border-t border-gray-700/50 pt-4 mt-4">
                    <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Session ID
                    </label>
                    <input
                      type="text"
                      value={selectedRemoteSession}
                      onChange={(e) => setSelectedRemoteSession(e.target.value)}
                      placeholder="Enter active remote session ID"
                      className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono transition-all"
                    />
                  </div>

                  <button
                    onClick={handleRemoteConnect}
                    disabled={!isRemoteValid() || !selectedRemoteSession.trim()}
                    className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Connect to Session
                  </button>
                </div>
                </div>
              </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-gray-800">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-6 text-gray-500 text-sm">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Screenshots
          </span>
          <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            XML Source
          </span>
          <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            WebDriver API
          </span>
        </div>
      </footer>
    </div>
  );
}
