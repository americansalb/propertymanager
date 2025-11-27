# Financial Domain Model

**Status:** Draft (MVP-ready)
**Last Updated:** November 22, 2025
**Owner:** Engineering + Product (shared)

---

## 1. Purpose

Define a clear, consistent financial model for PropertyMaster that:

- Supports **rent, fees, deposits, refunds, and adjustments**
- Enables **trust accounting** and legal compliance
- Scales to **Stripe/ACH, bank reconciliation, and AI features**
- Works well with **multi-tenant, multi-property** architecture

This document is **implementation-guiding**, not locked to specific table names. The database schema and APIs should reflect these concepts, even if names differ.

---

## 2. Scope

**In scope (MVP):**

- Charges (rent, fees, deposits)
- Payments (inbound money)
- Allocations (how payments apply to charges)
- Basic double-entry ledger (journal entries)
- Security deposits & trust accounting flows
- Tenant-facing balances (amount due, paid, overdue)

**Later phases (v1.0+):**

- Advanced revenue recognition
- Multi-currency
- Complex tax handling
- Deep integration with external accounting systems (QuickBooks, Xero)

---

## 3. Guiding Principles

1. **Double-Entry Accounting**
   - Every financial event generates a balanced journal entry (total debits = total credits).
   - Makes reconciliation, reporting, and audits reliable.

2. **Immutable Ledger**
   - Journal entries are **append-only**.
   - Corrections are made via reversal/adjustment entries, not mutations.

3. **Separation of Concerns**
   - **Business objects**: Lease, Tenant, Property, Unit.
   - **Financial objects**: Charges, Payments, Allocations, Journal Entries, Accounts.
   - Financial logic should not be scattered across business entities.

4. **Multi-Tenant Safety**
   - All financial records are scoped by **organization/landlord**.
   - No cross-organization contamination in ledgers.

5. **Trust Accounting Compliance**
   - Security deposits are treated correctly as **liabilities**, not income.
   - Trust bank accounts are distinct from operating accounts.

---

## 4. Core Concepts & Entities

### 4.1 Account

Represents a ledger account (e.g., Rent Income, Bank – Operating, Security Deposit Liability).

**Fields (conceptual):**

- `id`
- `organizationId`
- `name` (e.g., "Rent Income", "Security Deposit Liability")
- `code` (optional, for chart of accounts)
- `type` (`ASSET`, `LIABILITY`, `INCOME`, `EXPENSE`, `EQUITY`)
- `subtype` (optional: `BANK`, `AR`, `AP`, `DEPOSIT`, etc.)
- `isSystem` (predefined, non-deletable)
- `isActive`

> MVP: Use a **small predefined chart of accounts** per organization; later, allow custom accounts.

---

### 4.2 Journal Transaction & Journal Lines

This is the core ledger.

**Journal Transaction (header):**

- `id`
- `organizationId`
- `date`
- `description`
- `sourceType` (`CHARGE`, `PAYMENT`, `REFUND`, `ADJUSTMENT`, `TRANSFER`, etc.)
- `sourceId` (ID of the source entity, e.g., chargeId, paymentId)
- `createdBy`

**Journal Line (rows):**

- `id`
- `journalTransactionId`
- `accountId`
- `amount` (positive number)
- `direction` (`DEBIT` or `CREDIT`)
- `propertyId` (optional, for property-level reporting)
- `unitId` (optional)
- `leaseId` (optional)
- `tenantId` (optional)

**Invariant:**

- For each `journalTransaction`, `sum(debits) == sum(credits)`.

---

### 4.3 Charge

A **receivable**: rent, late fee, utility, deposit, etc.

**Fields:**

- `id`
- `organizationId`
- `propertyId`
- `unitId`
- `leaseId`
- `tenantId`
- `chargeType` (`RENT`, `LATE_FEE`, `UTILITY`, `DEPOSIT`, `OTHER`)
- `description`
- `dueDate`
- `amount` (original amount)
- `currency`
- `status` (`OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID`)
- `accountId` (income or liability account associated with this charge)
- `createdAt`
- `createdBy`

**Derived:**

- `paidAmount` = sum of allocations -> charges
- `remainingBalance` = `amount - paidAmount`

---

### 4.4 Payment

Inbound money from a payer (tenant, owner, etc.).

**Fields:**

- `id`
- `organizationId`
- `propertyId` (optional)
- `leaseId` (optional)
- `tenantId` (payer)
- `amount`
- `currency`
- `method` (`STRIPE_CARD`, `STRIPE_ACH`, `CASH`, `CHECK`, `MANUAL_ADJUSTMENT`, etc.)
- `status` (`PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`)
- `externalId` (Stripe paymentIntentId / chargeId, etc.)
- `receivedAt`
- `notes`

