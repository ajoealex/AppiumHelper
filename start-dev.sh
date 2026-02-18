#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

echo "Running npm install..."
npm install

echo "Running npm run install:all..."
npm run install:all

echo "Copying .env.example to .env..."
cp .env.example .env

echo "Starting development servers..."
npm run dev
