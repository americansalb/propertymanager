# VillageKeep: MVP launch plan

Written after a full read of the codebase at `5834c5e`. This document answers
one question: what has to be true before a real Chicago landlord with real
tenants can run their month on VillageKeep, and what order should we build it in.

## 0. Where we actually are

Verified, not assumed. All checks green at `5834c5e`:
`pnpm lint` clean, `pnpm typecheck` clean, `pnpm test` 126 passing across 14
files, `pnpm build` green in CI.

**Shipped and working:**

| Area | State |
| --- | --- |
| Auth | Signup, login, argon2, sliding sessions, lockout after 10 fails, per-IP rate limits on login/signup/invites |
| Orgs and authz | Roles derived from data, `requireOrg()` takes orgId from session, never from client |
| Properties and units | Creation wizard, bulk unit patterns, photos, portraits, operational details (shutoffs, lockbox, parking, pets, tags), encrypted access codes |
| Leases | Snapshot terms on the unit page, per-field `shareWithTenant` gating |
| Tenant invites | Tokenized links, optional Resend email, public accept page, tenant home |
| Charges | Rent + late fees generated idempotently by the cron tick, `(lease, type, periodKey)` unique |
| Maintenance | Tenant wizard, landlord inbox, status responses with notes, append-only status history, tenant timeline |
| Messaging | Per-lease landlord/tenant threads |
| Notifications | In-app bell in every portal, EMAIL rows flushed by the tick with atomic claim and retry |
| Dashboard | Attention engine with setup chain, vacancy, late rent, sample-data items |
| Ledger | `postLedger` with SERIALIZABLE transactions, running balances, idempotency keys, append-only reversals |
| Infra | Render native Node service, migrations scoped to `villagekeep_app`, health check, cron tick every 2 minutes |

**The two status docs are stale.** `CLAUDE.md` says "Next: 1.4 charges"; charges,
the maintenance loop, notifications, and messaging have all shipped since.
`README.md` still shows Phase 1 unstarted. Fixed as part of this plan.

## 1. What MVP means here

The founding plan puts revenue in Phase 2 (marketplace, 1000 bps take rate) and
rent collection at 0 bps deliberately, as acquisition. So the MVP is not a
business, it is a **demand-side beachhead**: get 5 to 10 Chicago landlords with
real units, real leases, and real tenants running their whole month in the
product, because those landlords and their repair history are the demand that
makes the marketplace liquid later.

That sets the bar precisely:

> A landlord can onboard their portfolio, invite their tenants, bill rent,
> record that rent as paid, handle a repair request end to end, and never once
> fall back to a spreadsheet or a text message. Nothing loses money, nothing
> leaks across orgs, and nobody gets permanently locked out of their account.

We are closer to that than the milestone numbering suggests, and further from it
than the green CI suggests.

## 2. The findings

### 2.1 The one thing that must be fixed: the money loop does not close

This is the most important finding in the document.

`generateRentCharges()` and `applyLateFees()` run every two minutes and create
`Charge` rows. **No code path anywhere reduces a charge balance.** The `Payment`,
`PaymentAllocation`, and `ConnectAccount` models are fully specified in the
schema and are dead: zero reads, zero writes, confirmed by grep across `src`.
The `postLedger` machinery is built, tested, and has no caller.

What that means in practice, on a 30 day horizon after the first real landlord
signs up:

- Every tenant's `/tenant/payments` page says "You owe $1,850" forever, and
  grows by one late fee per month, even after they have paid in cash.
- Every landlord's dashboard fills with permanent `MONEY_TO_YOU` attention
  cards that can never be resolved. The attention engine is designed so items
  "leave the queue by being resolved, not dismissed", so the core surface of the
  product degrades into noise and the "All quiet" empty state becomes
  unreachable.
- The ledger, the thing designed to be the single source of monetary truth, has
  never recorded a single cent.

Billing that cannot be settled is worse than no billing at all. This is a hard
blocker, and it is fixable in days, not weeks, because the hard parts (money
math, idempotency, serializable posting, running balances) are already built.

**The fork in the road: offline payments or Stripe first?**

The `.env.example` and `render.yaml` both anticipate Stripe (1.6). But Stripe is
not the shortest path to closing the loop:

- Stripe Connect onboarding for landlords needs a real business entity, a live
  Terms of Service and Privacy Policy, and a platform review that we cannot
  schedule. Neither policy exists yet.
