# CLAUDE.md — VillageKeep

Property management + services marketplace (escrow). Brand: **VillageKeep** /
villagekeep.com — configured via env (`BRAND_NAME`), never hardcoded.

## Workflow (founder-mandated)

- Develop and push on a working branch — NEVER push directly to `main_property`.
- To deploy: **merge** the working branch into `main_property` and push the
  merge. Render auto-deploys `main_property`.
- The Render service `propertymanager-1` is a **native Node service** (not
  Docker). It runs `pnpm install && pnpm run build:production`, then the
  dashboard Start Command (`pnpm start` → `scripts/render-start.mjs`:
  schema-scoped `prisma migrate deploy`, then `next start` on `$PORT`).
  The Dockerfile/render.yaml exist for local dev and portability only.

## Database safety (CRITICAL)

The production Postgres instance is **shared with the founder's other
services**. This app operates ONLY inside the `villagekeep_app` schema
(appended to `DATABASE_URL` by `src/lib/env.ts`, `scripts/render-start.mjs`,
`docker-entrypoint.sh`, `prisma/seed.ts`). Never run `migrate reset`,
never `DROP SCHEMA`, never touch `public` or any other schema.
Read-only instance audit: `pnpm db:audit`.

## Conventions

- Money: integer cents; rates in basis points (`src/lib/money.ts`).
- Roles derived from data (Membership/TenantProfile/ProProfile/isSuperAdmin),
  never stored — see `src/lib/authz/roles.ts`.
- Org scoping: handlers/services take orgId from the session via
  `requireOrg()` — never from client input.
- Ledger + status-history tables are append-only; corrections are new rows.
- Route handlers stay thin: zod parse → `src/lib/services/*` → JSON.

## Commands

`pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`
`pnpm db:migrate` (local) · `pnpm db:seed` · `pnpm db:audit` (read-only)
Local infra: `docker compose up -d` (postgres/redis/mailpit).

## Status

Phase 1 of the founding plan. Done: Phase 0 scaffold + Milestone 1.1
(auth/orgs/portals). Next: 1.2 properties & units → 1.3 tenant invites →
1.4 leases/charges → 1.5 maintenance wizard → 1.6 rent via Stripe Connect
(landlords = Connect accounts; escrow = separate charges & transfers) → 1.7
emails/polish. Phase 2 = marketplace. Old codebase: `archive/main-2026-06-09`.
