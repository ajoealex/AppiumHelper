import { useState } from 'react';
import Home from './pages/Home';
import Session from './pages/Session';

function App() {
  const [connection, setConnection] = useState(null);

  const handleConnect = (appiumUrl, sessionId, customHeaders = {}) => {
    setConnection({ appiumUrl, sessionId, customHeaders });
  };

  const handleDisconnect = () => {
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
