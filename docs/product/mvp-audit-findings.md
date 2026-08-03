# VillageKeep: MVP audit findings

Companion to `mvp-launch-plan.md`. That document says what to build; this one
says what is already broken. Everything here was verified by reading the code at
`5834c5e` and cites the file, the line, and a concrete failure scenario.

Method: seven parallel specialist audits (money correctness, authorization and
security, schema and migrations, user journeys, production and performance, test
coverage, Chicago rental law), each finding then re-checked against the source
by an independent adversarial pass whose job was to refute it. Claims that could
not survive that pass were dropped. Where an auditor overstated a claim, the
correction is noted inline.

**Then every money and security claim was executed.** A real Postgres 16 was
stood up, the actual migrations applied, and the app's own service functions run
against the audit's failure scenarios. All eleven reproduced. The evidence, with
measured output, is in `tests/proof/` (`pnpm test:proof`, see its README). Two
findings were **corrected by that testing**: the `db:deploy` blast radius in 4.11
was smaller than first described (and the real hazard turned out to be
`db:migrate`), and the cross-org boundary in 3.6 **holds under direct attack**,
so it is fragile and untested rather than broken. Numbers quoted below are
measured, not estimated.

Out of scope: Phase 2 surfaces (marketplace, bidding, escrow, pro portal). This
is about defects in shipped code and gaps that block a pilot with real tenants.

---

## Part 1: The blockers

Six things make a real pilot impossible. Four of them are not in the original
launch plan, because they are not missing features. They are shipped code that
does the wrong thing.

### 1.1 A lease can only become ACTIVE if the tenant clicks an email link

`src/lib/services/invite.ts:386` is the **only** line in the codebase that sets a
lease to ACTIVE. There is no landlord override anywhere in the UI or the API.

`generateRentCharges` selects `where: { status: "ACTIVE" }`
(`src/lib/services/charges.ts:70`).

**Failure scenario.** A pilot landlord onboards a tenant of nine years who does
not use email, or whose address was mistyped, or who lets the 7-day invite link
expire. The landlord fills in the lease, sets $1,850 rent, due day 1, and waits.
The lease sits at DRAFT permanently. No rent charge is ever generated. The
landlord's rent roll silently does not exist, and nothing in the product tells
them why.

This is the deepest blocker in the audit, because it means **the money loop
cannot even start without the tenant's cooperation**, and the pilot's target
demographic is small landlords with long-tenured, often older, tenants. The
launch plan assumed the problem was settling charges. The prior problem is
creating them.

**Fix.** A landlord action to activate a lease directly, with the invite as the
happy path rather than the only path. Effort: half a day.

### 1.2 No UI ends a lease, so the landlord reaches an unresolvable dead end

Nothing in `src/components` or `src/app` ends a lease. Verified exhaustively: the
only references to `ENDED`/`TERMINATED` outside services are read-only status
checks in the two tenant pages.

**Failure scenario.** A tenant moves out in March. The landlord flips the unit to
Vacant, which PATCHes only `unit.status` and never touches the lease
(`src/components/landlord/units-manager.tsx`). The lease stays ACTIVE, so:

- `generateRentCharges` mints a new rent charge every month, forever
- `applyLateFees` adds a late fee to each one
- the dashboard fills with late-rent cards for a tenant who left
- and when the landlord tries to delete the property, `deleteProperty`
  (`src/lib/services/property.ts:161`) refuses with **"This property has leases.
  End or delete them first."**

The error instructs the landlord to perform an action the application does not
implement. Effort: 1 day including deposit disposition.

### 1.3 Emergency maintenance never reaches the attention queue

**Rendered in a real browser; see `docs/product/ux-shots/`. The original wording
of this finding was wrong and is corrected here.**

`getDashboard` (`src/lib/services/dashboard.ts:107`) composes the attention queue
from exactly three sources:

```ts
const items = sortAttention([
  ...buildLateRentItems(lateRent),
  ...vacancyItems,
  ...(sample ? [buildSampleItem(sample)] : []),
]);
```

