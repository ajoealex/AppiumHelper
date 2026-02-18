import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import CaptureViewer from '../components/CaptureViewer';

const ELEMENT_ID_KEYS = ['element-6066-11e4-a52e-4f735466cecf', 'ELEMENT'];
const FIND_STRATEGIES = [
  { label: 'ID', value: 'id', platform: 'Any' },
  { label: 'Name', value: 'name', platform: 'Any' },
  { label: 'Class name', value: 'class name', platform: 'Any' },
  { label: 'XPath', value: 'xpath', platform: 'Any' },
  { label: 'CSS selector', value: 'css selector', platform: 'Any' },
  { label: 'Link text', value: 'link text', platform: 'Any' },
  { label: 'Partial link text', value: 'partial link text', platform: 'Any' },
  { label: 'Tag name', value: 'tag name', platform: 'Any' },
  { label: 'Accessibility ID', value: 'accessibility id', platform: 'iOS/Android' },
  { label: 'UIAutomator', value: '-android uiautomator', platform: 'Android' },
  { label: 'View tag', value: '-android viewtag', platform: 'Android' },
  { label: 'Data matcher', value: '-android datamatcher', platform: 'Android' },
  { label: 'Predicate string', value: '-ios predicate string', platform: 'iOS' },
  { label: 'Class chain', value: '-ios class chain', platform: 'iOS' }
];
const DEFAULT_XPATH_SELECTOR = "(//*[@*='Open WebView'])[1]";
const ELEMENT_PROPERTY_ENDPOINT_OPTIONS = [
  {
    value: 'property',
    label: 'Property (Web)',
    endpoint: '/session/{sessionId}/element/{elementId}/property/{name}',
    requiresName: true
  },
  {
    value: 'attribute',
    label: 'Attribute (Mobile App)',
    endpoint: '/session/{sessionId}/element/{elementId}/attribute/{name}',
    requiresName: true
  }
];
const EXECUTE_SCRIPT_PAYLOAD_EXAMPLE = `{
  "script": "mobile: alert",
  "args": [{ "action": "getButtons" }]
}`;
const REQUEST_HISTORY_LIMIT = 10;
const GENERIC_SESSION_ENDPOINT_PREFIX = '/session/{session id}/';
const WEBDRIVER_REFERENCE_PRESETS = [
  { title: 'New Session', method: 'POST', endpoint: '/session', payload: '{\\n  "capabilities": {\\n    "alwaysMatch": {\\n      "browserName": "chrome"\\n    }\\n  }\\n}' },
  { title: 'Delete Session', method: 'DELETE', endpoint: '/session/{sessionId}', payload: '' },
  { title: 'Status', method: 'GET', endpoint: '/status', payload: '' },
  { title: 'Get Timeouts', method: 'GET', endpoint: '/session/{sessionId}/timeouts', payload: '' },
  { title: 'Set Timeouts', method: 'POST', endpoint: '/session/{sessionId}/timeouts', payload: '{\\n  "implicit": 5000,\\n  "pageLoad": 300000,\\n  "script": 30000\\n}' },
  { title: 'Navigate To', method: 'POST', endpoint: '/session/{sessionId}/url', payload: '{\\n  "url": "https://example.com"\\n}' },
  { title: 'Get Current URL', method: 'GET', endpoint: '/session/{sessionId}/url', payload: '' },
  { title: 'Back', method: 'POST', endpoint: '/session/{sessionId}/back', payload: '{}' },
  { title: 'Forward', method: 'POST', endpoint: '/session/{sessionId}/forward', payload: '{}' },
  { title: 'Refresh', method: 'POST', endpoint: '/session/{sessionId}/refresh', payload: '{}' },
  { title: 'Get Title', method: 'GET', endpoint: '/session/{sessionId}/title', payload: '' },
  { title: 'Get Window Handle', method: 'GET', endpoint: '/session/{sessionId}/window', payload: '' },
  { title: 'Close Window', method: 'DELETE', endpoint: '/session/{sessionId}/window', payload: '' },
  { title: 'Switch To Window', method: 'POST', endpoint: '/session/{sessionId}/window', payload: '{\\n  "handle": "CDwindow-123"\\n}' },
  { title: 'Get Window Handles', method: 'GET', endpoint: '/session/{sessionId}/window/handles', payload: '' },
  { title: 'New Window', method: 'POST', endpoint: '/session/{sessionId}/window/new', payload: '{\\n  "type": "tab"\\n}' },
  { title: 'Switch To Frame', method: 'POST', endpoint: '/session/{sessionId}/frame', payload: '{\\n  "id": 0\\n}' },
  { title: 'Switch To Parent Frame', method: 'POST', endpoint: '/session/{sessionId}/frame/parent', payload: '{}' },
  { title: 'Get Window Rect', method: 'GET', endpoint: '/session/{sessionId}/window/rect', payload: '' },
  { title: 'Set Window Rect', method: 'POST', endpoint: '/session/{sessionId}/window/rect', payload: '{\\n  "x": 0,\\n  "y": 0,\\n  "width": 1280,\\n  "height": 800\\n}' },
  { title: 'Maximize Window', method: 'POST', endpoint: '/session/{sessionId}/window/maximize', payload: '{}' },
  { title: 'Minimize Window', method: 'POST', endpoint: '/session/{sessionId}/window/minimize', payload: '{}' },
  { title: 'Fullscreen Window', method: 'POST', endpoint: '/session/{sessionId}/window/fullscreen', payload: '{}' },
  { title: 'Get Active Element', method: 'GET', endpoint: '/session/{sessionId}/element/active', payload: '' },
  { title: 'Get Element Shadow Root', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/shadow', payload: '' },
  { title: 'Find Element', method: 'POST', endpoint: '/session/{sessionId}/element', payload: '{\\n  "using": "xpath",\\n  "value": "//input[@id=\\\'username\\\']"\\n}' },
  { title: 'Find Elements', method: 'POST', endpoint: '/session/{sessionId}/elements', payload: '{\\n  "using": "css selector",\\n  "value": ".btn"\\n}' },
  { title: 'Find Element From Element', method: 'POST', endpoint: '/session/{sessionId}/element/{elementId}/element', payload: '{\\n  "using": "css selector",\\n  "value": "span"\\n}' },
  { title: 'Find Elements From Element', method: 'POST', endpoint: '/session/{sessionId}/element/{elementId}/elements', payload: '{\\n  "using": "css selector",\\n  "value": "span"\\n}' },
  { title: 'Find Element From Shadow Root', method: 'POST', endpoint: '/session/{sessionId}/shadow/{shadowId}/element', payload: '{\\n  "using": "css selector",\\n  "value": "button"\\n}' },
  { title: 'Find Elements From Shadow Root', method: 'POST', endpoint: '/session/{sessionId}/shadow/{shadowId}/elements', payload: '{\\n  "using": "css selector",\\n  "value": "button"\\n}' },
  { title: 'Is Element Selected', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/selected', payload: '' },
  { title: 'Get Element Property', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/property/{name}', payload: '' },
  { title: 'Get Element Text', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/text', payload: '' },
  { title: 'Get Element Tag Name', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/name', payload: '' },
  { title: 'Get Element Rect', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/rect', payload: '' },
  { title: 'Is Element Enabled', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/enabled', payload: '' },
  { title: 'Get Computed Role', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/computedrole', payload: '' },
  { title: 'Get Computed Label', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/computedlabel', payload: '' },
  { title: 'Element Click', method: 'POST', endpoint: '/session/{sessionId}/element/{elementId}/click', payload: '{}' },
  { title: 'Element Clear', method: 'POST', endpoint: '/session/{sessionId}/element/{elementId}/clear', payload: '{}' },
  { title: 'Element Send Keys', method: 'POST', endpoint: '/session/{sessionId}/element/{elementId}/value', payload: '{\\n  "text": "Hello World"\\n}' },
  { title: 'Get Page Source', method: 'GET', endpoint: '/session/{sessionId}/source', payload: '' },
  { title: 'Execute Script', method: 'POST', endpoint: '/session/{sessionId}/execute/sync', payload: '{\\n  "script": "return document.title;",\\n  "args": []\\n}' },
  { title: 'Execute Async Script', method: 'POST', endpoint: '/session/{sessionId}/execute/async', payload: '{\\n  "script": "var cb = arguments[arguments.length - 1]; cb(\\\'done\\\');",\\n  "args": []\\n}' },
  { title: 'Get All Cookies', method: 'GET', endpoint: '/session/{sessionId}/cookie', payload: '' },
  { title: 'Get Named Cookie', method: 'GET', endpoint: '/session/{sessionId}/cookie/{name}', payload: '' },
  { title: 'Add Cookie', method: 'POST', endpoint: '/session/{sessionId}/cookie', payload: '{\\n  "cookie": {\\n    "name": "sessionId",\\n    "value": "12345",\\n    "path": "/",\\n    "secure": false\\n  }\\n}' },
  { title: 'Delete Cookie', method: 'DELETE', endpoint: '/session/{sessionId}/cookie/{name}', payload: '' },
  { title: 'Delete All Cookies', method: 'DELETE', endpoint: '/session/{sessionId}/cookie', payload: '' },
  { title: 'Perform Actions', method: 'POST', endpoint: '/session/{sessionId}/actions', payload: '{\\n  "actions": [\\n    {\\n      "type": "pointer",\\n      "id": "mouse",\\n      "parameters": { "pointerType": "mouse" },\\n      "actions": [\\n        { "type": "pointerMove", "duration": 0, "x": 100, "y": 200 },\\n        { "type": "pointerDown", "button": 0 },\\n        { "type": "pointerUp", "button": 0 }\\n      ]\\n    }\\n  ]\\n}' },
  { title: 'Release Actions', method: 'DELETE', endpoint: '/session/{sessionId}/actions', payload: '' },
  { title: 'Dismiss Alert', method: 'POST', endpoint: '/session/{sessionId}/alert/dismiss', payload: '{}' },
  { title: 'Accept Alert', method: 'POST', endpoint: '/session/{sessionId}/alert/accept', payload: '{}' },
  { title: 'Get Alert Text', method: 'GET', endpoint: '/session/{sessionId}/alert/text', payload: '' },
  { title: 'Send Alert Text', method: 'POST', endpoint: '/session/{sessionId}/alert/text', payload: '{\\n  "text": "Input text"\\n}' },
  { title: 'Take Screenshot', method: 'GET', endpoint: '/session/{sessionId}/screenshot', payload: '' },
  { title: 'Take Element Screenshot', method: 'GET', endpoint: '/session/{sessionId}/element/{elementId}/screenshot', payload: '' },
  { title: 'Print Page', method: 'POST', endpoint: '/session/{sessionId}/print', payload: '{\\n  "orientation": "portrait",\\n  "scale": 1,\\n  "background": true\\n}' }
];

function isSuccessStatusCode(statusCode) {
  return Number.isInteger(statusCode) && statusCode >= 200 && statusCode < 300;
}

function normalizeExecutedScriptStatusCode(statusCode) {
  if (Number.isInteger(statusCode)) return statusCode;
  return statusCode === 'Error' ? 'Error' : null;
}

function normalizeExecutedScriptHistoryItem(item) {
  if (!item || typeof item !== 'object') return null;

  const endpoint = typeof item.endpoint === 'string' ? item.endpoint.trim() : '';
  const executedAt = typeof item.executedAt === 'string' ? item.executedAt.trim() : '';
  if (!endpoint || !executedAt) return null;

  const methodRaw = typeof item.method === 'string' ? item.method.trim().toUpperCase() : '';
  const method = methodRaw || 'POST';
  const payloadText = typeof item.payloadText === 'string'
    ? item.payloadText
    : typeof item.requestText === 'string'
      ? item.requestText
      : typeof item.script === 'string'
        ? item.script
        : '';
  const responseText = typeof item.responseText === 'string' ? item.responseText : '';

  return {
    id: typeof item.id === 'string' && item.id.trim()
      ? item.id
      : `${executedAt}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    endpoint,
    statusCode: normalizeExecutedScriptStatusCode(item.statusCode),
    payloadText,
    responseText,
    executedAt
  };
}

function normalizeExecutedGenericApiStatusCode(statusCode) {
  if (Number.isInteger(statusCode)) return statusCode;
  return statusCode === 'Error' ? 'Error' : null;
}

function normalizeExecutedGenericApiHistoryItem(item) {
  if (!item || typeof item !== 'object') return null;

  const endpoint = typeof item.endpoint === 'string' ? item.endpoint.trim() : '';
  const executedAt = typeof item.executedAt === 'string' ? item.executedAt.trim() : '';
  if (!endpoint || !executedAt) return null;

  const methodRaw = typeof item.method === 'string' ? item.method.trim().toUpperCase() : '';
  const method = methodRaw || 'GET';
  const payloadText = typeof item.payloadText === 'string'
    ? item.payloadText
    : typeof item.requestText === 'string'
      ? item.requestText
      : '';
  const responseText = typeof item.responseText === 'string' ? item.responseText : '';

  return {
    id: typeof item.id === 'string' && item.id.trim()
      ? item.id
      : `${executedAt}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    endpoint,
    statusCode: normalizeExecutedGenericApiStatusCode(item.statusCode),
    payloadText,
    responseText,
    executedAt
  };
}

function getElementId(elementRef) {
  if (!elementRef || typeof elementRef !== 'object') return '';
  for (const key of ELEMENT_ID_KEYS) {
    if (typeof elementRef[key] === 'string' && elementRef[key].trim()) {
      return elementRef[key];
    }
  }
  return '';
}

function normalizeRect(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const width = Number(value.width);
  const height = Number(value.height);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return { x, y, width, height };
}

function getElementPropertySourceLabel(source) {
  switch (source) {
    case 'attribute':
      return 'Attribute';
    case 'property':
    default:
      return 'Property';
  }
}

function normalizePropertySource(value) {
  return value === 'attribute' ? 'attribute' : 'property';
}

function normalizePropertyEntries(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      return {
        source: normalizePropertySource(item.source),
        name,
        value: item.value
      };
    })
    .filter(Boolean);
}

function normalizeCssEntries(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      return { name, value: item.value };
    })
    .filter(Boolean);
}

function upsertLatestUnique(items, nextItem, getKey) {
  const nextKey = getKey(nextItem);
  const filtered = items.filter((item) => getKey(item) !== nextKey);
  return [nextItem, ...filtered];
}

function getPropertyEntryKey(entry) {
  return `${normalizePropertySource(entry?.source)}:${String(entry?.name ?? '').trim().toLowerCase()}`;
}

function getCssEntryKey(entry) {
  return String(entry?.name ?? '').trim().toLowerCase();
}

function buildElementPropertyEndpointPreview(template, sessionId, elementId, name) {
  return template
    .replace('{sessionId}', sessionId || '{sessionId}')
    .replace('{elementId}', elementId || '{elementId}')
    .replace('{name}', name || '{name}');
}

function formatElementValueForDisplay(value) {
  if (typeof value === 'string') return value.length ? value : '(empty)';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function toCssClassToken(value) {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'unknown';
}

function formatErrorForTextarea(err) {
  if (err?.responsePayload !== undefined) {
    if (typeof err.responsePayload === 'string') {
      return err.responsePayload || err.message;
    }
    return JSON.stringify(err.responsePayload, null, 2);
  }
  return `Error: ${err?.message || 'Unknown error'}`;
}

function formatCaptureDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
}

function normalizeSessionPlaceholder(endpoint) {
  return String(endpoint ?? '').replace(/\{sessionId\}/gi, '{session id}');
}

function trimLeadingSlashes(value) {
  return String(value ?? '').replace(/^\/+/, '');
}

function isSessionScopedEndpoint(endpoint) {
  const normalized = normalizeSessionPlaceholder(endpoint).trim().toLowerCase();
  const sessionPrefix = GENERIC_SESSION_ENDPOINT_PREFIX.toLowerCase();
  return normalized === sessionPrefix.slice(0, -1) || normalized.startsWith(sessionPrefix);
}

function toGenericEndpointInput(endpoint) {
  const normalized = normalizeSessionPlaceholder(endpoint).trim();
  if (!normalized) return '';

  const normalizedLower = normalized.toLowerCase();
  const prefixLower = GENERIC_SESSION_ENDPOINT_PREFIX.toLowerCase();
  if (normalizedLower.startsWith(prefixLower)) {
    return normalized.slice(GENERIC_SESSION_ENDPOINT_PREFIX.length);
  }

  if (normalizedLower === prefixLower.slice(0, -1)) {
    return '';
  }

  return trimLeadingSlashes(normalized);
}

function decodePresetPayload(payload) {
  return String(payload ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'");
}

function normalizeCaptureName(value) {
  return (value || '').trim().toLowerCase();
}

function renderModalInViewport(content) {
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

export default function Session({ appiumUrl, sessionId, customHeaders = {}, onDisconnect }) {
  const [contexts, setContexts] = useState([]);
  const [selectedContext, setSelectedContext] = useState('');
  const [captures, setCaptures] = useState([]);
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [refreshingContexts, setRefreshingContexts] = useState(false);
  const [gettingCurrentContext, setGettingCurrentContext] = useState(false);
  const [settingContext, setSettingContext] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [previewCapture, setPreviewCapture] = useState(null);
  const [autoRefreshScreenshot, setAutoRefreshScreenshot] = useState(false);
  const [screenshotRefreshSeconds, setScreenshotRefreshSeconds] = useState(10);
  const [screenshotRefreshSecondsInput, setScreenshotRefreshSecondsInput] = useState('10');

  // Element finder state
  const [findScope, setFindScope] = useState('screen');
  const [findUsing, setFindUsing] = useState('xpath');
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [findSelector, setFindSelector] = useState(DEFAULT_XPATH_SELECTOR);
  const [findParentName, setFindParentName] = useState('');
  const [findingElements, setFindingElements] = useState(false);
  const [lastFindCount, setLastFindCount] = useState(0);
  const [lastFindResponse, setLastFindResponse] = useState('');
  const [pendingElementId, setPendingElementId] = useState('');
  const [pendingElementName, setPendingElementName] = useState('');
  const [pendingElementLocatorUsing, setPendingElementLocatorUsing] = useState('');
  const [pendingElementLocatorValue, setPendingElementLocatorValue] = useState('');
  const [savedElements, setSavedElements] = useState([]);
  const [savedElementsLoaded, setSavedElementsLoaded] = useState(false);
  const [manualElementName, setManualElementName] = useState('');
  const [manualElementId, setManualElementId] = useState('');
  const [coordX, setCoordX] = useState('');
  const [coordY, setCoordY] = useState('');
  const [swipeX1, setSwipeX1] = useState('');
  const [swipeY1, setSwipeY1] = useState('');
  const [swipeX2, setSwipeX2] = useState('');
  const [swipeY2, setSwipeY2] = useState('');
  const [runningElementAction, setRunningElementAction] = useState('');
  const [expandedSavedElementId, setExpandedSavedElementId] = useState(null);
  const [showElementPropertyModal, setShowElementPropertyModal] = useState(false);
  const [elementPropertyTarget, setElementPropertyTarget] = useState(null);
  const [elementPropertyEndpointType, setElementPropertyEndpointType] = useState('property');
  const [elementPropertyName, setElementPropertyName] = useState('');
  const [elementPropertyResponse, setElementPropertyResponse] = useState('');
  const [fetchingElementProperty, setFetchingElementProperty] = useState(false);
  const [showElementKeysModal, setShowElementKeysModal] = useState(false);
  const [elementKeysTarget, setElementKeysTarget] = useState(null);
  const [elementKeysText, setElementKeysText] = useState('');
  const [elementKeysPayloadMode, setElementKeysPayloadMode] = useState('w3c');
  const [sendingElementKeys, setSendingElementKeys] = useState(false);
  const [showFocusedKeysModal, setShowFocusedKeysModal] = useState(false);
  const [focusedKeysText, setFocusedKeysText] = useState('');
  const [focusedKeysPayloadMode, setFocusedKeysPayloadMode] = useState('w3c');
  const [sendingFocusedKeys, setSendingFocusedKeys] = useState(false);
  const [blinkingSavedElementId, setBlinkingSavedElementId] = useState('');
  const [savedElementBlinkOn, setSavedElementBlinkOn] = useState(false);
  const savedElementTileRefs = useRef(new Map());
  const savedElementBlinkTimeoutRef = useRef(null);
  const savedElementBlinkIntervalRef = useRef(null);

  // Execute Script state
  const [executeScript, setExecuteScript] = useState('mobile: deviceScreenInfo');
  const [executeScriptMode, setExecuteScriptMode] = useState('scriptOnly');
  const [executeScriptWithArgsJson, setExecuteScriptWithArgsJson] = useState(EXECUTE_SCRIPT_PAYLOAD_EXAMPLE);
  const [executeScriptEndpoint, setExecuteScriptEndpoint] = useState('/session/{session id}/execute/sync');
  const [executeScriptResult, setExecuteScriptResult] = useState('');
  const [executeScriptStatus, setExecuteScriptStatus] = useState(null);
  const [executingScript, setExecutingScript] = useState(false);
  const [executedScripts, setExecutedScripts] = useState([]);
  const [executedScriptsLoaded, setExecutedScriptsLoaded] = useState(false);
  const [expandedExecutedScriptId, setExpandedExecutedScriptId] = useState(null);
  const [autoRefreshPreferenceLoaded, setAutoRefreshPreferenceLoaded] = useState(false);
  const [coordinateActionsLoaded, setCoordinateActionsLoaded] = useState(false);

  // Generic API state
  const [genericEndpoint, setGenericEndpoint] = useState('');
  const [genericMethod, setGenericMethod] = useState('GET');
  const [genericPayload, setGenericPayload] = useState('');
  const [selectedWebDriverPresetTitle, setSelectedWebDriverPresetTitle] = useState('none');
  const [genericResult, setGenericResult] = useState('');
  const [genericStatus, setGenericStatus] = useState(null);
  const [sendingGeneric, setSendingGeneric] = useState(false);
  const [executedGenericApis, setExecutedGenericApis] = useState([]);
  const [executedGenericApisLoaded, setExecutedGenericApisLoaded] = useState(false);
  const [expandedExecutedGenericId, setExpandedExecutedGenericId] = useState(null);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState(null);

  const parsedScreenshotRefreshSeconds = Math.max(1, Number(screenshotRefreshSeconds) || 10);
  const savedElementsStorageKey = `appium-helper:saved-elements:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const executedScriptsStorageKey = `appium-helper:executed-scripts:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const executedGenericApisStorageKey = `appium-helper:executed-generic-apis:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const screenshotLiveStorageKey = `appium-helper:screenshot-live:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const coordinateActionsStorageKey = `appium-helper:coordinate-actions:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const canSendExecuteScript = executeScriptMode === 'scriptOnly'
    ? Boolean(executeScript.trim())
    : Boolean(executeScriptWithArgsJson.trim());
  const selectedElementPropertyEndpoint =
    ELEMENT_PROPERTY_ENDPOINT_OPTIONS.find((option) => option.value === elementPropertyEndpointType) ||
    ELEMENT_PROPERTY_ENDPOINT_OPTIONS[0];
  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999
  };
  const modalCardViewportStyle = {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)'
  };
  const elementPropertyNameTrimmed = elementPropertyName.trim();
  const elementPropertyEndpointRequiresName = selectedElementPropertyEndpoint.requiresName;
  const elementPropertyEndpointPreview = buildElementPropertyEndpointPreview(
    selectedElementPropertyEndpoint.endpoint,
    sessionId,
    elementPropertyTarget?.id,
    elementPropertyNameTrimmed
  );

  const focusSavedElementTile = useCallback((elementId) => {
    if (!elementId) return;
    const tile = savedElementTileRefs.current.get(elementId);
    if (!tile) return;

    tile.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    setBlinkingSavedElementId(elementId);
    setSavedElementBlinkOn(true);

    if (savedElementBlinkTimeoutRef.current) {
      clearTimeout(savedElementBlinkTimeoutRef.current);
    }
    if (savedElementBlinkIntervalRef.current) {
      clearInterval(savedElementBlinkIntervalRef.current);
    }
    savedElementBlinkIntervalRef.current = setInterval(() => {
      setSavedElementBlinkOn((prev) => !prev);
    }, 220);
    savedElementBlinkTimeoutRef.current = setTimeout(() => {
      setBlinkingSavedElementId((current) => (current === elementId ? '' : current));
      setSavedElementBlinkOn(false);
      if (savedElementBlinkIntervalRef.current) {
        clearInterval(savedElementBlinkIntervalRef.current);
        savedElementBlinkIntervalRef.current = null;
      }
      savedElementBlinkTimeoutRef.current = null;
    }, 5000);
  }, []);

  const scrollSavedElementTileIntoView = useCallback((elementId) => {
    if (!elementId) return;

    let attempts = 0;
    const maxAttempts = 20;
    const tryScroll = () => {
      const tile = savedElementTileRefs.current.get(elementId);
      if (tile) {
        tile.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts && typeof window !== 'undefined') {
        window.requestAnimationFrame(tryScroll);
      }
    };

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(tryScroll);
      return;
    }
    tryScroll();
  }, []);

  const loadContexts = useCallback(async () => {
    try {
      const data = await api.getContexts(appiumUrl, sessionId, customHeaders);
      const contextList = data.value || [];
      setContexts(contextList);
      setSelectedContext((prev) => (contextList.includes(prev) ? prev : ''));
    } catch (err) {
      setError('Failed to load contexts: ' + err.message);
    }
  }, [appiumUrl, sessionId, customHeaders]);

  const loadCaptures = useCallback(async () => {
    try {
      const data = await api.getCaptures();
      setCaptures(data);
    } catch (err) {
      console.error('Failed to load captures:', err);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await api.getLogs(10);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadContexts(), loadCaptures(), loadLogs()]).finally(() => setLoading(false));
  }, [loadContexts, loadCaptures, loadLogs]);

  useEffect(() => () => {
    if (savedElementBlinkTimeoutRef.current) {
      clearTimeout(savedElementBlinkTimeoutRef.current);
      savedElementBlinkTimeoutRef.current = null;
    }
    if (savedElementBlinkIntervalRef.current) {
      clearInterval(savedElementBlinkIntervalRef.current);
      savedElementBlinkIntervalRef.current = null;
    }
  }, []);

  // Auto-refresh logs every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  // Auto-refresh screenshot when enabled
  useEffect(() => {
    if (!autoRefreshScreenshot) return;
    const interval = setInterval(() => {
      fetchScreenshot();
    }, parsedScreenshotRefreshSeconds * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshScreenshot, parsedScreenshotRefreshSeconds]);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Restore screenshot live toggle for this Appium URL + session.
  useEffect(() => {
    setAutoRefreshPreferenceLoaded(false);
    try {
      const raw = localStorage.getItem(screenshotLiveStorageKey);
      setAutoRefreshScreenshot(raw === 'true');
    } catch {
      setAutoRefreshScreenshot(false);
    } finally {
      setAutoRefreshPreferenceLoaded(true);
    }
  }, [screenshotLiveStorageKey]);

  // Persist screenshot live toggle once restored.
  useEffect(() => {
    if (!autoRefreshPreferenceLoaded) return;
    try {
      localStorage.setItem(screenshotLiveStorageKey, autoRefreshScreenshot ? 'true' : 'false');
    } catch {
      // Ignore storage errors.
    }
  }, [autoRefreshScreenshot, autoRefreshPreferenceLoaded, screenshotLiveStorageKey]);

  // Restore coordinate actions values for this Appium URL + session.
  useEffect(() => {
    setCoordinateActionsLoaded(false);
    try {
      const raw = localStorage.getItem(coordinateActionsStorageKey);
      if (!raw) {
        setCoordX('');
        setCoordY('');
        setSwipeX1('');
        setSwipeY1('');
        setSwipeX2('');
        setSwipeY2('');
      } else {
        const parsed = JSON.parse(raw);
        const valueOrEmpty = (value) => (typeof value === 'string' ? value : '');
        setCoordX(valueOrEmpty(parsed?.coordX));
        setCoordY(valueOrEmpty(parsed?.coordY));
        setSwipeX1(valueOrEmpty(parsed?.swipeX1));
        setSwipeY1(valueOrEmpty(parsed?.swipeY1));
        setSwipeX2(valueOrEmpty(parsed?.swipeX2));
        setSwipeY2(valueOrEmpty(parsed?.swipeY2));
      }
    } catch {
      setCoordX('');
      setCoordY('');
      setSwipeX1('');
      setSwipeY1('');
      setSwipeX2('');
      setSwipeY2('');
    } finally {
      setCoordinateActionsLoaded(true);
    }
  }, [coordinateActionsStorageKey]);

  // Persist coordinate actions values once restored.
  useEffect(() => {
    if (!coordinateActionsLoaded) return;
    try {
      localStorage.setItem(
        coordinateActionsStorageKey,
        JSON.stringify({
          coordX,
          coordY,
          swipeX1,
          swipeY1,
          swipeX2,
          swipeY2
        })
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    coordX,
    coordY,
    swipeX1,
    swipeY1,
    swipeX2,
    swipeY2,
    coordinateActionsLoaded,
    coordinateActionsStorageKey
  ]);

  // Restore executed script history for this Appium URL + session.
  useEffect(() => {
    setExecutedScriptsLoaded(false);
    setExpandedExecutedScriptId(null);
    try {
      const raw = localStorage.getItem(executedScriptsStorageKey);
      if (!raw) {
        setExecutedScripts([]);
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .map((item) => normalizeExecutedScriptHistoryItem(item))
            .filter(Boolean);
          setExecutedScripts(valid.slice(0, REQUEST_HISTORY_LIMIT));
        } else {
          setExecutedScripts([]);
        }
      }
    } catch {
      setExecutedScripts([]);
    } finally {
      setExecutedScriptsLoaded(true);
    }
  }, [executedScriptsStorageKey]);

  // Persist executed script history once restored.
  useEffect(() => {
    if (!executedScriptsLoaded) return;
    try {
      localStorage.setItem(
        executedScriptsStorageKey,
        JSON.stringify(executedScripts.slice(0, REQUEST_HISTORY_LIMIT))
      );
    } catch {
      // Ignore storage errors.
    }
  }, [executedScripts, executedScriptsLoaded, executedScriptsStorageKey]);

  // Restore generic API history for this Appium URL + session.
  useEffect(() => {
    setExecutedGenericApisLoaded(false);
    setExpandedExecutedGenericId(null);
    try {
      const raw = localStorage.getItem(executedGenericApisStorageKey);
      if (!raw) {
        setExecutedGenericApis([]);
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .map((item) => normalizeExecutedGenericApiHistoryItem(item))
            .filter(Boolean);
          setExecutedGenericApis(valid.slice(0, REQUEST_HISTORY_LIMIT));
        } else {
          setExecutedGenericApis([]);
        }
      }
    } catch {
      setExecutedGenericApis([]);
    } finally {
      setExecutedGenericApisLoaded(true);
    }
  }, [executedGenericApisStorageKey]);

  // Persist generic API history once restored.
  useEffect(() => {
    if (!executedGenericApisLoaded) return;
    try {
      localStorage.setItem(
        executedGenericApisStorageKey,
        JSON.stringify(executedGenericApis.slice(0, REQUEST_HISTORY_LIMIT))
      );
    } catch {
      // Ignore storage errors.
    }
  }, [executedGenericApis, executedGenericApisLoaded, executedGenericApisStorageKey]);

  // Restore saved elements for this Appium URL + session.
  useEffect(() => {
    setSavedElementsLoaded(false);
    try {
      const raw = localStorage.getItem(savedElementsStorageKey);
      if (!raw) {
        setSavedElements([]);
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (item) =>
              item &&
              typeof item.id === 'string' &&
              item.id.trim() &&
              typeof item.name === 'string' &&
              item.name.trim()
          );
          setSavedElements(
            valid.map((item) => ({
              ...item,
              idRefreshed: item.idRefreshed === true,
              locatorUsing: (() => {
                if (typeof item.locatorUsing === 'string') return item.locatorUsing.trim();
                const legacyXpath = typeof item.locatorXPath === 'string'
                  ? item.locatorXPath.trim()
                  : typeof item.xpath === 'string'
                    ? item.xpath.trim()
                    : '';
                return legacyXpath ? 'xpath' : '';
              })(),
              locatorValue: (() => {
                if (typeof item.locatorValue === 'string') return item.locatorValue.trim();
                if (typeof item.locatorXPath === 'string') return item.locatorXPath.trim();
                if (typeof item.xpath === 'string') return item.xpath.trim();
                return '';
              })(),
              exists: item.exists === false ? false : item.exists === true ? true : null,
              rect: normalizeRect(item.rect),
              rectFetched: item.rectFetched === true,
              textFetched: item.textFetched === true,
              textValue: item.textValue,
              propertyEntries: (() => {
                const normalized = normalizePropertyEntries(item.propertyEntries);
                if (normalized.length) return normalized;
                const legacyName = typeof item.propertyName === 'string' ? item.propertyName.trim() : '';
                if (item.propertyFetched === true && legacyName) {
                  return [
                    {
                      source: normalizePropertySource(item.propertySource),
                      name: legacyName,
                      value: item.propertyValue
                    }
                  ];
                }
                return [];
              })(),
              propertyFetched: (() => {
                const normalized = normalizePropertyEntries(item.propertyEntries);
                if (normalized.length) return true;
                const legacyName = typeof item.propertyName === 'string' ? item.propertyName.trim() : '';
                return item.propertyFetched === true && Boolean(legacyName);
              })(),
              propertySource: (() => {
                const normalized = normalizePropertyEntries(item.propertyEntries);
                if (normalized.length) return normalizePropertySource(normalized[0].source);
                return normalizePropertySource(item.propertySource);
              })(),
              propertyName: (() => {
                const normalized = normalizePropertyEntries(item.propertyEntries);
                if (normalized.length) return normalized[0].name;
                return typeof item.propertyName === 'string' ? item.propertyName.trim() : '';
              })(),
              propertyValue: (() => {
                const normalized = normalizePropertyEntries(item.propertyEntries);
                if (normalized.length) return normalized[0].value;
                return item.propertyValue;
              })(),
              displayedFetched: item.displayedFetched === true,
              displayedValue: item.displayedValue,
              enabledFetched: item.enabledFetched === true,
              enabledValue: item.enabledValue,
              cssEntries: (() => {
                const normalized = normalizeCssEntries(item.cssEntries);
                if (normalized.length) return normalized;
                const legacyName = typeof item.cssPropertyName === 'string' ? item.cssPropertyName.trim() : '';
                if (item.cssFetched === true && legacyName) {
                  return [{ name: legacyName, value: item.cssValue }];
                }
                return [];
              })(),
              cssFetched: (() => {
                const normalized = normalizeCssEntries(item.cssEntries);
                if (normalized.length) return true;
                const legacyName = typeof item.cssPropertyName === 'string' ? item.cssPropertyName.trim() : '';
                return item.cssFetched === true && Boolean(legacyName);
              })(),
              cssPropertyName: (() => {
                const normalized = normalizeCssEntries(item.cssEntries);
                if (normalized.length) return normalized[0].name;
                return typeof item.cssPropertyName === 'string' ? item.cssPropertyName.trim() : '';
              })(),
              cssValue: (() => {
                const normalized = normalizeCssEntries(item.cssEntries);
                if (normalized.length) return normalized[0].value;
                return item.cssValue;
              })()
            }))
          );
        } else {
          setSavedElements([]);
        }
      }
    } catch {
      setSavedElements([]);
    } finally {
      setSavedElementsLoaded(true);
    }
  }, [savedElementsStorageKey]);

  // Persist saved elements once restored.
  useEffect(() => {
    if (!savedElementsLoaded) return;
    try {
      localStorage.setItem(savedElementsStorageKey, JSON.stringify(savedElements));
    } catch {
      // Ignore storage errors.
    }
  }, [savedElements, savedElementsLoaded, savedElementsStorageKey]);

  const handleRefreshContexts = async () => {
    setRefreshingContexts(true);
    setError('');
    try {
      await loadContexts();
    } finally {
      setRefreshingContexts(false);
    }
  };

  const handleContextChange = async (contextName) => {
    setSelectedContext(contextName);
  };

  const handleGetCurrentContext = async () => {
    setGettingCurrentContext(true);
    setError('');
    try {
      const data = await api.getCurrentContext(appiumUrl, sessionId, customHeaders);
      const contextName = typeof data?.value === 'string' ? data.value : '';

      if (!contextName) {
        setError('Current context response did not include a context name');
        return;
      }

      setContexts((prev) => (prev.includes(contextName) ? prev : [...prev, contextName]));
      setSelectedContext(contextName);
      setSuccess(`Current context: ${contextName}`);
    } catch (err) {
      setError('Failed to get current context: ' + err.message);
    } finally {
      setGettingCurrentContext(false);
    }
  };

  const handleSetSelectedContext = async () => {
    if (!selectedContext) {
      setError('Select a context first');
      return;
    }

    setSettingContext(true);
    setError('');
    try {
      await api.setContext(appiumUrl, sessionId, selectedContext, customHeaders);
      setSuccess(`Context set to: ${selectedContext}`);
      await refreshLogsAfterWebDriverAction();
    } catch (err) {
      setError('Failed to set context: ' + err.message);
    } finally {
      setSettingContext(false);
    }
  };

  const fetchScreenshot = async () => {
    try {
      const screenshotData = await api.getScreenshot(appiumUrl, sessionId, customHeaders);
      if (screenshotData?.value) {
        setCurrentScreenshot(screenshotData.value);
        setPreviewCapture(null); // Clear preview when fetching live screenshot
      }
    } catch (err) {
      console.error('Failed to fetch screenshot:', err);
    }
  };

  const handlePreview = (capture) => {
    setPreviewCapture(capture);
    setCurrentScreenshot(null); // Clear live screenshot when previewing
    setAutoRefreshScreenshot(false); // Turn off auto-refresh when viewing a capture
  };

  const handleCapture = async () => {
    if (!selectedContext) return;

    setCapturing(true);
    setError('');
    setSuccess('');

    try {
      // Fetch screenshot first to display
      await fetchScreenshot();

      const result = await api.capture(appiumUrl, sessionId, selectedContext, customHeaders);
      setSuccess(`Captured successfully: ${result.folderName}`);
      await loadCaptures();
    } catch (err) {
      setError('Capture failed: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };

  const handleCaptureScreenshot = async () => {
    setCapturingScreenshot(true);
    setError('');

    try {
      await fetchScreenshot();
      setSuccess('Screenshot captured');
    } catch (err) {
      setError('Screenshot failed: ' + err.message);
    } finally {
      setCapturingScreenshot(false);
    }
  };

  const handleSetScreenshotRefreshInterval = () => {
    const parsed = Number(screenshotRefreshSecondsInput);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError('Live refresh interval must be a number greater than or equal to 1');
      return;
    }

    const nextInterval = Math.max(1, Math.round(parsed));
    setScreenshotRefreshSeconds(nextInterval);
    setScreenshotRefreshSecondsInput(String(nextInterval));
    setSuccess(`Live refresh interval set to ${nextInterval} second${nextInterval === 1 ? '' : 's'}`);
  };

  const handleRename = async (oldName, newName) => {
    const normalizedOldName = normalizeCaptureName(oldName);
    const normalizedNewName = normalizeCaptureName(newName);

    if (!normalizedNewName || normalizedNewName === normalizedOldName) {
      return false;
    }

    const hasDuplicate = captures.some((capture) => (
      normalizeCaptureName(capture?.name) === normalizedNewName
      && normalizeCaptureName(capture?.name) !== normalizedOldName
    ));
    if (hasDuplicate) {
      setError('A capture with this name already exists');
      return false;
    }

    try {
      await api.renameCapture(oldName, newName.trim());
      await loadCaptures();
      setSelectedCapture(null);
      return true;
    } catch (err) {
      setError('Rename failed: ' + err.message);
      return false;
    }
  };

  const handleDelete = async (name) => {
    try {
      await api.deleteCapture(name);
      await loadCaptures();
      setSelectedCapture(null);
      setSuccess('Capture deleted successfully');
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handleRenameCaptureTile = async (captureName) => {
    const newName = window.prompt('Enter a new capture name:', captureName)?.trim();
    if (!newName || newName === captureName) return;
    const renamed = await handleRename(captureName, newName);
    if (renamed) {
      setSuccess('Capture renamed successfully');
    }
  };

  const handleDeleteCaptureTile = async (captureName) => {
    if (!confirm(`Are you sure you want to delete capture "${captureName}"?`)) return;
    await handleDelete(captureName);
  };

  const handleDeleteAll = async () => {
    if (captures.length === 0) return;
    if (confirm(`Are you sure you want to delete all ${captures.length} captures?`)) {
      try {
        await api.deleteAllCaptures();
        await loadCaptures();
        setSuccess('All captures deleted successfully');
      } catch (err) {
        setError('Delete all failed: ' + err.message);
      }
    }
  };

  const handleExecuteScript = async () => {
    const endpointToRun = executeScriptEndpoint;
    let payload = null;
    let requestText = '';
    let responseText = '';
    let statusCode = null;

    if (executeScriptMode === 'scriptOnly') {
      const scriptToRun = executeScript.trim();
      if (!scriptToRun) return;
      payload = { script: scriptToRun, args: [] };
      requestText = JSON.stringify(payload, null, 2);
    } else {
      const payloadText = executeScriptWithArgsJson.trim();
      if (!payloadText) return;
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payloadText);
      } catch (err) {
        setExecuteScriptStatus('Error');
        setExecuteScriptResult(`Error: Invalid JSON payload\n${err.message}`);
        return;
      }

      if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
        setExecuteScriptStatus('Error');
        setExecuteScriptResult('Error: JSON payload must be an object with at least a non-empty "script" field.');
        return;
      }

      const script = typeof parsedPayload.script === 'string' ? parsedPayload.script.trim() : '';
      if (!script) {
        setExecuteScriptStatus('Error');
        setExecuteScriptResult('Error: JSON payload must include a non-empty "script" string.');
        return;
      }

      payload = {
        ...parsedPayload,
        script,
        args: parsedPayload.args === undefined ? [] : parsedPayload.args
      };
      requestText = JSON.stringify(payload, null, 2);
    }

    setExecutingScript(true);
    setExecuteScriptResult('');
    setExecuteScriptStatus(null);

    try {
      const result = await api.genericRequest(
        appiumUrl,
        sessionId,
        endpointToRun,
        'POST',
        payload,
        customHeaders
      );
      responseText = JSON.stringify(result, null, 2);
      statusCode = 200;
      setExecuteScriptResult(responseText);
      setExecuteScriptStatus(statusCode);
    } catch (err) {
      responseText = formatErrorForTextarea(err);
      statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 'Error';
      setExecuteScriptResult(responseText);
      setExecuteScriptStatus(statusCode);
    } finally {
      setExecutedScripts((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          method: 'POST',
          payloadText: requestText,
          responseText,
          endpoint: endpointToRun,
          statusCode,
          executedAt: new Date().toISOString()
        },
        ...prev
      ].slice(0, REQUEST_HISTORY_LIMIT));
      setExecutingScript(false);
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleCopyScript = async (scriptText) => {
    try {
      await navigator.clipboard.writeText(scriptText);
      setSuccess('Script copied');
    } catch (err) {
      setError('Failed to copy script: ' + err.message);
    }
  };

  const handleSelectWebDriverPreset = (presetTitle) => {
    setSelectedWebDriverPresetTitle(presetTitle);
    setGenericResult('');
    setGenericStatus(null);
    if (presetTitle === 'none') return;

    const preset = WEBDRIVER_REFERENCE_PRESETS.find((item) => item.title === presetTitle);
    if (!preset) return;

    setGenericEndpoint(toGenericEndpointInput(preset.endpoint));
    setGenericMethod(preset.method);
    if (preset.method === 'POST') {
      const payloadText = decodePresetPayload(preset.payload);
      setGenericPayload(payloadText || '{}');
    } else {
      setGenericPayload('');
    }
  };

  const handleGenericRequest = async () => {
    const endpointInput = trimLeadingSlashes(genericEndpoint.trim());
    if (!endpointInput) return;

    const selectedPreset = WEBDRIVER_REFERENCE_PRESETS.find(
      (item) => item.title === selectedWebDriverPresetTitle
    );
    const selectedPresetInput = selectedPreset
      ? trimLeadingSlashes(toGenericEndpointInput(selectedPreset.endpoint))
      : '';
    const usingUnchangedPresetEndpoint = Boolean(
      selectedPreset &&
      endpointInput.toLowerCase() === selectedPresetInput.toLowerCase()
    );
    const useAbsoluteEndpoint = Boolean(
      usingUnchangedPresetEndpoint && !isSessionScopedEndpoint(selectedPreset.endpoint)
    );
    const fullEndpoint = useAbsoluteEndpoint
      ? `/${endpointInput}`
      : `${GENERIC_SESSION_ENDPOINT_PREFIX}${endpointInput}`;
    const payloadText = genericMethod === 'POST' ? genericPayload.trim() : '';
    let responseText = '';
    let statusCode = null;

    setSendingGeneric(true);
    setGenericResult('');
    setGenericStatus(null);

    try {
      const result = await api.genericRequest(
        appiumUrl,
        sessionId,
        fullEndpoint,
        genericMethod,
        genericMethod === 'POST' ? genericPayload : null,
        customHeaders
      );
      responseText = JSON.stringify(result, null, 2);
      statusCode = 200;
      setGenericResult(responseText);
      setGenericStatus(statusCode);
    } catch (err) {
      responseText = formatErrorForTextarea(err);
      statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 'Error';
      setGenericResult(responseText);
      setGenericStatus(statusCode);
    } finally {
      setExecutedGenericApis((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          method: genericMethod,
          endpoint: fullEndpoint,
          statusCode,
          payloadText,
          responseText,
          executedAt: new Date().toISOString()
        },
        ...prev
      ].slice(0, REQUEST_HISTORY_LIMIT));
      setSendingGeneric(false);
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleExportExecutedScripts = () => {
    if (!executedScripts.length) {
      setError('No executed requests to export');
      return;
    }

    try {
      const exportData = executedScripts.map((item) => ({
        executedAt: item.executedAt,
        method: item.method,
        endpoint: item.endpoint,
        statusCode: item.statusCode,
        payload: item.payloadText,
        response: item.responseText
      }));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `execute-script-history-${sessionId}-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess(`Exported ${executedScripts.length} executed script request${executedScripts.length === 1 ? '' : 's'}`);
    } catch (err) {
      setError('Failed to export executed requests: ' + err.message);
    }
  };

  const handleExportExecutedGenericApis = () => {
    if (!executedGenericApis.length) {
      setError('No executed requests to export');
      return;
    }

    try {
      const exportData = executedGenericApis.map((item) => ({
        executedAt: item.executedAt,
        method: item.method,
        endpoint: item.endpoint,
        statusCode: item.statusCode,
        payload: item.payloadText,
        response: item.responseText
      }));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generic-webdriver-history-${sessionId}-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess(`Exported ${executedGenericApis.length} executed API request${executedGenericApis.length === 1 ? '' : 's'}`);
    } catch (err) {
      setError('Failed to export executed requests: ' + err.message);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDeleteAllLogs = async () => {
    if (logs.length === 0) return;
    if (confirm('Are you sure you want to delete all log files from the server?')) {
      try {
        await api.deleteLogs();
        setLogs([]);
        setSuccess('All logs deleted successfully');
      } catch (err) {
        setError('Failed to delete logs: ' + err.message);
      }
    }
  };

  const refreshLogsAfterWebDriverAction = async () => {
    try {
      await loadLogs();
    } catch {
      // Ignore log refresh errors to avoid masking the original action result.
    }
  };

  const handleFindElements = async () => {
    if (!findSelector.trim()) return;

    setFindingElements(true);
    setError('');
    setSuccess('');
    setLastFindCount(0);
    setLastFindResponse('');
    setPendingElementId('');
    setPendingElementName('');
    setPendingElementLocatorUsing('');
    setPendingElementLocatorValue('');

    try {
      let result;
      if (findScope === 'parent') {
        const parentInput = findParentName.trim();
        if (!parentInput) {
          throw new Error('Enter parent element name or element id');
        }
        const parent = savedElements.find(
          (el) => el.name === parentInput || el.id === parentInput
        );
        const parentElementId = parent?.id || parentInput;
        result = await api.findChildElements(
          appiumUrl,
          sessionId,
          parentElementId,
          findUsing,
          findSelector.trim(),
          customHeaders
        );
      } else {
        result = await api.findElements(appiumUrl, sessionId, findUsing, findSelector.trim(), customHeaders);
      }

      const matches = Array.isArray(result?.value) ? result.value : [];
      const ids = matches.map(getElementId).filter(Boolean);
      setLastFindCount(ids.length);
      setLastFindResponse(JSON.stringify(result, null, 2));

      if (ids.length === 1) {
        const matchedElementId = ids[0];
        const existingSavedElement = savedElements.find((el) => el.id === matchedElementId);
        if (existingSavedElement) {
          const matchedLocatorValue = findSelector.trim();
          setSavedElements((prev) =>
            prev.map((el) =>
              el.id === existingSavedElement.id
                ? {
                    ...el,
                    locatorUsing: findUsing,
                    locatorValue: matchedLocatorValue
                  }
                : el
            )
          );
          setPendingElementId('');
          setPendingElementName('');
          setPendingElementLocatorUsing('');
          setPendingElementLocatorValue('');
          setSuccess(`Found exactly one element. Already saved as "${existingSavedElement.name}".`);
          focusSavedElementTile(existingSavedElement.id);
        } else {
          setPendingElementId(matchedElementId);
          setPendingElementLocatorUsing(findUsing);
          setPendingElementLocatorValue(findSelector.trim());
          setSuccess('Found exactly one element. Give it a name to save it.');
        }
      } else if (ids.length === 0) {
        setSuccess('No elements matched the selector.');
      } else {
        setSuccess(`Found ${ids.length} elements. Narrow the selector to exactly one to save.`);
      }
    } catch (err) {
      setError('Find elements failed: ' + err.message);
      setLastFindResponse(formatErrorForTextarea(err));
    } finally {
      setFindingElements(false);
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleSavePendingElement = () => {
    const trimmedName = pendingElementName.trim();
    if (!pendingElementId || !trimmedName) return;
    const newElementId = pendingElementId;
    const newElementLocatorUsing = pendingElementLocatorUsing.trim();
    const newElementLocatorValue = pendingElementLocatorValue.trim();

    if (savedElements.some((el) => el.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Element name already exists. Choose a unique name.');
      return;
    }

    const duplicateById = savedElements.find((el) => el.id === pendingElementId);
    if (duplicateById) {
      setError('Element id already exists in saved elements.');
      focusSavedElementTile(duplicateById.id);
      return;
    }

    setSavedElements((prev) => [
      ...prev,
      {
        id: newElementId,
        name: trimmedName,
        idRefreshed: false,
        exists: null,
        rect: null,
        rectFetched: false,
        textFetched: false,
        textValue: '',
        locatorUsing: newElementLocatorUsing,
        locatorValue: newElementLocatorValue,
        propertyEntries: [],
        propertyFetched: false,
        propertySource: 'property',
        propertyName: '',
        propertyValue: '',
        displayedFetched: false,
        displayedValue: '',
        enabledFetched: false,
        enabledValue: '',
        cssEntries: [],
        cssFetched: false,
        cssPropertyName: '',
        cssValue: ''
      }
    ]);
    scrollSavedElementTileIntoView(newElementId);
    setPendingElementId('');
    setPendingElementName('');
    setPendingElementLocatorUsing('');
    setPendingElementLocatorValue('');
    setSuccess(`Saved element: ${trimmedName}`);
  };

  const handleSaveManualElement = () => {
    const name = manualElementName.trim();
    const id = manualElementId.trim();
    if (!name || !id) return;
    const newElementId = id;

    if (savedElements.some((el) => el.name.toLowerCase() === name.toLowerCase())) {
      setError('Element name already exists. Choose a unique name.');
      return;
    }

    const duplicateById = savedElements.find((el) => el.id === id);
    if (duplicateById) {
      setError('Element id already exists in saved elements.');
      focusSavedElementTile(duplicateById.id);
      return;
    }

    setSavedElements((prev) => [
      ...prev,
      {
        id: newElementId,
        name,
        idRefreshed: false,
        exists: null,
        rect: null,
        rectFetched: false,
        textFetched: false,
        textValue: '',
        locatorUsing: '',
        locatorValue: '',
        propertyEntries: [],
        propertyFetched: false,
        propertySource: 'property',
        propertyName: '',
        propertyValue: '',
        displayedFetched: false,
        displayedValue: '',
        enabledFetched: false,
        enabledValue: '',
        cssEntries: [],
        cssFetched: false,
        cssPropertyName: '',
        cssValue: ''
      }
    ]);
    scrollSavedElementTileIntoView(newElementId);
    setManualElementName('');
    setManualElementId('');
    setSuccess(`Saved manual element: ${name}`);
  };

  const handleFindSavedElementByLocator = async (element) => {
    const locatorUsing = typeof element?.locatorUsing === 'string' ? element.locatorUsing.trim() : '';
    const locatorValue = typeof element?.locatorValue === 'string' ? element.locatorValue.trim() : '';
    if (!locatorUsing || !locatorValue) {
      setError(`No saved locator for: ${element.name}`);
      return;
    }

    const actionKey = `findlocator:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    setSuccess('');

    try {
      const result = await api.findElements(appiumUrl, sessionId, locatorUsing, locatorValue, customHeaders);
      const matches = Array.isArray(result?.value) ? result.value : [];
      const ids = matches.map(getElementId).filter(Boolean);

      if (ids.length === 0) {
        setSavedElements((prev) =>
          prev.map((el) => (el.id === element.id ? { ...el, exists: false } : el))
        );
        setError(`Saved locator matched no elements for: ${element.name}`);
        return;
      }

      if (ids.length > 1) {
        setError(`Saved locator matched ${ids.length} elements for: ${element.name}.`);
        return;
      }

      const resolvedElementId = ids[0];
      const duplicate = savedElements.find(
        (el) => el.id === resolvedElementId && el.id !== element.id
      );
      if (duplicate) {
        setError(`Saved XPath resolved to an id already used by "${duplicate.name}".`);
        focusSavedElementTile(duplicate.id);
        return;
      }

      setSavedElements((prev) =>
        prev.map((el) =>
          el.id === element.id
            ? {
                ...el,
                id: resolvedElementId,
                idRefreshed: resolvedElementId !== element.id,
                exists: true,
                locatorUsing,
                locatorValue
              }
            : el
        )
      );
      setExpandedSavedElementId((prev) => (prev === element.id ? resolvedElementId : prev));
      scrollSavedElementTileIntoView(resolvedElementId);
      focusSavedElementTile(resolvedElementId);
      setSuccess(
        resolvedElementId === element.id
          ? `Found element by saved locator: ${element.name}`
          : `Found element and updated id for: ${element.name}`
      );
    } catch (err) {
      setError('Find by saved locator failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleRenameSavedElement = (id) => {
    const current = savedElements.find((el) => el.id === id);
    if (!current) return;

    const nextName = prompt('Rename element', current.name);
    if (nextName === null) return;
    const trimmedName = nextName.trim();
    if (!trimmedName) return;

    if (savedElements.some((el) => el.id !== id && el.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Another element already uses that name.');
      return;
    }

    setSavedElements((prev) => prev.map((el) => (el.id === id ? { ...el, name: trimmedName } : el)));
    setSuccess(`Renamed to: ${trimmedName}`);
  };

  const handleDeleteSavedElement = (id) => {
    setSavedElements((prev) => prev.filter((el) => el.id !== id));
    if (pendingElementId === id) {
      setPendingElementId('');
      setPendingElementName('');
      setPendingElementLocatorUsing('');
      setPendingElementLocatorValue('');
    }
    if (expandedSavedElementId === id) {
      setExpandedSavedElementId(null);
    }
  };

  const handleClearSavedElementValues = (element) => {
    setSavedElements((prev) =>
      prev.map((el) =>
        el.id === element.id
          ? {
              ...el,
              textFetched: false,
              textValue: '',
              propertyEntries: [],
              propertyFetched: false,
              propertySource: 'property',
              propertyName: '',
              propertyValue: '',
              cssEntries: [],
              cssFetched: false,
              cssPropertyName: '',
              cssValue: '',
              displayedFetched: false,
              displayedValue: '',
              enabledFetched: false,
              enabledValue: '',
              rect: null,
              rectFetched: false
            }
          : el
      )
    );
    setSuccess(`Cleared saved values for: ${element.name}`);
  };

  const handleCheckElementExists = async (element) => {
    const actionKey = `exists:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      const result = await api.checkElementExists(appiumUrl, sessionId, element.id, customHeaders);
      const rect = normalizeRect(result?.value);
      setSavedElements((prev) =>
        prev.map((el) => (el.id === element.id ? { ...el, exists: true, rect: rect || el.rect || null } : el))
      );
      setSuccess(`Element exists: ${element.name}`);
    } catch {
      setSavedElements((prev) => prev.map((el) => (el.id === element.id ? { ...el, exists: false, rect: null } : el)));
      setError(`Element no longer exists: ${element.name}`);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleGetElementRect = async (element) => {
    const actionKey = `rect:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      const result = await api.getElementRect(appiumUrl, sessionId, element.id, customHeaders);
      const rect = normalizeRect(result?.value);
      if (!rect) {
        throw new Error('Rect response missing x/y/width/height');
      }
      setSavedElements((prev) =>
        prev.map((el) => (el.id === element.id ? { ...el, exists: true, rect, rectFetched: true } : el))
      );
      setSuccess(`Rect fetched for: ${element.name}`);
    } catch (err) {
      setError('Get rect failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleTapAtElementLocation = async (element) => {
    const actionKey = `taploc:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      let rect = normalizeRect(element.rect);
      if (!rect) {
        const result = await api.getElementRect(appiumUrl, sessionId, element.id, customHeaders);
        rect = normalizeRect(result?.value);
      }
      if (!rect) {
        throw new Error('Unable to resolve element rect');
      }

      const x = Math.round(rect.x + rect.width / 2);
      const y = Math.round(rect.y + rect.height / 2);
      await api.tapByCoordinates(appiumUrl, sessionId, x, y, customHeaders);
      setSavedElements((prev) => prev.map((el) => (el.id === element.id ? { ...el, exists: true, rect } : el)));
      setSuccess(`Tapped ${element.name} at (${x}, ${y})`);
    } catch (err) {
      setError('Tap at element location failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleTapElement = async (element) => {
    const actionKey = `tap:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      await api.tapElement(appiumUrl, sessionId, element.id, customHeaders);
      setSuccess(`Tapped element: ${element.name}`);
    } catch (err) {
      setError('Element tap failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleClickElement = async (element) => {
    const actionKey = `click:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      await api.clickElement(appiumUrl, sessionId, element.id, customHeaders);
      setSuccess(`Clicked element: ${element.name}`);
    } catch (err) {
      setError('Element click failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleGetElementText = async (element) => {
    const actionKey = `text:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      const result = await api.getElementText(appiumUrl, sessionId, element.id, customHeaders);
      setSavedElements((prev) =>
        prev.map((el) =>
          el.id === element.id
            ? { ...el, exists: true, textFetched: true, textValue: result?.value }
            : el
        )
      );
      setSuccess(`Fetched text for: ${element.name}`);
    } catch (err) {
      setError('Get text failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleOpenElementPropertyModal = (element) => {
    setElementPropertyTarget({ id: element.id, name: element.name });
    setElementPropertyEndpointType('property');
    setElementPropertyName('');
    setElementPropertyResponse('');
    setShowElementPropertyModal(true);
  };

  const handleCloseElementPropertyModal = () => {
    if (fetchingElementProperty) return;
    setShowElementPropertyModal(false);
    setElementPropertyTarget(null);
    setElementPropertyEndpointType('property');
    setElementPropertyName('');
    setElementPropertyResponse('');
  };

  const handleFetchElementProperty = async () => {
    if (!elementPropertyTarget) return;

    const selectedOption =
      ELEMENT_PROPERTY_ENDPOINT_OPTIONS.find((option) => option.value === elementPropertyEndpointType) ||
      ELEMENT_PROPERTY_ENDPOINT_OPTIONS[0];
    const propertyName = elementPropertyName.trim();

    if (selectedOption.requiresName && !propertyName) {
      setError('Property name is required for the selected endpoint');
      setElementPropertyResponse('Error: Property name is required for the selected endpoint');
      return;
    }

    const actionKey = `property:${elementPropertyTarget.id}`;
    setRunningElementAction(actionKey);
    setFetchingElementProperty(true);
    setElementPropertyResponse('');
    setError('');
    try {
      let result;
      switch (selectedOption.value) {
        case 'attribute':
          result = await api.getElementAttribute(
            appiumUrl,
            sessionId,
            elementPropertyTarget.id,
            propertyName,
            customHeaders
          );
          break;
        case 'property':
        default:
          result = await api.getElementProperty(
            appiumUrl,
            sessionId,
            elementPropertyTarget.id,
            propertyName,
            customHeaders
          );
          break;
      }

      setSavedElements((prev) =>
        prev.map((el) =>
          el.id === elementPropertyTarget.id
            ? (() => {
                const nextEntry = {
                  source: normalizePropertySource(selectedOption.value),
                  name: propertyName,
                  value: result?.value
                };
                const existingEntries = normalizePropertyEntries(el.propertyEntries);
                const nextEntries = upsertLatestUnique(existingEntries, nextEntry, getPropertyEntryKey);
                return {
                  ...el,
                  exists: true,
                  propertyEntries: nextEntries,
                  propertyFetched: nextEntries.length > 0,
                  propertySource: nextEntry.source,
                  propertyName: nextEntry.name,
                  propertyValue: nextEntry.value
                };
              })()
            : el
        )
      );

      const sourceLabel = getElementPropertySourceLabel(selectedOption.value);
      const nameSuffix = selectedOption.requiresName ? ` "${propertyName}"` : '';
      setSuccess(`Fetched ${sourceLabel.toLowerCase()}${nameSuffix} for: ${elementPropertyTarget.name}`);
      setShowElementPropertyModal(false);
      setElementPropertyTarget(null);
      setElementPropertyEndpointType('property');
      setElementPropertyName('');
      setElementPropertyResponse('');
    } catch (err) {
      setError('Get property failed: ' + err.message);
      setElementPropertyResponse(formatErrorForTextarea(err));
    } finally {
      setRunningElementAction('');
      setFetchingElementProperty(false);
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleGetElementDisplayed = async (element) => {
    const actionKey = `displayed:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      const result = await api.getElementDisplayed(appiumUrl, sessionId, element.id, customHeaders);
      setSavedElements((prev) =>
        prev.map((el) =>
          el.id === element.id
            ? { ...el, exists: true, displayedFetched: true, displayedValue: result?.value }
            : el
        )
      );
      setSuccess(`Fetched displayed for: ${element.name}`);
    } catch (err) {
      setError('Get displayed failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleGetElementEnabled = async (element) => {
    const actionKey = `enabled:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      const result = await api.getElementEnabled(appiumUrl, sessionId, element.id, customHeaders);
      setSavedElements((prev) =>
        prev.map((el) =>
          el.id === element.id
            ? { ...el, exists: true, enabledFetched: true, enabledValue: result?.value }
            : el
        )
      );
      setSuccess(`Fetched enabled for: ${element.name}`);
    } catch (err) {
      setError('Get enabled failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleGetElementCssValue = async (element) => {
    const cssPropertyInput = prompt('Enter CSS property name');
    if (cssPropertyInput === null) return;
    const cssPropertyName = cssPropertyInput.trim();
    if (!cssPropertyName) {
      setError('CSS property name is required');
      return;
    }

    const actionKey = `css:${element.id}`;
    setRunningElementAction(actionKey);
    setError('');
    try {
      const result = await api.getElementCssValue(
        appiumUrl,
        sessionId,
        element.id,
        cssPropertyName,
        customHeaders
      );
      setSavedElements((prev) =>
        prev.map((el) =>
          el.id === element.id
            ? (() => {
                const nextEntry = { name: cssPropertyName, value: result?.value };
                const existingEntries = normalizeCssEntries(el.cssEntries);
                const nextEntries = upsertLatestUnique(existingEntries, nextEntry, getCssEntryKey);
                return {
                  ...el,
                  exists: true,
                  cssEntries: nextEntries,
                  cssFetched: nextEntries.length > 0,
                  cssPropertyName: nextEntry.name,
                  cssValue: nextEntry.value
                };
              })()
            : el
        )
      );
      setSuccess(`Fetched CSS "${cssPropertyName}" for: ${element.name}`);
    } catch (err) {
      setError('Get CSS failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleOpenElementKeysModal = (element) => {
    setElementKeysTarget({ id: element.id, name: element.name });
    setElementKeysText('');
    setElementKeysPayloadMode('w3c');
    setShowElementKeysModal(true);
  };

  const handleCloseElementKeysModal = () => {
    if (sendingElementKeys) return;
    setShowElementKeysModal(false);
    setElementKeysTarget(null);
    setElementKeysText('');
    setElementKeysPayloadMode('w3c');
  };

  const handleSendElementKeys = async () => {
    if (!elementKeysTarget) return;

    const textToSend = elementKeysText;
    if (!textToSend.length) {
      setError('Enter text to send');
      return;
    }

    const actionKey = `keys:${elementKeysTarget.id}`;
    setRunningElementAction(actionKey);
    setSendingElementKeys(true);
    setError('');

    try {
      await api.sendKeysToElement(
        appiumUrl,
        sessionId,
        elementKeysTarget.id,
        textToSend,
        elementKeysPayloadMode,
        customHeaders
      );
      setSuccess(`Sent keys to: ${elementKeysTarget.name}`);
      setShowElementKeysModal(false);
      setElementKeysTarget(null);
      setElementKeysText('');
      setElementKeysPayloadMode('w3c');
    } catch (err) {
      setError('Send keys failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      setSendingElementKeys(false);
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleOpenFocusedKeysModal = () => {
    setFocusedKeysText('');
    setFocusedKeysPayloadMode('w3c');
    setShowFocusedKeysModal(true);
  };

  const handleCloseFocusedKeysModal = () => {
    if (sendingFocusedKeys) return;
    setShowFocusedKeysModal(false);
    setFocusedKeysText('');
    setFocusedKeysPayloadMode('w3c');
  };

  const handleSendFocusedKeys = async () => {
    const textToSend = focusedKeysText;
    if (!textToSend.length) {
      setError('Enter text to send');
      return;
    }

    const actionKey = 'focused:keys';
    setRunningElementAction(actionKey);
    setSendingFocusedKeys(true);
    setError('');

    try {
      await api.sendKeysToFocusedElement(
        appiumUrl,
        sessionId,
        textToSend,
        focusedKeysPayloadMode,
        customHeaders
      );
      setSuccess('Sent keys to focused element');
      setShowFocusedKeysModal(false);
      setFocusedKeysText('');
      setFocusedKeysPayloadMode('w3c');
    } catch (err) {
      setError('Send focused keys failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      setSendingFocusedKeys(false);
      await refreshLogsAfterWebDriverAction();
    }
  };

  const parseCoordinatePair = () => {
    const x = Number(coordX);
    const y = Number(coordY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Enter valid numeric X and Y coordinates');
    }
    return { x: Math.round(x), y: Math.round(y) };
  };

  const parseSwipeCoordinatePair = () => {
    const x1 = Number(swipeX1);
    const y1 = Number(swipeY1);
    const x2 = Number(swipeX2);
    const y2 = Number(swipeY2);
    if (![x1, y1, x2, y2].every(Number.isFinite)) {
      throw new Error('Enter valid numeric X1, Y1, X2, and Y2 coordinates');
    }
    return {
      x1: Math.round(x1),
      y1: Math.round(y1),
      x2: Math.round(x2),
      y2: Math.round(y2)
    };
  };

  const handleSwapSwipeCoordinates = () => {
    setSwipeX1((prevX1) => {
      const nextX1 = swipeX2;
      setSwipeX2(prevX1);
      return nextX1;
    });
    setSwipeY1((prevY1) => {
      const nextY1 = swipeY2;
      setSwipeY2(prevY1);
      return nextY1;
    });
  };

  const handleTapCoordinates = async () => {
    const actionKey = 'coord:tap';
    setRunningElementAction(actionKey);
    setError('');
    try {
      const { x, y } = parseCoordinatePair();
      await api.tapByCoordinates(appiumUrl, sessionId, x, y, customHeaders);
      setSuccess(`Tapped coordinates (${x}, ${y})`);
    } catch (err) {
      setError('Coordinate tap failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleClickCoordinates = async () => {
    const actionKey = 'coord:click';
    setRunningElementAction(actionKey);
    setError('');
    try {
      const { x, y } = parseCoordinatePair();
      await api.clickByCoordinates(appiumUrl, sessionId, x, y, customHeaders);
      setSuccess(`Clicked coordinates (${x}, ${y})`);
    } catch (err) {
      setError('Coordinate click failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  const handleSwipeByCoordinates = async () => {
    const actionKey = 'coord:swipe';
    setRunningElementAction(actionKey);
    setError('');
    try {
      const { x1, y1, x2, y2 } = parseSwipeCoordinatePair();
      await api.swipeByCoordinates(appiumUrl, sessionId, x1, y1, x2, y2, customHeaders);
      setSuccess(`Swiped coordinates (${x1}, ${y1}) -> (${x2}, ${y2})`);
    } catch (err) {
      setError('Coordinate swipe failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div id="session-header" className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Session Controls</h1>
            <p className="text-gray-400 text-sm mt-1 font-mono">{sessionId}</p>
          </div>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        </div>

        {/* Messages */}
        {(error || success) && (
          <div className="fixed top-5 left-0 right-0 z-[10000] px-4 pointer-events-none">
            <div className="max-w-4xl mx-auto space-y-2">
              {error && (
                <div className="pointer-events-auto p-3 bg-red-900/70 border border-red-700 rounded-lg text-red-200 text-sm shadow-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="pointer-events-auto p-3 bg-green-900/70 border border-green-700 rounded-lg text-green-200 text-sm shadow-lg">
                  {success}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls Panel */}
        <div id="capture-controls" className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Capture Controls</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Context
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Context list is fetched only. Selection is applied when you run capture.
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedContext}
                  onChange={(e) => handleContextChange(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {contexts.length === 0 ? (
                    <option value="">No contexts available</option>
                  ) : (
                    <>
                      <option value="">Select a context</option>
                      {contexts.map((ctx) => (
                        <option key={ctx} value={ctx}>
                          {ctx}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <button
                  onClick={handleRefreshContexts}
                  disabled={refreshingContexts}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors cursor-pointer"
                  title="Refresh contexts"
                >
                  <svg
                    className={`w-5 h-5 ${refreshingContexts ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleSetSelectedContext}
                  disabled={settingContext || !selectedContext}
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 border border-blue-600 rounded-lg text-white text-sm transition-colors cursor-pointer"
                  title="Set selected context"
                >
                  {settingContext ? 'Setting...' : 'Set'}
                </button>
                <button
                  onClick={handleGetCurrentContext}
                  disabled={gettingCurrentContext}
                  className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 border border-cyan-600 rounded-lg text-white text-sm transition-colors cursor-pointer"
                  title="Get current context from Appium"
                >
                  {gettingCurrentContext ? 'Getting...' : 'Get Current'}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCapture}
                disabled={capturing || capturingScreenshot || !selectedContext}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {capturing ? 'Capturing...' : 'Capture Source'}
              </button>
              <button
                onClick={handleCaptureScreenshot}
                disabled={capturing || capturingScreenshot}
                className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {capturingScreenshot ? 'Capturing...' : 'Capture Screenshot'}
              </button>
            </div>
          </div>
        </div>

        {/* Captures List and Screenshot Preview */}
        <div id="captures-preview-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Captures List */}
          <div id="captures-list" className="bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden max-h-125">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Captures ({captures.length})
              </h2>
              {captures.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Delete All
                </button>
              )}
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {captures.length === 0 ? (
                <p className="text-gray-400 text-sm">No captures yet</p>
              ) : (
                captures.map((capture) => (
                  <div
                    key={capture.name}
                    className={`group w-full p-3 rounded-xl border transition-all ${
                      capture.metadata?.hasErrors
                        ? 'bg-gradient-to-b from-red-900/25 to-gray-800/90 border-red-700/60'
                        : 'bg-gradient-to-b from-gray-700/90 to-gray-800/90 border-gray-600/70'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCapture(capture)}
                      className="w-full text-left cursor-pointer mb-3"
                      title="Open capture details"
                    >
                      <div className="rounded-lg border border-gray-600/70 bg-gray-900/50 px-3 py-2.5 group-hover:border-gray-500/80 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">Capture</p>
                            <p className="text-sm font-semibold text-white break-all">{capture.name}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            {capture.metadata?.hasErrors ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-red-700/70 bg-red-900/50 text-[10px] font-medium text-red-200">
                                Error
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-emerald-700/70 bg-emerald-900/40 text-[10px] font-medium text-emerald-200">
                                OK
                              </span>
                            )}
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-300 break-all">
                            <span className="text-gray-500 mr-1">Context:</span>
                            <span className="text-gray-100">{capture.metadata?.contextName || 'N/A'}</span>
                          </p>
                          <p className="text-xs text-gray-300 break-all">
                            <span className="text-gray-500 mr-1">Session ID:</span>
                            <span className="font-mono text-gray-100">{capture.metadata?.sessionId || 'N/A'}</span>
                          </p>
                          <p className="text-xs text-gray-300 break-all">
                            <span className="text-gray-500 mr-1">Date/Time:</span>
                            <span className="text-gray-100">{formatCaptureDateTime(capture.metadata?.capturedAt || capture.createdAt)}</span>
                          </p>
                        </div>
                        {capture.metadata?.hasErrors && (
                          <p className="text-[11px] text-red-300 mt-2">Capture has errors. Open details for diagnostics.</p>
                        )}
                      </div>
                    </button>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                      <button
                        onClick={() => handlePreview(capture)}
                        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-md transition-colors cursor-pointer"
                        title="Preview screenshot"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => window.open(api.getViewerUrl(capture.name), '_blank')}
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-md transition-colors cursor-pointer"
                        title="Open in viewer"
                      >
                        <span className="inline-flex items-center gap-1">
                          Open
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12v7a2 2 0 002 2h7" />
                          </svg>
                        </span>
                      </button>
                      <button
                        onClick={() => handleRenameCaptureTile(capture.name)}
                        className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white rounded-md transition-colors cursor-pointer"
                        title="Rename capture"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteCaptureTile(capture.name)}
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 border border-red-500 text-white rounded-md transition-colors cursor-pointer"
                        title="Delete capture"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Screenshot Preview */}
          <div id="screenshot-preview" className="bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden max-h-125">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {previewCapture ? `Preview: ${previewCapture.name}` : 'Screenshot'}
              </h2>
              <div className="flex items-center gap-2">
                {!previewCapture && (
                  <>
                    <button
                      onClick={() => {
                        if (!autoRefreshScreenshot) fetchScreenshot();
                        setAutoRefreshScreenshot(!autoRefreshScreenshot);
                      }}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        autoRefreshScreenshot
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                      title={autoRefreshScreenshot ? 'Stop auto-refresh' : `Auto-refresh every ${parsedScreenshotRefreshSeconds}s`}
                    >
                      <svg className={`w-4 h-4 ${autoRefreshScreenshot ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Live
                    </button>
                    <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1">
                      <input
                        type="number"
                        min="1"
                        value={screenshotRefreshSecondsInput}
                        onChange={(e) => setScreenshotRefreshSecondsInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSetScreenshotRefreshInterval();
                        }}
                        className="w-16 bg-transparent text-white text-sm focus:outline-none"
                        title="Live refresh interval in seconds"
                      />
                      <span className="text-gray-300 text-xs">sec</span>
                      <button
                        onClick={handleSetScreenshotRefreshInterval}
                        className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[11px] transition-colors cursor-pointer"
                        title="Apply refresh interval"
                      >
                        Set
                      </button>
                    </div>
                  </>
                )}
                {previewCapture && (
                  <button
                    onClick={() => setPreviewCapture(null)}
                    className="text-gray-400 hover:text-white text-sm cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden min-h-64">
              {previewCapture ? (
                <img
                  src={api.getScreenshotUrl(previewCapture.name)}
                  alt={`Preview: ${previewCapture.name}`}
                  className="max-w-full max-h-96 object-contain"
                />
              ) : currentScreenshot ? (
                <img
                  src={`data:image/png;base64,${currentScreenshot}`}
                  alt="Current screenshot"
                  className="max-w-full max-h-96 object-contain"
                />
              ) : (
                <div className="text-gray-500 text-sm text-center p-4">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No screenshot captured yet</p>
                  <p className="text-xs mt-1">Click "Capture Source", "Capture Screenshot", or "Preview" to view</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Element Finder and Saved Elements */} 
        <div id="elements-sections" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div id="find-elements-section" className="bg-gray-800 rounded-lg p-6 max-h-[900px] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-2">Find Elements</h2>
            <p className="text-gray-400 text-xs mb-4">
              Find elements using WebDriver APIs and save a named element when exactly one match is returned.
            </p>
            <div className="space-y-2 mb-4">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-2">
                <p className="text-[11px] text-cyan-300 font-medium">FIND ELEMENTS (MULTIPLE)</p>
                <p className="text-[11px] text-gray-400 font-mono">POST /session/{'{sessionId}'}/elements</p>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-2">
                <p className="text-[11px] text-cyan-300 font-medium">FIND CHILD ELEMENTS (MULTIPLE)</p>
                <p className="text-[11px] text-gray-400 font-mono">POST /session/{'{sessionId}'}/element/{'{elementId}'}/elements</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Scope
                </label>
                <select
                  value={findScope}
                  onChange={(e) => setFindScope(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="screen">Find on mobile screen</option>
                  <option value="parent">Find under parent element</option>
                </select>
              </div>

              {findScope === 'parent' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Parent element name or id
                  </label>
                  <input
                    type="text"
                    list="saved-element-names"
                    value={findParentName}
                    onChange={(e) => setFindParentName(e.target.value)}
                    placeholder="Saved name or raw element id"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <datalist id="saved-element-names">
                    {savedElements.map((el) => (
                      <option key={`name:${el.id}`} value={el.name} />
                    ))}
                    {savedElements.map((el) => (
                      <option key={`id:${el.id}`} value={el.id} />
                    ))}
                  </datalist>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-gray-300 text-sm font-medium">
                    Using
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowStrategyModal(true)}
                    className="w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 border border-gray-500 text-gray-200 text-xs font-bold leading-none cursor-pointer"
                    title="Open strategy reference"
                  >
                    ?
                  </button>
                </div>
                <select
                  value={findUsing}
                  onChange={(e) => {
                    const nextUsing = e.target.value;
                    setFindUsing(nextUsing);
                    if (nextUsing === 'xpath') {
                      setFindSelector(DEFAULT_XPATH_SELECTOR);
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {FIND_STRATEGIES.map((strategy) => (
                    <option key={strategy.value} value={strategy.value}>
                      {strategy.label} [{strategy.platform}] ({strategy.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Selector
                </label>
                <input
                  type="text"
                  value={findSelector}
                  onChange={(e) => setFindSelector(e.target.value)}
                  placeholder={DEFAULT_XPATH_SELECTOR}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                />
                {findUsing === '-android uiautomator' && (
                  <p className="text-[11px] text-gray-400 mt-2 font-mono">
                    Example: new UiSelector().text("Login")
                  </p>
                )}
              </div>

              <button
                onClick={handleFindElements}
                disabled={findingElements || !findSelector.trim() || (findScope === 'parent' && !findParentName.trim())}
                className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
              >
                {findingElements ? 'Finding...' : 'Find Elements'}
              </button>

              <p className="text-xs text-gray-300">
                Last find match count: <span className="font-mono">{lastFindCount}</span>
              </p>
              <div>
                <label className="block text-gray-400 text-xs mb-1">
                  Find response JSON
                </label>
                <textarea
                  value={lastFindResponse}
                  readOnly
                  rows={8}
                  placeholder="Find elements response will appear here..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-300 placeholder-gray-500 font-mono text-xs resize-y"
                />
              </div>
            </div>
          </div>

          <div id="saved-elements-section" className="bg-gray-800 rounded-lg p-6 max-h-[900px] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-2">Saved Elements</h2>
            <p className="text-gray-400 text-xs mb-4">
              Save named element references, re-check existence, and run tap/click/keys actions.
            </p>

            <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Coordinate actions</p>
              <div className="space-y-3">
                <div className="p-2 bg-gray-800/60 border border-gray-700 rounded">
                  <p className="text-[11px] text-gray-400 mb-2">oordinate action</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="number"
                      value={coordX}
                      onChange={(e) => setCoordX(e.target.value)}
                      placeholder="X"
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="number"
                      value={coordY}
                      onChange={(e) => setCoordY(e.target.value)}
                      placeholder="Y"
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <button
                      onClick={handleTapCoordinates}
                      disabled={runningElementAction === 'coord:tap'}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer"
                    >
                      Tap
                    </button>
                    <button
                      onClick={handleClickCoordinates}
                      disabled={runningElementAction === 'coord:click'}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer"
                    >
                      Click
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-gray-800/60 border border-gray-700 rounded">
                  <p className="text-[11px] text-gray-400 mb-2">Swipe by coordinate</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="number"
                      value={swipeX1}
                      onChange={(e) => setSwipeX1(e.target.value)}
                      placeholder="X1"
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="number"
                      value={swipeY1}
                      onChange={(e) => setSwipeY1(e.target.value)}
                      placeholder="Y1"
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <button
                      onClick={handleSwapSwipeCoordinates}
                      className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] transition-colors cursor-pointer"
                      title="Swap X1,Y1 with X2,Y2"
                      aria-label="Swap X1,Y1 with X2,Y2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-3-3m3 3l-3 3M16 17H4m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      value={swipeX2}
                      onChange={(e) => setSwipeX2(e.target.value)}
                      placeholder="X2"
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="number"
                      value={swipeY2}
                      onChange={(e) => setSwipeY2(e.target.value)}
                      placeholder="Y2"
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <button
                      onClick={handleSwipeByCoordinates}
                      disabled={runningElementAction === 'coord:swipe'}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer"
                    >
                      {runningElementAction === 'coord:swipe' ? 'Swiping...' : 'Swipe'}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleOpenFocusedKeysModal}
                disabled={sendingFocusedKeys || runningElementAction === 'focused:keys'}
                className="mt-2 px-3 py-1 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 11h1m2 0h1m2 0h1m2 0h1m2 0h1M8 15h8" />
                </svg>
                Send Keys To Focused Element
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Add element manually</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={manualElementName}
                  onChange={(e) => setManualElementName(e.target.value)}
                  placeholder="Element name"
                  className="flex-1 min-w-36 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  value={manualElementId}
                  onChange={(e) => setManualElementId(e.target.value)}
                  placeholder="Element id"
                  className="flex-1 min-w-48 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
                <button
                  onClick={handleSaveManualElement}
                  disabled={!manualElementName.trim() || !manualElementId.trim()}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {pendingElementId && (
              <div className="mb-4 p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
                <p className="text-cyan-300 text-xs mb-2">Single match found. Save it with a name.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pendingElementName}
                    onChange={(e) => setPendingElementName(e.target.value)}
                    placeholder="Element name"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleSavePendingElement}
                    disabled={!pendingElementName.trim()}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="saved-elements-list space-y-2 max-h-96 overflow-y-auto overflow-x-hidden pr-1">
              {savedElements.length === 0 ? (
                <p className="saved-elements-empty text-gray-400 text-sm">No saved elements yet</p>
              ) : (
                savedElements.map((element) => {
                  const tileClassToken = toCssClassToken(element.id);
                  const isBlinkingTile = blinkingSavedElementId === element.id;
                  const isBlinkStateOn = isBlinkingTile && savedElementBlinkOn;
                  const rowMuted = element.exists === false;
                  const isCheckingExists = runningElementAction === `exists:${element.id}`;
                  const hasSavedLocator = Boolean(
                    typeof element.locatorUsing === 'string' &&
                    element.locatorUsing.trim() &&
                    typeof element.locatorValue === 'string' &&
                    element.locatorValue.trim()
                  );
                  const isFindingBySavedLocator = runningElementAction === `findlocator:${element.id}`;
                  const isGettingRect = runningElementAction === `rect:${element.id}`;
                  const isTappingAtLocation = runningElementAction === `taploc:${element.id}`;
                  const isTappingElement = runningElementAction === `tap:${element.id}`;
                  const isClickingElement = runningElementAction === `click:${element.id}`;
                  const isGettingText = runningElementAction === `text:${element.id}`;
                  const isGettingProperty = runningElementAction === `property:${element.id}`;
                  const isGettingDisplayed = runningElementAction === `displayed:${element.id}`;
                  const isGettingEnabled = runningElementAction === `enabled:${element.id}`;
                  const isGettingCss = runningElementAction === `css:${element.id}`;
                  const isSendingKeysToElement = runningElementAction === `keys:${element.id}`;
                  const isExpanded = expandedSavedElementId === element.id;
                  const rect = normalizeRect(element.rect);
                  const propertyEntries = normalizePropertyEntries(element.propertyEntries);
                  const cssEntries = normalizeCssEntries(element.cssEntries);
                  const showTextRow = element.textFetched === true;
                  const showPropertyRow = propertyEntries.length > 0;
                  const showCssRow = cssEntries.length > 0;
                  const showDisplayedRow = element.displayedFetched === true;
                  const showEnabledRow = element.enabledFetched === true;
                  const showRectRow = element.rectFetched === true;
                  const hasValueRows =
                    showTextRow ||
                    showPropertyRow ||
                    showCssRow ||
                    showDisplayedRow ||
                    showEnabledRow ||
                    showRectRow;
                  const statusLabel = isCheckingExists
                    ? 'Checking...'
                    : element.exists === true
                      ? 'Exists'
                      : element.exists === false
                        ? 'Missing'
                        : 'Unchecked';
                  const statusClass = isCheckingExists
                    ? 'bg-blue-900/50 text-blue-300 border-blue-700/60'
                    : element.exists === true
                      ? 'bg-green-900/50 text-green-300 border-green-700/60'
                      : element.exists === false
                        ? 'bg-red-900/50 text-red-300 border-red-700/60'
                        : 'bg-gray-700 text-gray-300 border-gray-600';
                  const blinkingTileStyle = isBlinkStateOn
                    ? {
                        borderColor: 'rgb(56 189 248)',
                        backgroundColor: 'rgba(8, 145, 178, 0.38)',
                        boxShadow:
                          'inset 0 0 0 2px rgba(56,189,248,0.95), inset 0 0 22px rgba(6,182,212,0.82)',
                        opacity: 1
                      }
                    : undefined;
                  return (
                    <div
                      key={element.id}
                      ref={(node) => {
                        if (node) {
                          savedElementTileRefs.current.set(element.id, node);
                        } else {
                          savedElementTileRefs.current.delete(element.id);
                        }
                      }}
                      className={`saved-element-tile saved-element-tile-${tileClassToken} group relative p-3 rounded-lg border ${
                        rowMuted
                          ? 'bg-gray-900/60 border-gray-700 opacity-60'
                          : 'bg-gray-700 border-gray-600'
                      } transition-[box-shadow,border-color,background-color] duration-75 ease-linear`}
                      style={blinkingTileStyle}
                    >
                      <div className="saved-element-tile-content">
                        <div className="saved-element-main min-w-0">
                          <div className="saved-element-status-wrap mb-2">
                            <div className="inline-flex items-center gap-1">
                              <span className={`saved-element-status inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${statusClass}`}>
                                {statusLabel}
                              </span>
                              {element.idRefreshed === true && (
                                <span className="saved-element-status-refreshed inline-flex items-center px-1.5 py-0.5 rounded border border-cyan-500/70 bg-cyan-900/40 text-[9px] font-medium text-cyan-200">
                                  Refreshed
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="saved-element-header">
                            <p className="saved-element-name text-white text-sm font-medium truncate pr-44">{element.name}</p>
                          </div>
                          <p className="saved-element-id text-gray-400 text-[11px] font-mono truncate mt-1">
                            <span className="text-gray-500 mr-1">Element ID:</span>
                            {element.id}
                          </p>
                          <div className="saved-element-quick-actions mt-2 flex flex-wrap gap-1">
                            <button
                              onClick={() => handleCheckElementExists(element)}
                              disabled={isCheckingExists}
                              className="saved-element-btn saved-element-btn-exists h-6 px-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Check element exists"
                            >
                              {isCheckingExists ? 'Checking...' : 'Exists'}
                            </button>
                            <button
                              onClick={() => handleFindSavedElementByLocator(element)}
                              disabled={isFindingBySavedLocator || !hasSavedLocator}
                              className="saved-element-btn saved-element-btn-find h-6 px-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:text-gray-300 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title={hasSavedLocator ? 'Find element again by saved locator' : 'No saved locator for this element'}
                            >
                              {isFindingBySavedLocator ? 'Finding...' : 'Find'}
                            </button>
                            <button
                              onClick={() => setExpandedSavedElementId((prev) => (prev === element.id ? null : element.id))}
                              className="saved-element-btn saved-element-btn-expand h-6 px-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center gap-1"
                              title={isExpanded ? 'Collapse advanced section' : 'Expand advanced section'}
                            >
                              {isExpanded ? 'Collapse Advanced' : 'Expand Advanced'}
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          <div className="saved-element-top-actions absolute top-2 right-2 flex items-center gap-1">
                            <button
                              onClick={() => handleRenameSavedElement(element.id)}
                              className="saved-element-btn saved-element-btn-rename saved-element-btn-rename-icon h-6 w-6 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Rename element"
                              aria-label={`Rename ${element.name}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.586 3.586a2 2 0 112.828 2.828L12 15.828 8 16l.172-4 10.414-10.414z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleClearSavedElementValues(element)}
                              className="saved-element-btn saved-element-btn-clear h-6 px-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Clear saved values"
                              aria-label={`Clear saved values for ${element.name}`}
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => handleDeleteSavedElement(element.id)}
                              className="saved-element-btn saved-element-btn-delete saved-element-btn-delete-icon h-6 w-6 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Delete element"
                              aria-label={`Delete ${element.name}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 12h8l1-12" />
                              </svg>
                            </button>
                          </div>
                          {isExpanded && (
                            <>
                              {hasValueRows && (
                                <div className="saved-element-values-table mt-2 overflow-hidden rounded border border-gray-600/70">
                                  <table className="w-full table-fixed border-collapse text-[11px] font-mono">
                                    <tbody>
                                      {showTextRow && (
                                        <tr className="saved-element-value-row border-b border-gray-600/50">
                                          <th className="saved-element-value-label w-44 bg-gray-800/70 px-2 py-1 text-left font-medium text-gray-300">
                                            Text
                                          </th>
                                          <td className="saved-element-value saved-element-value-text bg-gray-900/60 px-2 py-1 text-gray-200 whitespace-pre-wrap break-words">
                                            {formatElementValueForDisplay(element.textValue)}
                                          </td>
                                        </tr>
                                      )}
                                      {showPropertyRow && (
                                        <tr className="saved-element-value-row border-b border-gray-600/50">
                                          <th className="saved-element-value-label w-44 bg-gray-800/70 px-2 py-1 text-left font-medium text-gray-300">
                                            Properties
                                          </th>
                                          <td className="saved-element-value saved-element-value-property bg-gray-900/60 px-2 py-1 text-gray-200 whitespace-pre-wrap break-words">
                                            <table className="saved-element-subtable w-full border-collapse text-[10px] border border-gray-600/80">
                                              <thead>
                                                <tr>
                                                  <th className="px-1 py-0.5 text-left text-gray-400 font-medium border border-gray-600/80">Name</th>
                                                  <th className="px-1 py-0.5 text-left text-gray-400 font-medium border border-gray-600/80">Value</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {propertyEntries.map((entry) => (
                                                  <tr key={getPropertyEntryKey(entry)} className="align-top">
                                                    <td className="px-1 py-0.5 text-gray-300 border border-gray-600/80">
                                                      {entry.name}
                                                    </td>
                                                    <td className="px-1 py-0.5 text-gray-200 border border-gray-600/80 whitespace-pre-wrap break-words">
                                                      {formatElementValueForDisplay(entry.value)}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      )}
                                      {showCssRow && (
                                        <tr className="saved-element-value-row border-b border-gray-600/50">
                                          <th className="saved-element-value-label w-44 bg-gray-800/70 px-2 py-1 text-left font-medium text-gray-300">
                                            CSS Properties
                                          </th>
                                          <td className="saved-element-value saved-element-value-css bg-gray-900/60 px-2 py-1 text-gray-200 whitespace-pre-wrap break-words">
                                            {cssEntries.map((entry) => (
                                              <div key={getCssEntryKey(entry)}>
                                                {`${entry.name}: ${formatElementValueForDisplay(entry.value)}`}
                                              </div>
                                            ))}
                                          </td>
                                        </tr>
                                      )}
                                      {showDisplayedRow && (
                                        <tr className="saved-element-value-row border-b border-gray-600/50">
                                          <th className="saved-element-value-label w-44 bg-gray-800/70 px-2 py-1 text-left font-medium text-gray-300">
                                            Displayed
                                          </th>
                                          <td className="saved-element-value saved-element-value-displayed bg-gray-900/60 px-2 py-1 text-gray-200 whitespace-pre-wrap break-words">
                                            {formatElementValueForDisplay(element.displayedValue)}
                                          </td>
                                        </tr>
                                      )}
                                      {showEnabledRow && (
                                        <tr className="saved-element-value-row border-b border-gray-600/50">
                                          <th className="saved-element-value-label w-44 bg-gray-800/70 px-2 py-1 text-left font-medium text-gray-300">
                                            Enabled
                                          </th>
                                          <td className="saved-element-value saved-element-value-enabled bg-gray-900/60 px-2 py-1 text-gray-200 whitespace-pre-wrap break-words">
                                            {formatElementValueForDisplay(element.enabledValue)}
                                          </td>
                                        </tr>
                                      )}
                                      {showRectRow && (
                                        <tr className="saved-element-value-row">
                                          <th className="saved-element-value-label w-44 bg-gray-800/70 px-2 py-1 text-left font-medium text-gray-300">
                                            Rect
                                          </th>
                                          <td className="saved-element-value saved-element-value-rect bg-gray-900/60 px-2 py-1 text-gray-200 whitespace-pre-wrap break-words">
                                            {rect
                                              ? `x:${Math.round(rect.x)} y:${Math.round(rect.y)} w:${Math.round(rect.width)} h:${Math.round(rect.height)}`
                                              : 'not fetched'}
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                        <div className="saved-element-advanced-actions mt-2 w-full">
                          <div className="saved-element-advanced-actions-grid grid grid-cols-5 gap-1">
                            <button
                              onClick={() => handleGetElementText(element)}
                              disabled={isGettingText}
                              className="saved-element-btn saved-element-btn-text h-7 w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Get element text"
                            >
                              {isGettingText ? 'Text...' : 'Text'}
                            </button>
                            <button
                              onClick={() => handleOpenElementPropertyModal(element)}
                              disabled={isGettingProperty}
                              className="saved-element-btn saved-element-btn-property h-7 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Get element property"
                            >
                              {isGettingProperty ? 'Prop...' : 'Property'}
                            </button>
                            <button
                              onClick={() => handleGetElementCssValue(element)}
                              disabled={isGettingCss}
                              className="saved-element-btn saved-element-btn-css h-7 w-full bg-lime-600 hover:bg-lime-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Get element css value"
                            >
                              {isGettingCss ? 'CSS...' : 'CSS'}
                            </button>
                            <button
                              onClick={() => handleGetElementDisplayed(element)}
                              disabled={isGettingDisplayed}
                              className="saved-element-btn saved-element-btn-displayed h-7 w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Get element displayed"
                            >
                              {isGettingDisplayed ? 'Disp...' : 'Displayed'}
                            </button>
                            <button
                              onClick={() => handleGetElementEnabled(element)}
                              disabled={isGettingEnabled}
                              className="saved-element-btn saved-element-btn-enabled h-7 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Get element enabled"
                            >
                              {isGettingEnabled ? 'Enbl...' : 'Enabled'}
                            </button>
                            <button
                              onClick={() => handleGetElementRect(element)}
                              disabled={isGettingRect}
                              className="saved-element-btn saved-element-btn-rect h-7 w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Get element rect"
                            >
                              {isGettingRect ? 'Rect...' : 'Rect'}
                            </button>
                            <button
                              onClick={() => handleTapElement(element)}
                              disabled={isTappingElement}
                              className="saved-element-btn saved-element-btn-tap h-7 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Tap element"
                            >
                              {isTappingElement ? 'Tap...' : 'Tap'}
                            </button>
                            <button
                              onClick={() => handleTapAtElementLocation(element)}
                              disabled={isTappingAtLocation}
                              className="saved-element-btn saved-element-btn-tap-location h-7 w-full bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Tap at element location"
                            >
                              {isTappingAtLocation ? 'Tap@Loc...' : 'Tap @Loc'}
                            </button>
                            <button
                              onClick={() => handleClickElement(element)}
                              disabled={isClickingElement}
                              className="saved-element-btn saved-element-btn-click h-7 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center"
                              title="Click element"
                            >
                              {isClickingElement ? 'Click...' : 'Click'}
                            </button>
                            <button
                              onClick={() => handleOpenElementKeysModal(element)}
                              disabled={isSendingKeysToElement}
                              className="saved-element-btn saved-element-btn-keys h-7 w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 text-white rounded text-[10px] cursor-pointer inline-flex items-center justify-center gap-1"
                              title="Send keys to element"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 11h1m2 0h1m2 0h1m2 0h1m2 0h1M8 15h8" />
                              </svg>
                              {isSendingKeysToElement ? 'Keys...' : 'Keys'}
                            </button>
                          </div>
                        </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Advanced Sections */}
        <div id="advanced-sections" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Execute Script Section */}
          <div id="execute-script-section" className="bg-gray-800 rounded-lg p-6 max-h-175 overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Execute Script</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Endpoint
                </label>
                <select
                  value={executeScriptEndpoint}
                  onChange={(e) => setExecuteScriptEndpoint(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                >
                  <option value="/session/{session id}/execute/sync">POST /session/{'{session id}'}/execute/sync</option>
                  <option value="/session/{session id}/execute">POST /session/{'{session id}'}/execute</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Mode
                </label>
                <select
                  value={executeScriptMode}
                  onChange={(e) => setExecuteScriptMode(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="scriptOnly">Script only</option>
                  <option value="scriptWithArgs">Script + args (JSON)</option>
                </select>
              </div>

              {executeScriptMode === 'scriptOnly' ? (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Script
                  </label>
                  <textarea
                    value={executeScript}
                    onChange={(e) => setExecuteScript(e.target.value)}
                    placeholder="mobile: deviceScreenInfo"
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Script + Args Payload (JSON)
                  </label>
                  <textarea
                    value={executeScriptWithArgsJson}
                    onChange={(e) => setExecuteScriptWithArgsJson(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                  />
                </div>
              )}

              <button
                onClick={handleExecuteScript}
                disabled={executingScript || !canSendExecuteScript}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {executingScript ? 'Executing...' : 'Send'}
              </button>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Response
                  </label>
                  {executeScriptStatus !== null && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      isSuccessStatusCode(executeScriptStatus)
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}>
                      {executeScriptStatus}
                    </span>
                  )}
                </div>
                <textarea
                  value={executeScriptResult}
                  readOnly
                  rows={6}
                  placeholder="Response will appear here..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-300 placeholder-gray-500 font-mono text-sm resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Executed Scripts (last {REQUEST_HISTORY_LIMIT}) - {executedScripts.length}
                  </label>
                  <button
                    onClick={handleExportExecutedScripts}
                    disabled={executedScripts.length === 0}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-[11px] cursor-pointer"
                    title="Export execute script history"
                  >
                    Export JSON
                  </button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {executedScripts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No scripts executed yet</p>
                  ) : (
                    executedScripts.map((item) => (
                      <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedExecutedScriptId((prev) => (prev === item.id ? null : item.id))}
                          className="w-full px-3 py-2 hover:bg-gray-800/70 text-left cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg
                                className={`w-3 h-3 text-gray-400 transition-transform ${expandedExecutedScriptId === item.id ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 shrink-0">
                                {item.method}
                              </span>
                              <span className="text-cyan-300 text-[11px] font-mono truncate">{item.endpoint}</span>
                            </div>
                            <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                              isSuccessStatusCode(item.statusCode)
                                ? 'bg-green-900/50 text-green-400'
                                : item.statusCode === null
                                  ? 'bg-gray-700 text-gray-400'
                                  : 'bg-red-900/50 text-red-400'
                            }`}>
                              {item.statusCode ?? '-'}
                            </span>
                          </div>
                          <p className="text-gray-500 text-[10px] mt-1 ml-5">
                            {new Date(item.executedAt).toLocaleString()}
                          </p>
                        </button>
                        {expandedExecutedScriptId === item.id && (
                          <div className="border-t border-gray-700 px-3 py-3 space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-gray-400 text-xs">Payload</p>
                                <button
                                  onClick={() => handleCopyScript(item.payloadText || '')}
                                  disabled={!item.payloadText}
                                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-[11px] cursor-pointer"
                                  title="Copy payload"
                                >
                                  Copy
                                </button>
                              </div>
                              <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                {item.payloadText || '(empty)'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs mb-1">Response</p>
                              <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                {item.responseText || '(empty)'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Generic API Section */}
        <div id="generic-api-section" className="bg-gray-800 rounded-lg p-6 max-h-175 overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Generic WebDriver API</h2>
                <p className="text-gray-400 text-xs mt-1">Send any WebDriver command</p>
              </div>
              <div className="w-80 shrink-0">
                <label className="block text-gray-300 text-xs font-medium mb-1">
                  WebDriver API Preset
                </label>
                <select
                  value={selectedWebDriverPresetTitle}
                  onChange={(e) => handleSelectWebDriverPreset(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="none">none</option>
                  {WEBDRIVER_REFERENCE_PRESETS.map((preset) => (
                    <option key={preset.title} value={preset.title}>
                      {preset.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Endpoint
                </label>
                <div className="flex w-full border border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
                  <span className="px-3 py-2 bg-gray-900 text-gray-400 font-mono text-xs whitespace-nowrap border-r border-gray-600">
                    {GENERIC_SESSION_ENDPOINT_PREFIX}
                  </span>
                  <input
                    type="text"
                    value={genericEndpoint}
                    onChange={(e) => setGenericEndpoint(trimLeadingSlashes(e.target.value))}
                    placeholder="url (or status for absolute preset)"
                    className="flex-1 px-3 py-2 bg-gray-700 text-white placeholder-gray-400 focus:outline-none font-mono text-sm min-w-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Method
                </label>
                <select
                  value={genericMethod}
                  onChange={(e) => setGenericMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              {genericMethod === 'POST' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Payload (JSON)
                  </label>
                  <textarea
                    value={genericPayload}
                    onChange={(e) => setGenericPayload(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-none"
                  />
                </div>
              )}

              <button
                onClick={handleGenericRequest}
                disabled={sendingGeneric || !genericEndpoint.trim()}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                {sendingGeneric ? 'Sending...' : 'Send'}
              </button>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Response
                  </label>
                  {genericStatus !== null && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      isSuccessStatusCode(genericStatus)
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}>
                      {genericStatus}
                    </span>
                  )}
                </div>
                <textarea
                  value={genericResult}
                  readOnly
                  rows={6}
                  placeholder="Response will appear here..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-300 placeholder-gray-500 font-mono text-sm resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Executed WebDriver APIs (last {REQUEST_HISTORY_LIMIT}) - {executedGenericApis.length}
                  </label>
                  <button
                    onClick={handleExportExecutedGenericApis}
                    disabled={executedGenericApis.length === 0}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-[11px] cursor-pointer"
                    title="Export generic API history"
                  >
                    Export JSON
                  </button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {executedGenericApis.length === 0 ? (
                    <p className="text-gray-500 text-sm">No APIs executed yet</p>
                  ) : (
                    executedGenericApis.map((item) => (
                      <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedExecutedGenericId((prev) => (prev === item.id ? null : item.id))}
                          className="w-full px-3 py-2 hover:bg-gray-800/70 text-left cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg
                                className={`w-3 h-3 text-gray-400 transition-transform ${expandedExecutedGenericId === item.id ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                                item.method === 'GET' ? 'bg-green-900/50 text-green-400' :
                                item.method === 'POST' ? 'bg-blue-900/50 text-blue-400' :
                                item.method === 'DELETE' ? 'bg-red-900/50 text-red-400' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {item.method}
                              </span>
                              <span className="text-cyan-300 text-[11px] font-mono truncate">{item.endpoint}</span>
                            </div>
                            <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                              isSuccessStatusCode(item.statusCode)
                                ? 'bg-green-900/50 text-green-400'
                                : item.statusCode === null
                                  ? 'bg-gray-700 text-gray-400'
                                  : 'bg-red-900/50 text-red-400'
                            }`}>
                              {item.statusCode ?? '-'}
                            </span>
                          </div>
                          <p className="text-gray-500 text-[10px] mt-1 ml-5">
                            {new Date(item.executedAt).toLocaleString()}
                          </p>
                        </button>
                        {expandedExecutedGenericId === item.id && (
                          <div className="border-t border-gray-700 px-3 py-3 space-y-3">
                            <div>
                              <p className="text-gray-400 text-xs mb-1">Payload</p>
                              <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                {item.payloadText || '(empty)'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs mb-1">Response</p>
                              <pre className="bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                {item.responseText || '(empty)'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Logs Section */}
        <div id="api-logs-section" className="bg-gray-800 rounded-lg p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              WebDriver API Logs ({logs.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={loadLogs}
                disabled={logsLoading}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
                title="Refresh logs"
              >
                {logsLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
                title="Clear logs from view"
              >
                Clear
              </button>
              <button
                onClick={handleDeleteAllLogs}
                disabled={logs.length === 0}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
                title="Delete all log files from server"
              >
                Delete All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm">No logs available</p>
            ) : (
              <table className="w-full text-sm">
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

        {/* Capture Viewer Modal */}
        {selectedCapture && (
          <CaptureViewer
            capture={selectedCapture}
            onClose={() => setSelectedCapture(null)}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        )}

        {/* Element Property Modal */}
        {showElementPropertyModal && elementPropertyTarget && renderModalInViewport(
          <div
            className="z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto"
            style={modalOverlayStyle}
          >
            <div
              className="w-full max-w-xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[calc(100vh-40px)] overflow-y-auto"
              style={modalCardViewportStyle}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold">Get Element Property</h3>
                  <p className="text-[11px] text-gray-400 font-mono truncate">
                    {elementPropertyTarget.name} ({elementPropertyTarget.id})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseElementPropertyModal}
                  disabled={fetchingElementProperty}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-gray-200 rounded text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Endpoint</label>
                  <select
                    value={elementPropertyEndpointType}
                    onChange={(e) => setElementPropertyEndpointType(e.target.value)}
                    disabled={fetchingElementProperty}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    {ELEMENT_PROPERTY_ENDPOINT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {elementPropertyEndpointRequiresName && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={elementPropertyName}
                      onChange={(e) => setElementPropertyName(e.target.value)}
                      disabled={fetchingElementProperty}
                      placeholder="Enter property/attribute name..."
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
                    />
                  </div>
                )}

                <p className="text-[11px] text-cyan-300 font-mono break-all">
                  GET {elementPropertyEndpointPreview}
                </p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseElementPropertyModal}
                    disabled={fetchingElementProperty}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchElementProperty}
                    disabled={fetchingElementProperty || (elementPropertyEndpointRequiresName && !elementPropertyNameTrimmed)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-300 text-white rounded text-sm cursor-pointer"
                  >
                    {fetchingElementProperty ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400 mb-1">Response</p>
                  <pre className="bg-gray-900 border border-gray-700 rounded p-2 text-gray-300 text-xs font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {elementPropertyResponse || '(no response yet)'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Keys Modal */}
        {showElementKeysModal && elementKeysTarget && renderModalInViewport(
          <div
            className="z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto"
            style={modalOverlayStyle}
          >
            <div
              className="w-full max-w-xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[calc(100vh-40px)] overflow-y-auto"
              style={modalCardViewportStyle}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold">Send Keys</h3>
                  <p className="text-[11px] text-gray-400 font-mono truncate">
                    {elementKeysTarget.name} ({elementKeysTarget.id})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseElementKeysModal}
                  disabled={sendingElementKeys}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-gray-200 rounded text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-[11px] text-cyan-300 font-mono break-all">
                  POST /session/{sessionId}/element/{elementKeysTarget.id}/value
                </p>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Text</label>
                  <textarea
                    value={elementKeysText}
                    onChange={(e) => setElementKeysText(e.target.value)}
                    rows={5}
                    placeholder="Type text to send to this element..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm resize-y"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Payload Mode</label>
                  <select
                    value={elementKeysPayloadMode}
                    onChange={(e) => setElementKeysPayloadMode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    <option value="w3c">W3C-preferred (use this by default)</option>
                    <option value="legacy">Legacy-compatible (use only when you need control)</option>
                  </select>
                </div>

                <div className="bg-gray-900 border border-gray-700 rounded-lg p-2">
                  <p className="text-[11px] text-gray-400 mb-1">Payload Preview</p>
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {JSON.stringify(
                      elementKeysPayloadMode === 'legacy'
                        ? { value: Array.from(elementKeysText) }
                        : { text: elementKeysText },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseElementKeysModal}
                    disabled={sendingElementKeys}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendElementKeys}
                    disabled={sendingElementKeys || elementKeysText.length === 0}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 disabled:text-gray-300 text-white rounded text-sm cursor-pointer"
                  >
                    {sendingElementKeys ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Focused Keys Modal */}
        {showFocusedKeysModal && renderModalInViewport(
          <div
            className="z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto"
            style={modalOverlayStyle}
          >
            <div
              className="w-full max-w-xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[calc(100vh-40px)] overflow-y-auto"
              style={modalCardViewportStyle}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold">Send Keys To Focused Element</h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseFocusedKeysModal}
                  disabled={sendingFocusedKeys}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-gray-200 rounded text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-[11px] text-cyan-300 font-mono break-all">
                  POST /session/{sessionId}/keys
                </p>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Text</label>
                  <textarea
                    value={focusedKeysText}
                    onChange={(e) => setFocusedKeysText(e.target.value)}
                    rows={5}
                    placeholder="Type text to send to focused element..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm resize-y"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Payload Mode</label>
                  <select
                    value={focusedKeysPayloadMode}
                    onChange={(e) => setFocusedKeysPayloadMode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    <option value="w3c">W3C-preferred (use this by default)</option>
                    <option value="legacy">Legacy-compatible (use only when you need control)</option>
                  </select>
                </div>

                <div className="bg-gray-900 border border-gray-700 rounded-lg p-2">
                  <p className="text-[11px] text-gray-400 mb-1">Payload Preview</p>
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {JSON.stringify(
                      focusedKeysPayloadMode === 'legacy'
                        ? { value: Array.from(focusedKeysText) }
                        : { text: focusedKeysText },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseFocusedKeysModal}
                    disabled={sendingFocusedKeys}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendFocusedKeys}
                    disabled={sendingFocusedKeys || focusedKeysText.length === 0}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 disabled:text-gray-300 text-white rounded text-sm cursor-pointer"
                  >
                    {sendingFocusedKeys ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strategy Reference Modal */}
        {showStrategyModal && renderModalInViewport(
          <div
            className="z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto"
            style={modalOverlayStyle}
          >
            <div
              className="w-full max-w-3xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[calc(100vh-40px)] overflow-hidden"
              style={modalCardViewportStyle}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Strategy Reference</h3>
                <button
                  type="button"
                  onClick={() => setShowStrategyModal(false)}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-64px)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 py-2 pr-3">Strategy</th>
                      <th className="text-left text-gray-400 py-2 pr-3">Platform</th>
                      <th className="text-left text-gray-400 py-2">using value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIND_STRATEGIES.map((strategy) => (
                      <tr key={strategy.value} className="border-b border-gray-700/40">
                        <td className="text-gray-300 py-2 pr-3">{strategy.label}</td>
                        <td className="text-gray-300 py-2 pr-3">{strategy.platform}</td>
                        <td className="text-cyan-300 py-2 font-mono">{strategy.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
