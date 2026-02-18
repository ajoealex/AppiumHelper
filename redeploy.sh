#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker_setup/docker-compose.yml"

echo "Stopping and removing existing containers/images..."
docker compose --env-file .env -f "$COMPOSE_FILE" down --rmi local --remove-orphans

echo "Deploying updated images..."
docker compose --env-file .env -f "$COMPOSE_FILE" up --build
