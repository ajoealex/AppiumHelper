import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const globalConf = (await import('../global.conf.js')).default;

const app = express();
app.use(cors());
app.use(express.json());

const APP_DATA_PATH = path.resolve(__dirname, '../app_data');
const VIEWER_HTML_PATH = path.resolve(__dirname, '../public/viewer.html');

// Ensure app_data directory exists
if (!fs.existsSync(APP_DATA_PATH)) {
  fs.mkdirSync(APP_DATA_PATH, { recursive: true });
}

// Store active appium URL per request
const getAppiumUrl = (req) => {
  if (req.body && typeof req.body.appiumUrl === 'string' && req.body.appiumUrl.trim()) {
    return req.body.appiumUrl;
  }
  return req.headers['x-appium-url'] || 'http://localhost:4723/wd/hub';
};

// Get custom headers from request
const getCustomHeaders = (req) => {
  if (req.body && req.body.customHeaders && typeof req.body.customHeaders === 'object') {
    return req.body.customHeaders;
  }

  try {
    const customHeadersStr = req.headers['x-custom-headers'];
    return customHeadersStr ? JSON.parse(customHeadersStr) : {};
  } catch {
    return {};
  }
};

// Helper to parse URL and extract credentials for Basic Auth
function parseAppiumUrl(appiumUrl, customHeaders = {}) {
  const parsed = new URL(appiumUrl);
  const headers = { ...customHeaders };

  // Extract credentials if present in URL (URL auth takes precedence if no Authorization header set)
  if ((parsed.username || parsed.password) && !headers['Authorization']) {
    const credentials = Buffer.from(`${parsed.username}:${parsed.password}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  // Remove credentials from URL
  parsed.username = '';
  parsed.password = '';

  return {
    baseUrl: parsed.toString().replace(/\/$/, ''),
    headers
  };
}

// Helper to make requests to Appium
async function appiumRequest(appiumUrl, endpoint, method = 'GET', body = null, customHeaders = {}) {
  const { baseUrl, headers } = parseAppiumUrl(appiumUrl, customHeaders);
  const url = `${baseUrl}${endpoint}`;

  const options = {
    method,
    headers: { ...headers }
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Appium request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// GET /sessions - List sessions from Appium
app.get('/sessions', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const customHeaders = getCustomHeaders(req);
    const data = await appiumRequest(appiumUrl, '/sessions', 'GET', null, customHeaders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET /session/:id/source - Get page source
app.get('/session/:id/source', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const customHeaders = getCustomHeaders(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/source`, 'GET', null, customHeaders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /session/:id/contexts - Get available contexts
app.get('/session/:id/contexts', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const customHeaders = getCustomHeaders(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/contexts`, 'GET', null, customHeaders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /session/:id/context - Set context
app.post('/session/:id/context', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const customHeaders = getCustomHeaders(req);
    const { name } = req.body;
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/context`, 'POST', { name }, customHeaders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /session/:id/screenshot - Get screenshot (base64)
app.get('/session/:id/screenshot', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const customHeaders = getCustomHeaders(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/screenshot`, 'GET', null, customHeaders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /session/:id/element/:eid/screenshot - Get element screenshot
app.get('/session/:id/element/:eid/screenshot', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const customHeaders = getCustomHeaders(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/element/${req.params.eid}/screenshot`, 'GET', null, customHeaders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /session/:id/execute - Execute script (for session validation)
app.post('/session/:id/execute', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const customHeaders = getCustomHeaders(req);
    const { script, args } = req.body;
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/execute/sync`, 'POST', { script, args }, customHeaders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /session/:id/capture - Capture source and screenshot for a context
app.post('/session/:id/capture', async (req, res) => {
  const appiumUrl = getAppiumUrl(req);
  const customHeaders = getCustomHeaders(req);
  const { contextName } = req.body;
  const sessionId = req.params.id;

  const errors = [];
  let sourceData = null;
  let screenshotData = null;
  let contextSwitchSuccess = false;

  // Create folder with format: contextName__timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedContext = contextName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const folderName = `${sanitizedContext}__${timestamp}`;
  const folderPath = path.join(APP_DATA_PATH, folderName);

  try {
    fs.mkdirSync(folderPath, { recursive: true });
  } catch (err) {
    return res.status(500).json({ error: `Failed to create folder: ${err.message}` });
  }

  // Set context first
  try {
    const { baseUrl, headers } = parseAppiumUrl(appiumUrl, customHeaders);
    const contextUrl = `${baseUrl}/session/${sessionId}/context`;
    const contextResponse = await fetch(contextUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: contextName })
    });
    if (!contextResponse.ok) {
      const errorBody = await contextResponse.text();
      errors.push({ step: 'context_switch', status: contextResponse.status, message: errorBody });
    } else {
      contextSwitchSuccess = true;
    }
  } catch (err) {
    errors.push({ step: 'context_switch', message: err.message });
  }

  // Get source
  try {
    sourceData = await appiumRequest(appiumUrl, `/session/${sessionId}/source`, 'GET', null, customHeaders);
  } catch (err) {
    errors.push({ step: 'get_source', message: err.message });
  }

  // Get screenshot
  try {
    screenshotData = await appiumRequest(appiumUrl, `/session/${sessionId}/screenshot`, 'GET', null, customHeaders);
  } catch (err) {
    errors.push({ step: 'get_screenshot', message: err.message });
  }

  // Save source if available
  if (sourceData?.value) {
    fs.writeFileSync(path.join(folderPath, 'source.xml'), sourceData.value);
  }

  // Save screenshot if available
  if (screenshotData?.value) {
    const screenshotBuffer = Buffer.from(screenshotData.value, 'base64');
    fs.writeFileSync(path.join(folderPath, 'screenshot.png'), screenshotBuffer);
  }

  // Save metadata with error information
  const hasErrors = errors.length > 0;
  const metadata = {
    sessionId,
    contextName,
    capturedAt: new Date().toISOString(),
    folderName,
    hasErrors,
    errors: hasErrors ? errors : undefined,
    contextSwitchSuccess,
    hasSource: !!sourceData?.value,
    hasScreenshot: !!screenshotData?.value
  };
  fs.writeFileSync(path.join(folderPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // Also save raw errors to a separate file for debugging
  if (hasErrors) {
    fs.writeFileSync(path.join(folderPath, 'errors.json'), JSON.stringify(errors, null, 2));
  }

  // Copy viewer.html to the capture folder
  if (fs.existsSync(VIEWER_HTML_PATH)) {
    fs.copyFileSync(VIEWER_HTML_PATH, path.join(folderPath, 'viewer.html'));
  }

  res.json({
    success: !hasErrors,
    hasErrors,
    folderName,
    metadata,
    errors: hasErrors ? errors : undefined
  });
});

// Serve capture folder files (for viewer)
app.get('/view/:name/:file', (req, res) => {
  try {
    const folderPath = path.join(APP_DATA_PATH, req.params.name);
    const filePath = path.join(folderPath, req.params.file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /captures - List all capture folders
app.get('/captures', (req, res) => {
  try {
    const folders = fs.readdirSync(APP_DATA_PATH)
      .filter(name => {
        const fullPath = path.join(APP_DATA_PATH, name);
        return fs.statSync(fullPath).isDirectory();
      })
      .map(name => {
        const fullPath = path.join(APP_DATA_PATH, name);
        const stats = fs.statSync(fullPath);
        let metadata = {};
        const metadataPath = path.join(fullPath, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        }
        return {
          name,
          createdAt: stats.birthtime,
          metadata
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /captures/:name/screenshot - Get screenshot image
app.get('/captures/:name/screenshot', (req, res) => {
  try {
    const folderPath = path.join(APP_DATA_PATH, req.params.name);
    const screenshotPath = path.join(folderPath, 'screenshot.png');

    if (!fs.existsSync(screenshotPath)) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    res.sendFile(screenshotPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /captures/:name/source - Get source XML
app.get('/captures/:name/source', (req, res) => {
  try {
    const folderPath = path.join(APP_DATA_PATH, req.params.name);
    const sourcePath = path.join(folderPath, 'source.xml');

    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const source = fs.readFileSync(sourcePath, 'utf-8');
    res.type('application/xml').send(source);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /captures/:name/rename - Rename a capture folder
app.post('/captures/:name/rename', (req, res) => {
  try {
    const { newName } = req.body;
    const oldPath = path.join(APP_DATA_PATH, req.params.name);
    const newPath = path.join(APP_DATA_PATH, newName);

    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: 'A folder with this name already exists' });
    }

    fs.renameSync(oldPath, newPath);

    // Update metadata
    const metadataPath = path.join(newPath, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      metadata.folderName = newName;
      metadata.renamedAt = new Date().toISOString();
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    res.json({ success: true, newName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /captures - Delete all capture folders
app.delete('/captures', (req, res) => {
  try {
    const folders = fs.readdirSync(APP_DATA_PATH)
      .filter(name => {
        const fullPath = path.join(APP_DATA_PATH, name);
        return fs.statSync(fullPath).isDirectory();
      });

    for (const folder of folders) {
      fs.rmSync(path.join(APP_DATA_PATH, folder), { recursive: true, force: true });
    }

    res.json({ success: true, deleted: folders.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /captures/:name - Delete a capture folder
app.delete('/captures/:name', (req, res) => {
  try {
    const folderPath = path.join(APP_DATA_PATH, req.params.name);

    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    fs.rmSync(folderPath, { recursive: true, force: true });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { host, port } = globalConf.api;
app.listen(port, host, () => {
  console.log(`API server running at http://${host}:${port}`);
});

