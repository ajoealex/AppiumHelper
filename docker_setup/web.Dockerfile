FROM node:20-alpine

WORKDIR /app

COPY web/package*.json ./web/
RUN cd web && npm ci

COPY web ./web

EXPOSE 5173

CMD ["sh", "-c", "npm --prefix web run build && npm --prefix web run preview -- --host ${WEB_HOST} --port ${WEB_PORT}"]
