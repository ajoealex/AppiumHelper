import { useState } from 'react';
import Home from './pages/Home';
import Session from './pages/Session';

const CONNECTION_KEY = 'appium_helper_connection';

function App() {
  const [connection, setConnection] = useState(() => {
    try {
      const saved = localStorage.getItem(CONNECTION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleConnect = (appiumUrl, sessionId, customHeaders = {}) => {
    const conn = { appiumUrl, sessionId, customHeaders };
    localStorage.setItem(CONNECTION_KEY, JSON.stringify(conn));
    setConnection(conn);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(CONNECTION_KEY);
    setConnection(null);
  };

  if (connection) {
    return (
      <Session
        appiumUrl={connection.appiumUrl}
        sessionId={connection.sessionId}
        customHeaders={connection.customHeaders}
        onDisconnect={handleDisconnect}
      />
    );
  }

  return <Home onConnect={handleConnect} />;
}

export default App;
