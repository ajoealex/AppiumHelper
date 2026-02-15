FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./api/
RUN cd api && npm ci

COPY api ./api
COPY public ./public
COPY global.conf.js ./global.conf.js

RUN mkdir -p /app/app_data

ENV API_HOST=0.0.0.0
ENV API_PORT=3001

EXPOSE ${API_PORT}

CMD ["npm", "--prefix", "api", "start"]
