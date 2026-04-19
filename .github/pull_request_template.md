## Summary

<!-- What does this PR change, and why? -->

## Scope

- [ ] Fits a single-user self-hosted workflow (Excaliprojects is not a team/AI/PDF-export product)
- [ ] Follows repo commit conventions: master branch, single author, one-line imperative messages, small commits

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manually verified the affected UI at mobile width and in both light + dark themes (for UI changes)
- [ ] Migrations run cleanly on a fresh `docker compose down -v && up -d` (for DB changes)

## Changelog

<!-- Add an entry to CHANGELOG.md under `[Unreleased]` for any user-visible change. -->
