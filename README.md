# Excaliprojects

A personal, single-user, self-hosted web app for organising [Excalidraw](https://excalidraw.com) drawings into projects and boards.

> **Excaliprojects is not a replacement for [Excalidraw+](https://plus.excalidraw.com/).** If you need teams, real-time collaboration, comments, AI, PDF/PPTX export, or managed hosting, please use Excalidraw+.

Ships as a single Docker Compose stack (Node + React + Postgres) that you run on your own server. TLS is expected to be terminated upstream by your existing edge (Caddy / Traefik / nginx / Cloudflare).

## Quickstart (work in progress)

```bash
cp .env.example .env   # then edit .env and fill in real values
docker compose up -d
curl http://localhost:${APP_PORT:-3000}/health
```

The final README — full quickstart, configuration reference, screenshots, backup/restore — will be written in the final phase of the build. Until then, this project is a work-in-progress.
