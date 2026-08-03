# VillageKeep: MVP audit findings

Companion to `mvp-launch-plan.md`. That document says what to build; this one
says what is already broken. Every finding here was verified by reading the code
at `5834c5e`, and each cites the file and the exact failure scenario.

Scope note: missing Phase 2 surfaces (marketplace, bidding, escrow, pro portal)
are out of scope. This is about defects in shipped code and gaps that block a
pilot with real tenants.

---

## A. Money defects

These are the highest severity class in the product, because the cron tick acts
on them automatically every two minutes with the landlord's name attached.

### A1. Mid-month leases are billed a full month, retroactively overdue (BLOCKER)

`src/lib/charges.ts:60` `rentChargeForPeriod` decides billability by asking only
whether the calendar month overlaps the lease at all:

```ts
if (periodEnd < startOfDayUTC(lease.startDate)) return null;
if (lease.endDate && periodStart > startOfDayUTC(lease.endDate)) return null;
```

There is no proration anywhere in the codebase.

**Failure scenario.** A tenant signs a lease starting January 20 at $1,850/mo
with `rentDueDay: 1`. The next tick runs with `asOf = Jan 20`. `periodEnd`
(Jan 31) is not before the lease start, so a charge is created:

- amount: $1,850, the full month
- dueDate: January 1, nineteen days before the tenant had keys
- immediately `isOverdue`, so the tenant's portal reads "PAST DUE $1,850"
- a late fee is generated as soon as grace expires
- the landlord's dashboard shows a `MONEY_TO_YOU` card for a debt that does not
  exist

The mirror case is a lease ending January 15, which is billed the full month.

**Fix.** Prorate the first and last periods by days occupied, and never emit a
`dueDate` earlier than `lease.startDate`. Proration policy (by calendar day vs
30-day month) is a founder decision and must be stated in the lease terms.
Effort: 1 day, mostly in the pure core, plus tests.

### A2. Chicago tenants are marked late a day early (HIGH)

All date math is UTC, deliberately and correctly for period keys. But
`isOverdue` (`src/lib/charges.ts:96`) treats lateness as a UTC question:

```ts
return chargeOpenCents(c) > 0 &&
  startOfDayUTC(c.dueDate).getTime() < startOfDayUTC(asOf).getTime();
```

**Failure scenario.** Rent due July 1, stored `2026-07-01T00:00:00Z`. At
`2026-07-02T02:00:00Z` the tick runs. In Chicago that instant is 9:00pm on
July 1, still the due date. `startOfDayUTC(asOf)` is July 2, which is greater
than July 1, so the charge is overdue. With `lateFeeGraceDays: 0`,
`lateFeeForRent` fires the same evening and the tenant is charged a late fee
with three hours still left on the due date.

Every Chicago landlord is affected for 5 to 6 hours of every due date, and the
error is always against the tenant.

**Fix.** Keep UTC for period keys, but evaluate lateness in the property's local
timezone. Add a timezone to Organization or Property (defaulting to
`America/Chicago` for the pilot) and compare local calendar days.
Effort: half a day.

### A3. Nothing can ever settle a charge (BLOCKER)

Covered in the launch plan and repeated here for completeness because it is the
root cause of the tick's growth problem below. `Payment`, `PaymentAllocation`,
and `ConnectAccount` have zero reads and zero writes. `postLedger` is built,
tested, and has no caller.

### A4. The tick rescans all history every two minutes, forever (HIGH)

`applyLateFees` (`src/lib/services/charges.ts:82`) is an unbounded scan:

```ts
const rents = await prisma.charge.findMany({
  where: { type: "RENT", status: { not: "VOID" }, dueDate: { lt: asOf } },
  select: { /* ... */ lease: { select: { lateFeeCents, lateFeeGraceDays } } },
});
```

No limit, no date floor, with a nested join, 720 times per day, against a
Postgres instance shared with the founder's other services at
`connection_limit: 5`.

