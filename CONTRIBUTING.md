# Contributing

Thanks for contributing to `cognora-aura-web`.

## Workflow

1. Fork or branch from `main` (`feat/…`, `fix/…`, `chore/…`).
2. `npm ci`
3. `cp .env.example .env.local` and fill in the targets you need.
4. Make the change, add or update tests.
5. Run the full gate locally:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```
6. Open a PR against `main`. PRs are required; force-push and branch deletion
   on `main` are blocked. CI (`ci / quality`) must be green.

## Commit messages

Conventional Commits: `feat(web): …`, `fix(inventory): …`, `docs: …`,
`chore(ci): …`, `deps: …`.

## Code rules

- TypeScript strict; no `any` unless justified in a comment.
- Server state through TanStack Query, UI state through Zustand — never store
  server data in Zustand.
- Charts and AG Grid only through their lazy wrappers (`src/components/charts`,
  `src/components/data-grid`); bare `echarts` / `ag-grid-*` imports fail lint.
- Never hand-edit `src/lib/api/generated/` — regenerate with
  `npm run generate:api`.
- Do not commit `.env.local`, tokens, internal host names or private IPs.

## API contract changes

`openapi/` holds snapshots of the backend documents. When the platform contract
changes, update the snapshots, run `npm run generate:api`, and note the
originating platform commit/tag in the PR description.

## Documentation

Update `README.md` and `.env.example` in the same PR when behaviour, scripts or
environment variables change.
