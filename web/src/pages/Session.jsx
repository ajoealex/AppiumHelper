import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import CaptureViewer from '../components/CaptureViewer';
import SessionHeader from '../components/session/SessionHeader';
import CaptureControlsSection from '../components/session/CaptureControlsSection';
import CapturesPreviewSection from '../components/session/CapturesPreviewSection';
import AdvancedSections from '../components/session/AdvancedSections';
import ApiLogsSection from '../components/session/ApiLogsSection';

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
const SCREENSHOT_SWIPE_THRESHOLD_PX = 24;
const INTERACTIVE_CONTEXT_CHECK_INTERVAL_MS = 20000;
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

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mapPointerToDeviceCoordinates(pointerEvent, imageElement, viewportSize = null) {
  if (!pointerEvent || !imageElement) return null;
  const rect = imageElement.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  const viewportWidth = Number(viewportSize?.width);
  const viewportHeight = Number(viewportSize?.height);
  const targetWidth = Number.isFinite(viewportWidth) && viewportWidth > 0
    ? Math.round(viewportWidth)
    : imageElement.naturalWidth;
  const targetHeight = Number.isFinite(viewportHeight) && viewportHeight > 0
    ? Math.round(viewportHeight)
    : imageElement.naturalHeight;
  if (!targetWidth || !targetHeight) return null;

  const relativeX = clampNumber(pointerEvent.clientX - rect.left, 0, rect.width);
  const relativeY = clampNumber(pointerEvent.clientY - rect.top, 0, rect.height);
  const maxX = Math.max(targetWidth - 1, 0);
  const maxY = Math.max(targetHeight - 1, 0);
  const x = Math.round((relativeX / rect.width) * maxX);
  const y = Math.round((relativeY / rect.height) * maxY);
  return { x, y };
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
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [capturesSectionTab, setCapturesSectionTab] = useState('captures');
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [previewCapture, setPreviewCapture] = useState(null);
  const [autoRefreshScreenshot, setAutoRefreshScreenshot] = useState(false);
  const [screenshotRefreshSeconds, setScreenshotRefreshSeconds] = useState(10);
  const [screenshotRefreshSecondsInput, setScreenshotRefreshSecondsInput] = useState('10');
  const [isScreenshotInteractExpanded, setIsScreenshotInteractExpanded] = useState(false);
  const [lastScreenshotPressCoordinates, setLastScreenshotPressCoordinates] = useState(null);
  const [deviceWindowRect, setDeviceWindowRect] = useState(null);
  const [showScreenshotSendKeysInput, setShowScreenshotSendKeysInput] = useState(false);
  const [screenshotSendKeysText, setScreenshotSendKeysText] = useState('');
  const [sendingScreenshotKeys, setSendingScreenshotKeys] = useState(false);
  const screenshotLiveImageRef = useRef(null);
  const screenshotGestureRef = useRef(null);
  const wasScreenshotInteractModeEnabledRef = useRef(false);
  const [screenshotGestureStart, setScreenshotGestureStart] = useState(null);
  const [screenshotGestureCurrent, setScreenshotGestureCurrent] = useState(null);

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
  const isLiveScreenshotInteractable = (
    !previewCapture
    && Boolean(currentScreenshot)
    && autoRefreshScreenshot
    && isScreenshotInteractExpanded
  );
  const isScreenshotInteractModeEnabled = (
    !previewCapture
    && autoRefreshScreenshot
    && isScreenshotInteractExpanded
  );
  const isRunningScreenshotGesture = runningElementAction === 'screenshot:gesture';

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

  const fetchDeviceWindowRect = useCallback(async ({ silent = false } = {}) => {
    try {
      const rectResponse = await api.getWindowRect(appiumUrl, sessionId, customHeaders);
      const rectValue = rectResponse?.value || {};
      const width = Number(rectValue.width);
      const height = Number(rectValue.height);
      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        throw new Error('Invalid viewport size returned from /window/rect');
      }
      const nextRect = {
        x: Number.isFinite(Number(rectValue.x)) ? Number(rectValue.x) : 0,
        y: Number.isFinite(Number(rectValue.y)) ? Number(rectValue.y) : 0,
        width: Math.round(width),
        height: Math.round(height),
        fetchedAt: Date.now()
      };
      setDeviceWindowRect(nextRect);
      return nextRect;
    } catch (err) {
      if (!silent) {
        setError('Failed to get device window rect: ' + err.message);
      }
      return null;
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

  useEffect(() => {
    if (autoRefreshScreenshot && !previewCapture) return;
    setIsScreenshotInteractExpanded(false);
  }, [autoRefreshScreenshot, previewCapture]);

  useEffect(() => {
    if (isLiveScreenshotInteractable) return;
    screenshotGestureRef.current = null;
    setScreenshotGestureStart(null);
    setScreenshotGestureCurrent(null);
  }, [isLiveScreenshotInteractable]);

  useEffect(() => {
    setDeviceWindowRect(null);
    wasScreenshotInteractModeEnabledRef.current = false;
  }, [appiumUrl, sessionId]);

  useEffect(() => {
    if (isScreenshotInteractModeEnabled && !wasScreenshotInteractModeEnabledRef.current) {
      void fetchDeviceWindowRect({ silent: true });
    }
    wasScreenshotInteractModeEnabledRef.current = isScreenshotInteractModeEnabled;
  }, [isScreenshotInteractModeEnabled, fetchDeviceWindowRect]);

  useEffect(() => {
    if (!isScreenshotInteractModeEnabled) return;

    let isDisposed = false;
    let isChecking = false;

    const checkCurrentContext = async () => {
      if (isChecking || isDisposed) return;
      isChecking = true;
      try {
        const data = await api.getCurrentContext(appiumUrl, sessionId, customHeaders);
        if (isDisposed) return;
        const contextName = typeof data?.value === 'string' ? data.value.trim() : '';
        if (!contextName) return;

        setContexts((prev) => (prev.includes(contextName) ? prev : [...prev, contextName]));
        setSelectedContext(contextName);

        if (contextName.toUpperCase() !== 'NATIVE_APP') {
          setIsScreenshotInteractExpanded(false);
          setShowScreenshotSendKeysInput(false);
          setWarning('Exiting from interactive mode. Interactive mode is applicable only for native view');
        }
      } catch {
        // Ignore periodic context check errors to avoid noisy banners.
      } finally {
        isChecking = false;
      }
    };

    const intervalId = setInterval(() => {
      void checkCurrentContext();
    }, INTERACTIVE_CONTEXT_CHECK_INTERVAL_MS);

    return () => {
      isDisposed = true;
      clearInterval(intervalId);
    };
  }, [isScreenshotInteractModeEnabled, appiumUrl, sessionId, customHeaders]);

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

  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

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
      const contextName = typeof data?.value === 'string' ? data.value.trim() : '';

      if (!contextName) {
        setError('Current context response did not include a context name');
        return;
      }

      setContexts((prev) => (prev.includes(contextName) ? prev : [...prev, contextName]));
      setSelectedContext(contextName);

      const shouldExitInteractiveMode = isScreenshotInteractModeEnabled && contextName !== 'NATIVE_APP';
      if (shouldExitInteractiveMode) {
        setIsScreenshotInteractExpanded(false);
        setShowScreenshotSendKeysInput(false);
      }

      setSuccess(
        shouldExitInteractiveMode
          ? `Current context: ${contextName}. Interactive mode disabled (requires NATIVE_APP).`
          : `Current context: ${contextName}`
      );
    } catch (err) {
      setError('Failed to get current context: ' + err.message);
    } finally {
      setGettingCurrentContext(false);
    }
  };

  const handleToggleScreenshotInteractExpanded = async () => {
    if (isScreenshotInteractExpanded) {
      setIsScreenshotInteractExpanded(false);
      return;
    }

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

      if (contextName !== 'NATIVE_APP') {
        setError(`Interactive mode requires NATIVE_APP context. Current context: ${contextName}`);
        return;
      }

      setIsScreenshotInteractExpanded(true);
    } catch (err) {
      setError('Failed to verify current context for interactive mode: ' + err.message);
    }
  };

  const handleSetSelectedContext = async () => {
    if (!selectedContext) {
      setError('Select a context first');
      return;
    }

    const nextContext = selectedContext.trim();
    const isNonNativeContext = nextContext.toUpperCase() !== 'NATIVE_APP';

    setSettingContext(true);
    setError('');
    try {
      await api.setContext(appiumUrl, sessionId, nextContext, customHeaders);
      setSuccess(`Context set to: ${nextContext}`);

      if (isScreenshotInteractModeEnabled && isNonNativeContext) {
        setIsScreenshotInteractExpanded(false);
        setShowScreenshotSendKeysInput(false);
        setWarning('Exiting from interactive mode. Interactive mode is applicable only for native view');
      }

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

  const handleSendScreenshotKeys = async () => {
    const textToSend = screenshotSendKeysText;
    if (!textToSend.length) {
      setError('Enter text to send');
      return;
    }

    const actionKey = 'screenshot:keys';
    setRunningElementAction(actionKey);
    setSendingScreenshotKeys(true);
    setError('');

    try {
      await api.sendKeysByActions(appiumUrl, sessionId, textToSend, customHeaders);
      setSuccess(`Sent ${textToSend.length} key${textToSend.length === 1 ? '' : 's'} via actions`);
      setScreenshotSendKeysText('');
      setShowScreenshotSendKeysInput(false);
    } catch (err) {
      setError('Screenshot send keys failed: ' + err.message);
    } finally {
      setRunningElementAction('');
      setSendingScreenshotKeys(false);
      await refreshLogsAfterWebDriverAction();
    }
  };

  const resetLiveScreenshotGesture = () => {
    screenshotGestureRef.current = null;
    setScreenshotGestureStart(null);
    setScreenshotGestureCurrent(null);
  };

  const handleLiveScreenshotPointerDown = (event) => {
    if (!isLiveScreenshotInteractable || isRunningScreenshotGesture) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!deviceWindowRect?.width || !deviceWindowRect?.height) {
      void fetchDeviceWindowRect({ silent: false });
      return;
    }

    const imageElement = screenshotLiveImageRef.current;
    const mapped = mapPointerToDeviceCoordinates(event, imageElement, deviceWindowRect);
    if (!mapped) return;

    screenshotGestureRef.current = {
      pointerId: event.pointerId,
      startX: mapped.x,
      startY: mapped.y,
      currentX: mapped.x,
      currentY: mapped.y,
      viewportWidth: deviceWindowRect.width,
      viewportHeight: deviceWindowRect.height
    };
    setLastScreenshotPressCoordinates({ x: mapped.x, y: mapped.y });
    setScreenshotGestureStart({ x: mapped.x, y: mapped.y });
    setScreenshotGestureCurrent({ x: mapped.x, y: mapped.y });

    if (event.currentTarget?.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore pointer capture errors.
      }
    }
    event.preventDefault();
  };

  const handleLiveScreenshotPointerMove = (event) => {
    const gesture = screenshotGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const imageElement = screenshotLiveImageRef.current;
    const mapped = mapPointerToDeviceCoordinates(event, imageElement, {
      width: gesture.viewportWidth,
      height: gesture.viewportHeight
    });
    if (!mapped) return;

    gesture.currentX = mapped.x;
    gesture.currentY = mapped.y;
    setScreenshotGestureCurrent({ x: mapped.x, y: mapped.y });
    event.preventDefault();
  };

  const handleLiveScreenshotPointerUp = async (event) => {
    const gesture = screenshotGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const imageElement = screenshotLiveImageRef.current;
    const mapped = mapPointerToDeviceCoordinates(event, imageElement, {
      width: gesture.viewportWidth,
      height: gesture.viewportHeight
    });
    const endX = mapped?.x ?? gesture.currentX;
    const endY = mapped?.y ?? gesture.currentY;
    const startX = gesture.startX;
    const startY = gesture.startY;

    if (event.currentTarget?.releasePointerCapture) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore pointer release errors.
      }
    }

    resetLiveScreenshotGesture();

    const swipeDistance = Math.hypot(endX - startX, endY - startY);
    const shouldSwipe = swipeDistance >= SCREENSHOT_SWIPE_THRESHOLD_PX;
    const actionKey = 'screenshot:gesture';

    setRunningElementAction(actionKey);
    setError('');
    try {
      if (shouldSwipe) {
        setSwipeX1(String(startX));
        setSwipeY1(String(startY));
        setSwipeX2(String(endX));
        setSwipeY2(String(endY));
        await api.swipeByCoordinates(appiumUrl, sessionId, startX, startY, endX, endY, customHeaders);
        setSuccess(`Screenshot swipe sent (${startX}, ${startY}) -> (${endX}, ${endY})`);
      } else {
        setCoordX(String(startX));
        setCoordY(String(startY));
        await api.tapByCoordinates(appiumUrl, sessionId, startX, startY, customHeaders);
        setSuccess(`Screenshot tap sent (${startX}, ${startY})`);
      }
    } catch (err) {
      setError(`Screenshot ${shouldSwipe ? 'swipe' : 'tap'} failed: ${err.message}`);
    } finally {
      setRunningElementAction('');
      await refreshLogsAfterWebDriverAction();
    }
    event.preventDefault();
  };

  const handleLiveScreenshotPointerCancel = () => {
    resetLiveScreenshotGesture();
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
      <div className="session-loading-screen min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="session-loading-text text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="session-page min-h-screen bg-gray-900 p-4">
      <div className="session-page-content max-w-7xl mx-auto">
        <SessionHeader
          sessionId={sessionId}
          onDisconnect={onDisconnect}
          error={error}
          warning={warning}
          success={success}
        />
        <CaptureControlsSection
          selectedContext={selectedContext}
          handleContextChange={handleContextChange}
          contexts={contexts}
          handleRefreshContexts={handleRefreshContexts}
          refreshingContexts={refreshingContexts}
          handleSetSelectedContext={handleSetSelectedContext}
          settingContext={settingContext}
          handleGetCurrentContext={handleGetCurrentContext}
          gettingCurrentContext={gettingCurrentContext}
          handleCapture={handleCapture}
          capturing={capturing}
          capturingScreenshot={capturingScreenshot}
          handleCaptureScreenshot={handleCaptureScreenshot}
        />
        <div id="captures-subtabs" className="mt-6 mb-3 border-b border-gray-700">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCapturesSectionTab('captures')}
              className={`px-4 py-2 rounded-t-lg border text-sm font-medium transition-colors cursor-pointer ${
                capturesSectionTab === 'captures'
                  ? 'bg-gray-800 border-gray-600 border-b-gray-800 text-white'
                  : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800/70'
              }`}
            >
              Captures
            </button>
            <button
              type="button"
              onClick={() => setCapturesSectionTab('coordinateActions')}
              className={`px-4 py-2 rounded-t-lg border text-sm font-medium transition-colors cursor-pointer ${
                capturesSectionTab === 'coordinateActions'
                  ? 'bg-gray-800 border-gray-600 border-b-gray-800 text-white'
                  : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800/70'
              }`}
            >
              Coordinate Actions
            </button>
          </div>
        </div>
        {capturesSectionTab === 'captures' && (
          <CapturesPreviewSection
            captures={captures}
            handleDeleteAll={handleDeleteAll}
            setSelectedCapture={setSelectedCapture}
            formatCaptureDateTime={formatCaptureDateTime}
            handlePreview={handlePreview}
            api={api}
            handleRenameCaptureTile={handleRenameCaptureTile}
            handleDeleteCaptureTile={handleDeleteCaptureTile}
            previewCapture={previewCapture}
            setPreviewCapture={setPreviewCapture}
            autoRefreshScreenshot={autoRefreshScreenshot}
            fetchScreenshot={fetchScreenshot}
            setAutoRefreshScreenshot={setAutoRefreshScreenshot}
            parsedScreenshotRefreshSeconds={parsedScreenshotRefreshSeconds}
            screenshotRefreshSecondsInput={screenshotRefreshSecondsInput}
            setScreenshotRefreshSecondsInput={setScreenshotRefreshSecondsInput}
            handleSetScreenshotRefreshInterval={handleSetScreenshotRefreshInterval}
            currentScreenshot={currentScreenshot}
            isLiveScreenshotInteractable={isLiveScreenshotInteractable}
            screenshotLiveImageRef={screenshotLiveImageRef}
            handleLiveScreenshotPointerDown={handleLiveScreenshotPointerDown}
            handleLiveScreenshotPointerMove={handleLiveScreenshotPointerMove}
            handleLiveScreenshotPointerUp={handleLiveScreenshotPointerUp}
            handleLiveScreenshotPointerCancel={handleLiveScreenshotPointerCancel}
            screenshotGestureStart={screenshotGestureStart}
            screenshotGestureCurrent={screenshotGestureCurrent}
            isRunningScreenshotGesture={isRunningScreenshotGesture}
            isScreenshotInteractExpanded={isScreenshotInteractExpanded}
            handleToggleScreenshotInteractExpanded={handleToggleScreenshotInteractExpanded}
            lastScreenshotPressCoordinates={lastScreenshotPressCoordinates}
            showScreenshotSendKeysInput={showScreenshotSendKeysInput}
            setShowScreenshotSendKeysInput={setShowScreenshotSendKeysInput}
            screenshotSendKeysText={screenshotSendKeysText}
            setScreenshotSendKeysText={setScreenshotSendKeysText}
            sendingScreenshotKeys={sendingScreenshotKeys}
            handleSendScreenshotKeys={handleSendScreenshotKeys}
          />
        )}
        {capturesSectionTab === 'coordinateActions' && (
          <div id="coordinate-actions-subtab" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              id="coordinate-actions-panel"
              className={`bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden transition-[height] duration-200 ${
                isScreenshotInteractExpanded ? 'lg:h-[calc(100vh-120px)]' : 'lg:h-[700px]'
              }`}
            >
              <h2 className="text-lg font-semibold text-white mb-2">Coordinate Actions</h2>
              <p className="text-gray-400 text-xs mb-4">
                Run coordinate-based tap/click/swipe actions and send keys to focused element.
              </p>

              <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <div className="p-2 bg-gray-800/60 border border-gray-700 rounded">
                    <p className="text-[11px] text-gray-400 mb-2">Coordinate action</p>
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
            </div>

            <div
              id="screenshot-preview"
              className="session-screenshot-panel relative bg-gray-800 rounded-lg p-6 flex flex-col overflow-hidden transition-[height] duration-200"
              style={{ height: isScreenshotInteractExpanded ? 'calc(100vh - 120px)' : '700px' }}
            >
              <div className="session-screenshot-header-row flex items-start justify-between mb-3">
                <div className="session-screenshot-title-wrap flex items-center gap-2 min-w-0">
                  <h2 className="session-screenshot-title text-lg font-semibold text-white truncate">
                    {previewCapture ? `Preview: ${previewCapture.name}` : 'Screenshot'}
                  </h2>
                  {lastScreenshotPressCoordinates && (
                    <span className="session-screenshot-last-press-badge shrink-0 px-2 py-0.5 rounded border border-cyan-700/70 bg-cyan-900/40 text-cyan-200 text-[11px] font-mono">
                      x:{lastScreenshotPressCoordinates.x} y:{lastScreenshotPressCoordinates.y}
                    </span>
                  )}
                </div>
                <div className="session-screenshot-header-actions w-fit max-w-[380px] ml-auto">
                  {previewCapture ? (
                    <button
                      onClick={() => setPreviewCapture(null)}
                      className="session-screenshot-clear-preview-btn text-gray-400 hover:text-white text-sm cursor-pointer"
                    >
                      Clear
                    </button>
                  ) : (
                    <div className="session-screenshot-controls flex items-center justify-end gap-2">
                      {autoRefreshScreenshot && (
                        <button
                          onClick={handleToggleScreenshotInteractExpanded}
                          className={`session-screenshot-interact-toggle-btn px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer ${
                            isScreenshotInteractExpanded
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                          title={isScreenshotInteractExpanded ? 'Return to compact preview size' : 'Expand screenshot for interaction'}
                        >
                          {isScreenshotInteractExpanded ? 'Compact' : 'Interact'}
                        </button>
                      )}
                      {isScreenshotInteractModeEnabled && (
                        <button
                          onClick={() => setShowScreenshotSendKeysInput((prev) => !prev)}
                          className={`session-screenshot-send-keys-toggle-btn h-8 w-8 rounded transition-colors cursor-pointer inline-flex items-center justify-center ${
                            showScreenshotSendKeysInput
                              ? 'bg-violet-700 text-white border border-violet-500'
                              : 'bg-violet-600 hover:bg-violet-700 text-white'
                          }`}
                          title="Send keys via WebDriver actions"
                          aria-label="Send keys"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 11h1m2 0h1m2 0h1m2 0h1m2 0h1M8 15h8" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!autoRefreshScreenshot) fetchScreenshot();
                          setAutoRefreshScreenshot(!autoRefreshScreenshot);
                        }}
                        className={`session-screenshot-live-toggle-btn px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
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
                      <div className="session-screenshot-interval-control flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1">
                        <input
                          type="number"
                          min="1"
                          value={screenshotRefreshSecondsInput}
                          onChange={(e) => setScreenshotRefreshSecondsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSetScreenshotRefreshInterval();
                          }}
                          className="session-screenshot-interval-input w-16 bg-transparent text-white text-sm focus:outline-none"
                          title="Live refresh interval in seconds"
                        />
                        <span className="text-gray-300 text-xs">sec</span>
                        <button
                          onClick={handleSetScreenshotRefreshInterval}
                          className="session-screenshot-interval-set-btn px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[11px] transition-colors cursor-pointer"
                          title="Apply refresh interval"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!previewCapture && isScreenshotInteractModeEnabled && showScreenshotSendKeysInput && (
                <div className="session-screenshot-send-keys-wrap absolute top-16 right-6 z-30 w-[min(380px,calc(100%-3rem))] pointer-events-none">
                  <div className="session-screenshot-send-keys-panel pointer-events-auto w-full rounded-lg border border-violet-700/40 bg-violet-950/95 p-2 space-y-2 shadow-2xl">
                    <textarea
                      value={screenshotSendKeysText}
                      onChange={(e) => setScreenshotSendKeysText(e.target.value)}
                      rows={3}
                      placeholder="Type text to send to the active element..."
                      className="session-screenshot-send-keys-textarea w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono resize-y"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleSendScreenshotKeys}
                        disabled={sendingScreenshotKeys || screenshotSendKeysText.length === 0}
                        className="session-screenshot-send-keys-submit-btn px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 disabled:text-gray-300 text-white rounded text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                        {sendingScreenshotKeys ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="session-screenshot-canvas-wrap flex-1 flex items-start justify-center bg-gray-900 rounded-lg overflow-y-auto overflow-x-hidden min-h-[420px] p-2">
                {previewCapture ? (
                  <div className="session-screenshot-preview-stage w-full h-full min-h-0 flex items-center justify-center">
                    <img
                      src={api.getScreenshotUrl(previewCapture.name)}
                      alt={`Preview: ${previewCapture.name}`}
                      className="session-screenshot-preview-image max-w-full max-h-full w-auto h-auto rounded"
                    />
                  </div>
                ) : currentScreenshot ? (
                  isLiveScreenshotInteractable ? (
                    <div className="session-screenshot-live-interact-mode w-full">
                      <div className="session-screenshot-live-hint mb-2 text-[11px] text-gray-400">
                        Live gesture mode: tap image to send tap, drag on image to send swipe.
                      </div>
                      <div className="session-screenshot-live-stage relative w-full cursor-crosshair">
                        <img
                          ref={screenshotLiveImageRef}
                          src={`data:image/png;base64,${currentScreenshot}`}
                          alt="Current screenshot"
                          className="session-screenshot-live-image w-full h-auto rounded select-none"
                          onPointerDown={handleLiveScreenshotPointerDown}
                          onPointerMove={handleLiveScreenshotPointerMove}
                          onPointerUp={handleLiveScreenshotPointerUp}
                          onPointerCancel={handleLiveScreenshotPointerCancel}
                          style={{ touchAction: 'none' }}
                          title="Tap to send tap, drag to send swipe"
                        />
                        {screenshotGestureStart && screenshotGestureCurrent && (
                          <div className="session-screenshot-gesture-badge absolute left-2 top-2 pointer-events-none rounded bg-gray-900/80 border border-cyan-500/70 px-2 py-1 text-[11px] text-cyan-200 font-mono">
                            {screenshotGestureStart.x},{screenshotGestureStart.y}{' -> '}{screenshotGestureCurrent.x},{screenshotGestureCurrent.y}
                          </div>
                        )}
                        {isRunningScreenshotGesture && (
                          <div className="session-screenshot-gesture-running-badge absolute right-2 top-2 pointer-events-none rounded bg-gray-900/80 border border-amber-500/70 px-2 py-1 text-[11px] text-amber-200">
                            Sending gesture...
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="session-screenshot-live-preview-stage w-full h-full min-h-0 flex items-center justify-center">
                      <img
                        ref={screenshotLiveImageRef}
                        src={`data:image/png;base64,${currentScreenshot}`}
                        alt="Current screenshot"
                        className="session-screenshot-live-preview-image max-w-full max-h-full w-auto h-auto rounded"
                        title="Enable Live and click Interact for tap/swipe gestures"
                      />
                    </div>
                  )
                ) : (
                  <div className="session-screenshot-empty-state text-gray-500 text-sm text-center p-4">
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
        )}

        {/* Element Finder and Saved Elements */} 
        <div id="elements-sections" className="session-elements-sections grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div id="find-elements-section" className="session-find-elements-section bg-gray-800 rounded-lg p-6 max-h-[900px] overflow-y-auto">
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

          <div id="saved-elements-section" className="session-saved-elements-section bg-gray-800 rounded-lg p-6 max-h-[900px] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-2">Saved Elements</h2>
            <p className="text-gray-400 text-xs mb-4">
              Save named element references, re-check existence, and run tap/click/keys actions.
            </p>

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

        <AdvancedSections
          executeScriptEndpoint={executeScriptEndpoint}
          setExecuteScriptEndpoint={setExecuteScriptEndpoint}
          executeScriptMode={executeScriptMode}
          setExecuteScriptMode={setExecuteScriptMode}
          executeScript={executeScript}
          setExecuteScript={setExecuteScript}
          executeScriptWithArgsJson={executeScriptWithArgsJson}
          setExecuteScriptWithArgsJson={setExecuteScriptWithArgsJson}
          handleExecuteScript={handleExecuteScript}
          executingScript={executingScript}
          canSendExecuteScript={canSendExecuteScript}
          executeScriptStatus={executeScriptStatus}
          isSuccessStatusCode={isSuccessStatusCode}
          executeScriptResult={executeScriptResult}
          REQUEST_HISTORY_LIMIT={REQUEST_HISTORY_LIMIT}
          executedScripts={executedScripts}
          handleExportExecutedScripts={handleExportExecutedScripts}
          setExpandedExecutedScriptId={setExpandedExecutedScriptId}
          expandedExecutedScriptId={expandedExecutedScriptId}
          handleCopyScript={handleCopyScript}
          selectedWebDriverPresetTitle={selectedWebDriverPresetTitle}
          handleSelectWebDriverPreset={handleSelectWebDriverPreset}
          WEBDRIVER_REFERENCE_PRESETS={WEBDRIVER_REFERENCE_PRESETS}
          GENERIC_SESSION_ENDPOINT_PREFIX={GENERIC_SESSION_ENDPOINT_PREFIX}
          genericEndpoint={genericEndpoint}
          setGenericEndpoint={setGenericEndpoint}
          trimLeadingSlashes={trimLeadingSlashes}
          genericMethod={genericMethod}
          setGenericMethod={setGenericMethod}
          genericPayload={genericPayload}
          setGenericPayload={setGenericPayload}
          handleGenericRequest={handleGenericRequest}
          sendingGeneric={sendingGeneric}
          genericStatus={genericStatus}
          genericResult={genericResult}
          executedGenericApis={executedGenericApis}
          handleExportExecutedGenericApis={handleExportExecutedGenericApis}
          setExpandedExecutedGenericId={setExpandedExecutedGenericId}
          expandedExecutedGenericId={expandedExecutedGenericId}
        />
        <ApiLogsSection
          logs={logs}
          loadLogs={loadLogs}
          logsLoading={logsLoading}
          handleClearLogs={handleClearLogs}
          handleDeleteAllLogs={handleDeleteAllLogs}
          expandedLogIndex={expandedLogIndex}
          setExpandedLogIndex={setExpandedLogIndex}
        />

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
