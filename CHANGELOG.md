# Changelog

All notable changes to Excaliprojects are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Personal, single-user self-hosted Excalidraw organiser.
- Projects and boards with rename / reorder / duplicate / move / delete.
- Embedded `@excalidraw/excalidraw` editor with debounced autosave.
- Auto-generated thumbnails rendered on save.
- Free-form tags, fuzzy search across projects, boards, and tags.
- Version snapshots: auto snapshots every N saves, manual checkpoints, restore.
- Shared libraries: upload `.excalidrawlib` files, use across any board.
- Trash (soft-delete) with 30-day retention and a background purger.
- JSON full-backup export and restore.
- Drag-and-drop `.excalidraw` import onto a project.
- Public read-only share links with optional expiry.
- Light / dark / system theme toggle, persisted per user.
- Mobile-first responsive layout across every screen.
- Security baseline: argon2 password hashing, signed session cookies,
  HttpOnly/Secure/SameSite=Lax, CSRF double-submit, login rate-limiting,
  Content-Security-Policy and other hardening headers.
- Liveness (`/healthz`) and readiness (`/readyz`) endpoints.
