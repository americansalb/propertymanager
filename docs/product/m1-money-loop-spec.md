# M1: closing the money loop, build spec

Reconciled from three independent designs (ledger-first, charge-first, and
Stripe-shaped) by a deciding pass that read the source and adjudicated between
them. Companion to `mvp-audit-findings.md`, which is where the defects this
design must not inherit are catalogued.

Two facts that shaped the decision and were under-weighted by all three designs:
`vitest.config.ts` includes only `tests/unit/**`, so there is no integration
harness in the repo at all today (see `test-harness-spec.md`), and the
`SUCCEEDED` payment status has zero occurrences anywhere in the tree, so
renaming it is free.

# MILESTONE 1: Closing the Money Loop

## DECISION

**Build Design B's spine with Design C's ledger account model and allocation table, and Design C's transaction-boundary correctness.** B is right about the one thing that decides the schedule: `Charge.amountPaidCents` stays the operational truth, because `chargeOpenCents` / `summarizeBilling` / `getTenantBilling` / `getOrgLateRent` / `getDashboard` and the shipped tenant page all read it, and making the ledger authoritative (Design A) means rewriting all of them before a single check can be recorded. That is the whole M1 budget spent on a refactor with no landlord-visible output. But B is wrong in three places and I am overruling it. **First, B's ledger accounts (`TENANT` versus `LANDLORD_ORG`) do not survive M6**, and B's own trade-off note admits `LANDLORD_ORG` will have to be renamed and backfilled once Stripe Connect makes it mean custodied cash. C's three-account split (`TENANT_LEASE`, `LANDLORD_RECEIVABLE`, `LANDLORD_TENANT_CREDIT`) costs three enum values and zero code, and leaves `LANDLORD_ORG` free to mean exactly what M6 needs. **Second, B's `PaymentAllocation.reversedAt` is an in-place mutation of a money table**, which B concedes bends the project's append-only rule; C's signed rows with `@@unique([paymentId, chargeId, kind])` gives reversibility, idempotency on webhook redelivery, and append-only, all from one index. **Third, B's idempotency block is a real bug**: it catches P2002 from `tx.idempotencyKey.create` and then issues `tx.idempotencyKey.findUnique` inside the same transaction, which Postgres has already aborted (25P02). C's shape (pre-check outside the transaction, claim inside, re-read outside on collision) is the correct one. Going the other way, **I am overruling C on scope**: no `Refund` model, no `PaymentEvent` model, no `PENDING` payment status, no `prorateFirstMonth` flags, no `lateFeeAssessedAt` claim marker, and no Postgres-in-CI prerequisite. C's own trade-off section lists most of those as the first things it would cut, and with no integration harness in the repo today, C's 58-test plan with 28 database tests is not a 5-day milestone. I am also overruling **A and B on charge correction**: C's in-place amount change plus a balanced `ADJUSTMENT` delta posting is strictly simpler than B's `supersedesChargeId` amendment chain (which costs a column, a self-relation, a unique index, and a credit re-application step) and produces the same audit trail. And I am overruling **C on the RLTO block**: the exemption escape hatch from A/B stays, because RLTO 5-12-020 exempts owner-occupied buildings of six units or fewer and hard-blocking an exempt landlord is us being wrong in their face.