- Separate charges and transfers, Connect webhooks, payout gating, KYC states,
  and dispute handling are a two to three week build with real regulatory
  surface area.
- Meanwhile most small Chicago landlords collect by check, Zelle, or cash today
  and will keep doing so through a pilot. "Record the payment I already got"
  is a genuine feature for them, not a stopgap: it is the reconciliation they do
  in a spreadsheet right now.

**Recommendation: ship offline payment recording first, launch the pilot on it,
and build Stripe in parallel behind it.** Offline recording is the same service
boundary Stripe will call into later (`recordPayment` posts allocations and
ledger entries; the Stripe webhook becomes a second caller with
`provider: STRIPE`), so it is not throwaway work. It is the foundation.

### 2.2 Account lockout has no escape hatch

There is no forgot-password flow. There is no reset route, no reset UI, and the
`AuthToken` model with its `AuthTokenPurpose` enum is unused. There is also no
admin tooling to help a stuck user.

The first pilot landlord who forgets their password loses their account and
their portfolio permanently, and the only fix is a manual `UPDATE` against a
production database that is shared with the founder's other services. That is
not an acceptable Tuesday. Hard blocker.

Email verification is also absent, which compounds it: a user who typos their
signup email can never receive a reset link even once we build one.

### 2.3 The front door promises four things that do not exist

`src/app/page.tsx` currently sells:

1. "Tenants pay online, rent lands on the 1st" - no online payments exist.
2. "Tenants report with photos" - the report-a-problem wizard has **no photo
   upload at all**, despite `FileBlob`/`Attachment` infra existing for property
   photos.
3. "Vetted local pros bid with up-front prices" - Phase 2.
4. "Payment for every job sits in escrow until you approve" - Phase 2.

Separately, the "I'm a service pro" button on the landing page leads to a real
signup that creates a real `ProProfile` and then dead-ends on a stub page
telling them to wait. We are currently acquiring supply-side users into a void
with no way to contact them at launch.

A pilot runs on referral and goodwill. Overselling the product to the first ten
landlords in a single city is the fastest way to burn the market we most need.

### 2.4 The operator's verbs are missing

A landlord using this daily will hit these within the first week:

- **Cannot create a maintenance request.** Only `createTenantMaintenanceRequest`
  exists. The `origin` field defaults to `TENANT` and there is no landlord path,
  so a landlord replacing a water heater on their own initiative has nowhere to
  log it. That is also the repair log the core-surfaces spec calls "the asset's
  medical record" and a key long-term lock-in, so every unlogged repair is
  permanently lost value.
- **Cannot record a repair's cost.** `respondToMaintenance` sets status and
  notes; there is no cost field. Maintenance spend YTD, called out in the
  property profile spec, is unbuildable.
- **Cannot create a one-off charge.** No utility rebill, no damage charge, no
  pet fee, no prorated first month. Only the cron creates charges.
- **Cannot void or correct a charge.** A rent charge generated at the wrong
  amount is permanent.
- **Cannot move a tenant out.** `updateLease` accepts a status change to
  `ENDED`, but there is no UI action, no handling of open charges, no deposit
  disposition, and no unit-status transition.
- **Cannot change their own password, email, phone, or notification settings.**
  There is no settings page in any portal.

### 2.5 Testing does not cover the parts that can lose money

126 tests is a good number and they are well written, but every one of them
tests a pure function. **Zero tests execute a route handler, and zero tests
touch Postgres.** CI has no database service; the build step runs against a
`DATABASE_URL` pointing at a host that does not exist.

The consequence is that the highest-risk code in the repo is entirely untested
in its real form:

- `requireOrgApi()` org scoping, on every landlord route. A single missing
  `orgId` in a `where` clause leaks one customer's portfolio to another. This is
  the class of bug that ends a young company, and today nothing would catch it.
- `postLedger` idempotency and serializable retry behavior under concurrency.
- The charge generator's `(lease, type, periodKey)` uniqueness under overlapping
  cron ticks.
- The notification tick's atomic claim and release-on-transient-failure.

Before money moves, this needs a Postgres in CI and an authz sweep.

### 2.6 Production is unobservable

- No error tracking. A 500 in production is invisible unless someone reports it.
- **No monitoring of the cron tick.** If the Render cron job silently stops, rent
  charges stop generating and late fees stop applying, and nothing anywhere
  surfaces that. The health endpoint reports DB state only. This is a silent
  money failure with no alarm on it.
