# Appium Helper

Web UI + API wrapper for interacting with Appium sessions, capturing source and screenshots.
<img width="1611" height="916" alt="1" src="https://github.com/user-attachments/assets/a5dbf54b-f85e-4d4b-987a-295535e5207a" />
<img width="1855" height="2880" alt="app home" src="https://github.com/user-attachments/assets/2d9874c3-b217-4ce4-b29b-1a4ef15e3bf1" />



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
API_HOST=0.0.0.0
API_PORT=3001
WEB_HOST=0.0.0.0
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

Restart after env changes:

```bash
docker compose --env-file .env -f docker_setup/docker-compose.yml down
docker compose --env-file .env -f docker_setup/docker-compose.yml up --build -d
```

Or use npm scripts:

```bash
npm run docker:up
npm run docker:down
npm run docker:remove
```

## Usage

1. Open the web UI at `http://127.0.0.1:5173`.
2. Enter your Appium server URL, for example `http://127.0.0.1:4723`.
3. Click "Check Connection", pick a session, and connect.
4. In Capture Controls, refresh/get contexts, choose one, then capture source/screenshots.
5. Use the Elements section to find, save, and act on elements.
6. Inspect actions in the WebDriver API logs.

## Session Controls Highlights

- Context handling:
  - Context list is fetched only (no automatic switching).
  - `Get Current` fetches current context via WebDriver and updates the selected context.
  - Capture uses the context selected by the user.
- Screenshot preview:
  - `Live` mode supports configurable refetch interval in seconds.
  - Interval is applied with an explicit `Set` button (or Enter key).
- Elements section (between captures preview and advanced tools):
  - Left panel:
    - Find elements on mobile screen (`POST /session/{sessionId}/elements`)
    - Find child elements under parent (`POST /session/{sessionId}/element/{elementId}/elements`)
    - Supports standard WebDriver locators plus mobile-specific Appium locators.
    - Parent field accepts saved element name or raw element id.
    - When find returns a single match, the locator strategy + locator value are captured for saved-element reuse.
  - Right panel:
    - Save elements automatically (single-match find) or manually (name + id).
    - Duplicate element-id saves are prevented; existing tile auto-scrolls into view and blinks.
    - Saved element tile quick actions include:
      - `Exists` (re-check element by id)
      - `Find` (re-find by saved locator strategy/value)
      - `Expand Advanced` (shows advanced actions + fetched values)
    - If `Find` resolves to a different element id, the tile id is updated and a `Refreshed` badge appears.
    - Tile top actions include `Rename`, `Clear`, and `Delete`.
    - Advanced actions include Text, Property/Attribute, CSS, Displayed, Enabled, Rect, Tap, Tap @ Location, Click, and Keys.
    - `Keys` opens a popup with payload mode dropdown:
      - `W3C-preferred (use this by default)` -> `{ "text": "..." }`
      - `Legacy-compatible (use only when you need control)` -> `{ "value": ["..."] }`
    - Coordinate actions are split into two subsections:
      - `oordinate action`: Tap and Click by X/Y
      - `Swipe by coordinate`: swipe from X1/Y1 to X2/Y2, with a `Swap` button to swap start/end pairs
    - `Send Keys To Focused Element` button (below coordinate actions) opens a popup with the same payload mode dropdown and sends focused keys (`POST /session/{sessionId}/keys` on Appium).
- Advanced sections:
  - Execute Script:
    - Executed request history (last 10), expandable tiles, JSON export.
  - Generic WebDriver API:
    - Executed API history (last 10), expandable tiles, JSON export.