The result is B's diff size, C's M6 seam, and one crux mechanism (late-fee suppression derived from `receivedAt`, persisted as a flag so the tick's scan stays a SQL filter) that closes the onboarding blocker.

---

## 1. Prisma diff and migration plan

All DDL runs inside `villagekeep_app` (pinned by `databaseUrlWithSchema()` in `src/lib/env.ts` and by `scripts/render-start.mjs`). No `migrate reset`, no `DROP SCHEMA`, nothing outside our schema.

### 1.1 Enums

```prisma
enum PaymentStatus {
  REQUIRES_ACTION
  PROCESSING
  SETTLED              // RENAMED from SUCCEEDED. Zero readers in the tree today.
  FAILED               // never became good funds
  RETURNED             // NEW: was good funds, then clawed back (NSF, ACH return)
  VOIDED               // NEW: entered in error, never happened
  REFUNDED
  PARTIALLY_REFUNDED
  DISPUTED
}

enum PaymentMethod {   // NEW. Replaces the free-text `method String?`.
  CASH
  CHECK
  MONEY_ORDER
  BANK_TRANSFER        // tenant's own Zelle/ACH, landed outside us
  CARD
  US_BANK_ACCOUNT      // Stripe ACH debit (M6)
  OTHER
}

enum AllocationKind { APPLY REVERSE }   // NEW

enum ChargeVoidReason {                 // NEW
  ENTERED_IN_ERROR
  WAIVED
  AUTO_NOT_LATE        // rent was covered by money received within grace
  LEASE_ENDED
}

enum LedgerAccountType {
  PLATFORM
  LANDLORD_ORG              // platform-custodied cash owed to the org (M6). UNCHANGED MEANING.
  PRO
  TENANT_LEASE              // NEW. accountId = leaseId. + = tenant in credit, - = tenant owes.
  LANDLORD_RECEIVABLE       // NEW. accountId = orgId.   + = accrued and uncollected.
  LANDLORD_TENANT_CREDIT    // NEW. accountId = orgId.   - = unapplied tenant money held (a liability).
}

enum LedgerEntryType {
  // ...existing 12 unchanged...
  CHARGE_ACCRUED      // NEW: a Charge came into existence
  PAYMENT_RETURN      // NEW: distinct from REVERSAL, the money really moved twice
  CREDIT_ISSUED       // NEW: overpayment parked
  CREDIT_APPLIED      // NEW: credit consumed by a later charge
}
```

`TENANT_LEASE` is keyed by `leaseId`, not by `tenantProfileId`: a lease can have several `LeaseTenant` rows sharing one balance, and a renewal must not merge balances across tenancies.

### 1.2 Organization, Property, Lease

```prisma
model Organization {
  // ...
  /// IANA zone. All lateness math is civil-date math in this zone, so a
  /// Chicago tenant is not overdue at 19:00 CT the day before rent is due.
  timeZone String @default("America/Chicago")   // NEW
}

model Property {
  // ...
  /// null = infer the late-fee regime from city/state.
  /// "NONE" = the landlord asserts an exemption (RLTO 5-12-020, owner-occupied,
  /// six units or fewer). Recorded in AuditLog with actor and timestamp.
  rentRegulation String?   // NEW
}

model Lease {
  // ...
  activatedAt DateTime?   // NEW
  endedAt     DateTime?   // NEW
  endReason   String?     // NEW: MOVE_OUT | EVICTION | MUTUAL | CORRECTION
  payments    Payment[]   // NEW back-relation
}
```

I am **not** adding `Lease.billingCity` / `billingState` (Design B). The tick's `generateRentCharges` already does one `findMany` over leases; adding `unit: { select: { property: { select: { city: true, state: true, rentRegulation: true } } } }` to that select is one join in one query, not a per-lease lookup. A denormalized copy buys nothing and adds a staleness bug and a backfill.

### 1.3 Charge

```prisma
model Charge {
  id              String       @id @default(cuid())
  leaseId         String
  orgId           String
  type            ChargeType
  status          ChargeStatus @default(PENDING)
  amountCents     Int
  amountPaidCents Int          @default(0)
  description     String
  periodKey       String?
  dueDate         DateTime

  // NEW: proration provenance. Null on a full-month charge.
  periodStart  DateTime?
  periodEnd    DateTime?
  proratedDays Int?

  // NEW: late-fee terms SNAPSHOT, frozen when this RENT charge was minted and
  // already clamped to the jurisdiction cap. applyLateFees reads THESE, never
  // the live lease. 0 means "no fee was in force for this period", which is
  // what makes configuring a fee in August non-retroactive.
  lateFeeCents     Int     @default(0)
  lateFeeGraceDays Int     @default(5)
  lateFeePolicyId  String?
  /// Set when money received on or before grace-end fully covered this rent.
  /// Blocks late-fee minting; cleared if that payment is returned or voided.
  lateFeeSuppressedByPaymentId String?

  // NEW: void metadata (denormalized head of ChargeStatusHistory)
  voidedAt       DateTime?
  voidedByUserId String?
  voidReason     ChargeVoidReason?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  lease         Lease                 @relation(fields: [leaseId], references: [id])
  allocations   PaymentAllocation[]
  statusHistory ChargeStatusHistory[]

  @@unique([leaseId, type, periodKey])   // UNCHANGED. Nullable periodKey is load-bearing.
  @@index([orgId])
  @@index([leaseId, status])
  @@index([dueDate])
  @@index([type, status, dueDate])       // NEW: the applyLateFees scan
}

/// APPEND-ONLY. No updatedAt by design. Same contract as MaintenanceStatusHistory.
model ChargeStatusHistory {
  id                   String        @id @default(cuid())
  chargeId             String
  orgId                String
  fromStatus           ChargeStatus?
  toStatus             ChargeStatus
  fromAmountCents      Int?
  toAmountCents        Int?
  amountPaidCentsAfter Int
  actorUserId          String?       // null = the worker tick
  reason               String?
  createdAt            DateTime      @default(now())

  charge Charge @relation(fields: [chargeId], references: [id], onDelete: Cascade)

  @@index([chargeId, createdAt])
  @@index([orgId, createdAt])
}
```

Naming: `ChargeStatusHistory`, not C's `ChargeEvent`. CLAUDE.md names "status-history tables" as the append-only class, and `MaintenanceStatusHistory` is the shipped precedent. The amount columns ride along.

### 1.4 Payment

```prisma
model Payment {
  id                  String          @id @default(cuid())
  orgId               String
  leaseId             String                        // WAS nullable, now REQUIRED
  payerUserId         String?
  recordedByUserId    String?                       // NEW
  provider            PaymentProvider
  method              PaymentMethod                 // WAS String?
  status              PaymentStatus

  amountCents         Int
  allocatedCents      Int             @default(0)   // NEW: signed sum of its allocations
  refundedCents       Int             @default(0)   // NEW: fills the PARTIALLY_REFUNDED hole
  applicationFeeCents Int             @default(0)
  currency            String          @default("usd")

  /// Value date: when the money reached the landlord. For OFFLINE this is a
  /// civil date at UTC midnight (same convention as Lease.startDate). Distinct
  /// from createdAt, which is when the row was typed in. THIS is what late-fee
  /// suppression reads.
  receivedAt          DateTime                      // NEW
  /// Check number, money order number, Zelle confirmation. NOT unique: two
  /// tenants at two banks legitimately write check #101.
  reference           String?                       // NEW
  note                String?                       // NEW
  providerRef         String?                       // pi_...; no longer globally @unique
  providerChargeRef   String?
  failureCode         String?                       // R01, R02, NSF, ...
  failureMessage      String?                       // NEW

  settledAt           DateTime?                     // RENAMED from paidAt
  returnedAt          DateTime?                     // NEW
  voidedAt            DateTime?                     // NEW
  voidedByUserId      String?                       // NEW
  voidReason          String?                       // NEW
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  lease       Lease               @relation(fields: [leaseId], references: [id])
  allocations PaymentAllocation[]

  @@unique([provider, providerRef])   // WAS @unique on providerRef alone
  @@index([orgId, receivedAt])
  @@index([leaseId, receivedAt])
  @@index([leaseId, status])
}
```

The global unique on `providerRef` is why the audit says it cannot hold a check number. It never should have: check numbers go in `reference` (deliberately not unique), and `(provider, providerRef)` keeps `pi_...` unique per provider while nullable `providerRef` lets unlimited OFFLINE rows coexist.

No `PENDING` status (C's "check in hand, not deposited"). An offline payment is `SETTLED` when recorded. That is one fewer state for a pilot landlord to reason about, and M6's `PROCESSING` already covers funds-in-flight.

**Credit is derived, never stored twice:** `creditCents = amountCents - allocatedCents - refundedCents`, and the CHECK constraint in 1.7 makes it impossible for that to go negative.

### 1.5 PaymentAllocation (append-only, reversible)

```prisma
model PaymentAllocation {
  id          String         @id @default(cuid())
  paymentId   String
  chargeId    String
  orgId       String                                // NEW: scoping + index locality
  kind        AllocationKind @default(APPLY)
  amountCents Int                                   // APPLY > 0, REVERSE < 0
  reason      String?                               // REVERSE: RETURNED|VOIDED|REFUNDED|CHARGE_VOIDED
  createdAt   DateTime       @default(now())

  payment Payment @relation(fields: [paymentId], references: [id])
  charge  Charge  @relation(fields: [chargeId], references: [id])

  @@unique([paymentId, chargeId, kind])   // NEW
  @@index([chargeId, kind])
  @@index([paymentId])
}
```

This is Design C's shape and it is better than Design B's `reversedAt`. The audit asked for `@@unique([paymentId, chargeId])`; that unique forbids ever un-applying, which makes an ACH return unrepresentable. Adding `kind` to the key gives at most one APPLY and at most one REVERSE per pair, which is simultaneously the append-only guarantee and the idempotency guard on a redelivered return webhook. Every M1 unwind is all-or-nothing, so one REVERSE per pair is sufficient.

Consequence: `Charge.amountPaidCents == SUM(allocations.amountCents)` and `Payment.allocatedCents == SUM(allocations.amountCents)` become plain checkable sums with no filter predicate.

### 1.6 LedgerEntry and IdempotencyKey

```prisma
model LedgerEntry {
  seq                 BigInt            @default(autoincrement())
  id                  String            @id @default(cuid())
  groupId             String                          // NEW: one per postLedgerTx call
  accountType         LedgerAccountType
  accountId           String
  type                LedgerEntryType
  amountCents         Int                             // stays int4: a single entry that large is a bug
  runningBalanceCents BigInt                          // CHANGED: Int -> BigInt (int4 -> int8)
  currency            String            @default("usd")
  description         String
  leaseId             String?                         // NEW
  chargeId            String?                         // NEW
  paymentId           String?
  jobId               String?
  milestoneId         String?
  escrowIntentId      String?
  stripeRef           String?
  reversalOfId        String?           @unique
  createdAt           DateTime          @default(now())

  @@index([accountType, accountId, seq])
  @@index([groupId])                                   // NEW: the balanced-group invariant
  @@index([leaseId, seq])                              // NEW
  @@index([chargeId])                                  // NEW
  @@index([jobId])
  @@index([paymentId])
}

model IdempotencyKey {
  key          String   @id     // always "{scope}:{orgId}:{clientKey}"
  scope        String
  responseJson Json?
  expiresAt    DateTime?        // NEW: the tick prunes rather than growing forever
  createdAt    DateTime @default(now())

  @@index([expiresAt])          // NEW
}
```

`groupId` is what makes the balancing invariant enforceable rather than aspirational: `SELECT "groupId", SUM("amountCents") FROM "LedgerEntry" GROUP BY 1 HAVING SUM("amountCents") <> 0` must return zero rows, forever.

I did not add `allocationId`. `groupId` plus `chargeId` plus `paymentId` already identifies every row's provenance.

### 1.7 CHECK constraints (raw SQL; Prisma cannot express these)

```sql
ALTER TABLE "Charge"
  ADD CONSTRAINT "Charge_amount_positive"    CHECK ("amountCents" > 0),
  ADD CONSTRAINT "Charge_paid_nonneg"        CHECK ("amountPaidCents" >= 0),
  ADD CONSTRAINT "Charge_paid_within_amount" CHECK ("amountPaidCents" <= "amountCents"),
  ADD CONSTRAINT "Charge_latefee_nonneg"     CHECK ("lateFeeCents" >= 0),
  ADD CONSTRAINT "Charge_grace_range"        CHECK ("lateFeeGraceDays" BETWEEN 0 AND 60);

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amount_positive"   CHECK ("amountCents" > 0),
  ADD CONSTRAINT "Payment_allocated_nonneg"  CHECK ("allocatedCents" >= 0),
  ADD CONSTRAINT "Payment_refunded_nonneg"   CHECK ("refundedCents" >= 0),
  ADD CONSTRAINT "Payment_not_oversubscribed"
      CHECK ("allocatedCents" + "refundedCents" <= "amountCents");

ALTER TABLE "PaymentAllocation"
  ADD CONSTRAINT "PaymentAllocation_sign_matches_kind" CHECK (
    ("kind" = 'APPLY' AND "amountCents" > 0) OR ("kind" = 'REVERSE' AND "amountCents" < 0));

ALTER TABLE "Lease"
  ADD CONSTRAINT "Lease_rent_nonneg"    CHECK ("monthlyRentCents" >= 0),
  ADD CONSTRAINT "Lease_latefee_nonneg" CHECK ("lateFeeCents" >= 0),
  ADD CONSTRAINT "Lease_dueday_range"   CHECK ("rentDueDay" BETWEEN 1 AND 28);
```

`Charge_paid_within_amount` and `Payment_not_oversubscribed` are the teeth. Over-allocation and refunding more than was taken in become Postgres errors, so a bug in `payments.ts` is a 500 rather than fabricated money on a tenant's phone.

Prisma's diff engine does not emit `DROP CONSTRAINT` for constraints it cannot see, so these survive `migrate dev`. Do not trust that: the test list includes a `pg_constraint` assertion scoped to `current_schema()`.

### 1.8 Migration plan

Three files, applied by `prisma migrate deploy` in `scripts/render-start.mjs`.

**`20260803120000_m1_money_enums/migration.sql`** (enums alone; Postgres forbids *using* an enum value added in the same transaction, and migration 3 inserts `'TENANT_LEASE'` rows)

```sql
ALTER TYPE "PaymentStatus" RENAME VALUE 'SUCCEEDED' TO 'SETTLED';
ALTER TYPE "PaymentStatus"     ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "PaymentStatus"     ADD VALUE IF NOT EXISTS 'VOIDED';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'TENANT_LEASE';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'LANDLORD_RECEIVABLE';
ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'LANDLORD_TENANT_CREDIT';
ALTER TYPE "LedgerEntryType"   ADD VALUE IF NOT EXISTS 'CHARGE_ACCRUED';
ALTER TYPE "LedgerEntryType"   ADD VALUE IF NOT EXISTS 'PAYMENT_RETURN';
ALTER TYPE "LedgerEntryType"   ADD VALUE IF NOT EXISTS 'CREDIT_ISSUED';
ALTER TYPE "LedgerEntryType"   ADD VALUE IF NOT EXISTS 'CREDIT_APPLIED';
CREATE TYPE "PaymentMethod"    AS ENUM ('CASH','CHECK','MONEY_ORDER','BANK_TRANSFER','CARD','US_BANK_ACCOUNT','OTHER');
CREATE TYPE "AllocationKind"   AS ENUM ('APPLY','REVERSE');
CREATE TYPE "ChargeVoidReason" AS ENUM ('ENTERED_IN_ERROR','WAIVED','AUTO_NOT_LATE','LEASE_ENDED');
```

The `SUCCEEDED` rename is free: `grep -rn SUCCEEDED src prisma tests scripts` returns nothing outside the schema. It stops the `if (status === "SUCCEEDED") return "done"` shortcut before anyone writes it, which is exactly the shortcut ACH breaks.

**`20260803120100_m1_money_loop/migration.sql`** (tables, columns, indexes, CHECKs). `Payment`, `PaymentAllocation`, and `LedgerEntry` are empty today, so the destructive parts are free:

```sql
-- Free while empty: no rewrite, no overflow risk, no NOT NULL backfill needed.
ALTER TABLE "LedgerEntry" ALTER COLUMN "runningBalanceCents" TYPE BIGINT;
ALTER TABLE "LedgerEntry" ADD COLUMN "groupId" TEXT NOT NULL,
                          ADD COLUMN "leaseId" TEXT,
                          ADD COLUMN "chargeId" TEXT;

DROP INDEX IF EXISTS "Payment_providerRef_key";
ALTER TABLE "Payment" DROP COLUMN "method",
                      DROP COLUMN "paidAt",
                      ADD COLUMN "method" "PaymentMethod" NOT NULL,
                      ADD COLUMN "settledAt"  TIMESTAMP(3),
                      ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL,
                      /* ...allocatedCents, refundedCents, reference, note, ... */;
ALTER TABLE "Payment" ALTER COLUMN "leaseId" SET NOT NULL;
CREATE UNIQUE INDEX "Payment_provider_providerRef_key" ON "Payment"("provider","providerRef");

-- Late-fee snapshot backfill on EXISTING charges. Only the current period
-- inherits the lease's live terms; everything older is explicitly 0, which is
-- what makes retroactive minting impossible from the first tick after deploy.
UPDATE "Charge" c
SET "lateFeeCents"     = CASE WHEN c."dueDate" >= date_trunc('month', now())
                              THEN LEAST(l."lateFeeCents", 100000) ELSE 0 END,
    "lateFeeGraceDays" = l."lateFeeGraceDays"
FROM "Lease" l WHERE l.id = c."leaseId" AND c.type = 'RENT';
```

`ADD COLUMN ... NOT NULL` with no default on `Payment.receivedAt` and `LedgerEntry.groupId` is safe only because those tables are empty. Guard it: add a preflight to `scripts/render-start.mjs` that aborts loudly if `SELECT count(*) FROM "Payment"` or `FROM "LedgerEntry"` is non-zero before applying. That turns a silent catastrophe into a failed deploy.

**`20260803120200_m1_ledger_accrual_backfill/migration.sql`.** `Charge` has rows, `LedgerEntry` does not, so the per-lease invariant would be false on day one. Every existing charge has `amountPaidCents = 0` (nothing can settle today), so accrual-only is exactly right:

```sql
WITH ordered AS (
  SELECT c.id, c."leaseId", c."orgId", c."amountCents", c.description, c."createdAt",
         -SUM(c."amountCents") OVER (PARTITION BY c."leaseId" ORDER BY c."createdAt", c.id
                                     ROWS UNBOUNDED PRECEDING) AS tenant_running,
          SUM(c."amountCents") OVER (PARTITION BY c."orgId"   ORDER BY c."createdAt", c.id
                                     ROWS UNBOUNDED PRECEDING) AS recv_running
  FROM "Charge" c WHERE c.status <> 'VOID'
)
INSERT INTO "LedgerEntry"
  (id,"groupId","accountType","accountId",type,"amountCents","runningBalanceCents",
   currency,description,"leaseId","chargeId","createdAt")
SELECT gen_random_uuid()::text, 'backfill:'||o.id, 'TENANT_LEASE', o."leaseId",
       'CHARGE_ACCRUED', -o."amountCents", o.tenant_running, 'usd',
       'Backfill: '||o.description, o."leaseId", o.id, o."createdAt" FROM ordered o
UNION ALL
SELECT gen_random_uuid()::text, 'backfill:'||o.id, 'LANDLORD_RECEIVABLE', o."orgId",
       'CHARGE_ACCRUED',  o."amountCents", o.recv_running, 'usd',
       'Backfill: '||o.description, o."leaseId", o.id, o."createdAt" FROM ordered o;
```

Running balances are computed per account by the window functions, so the arbitrary global `seq` interleaving is harmless. Verify with `pnpm db:audit` (read-only) immediately after deploy.

---

## 2. The pure allocation core

### 2.1 Fix `allocateOldestFirst` in place (`src/lib/money.ts`)

It already exists at line 32, already returns `remainderCents`, and has no callers, so this is a free fix. Three defects: no input validation (unlike `feeFromBps` eight lines above, which validates and throws), no status awareness (a VOID charge with `amountPaidCents = 0` absorbs money today), and `sort` on `dueDate` alone is not a total order, so the same $100 lands on rent one day and on the late fee the next depending on Prisma's row order.

```ts
/** Charge shape the allocator needs. Prisma-free: type/status are plain strings. */
export type AllocatableCharge = {
  id: string;
  type: string;
  status: string;
  dueDate: Date;
  amountCents: number;
  amountPaidCents: number;
  createdAt: Date;
};

/**
 * Rank within a tie. RENT before fees is not a preference: applying a tenant's
 * money to late fees first inflates the "rent unpaid" figure that a five-day
 * termination notice is built on, which is the abuse RLTO 5-12-140 exists to
 * curb. Fees settle last, always.
 */
export const ALLOCATION_RANK: Record<string, number> = {
  RENT: 0, UTILITY: 1, OTHER: 2, DEPOSIT: 3, LATE_FEE: 4,
};

export function allocatableOpenCents(c: Pick<AllocatableCharge, "status"|"amountCents"|"amountPaidCents">): number {
  if (c.status === "VOID") return 0;
  return Math.max(0, c.amountCents - c.amountPaidCents);
}

/** Total order. Never returns 0 for two distinct charges. */
export function compareForAllocation(a: AllocatableCharge, b: AllocatableCharge): number {
  return (
    a.dueDate.getTime() - b.dueDate.getTime() ||
    (ALLOCATION_RANK[a.type] ?? 2) - (ALLOCATION_RANK[b.type] ?? 2) ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)          // cuids are lexically time-ordered
  );
}

export function allocateOldestFirst(
  paymentCents: number,
  charges: AllocatableCharge[],
): { allocations: Array<{ chargeId: string; amountCents: number }>; remainderCents: number } {
  if (!Number.isInteger(paymentCents) || paymentCents < 0) {
    throw new Error(`paymentCents must be a non-negative integer, got ${paymentCents}`);
  }
  for (const c of charges) {
    if (!Number.isInteger(c.amountCents) || c.amountCents < 0) {
      throw new Error(`charge ${c.id} amountCents must be a non-negative integer, got ${c.amountCents}`);
    }
    if (!Number.isInteger(c.amountPaidCents) || c.amountPaidCents < 0 || c.amountPaidCents > c.amountCents) {
      throw new Error(`charge ${c.id} amountPaidCents out of range: ${c.amountPaidCents}`);
    }
  }
  let remaining = paymentCents;
  const allocations: Array<{ chargeId: string; amountCents: number }> = [];
  const open = charges.filter((c) => allocatableOpenCents(c) > 0).sort(compareForAllocation);
  for (const charge of open) {
    if (remaining <= 0) break;
    const applied = Math.min(allocatableOpenCents(charge), remaining);
    allocations.push({ chargeId: charge.id, amountCents: applied });
    remaining -= applied;
  }
  return { allocations, remainderCents: remaining };
}
```

Zero is allowed (returns an empty plan), not rejected as Design B has it, because `applyCreditToOpenCharges` legitimately calls this with zero available credit. `recordPayment`'s zod schema rejects zero at the boundary.

The signature widens, so the three fixtures in `tests/unit/money.test.ts` gain `type`, `status`, and `createdAt`. That is a two-line test edit, not a migration.

### 2.2 `src/lib/payments.ts` (new, pure, no Prisma)

```ts
export type Allocation = { chargeId: string; amountCents: number };
export type AllocationPlan = { allocations: Allocation[]; remainderCents: number };

/** Oldest-due-first, rent before fees. The default path. */
export function planAllocation(paymentCents: number, open: AllocatableCharge[]): AllocationPlan;

/**
 * Landlord-directed: "this $500 is the water bill, not rent." Validates every
 * target is open and has room, applies in the given order, then oldest-first
 * for the leftover. Throws AllocationError on unknown, VOID, or over-allocated.
 */
export function planTargetedAllocation(
  paymentCents: number, open: AllocatableCharge[], targets: Allocation[],
): AllocationPlan;
export class AllocationError extends Error {}

/** The charge status implied by its amounts. One definition, used everywhere. */
export function chargeStatusFor(a: { amountCents: number; amountPaidCents: number; voided: boolean }):
  "PENDING" | "PARTIALLY_PAID" | "PAID" | "VOID";

/** Un-apply enough active allocations, NEWEST first, to free `needCents`. */
export function unapplyPlan(
  active: Array<{ chargeId: string; amountCents: number; createdAt: Date }>, needCents: number,
): { reversals: Allocation[]; shortfallCents: number };

export function creditCentsOf(p: { amountCents: number; allocatedCents: number; refundedCents: number }): number;
```

### 2.3 Worked ordering

Lease with open charges: A `LATE_FEE` due Jul 6 ($77.50), B `RENT` due Jul 1 ($1,850), C `RENT` due Aug 1 ($1,850), D `UTILITY` due Aug 1 ($60).

`compareForAllocation` orders B, A, C, D. A $2,000 payment gives B $1,850 (PAID), A $77.50 (PAID), C $72.50 (PARTIALLY_PAID), D nothing, remainder 0. A $4,000 payment allocates $3,837.50 and leaves **$162.50 remainder**, which becomes credit, posts to `LANDLORD_TENANT_CREDIT`, shows in the tenant portal as "credit on your account", and is swept onto the next charge automatically by `applyCreditToOpenCharges(leaseId)` (called at the end of `createOneOffCharge`, and in the tick right after `generateRentCharges`). A payment that exceeds every open charge is not an error and not a rejection: it parks entirely as credit.

---

## 3. `recordPayment()`

### 3.1 Prerequisite: split `postLedger`

`src/lib/services/ledger.ts:50` opens its own transaction, so `recordPayment` cannot mutate charges and post the ledger atomically. Four surgical changes:

1. **Extract the body** into `export async function postLedgerTx(tx: Prisma.TransactionClient, args: PostLedgerArgs): Promise<PostLedgerResult>`. `postLedger` becomes a wrapper that opens the Serializable transaction and calls it. No behavior change for today's zero callers.
2. **Add `groupId`** (a cuid per call, stamped on every row) and **`assertBalanced?: boolean`** defaulting true, which throws unless `postings.reduce((s, p) => s + p.amountCents, 0) === 0`. Every M1 posting is balanced. Future escrow may opt out explicitly.
3. **Narrow the P2002 catch.** Today any unique violation inside the transaction returns `{ posted: false }`, which the caller reads as "already done". A `LedgerEntry_reversalOfId_key` collision must be a 500:

```ts
function isIdempotencyKeyCollision(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== UNIQUE_VIOLATION) return false;
  const t = (e.meta as { target?: string | string[] } | undefined)?.target;
  const names = Array.isArray(t) ? t.map(String) : [String(t ?? "")];
  return names.some((n) => n === "IdempotencyKey_pkey" || n === "key");
}
```

4. **Jittered backoff in `withRetry`.** It currently retries with no delay, so five attempts burn in under a millisecond and the contended writer loses every time. `await sleep(10 * 2 ** attempt + Math.random() * 20)`.

Running balances accumulate in `bigint`. Add one boundary helper, because `JSON.stringify` rejects `bigint`:

```ts
export function centsFromBigInt(v: bigint): number {
  if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(-Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Ledger balance ${v} exceeds safe integer range`);
  }
  return Number(v);
}
```

Also extend `reversalPosting` in `src/lib/ledger.ts` to take a type override, so a return posts `PAYMENT_RETURN` rather than `REVERSAL` while still setting `reversalOfId`.

**Rule on `reversalOfId`, stated once:** it is used only when an event is being declared not to have happened, that is payment void and payment return, and each original entry is reversed at most once. Charge void reverses its own accrual group (also once). Everything else (credit apply, un-apply for refund, charge correction, late-fee reinstate) posts a **fresh balanced pair**, never a reversal of a reversal. This is exactly the trap the over-broad P2002 catch was hiding.

### 3.2 Signature

```ts
// src/lib/services/payments.ts
export type RecordPaymentInput = {
  leaseId: string;
  amountCents: number;
  /** Civil date the money arrived, "YYYY-MM-DD" parsed to UTC midnight. */
  receivedAt: Date;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
  targets?: Allocation[];          // omit for oldest-first
  confirmDuplicate?: boolean;
  idempotencyKey: string;          // client uuid, minted on form mount
};

