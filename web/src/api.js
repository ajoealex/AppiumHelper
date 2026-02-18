const API_PORT = import.meta.env.API_PORT;
const RUNTIME_PROTOCOL = window.location.protocol;
const RUNTIME_HOST = window.location.hostname;
const API_BASE = `${RUNTIME_PROTOCOL}//${RUNTIME_HOST}:${API_PORT}`;
const W3C_ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

async function readErrorPayload(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return '';
  }
}

async function throwHttpError(response, fallbackMessage) {
  const payload = await readErrorPayload(response);
  const prefix = `${fallbackMessage} (${response.status} ${response.statusText})`;
  const error = new Error(prefix);
  error.statusCode = response.status;
  error.responsePayload = payload;
  throw error;
}

function buildTapActions({ x = 0, y = 0, origin = 'viewport' } = {}) {
  return {
    actions: [
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, origin, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 50 },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]
  };
}

export const api = {
  async getSessions(appiumUrl, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/sessions`, {
      headers: {
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      }
    });
    if (!response.ok) await throwHttpError(response, 'Failed to fetch sessions');
    return response.json();
  },


  async getContexts(appiumUrl, sessionId, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/contexts`, {
      headers: {
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      }
    });
    if (!response.ok) await throwHttpError(response, 'Failed to fetch contexts');
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
    if (!response.ok) await throwHttpError(response, 'Failed to set context');
    return response.json();
  },

  async getCurrentContext(appiumUrl, sessionId, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      '/session/{session id}/context',
      'GET',
      null,
      customHeaders
    );
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
    if (!response.ok) await throwHttpError(response, 'Failed to execute script');
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
    if (!response.ok) await throwHttpError(response, 'Failed to capture');
    return response.json();
  },

  async getScreenshot(appiumUrl, sessionId, customHeaders = {}) {
    const response = await fetch(`${API_BASE}/session/${sessionId}/screenshot`, {
      headers: {
        'X-Appium-URL': appiumUrl,
        'X-Custom-Headers': JSON.stringify(customHeaders)
      }
    });
    if (!response.ok) await throwHttpError(response, 'Failed to get screenshot');
    return response.json();
  },

  async getCaptures() {
    const response = await fetch(`${API_BASE}/captures`);
    if (!response.ok) await throwHttpError(response, 'Failed to fetch captures');
    return response.json();
  },

  getScreenshotUrl(captureName) {
    return `${API_BASE}/captures/${encodeURIComponent(captureName)}/screenshot`;
  },

  getViewerUrl(captureName) {
    return `${API_BASE}/view/${encodeURIComponent(captureName)}/viewer.html`;
  },

  async renameCapture(oldName, newName) {
    const response = await fetch(`${API_BASE}/captures/${encodeURIComponent(oldName)}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName })
    });
    if (!response.ok) await throwHttpError(response, 'Failed to rename capture');
    return response.json();
  },

  async deleteCapture(name) {
    const response = await fetch(`${API_BASE}/captures/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (!response.ok) await throwHttpError(response, 'Failed to delete capture');
    return response.json();
  },

  async deleteAllCaptures() {
    const response = await fetch(`${API_BASE}/captures`, {
      method: 'DELETE'
    });
    if (!response.ok) await throwHttpError(response, 'Failed to delete all captures');
    return response.json();
  },

  async getLogs(limit = 10) {
    const response = await fetch(`${API_BASE}/logs?limit=${limit}`);
    if (!response.ok) await throwHttpError(response, 'Failed to fetch logs');
    return response.json();
  },

  async deleteLogs() {
    const response = await fetch(`${API_BASE}/logs`, {
      method: 'DELETE'
    });
    if (!response.ok) await throwHttpError(response, 'Failed to delete logs');
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
    if (!response.ok) await throwHttpError(response, 'Request failed');
    return response.json();
  },

  async findElements(appiumUrl, sessionId, using, value, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      '/session/{session id}/elements',
      'POST',
      { using, value },
      customHeaders
    );
  },

  async findChildElements(appiumUrl, sessionId, parentElementId, using, value, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      `/session/{session id}/element/${encodeURIComponent(parentElementId)}/elements`,
      'POST',
      { using, value },
      customHeaders
    );
  },

  async checkElementExists(appiumUrl, sessionId, elementId, customHeaders = {}) {
    return this.getElementRect(appiumUrl, sessionId, elementId, customHeaders);
  },

  async getElementRect(appiumUrl, sessionId, elementId, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      `/session/{session id}/element/${encodeURIComponent(elementId)}/rect`,
      'GET',
      null,
      customHeaders
    );
  },

  async clickElement(appiumUrl, sessionId, elementId, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      `/session/{session id}/element/${encodeURIComponent(elementId)}/click`,
      'POST',
      {},
      customHeaders
    );
  },

  async sendKeysToElement(appiumUrl, sessionId, elementId, text, mode = 'w3c', customHeaders = {}) {
    const textValue = typeof text === 'string' ? text : String(text ?? '');
    const resolvedMode = typeof mode === 'string' ? mode : 'w3c';
    const payload = resolvedMode === 'legacy'
      ? { value: Array.from(textValue) }
      : { text: textValue };

    return this.genericRequest(
      appiumUrl,
      sessionId,
      `/session/{session id}/element/${encodeURIComponent(elementId)}/value`,
      'POST',
      payload,
      customHeaders
    );
  },

  async sendKeysToFocusedElement(appiumUrl, sessionId, text, mode = 'w3c', customHeaders = {}) {
    const textValue = typeof text === 'string' ? text : String(text ?? '');
    const resolvedMode = typeof mode === 'string' ? mode : 'w3c';
    const payload = resolvedMode === 'legacy'
      ? { value: Array.from(textValue) }
      : { text: textValue };

    return this.genericRequest(
      appiumUrl,
      sessionId,
      '/session/{session id}/keys',
      'POST',
      payload,
      customHeaders
    );
  },

  async tapElement(appiumUrl, sessionId, elementId, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      '/session/{session id}/actions',
      'POST',
      buildTapActions({ origin: { [W3C_ELEMENT_KEY]: elementId }, x: 0, y: 0 }),
      customHeaders
    );
  },

  async tapByCoordinates(appiumUrl, sessionId, x, y, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      '/session/{session id}/actions',
      'POST',
      buildTapActions({ x, y }),
      customHeaders
    );
  },

  async clickByCoordinates(appiumUrl, sessionId, x, y, customHeaders = {}) {
    return this.genericRequest(
      appiumUrl,
      sessionId,
      '/session/{session id}/actions',
      'POST',
      {
        actions: [
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x, y },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerUp', button: 0 }
            ]
          }
        ]
      },
      customHeaders
    );
  }
};