- No custom domain: `APP_URL` is `propertymanager-1.onrender.com` while the
  brand is villagekeep.com. Tenant invite emails from an unverified sending
  domain will land in spam, and invite delivery is the entire tenant
  acquisition mechanism.
- Rate limiting is in-process (`src/lib/rate-limit.ts`), while Redis is
  provisioned and unused. Correct for one instance, becomes wrong the moment we
  scale to two. Not a launch blocker, but a documented ceiling.
- No verified restore drill on a Postgres instance that is shared with the
  founder's other services.

### 2.7 No legal surface

No Terms of Service, no Privacy Policy, no acceptance at signup. We are storing
tenant PII and lease financial terms today, and Stripe will require both
documents live before approving a Connect platform. This blocks the Stripe path
regardless of when we start it.

## 3. The plan

Six milestones. M1 through M5 get us to a credible pilot launch. M6 runs in
parallel and unlocks the public launch. Day estimates are focused build days.

### M1: Close the money loop (4 to 5 days) - blocker

The single highest-value change in the plan.

- `recordPayment(ctx, { leaseId, amountCents, receivedAt, method, reference,
  note })` in `src/lib/services/payment.ts`. One transaction:
  create `Payment` (provider `MANUAL`), allocate oldest-open-charge-first into
  `PaymentAllocation`, update each `Charge.amountPaidCents` and status, and post
  the matching `LedgerEntry` rows through the existing `postLedger`. Carries an
  idempotency key from day one so the Stripe webhook can reuse the exact path.
- Pure allocation core in `src/lib/payments.ts` (oldest-first, partials,
  overpayment to credit), unit tested to the standard of `src/lib/charges.ts`.
- `createCharge` (one-off: utility, damage, deposit, pet, prorated rent) and
  `voidCharge` (append-only correction with a reason, never a destructive edit).
- Landlord UI: "Record payment" on the lease panel and a per-lease money view
  showing charges, payments, and running balance.
- Tenant UI: payment history and a balance that actually goes down.
- Attention engine: late-rent items clear on payment. Verify the "All quiet"
  empty state is reachable again.
- First DB-backed integration tests, on this service.

### M2: Account safety (3 days) - blocker

- Forgot password and reset, using the existing `AuthToken` model:
  single-use, 1 hour expiry, rate limited, no user enumeration in responses,
  revokes all sessions on successful reset.
- Email verification (`AuthTokenPurpose.EMAIL_VERIFY`): non-blocking banner plus
  a verified stamp, so reset delivery is reliable.
- `/settings` for every portal: change password, name, phone, email (with
  re-verification), notification preferences, and sign out everywhere.

### M3: An honest front door (2 to 3 days, plus parallel legal review)

- Rewrite the landing page to describe what ships today. Move online rent,
  bidding, and escrow into a clearly labeled "what's coming" section or cut
  them. Keep the design language; change the claims.
- Turn the pro path into a real waitlist: capture trade, service ZIPs, and
  license status into `ProProfile` (`DRAFT`), and show a truthful page. This
  costs almost nothing and starts seeding Phase 2 supply now instead of
  discarding it.
- Terms of Service and Privacy Policy pages, footer links, and an acceptance
  checkbox at signup with a timestamp recorded on `User`. Founder or counsel
  provides the text; the build is the plumbing.

### M4: The operator's verbs (4 to 5 days)

- Landlord-created maintenance requests (`origin: LANDLORD`), plus a cost field
  captured on resolve. This starts the repair log.
- Photos on maintenance requests from both sides. `FileBlob`, `Attachment`, and
  `/api/v1/landlord/photos` already exist; generalize the entity type and allow
  tenant authorship. Also makes the landing page's photo claim true and builds
  the context the marketplace depends on.
- Move-out flow: end a lease, resolve or carry open charges, set the unit
  vacant, record deposit disposition.
- Admin console beyond three counters: user and org lookup, invite resend,
  audit-log view, and a support path to correct a charge.

### M5: Launch hardening (4 to 5 days)

- Error tracking (Sentry or equivalent) plus structured request logging.
- **Postgres service in CI** and an integration test layer that runs route
  handlers against a real database in a scratch schema.
