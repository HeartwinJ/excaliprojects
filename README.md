# Excaliprojects

A personal, single-user, self-hosted web app for organising your [Excalidraw](https://excalidraw.com) drawings into projects and boards — built as a lean alternative for solo use. Runs as a single Docker Compose stack on your own server.

> **Excaliprojects is _not_ a replacement for [Excalidraw+](https://plus.excalidraw.com/).**
> If you need team workspaces, real-time multiplayer, comments, AI, PDF/PPTX export, or managed
> hosting/SLAs, please use Excalidraw+ instead. Excaliprojects is scoped to a single user's
> self-hosted workflow.

---

## Features

- **Projects & boards** — organise drawings into named projects; each project holds any number of boards.
- **Embedded Excalidraw editor** — the official `@excalidraw/excalidraw` component, with all of excalidraw.com's free features.
- **Debounced autosave** — every edit is persisted to Postgres with no "save" button to press.
- **Thumbnails** — auto-generated on save so dashboards are scannable.
- **Tags & search** — multi-tag any board; fuzzy search across projects, boards, and tags from the dashboard (⌘/Ctrl + K).
- **Version history** — auto-snapshots every N saves, plus manual labelled "checkpoints" that never auto-prune, plus restore.
- **Shared libraries** — upload `.excalidrawlib` files server-side; library shapes are available in every board.
- **Trash** — soft-delete projects and boards with 30-day retention and a background purger.
- **Import** — drag an `.excalidraw` file onto a project to create a board from it.
- **Full JSON backup & restore** — export everything as a single JSON file; restore onto a fresh install or a new host.
- **Public read-only share links** — per-board, unguessable tokens, optional expiry, revocable at any time.
- **Light & dark themes** — per-user preference, system default, fully supported across every screen.
- **Responsive** — first-class mobile & tablet layout; the editor handles touch via Excalidraw.

### Security baseline (out of the box)

- Argon2 password hashing
- Signed session cookies (`HttpOnly` / `Secure` / `SameSite=Lax`)
- CSRF protection on state-changing routes (double-submit cookie)
- Login rate-limiting (5 attempts / minute / IP)
- Tight `Content-Security-Policy` and other hardening headers via helmet
- Liveness (`/healthz`) and readiness (`/readyz`) endpoints

### Intentionally **not** supported

- Multi-user / teams / permissions
- Real-time collaborative editing
- Comments, AI, PDF / PPTX export
- Voice hangouts, screensharing, presentations

If you need any of those, use [Excalidraw+](https://plus.excalidraw.com/).

---

## Quickstart

### Prerequisites

- Docker & Docker Compose (tested on v2+)
- A reverse proxy of your choice (Caddy / Traefik / nginx / Cloudflare) to terminate TLS — Excaliprojects ships **without** TLS or a reverse proxy in the stack.

### Run

```bash
git clone https://github.com/<you>/excaliprojects.git
cd excaliprojects

cp .env.example .env
# ...edit .env and set real values for SEED_USERNAME, SEED_PASSWORD,
#    SESSION_SECRET (openssl rand -base64 48), POSTGRES_PASSWORD, PUBLIC_APP_URL.

docker compose up -d
```

Then point your reverse proxy at `http://<host>:${APP_PORT}` (default 3000) and open `PUBLIC_APP_URL` in a browser.

### Update to a new image

```bash
docker compose pull
docker compose up -d
```

Migrations run automatically on boot.

---

## Configuration reference

All configuration is via `.env`. See [`.env.example`](.env.example) for the full list with inline comments. Highlights:

| Variable | Purpose |
|---|---|
| `APP_PORT` | Host port the web container binds to. |
| `PUBLIC_APP_URL` | The origin users reach the app from externally. Used to build share-link URLs and decide the cookie `Secure` flag. |
| `SEED_USERNAME` / `SEED_PASSWORD` | Seed user created on first boot. Change both before exposing the app. |
| `SESSION_SECRET` | Long random string signing session cookies. Rotating logs everyone out. |
| `POSTGRES_*` | Database credentials. |
| `FILES_DIR` | Path inside the web container where thumbnails and uploads live (mounted from the `files` volume). |
| `MAX_UPLOAD_MB` | Max JSON body size (covers scene JSON with embedded images). |
| `AUTOSAVE_DEBOUNCE_MS` | Milliseconds of idle before saving to the server. |
| `AUTOSNAPSHOT_EVERY_N_SAVES` | Auto-snapshot frequency (in saves). |
| `MAX_AUTOSNAPSHOTS_PER_BOARD` | Cap on retained auto snapshots per board. |
| `SHARE_LINKS_ENABLED` | Set to `false` to disable public share-link creation entirely. |

---

## Operations

### Volumes

- `db` — Postgres data directory.
- `files` — thumbnails, future uploads, and any on-disk board artefacts.

Both are named Docker volumes, so `docker compose down` keeps your data. They are only wiped by `docker compose down -v`.

### Backups

Two complementary options:

1. **App-level JSON backup** — on the dashboard, click **Export all** to download a full JSON of projects, boards (with scene JSON and embedded images), tags, checkpoints, and libraries. Restore it via the **Restore from JSON…** button in a fresh install. Thumbnails regenerate automatically on next edit.
2. **Volume-level backup** — take a `pg_dump` of the `db` volume and an archive of the `files` volume for a full on-disk backup if you prefer belt-and-braces.

### Reverse proxy

Example Caddyfile snippet:

```
draw.example.com {
  encode zstd gzip
  reverse_proxy localhost:3000
}
```

---

## Development

Requirements: Node.js ≥ 20, Docker.

```bash
npm install
# start Postgres only
docker compose up -d db
# then run server and client in watch mode:
npm run dev
```

Server default: `http://localhost:3000`. Frontend served by Vite in dev mode from the same process. See [CONTRIBUTING.md](CONTRIBUTING.md) for coding conventions and the commit style used in this repo.

---

## Credits

The drawing experience is entirely powered by [`@excalidraw/excalidraw`](https://github.com/excalidraw/excalidraw) (MIT). See [NOTICE](NOTICE) for full third-party attributions.

## License

[MIT](LICENSE).
