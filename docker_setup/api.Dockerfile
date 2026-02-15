FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./api/
RUN cd api && npm ci

COPY api ./api
COPY public ./public

RUN mkdir -p /app/app_data

EXPOSE 3001

CMD ["npm", "--prefix", "api", "start"]
