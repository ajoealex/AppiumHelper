import React, { useState, useEffect, useCallback } from 'react';
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
const EXECUTE_SCRIPT_PAYLOAD_EXAMPLE = `{
  "script": "mobile: alert",
  "args": [{ "action": "getButtons" }]
}`;

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

function formatErrorForTextarea(err) {
  if (err?.responsePayload !== undefined) {
    if (typeof err.responsePayload === 'string') {
      return err.responsePayload || err.message;
    }
    return JSON.stringify(err.responsePayload, null, 2);
  }
  return `Error: ${err?.message || 'Unknown error'}`;
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

  // Element finder state
  const [findScope, setFindScope] = useState('screen');
  const [findUsing, setFindUsing] = useState('xpath');
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [findSelector, setFindSelector] = useState('//button');
  const [findParentName, setFindParentName] = useState('');
  const [findingElements, setFindingElements] = useState(false);
  const [lastFindCount, setLastFindCount] = useState(0);
  const [lastFindResponse, setLastFindResponse] = useState('');
  const [pendingElementId, setPendingElementId] = useState('');
  const [pendingElementName, setPendingElementName] = useState('');
  const [savedElements, setSavedElements] = useState([]);
  const [savedElementsLoaded, setSavedElementsLoaded] = useState(false);
  const [manualElementName, setManualElementName] = useState('');
  const [manualElementId, setManualElementId] = useState('');
  const [coordX, setCoordX] = useState('');
  const [coordY, setCoordY] = useState('');
  const [runningElementAction, setRunningElementAction] = useState('');

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
  const [autoRefreshPreferenceLoaded, setAutoRefreshPreferenceLoaded] = useState(false);

  // Generic API state
  const [genericEndpoint, setGenericEndpoint] = useState('');
  const [genericMethod, setGenericMethod] = useState('GET');
  const [genericPayload, setGenericPayload] = useState('');
  const [genericResult, setGenericResult] = useState('');
  const [genericStatus, setGenericStatus] = useState(null);
  const [sendingGeneric, setSendingGeneric] = useState(false);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState(null);

  const parsedScreenshotRefreshSeconds = Math.max(1, Number(screenshotRefreshSeconds) || 10);
  const savedElementNames = savedElements.map((el) => el.name);
  const savedElementsStorageKey = `appium-helper:saved-elements:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const executedScriptsStorageKey = `appium-helper:executed-scripts:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const screenshotLiveStorageKey = `appium-helper:screenshot-live:${encodeURIComponent(appiumUrl)}:${sessionId}`;
  const canSendExecuteScript = executeScriptMode === 'scriptOnly'
    ? Boolean(executeScript.trim())
    : Boolean(executeScriptWithArgsJson.trim());

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

  // Restore executed script history for this Appium URL + session.
  useEffect(() => {
    setExecutedScriptsLoaded(false);
    try {
      const raw = localStorage.getItem(executedScriptsStorageKey);
      if (!raw) {
        setExecutedScripts([]);
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (item) =>
              item &&
              typeof item.id === 'string' &&
              item.id.trim() &&
              typeof item.endpoint === 'string' &&
              item.endpoint.trim() &&
              typeof item.executedAt === 'string' &&
              item.executedAt.trim() &&
              (typeof item.requestText === 'string' || typeof item.script === 'string')
          );
          setExecutedScripts(valid.slice(0, 20));
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
      localStorage.setItem(executedScriptsStorageKey, JSON.stringify(executedScripts.slice(0, 20)));
    } catch {
      // Ignore storage errors.
    }
  }, [executedScripts, executedScriptsLoaded, executedScriptsStorageKey]);

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
              exists: item.exists === false ? false : item.exists === true ? true : null,
              rect: normalizeRect(item.rect)
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

  const handleRename = async (oldName, newName) => {
    try {
      await api.renameCapture(oldName, newName);
      await loadCaptures();
      setSelectedCapture(null);
    } catch (err) {
      setError('Rename failed: ' + err.message);
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

    if (executeScriptMode === 'scriptOnly') {
      const scriptToRun = executeScript.trim();
      if (!scriptToRun) return;
      payload = { script: scriptToRun, args: [] };
      requestText = scriptToRun;
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
      setExecuteScriptResult(JSON.stringify(result, null, 2));
      setExecuteScriptStatus(200);
    } catch (err) {
      setExecuteScriptResult(formatErrorForTextarea(err));
      setExecuteScriptStatus('Error');
    } finally {
      setExecutedScripts((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          requestText,
          endpoint: endpointToRun,
          executedAt: new Date().toISOString()
        },
        ...prev
      ].slice(0, 20));
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

  const handleGenericRequest = async () => {
    if (!genericEndpoint.trim()) return;

    setSendingGeneric(true);
    setGenericResult('');
    setGenericStatus(null);

    try {
      // Prepend /session/{session id}/ to the endpoint
      const fullEndpoint = `/session/{session id}/${genericEndpoint.replace(/^\//, '')}`;
      const result = await api.genericRequest(
        appiumUrl,
        sessionId,
        fullEndpoint,
        genericMethod,
        genericMethod === 'POST' ? genericPayload : null,
        customHeaders
      );
      setGenericResult(JSON.stringify(result, null, 2));
      setGenericStatus(200);
    } catch (err) {
      setGenericResult(formatErrorForTextarea(err));
      setGenericStatus('Error');
    } finally {
      setSendingGeneric(false);
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
        setPendingElementId(ids[0]);
        setSuccess('Found exactly one element. Give it a name to save it.');
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

    if (savedElements.some((el) => el.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Element name already exists. Choose a unique name.');
      return;
    }

    setSavedElements((prev) => [
      ...prev,
      {
        id: pendingElementId,
        name: trimmedName,
        exists: null,
        rect: null
      }
    ]);
    setPendingElementId('');
    setPendingElementName('');
    setSuccess(`Saved element: ${trimmedName}`);
  };

  const handleSaveManualElement = () => {
    const name = manualElementName.trim();
    const id = manualElementId.trim();
    if (!name || !id) return;

    if (savedElements.some((el) => el.name.toLowerCase() === name.toLowerCase())) {
      setError('Element name already exists. Choose a unique name.');
      return;
    }

    if (savedElements.some((el) => el.id === id)) {
      setError('Element id already exists in saved elements.');
      return;
    }

    setSavedElements((prev) => [
      ...prev,
      {
        id,
        name,
        exists: null,
        rect: null
      }
    ]);
    setManualElementName('');
    setManualElementId('');
    setSuccess(`Saved manual element: ${name}`);
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
    }
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
      setSavedElements((prev) => prev.map((el) => (el.id === element.id ? { ...el, exists: true, rect } : el)));
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

  const parseCoordinatePair = () => {
    const x = Number(coordX);
    const y = Number(coordY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Enter valid numeric X and Y coordinates');
    }
    return { x: Math.round(x), y: Math.round(y) };
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
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
            {success}
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
                    className={`w-full p-3 rounded-lg transition-colors ${
                      capture.metadata?.hasErrors
                        ? 'bg-red-900/30 border border-red-700/50'
                        : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedCapture(capture)}
                        className="flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {capture.metadata?.hasErrors && (
                            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                          <span className="text-white font-medium truncate">
                            {capture.name}
                          </span>
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {new Date(capture.createdAt).toLocaleString()}
                          {capture.metadata?.hasErrors && (
                            <span className="text-red-400 ml-2">- Has errors</span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => handlePreview(capture)}
                        className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors shrink-0 cursor-pointer"
                        title="Preview screenshot"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => window.open(api.getViewerUrl(capture.name), '_blank')}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shrink-0 cursor-pointer"
                        title="Open in viewer"
                      >
                        Open
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
                        value={screenshotRefreshSeconds}
                        onChange={(e) => setScreenshotRefreshSeconds(e.target.value)}
                        className="w-16 bg-transparent text-white text-sm focus:outline-none"
                        title="Live refresh interval in seconds"
                      />
                      <span className="text-gray-300 text-xs">sec</span>
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
          <div id="find-elements-section" className="bg-gray-800 rounded-lg p-6 max-h-[700px] overflow-y-auto">
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
                <p className="text-[11px] text-cyan-300 font-medium">FIND CHILD ELEMENT (MULTIPLE)</p>
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
                  onChange={(e) => setFindUsing(e.target.value)}
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
                  placeholder="//button"
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

          <div id="saved-elements-section" className="bg-gray-800 rounded-lg p-6 max-h-[700px] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-2">Saved Elements</h2>
            <p className="text-gray-400 text-xs mb-4">
              Save named element references, re-check existence, and run tap/click actions.
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

            <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Coordinate actions</p>
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

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {savedElements.length === 0 ? (
                <p className="text-gray-400 text-sm">No saved elements yet</p>
              ) : (
                savedElements.map((element) => {
                  const rowMuted = element.exists === false;
                  const isCheckingExists = runningElementAction === `exists:${element.id}`;
                  const isGettingRect = runningElementAction === `rect:${element.id}`;
                  const isTappingAtLocation = runningElementAction === `taploc:${element.id}`;
                  const rect = normalizeRect(element.rect);
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
                  return (
                    <div
                      key={element.id}
                      className={`p-3 rounded-lg border ${
                        rowMuted
                          ? 'bg-gray-900/60 border-gray-700 opacity-60'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{element.name}</p>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-gray-400 text-[11px] font-mono truncate">{element.id}</p>
                          <p className="text-gray-300 text-[11px] font-mono truncate mt-1">
                            {rect
                              ? `Rect x:${Math.round(rect.x)} y:${Math.round(rect.y)} w:${Math.round(rect.width)} h:${Math.round(rect.height)}`
                              : 'Rect: not fetched'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCheckElementExists(element)}
                            disabled={isCheckingExists}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-600 text-white rounded text-[11px] cursor-pointer"
                            title="Check element exists"
                          >
                            Exists
                          </button>
                          <button
                            onClick={() => handleGetElementRect(element)}
                            disabled={isGettingRect}
                            className="px-2 py-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white rounded text-[11px] cursor-pointer"
                            title="Get element rect"
                          >
                            {isGettingRect ? 'Rect...' : 'Rect'}
                          </button>
                          <button
                            onClick={() => handleTapElement(element)}
                            disabled={runningElementAction === `tap:${element.id}`}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-[11px] cursor-pointer"
                            title="Tap element"
                          >
                            Tap
                          </button>
                          <button
                            onClick={() => handleTapAtElementLocation(element)}
                            disabled={isTappingAtLocation}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 text-white rounded text-[11px] cursor-pointer"
                            title="Tap at element location"
                          >
                            {isTappingAtLocation ? 'Tap@Loc...' : 'Tap @Loc'}
                          </button>
                          <button
                            onClick={() => handleClickElement(element)}
                            disabled={runningElementAction === `click:${element.id}`}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded text-[11px] cursor-pointer"
                            title="Click element"
                          >
                            Click
                          </button>
                          <button
                            onClick={() => handleRenameSavedElement(element.id)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] cursor-pointer"
                            title="Rename element"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDeleteSavedElement(element.id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] cursor-pointer"
                            title="Delete element"
                          >
                            Delete
                          </button>
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
                      executeScriptStatus === 200 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
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
                    Executed Scripts (last 20) - {executedScripts.length}
                  </label>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {executedScripts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No scripts executed yet</p>
                  ) : (
                    executedScripts.map((item) => (
                      <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-lg p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-cyan-300 text-[11px] font-mono mb-1">{item.endpoint}</p>
                            <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap break-words">{item.requestText || item.script}</pre>
                            <p className="text-gray-500 text-[10px] mt-1">
                              {new Date(item.executedAt).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyScript(item.requestText || item.script || '')}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-[11px] shrink-0 cursor-pointer"
                            title="Copy request"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Generic API Section */}
          <div id="generic-api-section" className="bg-gray-800 rounded-lg p-6 max-h-175 overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Generic WebDriver API</h2>
            <p className="text-gray-400 text-xs mb-3">Send any WebDriver command</p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Endpoint
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-2 bg-gray-600 border border-r-0 border-gray-600 rounded-l-lg text-gray-400 font-mono text-sm">
                    /session/{'{session id}'}/
                  </span>
                  <input
                    type="text"
                    value={genericEndpoint}
                    onChange={(e) => setGenericEndpoint(e.target.value)}
                    placeholder="url"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
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
                      genericStatus === 200 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
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

        {/* Strategy Reference Modal */}
        {showStrategyModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[80vh] overflow-hidden">
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