Maintenance is counted in the pulse bar and never becomes an attention item. The
`AttentionItem` kind union in `src/lib/attention.ts` is
`"vacancy" | "sample" | "late-rent"`, with no maintenance member.

**What the browser actually shows.** With an open EMERGENCY request ("no hot
water, water coming through the ceiling"), the dashboard renders:

- pulse bar: **"3 open maintenance"**
- NEEDS YOU: late rent, then vacancy. **The emergency is absent.**

So the dashboard did *not* say "All quiet", because unrelated items happened to
fill the queue. My original phrasing was wrong. The defect is real and slightly
different: **an EMERGENCY request is invisible in the attention queue**, present
only as a number in the pulse bar and an entry in the notification bell. The
"All quiet" wording is reachable only when there is also no late rent and no
vacancy, which is precisely the well-run portfolio the empty state is designed
to reward.

The product's thesis is that the dashboard is an attention engine. The single
highest-severity class it models is the one class it cannot surface.
Effort: 2 hours, the builder pattern already exists.

### 1.4 Onboarding an existing tenant fabricates backdated past-due rent

`rentChargeForPeriod` (`src/lib/charges.ts:70`) has no concept of when billing
starts for a lease. The moment a lease flips to ACTIVE, the next tick generates
the current month in full.

**Failure scenario.** A landlord enters a real lease running since June 2025. The
tenant accepts on August 12, 2026. Within two minutes the tick creates August
rent of $1,850 with `dueDate` August 1, already past due, and a late fee follows
once grace expires.

The first thing a brand-new tenant sees in the product is a bill they already
paid, marked late, with a penalty attached. Effort: 1 to 2 days with 1.5 below.

### 1.5 Nothing can settle a charge

Covered in the launch plan. `Payment`, `PaymentAllocation`, and `ConnectAccount`
have zero reads and zero writes. `postLedger` is built, tested, and has no caller.
This is the root cause of the unbounded scans in 2.4.

### 1.6 No password reset

Covered in the launch plan. `AuthToken` exists and is unused.

---

## Part 2: Money defects

### 2.1 No proration, first or last month (HIGH)

A lease genuinely starting August 15 at $1,850 is billed $1,850 with `dueDate`
August 1, fourteen days before occupancy. The pro-rated amount for 17 of 31 days
is $1,014.52, so the tenant is over-billed by $835.48 **and** marked late on it.
The mirror case applies to the final month.

**Fix.** Prorate by day overlap, clamp the first period's due date to the lease
start, and document the rounding rule beside the money conventions. Effort: 1 day.

### 2.2 Editing a late fee retroactively mints one fee per unpaid past month (HIGH)

`applyLateFees` (`src/lib/services/charges.ts:87`) reads `lateFeeCents` from the
**live lease row** at evaluation time, not from a snapshot taken when the charge
was generated. It also re-evaluates all history on every tick.

**Failure scenario.** A landlord onboards in February with no late fee (the schema
default is 0). Six months of rent charges accumulate, all permanently open
because nothing can settle them. In August they set a $75 late fee in the lease
panel, expecting it to apply going forward. The next tick mints a late fee for
every one of the six unpaid months at once: $450 appears on the tenant's balance
in a single sweep, backdated, from an edit the landlord believed was prospective.

**Fix.** Snapshot the fee terms onto the RENT charge at generation time and have
`lateFeeForRent` read the snapshot. Correct regardless, since the terms in force
at billing time are what governs. Effort: half a day.

### 2.3 Landlord and tenant disagree about who is late (HIGH)

`getOrgLateRent` (`src/lib/services/charges.ts:169`) filters with a raw instant
comparison, `dueDate: { lt: asOf }`, while the tenant portal uses the
day-granular `isOverdue`. Charges are stored at UTC midnight and the tick creates
them seconds into the day.

**Failure scenario.** At `2026-08-01T00:00:05Z` the tick creates the August
charge with `dueDate 2026-08-01T00:00:00Z`. Five seconds later the same
predicate is true, so the charge enters the landlord's late-rent queue on the
morning rent is due, rendered as a card reading **"$1,850, 0 days late."** In
Chicago local time that is 7:00pm on July 31, the evening *before* the due date.

**Fix.** Route the landlord side through the same day-granular predicate the
tenant side uses. Effort: 2 hours.

### 2.4 Lateness is evaluated in UTC (MEDIUM)

Even after 2.3, `startOfDayUTC` means the grace boundary lands at 7:00pm Chicago
rather than the end of the local day. A tenant with a 5-day grace period is
charged at 7:00pm on day 5, five hours early, every time.

**Fix.** A timezone on Organization (default `America/Chicago` for the pilot) and
local-day comparison for overdue, grace, and `daysLate`. Effort: half a day for a
fixed offset, 1 to 2 days done properly.

### 2.5 Unbounded tick scans (MEDIUM)

`applyLateFees` uses `status: { not: "VOID" }`, which deliberately includes fully
paid charges, with no date floor and no `take`. It materializes every rent charge
ever created, every two minutes, 720 times a day, on a 5-connection pool shared
with live web traffic. `generateRentCharges` issues a separate `findFirst` per
ACTIVE lease on every tick even though it can only create rows on one day a
month. Neither filter has a supporting index.

**Measured via `pg_stat_statements`**, 10 orgs x 25 units, one tick with nothing
to do:

| Unpaid history | Charges | Queries/tick | Queries/day |
| --- | --- | --- | --- |
| all paid (baseline) | 6,000 | 503 | 362,160 |
| 12 months unpaid | 6,500 | 3,502 | 2,521,440 |
| 24 months unpaid | 12,500 | 6,502 | 4,681,440 |
| 36 months unpaid | 18,500 | 9,502 | 6,841,440 |

Linear in unpaid history, and since A3 means nothing can ever settle a charge,
that history only grows. Every unpaid charge adds a query to every tick forever.
All of the above created **zero rows**.

**Fix.** Narrow to `status: { in: ["PENDING", "PARTIALLY_PAID"] }`, add a date
floor and a `take`, replace the per-lease `findFirst` with one `findMany` of
existing period keys plus `createMany({ skipDuplicates })`, and add the indexes.
Effort: half a day.

### 2.6 No backfill for missed periods (MEDIUM)

`runTick` always calls `generateRentCharges()` with no argument, so only the
current UTC month can ever be created. A lease starting in June whose tenant
accepts in September never gets June, July, or August rent, and there is no
recovery path. The same applies to any month the tick was down.

### 2.7 Correcting a lease's rent does not fix the current charge (MEDIUM)

A landlord mistypes rent, the tick bills it that minute, and the correction via
the lease panel updates only the lease row. `createChargeIfNew` finds the
existing `(leaseId, RENT, '2026-08')` row and returns false forever. The wrong
amount is permanent until void and one-off charges ship.

### 2.8 `postLedger` swallows any unique violation (MEDIUM)

`src/lib/services/ledger.ts:112` cannot distinguish a duplicate idempotency key
from any other P2002 raised inside the transaction. `LedgerEntry.reversalOfId` is
unique, so a double-reversal rolls back the whole transaction and returns
`{ posted: false }`, which the caller reads as "already done, no-op." Latent
today because the ledger has no callers; live the moment M1 lands.
Effort: 1 hour.

### 2.9 The ledger overflows at $21.47M (LOW today, un-fixable later)

`LedgerEntry.runningBalanceCents` is `Int`, so int4, capping at
$21,474,836.47. It is a monotonically accumulating per-account balance that is
never reset. `seq` was correctly declared `BigInt`; the money columns were not. A
platform-level account aggregating every org crosses the ceiling well before any
single landlord does.

The table is empty today, so widening to int8 is a two-hour migration with zero
data risk. After M1 posts real money it is a very different job. **Do this
before M1, not after.**

### 2.10 `allocateOldestFirst` is unguarded (LOW)

Correcting the launch plan: the allocation core **already exists**, at
`src/lib/money.ts:32`. M1 is smaller than originally estimated. But unlike
`feeFromBps` immediately above it, which validates and throws, it has no guard:
a negative `paymentCents` returns a negative remainder and silently manufactures
a credit, and a fractional amount produces fractional-cent allocations that flow
straight into `Charge.amountPaidCents`. It also has no tie-break when a rent
charge and a late fee share a due date, so ordering there is whatever the
database returned. Effort: 1 hour.

### 2.11 The tenant "You owe" headline includes charges not yet due (LOW)

Rent for the whole month is generated on the first tick of the month regardless
of `rentDueDay`. With `rentDueDay: 28`, a tenant opening the portal on August 1
sees "You owe $1,850.00" for rent due 27 days later.

---

## Part 3: Security defects

### 3.1 Rate limiting is bypassable via a client-controlled header (HIGH)

`src/lib/request.ts` takes the **first** `X-Forwarded-For` entry, which is
client-supplied. Render appends the real address rather than replacing the
header, so `[0]` is attacker-chosen.

Rotating the header yields unlimited distinct rate-limit buckets. Per-account
lockout still caps brute force against one account, but credential stuffing
across many accounts is unthrottled and signup is unlimited. It also means every
`ip` recorded in `AuditLog` and on `Session` is forgeable.

**Fix.** Take the *n*th entry from the right, where *n* is the number of trusted
proxies. Effort: 1 hour. Highest value per minute in this document.

### 3.2 Open redirect on the login page (HIGH)

`src/components/auth/auth-forms.tsx:38`:

```ts
router.push(next || data.redirect || "/");
```

`next` comes off `searchParams` with no shape check. A crafted
`/login?next=https://villagekeep-support.example/verify` sends a landlord who
just typed their real password to an attacker-controlled page, perfectly
positioned to present a "session expired, sign in again" form.

**Fix.** Accept only same-origin paths beginning with a single `/`.
Effort: 15 minutes.

### 3.3 Rotating `SESSION_SECRET` destroys every stored access code (HIGH)

`src/lib/crypto.ts:12` derives the AES-256-GCM key by hashing `SESSION_SECRET`,
which `render.yaml` declares `generateValue: true`.

A rotation, a Blueprint sync, or an environment rebuild invalidates sessions,
which is fine, and **permanently destroys every lockbox and gate code**, which is
not. `revealAccessCodes` catches the auth-tag failure and returns
`{ locked: true }`, so there is no crash, no alert, and no recovery. It also
means the one secret you would most want to rotate after a leak can never be
rotated.

**Fix.** A separate `DATA_ENCRYPTION_KEY` with versioned key ids in the `enc1:`
prefix so re-encryption is possible. Effort: half a day, and cheaper now than
after the pilot accumulates codes.

### 3.4 Photo upload buffers the whole body before the size check (HIGH)

`src/app/api/v1/landlord/photos/route.ts:14` reads the entire request body into
memory before `MAX_UPLOAD_BYTES` is consulted. On a Render starter instance this
is a straightforward OOM vector from an authenticated user.

### 3.5 `requireOrgApi` ignores `Membership.role` (MEDIUM)

`src/lib/authz/api.ts:17` checks that the user is a LANDLORD with an active org
and never reads the role. `OrgRole` defines OWNER, MANAGER, and VIEWER. A VIEWER
would have full OWNER write access across every landlord route. Latent because
no UI creates VIEWERs yet; live the moment team invites ship.

### 3.6 The authorization boundary has no database-level integrity (MEDIUM)

`orgId` is the entire authz boundary: every check reduces to
`where: { orgId: ctx.orgId }`. Of 33 foreign keys in the init migration:

| Has an `orgId` FK | No `orgId` FK |
| --- | --- |
| Membership, Property, ConnectAccount | **Charge, Payment, Lease, Unit, MaintenanceRequest, Message, Attachment, AuditLog** |

The eight tables carrying the security boundary have `orgId` as a bare
unconstrained string, with no FK to `Organization` and no guarantee that
`Charge.orgId` agrees with `Charge.lease.unit.property.orgId`. One bug writing
the wrong `orgId` moves money between organizations and the database accepts it.

**Tested: the boundary holds today.** Six direct cross-org attacks
(`getProperty`, `updateProperty`, `updatePropertyDetails`, `deleteProperty`,
`updateUnit`, `updateLease`, all with org B's context against org A's ids) were
every one blocked with `NotFoundError`, and org A's data was unchanged. The
guard-then-write convention works. This finding is about **fragility, not a live
leak**: the invariant rests entirely on a discarded guard call that no test
protects and no constraint backstops.

*(An auditor claimed "every orgId column" is unconstrained. Three do have FKs.
The eight that matter for authz do not.)*

The denormalization is a defensible performance call; it needs a composite FK to
the parent or, at minimum, the cross-org test sweep.

### 3.7 Sessions slide for 30 days with no absolute cap and no user revocation (MEDIUM)

`revokeAllUserSessions` exists and is never called from any route. There is no
settings page, so a user who loses a device has no way to sign it out.

### 3.8 No Origin check or CSRF token (MEDIUM)

Mutating routes rely solely on `SameSite=lax`. An Origin header check on
state-changing routes is cheap defense in depth.

### 3.9 No security headers (MEDIUM)

No CSP, HSTS, X-Frame-Options or frame-ancestors, Referrer-Policy, or
X-Content-Type-Options anywhere. Effort: 2 hours.

### 3.10 Photo bytes live in the shared Postgres (MEDIUM)

`FileBlob.bytes` is a `Bytes` column. At the pilot's own numbers, 10 landlords x
20 properties x 12 photos x 250KB is roughly **600MB of image data inside a
database shared with the founder's other services**, inflating their backup size
and restore time. `deletePhoto` also removes the Attachment and the FileBlob in
two un-transacted statements, orphaning bytes on failure.

### 3.11 Lower severity

- `handleServiceError` logs full Prisma error objects, putting tenant PII and
  query parameters into Render logs.
- The unauthenticated health endpoint discloses the private schema name and the
  deployed commit SHA.
- `getPhotoForOrg` does not filter on `kind`, so the endpoint will serve any
  future attachment type once non-photo attachments exist.
- The in-memory rate-limit map's cleanup degrades to an O(n) scan once it
  exceeds 10,000 keys, which 3.1 makes trivial to force.

---

## Part 4: Schema and data model

Assessed against what M1 actually needs.

### 4.1 An overpayment silently vanishes (BLOCKER for M1)

Nothing in the schema can hold unallocated money or a tenant credit, yet
`allocateOldestFirst` already returns a `remainderCents`. A tenant who pays
$2,000 against $1,850 owed has $150 with nowhere to go.

### 4.2 No way to represent a bounced check or returned ACH (BLOCKER for M1)

`PaymentStatus` has no returned or reversed state usable for offline recording,
and `PARTIALLY_REFUNDED` exists with nowhere to store the refunded amount. This
is also precisely the case offline recording never sees but Stripe ACH will,
three days after the charge already showed paid.

### 4.3 `Payment` lacks the four fields offline recording needs (HIGH)

No `receivedAt` (distinct from `createdAt`: a check received on the 1st but
entered on the 5th must not be late), no `reference`, no `note`, no
`recordedByUserId`. `providerRef` is globally `@unique`, so it cannot hold a
check number, since two landlords will both write check #101.

### 4.4 `PaymentAllocation` has no integrity constraints (HIGH)

No unique on `(paymentId, chargeId)`, no positive-amount constraint, and nothing
ties `Charge.amountPaidCents` to the sum of its allocations. The two
representations can drift with no detection.

### 4.5 `LedgerEntry` cannot model rent collection (HIGH)

No TENANT account type, no `leaseId` or `chargeId`, and no balancing invariant.
It was designed for marketplace escrow. Wiring rent through it in M1 is a larger
schema change than the launch plan assumed.

### 4.6 Append-only is a comment, not a constraint (MEDIUM)

Nothing at the database level prevents an UPDATE or DELETE on `LedgerEntry` or
the status-history tables, despite the invariant being load-bearing.

### 4.7 Voiding a charge is a destructive in-place edit (MEDIUM)

`ChargeStatus.VOID` with no reason, no actor, and no history table, which
contradicts the project's own append-only correction rule.

### 4.8 Missing indexes on hot paths (MEDIUM)

Neither tick query has a supporting index. Neither the notification bell feed nor
the email flusher is served by `Notification`'s only index, and the bell polls
every 60 seconds per open tab.

### 4.9 `deleteProperty` does not guard maintenance requests (MEDIUM)

It checks leases but not maintenance, so the FK violation surfaces to the
landlord as a raw 500.

### 4.10 No CHECK constraints on any money column (MEDIUM)

Nothing prevents a negative `amountCents` or an `amountPaidCents` exceeding
`amountCents`.

### 4.11 `pnpm db:migrate` and `db:deploy` bypass every schema safeguard (HIGH)

This one touches the project's most critical rule. Schema isolation is enforced
in three places: `src/lib/env.ts`, `scripts/render-start.mjs`, and
`docker-entrypoint.sh`. The two commands a human would actually type are:

```json
"db:migrate": "prisma migrate dev",
"db:deploy":  "prisma migrate deploy",
```

The Prisma CLI reads `DATABASE_URL` verbatim and knows nothing about
`APP_DB_SCHEMA`. `.env.example` ships a `DATABASE_URL` with **no `?schema=`
parameter**, and Render's managed connection string has none either.

**Tested empirically against a real Postgres 16.** My first-pass description was
partly wrong; here is what actually happens, all three cases reproduced:

| Command | State of `public` | Observed result |
| --- | --- | --- |
| `pnpm db:deploy` | empty | **39 tables created in `public`.** Prisma logs `schema "public"` |
| `pnpm db:deploy` | has other tables | `Error: P3005`, refuses. **Fails safe** |
| `pnpm db:migrate` | has other tables | Reports the other service's table as *drift*, then: **"We need to reset the `public` schema. All data will be lost."** One confirmation from dropping it |

So the catastrophic framing I gave first was overstated for `db:deploy` on a
genuinely shared `public`, where Prisma's baseline check blocks it. That
protection is accidental, not designed. The real hazard is `db:migrate`, which
identifies another service's tables as drift and offers to destroy them. It
exited 130 non-interactively; in a terminal it is a `y` keystroke.

Either way, if the founder's other services use their own schemas, `public` is
empty and `db:deploy` pollutes it with 39 tables. The README also claims
`pnpm db:migrate` "creates villagekeep_app schema locally," which is false
unless the developer hand-edited their `.env`.

**Fixed** in this branch: `scripts/prisma-scoped.mjs` pins the schema the way
`render-start.mjs` already does and refuses `reset` outright. Verified against
the same Render-shaped URL that previously wrote to `public`: it now lands 39
tables in `villagekeep_app`.

---

## Part 5: User journeys

### 5.1 A tenant who owes $2,300 is told there are no charges (HIGH)

`src/app/(tenant)/tenant/payments/page.tsx:24` short-circuits billing to null the
moment a lease is not ACTIVE, then renders the literal sentence **"No charges on
this lease yet."** to a tenant carrying $2,300 of back rent and late fees. The
tenant dashboard does the same.

### 5.2 `shareWithTenant` does not hide what the landlord thinks it hides (HIGH)

Lease *terms* are gated by the sharing switch. Charge *amounts* are not: both
tenant pages call `getTenantBilling` unconditionally. The tenant dashboard says
"Your landlord hasn't shared lease details here yet" with an itemized $1,850 rent
charge rendered directly below it.

Decide whether a tenant is always entitled to their balance (defensible) and make
the control say so, or gate it. Today the switch quietly means less than the
label implies.

### 5.3 A moved-out tenant can file emergency maintenance on their old unit (HIGH)

`tenantActiveLease` (`src/lib/services/maintenance.ts:42`) is named for active
leases and its guard message says "No active lease", but it falls back to the
most recent lease of **any** status. An ENDED tenant passes the guard and can
file an EMERGENCY request against a unit someone else now lives in.

### 5.4 The landlord loses message history exactly when it matters (HIGH)

`listLandlordThreads` drops every conversation whose lease is no longer DRAFT or
ACTIVE. When a tenancy ends, the entire thread vanishes from the landlord's list,
including any discussion of damages, notice, or the deposit, at the precise
moment a deposit dispute needs it. The direct URL still works; nothing links to
it.

### 5.5 Every input is 14px, so iOS Safari zooms and never zooms back (HIGH)

`src/components/ui.tsx:108` uses `text-sm`, which is 14px. iOS Safari auto-zooms
any input below 16px and does not restore on blur. This shared class backs every
`EditableRow`, so every rent, deposit, late fee, and date field on the lease
panel does it. The product is explicitly mobile-first for landlords on phones.
Effort: one class change plus a visual check.

### 5.6 Submit buttons stick on "Sending..." forever (HIGH)

`src/components/tenant/report-problem-wizard.tsx:143` and the other submit paths
do not use `try/finally`. A tenant on a train with one bar taps send, `fetch`
rejects before returning a Response, `setBusy(false)` never runs, and the button
stays disabled reading "Sending..." with no error and no retry short of a reload.

### 5.7 Sample data completes two of three setup steps and inflates the rent number (HIGH)

`createSample` inserts a property with two units that both have market rent, so
`computeSetup` marks "Add your first property" and "Set unit rents" done with
green checks for a landlord who has done neither, and the dashboard's headline
scheduled-rent figure includes fictional money.

### 5.8 Error boundaries: real, but milder than I claimed (MEDIUM, was BLOCKER)

No `error.tsx`, `not-found.tsx`, `loading.tsx`, or `global-error.tsx` exists
anywhere under `src/app`. That part is true.

**Corrected by rendering it** (`ux-shots/07-not-found-page.png`): I said "no
header, no nav, no logo, and no route back". Wrong. The route-group layout still
wraps the boundary, so `/landlord/properties/<bad-id>` keeps the full VillageKeep
header, the portal nav, and the notification bell. The user is not stranded, and
a bad lease id under `/landlord/messages/` returns a clean HTTP 404 the same way.

What does render inside that shell is Next.js's stock unstyled
`404 | This page could not be found.`, centred in roughly 1,500px of bare white,
with the parchment background and every type token dropped. Jarring and
off-brand, not a dead end. Severity BLOCKER to MEDIUM. Still worth a styled
boundary so the design language survives an error. Effort: half a day.

### 5.8b RETRACTED: "the setup chain has a step that can never complete"

I claimed every landlord stares forever at an unfinishable "Connect your bank"
step, and recommended hiding it as a 15-minute win. **Rendering the day-0
dashboard shows I was wrong on both counts**
(`ux-shots/21-day0-landlord-dashboard.png`). The step is greyed, carries an
explicit `soon` chip, sits last in a four-step chain headed "Let's get your first
rent flowing", and the whole chain disappears once setup completes. It is honest
roadmap signalling, competently executed. Hiding it would be a downgrade.
**No action.**

### 5.9 Navigation dead ends (MEDIUM)

- Late-rent and vacancy cards route to the property page, which contains no rent,
  no charges, no balance, and no action to resolve the item.
- Setup steps 2 and 3 route to the properties list, which contains neither
  action. The real path to inviting a tenant is property, then unit card, then
  unit page, then lease panel.
- The expired-invite screen offers no link, no contact, and no way to request a
  new one, while the "already used" branch two lines above does pass a CTA.
- A user holding both landlord and tenant roles can never reach their second
  portal: `computeRoles` supports it, nothing renders a switcher.

### 5.10 Scale and ergonomics (MEDIUM)

- Message threads have no pagination and re-download every message on a
  20-second timer. At 500 messages that is a janky, battery-burning page.
- The maintenance inbox loads every request the org has ever had with no filter,
  status tab, or search.
- Both wizards trap the user on step 0 with no cancel or back affordance.
- Sample create and remove swallow their error messages entirely, so a failed
  removal just flickers the button.
- HEIC is advertised as accepted but the bundled libvips cannot decode HEVC
  `.heic`, the iPhone default, producing an unhelpful generic error.

### 5.11 Accessibility on the primary flows (MEDIUM)

- Every in-place edit field opens an autofocused input with no accessible name:
  the label is a `<span>`, not a `<label htmlFor>`, and no `aria-label` exists.
  A screen-reader user hears "edit text, blank" on rent, deposit, and every other
  value in the product.
- The unit card is a `div` with `role="link"` whose Enter handler fires for its
  own child controls, so keyboard users navigate away instead of operating the
  status select or the delete button.
- The notification bell has no `aria-expanded`, `aria-haspopup`, or focus
  management, and Escape does not restore focus.

---

## Part 6: Verified sound

Audited and correct. Listing these so effort is not spent re-checking them.

- **Invite tokens.** 32 random bytes, SHA-256 hashed at rest, never stored raw,
  rotated on reissue, TTL enforced, lookup by hash.
- **Cron authentication.** Length-checked `timingSafeEqual`, closed by default
  when `CRON_SECRET` is unset.
- **Message authorization.** `leaseAccess` verifies lease tenancy or org
  membership on every call and returns 404 rather than 403.
- **Photo serving.** `getPhotoForOrg` scopes by org before returning bytes.
- **Maintenance scoping.** Every org query is correctly constrained.
- **Rent due day.** Capped at 28 in validation *and* clamped in `rentDueDate`,
  so February is safe by two independent mechanisms.
- **Ad-hoc charge uniqueness.** `@@unique([leaseId, type, periodKey])` with a
  nullable `periodKey` correctly permits unlimited one-off charges. The
  first-pass plan flagged this as an obstacle and was wrong: the schema already
  solves it, deliberately, with a comment explaining the Postgres NULL semantics.
- **The pure-core split.** `src/lib/*.ts` separated from `src/lib/services/*.ts`
  is paying off: every money defect above is fixable in a pure, testable function.

---

## Part 7: Priority

Ranked by harm per day of work, which is not the milestone order.

**Ship today (under 3 hours total):**

| Finding | Effort |
| --- | --- |
| 3.2 open redirect on login | 15 min |
| 3.1 rate-limit header bypass | 1 hour |
| 4.11 pin the schema in `db:migrate` / `db:deploy` | 1 hour |

**Before any tenant touches the product:**

| Finding | Effort |
| --- | --- |
| 1.1 landlord can activate a lease | half day |
| 5.2 tenant sees rent the landlord hid (screenshotted) | 2 hours |
| 1.3 maintenance in the attention queue | 2 hours |
| 5.1 ended-lease tenants see their balance | 1 hour |
| 5.3 fix `tenantActiveLease` fallback | 1 hour |
| 5.5 16px inputs | 30 min |
| 5.6 `try/finally` on every submit | 1 hour |
| 2.9 widen ledger money columns to int8 | 2 hours |

**M1, the money loop (schema work is larger than first estimated):**
1.4, 1.5, 2.1, 2.2, 2.3, 2.7, 2.8, 2.10, 4.1 to 4.5, 4.7, 4.10.

**M1 adjacent:** 1.2 move-out, 2.5 tick bounds, 2.6 backfill.

**Before public launch:** 3.3 to 3.10, 4.6, 4.8, 4.9, 5.2, 5.4, 5.9 to 5.11.

---

Legal findings (Chicago RLTO late fee caps, security deposit interest) live in
`mvp-launch-plan.md` and the pending regulatory pass. They are research, not
advice, and each names the question to put to counsel.
