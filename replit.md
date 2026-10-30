# Northstar Support Desk

A support operations workspace for structured issue intake, ticket triage, investigation, ownership, and resolution using synthetic demonstration data.

See [README.md](README.md) for the project overview, screenshots, supported setup, current limits, and [QA case study](docs/QA_CASE_STUDY.md).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (uses the configured `PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/support-desk/src/App.tsx` — queue, intake, and ticket-detail views
- `artifacts/api-server/src/routes/tickets.ts` — ticket and activity routes
- `artifacts/api-server/src/lib/demo-tickets.ts` — synthetic examples
- `lib/db/src/schema/support-tickets.ts` — ticket and activity schema
- `lib/api-spec/openapi.yaml` — API contract; regenerate clients after changes

## Architecture decisions

- Replit supplies shared-origin routing: `/api` reaches the API service and the web app uses relative URLs. The Vite config has no standalone API proxy.
- An empty database is seeded with eight synthetic tickets on the first read; existing records are preserved.
- Owner and author values are editable labels. Authentication and authorization remain future work.

## Product

- Validated intake with environment, expected/actual behavior, reproduction steps, impact, and sanitized evidence
- Search and combined severity, status, product-area, and owner filters
- Ticket status/ownership management, typed activity notes, resolutions, and summary counts

## User preferences

- Keep demonstration content synthetic and evidence accurate.
- Describe completed browser checks separately from planned automated tests.

## Gotchas

- The API requires `DATABASE_URL` and `PORT`; the web app requires its own `PORT` and `BASE_PATH`.
- Configure distinct ports per service, with the shared-origin workspace router in front.
- Schema push targets the configured development database; review the connection before running it.
- A `resolution` activity entry also stores the resolution and sets the ticket status to Resolved.
- No automated test framework or `test` script is currently configured.

## Pointers

- See `pnpm-workspace.yaml` for workspace packages, dependency versions, and platform overrides.
