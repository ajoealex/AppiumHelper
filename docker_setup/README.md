# Docker setup

This setup runs both services:
- Web UI on `${WEB_PORT}`
- API on `${API_PORT}`
- Both containers are attached to the `appium_helper_net` Docker network.

`app_data` is bind-mounted to the host at `../app_data`.
Both services use the same env variable names as local development.
If any required env var is missing, compose startup fails.

## Start

From repo root (so `--env-file .env` uses your shared root `.env`):

```bash
docker compose --env-file .env -f docker_setup/docker-compose.yml up --build
```

## Stop

```bash
docker compose -f docker_setup/docker-compose.yml down
```

## Access

- Web URL: `http://localhost:${WEB_PORT}`
- API: `http://localhost:${API_PORT}`