export type RecordPaymentResult = {
  replayed: boolean;
  payment: { id: string; amountCents: number; creditCents: number; receivedAt: Date; status: string };
  applied: Array<{ chargeId: string; description: string; amountCents: number; newStatus: string }>;
  lateFeesWaived: Array<{ chargeId: string; amountCents: number }>;
  balanceCents: number;            // lease balance after, net of credit
};

export async function recordPayment(ctx: OrgCtx, input: RecordPaymentInput): Promise<RecordPaymentResult>;
```

`ctx` comes from `requireOrgApi()`. `leaseId` is client-supplied but every query is `where: { id: leaseId, orgId: ctx.orgId }`, so a cross-org id reads as 404, matching `src/lib/services/lease.ts`.

### 3.3 Transaction boundary, isolation, idempotency

One `Serializable` transaction, wrapped in `withRetry`, with a per-lease row lock taken first so the common case is a short lock wait rather than a serialization failure and a re-plan.

```ts
export async function recordPayment(ctx, input) {
  const key = `payment.record:${ctx.orgId}:${input.idempotencyKey}`;

  // Pre-check OUTSIDE the transaction. A P2002 inside Postgres aborts the whole
  // transaction, so the replay read cannot live in the aborted transaction.
  const prior = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (prior?.responseJson) return { ...(prior.responseJson as RecordPaymentResult), replayed: true };

  try {
    return await withRetry(() => prisma.$transaction(async (tx) => {
      await tx.idempotencyKey.create({
        data: { key, scope: "payment.record", expiresAt: addDays(new Date(), 30) },
      });

      // Serialize every money write on this lease.
      const [lease] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Lease" WHERE id = ${input.leaseId} AND "orgId" = ${ctx.orgId} FOR UPDATE`;
      if (!lease) throw new NotFoundError("Lease not found.");

      const tz = await orgTimeZone(tx, ctx.orgId);
      const charges = await tx.charge.findMany({
        where: { leaseId: input.leaseId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
        select: { id:true, type:true, status:true, dueDate:true, amountCents:true,
                  amountPaidCents:true, createdAt:true, description:true },
      });

      const plan = input.targets
        ? planTargetedAllocation(input.amountCents, charges, input.targets)
        : planAllocation(input.amountCents, charges);

      const payment = await tx.payment.create({ data: {
        orgId: ctx.orgId, leaseId: input.leaseId, provider: "OFFLINE", method: input.method,
        status: "SETTLED", amountCents: input.amountCents,
        allocatedCents: input.amountCents - plan.remainderCents,
        receivedAt: input.receivedAt, settledAt: input.receivedAt,
        reference: input.reference ?? null, note: input.note ?? null,
        recordedByUserId: ctx.userId, currency: "usd" } });

      for (const a of plan.allocations) {
        const before = byId.get(a.chargeId)!;
        await tx.paymentAllocation.create({ data: {
          paymentId: payment.id, chargeId: a.chargeId, orgId: ctx.orgId,
          kind: "APPLY", amountCents: a.amountCents } });
        // Optimistic compare-and-set: drift becomes impossible even if someone
        // later downgrades the isolation level.
        const res = await tx.charge.updateMany({
          where: { id: a.chargeId, orgId: ctx.orgId, amountPaidCents: before.amountPaidCents },
          data: { amountPaidCents: before.amountPaidCents + a.amountCents,
                  status: chargeStatusFor({ amountCents: before.amountCents,
                    amountPaidCents: before.amountPaidCents + a.amountCents, voided: false }) },
        });
        if (res.count !== 1) throw new Prisma.PrismaClientKnownRequestError(
          "charge changed", { code: "P2034", clientVersion: "" });   // force the retry
        await tx.chargeStatusHistory.create({ data: { /* from/to status, amountPaidCentsAfter */ } });
      }

      const lateFeesWaived = await reconcileLateFees(tx, input.leaseId, tz, new Date(), ctx.userId);
      await postLedgerTx(tx, { postings: buildPaymentPostings(...), idempotencyKey: `payment:${payment.id}:settled` });

      const result = { ... };
      await tx.idempotencyKey.update({ where: { key }, data: { responseJson: result } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000, maxWait: 5_000 }));
  } catch (e) {
    if (isIdempotencyKeyCollision(e)) {
      const row = await prisma.idempotencyKey.findUnique({ where: { key } });
      if (row?.responseJson) return { ...(row.responseJson as RecordPaymentResult), replayed: true };
      throw new ConflictError("This payment is still being recorded. Try again in a moment.");
    }
    throw e;
  }
}
```

Serializable is the braces, `FOR UPDATE` is the belt, compare-and-set is the suspenders, and `Charge_paid_within_amount` is the last line. Belt and suspenders on money is not over-engineering: a lost update here tells a tenant they owe rent they paid.

`audit()` and `notify()` run **outside** the transaction. A Resend outage must never roll back a recorded payment.

**Idempotency keys.** All namespaced `{scope}:{orgId}:{clientKey}`, which closes the global-PK hole where org A's key `"1"` silently no-ops org B's payment. Client-supplied only for `payment.record` and `charge.create`; every other key is derived from the domain event (`payment:{id}:settled`, `payment:{id}:returned`, `charge:{id}:void:{historyId}`, `charge:{id}:reinstate:{historyId}`), because a random key would re-post on every Serializable retry. Nested `postLedgerTx` calls inside `recordPayment` use derived keys; the outer key plus the transaction covers the rest.

**Natural-key soft guard**, because a fresh page load mints a fresh uuid and the strict key cannot catch that: before creating, look for a live payment on the same lease with the same `amountCents` and same non-null `reference` within 24 hours. If found, return 409 with `{ error, duplicateOf }`; the UI says "You recorded a $1,850.00 check #1234 an hour ago. Record it again?" and retries with `confirmDuplicate: true`. Warn, never block.

The tick prunes `IdempotencyKey` rows past `expiresAt`, `take: 1000` per pass.

### 3.4 Exact ledger postings

Sign convention, unchanged from `src/lib/ledger.ts`: positive credits the account, negative debits it. On `TENANT_LEASE`, negative means the tenant owes. Every group sums to zero. Lease `L1` in org `O1`, rent $1,850.00.

**(a) Charge accrued** (tick or one-off; key `charge:{id}:created`)

| accountType | accountId | type | amountCents |
|---|---|---|---|
| `TENANT_LEASE` | L1 | `CHARGE_ACCRUED` | `-185000` |
| `LANDLORD_RECEIVABLE` | O1 | `CHARGE_ACCRUED` | `+185000` |

**(b) Full payment**, $1,850 check (key `payment:{id}:settled`)

| accountType | accountId | type | amountCents | description |
|---|---|---|---|---|
| `TENANT_LEASE` | L1 | `RENT_PAYMENT` | `+185000` | Check 1234 applied to Rent for August 2026 |
| `LANDLORD_RECEIVABLE` | O1 | `RENT_PAYMENT` | `-185000` | Payment from Ada Byron, Unit 2 at 4200 N Kedzie |

`TENANT_LEASE` returns to 0. No `LANDLORD_ORG` leg: the check went to the landlord's own bank and never entered platform custody. **M6 adds legs here, it does not change these.**

**(c) Partial**, $900: same two rows at `+90000` / `-90000`. Charge to `PARTIALLY_PAID`, `TENANT_LEASE = -95000`.

**(d) Overpayment**, $2,000 against $1,850 open. One group, four rows:

| accountType | accountId | type | amountCents |
|---|---|---|---|
| `TENANT_LEASE` | L1 | `RENT_PAYMENT` | `+185000` |
| `LANDLORD_RECEIVABLE` | O1 | `RENT_PAYMENT` | `-185000` |
| `TENANT_LEASE` | L1 | `CREDIT_ISSUED` | `+15000` |
| `LANDLORD_TENANT_CREDIT` | O1 | `CREDIT_ISSUED` | `-15000` |

`TENANT_LEASE = +15000` (tenant is ahead), `LANDLORD_TENANT_CREDIT = -15000` (a liability the org owes back). Later, when September rent accrues (group a) and the credit is swept (key `credit:{allocationId}`):

| accountType | accountId | type | amountCents |
|---|---|---|---|
| `LANDLORD_TENANT_CREDIT` | O1 | `CREDIT_APPLIED` | `+15000` |
| `LANDLORD_RECEIVABLE` | O1 | `CREDIT_APPLIED` | `-15000` |

No `TENANT_LEASE` leg, correctly: that account already netted `+15000 - 185000 = -170000`, matching an open balance of $1,700 with no double count.

**(e) Payment void** (entered in error; key `payment:{id}:voided`). Reverse each entry of the settlement group via `reversalPosting(entry, desc, "REVERSAL")`, setting `reversalOfId`. Write a `REVERSE` allocation row per active APPLY, decrement each charge with compare-and-set, append `ChargeStatusHistory`, set `status = VOIDED`, `allocatedCents = 0`, clear any `lateFeeSuppressedByPaymentId` this payment set, then run `reconcileLateFees`.

**(f) Refund** of held credit, $150 by check (key `refund:{paymentId}:{clientUuid}`). The receipt was real, so nothing is reversed. A new dated event:

| accountType | accountId | type | amountCents |
|---|---|---|---|
| `LANDLORD_TENANT_CREDIT` | O1 | `REFUND` | `+15000` |
| `TENANT_LEASE` | L1 | `REFUND` | `-15000` |

`refundedCents += 15000`; status to `PARTIALLY_REFUNDED` or `REFUNDED`. Refunding beyond held credit runs `unapplyPlan` newest-first (each un-apply posting a fresh balanced pair that re-opens the charge and issues credit) and is gated behind an explicit `reopenCharges: true` flag with a UI confirmation.

**(g) ACH return / bounced check** (key `payment:{id}:returned`). Economically distinct from (e): the money really arrived and really left, on two different dates. Using `REVERSAL` here would claim the receipt was a mistake and would burn the once-only `reversalOfId` slot.

| accountType | accountId | type | amountCents | reversalOfId | description |
|---|---|---|---|---|---|
| `TENANT_LEASE` | L1 | `PAYMENT_RETURN` | `-185000` | (b) tenant leg | Check 1234 returned (insufficient funds) on Aug 19 |
| `LANDLORD_RECEIVABLE` | O1 | `PAYMENT_RETURN` | `+185000` | (b) org leg | Returned payment from Ada Byron, Unit 2 |

Order inside the transaction, because each step reads what the previous wrote: lock the payment `FOR UPDATE` and refuse if already `RETURNED`/`VOIDED` (the primary idempotency guard); write `REVERSE` allocation rows for every APPLY with no matching REVERSE (the `@@unique([paymentId, chargeId, kind])` makes a double-delivered webhook crash rather than double-reverse); decrement charges with compare-and-set and append `ChargeStatusHistory`; set `status = RETURNED`, `returnedAt`, `failureCode`, `failureMessage`, `allocatedCents = 0`; clear `lateFeeSuppressedByPaymentId` and run `reconcileLateFees` (which reinstates the rescinded fee); post the ledger group **last**, computed from the final state; notify outside the transaction.

`voidPayment` and `returnPayment` share one implementation, `unapplyAndClose(tx, paymentId, { toStatus, ledgerType, reason })`. That matters more than it looks: **the ACH return path is exercised by every offline void in every test run, months before Stripe ships.**

An NSF fee, if the lease provides for one, is a plain one-off `OTHER` charge created by the landlord. No special case, no new `ChargeType`, and Illinois' bad-check fee limits are a jurisdiction-registry concern, not a code branch.

---

## 4. Void, correct, one-off

Both verbs live in `src/lib/services/charges.ts`, both in one Serializable transaction with the lease locked.

**`voidCharge(ctx, chargeId, { reason, note })`.** Refuse if already VOID (409). If `amountPaidCents > 0`, first write `REVERSE` allocations (reason `CHARGE_VOIDED`), which returns that money to the payment's credit and posts a fresh balanced pair, so **funds are never destroyed by voiding a charge**. Then set `status = VOID`, `voidedAt`, `voidedByUserId`, `voidReason`, append `ChargeStatusHistory`, and reverse the charge's accrual group. `periodKey` and `amountCents` are **preserved**, so the row keeps holding its `(leaseId, type, periodKey)` slot and the tick can never resurrect a deliberately voided charge. Finish with `applyCreditToOpenCharges`.

**`correctCharge(ctx, chargeId, { amountCents, description?, reason })`.** This is the fix for "correcting a lease's rent leaves the already-generated charge at the old amount forever". Refuse an amount below `amountPaidCents` with a 409 pointing at the refund path. Compare-and-set the amount, recompute status (lowering an amount can flip `PARTIALLY_PAID` to `PAID`), append `ChargeStatusHistory` with `fromAmountCents`/`toAmountCents`, and post a balanced `ADJUSTMENT` delta:

| accountType | accountId | type | amountCents |
|---|---|---|---|
| `TENANT_LEASE` | L1 | `ADJUSTMENT` | `+10000` |
| `LANDLORD_RECEIVABLE` | O1 | `ADJUSTMENT` | `-10000` |

I am overruling Design B's `supersedesChargeId` amendment chain here. It costs a column, a self-relation, a unique index, and a credit re-application step, and a delta posting achieves the same audit trail in ten lines. The mutation is in the state table; the correction is a new row in the history table and a new balanced pair in the ledger. Both append-only rules hold.

Companion: when `updateLease` changes `monthlyRentCents`, it returns `affectedCharges` (open, current-or-future RENT) and the UI offers "Also update the 1 open charge for August?", routed through `correctCharge`. Opt-in, one click, never silent.

**`createOneOffCharge(ctx, leaseId, input)`.** `periodKey: null` always. **No schema change needed:** the existing `@@unique([leaseId, type, periodKey])` with nullable `periodKey` already permits unlimited ad-hoc charges because Postgres treats NULLs as distinct. Do not "fix" it. `lateFeeCents: 0` on every one-off, deliberately: a $200 carpet charge must not spawn its own fee schedule. A hand-typed `LATE_FEE` still goes through the RLTO cap, so the cap cannot be routed around manually. Posts the accrual group, then `applyCreditToOpenCharges`, then notifies the tenant outside the transaction. Landlords adding charges silently is how tenant trust dies.

The UI never says "void". It says **Remove this charge** with a reason picker, and **Correct the amount**.

---

## 5. Late-fee suppression (the crux)

Everything here is civil-date math in the org's zone. New `src/lib/tz.ts`, no dependency:

```ts
const CACHE = new Map<string, Intl.DateTimeFormat>();
/** UTC midnight of the civil date `instant` falls on in `timeZone`. */
export function civilDayUTC(instant: Date, timeZone: string): Date {
  let f = CACHE.get(timeZone);
  if (!f) { f = new Intl.DateTimeFormat("en-CA", { timeZone, year:"numeric", month:"2-digit", day:"2-digit" }); CACHE.set(timeZone, f); }
  return new Date(`${f.format(instant)}T00:00:00.000Z`);
}
```

`isOverdue`, `daysLate`, `lateFeeForRent`, and `summarizeBilling` in `src/lib/charges.ts` all take a `timeZone` parameter, replacing the private `startOfDayUTC`. This also fixes `getOrgLateRent` (`src/lib/services/charges.ts:169`), whose raw `dueDate: { lt: asOf }` is why a charge enters the landlord's queue seconds after creation rendered "0 days late": it becomes `dueDate: { lt: civilDayUTC(asOf, org.timeZone) }`, the same day-granular rule the tenant portal uses. Landlord and tenant now agree by construction, not by coincidence.

### The rule, stated once

> **A late fee is owed if and only if the rent charge was not fully covered by money whose `receivedAt` civil date fell on or before the end of the grace period.**

The question is never "is it paid now" and never "when was it entered". It is "when did the money arrive".

```ts
// src/lib/charges.ts (pure)
export type Settlement = { receivedDay: Date; amountCents: number };

/** Earliest day cumulative settlements covered the charge, or null. Ordered by receivedDay. */
export function paidInFullDay(rent: { amountCents: number }, s: Settlement[]): Date | null;

export type LateFeeVerdict =
  | { verdict: "NO_FEE" }                                  // snapshot is 0
  | { verdict: "WITHIN_GRACE" }
  | { verdict: "SUPPRESS"; byPaymentId: string }
  | { verdict: "RESCIND"; byPaymentId: string }
  | { verdict: "REINSTATE" }
  | { verdict: "OWED"; spec: ChargeSpec };

export function lateFeeDecision(
  rent: { id: string; amountCents: number; dueDate: Date; periodKey: string | null;
          lateFeeCents: number; lateFeeGraceDays: number },   // SNAPSHOT, never the live lease
  settlements: Settlement[],
  existingFee: { id: string; status: string; voidReason: string | null } | null,
  opts: { timeZone: string; asOf: Date },
): LateFeeVerdict;
```

Decision order:

```
1. rent.lateFeeCents === 0                                  -> NO_FEE
2. graceEnd = dueDate + rent.lateFeeGraceDays                (civil day, inclusive)
3. paidDay = paidInFullDay(rent, settlements)
   paidDay !== null && paidDay <= graceEnd                  -> SUPPRESS, or RESCIND if a live fee exists
4. civilToday <= graceEnd                                   -> WITHIN_GRACE
5. existingFee?.status === "VOID"
   && existingFee.voidReason === "AUTO_NOT_LATE"            -> REINSTATE
6. existingFee                                              -> WITHIN_GRACE (already assessed, nothing to do)
7. otherwise                                                -> OWED
```

Note step 3 compares against `amountCents`, not `amountPaidCents`: **the rent must be fully covered by money that arrived on time.** Two on-time partials that together cover it do suppress. An on-time partial plus a late remainder does not: the rent genuinely was late.

### Rule at generation: a charge born late never carries a fee

This is the onboarding blocker, and it is fixed **before any payment exists**. When `generateRentCharges` mints a RENT charge, it snapshots the terms, clamped to the jurisdiction cap, and zeroes them if the charge is being created after its own grace window already closed:

```ts
export function lateFeeSnapshotFor(
  lease: Pick<LeaseForBilling, "lateFeeCents"|"lateFeeGraceDays"|"monthlyRentCents">,
  dueDate: Date, createdAt: Date, timeZone: string, policy: LateFeePolicy,
): { lateFeeCents: number; lateFeeGraceDays: number; lateFeePolicyId: string } {
  const grace = Math.max(0, lease.lateFeeGraceDays);
  const graceEnd = addDaysUTC(dueDate, grace);
  // A charge that first existed after its own grace closed can never be late:
  // the app was not watching this period and has no evidence the tenant was late.
  const eligible = civilDayUTC(createdAt, timeZone).getTime() <= graceEnd.getTime();
  const cap = policy.maxLateFeeCents(lease.monthlyRentCents);
  const raw = Math.max(0, lease.lateFeeCents);
  return {
    lateFeeCents: eligible ? (cap == null ? raw : Math.min(raw, cap)) : 0,
    lateFeeGraceDays: grace,
    lateFeePolicyId: policy.id,
  };
}
```

A landlord onboarding on August 18 gets the August rent charge (legitimately owed, as the audit correctly notes) with `lateFeeCents = 0`, and `applyLateFees` filters on `lateFeeCents: { gt: 0 }` in SQL, so the tick can never mint one for that period. Fabricating a penalty from the absence of data is the failure mode that makes tenants distrust software. The landlord retains the ability to add the fee manually via `createOneOffCharge`, which carries an actor and passes the RLTO cap.

The same snapshot is why "setting a late fee in August mints one fee for every unpaid past month at once" cannot happen: March through July charges carry `lateFeeCents = 0` forever.

### The `receivedAt`-before-grace case

August rent, due Aug 1, grace 5, fee $77.50. The tick minted the fee on Aug 7, correctly, having no evidence of payment. On **Aug 20** the landlord records the check with `receivedAt = Aug 3`.

`recordPayment` calls `reconcileLateFees(tx, leaseId, tz, asOf, actorUserId)` in the same transaction. It loads each RENT charge on the lease with `lateFeeCents > 0`, builds `settlements` from the net-active allocations of live (not VOIDED/RETURNED/FAILED) payments keyed on `civilDayUTC(payment.receivedAt, tz)`, and runs `lateFeeDecision`. `paidInFullDay = Aug 3 <= graceEnd = Aug 6`, so the verdict is **RESCIND**:

1. Un-apply any allocations sitting on the fee (money returns to credit).
2. Set the fee `status = VOID`, `voidReason = AUTO_NOT_LATE`.
3. Append `ChargeStatusHistory` with reason `"Rent was paid in full on Aug 3, within the grace period."`
4. Reverse the fee's accrual group.
5. Set `rent.lateFeeSuppressedByPaymentId = payment.id`.
6. Return it in `RecordPaymentResult.lateFeesWaived`, so the landlord's confirmation toast reads **"Recorded. The $77.50 late fee was removed because the rent was paid within the grace period."** Notify the tenant too.

Nothing about this is silent. Regeneration is impossible because the VOID row still occupies the `(leaseId, LATE_FEE, "2026-08")` unique slot, which is why that unique index stays exactly as it is.

`receivedAt` therefore defaults to today in the UI but sits **above** the amount field, labelled "Date received" with helper text "The day the money reached you, not today." Getting the landlord to fill that in correctly is the single highest-leverage UX decision in M1.

### On a return, suppression is undone

`returnPayment` clears `lateFeeSuppressedByPaymentId` and calls the same `reconcileLateFees`. The returned payment is excluded from `settlements`, `paidInFullDay` is null, today is past grace, and the existing fee is `VOID` with reason `AUTO_NOT_LATE`, so the verdict is **REINSTATE**: status back to `PENDING`, clear `voidedAt`/`voidReason`, append `ChargeStatusHistory { fromStatus: VOID, toStatus: PENDING, reason: "PAYMENT_RETURNED" }`, and post a **fresh** accrual group with key `charge:{feeId}:reinstate:{historyId}`. One function, two directions.

That fresh group is the exact spot where today's over-broad P2002 catch would have failed silently: a naive implementation reverses the reversal, collides on `LedgerEntry_reversalOfId_key`, gets `{ posted: false }`, and leaves the landlord's receivable permanently $77.50 short with nothing in any log.

A fee that was **validly** incurred is never auto-voided. It stays open and allocatable, and the landlord may waive it in one click (`voidCharge`, reason `WAIVED`). Forgiving a fee the landlord is owed is a money decision the app must not make for them.

### `applyLateFees` rewritten

Today: `status: { not: "VOID" }` (which includes fully PAID), no date floor, no `take`, no index, one `findFirst` per row, roughly 2,450 queries per two-minute tick.

```ts
const LATE_FEE_LOOKBACK_DAYS = 62;   // two cycles

const rents = await prisma.charge.findMany({
  where: {
    type: "RENT",
    status: { in: ["PENDING", "PARTIALLY_PAID"] },   // was: not VOID, i.e. included PAID
    lateFeeCents: { gt: 0 },                         // snapshot, not the live lease
    lateFeeSuppressedByPaymentId: null,
    dueDate: { gte: floor, lt: todayInOrgZone },      // date floor
  },
  orderBy: { dueDate: "asc" },
  take: 500,
  select: { /* id, leaseId, orgId, periodKey, amounts, dueDate, snapshot */ },
});
// ONE batched findMany for existing LATE_FEE rows, then one createMany({ skipDuplicates: true }),
// then one re-select to post the accrual groups.
```

Backed by the new `@@index([type, status, dueDate])`. Three queries per tick instead of 2,450, and on 99.9 percent of ticks zero fees are created. `generateRentCharges` gets the same batching treatment.

I am **not** adding Design C's `lateFeeAssessedAt` claim marker. The batched existence query plus the date floor plus `take` already bounds the work, and the marker introduces a fourth piece of state (stamped, unstamped, cleared on grace crossing) that C's own text visibly struggles to specify.

### Proration

```ts
export function rentChargeForPeriod(lease: LeaseForBilling, asOf: Date, timeZone: string): ChargeSpec | null {
  // ...existing ACTIVE / rent > 0 / period-overlap guards unchanged...
  const monthStart  = new Date(Date.UTC(year, month, 1));
  const monthEnd    = new Date(Date.UTC(year, month + 1, 0));
  const periodStart = maxDate(monthStart, civilDayUTC(lease.startDate, timeZone));
  const periodEnd   = lease.endDate ? minDate(monthEnd, civilDayUTC(lease.endDate, timeZone)) : monthEnd;

  const daysInMonth = monthEnd.getUTCDate();
  const billedDays  = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86_400_000) + 1;
  const prorated    = billedDays < daysInMonth;
  const amountCents = prorated ? Math.round((lease.monthlyRentCents * billedDays) / daysInMonth)
                               : lease.monthlyRentCents;

  // A lease starting Aug 15 must not be billed with an Aug 1 due date.
  const nominalDue = rentDueDate(year, month, lease.rentDueDay);
  const dueDate    = periodStart > nominalDue ? periodStart : nominalDue;

  return { periodKey: periodKeyOf(monthStart), dueDate, periodStart, periodEnd,
           proratedDays: prorated ? billedDays : null, amountCents,
           description: prorated
             ? `Rent for ${MONTHS[month]} ${year} (prorated, ${billedDays} of ${daysInMonth} days)`
             : `Rent for ${MONTHS[month]} ${year}` };
}
```

Actual days of the actual month, `Math.round` half-up, not configurable in M1. Documented in a code comment as a deliberate constant, so the first landlord who wants a 30-day divisor gets a real conversation rather than a hidden setting. No `prorateFirstMonth` booleans (overruling C): two more columns to serve a preference nobody has expressed.

### Lease lifecycle, because rent depends on it

`src/lib/services/invite.ts:386` is the only line that sets a lease ACTIVE, and `generateRentCharges` selects `where: { status: "ACTIVE" }`, so a tenant who never clicks the invite means rent is never generated. `leaseUpdateSchema` already accepts `status` and `updateLease` already writes it, so the gap is a service verb and a button.

- **`activateLease(ctx, leaseId)`**: DRAFT to ACTIVE, set `activatedAt`, set `Unit.status = OCCUPIED`, and generate the current period's charge immediately so the landlord sees the effect (subject to the born-late snapshot rule above).
- **`endLease(ctx, leaseId, { endDate, reason })`**: ACTIVE to ENDED, set `endDate`/`endedAt`/`endReason` (`rentChargeForPeriod` already respects `endDate`, so billing stops), set `Unit.status = VACANT`, and report the outstanding balance rather than silently dropping it. This is what `deleteProperty`'s "End or delete them first" (`src/lib/services/property.ts:165`) has been assuming exists.

---

## 6. The RLTO late-fee cap

### Where it lives

`src/lib/jurisdiction.ts`, pure, and nothing else in the codebase ever mentions Chicago.

```ts
import { feeFromBps } from "@/lib/money";

export type LateFeePolicy = {
  id: string;                                          // "IL:CHICAGO"
  label: string;
  citation: string;                                    // "Chicago RLTO 5-12-140(h)"
  citationUrl: string;
  maxLateFeeCents(monthlyRentCents: number): number | null;   // null = no cap on file
  explain(monthlyRentCents: number): string;
};

const CHICAGO_RLTO: LateFeePolicy = {
  id: "IL:CHICAGO",
  label: "Chicago, Illinois",
  citation: "Chicago RLTO 5-12-140(h)",
  citationUrl: "https://codelibrary.amlegal.com/codes/chicago/latest/chicago_il/0-0-0-2640169",
  // $10 on the first $500 of monthly rent, plus 5% of the amount above $500.
  maxLateFeeCents(rent) {
    if (rent <= 0) return 0;
    return rent <= 50_000 ? 1_000 : 1_000 + feeFromBps(rent - 50_000, 500);
  },
  explain(rent) {
    return `Chicago caps late fees at ${formatCents(this.maxLateFeeCents(rent)!)} for ` +
           `${formatCents(rent)} rent: $10 on the first $500, plus 5% above that.`;
  },
};

const NO_CAP: LateFeePolicy = { id: "US:DEFAULT", /* maxLateFeeCents: () => null */ ... };

const REGISTRY: Record<string, LateFeePolicy> = { "IL:CHICAGO": CHICAGO_RLTO };

/** Property.rentRegulation overrides inference; "NONE" asserts an exemption. */
export function lateFeePolicyFor(loc: { state: string | null; city: string | null; override?: string | null }): LateFeePolicy {
  if (loc.override === "NONE") return NO_CAP;
  if (loc.override && REGISTRY[loc.override]) return REGISTRY[loc.override];
  if (!loc.state || !loc.city) return NO_CAP;
  return REGISTRY[`${loc.state.trim().toUpperCase()}:${loc.city.trim().toUpperCase()}`] ?? NO_CAP;
}
```

Check: $1,850 rent gives `1000 + feeFromBps(135000, 500) = 1000 + 6750 = 7750` = **$77.50**. Computed with the existing validated basis-points helper, per the money convention, not an open-coded percentage.

### Enforced at three points, from one function

**Validation (409, honest surface).** In `updateLease`, resolved against the **merged** result the way the existing start/end date check already works, so raising rent from $500 to $1,850 with a $150 fee already on file is caught at the moment it becomes non-compliant:

> "Chicago caps the late fee at $77.50 for $1,850.00 rent (RLTO 5-12-140(h)). A higher fee is generally unenforceable and can expose you to tenant remedies. Adjust the fee, or record an exemption on the property."

Silent clamping alone would be worse than no cap: the landlord thinks they have a $150 fee, their signed lease says $150, and the app quietly disagrees. `ConflictError` maps to 409 through `handleServiceError`, and `useRowPatch` in `src/components/ui-inline.tsx` already surfaces the message.

**Generation (clamp, defense in depth).** `lateFeeSnapshotFor` clamps, because leases exist today with `lateFeeCents` up to $1,000,000 (`dollarsField` in `src/lib/validation/property.ts:24` maxes at 1,000,000), seed data exists, and a policy can tighten later. The generator must never emit an illegal charge whatever the stored value says. `Charge.lateFeePolicyId` records which policy did the clamping, so a fee is explainable three years later.

**Display (before the mistake).** The lease panel renders `policy.explain(rent)` under the late-fee row and recomputes as rent changes, so the field help and the rejection message cannot drift apart.

Also: lower `leaseUpdateSchema`'s late-fee ceiling from `dollarsField`'s $1,000,000 to $500. No jurisdiction on earth permits more, and it costs one line.

### The exemption

RLTO 5-12-020 exempts owner-occupied buildings of six units or fewer. Hard-blocking an exempt landlord is us being wrong in their face, which is why I am overruling Design C's no-override stance. `Property.rentRegulation = "NONE"`, set from the property details card behind a checkbox reading **"This building is exempt from the Chicago RLTO (owner-occupied, six units or fewer)"**, recorded in `AuditLog` with actor and timestamp, and surfaced on the lease panel as "RLTO exemption asserted for this building". The app records the landlord's assertion; it does not adjudicate it.

Two things that keep this honest: the copy says "generally unenforceable" and cites the ordinance rather than asserting a specific remedy figure, and this 40-line file should be read by counsel before the pilot. It is legal-adjacent product logic, and the design's job is to make it one small pure file a lawyer can read.

**Jurisdiction-awareness.** Adding Evanston or Oak Park is one object literal plus one test. Honest limitation: the registry is code, not data, so a new jurisdiction needs a deploy. At 5 to 10 landlords in one city that is correct. When it stops being correct, `REGISTRY` becomes a table behind the same `lateFeePolicyFor` signature with zero caller changes. Inference failure degrades to `NO_CAP` (permissive), never to a wrong cap.

---

## 7. Drift prevention and detection

**Prevention, five structural layers.** One Serializable transaction wraps every write to `Charge.amountPaidCents`, `PaymentAllocation`, `Payment`, and `LedgerEntry` (there is no code path that writes one without the others); a per-lease `SELECT ... FOR UPDATE` at the top so concurrent writers queue instead of racing; `Charge_paid_within_amount` makes over-allocation a Postgres error; optimistic compare-and-set on every charge update; and `postLedgerTx({ assertBalanced: true })` refuses to write a group that does not sum to zero.

Plus a cheap mechanical guard, a unit test that greps the tree and asserts only `src/lib/services/{payments,charges}.ts` ever writes `amountPaidCents`. A grep test is a weak guard, and it is the honest one available.

**Detection, `src/lib/services/reconcile.ts`.** Four aggregate queries over small tables, run in the tick as `reconcileMoney({ limit: 20 })`, exposed at `GET /api/v1/admin/reconcile` (super-admin) for on-demand investigation, added as a read-only section to `pnpm db:audit` (which is what verifies the accrual backfill right after the M1 deploy), and asserted `toEqual([])` as the final line of every integration test.

- **Q1** `Charge.amountPaidCents` versus `SUM(PaymentAllocation.amountCents)` for that charge.
- **Q2** `Payment.allocatedCents` versus `SUM(PaymentAllocation.amountCents)` for that payment, and `allocatedCents = 0` for VOIDED/RETURNED/FAILED.
- **Q3** the one that matters, per lease: `ledgerBalance(TENANT_LEASE, leaseId)` must equal `SUM(creditCents over live payments) - SUM(chargeOpenCents over non-VOID charges)`. Uses `DISTINCT ON ("accountId") ... ORDER BY "accountId", seq DESC`, which rides the existing `@@index([accountType, accountId, seq])`. This is the whole justification for the charge-first stance: the two representations are numerically pinned to each other.
- **Q4** `SELECT "groupId", SUM("amountCents") FROM "LedgerEntry" GROUP BY 1 HAVING SUM("amountCents") <> 0` must return zero rows. One scan, catches an unbalanced posting anywhere in the system including future escrow code.

`TickSummary` gains `moneyDrift`. Non-zero produces a structured `console.error` with the drifting ids (a Sentry event once M5 lands) plus an IN_APP and EMAIL `Notification` to every `isSuperAdmin` user, deduplicated to one per hour by an `IdempotencyKey` with scope `reconcile.alert`.

**Drift is never auto-repaired.** It halts nothing, because `Charge` is the truth and the tenant-facing balance stays correct, but it raises a loud alert with exact ids. A silent repair destroys the evidence of the bug that caused it, and that bug will recur.

---

## 8. BUILD ORDER

Each numbered step is independently green on `pnpm test && pnpm typecheck && pnpm lint && pnpm build` and merges into `main_property` on its own. Steps 1 to 4 carry zero production risk (no schema, nothing wired). One day is six focused hours.

| # | Files | What | Days |
|---|---|---|---|
| 1 | **new** `src/lib/tz.ts`; **new** `tests/unit/tz.test.ts` | `civilDayUTC`, `addDaysUTC`, DST cases | 0.25 |
| 2 | `src/lib/money.ts`; `tests/unit/money.test.ts` | `AllocatableCharge`, `ALLOCATION_RANK`, `compareForAllocation`, validated `allocateOldestFirst`; update 3 fixtures | 0.25 |
| 3 | **new** `src/lib/jurisdiction.ts`; **new** `tests/unit/jurisdiction.test.ts` | registry, `lateFeePolicyFor`, RLTO math | 0.25 |
| 4 | `src/lib/charges.ts`; **new** `src/lib/payments.ts`; `tests/unit/charges.test.ts`; **new** `tests/unit/payments.test.ts`, `tests/unit/late-fee.test.ts` | tz params, proration, `lateFeeSnapshotFor`, `paidInFullDay`, `lateFeeDecision`, `planAllocation`, `planTargetedAllocation`, `chargeStatusFor`, `unapplyPlan` | 0.5 |
| 5 | `prisma/schema.prisma`; 3 migrations; `scripts/render-start.mjs` preflight | section 1, deploys as a behavioral no-op | 0.5 |
| 6 | `src/lib/ledger.ts`; `src/lib/services/ledger.ts`; **new** `src/lib/accounts.ts`; `tests/unit/ledger.test.ts` | `postLedgerTx`, `groupId`, `assertBalanced`, narrowed P2002, jittered backoff, bigint, `centsFromBigInt`, typed posting builders | 0.5 |
| 7 | `src/lib/services/charges.ts` | batched `generateRentCharges`/`applyLateFees`, snapshot + accrual postings, `getOrgLateRent` tz fix | 0.5 |
| 8 | **new** `src/lib/services/payments.ts`; **new** `src/lib/validation/payment.ts` | `recordPayment`, `applyCreditToOpenCharges`, `reconcileLateFees`, `getLeaseMoney`, `listLeasePayments`. **The milestone closes here.** | 0.75 |
| 9 | `src/lib/services/payments.ts`, `src/lib/services/charges.ts`; **new** `src/lib/validation/charge.ts` | `unapplyAndClose` shared by `voidPayment`/`returnPayment`, `refundPayment`, `voidCharge`, `correctCharge`, `createOneOffCharge` | 0.5 |
| 10 | `src/lib/services/lease.ts`, `src/lib/validation/lease.ts`, `src/lib/services/property.ts` | `activateLease`, `endLease`, RLTO check in `updateLease`, fee ceiling to $500, `rentRegulation` | 0.25 |
| 11 | 11 route files under `src/app/api/v1/landlord/...` plus `admin/reconcile` | thin: `requireOrgApi` to zod to service to JSON to `handleServiceError` | 0.25 |
| 12 | **new** `src/app/(landlord)/landlord/leases/[id]/money/page.tsx`, `src/components/landlord/{lease-money,record-payment-dialog,one-off-charge-form}.tsx`, `src/components/tenant/payment-history.tsx`; edits to `lease-panel.tsx`, tenant `payments/page.tsx`, tenant `dashboard/page.tsx`, `units/[unitId]/page.tsx`, `src/lib/attention.ts` | the money page, the record-payment dialog with `receivedAt` prominent and a live allocation preview, tenant credit line and payment history, late-rent item retargeted to the money page | 0.5 |
| 13 | **new** `src/lib/services/reconcile.ts`; `src/lib/worker/tick.ts`; `scripts/db-audit.ts` | Q1 to Q4, credit sweep, key pruning, `TickSummary.moneyDrift`, super-admin alert | 0.25 |
| 14 | **new** `tests/integration/*.test.ts`; `vitest.config.ts` | gate on `DATABASE_URL_TEST` with `describe.skipIf`, run against `docker compose up -d` | 0.25 |

**Total: 5.5 days.** I am not going to pretend it is 5. If the schedule is hard, cut in this order: the refund path from step 9 (refuse refunds in M1 with an honest "coming soon"), then explicit targeted allocation from steps 4 and 12 (auto-allocate only). That lands at 5.0. I would not cut `PaymentAllocation.kind`, `Payment.receivedAt`, the `Charge` late-fee snapshot, or the born-late guard: those four are what make onboarding a real landlord with a real in-progress lease non-destructive, which is the entire point of the milestone.

---

## 9. Test list

### Pure unit (vitest, no database, runs today)

`tests/unit/money.test.ts` (extend): rejects negative, fractional, and `NaN` `paymentCents`; accepts 0 and returns an empty plan; rejects `amountPaidCents > amountCents`; a VOID charge with `amountPaidCents = 0` absorbs nothing; rent settles before a late fee sharing a due date; identical due date, type, and `createdAt` order by id, stable across 100 shuffles of the input array; exact fit leaves `remainderCents === 0`; the input array is not mutated.

`tests/unit/payments.test.ts` (new): `planAllocation` for full, partial, multi-charge spillover, overpayment, payment exceeding every open charge, empty list; `planTargetedAllocation` honors order, spills leftover oldest-first, and throws `AllocationError` on unknown, VOID, and over-allocated targets; `chargeStatusFor` across 0, partial, exact, and `voided: true`; `unapplyPlan` frees newest-first and reports `shortfallCents`; `creditCentsOf`.

`tests/unit/late-fee.test.ts` (new), the crux: **charge created Aug 18 for an Aug 1 due date with grace 5 snapshots `lateFeeCents: 0`** (the onboarding blocker); `receivedAt` Aug 3 entered Aug 20 with a live fee gives RESCIND; `receivedAt` exactly on grace-end gives SUPPRESS; `receivedAt` grace-end plus one gives OWED; two on-time partials covering the rent give SUPPRESS; one on-time partial plus one late partial gives OWED; a July charge with snapshot 0 while the lease now says $50 gives NO_FEE; existing fee VOID with reason `AUTO_NOT_LATE` and empty settlements gives REINSTATE; existing fee VOID with reason `WAIVED` does **not** reinstate; `America/Chicago` at `2026-08-01T04:30:00Z` (23:30 CDT Jul 31) is WITHIN_GRACE, not overdue.

`tests/unit/charges.test.ts` (extend): lease starting Aug 15 bills `round(rent * 17 / 31)` with `dueDate = Aug 15`, not Aug 1; lease ending Aug 10 bills 10 of 31 with `dueDate = Aug 1`; a full month is never prorated and `proratedDays` is null; February and leap February; a charge created seconds ago with today's due date is **not** overdue (kills the "0 days late" queue entry); `isOverdue`/`daysLate` agree between tenant and landlord views for the same instant and zone; a March 8 due date in `America/Chicago` computes `daysLate` correctly across spring-forward.

`tests/unit/jurisdiction.test.ts` (new): Chicago at $1,850 is exactly 7750; at $500 is 1000; at $499 is 1000; at $501 is 1005; at $3,000 is 13500; at $0 is 0; unknown city gives `NO_CAP` with `maxLateFeeCents` null; `rentRegulation: "NONE"` gives `NO_CAP` even in Chicago; case and whitespace insensitivity on `"chicago "` and `"il"`.

`tests/unit/ledger.test.ts` (extend): `computeRunningBalances` in bigint crossing 2,147,483,647 without loss; `centsFromBigInt` throws above `MAX_SAFE_INTEGER`; `assertBalanced` rejects a non-zero group; **`isIdempotencyKeyCollision` returns false for `LedgerEntry_reversalOfId_key` and true for `IdempotencyKey_pkey`**.

`tests/unit/money-write-surface.test.ts` (new): the grep guard.

### Integration (real Postgres, gated on `DATABASE_URL_TEST`, `describe.skipIf` otherwise)

Every test ends with `expect(await reconcileMoney()).toEqual([])`.

`payments-record`: full payment (charge PAID, one APPLY row, two ledger rows summing to zero, `TENANT_LEASE` at 0); partial; overpayment (four ledger rows, `LANDLORD_TENANT_CREDIT` at -15000); credit auto-applied to next month's rent (`TENANT_LEASE` at -170000, credit account back to 0); payment with no open charges parks entirely as credit; targeted allocation to a utility with leftover spilling oldest-first; cross-org `leaseId` throws `NotFoundError` and writes nothing; a hand-crafted over-allocation is rejected by `Charge_paid_within_amount`.

`payments-idempotency`: same key twice sequentially gives one Payment and `replayed: true` with an identical body; same key twice **concurrently** via `Promise.all` gives exactly one Payment, one allocation set, one ledger group, and the same body to both callers; different keys with same amount and reference within 24h fires the duplicate warning, and `confirmDuplicate: true` creates the second; a failure injected after the Payment insert rolls back allocations, the charge update, the ledger rows, **and** the `IdempotencyKey`.

`payments-concurrency`: two $1,000 payments concurrently against one $1,850 charge end at `amountPaidCents = 185000` with the $150 surplus in exactly one payment's credit, never both; `recordPayment` racing `voidCharge`; `applyLateFees` racing `recordPayment` over 20 iterations always ends with either no fee or a rescinded one, never a live fee on rent paid within grace; ten concurrent payments across ten leases in one org all succeed despite sharing `LANDLORD_RECEIVABLE`.

`payments-unwind`: void reverses allocations, re-opens the charge, sets `reversalOfId`, returns `TENANT_LEASE` to pre-payment; **double void is a clean 409 from the `reversalOfId` unique, not a silent `{ posted: false }`** (the direct regression test for the over-broad catch); **ACH return end to end**: settle Aug 1 (fee rescinded), return Aug 8 with R01, and assert one REVERSE allocation, charge back to PENDING with `amountPaidCents = 0`, `PAYMENT_RETURN` rows (not `REVERSAL` type), suppression cleared, fee REINSTATED via a fresh accrual group, every group summing to zero, and one tenant notification; return of a payment that produced credit reverses the credit legs with no negative credit; double return returns `replayed: true` with zero new rows; refund of held credit touches no allocation; refund beyond credit without `reopenCharges` is a 409, with it re-opens the right charge newest-first.

`charges-lifecycle`: **five one-off charges of the same type on the same lease with `periodKey: null` all succeed** (the regression guard for anyone who tries to "fix" the unique); one-off on a lease carrying credit auto-applies in the same transaction; `correctCharge` from $1,850 to $1,750 on a fully-paid charge flips to PAID with $100 credit and a balanced ADJUSTMENT group; `correctCharge` below `amountPaidCents` is a 409 that never reaches the CHECK; `voidCharge` on a partly-paid charge returns money to credit and the credit auto-applies to the next open charge; `voidCharge` then a tick does not regenerate (the VOID row holds the unique slot); `voidCharge` on an already-void charge is a 409.

`rlto`: PATCH a Chicago lease to a $150 late fee gives 400 quoting $77.50; $77.50 succeeds; $77.50 then raising rent to $500 gives 400; a Peoria property accepts $150; `rentRegulation: "NONE"` on a Chicago property accepts $150; a seeded over-cap lease run through the tick produces a fee of exactly 7750 with `lateFeePolicyId = "IL:CHICAGO"`.

`reconcile`: clean database returns `[]`; hand-corrupt `amountPaidCents` with raw SQL gives exactly one Q1 drift; hand-insert an unbalanced group gives Q4 with the exact `groupId`; hand-delete a ledger row gives Q3 naming the lease with both sides; drift on the tick produces a super-admin notification and `moneyDrift > 0`; after the migration plus one tick on a database seeded with pre-M1 charges, `reconcileMoney()` returns `[]`.

`schema-guards`: query `pg_constraint` joined to `pg_namespace` filtered to `current_schema()` and assert all twelve CHECK constraints are present (catches a future `migrate dev` silently dropping them); `applyLateFees` over 40 leases with 12 months of history issues fewer than 15 queries, asserted with a Prisma `$on("query")` counter (today it is roughly 2,450).

---

## 10. The three biggest risks

**1. `Charge.amountPaidCents` is mutable state with five writers protecting it, and a sixth writer is one careless PR away.** This is the price of the charge-first spine and the reason M1 fits in a week. Every layer (Serializable, `FOR UPDATE`, CHECK, compare-and-set, balanced groups) is mitigation, not immunity; the moment code outside `services/payments.ts` writes that column, the invariant is a hope again. **Detected early by** `reconcileMoney` Q1 and Q3 running on every tick from step 13, by `tests/unit/money-write-surface.test.ts` failing the build on a new writer, and by the concurrency tests. The signal that this risk has materialized is a non-zero `TickSummary.moneyDrift`, which is why the super-admin alert must ship in step 13 and not be deferred to M5's error tracking. Without that alert, the cache-plus-reconciler compromise degrades into a plain dual write with extra steps.

**2. Late-fee suppression is the highest-consequence logic in the milestone and it has the least real-world exercise.** It touches five entry points (record, void, return, void-charge, tick), it can both create and destroy a charge on a tenant's bill, and getting it wrong in either direction is visible: a spurious $77.50 on an onboarding tenant's first statement, or a fee that silently never appears. **Detected early by** making `lateFeeDecision` a pure function with a fifteen-case table test in step 4, before any of it is wired to a database, and by the `applyLateFees` racing `recordPayment` integration test over 20 iterations. Additional early signal: after the first pilot landlord onboards an in-progress lease, manually confirm that lease's August RENT charge carries `lateFeeCents = 0`. That single row read is the whole onboarding blocker, verifiable in ten seconds.

**3. The 5.5-day estimate assumes the integration suite runs locally against `docker compose`, and there is no integration harness in the repo at all today** (`vitest.config.ts` includes only `tests/unit/**`, and `tests/` contains nothing else). Step 14 is budgeted at a quarter day, which is enough to wire the gate and write the highest-value tests, and not enough if Postgres-in-a-test-transaction fights back. If step 14 slips, the concurrency and unwind tests never run and risks 1 and 2 lose their only real detector. **Detected early by** doing step 14's harness wiring, not its tests, as the very first thing on day one alongside step 1, in a 30-minute timebox: create `tests/integration/setup.ts`, point it at `DATABASE_URL_TEST` with `?schema=villagekeep_test`, run `migrate deploy`, and get one trivial test green. If that timebox blows, the honest response is to pull Design C's "Postgres in CI" forward out of M5 and re-plan the milestone at 7 days, rather than shipping the money loop with unit tests only.