# Changelog

All notable changes to Excaliprojects are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-04-24

Initial public release.

### Workspace

- Personal, single-user self-hosted Excalidraw organiser.
- **Projects** — create, rename, reorder, soft-delete, tag.
- **Boards** — create, rename, duplicate, move between projects, star as
  favourite, soft-delete.
- **Dashboard** with a hand-drawn hero, project grid, "recent boards" strip,
  backup/restore card, and a `⌘K` / `Ctrl+K` fuzzy search across projects,
  boards, and tags (OS-aware modifier hint).
- **Project view** with dashed-border empty state, filter chips (All /
  Starred), and an inline tag editor.
- **Kebab dropdown menus** on every project and board card (Rename /
  Duplicate / Delete), outside-click and `Escape` to dismiss.

### Editor

- Embedded `@excalidraw/excalidraw` editor with **debounced autosave**
  (configurable via `AUTOSAVE_DEBOUNCE_MS`) and `sendBeacon` on page hide so
  no edit is ever lost.
- **No-op change detection** via `getSceneVersion` — the "Unsaved…" pill
  only appears when elements or files actually changed, not for cursor
  moves or selection toggles.
- **Version history** with auto-snapshots every `AUTOSNAPSHOT_EVERY_N_SAVES`
  saves, capped at `MAX_AUTOSNAPSHOTS_PER_BOARD`, plus user-labelled
  **checkpoints** that never auto-prune. Restore overwrites the current
  scene.
- **Custom main menu**: grouped into *This board* (Export image, Canvas
  background, Reset canvas, Version history, Share link), *Workspace*
  (Dashboard, Libraries, Trash), *Help* (links to the repo's README and
  issue tracker — no excalidraw.com links).
- **Auto-generated thumbnails** that match the current editor theme —
  dark-mode boards get dark-mode thumbnails.
- **Drag-and-drop import** — drop a `.excalidraw` file onto a project to
  mint a new board from it.
- **Embedded image support** — images are extracted to the `files` volume
  and referenced by sha256, surviving restarts.
- **Save indicator** in the editor sub-bar with distinct styling for
  Unsaved / Saving / Saved / Save failed.
- **Tag editor** on every board (and every project), comma or `Enter` to
  commit, `Backspace` to remove the last tag.

### Component library

- Upload `.excalidrawlib` files on the **Libraries** page; they appear in
  the editor immediately.
- **Grouped Components sidebar** inside the editor — each uploaded library
  is its own collapsible group with a preview grid. Theme-matched item
  previews (rendered against the current canvas background) make strokes
  legible in dark mode.
- **Pinnable (docked) sidebar** — toggle persists across sessions in
  localStorage.
- **Click to insert** at viewport centre, or **drag-and-drop** directly
  onto the canvas at the cursor.
- **Component search** filters across library names and item names.
- **Libraries management page** renders real component previews per
  library, not placeholder icons.
- Handles both v1 (`library: [[elements]]`) and v2 (`libraryItems: [...]`)
  `.excalidrawlib` formats.

### Sharing

- **Public read-only share links** — per-board, unguessable token at
  `/s/<token>`, optional expiry, revocable. Rotating via revoke + re-enable
  produces a fresh token and immediately invalidates the old URL.
- **Shared view** opens the board in view-only mode with a minimal top bar,
  no login required.

### Trash

- Soft-delete for both projects and boards. Items stay in **Trash** for 30
  days, clearly labelled with time remaining.
- Background purger removes expired items every 6 hours.
- "Empty now" link to purge the whole trash view on demand.

### Backup & restore

- **Export all** — single JSON file containing projects, boards (scene
  JSON + embedded image bytes), tags, checkpoints, share links, and
  libraries.
- **Restore from JSON** — reconstruct the whole workspace on a fresh
  install (or a brand-new host).

### Theming & design

- Sketch-forward visual language across every screen — Inter + Caveat +
  JetBrains Mono fonts, wobbly SVG-filter borders, lilac accent palette
  (`#a599e9`). Dark is the native palette; light is a full re-map.
- Light / dark / system theme toggle in the top bar with an OS-aware
  "system" icon; preference persists per user to the database.
- Custom sparkle favicon and `theme-color` meta.
- Mobile-first responsive layout from 375px and up.
- Focus-ring glow on sketch-bordered inputs that follows the wrapper's
  rounded shape (no more rectangular outlines poking out of round inputs).
- Tag and filter chips render as flat, properly-shaped pills.

### Security & ops

- **Argon2** password hashing.
- **Signed session cookies** (`HttpOnly` / `Secure` / `SameSite=Lax`).
- **CSRF double-submit cookie** on every state-changing route.
- **Login rate-limiting** (5 attempts per minute per IP).
- Tight **Content-Security-Policy** and other hardening headers via
  `helmet`.
- **Structured logging** with pino; cookies and passwords redacted.
- **Seed user** created from `.env` on first boot — no registration UI.
- **Liveness `/healthz`** and **readiness `/readyz`** endpoints; Docker
  healthcheck wired to `/healthz`.
- Migrations run automatically on every start.

### Distribution

- Single-stack `docker-compose.yml` — one `web` + one `db`, two named
  volumes (`db`, `files`), no reverse proxy bundled.
- Multi-stage `Dockerfile` publishing `ghcr.io/heartwinj/excaliprojects`
  for both `linux/amd64` and `linux/arm64`.
- GitHub Actions CI (lint + typecheck + build) and publish workflow
  (multi-arch image on push to `master` and on `v*` tags).
- Dependabot configured for npm and GitHub Actions.
- Issue / PR templates.

[1.0.0]: https://github.com/HeartwinJ/excaliprojects/releases/tag/v1.0.0