> MVP: Payments are **created when processors confirm success** (e.g., Stripe webhook) and are always `SUCCEEDED` on creation. Failures do not create Payments, only logs.

---

### 4.5 Payment Allocation

Many-to-many relationship between `Payments` and `Charges`.

**Fields:**

- `id`
- `paymentId`
- `chargeId`
- `amount`
- `allocatedAt`
- `createdBy`

**Rules:**

- A single payment can allocate to multiple charges.
- A charge can receive allocations from multiple payments.
- `sum(allocation.amount for charge)` ≤ `charge.amount`.
- Overpayments → leave **unallocated** amount (credit balance) that can be applied later.

---

### 4.6 Security Deposit

Modeled using **Charges + Accounts + Journal Entries**, not a special magic type.

Common pattern:

- **When deposit is charged at move-in:**
  - Create a `Charge` with `chargeType = DEPOSIT`.
  - Financially: increase tenant's deposit liability (we owe it back to them).

- **When deposit is paid:**
  - Payment created as usual.
  - Payment allocation applies to deposit `Charge`.

- **Accounts:**
  - `Bank – Trust` (ASSET)
  - `Security Deposit Liability` (LIABILITY)

---

### 4.7 Bank Account & Bank Transaction

Represents real-world bank accounts and imported transactions (for reconciliation).

**BankAccount:**

- `id`
- `organizationId`
- `name`
- `type` (`OPERATING`, `TRUST`)
- `externalId` (Plaid/Stripe/bank reference)
- `isDefaultOperating`
- `isDefaultTrust`

**BankTransaction:**

- `id`
- `bankAccountId`
- `date`
- `amount` (positive for credit, negative for debit, or vice versa—pick one convention)
- `description`
- `externalId`
- `status` (`UNRECONCILED`, `RECONCILED`)
- `journalTransactionId` (if matched)

---

### 4.8 Reconciliation

Links bank transactions to ledger entries.

**ReconciliationSession:**

- `id`
- `bankAccountId`
- `startDate`
- `endDate`
- `createdBy`
- `createdAt`

Within a session, you match `BankTransaction` ↔ `JournalTransaction`. When matched, mark them as reconciled.

---

## 5. Key Flows & Journal Examples

### 5.1 Monthly Rent Charge

**Scenario:** On the 1st of the month, system posts monthly rent charge.

**Entities:**

- `Charge` (Rent) created.

**Journal:**

- Debit: `Accounts Receivable – Tenant` (AR Asset)
- Credit: `Rent Income` (Income)

```text
DR Accounts Receivable – Tenant      $1,000
  CR Rent Income                     $1,000
```

---

### 5.2 Tenant Payment (Rent)

**Scenario:** Tenant pays $1,000 via Stripe ACH into Operating account.

**Entities:**

- `Payment` created when Stripe marks payment as succeeded.
- `PaymentAllocation` created, applying payment to open rent `Charge`.

**Journal:**

- Debit: `Bank – Operating` (Asset)
- Credit: `Accounts Receivable – Tenant` (Asset, reduces AR)

```text
DR Bank – Operating                  $1,000
  CR Accounts Receivable – Tenant    $1,000
```

Charge becomes `PAID` when `remainingBalance == 0`.

---

### 5.3 Late Fee

**Scenario:** Charge becomes overdue; system applies $50 late fee.

**Entities:**

- New `Charge` with `chargeType = LATE_FEE`.

**Journal:**

- Debit: `Accounts Receivable – Tenant`
- Credit: `Late Fee Income`

```text
DR Accounts Receivable – Tenant      $50
  CR Late Fee Income                 $50
```

---

### 5.4 Security Deposit Collected

**Scenario:** Move-in; tenant pays $1,500 security deposit into a **trust** account.

**Entities:**

- `Charge` with `chargeType = DEPOSIT`.
- `Payment` from tenant.
- `PaymentAllocation` to deposit charge.

**Journal (when deposit charge posted):**

- Debit: `Accounts Receivable – Tenant`
- Credit: `Security Deposit Liability`

```text
DR Accounts Receivable – Tenant      $1,500
  CR Security Deposit Liability      $1,500
```

**Journal (when payment received into Bank – Trust):**

- Debit: `Bank – Trust`
- Credit: `Accounts Receivable – Tenant`

```text
DR Bank – Trust                      $1,500
  CR Accounts Receivable – Tenant    $1,500
```

Result:

- Trust bank account up by $1,500
- Liability to tenant up by $1,500

---

### 5.5 Move-Out: Deposit Return & Charges

**Scenario:** Tenant moves out. $300 kept for damages, $1,200 returned.

**Steps:**

1. **Apply deposit to damages (internal):**
   - If you've already created a damages `Charge`, you can:
     - Debit Security Deposit Liability
     - Credit Accounts Receivable or directly Damages Income.

   Example:

   ```text
   DR Security Deposit Liability           $300
     CR Damages Income                     $300
   ```

   Liability reduced to $1,200.

