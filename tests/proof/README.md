# Proof suite: executable evidence for the audit findings

These are the repo's first database-backed tests. They exist to answer one
question the static audit could not: **do the defects in
`docs/product/mvp-audit-findings.md` actually reproduce?**

Every test here is written to **pass while the bug is present**. A green run
means the findings are real. When a fix lands, the corresponding test goes red,
which is the signal to invert its assertion into the correct post-fix behavior
and move it into the real integration suite described in
`docs/product/test-harness-spec.md`.

They are deliberately NOT part of `pnpm test`. The default `vitest.config.ts`
includes only `tests/unit/**`, so CI (which has no Postgres) is unaffected.

## Running them

Needs a local Postgres. `docker compose up -d postgres`, or any server you point
`DATABASE_URL` at. **Never point this at production**: the suite TRUNCATEs every
table in its schema between tests.

```bash
export DATABASE_URL="postgresql://villagekeep:villagekeep@localhost:5432/villagekeep?schema=villagekeep_app"
export APP_DB_SCHEMA=villagekeep_app
export SESSION_SECRET="$(openssl rand -base64 48)"
pnpm db:deploy:safe          # or: npx prisma migrate deploy, with ?schema= set
pnpm test:proof
```

`scaling.test.ts` needs `pg_stat_statements`:

```
postgres -c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## What each file proves

**`prove.test.ts`** runs the audit's claimed failure scenarios through the app's
own service functions. Measured output on 2026-08-03:

| Claim | Observed |
| --- | --- |
| Mid-month lease billed a full month | Lease starts Aug 15, charge is `$1850.00` due `2026-08-01`. Prorated would be `$1014.52`: overbilled by `$835.48` |
| Onboarding creates a past-due charge | Onboarded Aug 12, charge due Aug 1, `daysLate=11` on creation |
| Late fee edit is retroactive | 6 unpaid months, one lease edit, **6 late fees totalling `$450.00` minted in a single tick** |
| Landlord and tenant disagree on lateness | Tick at `00:00:05Z` Aug 1: landlord queue has 1 item at `daysLate=0`, tenant `isOverdue=false` |
| Chicago grace ends early | Fee minted at `2026-08-07T00:00:01Z`, which is **Aug 6, 7:00:01 PM Chicago**, still grace day 5 |
| Paid charges stay in the scan set | A fully `PAID` charge still matches `applyLateFees`' predicate |
| Ledger overflows int4 | Postgres: `Unable to fit integer value '4000000000' into an INT4` |
| `postLedger` swallows unique violations | Duplicate reversal with a **fresh** idempotency key returns `posted=false`, no throw |
| `allocateOldestFirst` is unguarded | `(-5000)` returns `remainderCents=-5000`; `(1850.5)` allocates `1850.5` fractional cents |
| `shareWithTenant` does not hide charges | `shareWithTenant=false`, tenant balance still `$1850.00` |
| Rent generation has no org filter | One call bills leases across 2 different orgs |

**`measure.test.ts`** measures rather than asserts.

- Tick cost via `pg_stat_statements`: at 250 leases and 6,000 **paid** charges,
  one tick with nothing to do issues **503 queries** (`generateRentCharges` 251,
  `applyLateFees` 252). At the 2-minute schedule that is **362,160 queries/day
  to create zero rows**.
- **The cross-org boundary HOLDS.** All six attacks (`getProperty`,
  `updateProperty`, `updatePropertyDetails`, `deleteProperty`, `updateUnit`,
  `updateLease`) are blocked with `NotFoundError` and org A's data is unchanged.
  The guard-then-write convention works today. It is fragile and untested, not
  broken.
- `getTenantBilling(leaseId)` called with **no auth context at all** returns the
  balance. Safe only by caller discipline.

**`scaling.test.ts`** shows the tick cost is linear in unpaid history, which
matters because nothing can settle a charge, so that history only grows:

| Unpaid history | Charges | Queries/tick | Queries/day |
| --- | --- | --- | --- |
| 12 months | 6,500 | 3,502 | 2,521,440 |
| 24 months | 12,500 | 6,502 | 4,681,440 |
| 36 months | 18,500 | 9,502 | 6,841,440 |

Every unpaid charge adds a query to every tick, forever, against a
5-connection pool on a database shared with other services.

A side observation from the fixture: the warm-up pass minted a late fee for
**every one of the 9,000 unpaid overdue rent charges in one tick**, which is the
retroactive-late-fee defect reproducing at portfolio scale.
