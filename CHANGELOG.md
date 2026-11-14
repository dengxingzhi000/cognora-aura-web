# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-11-14

Covers everything merged after `v0.4.0` (`3e563d3`) — 2 non-merge commits.

### Added

- Smart replenishment screen: `/[locale]/inventory/replenishment` with a
  suggestion list (generate, convert) and a detail panel for human review —
  per-row quantity editing, adopt, reject with a mandatory reason, and the
  frozen decision snapshot behind every suggested quantity (`#45`, `#46`).
  The state machine (`editable` / `decidable` / `convertible`) is derived once
  in the mapper so the UI cannot offer an action the backend rejects.
- Inventory module gains 14 `inventory:replenishment:*` permission codes,
  mirroring `033_replenishment_permissions.sql` one-to-one.
- 24 mapper tests pinning the transition matrix and the flag parser; the parser
  ignores unknown flags so a newer backend cannot break an older screen.

### Notes

The UI is wired to `platform-inventory`'s
`/api/v1/inventory/replenishment/**`, which ships in
`cognora-aura-platform`. This release is the frontend half only — the endpoints
must be deployed, and the permission codes seeded (`033` runs from
`scripts/db/seed/seed-all.*`), before the screen returns data.

## [0.4.0] - 2026-11-06

Covers everything merged after `v0.3.0` (`33b9f80`) — 10 non-merge commits. The
`v0.4.0` tag is not created yet — tagging is the release step and is done
separately.

### Added

- Settings self-service is wired to real APIs: typed contracts/services for
  `GET`/`POST /api/auth/sessions`, `PUT /api/system/users/me` and
  `GET`/`PUT /api/system/config`. The security, profile and preferences pages
  fall back to an unavailable state when the backend endpoints are not
  deployed yet (`#23`).
- Inventory and logistics action flows: a reservation board (lookup, confirm
  and release with disabled-reason tooltips), a stock-movement screen and
  before/after previews on the adjust/transfer forms; a waybill detail screen
  with guarded status transitions, a tracking timeline, a freight quote
  breakdown and a reconciliation list. The logistics status enum now matches
  the backend `WaybillStatus` 0-6 (`#24`).
- Finance, brand, audit and tenant module pages completed (`#28`).

### Changed

- CodeQL moved from a checked-in workflow to GitHub's default setup; the
  duplicate `codeql.yml` removed (`9522b48`), and the dev-only minimatch ReDoS
  risk documented (`7a6a12c`, `0e9a745`).
- The READMEs and changelog were aligned with the 0.3.0 state, including the
  `/settings` and `/profile` routes and the settings feature (`#31`).

### Fixed

- Half-mapped audit verbs (`修改` and the remaining Chinese labels) now map to
  their English equivalents instead of falling through (`edbe755`, `#32`).

### Build & CI

- Docker actions pinned to commit SHAs and run on the node24 runtime
  (`36018d7`, `#29`).

## [0.3.0] — 2026-11-05

### Added

- Personal center: `/settings/profile`, `/settings/security` and `/settings/notifications`.
  Profile data comes from `GET /api/auth/userinfo`; account security reuses
  `POST /api/system/users/change-password` and the WebAuthn credential endpoints;
  notification preferences use `sys-user-notification-preference` (`#18`).
- System settings: `/settings/preferences`, split into platform and tenant scope.
  Dictionary summary links to the existing dictionary screen, tenant base settings
  use `tenant:tenant:view` / `tenant:tenant:update`, and tenant-config rows use
  `tenant:config:page` / `create` / `update` (`#19`).

### Documented

- The four backend endpoints still missing for these screens are recorded in
  [docs/BACKEND_GAPS.md](docs/BACKEND_GAPS.md): login sessions, self-scoped
  logout-others, platform `system/config`, and a non-admin self-profile update
  (`#20`).

### Changed

- Removed the concrete private LAN address from the proxy comments and the
  origin/request-id tests. The origin fixtures now use `127.0.0.1`, and the
  request-id test comment no longer carries the broken UTF-8 dash (`#21`).

## [0.2.0] - 2026-11-04

### Added

- First public release of the standalone frontend: the gateway-backed business
  screens, the Next.js proxy chain driven by `API_*_TARGET`, and the standalone
  (`next build` output) plus Docker/tar deployment artefacts.
- Annotated tag `v0.2.0` and GitHub Release
  `v0.2.0 — first public release`, published with the deploy bundle and the
  `ghcr.io/dengxingzhi000/cognora-aura-web:0.2.0` image.
