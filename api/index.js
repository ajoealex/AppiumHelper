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

// Ensure app_data directory exists
if (!fs.existsSync(APP_DATA_PATH)) {
  fs.mkdirSync(APP_DATA_PATH, { recursive: true });
}

// Store active appium URL per request (passed via header)
const getAppiumUrl = (req) => {
  return req.headers['x-appium-url'] || 'http://127.0.0.1:4723';
};

// Helper to make requests to Appium
async function appiumRequest(appiumUrl, endpoint, method = 'GET') {
  const url = `${appiumUrl}${endpoint}`;
  const response = await fetch(url, { method });
  if (!response.ok) {
    throw new Error(`Appium request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// GET /sessions - List sessions from Appium
app.get('/sessions', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const data = await appiumRequest(appiumUrl, '/sessions');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /session/:id/source - Get page source
app.get('/session/:id/source', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/source`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /session/:id/contexts - Get available contexts
app.get('/session/:id/contexts', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/contexts`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /session/:id/context - Set context
app.post('/session/:id/context', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const { name } = req.body;
    const url = `${appiumUrl}/session/${req.params.id}/context`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!response.ok) {
      throw new Error(`Appium request failed: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /session/:id/screenshot - Get screenshot (base64)
app.get('/session/:id/screenshot', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/screenshot`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /session/:id/element/:eid/screenshot - Get element screenshot
app.get('/session/:id/element/:eid/screenshot', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const data = await appiumRequest(appiumUrl, `/session/${req.params.id}/element/${req.params.eid}/screenshot`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /session/:id/capture - Capture source and screenshot for a context
app.post('/session/:id/capture', async (req, res) => {
  try {
    const appiumUrl = getAppiumUrl(req);
    const { contextName } = req.body;
    const sessionId = req.params.id;

    // Set context first
    const contextUrl = `${appiumUrl}/session/${sessionId}/context`;
    await fetch(contextUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: contextName })
    });

    // Get source
    const sourceData = await appiumRequest(appiumUrl, `/session/${sessionId}/source`);

    // Get screenshot
    const screenshotData = await appiumRequest(appiumUrl, `/session/${sessionId}/screenshot`);

    // Create folder with format: contextName__timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedContext = contextName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folderName = `${sanitizedContext}__${timestamp}`;
    const folderPath = path.join(APP_DATA_PATH, folderName);

    fs.mkdirSync(folderPath, { recursive: true });

    // Save source
    fs.writeFileSync(path.join(folderPath, 'source.xml'), sourceData.value || '');

    // Save screenshot
    const screenshotBase64 = screenshotData.value || '';
    const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');
    fs.writeFileSync(path.join(folderPath, 'screenshot.png'), screenshotBuffer);

    // Save metadata
    const metadata = {
      sessionId,
      contextName,
      capturedAt: new Date().toISOString(),
      folderName
    };
    fs.writeFileSync(path.join(folderPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

    res.json({ success: true, folderName, metadata });
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

const { host, port } = globalConf.api;
app.listen(port, host, () => {
  console.log(`API server running at http://${host}:${port}`);
});