- **A cross-org authorization sweep**: for every landlord route, a test
  asserting org B cannot read or mutate org A's row. Highest-leverage tests in
  the repo.
- Tick liveness: record `lastTickAt`, surface it in `/api/v1/health`, and alert
  when it goes stale. Rent generation failing silently is unacceptable.
- Uptime monitoring on the health endpoint.
- Custom domain: villagekeep.com to Render, TLS, `APP_URL`, and Resend domain
  verification with SPF, DKIM, and DMARC.
- One restore drill of the `villagekeep_app` schema into a scratch schema, to
  prove the shared-instance backup story actually works.
- Reconcile `render.yaml` (`runtime: docker`) with the live native Node service
  so a future Blueprint sync cannot silently change the deploy.

### M6: Stripe online rent (2 to 3 weeks, parallel, not blocking the pilot)

The real milestone 1.6, started once M3 puts the legal pages live.

- Connect Express onboarding for landlords, with `ConnectAccount` state
  tracking.
- **ACH debit for tenants, not cards.** At $1,850 rent, ACH is roughly $0.80
  capped versus about $54 on a card. Cards on rent are economically wrong at
  0 bps platform fee.
- Separate charges and transfers only, per the core-surfaces money rules.
- Webhooks into the existing `WebhookEvent` and `IdempotencyKey` machinery,
  posting through the same `recordPayment` path M1 builds.
- Payout visibility for landlords, failure and retry handling for tenants.

Then Phase 2, the marketplace, which is where the revenue is.

## 4. Sequenced timeline

```
Week 1      M1 close the money loop            <- unblocks everything
Week 2      M2 account safety  +  M3 honest front door
Week 3      M4 operator verbs                        M6 Stripe starts here,
Week 4      M5 launch hardening                      running in parallel
Week 4/5    PILOT: 5 to 10 Chicago landlords
Week 6/7    M6 lands -> public launch with online rent
```

Roughly four to five weeks to a pilot that can hold real tenants and real money,
and six to seven to a public launch. M1 and M2 alone are about eight days and
they remove both hard blockers, so the risk profile improves sharply and early.

## 5. Launch checklist

Build:

- [ ] Payments recordable, balances settle, late-rent items clear
- [ ] One-off charges and void with reason
- [ ] Forgot password, email verification, settings page
- [ ] Landing page claims match shipped features
- [ ] Pro path is an honest waitlist
- [ ] Terms and Privacy live, accepted at signup
- [ ] Landlord-created maintenance with cost, photos both sides
- [ ] Move-out flow
- [ ] Admin lookup and support tooling

Operations:

- [ ] villagekeep.com live with TLS, `APP_URL` updated
- [ ] Resend domain verified (SPF, DKIM, DMARC), invite email delivery tested to
      Gmail, Outlook, and iCloud
- [ ] Error tracking live and alerting
- [ ] Tick liveness alarm
- [ ] Uptime check on `/api/v1/health`
- [ ] Restore drill completed on `villagekeep_app`
- [ ] Postgres in CI with route-level and cross-org authz tests passing
- [ ] `pnpm db:audit` clean, confirming no writes outside the app schema

Go to market:

- [ ] 5 to 10 named Chicago landlords committed to the pilot
- [ ] A support inbox a human actually reads
- [ ] A written rollback plan for the deploy

## 6. Risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Cross-org data leak | Untested `orgId` scoping on every landlord route; one leak between two landlords ends the company's reputation in a single city | M5 authz sweep, before the pilot, not after |
| Silent cron death | Rent stops generating and nobody is told | Tick liveness in health plus alerting (M5) |
| Shared production Postgres | Blast radius extends to the founder's other services | Schema isolation is already enforced in four places; add the restore drill and keep `db:audit` in the routine |
| Stripe review delays | Cannot be scheduled around | Do not put Stripe on the pilot's critical path; that is precisely why M1 ships offline payments first |
| Pilot expectation gap | Overselling burns the referral network we need for marketplace demand | M3, ship honest copy before talking to anyone |
| Single instance rate limiting | In-memory limiter silently weakens at two instances | Documented ceiling; move to the provisioned Redis before horizontal scaling |

## 7. The one-sentence version

Two hard blockers stand between us and a pilot, the money loop that cannot close
and the account that cannot be recovered, and both are days of work on top of
foundations that are already built; everything else on this list is honesty,
observability, and the tests that let us sleep.