- Logs:
  - Element-related WebDriver actions (find, exists, locator-find, tap/click, coordinate tap/click/swipe, keys, and value fetches) trigger log refresh so calls appear immediately.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sessions` | GET | List sessions from Appium |
| `/session/:id/source` | GET | Get page source |
| `/session/:id/contexts` | GET | Get available contexts |
| `/session/:id/context` | POST | Set active context |
| `/session/:id/screenshot` | GET | Get screenshot (base64) |
| `/session/:id/element/:eid/screenshot` | GET | Get element screenshot |
| `/session/:id/execute` | POST | Execute script wrapper |
| `/session/:id/capture` | POST | Capture source and screenshot |
| `/session/:id/generic` | POST | Generic WebDriver API proxy |
| `/logs` | GET | Read recent API logs |
| `/logs` | DELETE | Delete all API logs |
| `/captures` | GET | List all captures |
| `/captures` | DELETE | Delete all captures |
| `/captures/:name/screenshot` | GET | Get capture screenshot |
| `/captures/:name/source` | GET | Get capture source XML |
| `/captures/:name/rename` | POST | Rename a capture folder |
| `/captures/:name` | DELETE | Delete one capture folder |

All endpoints that proxy to Appium require the `X-Appium-URL` header.

Notes:
- The frontend sends WebDriver/Appium calls through `/session/:id/generic`.
- WebDriver commands currently used by the UI (through `/session/:id/generic` unless noted):
  - `GET /session/{sessionId}/context`
  - `POST /session/{sessionId}/elements`
  - `POST /session/{sessionId}/element/{elementId}/elements`
  - `GET /session/{sessionId}/element/{elementId}/rect`
  - `GET /session/{sessionId}/element/{elementId}/text`
  - `GET /session/{sessionId}/element/{elementId}/property/{name}`
  - `GET /session/{sessionId}/element/{elementId}/attribute/{name}`
  - `GET /session/{sessionId}/element/{elementId}/css/{propertyName}`
  - `GET /session/{sessionId}/element/{elementId}/displayed`
  - `GET /session/{sessionId}/element/{elementId}/enabled`
  - `POST /session/{sessionId}/element/{elementId}/click`
  - `POST /session/{sessionId}/element/{elementId}/value`
  - `POST /session/{sessionId}/keys`
  - `POST /session/{sessionId}/actions` (tap, click, swipe)
  - `POST /session/{sessionId}/execute`
  - `POST /session/{sessionId}/execute/sync`

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

### 1. W3C STANDARD ACTIONS API (RECOMMENDED)

#### Endpoint
```
POST /session/{sessionId}/actions
```

#### Characteristics
- W3C compliant
- Vendor-neutral
- Cloud-safe
- Future-proof
- Works identically on Android and iOS

#### Pointer Configuration
```json
"parameters": { "pointerType": "touch" }
```

---

#### Supported Gestures (Android + iOS)

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

#### Example: Tap at Coordinates
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

### 2. APPIUM `mobile:` EXTENSION COMMANDS

#### Endpoint
```
POST /session/{sessionId}/execute
```

#### Characteristics
- Appium-specific
- Not part of W3C WebDriver
- Driver-dependent
- Often restricted on cloud platforms

---

#### 2.1 Android Only (UIAutomator2)

| Command | Gesture |
|------|--------|
mobile: clickGesture | Tap |
mobile: longClickGesture | Long press |
mobile: swipeGesture | Swipe |
mobile: scrollGesture | Scroll |
mobile: flingGesture | Fling |
mobile: dragGesture | Drag |

##### Example
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

#### 2.2 iOS Only (XCUITest)

| Command | Gesture |
|------|--------|
mobile: tap | Tap |
mobile: touchAndHold | Long press |
mobile: swipe | Swipe |
mobile: scroll | Scroll |
mobile: dragFromToForDuration | Drag |
mobile: pinch | Pinch |

---

#### 2.3 Cross-Platform (Limited Reliability)

| Command | Android | iOS | Notes |
|------|--------|-----|------|
mobile: tap | Yes | Yes | Coordinates only |
mobile: swipe | Yes | Yes | Driver-dependent |
mobile: scroll | Yes | Yes | Inconsistent |
mobile: pinchOpen / pinchClose | Partial | Partial | Often blocked |

---

### 3. ELEMENT-BOUND TOUCH (HYBRID)

#### Endpoint
```
POST /session/{sessionId}/actions
```

#### Characteristics
- Uses W3C Actions
- Origin = element
- More stable than coordinate-only gestures

#### Supported
- Android: Yes
- iOS: Yes
- Cloud vendors: Yes

---

### 4. LEGACY / DEPRECATED APIs (DO NOT USE)

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

### 5. COMPATIBILITY MATRIX

| API Family | Android | iOS | Cloud Vendors |
|---------|--------|-----|---------------|
W3C Actions | Yes | Yes | Yes |
mobile: Android | Yes | No | Limited |
mobile: iOS | No | Yes | Limited |
Cross-platform mobile: | Partial | Partial | Limited |
Legacy Touch | No | No | No |

---

### 6. STRATEGIC RECOMMENDATIONS

- Default to W3C Actions
- Use `mobile:` commands only when OS-specific behavior is required

---




# Sending Keys in Mobile Automation (Appium / WebDriver)

This document is a **protocol-level reference** for sending text input (keys) in **mobile automation** using **Appium with WebDriver APIs**.

Scope:
- Android and iOS native apps
- WebView and mobile browsers
- Element-level vs device-level typing
- W3C-standard and Appium-specific APIs

---

## 1. Send Keys to a Specific Element (Recommended)

### WebDriver API
```
POST /session/{sessionId}/element/{elementId}/value
```

### W3C-Preferred Payload (Default)
```json
{
  "text": "hello world"
}
```

### Legacy-Compatible Payload (Optional)
```json
{
  "value": ["h","e","l","l","o"," ","w","o","r","l","d"]
}
```

### Behavior
- Sends text directly to the target element
- Requires the element to be **editable and focused**
- This is the **most portable and reliable approach**

### Supported On
- Android native apps
- iOS native apps
- WebViews
- Mobile browsers

### Common Failures
- Element not editable
- Element not visible
- System-owned UI (alerts, permission dialogs)

---

## 2. Send Keys to the Currently Focused Element (Session-Level)

### WebDriver API
```
POST /session/{sessionId}/keys
```

### Payload
```json
{
  "text": "hello"
}
```

or

```json
{
  "value": ["h","e","l","l","o"]
}
```

In the UI popup, payload mode options are:
- `W3C-preferred (use this by default)` -> sends `text`
- `Legacy-compatible (use only when you need control)` -> sends `value`

### Behavior
- Sends keys to whatever currently has focus
- No element targeting
- Keyboard must already be visible

### Platform Notes
- Android: Works reliably
- iOS: Focus-sensitive, less reliable
- WebView: Depends on context

---

## 3. Android Device-Level Typing (Appium Extensions)

These APIs bypass WebDriver typing and interact directly with the Android OS.

### 3.1 `mobile: type`

```
POST /session/{sessionId}/execute
```

```json
{
  "script": "mobile: type",
  "args": [
    { "text": "hello world" }
  ]
}
```

### 3.2 Shell-Based Typing (Most Reliable on Android)

```json
{
  "script": "mobile: shell",
  "args": [
    {
      "command": "input",
      "args": ["text", "hello%sworld"]
    }
  ]
}
```

Notes:
- `%s` represents space in Android shell input
- Extremely reliable
- Android-only

---

## 4. iOS Device-Level Typing Reality

iOS **does not support true device-level typing**.

What is supported:
- Element-level typing
- Focused-element typing

What is not supported:
- Global key injection
- OS-level text input

This is an **Apple platform restriction**, not an Appium limitation.

---

## 5. Sending Keys via Actions API (Rare, Not Recommended)

### WebDriver API
```
POST /session/{sessionId}/actions
```

### Example
```json
{
  "actions": [
    {
      "type": "key",
      "id": "keyboard",
      "actions": [
        { "type": "keyDown", "value": "a" },
        { "type": "keyUp", "value": "a" }
      ]
    }
  ]
}
```

Notes:
- Designed primarily for desktop browsers
- Mobile support is inconsistent
- Avoid for native apps

---

## 6. Capability Recommendations

### Android
- `unicodeKeyboard: true`
- `resetKeyboard: true`

### iOS
- Ensure element has focus
- Keyboard must be visible
- Secure fields may restrict behavior

---

## 7. Compatibility Matrix

| Method | Android | iOS | Reliability |
|-----|--------|-----|-------------|
| Element `/value` | Yes | Yes | High |
| Session `/keys` | Yes | Partial | Medium |
| `mobile: type` | Yes | No | High |
| Shell `input text` | Yes | No | Very High |
| Actions keys | Partial | Partial | Low |

---

## 8. Strategic Guidance

- Prefer **element-level typing**
- Use session-level keys only when focus is guaranteed
- Use Android device-level typing as a fallback
- Do not expect global typing support on iOS
- Always validate element editability before typing

---

## Final Takeaway

There are **three typing layers** in mobile automation:
1. Element-level (portable, recommended)
2. Session-level (focus-based)
3. Device-level (Android-only)

Choose the API based on **platform, focus, and ownership** of the UI element.

This approach ensures **stability, portability, and cloud compatibility**.


