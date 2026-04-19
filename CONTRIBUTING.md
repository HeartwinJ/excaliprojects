# Contributing to Excaliprojects

Thanks for your interest! Excaliprojects is maintained as a single-author project for self-hosted personal use — external contributions are welcome, but please open an issue first to discuss anything non-trivial so we can align on scope before you put time in.

## Running locally

```bash
# Prerequisites: Node.js ≥ 20, Docker
npm install
docker compose up -d db    # just the database
npm run dev                # runs both server (tsx watch) and client (vite)
```

The server reads configuration from `.env` at the repo root. Copy `.env.example` → `.env` first and pick safe local values.

To run the full containerised stack instead (what production uses):

```bash
docker compose up -d --build
```

## Repo layout

- [`server/`](server) — Node + TypeScript + Express, Postgres via `pg` and `node-pg-migrate`.
- [`client/`](client) — React + Vite + TypeScript.
- [`server/migrations/`](server/migrations) — SQL migrations run automatically on boot.
- [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) — the deployable unit.
- [`.github/workflows/`](.github/workflows) — CI + GHCR publish pipelines.

## Commit style

- Work on `master` only. No long-lived feature branches.
- **One author only.** No `Co-Authored-By` trailers.
- **One-line commit messages**, imperative mood (e.g. `add tag editor to board toolbar`).
- **Small, meaningful commits.** One logical change per commit — prefer splitting large changes into several commits rather than bundling.

## Pull requests

- Keep each PR focused on a single concern.
- Run `npm run typecheck` and `npm run build` locally before opening a PR.
- Update `CHANGELOG.md` under `[Unreleased]` for anything user-visible.

## Releasing

Tag a commit on `master` with `vX.Y.Z` (semver). The `publish` workflow will build a multi-arch image and push to `ghcr.io/<owner>/excaliprojects` with `latest`, `vX.Y.Z`, `vX.Y`, and `vX` tags.
