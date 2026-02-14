const API_BASE = 'http://127.0.0.1:3001';

export const api = {
  async getSessions(appiumUrl) {
    const response = await fetch(`${API_BASE}/sessions`, {
      headers: { 'X-Appium-URL': appiumUrl }
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  async getContexts(appiumUrl, sessionId) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/contexts`, {
      headers: { 'X-Appium-URL': appiumUrl }
    });
    if (!response.ok) throw new Error('Failed to fetch contexts');
    return response.json();
  },

  async capture(appiumUrl, sessionId, contextName) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appium-URL': appiumUrl
      },
      body: JSON.stringify({ contextName })
    });
    if (!response.ok) throw new Error('Failed to capture');
    return response.json();
  },

  async getCaptures() {
    const response = await fetch(`${API_BASE}/captures`);
    if (!response.ok) throw new Error('Failed to fetch captures');
    return response.json();
  },

  getScreenshotUrl(captureName) {
    return `${API_BASE}/captures/${encodeURIComponent(captureName)}/screenshot`;
  },

  async renameCapture(oldName, newName) {
    const response = await fetch(`${API_BASE}/captures/${encodeURIComponent(oldName)}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName })
    });
    if (!response.ok) throw new Error('Failed to rename capture');
    return response.json();
  }
};