2. **Return remaining deposit to tenant (cash movement):**

   ```text
   DR Security Deposit Liability           $1,200
     CR Bank – Trust                       $1,200
   ```

After this:

- Security Deposit Liability: 0
- Trust bank decreased by $1,200
- Landlord kept $300 as income (damages).

---

### 5.6 Refunds & Chargebacks (MVP)

Minimally:

- **Refund:** create a new `Payment` with negative amount or a `REFUND` type pointing to original payment and a reversing journal entry.
- **Chargeback:** record a `Payment` with negative amount from bank to AR or income account.

The key invariant is **ledger stays accurate**; you can build richer UX later.

---

## 6. Tenant-Facing Balances

### 6.1 Amount Due for a Tenant

For a given lease or tenant:

- `totalCharges = sum(charges.amount where status != VOID)`
- `totalAllocations = sum(allocations.amount for those charges where payment.status = SUCCEEDED or PARTIALLY_REFUNDED)`
- `amountDue = totalCharges - totalAllocations`

You can also break out:

- `currentDue` (charges due this period)
- `overdue` (charges with `dueDate < today` and `remainingBalance > 0`)

### 6.2 Handling Partial Payments

- Payment allocation can be partial; charge becomes `PARTIALLY_PAID`.
- Remaining balance still shows in **amount due** and **overdue** calculations.

---

## 7. MVP vs v1.0 vs Stretch

### 7.1 MVP (Phase 1–2)

- Entities implemented:
  - `Charge`, `Payment`, `PaymentAllocation`
  - Minimal `Account` table with predefined accounts
  - `JournalTransaction` + `JournalLine`

- Flows supported:
  - Monthly rent charges
  - One-time fees (late fee, utility)
  - Payments via Stripe (card/ACH)
  - Security deposit collection and basic return

- Tenant portal:
  - Show **current balance**, **payment history**, **upcoming charges**

### 7.2 v1.0 Enhancements (Phase 4/6)

- Full bank integration (Plaid)
- `BankTransaction` + `ReconciliationSession`
- Better reporting:
  - P&L per property
  - Cash flow
  - Rent roll

- Fine-grained tax categories & fee types

### 7.3 Stretch

- Multi-currency
- Advanced tax rules
- Deep two-way QuickBooks/Xero sync
- Advanced forecasting models

---

## 8. Implementation Notes & Invariants

1. **Every Charge must map to an Account**
   - Rent → Rent Income
   - Late Fee → Late Fee Income
   - Deposit → Security Deposit Liability

2. **Every Payment must hit a Bank or Clearing Account**
   - Stripe payouts → `Stripe Clearing` then to `Bank – Operating` via transfer entries if needed.

3. **AR Balance Consistency**
   - `Total AR` should be recomputable either:
     - From `Charges - Allocations`, or
     - From `JournalLines` filtered by AR accounts.

4. **Multi-Tenancy**
   - Ensure **all** financial entities include `organizationId`, and queries are always scoped by it.

5. **Trust vs Operating Bank Accounts**
   - Do not allow charges that are true business expenses to be paid from trust accounts.
   - All deposit-related flows must go through trust bank + deposit liability.

---

## 9. Open Questions (to resolve before implementation)

1. **Grain of AR:**
   - Per-tenant AR account vs a shared AR account with tenantId on lines?
   - Recommendation: use **one AR account per organization**, but tag `tenantId` and `leaseId` on `JournalLine` for reporting.

2. **Adjustments:**
   - Represent as negative `Charge` vs separate `Adjustment` entity?
   - Recommendation: MVP uses negative `Charge` with an `ADJUSTMENT` type and appropriate account mappings.

3. **Tax Handling:**
   - Do we need explicit tax lines now, or can we treat amounts as tax-inclusive?
   - MVP: treat as **tax-inclusive**; no separate tax account unless required by early customers.

4. **Permissions:**
   - Which roles can:
     - Post manual journal entries?
     - Override allocations?
     - Void charges/payments?

Document these decisions in a follow-up spec or SECURITY/ROLE matrix.

---

## 10. Next Steps

1. Map this conceptual model to the existing Prisma schema:
   - Identify existing tables for charges, payments, etc.
   - Add missing entities: `JournalTransaction`, `JournalLine`, `PaymentAllocation`, `Account` if not present.

2. Create API contracts:
   - `POST /charges`
   - `POST /payments/webhook/stripe`
   - `POST /payments/:id/allocate`
   - `GET /tenants/:id/balance`

3. Write unit tests for core invariants:
   - Journal entries always balance.
   - Charges' `remainingBalance` never negative.
   - Trust accounting flows follow correct double-entry.

4. Update roadmap:
   - Link Phase 1/2 financial tasks to this model.
   - Mark which parts are MVP vs v1.0.
