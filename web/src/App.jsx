import { useState } from 'react';
import Home from './pages/Home';
import Session from './pages/Session';
import Captures from './pages/Captures';

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
  const [activePage, setActivePage] = useState('home');

  const handleConnect = (appiumUrl, sessionId, customHeaders = {}) => {
    const conn = { appiumUrl, sessionId, customHeaders };
    localStorage.setItem(CONNECTION_KEY, JSON.stringify(conn));
    setConnection(conn);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(CONNECTION_KEY);
    setConnection(null);
  };

  const handleOpenCaptures = () => {
    setActivePage('captures');
  };

  const handleBackToHome = () => {
    setActivePage('home');
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

  if (activePage === 'captures') {
    return <Captures onBack={handleBackToHome} />;
  }

  return <Home onConnect={handleConnect} onOpenCaptures={handleOpenCaptures} />;
}

export default App;
