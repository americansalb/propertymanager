# CLAUDE.md - VillageKeep

Property management + services marketplace (escrow). Brand: **VillageKeep** /
villagekeep.com - configured via env (`BRAND_NAME`), never hardcoded.

## Workflow (founder-mandated)

- Develop and push on a working branch - NEVER push directly to `main_property`.
- To deploy: **merge** the working branch into `main_property` and push the
  merge. Render auto-deploys `main_property`.
- Merge verified work into `main_property` PROMPTLY after each completed
  chunk (tests/lint/build green). Do not wait for per-deploy approval.
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

- NO EM DASHES (U+2014), ever: not in code, UI copy, docs, commit messages,
  or chat replies. Use a comma, colon, period, or spaced hyphen instead.
  (`grep -rn $'\u2014' src docs *.md` must stay empty.)
- Money: integer cents; rates in basis points (`src/lib/money.ts`).
- Roles derived from data (Membership/TenantProfile/ProProfile/isSuperAdmin),
  never stored - see `src/lib/authz/roles.ts`.
- Org scoping: handlers/services take orgId from the session via
  `requireOrg()` - never from client input.
- Ledger + status-history tables are append-only; corrections are new rows.
- Route handlers stay thin: zod parse → `src/lib/services/*` → JSON.
- Every page follows the page rules in `docs/product/design-language.md`:
  one column, the answer first, one next step, rows that are links,
  `Section` cards, `EditableRow`/`InfoRow` facts, empty fields behind Add
  chips, no "soon", plain words (Repairs, Home, "a month").

## Commands

`pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`
`pnpm db:migrate` (local) · `pnpm db:seed` · `pnpm db:audit` (read-only)
Local infra: `docker compose up -d` (postgres/redis/mailpit).

## Status

Phase 1 of the founding plan. Done: Phase 0 scaffold + 1.1 (auth/orgs/portals)
+ 1.2 (properties & units) + brand (logo v4 in `public/brand/`: green keep,
copper home; `LogoMark` + `Wordmark` components; iron/copper/patina tokens in
`globals.css` @theme) + 1.3 (tenant invites +
leases: lease panel on the unit page, invite links with optional Resend
email, public accept page, tenant home behind one shareWithTenant switch).
Next: 1.4 charges → 1.5 maintenance wizard → 1.6 rent via Stripe Connect
(landlords = Connect accounts; escrow = separate charges & transfers) → 1.7
emails/polish. Phase 2 = marketplace. Old codebase: `archive/main-2026-06-09`.

Quotes from the owner's own repair people (built, founder direction Nov 2026):
owners add their plumber, locksmith, maintenance pro (`Contractor`, no account). When
a tenant reports a problem, the ones whose trade fits are asked for a price
through a private link (`QuoteRequest`, `/quote/[token]`); the owner compares
and says yes, or a per-person limit says yes for them. Rules live in
`src/lib/quotes.ts`, the rest in `src/lib/services/quote.ts`. No money moves:
approving is "go ahead at this price". Next on this track: an urgent path
(first trusted person to say yes), texts (needs a texting account), an AI
price estimate (needs an API key), then outside pros.

Pro pages (built Nov 2026): repair pros sign up, confirm their email
(`AuthToken` EMAIL_VERIFY, `/verify/[token]`), pick trades, set starting
prices on jobs from `src/lib/pro-catalog.ts` (`ProPrice`), add ZIP codes, and
publish `/pros/[slug]`. Facts on the page say exactly what was checked
(email confirmed, how many owners list them, jobs approved); never
"verified". ID checks (Stripe Identity) and state license checks come later.
Owners add a published pro to their own repair people in one tap.
Projects (built Nov 2026): owners post a project, or open a tenant's repair
to nearby pros (`Job`/`Bid`, `src/lib/projects.ts`, `services/project.ts`).
Only open-market trades go out (maintenance, cleaning, painting, junk,
yard and snow, flooring, appliance repair); licensed work stays with the
owner's own people. Pros with a public page in that trade and ZIP bid a
price or range and a time; the owner says yes; the winner gets the address
and joins the owner's repair people. takeRateBps is 0: no money moves.
Also built: forgot password (`/forgot`, `/reset/[token]`) and recording rent
received outside the app (`src/lib/payments.ts`, `services/rent.ts`).
