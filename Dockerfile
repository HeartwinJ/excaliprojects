# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:25-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

# ---------- Runtime stage ----------
FROM node:25-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm install --omit=dev --no-audit --no-fund

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/migrations ./server/migrations
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /data/files && chown -R node:node /data
VOLUME /data/files

USER node

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
