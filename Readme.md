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

This project uses shared environment variables instead of `global.conf.js`.

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
