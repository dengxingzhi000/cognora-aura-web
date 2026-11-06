<div align="center">

# Cognora Aura Web

### The control tower for a cloud-native supply chain.

**One Next.js 16 application. Twenty-plus backend domains. Real APIs, no mock screens.**

[![CI](https://img.shields.io/github/actions/workflow/status/dengxingzhi000/cognora-aura-web/ci.yml?branch=main&style=flat-square&logo=github&label=ci)](https://github.com/dengxingzhi000/cognora-aura-web/actions/workflows/ci.yml)
[![Issues](https://img.shields.io/github/issues/dengxingzhi000/cognora-aura-web?color=ff80eb&labelColor=black&style=flat-square&logo=github)](https://github.com/dengxingzhi000/cognora-aura-web/issues)
[![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white&style=flat-square)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](./LICENSE)

[Quick start](#quick-start) · [Highlights](#highlights) · [Tech stack](#tech-stack) · [Architecture](#architecture) · [What it covers](#what-it-covers) · [Modules](#modules) · [Patterns](#key-architecture-patterns) · [Deploy](#deployment) · [Operations](#operations) · [FAQ](#faq) · [Docs](#documentation)

<code>npm ci && cp .env.example .env.local && npm run dev</code>

</div>

> [!IMPORTANT]
> **This repository is the frontend only.** Backend services live in
> [cognora-aura-platform](https://github.com/dengxingzhi000/cognora-aura-platform).
> Nothing here starts a JVM, a database or Nacos: the app talks HTTP to a
> running gateway, and every screen is wired to a real endpoint.

---

The backend owns inventory, orders, suppliers, warehouses, carriers and money.
The frontend's job is to make that legible: one navigation model, one design
language, one place where tenant context and permissions are carried, and zero
screens that invent data of their own.

`cognora-aura-web` is the Next.js 16 (App Router) control tower for that
platform. It ships a standalone build, its own Docker image and its own CI, and
consumes the backend's OpenAPI documents as vendored snapshots so client
generation works offline.

## Quick start

> [!NOTE]
> **The backend is optional for the UI shell.** Without a gateway the pages
> still render, but API calls return errors. Start the platform first if you
> need real data.

### Prerequisites

| Requirement | Version |
| ----------- | ------- |
| Node.js | 22+ |
| npm | 11+ |
| Backend (optional) | `cognora-aura-platform` gateway on `:8761` |

### 1. Install

```bash
npm ci
```

### 2. Configure

```bash
cp .env.example .env.local
# point API_*_TARGET at your gateway or the individual services
```

### 3. Run

```bash
npm run dev      # http://localhost:3000
```

### 4. Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### Access endpoints

| Route | Purpose |
| ----- | ------- |
| `/{locale}/login` | Sign-in (the only public route) |
| `/{locale}/dashboard` | Aggregated order/inventory KPI view |
| `/{locale}/product` · `inventory` · `order` | Core supply-chain screens |
| `/{locale}/warehouse` · `purchase` · `supplier` | Operations screens |
| `/{locale}/finance` · `logistics` · `notification` | Finance, carrier and message center |
| `/{locale}/system` · `tenant` · `approval` · `audit` · `document` · `file` | Platform administration |
| `/{locale}/settings` · `profile` · `preferences` · `notifications` · `security` | Account settings: self-service profile, security, preference and notification screens (the profile screen lives at `/{locale}/settings/profile`) |
| `/{locale}/ecommerce/*` | Coupons, flash sales, members, payments, refunds, reviews |
| `/{locale}/shop` | Storefront: catalog, cart, checkout, member orders |

`{locale}` is `zh-CN` or `en-US`; unauthenticated users are redirected to
`/login`.

### Environment variables

Everything defaults to a local-development value so `npm run dev` works out of
the box. Never commit `.env.local`.

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `NEXT_PUBLIC_API_BASE_URL` | empty | Empty keeps requests on the Next origin; set it to the gateway (`http://localhost:8761`) to bypass rewrites |
| `NEXT_PUBLIC_DEFAULT_TENANT_ID` | empty | Tenant UUID sent as `X-Tenant-Id`; empty means no tenant is attached until one is selected |
| `NEXT_PUBLIC_DEFAULT_TENANT_CODE` | `default` | Tenant code shown in the UI |
| `NEXT_PUBLIC_DEFAULT_TENANT_NAME` | empty | Tenant display name |

**Platform services** (rewrite targets, baked into the build):

| Variable | Default | Variable | Default |
| -------- | ------- | -------- | ------- |
| `API_AUTH_TARGET` | `http://localhost:8106` | `API_SYSTEM_TARGET` | `http://localhost:8081` |
| `API_PRODUCT_TARGET` | `http://localhost:8201` | `API_INVENTORY_TARGET` | `http://localhost:8202` |
| `API_ORDER_TARGET` | `http://localhost:8203` | `API_WAREHOUSE_TARGET` | `http://localhost:8204` |
| `API_LOGISTICS_TARGET` | `http://localhost:8205` | `API_SUPPLIER_TARGET` | `http://localhost:8206` |
| `API_PURCHASE_TARGET` | `http://localhost:8207` | `API_FINANCE_TARGET` | `http://localhost:8208` |
| `API_APPROVAL_TARGET` | `http://localhost:8209` | `API_AUDIT_TARGET` | `http://localhost:8210` |
| `API_NOTIFY_TARGET` | `http://localhost:8211` | `API_TENANT_TARGET` | `http://localhost:8212` |
| `API_DOCUMENT_TARGET` | `http://localhost:8213` | `API_FILE_TARGET` | `http://localhost:8214` |

**E-commerce layer**:

| Variable | Default | Variable | Default |
| -------- | ------- | -------- | ------- |
| `API_MALL_TARGET` | `http://localhost:8301` | `API_MEMBER_TARGET` | `http://localhost:8302` |
| `API_PROMOTION_TARGET` | `http://localhost:8303` | `API_PAYMENT_TARGET` | `http://localhost:8304` |
| `API_ORDER_CENTER_TARGET` | `http://localhost:8305` | `API_FULFILLMENT_TARGET` | `http://localhost:8306` |
| `API_SEARCH_TARGET` | `http://localhost:8307` | `API_ANALYTICS_TARGET` | `http://localhost:8308` |

> [!WARNING]
> **These targets are compiled into the standalone bundle.** `next.config.ts`
> turns them into rewrite rules at build time, so changing hosts requires a
> rebuild, not a container restart.

## Highlights

| Icon | Feature | Description |
| ---- | ------- | ----------- |
| 🧭 | **One control tower** | Product, inventory, order, warehouse, purchase, finance, logistics, supplier and e-commerce screens in one app |
| 🔌 | **Real APIs only** | No in-file mock arrays; every screen maps backend DTOs in `src/features/<domain>/lib/mappers.ts` |
| 🏢 | **Tenant aware** | `X-Tenant-Id` is carried on every request; missing tenant context fails closed on the backend |
| 🎨 | **One design language** | Tailwind CSS v4 + shadcn/ui, tokens in `src/lib/design-tokens.css` |
| ⚡ | **Server state, not props** | TanStack Query v5 for data, Zustand only for UI state |
| 🧾 | **Generated clients** | `openapi/` snapshots + `npm run generate:api`, offline by design |
| 📦 | **Standalone output** | One Docker image or a tar bundle with `server.js`, `.next` and `public` |
| 🌍 | **Bilingual** | `next-intl` with `/zh-CN` and `/en-US` locale prefixes |

## Tech stack

| Layer | Components |
| ----- | ---------- |
| **Framework** | Next.js 16.4 (App Router, Turbopack, `output: "standalone"`), React 19 |
| **Language** | TypeScript 7 (`@typescript/native` typecheck; TS 6 for ESLint) |
| **Styling** | Tailwind CSS v4 (CSS-first), shadcn/ui vendored in `src/components/ui` |
| **Server state** | TanStack Query v5 |
| **Client state** | Zustand 5 (UI state only) |
| **Forms** | React Hook Form + Zod |
| **Tables** | TanStack Table (default), AG Grid behind lazy `DataGrid` |
| **Charts** | Recharts (KPI), ECharts (complex), G6 (topology), all lazy-loaded |
| **i18n** | next-intl, locale-prefixed routes |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **DevOps** | GitHub Actions, Docker, GHCR, CodeQL, Dependabot |

## Architecture

```
   ┌────────────────────────────────┐
   │  Browser                       │
   │  http://<host>:3000            │
   └───────────────┬────────────────┘
                   │  cookies (access_token) + X-Tenant-Id
   ┌───────────────▼────────────────┐
   │  cognora-aura-web (Next.js 16) │
   │  proxy.ts  → locale + auth     │
   │  next.config.ts rewrites:      │
   │    /auth/**          → :8106   │
   │    /system/api/**    → :8081   │
   │    /scm-order/**     → :8203   │
   └───────────────┬────────────────┘
                   │  HTTP
   ┌───────────────▼────────────────┐
   │  platform-gateway :8761        │
   │  (Nacos discovery locator)     │
   └───────────────┬────────────────┘
                   │
   ┌───────────────▼────────────────┐
   │  Supply-chain core + e-commerce│
   │  auth · system · product ·     │
   │  inventory · order · warehouse │
   │  · purchase · finance · mall ·  │
   │  member · payment · analytics  │
   └────────────────────────────────┘
```

The browser never talks to a service directly. `NEXT_PUBLIC_API_BASE_URL`
decides whether requests stay on the Next origin (and are rewritten per
`API_*_TARGET`) or go to the gateway. Locally the rewrite targets are the
individual services; in production they point at the gateway, which is the only
entry point that knows where each service lives.

## What it covers

| Area | What the frontend does | Where |
| ---- | ---------------------- | ----- |
| Dashboard | Aggregates the order dashboard summary, inventory stats and low-stock rows | `src/features/dashboard` |
| Orders | List with status/time filters mirrored in the URL, detail and lifecycle | `src/features/order` |
| Inventory | Stock, alerts, snapshots and reservations | `src/features/inventory` |
| Products | SPU/SKU catalog and brand maintenance | `src/features/product` |
| Warehouse & purchase | Inbound/outbound, purchase orders and receipts | `src/features/warehouse`, `src/features/purchase` |
| Finance | Settlements, invoices and reconciliation workbench | `src/features/finance` |
| Logistics & supplier | Waybills, tracking, supplier scorecards | `src/features/logistics`, `src/features/supplier` |
| Platform admin | Users, roles, departments, tenants, approvals, audit, documents | `src/features/system`, `audit`, `document` |
| E-commerce | Coupons, flash sales, group buys, members, payments, refunds, reviews, sellers | `src/features/ecommerce` |
| Settings | Self-service profile, account security, notification preferences and platform/tenant preferences | `src/features/settings` |
| Storefront | Catalog, cart, checkout and member orders | `src/features/shop` |
| Analytics | E-commerce dashboards over the analytics service | `src/features/analytics` |

## Modules

| Path | Responsibility |
| ---- | -------------- |
| `src/app/` | Routes; `[locale]/(app)/…` holds the authenticated pages |
| `src/components/` | `ui` (shadcn), `charts`, `data-grid` — the only place heavy chart/table libraries may be imported |
| `src/features/` | One folder per domain: hooks, mappers, presentational pieces |
| `src/lib/` | API client, contracts, services, generated clients, design tokens |
| `scripts/` | `fetch-openapi.mjs`, `build-deploy.sh` |
| `openapi/` | Backend contract snapshots consumed by `generate:api` |
| `public/` | Static assets copied into the standalone bundle |

### Project structure

```text
.
├── src/
│   ├── app/[locale]/(app)/     # dashboard, product, inventory, order, …
│   ├── components/             # ui/, charts/, data-grid/, layout/
│   ├── features/<domain>/      # hooks, lib/mappers.ts, components
│   └── lib/
│       ├── api/                # client.ts, contracts/, services/, generated/
│       ├── http/               # origin handling for the standalone build
│       └── design-tokens.css
├── scripts/
│   ├── fetch-openapi.mjs       # refresh openapi/ from a running backend
│   └── build-deploy.sh         # standalone assemble + tar
├── openapi/                    # 16 document snapshots
├── public/
├── Dockerfile
├── next.config.ts
└── openapitools.json
```

## Key architecture patterns

### Rewrites instead of CORS

Development and the standalone build both use `next.config.ts` rewrites: the
browser calls `/auth/**`, `/system/api/**`, `/common/**` or `/scm-<domain>/**`
on the same origin, and Next forwards to the matching `API_*_TARGET`. That
keeps cookies first-party and removes CORS from the picture. Setting
`NEXT_PUBLIC_API_BASE_URL` switches the axios client to the gateway directly.

### Tenant context on every call

The platform rejects requests without tenant context. The API client attaches
`X-Tenant-Id` (and the access token cookie) to every call; `NEXT_PUBLIC_DEFAULT_TENANT_ID`
supplies the local default.

### Generated clients from vendored contracts

`openapi/` holds snapshots of the backend documents and `openapitools.json`'s
five generators read them in place, so `npm run generate:api` is fully offline.
`src/lib/api/generated/` is generator-owned: never hand-edit it, and CodeQL ignores it.

### Server state vs UI state

TanStack Query owns everything that came from an API; Zustand only holds
sidebar, theme and filter context. A screen never copies API data into a store.

### Standalone output

`next build` produces `.next/standalone` with a bundled `server.js`. The image
and the tar bundle both copy that plus `.next/static` and `public`; the result
runs with `node server.js` and no `node_modules` install on the target host.

## Deployment

The production artifact is the standalone build, delivered either as an image
or as a directory bundle.

### Container image

```bash
docker build -t ghcr.io/dengxingzhi000/cognora-aura-web:0.3.0 \
  --build-arg API_AUTH_TARGET=http://<host>:8106 \
  --build-arg API_SYSTEM_TARGET=http://<host>:8081 .

docker run -d --name cognora-aura-web -p 3000:3000 \
  ghcr.io/dengxingzhi000/cognora-aura-web:0.3.0
```

`docker.yml` builds and pushes the same image to GHCR on every push to `main`
and on `v*` tags.

### Tar bundle

```bash
./scripts/build-deploy.sh
# dist/cognora-aura-web/      server.js, .next/ (incl. static), public/, node_modules
# dist/cognora-aura-web.tar.gz
```

### Rollback

Keep the previous bundle directory (or image tag) on the host. Point the
container at the old bundle/tag, restart, then verify `/zh-CN/login` returns
200 and `/zh-CN/dashboard` redirects unauthenticated users. Reverting the
deployment never requires a database change — the frontend is stateless.

## Operations

### Build and verification

```bash
npm run typecheck       # TypeScript 7
npm run lint            # ESLint flat config
npm test                # Vitest unit tests
npm run test:e2e        # Playwright (starts the dev server)
npm run build           # production build
npm run generate:api    # regenerate clients from openapi/
```

### CI

`ci.yml` runs `npm ci → typecheck → lint → test → build` on every PR and on
`main`. CodeQL runs through GitHub's **default setup**, enabled in the
repository settings (JavaScript/TypeScript and Actions); there is no checked-in
`codeql.yml` workflow. `.github/codeql/codeql-config.yml` only keeps the
generated client out of the scan.

### Dependency updates

Dependabot checks npm, GitHub Actions and Docker base images every Monday; PRs
carry the `dependencies` label and a `deps`/`ci` commit prefix.

## FAQ

<details>
<summary><strong>Why is the backend URL baked into the build?</strong></summary>

`next.config.ts` turns `API_*_TARGET` into rewrite rules, and rewrites are part
of the build output. Change the host and you must rebuild (or pass different
`--build-arg` values); restarting the container alone keeps the old targets.

</details>

<details>
<summary><strong>Why a full-page redirect to <code>/login</code>?</strong></summary>

`src/proxy.ts` (Next 16's renamed middleware) checks the `access_token` cookie
for every request that is not under `/login` and redirects unauthenticated
users. The backend then re-validates the token and tenant on every call, so the
redirect is convenience, not the security boundary.

</details>

<details>
<summary><strong>Can I edit <code>src/lib/api/generated/</code>?</strong></summary>

No. It is openapi-generator output. Fix the contract snapshot under `openapi/`
(or refresh it with `npm run fetch:api`), then run `npm run generate:api`.

</details>

<details>
<summary><strong>Why do some screens show an error instead of data?</strong></summary>

The frontend is fail-closed: if the gateway, `scm-system` (permission lookups)
or the owning service is down, the API client surfaces the error rather than
fabricating a payload. Start the platform in order — gateway → auth → system →
business services — then retry.

</details>

<details>
<summary><strong>Port 3000 is already taken — is that Grafana?</strong></summary>

The platform's `docker-compose.yml` maps Grafana to `3000:3000`, the same host
port the dev server wants. Run one of them elsewhere (`PORT=3001 npm run dev`,
or remap Grafana) instead of both at once.

</details>

## Documentation

- [SECURITY.md](./SECURITY.md) — vulnerability reporting and security features
- [CONTRIBUTING.md](./CONTRIBUTING.md) — branch, commit and review conventions
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — community expectations
- [.env.example](./.env.example) — every variable `next.config.ts` reads
- [openapi/](./openapi) — vendored backend contract snapshots
- [scripts/](./scripts) — snapshot refresh and bundle assembly

Backend architecture, service ports and database design live in
[cognora-aura-platform](https://github.com/dengxingzhi000/cognora-aura-platform).

## Star history

<a href="https://www.star-history.com/?repos=dengxingzhi000%2Fcognora-aura-web&amp;type=date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=dengxingzhi000/cognora-aura-web&amp;type=date&amp;theme=dark&amp;legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=dengxingzhi000/cognora-aura-web&amp;type=date" />
    <img alt="Cognora Aura Web GitHub star history" src="https://api.star-history.com/chart?repos=dengxingzhi000/cognora-aura-web&amp;type=date" />
  </picture>
</a>

## Related projects

- **[cognora-aura-platform](https://github.com/dengxingzhi000/cognora-aura-platform)** — the 26-service backend this frontend consumes: gateway, auth, system, supply-chain core and the e-commerce layer.
- **[cognora-enterprise-agent](https://github.com/dengxingzhi000/cognora-enterprise-agent)** — Python AI operations agent built on the same platform.

## Contributing

We'd love your help! [Open an issue](https://github.com/dengxingzhi000/cognora-aura-web/issues)
to report a bug or suggest a feature, or send a pull request.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first — it covers the local
gate, commit conventions and what CI checks.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

Everyone is expected to follow the [code of conduct](./CODE_OF_CONDUCT.md).

## License

[Apache License 2.0](./LICENSE)

---

<div align="center">

**Built with ❤️ for enterprise supply chain management**

</div>
