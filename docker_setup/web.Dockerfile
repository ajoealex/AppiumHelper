FROM node:20-alpine

WORKDIR /app

COPY web/package*.json ./web/
RUN cd web && npm ci

COPY web ./web

ENV NO_GLOBAL_CONF=1
ENV WEB_HOST=0.0.0.0
ENV WEB_PORT=5173

EXPOSE ${WEB_PORT}

CMD ["sh", "-c", "npm --prefix web run build && npm --prefix web run preview -- --host ${WEB_HOST} --port ${WEB_PORT}"]
