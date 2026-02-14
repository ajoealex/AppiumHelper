# Appium Helper

A web-based tool for interacting with Appium sessions, capturing page sources and screenshots.

## Project Structure

```
AppiumHelper/
├── web/                # React frontend (Vite + React + Tailwind CSS)
├── api/                # Node.js API server (Express)
├── app_data/           # Storage for captures
├── global.conf.js      # Server configuration
└── Readme.md
```

## Configuration

Edit `global.conf.js` to configure server ports and interfaces:

```javascript
module.exports = {
  web: {
    host: '127.0.0.1',
    port: 5173
  },
  api: {
    host: '127.0.0.1',
    port: 3001
  }
};
```

## Setup

```bash
# Install all dependencies (root + api + web)
npm install
npm run install:all

# Start both servers
npm run dev
```

### Individual Commands

```bash
npm run dev:api   # Start API server only
npm run dev:web   # Start Web server only
```

## Usage

1. Open the web interface at `http://127.0.0.1:5173`
2. Enter your Appium server URL (e.g., `http://127.0.0.1:4723`)
3. Click "Check Connection" to list available sessions
4. Select a session and click "Connect"
5. On the session page:
   - Select a context from the dropdown
   - Click "Capture Source" to save the page source and screenshot
   - View previous captures in the captures list
   - Click a capture to view its screenshot and rename the folder

## API Endpoints

The API server wraps Appium WebDriver APIs:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sessions` | GET | List sessions from Appium |
| `/session/:id/source` | GET | Get page source |
| `/session/:id/contexts` | GET | Get available contexts |
| `/session/:id/screenshot` | GET | Get screenshot (base64) |
| `/session/:id/element/:eid/screenshot` | GET | Get element screenshot |
| `/session/:id/capture` | POST | Capture source and screenshot |
| `/captures` | GET | List all captures |
| `/captures/:name/screenshot` | GET | Get capture screenshot |
| `/captures/:name/source` | GET | Get capture source XML |
| `/captures/:name/rename` | POST | Rename a capture folder |

All endpoints that proxy to Appium require the `X-Appium-URL` header to specify the Appium server URL.

## Captures

Captures are stored in `app_data/` with the format:
```
<context_name>__<timestamp>/
├── source.xml       # Page source XML
├── screenshot.png   # Screenshot image
└── metadata.json    # Capture metadata
```
