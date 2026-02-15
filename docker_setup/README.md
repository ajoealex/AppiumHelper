# Docker setup

This setup runs both services:
- Web UI on `${WEB_PORT:-5173}`
- API on `${API_PORT:-3001}`
- Both containers are attached to the `appium_helper_net` Docker network.

`app_data` is bind-mounted to the host at `../app_data`.

Web service receives API connection settings via environment variables:
- `VITE_API_PROTOCOL`
- `VITE_API_HOST`
- `VITE_API_PORT`

## Start

From `docker_setup`:

```bash
docker compose up --build
```

## Stop

```bash
docker compose down
```

## Access

- Web URL: `http://localhost:${WEB_PORT:-5173}`
- API: `http://localhost:${API_PORT:-3001}`
