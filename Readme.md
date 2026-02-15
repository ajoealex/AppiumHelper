# Appium Helper

Web UI + API wrapper for interacting with Appium sessions, capturing source and screenshots.

## Project Structure

```text
AppiumHelper/
|-- web/                # React frontend (Vite + Tailwind)
|-- api/                # Node.js API (Express)
|-- app_data/           # Capture storage
|-- docker_setup/       # Dockerfiles + docker-compose
|-- .env.example        # Shared env template (local + Docker)
`-- Readme.md
```

## Environment Configuration (dotenv)

This project uses shared environment variables via dotenv.

1. Create `.env` from `.env.example`.
2. Optionally create `.env.local` for machine-specific overrides.
3. `api` and `web` both load root `.env` and `.env.local` via `dotenv`.
4. All vars below are required. Startup fails with a clear error if any are missing.

Supported variables:

```bash
API_HOST=127.0.0.1
API_PORT=3001
WEB_HOST=127.0.0.1
WEB_PORT=5173
```

The frontend API base is always derived as `http://API_HOST:API_PORT`.

## Local Setup

```bash
npm install
npm run install:all
npm run dev
```

Individual commands:

```bash
npm run dev:api
npm run dev:web
```

## Docker Setup

Run Docker from repo root so both services use the same `.env` values:

```bash
docker compose --env-file .env -f docker_setup/docker-compose.yml up --build
```

## Usage

1. Open the web UI at `http://127.0.0.1:5173`.
2. Enter your Appium server URL, for example `http://127.0.0.1:4723`.
3. Click "Check Connection", pick a session, and connect.
4. Capture sources/screenshots and inspect saved captures.

## API Endpoints

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

All endpoints that proxy to Appium require the `X-Appium-URL` header.

## Captures

Captures are stored in `app_data/` with this format:

```text
<context_name>__<timestamp>/
|-- source.xml
|-- screenshot.png
`-- metadata.json
```

## Mobile Touch Gesture APIs Appium WebDriver Reference

This document is a protocol-accurate reference for triggering touch and gesture interactions on Android and iOS devices using Appium over WebDriver.

Scope:
- Mobile app automation only
- Local Appium and cloud vendors (BrowserStack, Sauce Labs, LambdaTest, Perfecto, Digital.ai)
- Grouped by compatibility and standardization

---

## 1. W3C STANDARD ACTIONS API (RECOMMENDED)

### Endpoint
```
POST /session/{sessionId}/actions
```

### Characteristics
- W3C compliant
- Vendor-neutral
- Cloud-safe
- Future-proof
- Works identically on Android and iOS

### Pointer Configuration
```json
"parameters": { "pointerType": "touch" }
```

---

### Supported Gestures (Android + iOS)

| Gesture | Supported | Notes |
|------|-----------|------|
Tap (coordinates) | Yes | pointerDown + pointerUp |
Tap (element) | Yes | origin = element |
Long press | Yes | pause duration |
Swipe | Yes | pointerMove chain |
Scroll | Yes | vertical or horizontal |
Drag & drop | Yes | chained moves |
Multi-touch (pinch/zoom) | Yes | multiple pointers |

---

### Example: Tap at Coordinates
```json
{
  "actions": [
    {
      "type": "pointer",
      "id": "finger1",
      "parameters": { "pointerType": "touch" },
      "actions": [
        { "type": "pointerMove", "duration": 0, "x": 540, "y": 1200 },
        { "type": "pointerDown", "button": 0 },
        { "type": "pointerUp", "button": 0 }
      ]
    }
  ]
}
```

---

## 2. APPIUM `mobile:` EXTENSION COMMANDS

### Endpoint
```
POST /session/{sessionId}/execute
```

### Characteristics
- Appium-specific
- Not part of W3C WebDriver
- Driver-dependent
- Often restricted on cloud platforms

---

### 2.1 Android Only (UIAutomator2)

| Command | Gesture |
|------|--------|
mobile: clickGesture | Tap |
mobile: longClickGesture | Long press |
mobile: swipeGesture | Swipe |
mobile: scrollGesture | Scroll |
mobile: flingGesture | Fling |
mobile: dragGesture | Drag |

#### Example
```json
{
  "script": "mobile: swipeGesture",
  "args": [{
    "startX": 500,
    "startY": 1500,
    "endX": 500,
    "endY": 300,
    "duration": 800
  }]
}
```

---

### 2.2 iOS Only (XCUITest)

| Command | Gesture |
|------|--------|
mobile: tap | Tap |
mobile: touchAndHold | Long press |
mobile: swipe | Swipe |
mobile: scroll | Scroll |
mobile: dragFromToForDuration | Drag |
mobile: pinch | Pinch |

---

### 2.3 Cross-Platform (Limited Reliability)

| Command | Android | iOS | Notes |
|------|--------|-----|------|
mobile: tap | Yes | Yes | Coordinates only |
mobile: swipe | Yes | Yes | Driver-dependent |
mobile: scroll | Yes | Yes | Inconsistent |
mobile: pinchOpen / pinchClose | Partial | Partial | Often blocked |

---

## 3. ELEMENT-BOUND TOUCH (HYBRID)

### Endpoint
```
POST /session/{sessionId}/actions
```

### Characteristics
- Uses W3C Actions
- Origin = element
- More stable than coordinate-only gestures

### Supported
- Android: Yes
- iOS: Yes
- Cloud vendors: Yes

---

## 4. LEGACY / DEPRECATED APIs (DO NOT USE)

| Endpoint | Status |
|------|--------|
/touch/perform | Deprecated |
/touch/multi/perform | Removed |
TouchAction client APIs | Unsupported |

Reasons:
- JSON Wire Protocol
- Disabled on cloud vendors
- Removed from modern Appium drivers

---

## 5. COMPATIBILITY MATRIX

| API Family | Android | iOS | Cloud Vendors |
|---------|--------|-----|---------------|
W3C Actions | Yes | Yes | Yes |
mobile: Android | Yes | No | Limited |
mobile: iOS | No | Yes | Limited |
Cross-platform mobile: | Partial | Partial | Limited |
Legacy Touch | No | No | No |

---

## 6. STRATEGIC RECOMMENDATIONS

- Default to W3C Actions
- Use `mobile:` commands only when OS-specific behavior is required
- Never rely on deprecated touch APIs
- Assume cloud vendors may restrict `mobile:` execution
- For recorders and inspectors, capture gestures as W3C Actions

---

## 7. FINAL TAKEAWAY

If you are building:
- Mobile automation frameworks
- Recorders
- Inspectors
- Debuggers
- Orchestration layers

Your hierarchy must be:

1. W3C Actions API
2. Controlled Appium `mobile:` extensions
3. Zero dependency on legacy touch APIs

This approach guarantees maximum portability, stability, and cloud compatibility.