Because A3 means charges never reach a paid state, the scanned set grows
monotonically forever. `generateRentCharges` has the same shape over all ACTIVE
leases.

**Fix.** Bound the window (only charges within the last N months can newly incur
a first late fee), add the covering index, and skip leases that are not ACTIVE.
Effort: half a day. Worth doing alongside M1 since M1 changes what "open" means.

### A5. No late fee cap, in a city that caps late fees (HIGH, product + legal)

`lateFeeDollars` accepts anything up to $1,000,000
(`src/lib/validation/property.ts:22`, `dollarsField`). The lease panel offers a
placeholder of `75` and the hint "If rent comes late."
(`src/components/landlord/lease-panel.tsx:463`). There is no cap, no warning,
and no jurisdiction awareness.

The Chicago RLTO (Municipal Code 5-12-140(h)) caps late fees at **$10 for the
first $500 of monthly rent, plus 5% of the amount above $500**. At $1,850 rent
that is a maximum of **$77.50**. An excessive late fee provision is
unenforceable, and reported remedies include damages of two months' rent.

**Why this is worse for us than for a landlord with a spreadsheet.** A landlord
who charges an illegal fee by hand does it once and can be argued out of it. Our
cron generates it automatically, every month, on a schedule, in writing, with a
"Late fee for 2026-07" description. We are manufacturing the evidence.

**Fix, and the opportunity.** Compute and cap the fee from monthly rent and the
property's jurisdiction, show the landlord the ceiling and why
("Chicago caps this at $77.50 for $1,850 rent"), and refuse to generate above
it. Generic national PM tools do not do this. Being visibly correct about
Chicago rules is a real wedge with the exact landlords we are recruiting.
This needs counsel review before shipping the specific numbers.
Effort: 1 day, plus counsel time.

### A6. Security deposits are stored and then ignored (MEDIUM, product + legal)

`securityDepositCents` exists on both Unit and Lease and is displayed. Nothing
in the codebase addresses the RLTO deposit regime: interest paid annually on
deposits held six months or more (the City sets the rate; **0.01% for 2026**),
receipt requirements, the separate federally insured account requirement, or
return with an itemized statement within the statutory deadline.

We do not hold the deposits, so the obligation is the landlord's, not ours. But
we display the number as though it is handled, and a landlord who trusts the app
as their system of record will miss the annual interest payment. Deposit
violations carry some of the RLTO's steepest remedies.

**Fix.** Either (a) surface the obligation as a dated attention item with the
computed interest, which is a genuinely valuable feature, or (b) state plainly
in the UI that VillageKeep does not track deposit compliance. Do not leave it
ambiguous. Effort: 1 day for (a), an hour for (b). Counsel review either way.

---

## B. Security defects

### B1. Rate limiting is bypassable via a client-controlled header (HIGH)

`src/lib/request.ts` in full:

```ts
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "unknown";
}
```

It takes the **first** entry, which is the value the client supplied. Render's
proxy appends the real address rather than replacing the header, so
`X-Forwarded-For: 1.2.3.4` yields `1.2.3.4, <real client ip>` and `[0]` is
attacker-chosen.

**Failure scenario.** An attacker rotates the header on every request. Each
value is a distinct rate-limit bucket, so `login:${ip}:${email}` and
`signup:${ip}` never trip. The per-account lockout at 10 failures
(`src/lib/services/auth.ts:9`) still caps brute force against one account, but
credential stuffing across many accounts at 2 to 3 common passwords each is
completely unthrottled, and account creation is unlimited.

**Fix.** Take the last entry, or better, the *n*th from the right where *n* is
the number of trusted proxies in front of the app, and fall back to a per-account
counter rather than "unknown". Effort: 1 hour. Highest value-per-minute fix in
this document.

### B2. Rotating SESSION_SECRET destroys every stored access code (HIGH)

`src/lib/crypto.ts` derives the AES-256-GCM key by hashing `SESSION_SECRET`:

```ts
function key(): Buffer {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set ...");
  return createHash("sha256").update(secret).digest();
}
```

