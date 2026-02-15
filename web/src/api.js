const API_BASE = import.meta.env.API_BASE;

export const api = {
  async getSessions(appiumUrl, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/sessions`, {
      headers: {
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      }
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },


  async getContexts(appiumUrl, sessionId, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/contexts`, {
      headers: {
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      }
    });
    if (!response.ok) throw new Error('Failed to fetch contexts');
    return response.json();
  },

  async setContext(appiumUrl, sessionId, contextName, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      },
      body: JSON.stringify({ name: contextName })
    });
    if (!response.ok) throw new Error('Failed to set context');
    return response.json();
  },

  async executeScript(appiumUrl, sessionId, script, args = [], customHeaders = {}) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      },
      body: JSON.stringify({ script, args })
    });
    if (!response.ok) throw new Error('Failed to execute script');
    return response.json();
  },

  async capture(appiumUrl, sessionId, contextName, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      },
      body: JSON.stringify({ contextName })
    });
    if (!response.ok) throw new Error('Failed to capture');
    return response.json();
  },

  async getScreenshot(appiumUrl, sessionId, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/screenshot`, {
      headers: {
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      }
    });
    if (!response.ok) throw new Error('Failed to get screenshot');
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

  getViewerUrl(captureName) {
    return `${API_BASE}/view/${captureName}/viewer.html`;
  },

  async renameCapture(oldName, newName) {
    const response = await fetch(`${API_BASE}/captures/${encodeURIComponent(oldName)}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName })
    });
    if (!response.ok) throw new Error('Failed to rename capture');
    return response.json();
  },

  async deleteCapture(name) {
    const response = await fetch(`${API_BASE}/captures/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete capture');
    return response.json();
  },

  async deleteAllCaptures() {
    const response = await fetch(`${API_BASE}/captures`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete all captures');
    return response.json();
  },

  async getLogs(limit = 10) {
    const response = await fetch(`${API_BASE}/logs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  },

  async deleteLogs() {
    const response = await fetch(`${API_BASE}/logs`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete logs');
    return response.json();
  },

  async genericRequest(appiumUrl, sessionId, endpoint, method = 'GET', payload = null, customHeaders = {}) {
    const body = method === 'POST' && payload
      ? { endpoint, method, payload }
      : { endpoint, method };

    const response = await fetch(`${API_BASE}/session/${sessionId}/generic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }
};
