# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  logout-others, platform `system/config`, and a non-admin self-profile update.

## [0.2.0] - 2026-11-04

### Added

- First public release of the standalone frontend: the gateway-backed business
  screens, the Next.js proxy chain driven by `API_*_TARGET`, and the standalone
  (`next build` output) plus Docker/tar deployment artefacts.
- Annotated tag `v0.2.0` and GitHub Release
  `v0.2.0 — first public release`, published with the deploy bundle and the
  `ghcr.io/dengxingzhi000/cognora-aura-web:0.2.0` image.