`render.yaml` declares `SESSION_SECRET` with `generateValue: true`.

**Failure scenario.** A Blueprint sync, a secret rotation after a suspected leak,
or an environment rebuild regenerates the value. Every session is invalidated,
which is expected and fine. Every lockbox code, gate code, and access code
encrypted under the old key becomes permanently undecryptable.
`revealAccessCodes` (`src/lib/services/property.ts:124`) catches the auth-tag
failure and returns `{ value: null, locked: true }`, so there is no crash, no
alert, and no recovery: the data is silently and irrecoverably gone.

This also means the app can never rotate its session secret, which is the one
secret you most want to be able to rotate.

**Fix.** A separate `DATA_ENCRYPTION_KEY`, versioned key ids in the `enc1:`
prefix so re-encryption is possible, and a documented rotation procedure.
Effort: half a day. Do it before there is enough encrypted data to make
migration painful.

### B3. No security headers (MEDIUM)

`next.config.ts` sets `poweredByHeader: false` and nothing else. `middleware.ts`
only checks cookie presence. There is no Content-Security-Policy, HSTS,
X-Frame-Options / frame-ancestors, or Referrer-Policy anywhere.

**Fix.** A headers block in `next.config.ts`. Effort: 2 hours, most of it
tuning CSP against Next's inline scripts.

### B4. Photo bytes live in the shared Postgres (MEDIUM)

`FileBlob.bytes` is a Prisma `Bytes` column. Images are resized to webp at
100 to 350KB (`src/lib/services/photos.ts`), with limits of 12 photos per
property and 8 per unit.

At the pilot's own numbers, 10 landlords holding 20 properties each at 12 photos
is roughly 10 x 20 x 12 x 250KB, about **600MB of image data inside a database
that is shared with the founder's other services**, inflating their backup size
and restore time along with ours. The per-image discipline is good; the storage
location is the problem.

Also `deletePhoto` deletes the Attachment and the FileBlob in two separate
statements with no transaction, so a failure between them orphans bytes
permanently.

**Fix.** Object storage with signed URLs before the pilot grows, or at minimum a
documented ceiling and a monitor on schema size. Effort: 1 day for the move.

### B5. Verified sound, for the record

These were audited and are correct. Listing them so effort is not spent here:

- **Invite tokens.** 32 random bytes, SHA-256 hashed at rest, never stored raw,
  rotated on reissue, TTL enforced, lookup by hash.
  (`src/lib/services/invite.ts:23`)
- **Cron authentication.** Length-checked `timingSafeEqual`, closed by default
  when `CRON_SECRET` is unset. (`src/app/api/internal/cron/tick/route.ts:13`)
- **Message authorization.** `leaseAccess` verifies lease tenancy or org
  membership on every call and returns 404 rather than 403 on failure.
  (`src/lib/services/message.ts:29`)
- **Photo serving.** `getPhotoForOrg` scopes by org before returning bytes.
- **Rent due day.** Capped at 28 in validation *and* clamped defensively in
  `rentDueDate`, so February is safe by two independent mechanisms.
- **Ad-hoc charge uniqueness.** `@@unique([leaseId, type, periodKey])` with a
  nullable `periodKey` correctly permits unlimited one-off charges, since
  Postgres treats NULLs as distinct. This was flagged as an obstacle in the
  first-pass plan and that was wrong: the schema already solves it, with a
  comment explaining why.

---

## C. Product and UX defects

### C1. `shareWithTenant` does not hide what the landlord thinks it hides (HIGH)

Lease *terms* are gated behind the sharing switch via `tenantLeaseTerms`. Charge
*amounts* are not. Both the tenant dashboard and `/tenant/payments` call
`getTenantBilling(home.leaseId)` unconditionally, gated only on lease status:

```ts
const billing = ended ? null : await getTenantBilling(home.leaseId);
```

