# VillageKeep

**Property management & trusted local pros** - villagekeep.com

Landlords manage properties and collect rent. Tenants report problems through a
guided wizard. Verified local pros bid on the work, the platform escrows the
payment, and funds release when the job is done.

> The previous codebase is preserved at
> [`archive/main-2026-06-09`](https://github.com/americansalb/propertymanager/tree/archive/main-2026-06-09).

## Status

- ✅ Phase 0 - scaffold, schema, deploy skeleton (this)
- ⬜ Phase 1 - PM core (auth, properties, tenants, leases, maintenance, rent via Stripe)
- ⬜ Phase 2 - marketplace (pros, verification, bidding, escrow, reviews)
- ⬜ Phase 3 - AI layer + growth

## Stack

Next.js (App Router, TypeScript) · Tailwind v4 · Prisma + PostgreSQL · Stripe
Connect · Resend · Docker on Render.

## Database safety

The production Postgres instance is **shared with other services**. This app
operates exclusively inside its own schema (`villagekeep_app`), appended to
`DATABASE_URL` automatically (`src/lib/env.ts`, `docker-entrypoint.sh`). It
never reads or writes `public` or any other schema. Verify anytime with the
read-only audit:

```bash
DATABASE_URL=... pnpm db:audit
```

## Local development

```bash
docker compose up -d          # postgres + redis + mailpit
cp .env.example .env          # fill in as needed
pnpm install
pnpm db:generate
pnpm db:migrate               # creates villagekeep_app schema locally
pnpm db:seed                  # super admin + service catalog (+ SEED_DEMO=true for demo data)
pnpm dev
```

Checks: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`

## Deployment

Pushes to `main_property` auto-deploy the Docker image to the Render service
`propertymanager-1` (health check: `GET /api/v1/health`). The container
entrypoint runs `prisma migrate deploy` scoped to the app schema, then starts
the server. `render.yaml` keeps the pre-existing shared database/redis blocks
verbatim so Blueprint syncs never flag them.