**Failure scenario.** A landlord deliberately leaves the lease unshared. The
tenant portal still displays "Rent for July 2026, $1,850" and a running balance.
The landlord believes rent is private and it is not.

This may even be the intended behavior, since a tenant is entitled to know what
they owe. But the UI presents one switch that implies it covers money, and it
does not. Decide the policy and make the control honest.
Effort: 2 hours either way.

### C2. There are no error boundaries anywhere (HIGH)

No `error.tsx`, `not-found.tsx`, `loading.tsx`, or `global-error.tsx` exists
anywhere under `src/app`. Verified by exhaustive find.

**Failure scenario.** Any unhandled server exception, including a transient
Postgres blip on the shared instance, renders the stock Next.js production error
page: "Application error: a server-side exception has occurred", a digest
string, no branding, no navigation. `notFound()` in the property page
(`src/app/(landlord)/landlord/properties/[id]/page.tsx:31`) lands in the default
404 for the same reason.

**Fix.** Route-group error and not-found boundaries with the portal shell so a
user keeps their nav and can retry. Effort: half a day.

### C3. The setup chain has a step that can never complete (MEDIUM)

`computeSetup` (`src/lib/attention.ts`) hardcodes:

```ts
{ key: "bank", label: "Connect your bank", done: false, soon: true },
```

Every landlord, forever, sees an unfinishable "Connect your bank" step. The
`complete` flag excludes `soon` steps so the chain does resolve internally, but
the user still stares at a permanent incomplete item advertising a feature that
does not exist. This is the same overselling problem as the landing page,
sitting on the primary surface.

**Fix.** Hide `soon` steps until the milestone ships. Effort: 15 minutes.

---

## D. Verification gaps

Restated from the launch plan with the specific consequence now that the defects
above are known: **every single defect in sections A and B would have been
caught by tests that do not exist.** A1 and A2 by pure-core date tests that were
simply never written for the mid-month and timezone cases. B1 by one route test.
A4 by any query-count assertion.

The pure core is well factored and cheaply testable. The gap is not
architectural, it is that the cases were not enumerated. That is the argument
for the harness in M5: not ceremony, but the thing that would have caught the
money bugs before a tenant saw them.

---

## Priority order

Ranked by expected harm per day of work, which is not the same as the milestone
order in the launch plan.

| # | Finding | Severity | Effort |
| --- | --- | --- | --- |
| 1 | B1 rate-limit bypass | HIGH | 1 hour |
| 2 | C3 unfinishable setup step | MEDIUM | 15 min |
| 3 | A1 mid-month full-month billing | BLOCKER | 1 day |
| 4 | A3 money loop cannot close (M1) | BLOCKER | 4 to 5 days |
| 5 | A2 timezone lateness | HIGH | half day |
| 6 | A5 late fee cap | HIGH | 1 day + counsel |
| 7 | C2 error boundaries | HIGH | half day |
| 8 | B2 encryption key separation | HIGH | half day |
| 9 | A4 unbounded tick scan | HIGH | half day |
| 10 | C1 sharing control honesty | HIGH | 2 hours |
| 11 | B3 security headers | MEDIUM | 2 hours |
| 12 | A6 deposit obligations | MEDIUM | 1 day + counsel |
| 13 | B4 blobs out of Postgres | MEDIUM | 1 day |

Items 1 and 2 are under two hours combined and should go out today.

## Sources

- [Chicago RLTO 5-12-140, late fees](https://www.depositlaw.com/140)
- [Chicago and Cook County late fee rules](https://www.gcrealtyinc.com/blog/late-fees-in-chicago-cook-county-evanston--everywhere-else)
- [City of Chicago, security deposit interest rates](https://www.chicago.gov/city/en/depts/doh/provdrs/landlords/svcs/security-deposit-interest-rates.html)
- [2026 Chicago security deposit interest rate](https://www.caapts.org/news/2026-illinois-and-chicago-security-deposit-interest-rates)

Legal findings above are research, not advice. Each one names the specific
question to put to counsel and the specific code it affects.
