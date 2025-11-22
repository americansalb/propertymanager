# Financial Schema Mapping: Domain Model → Prisma

**Status:** Draft
**Last Updated:** November 22, 2025
**Related:** `FINANCIAL_DOMAIN_MODEL.md`

---

## Purpose

Map the conceptual financial domain model to concrete Prisma schema additions. This document defines the exact database schema needed to implement double-entry accounting, trust accounting, and payment allocation.

---

## Migration Strategy

### Phase 1: Add Core Ledger Tables (Non-Breaking)

Add new tables without modifying existing schema. This allows gradual migration.

**Tables to Add:**
1. `Account` - Chart of accounts
2. `JournalTransaction` - Ledger transaction headers
3. `JournalLine` - Debit/credit rows
4. `PaymentAllocation` - Maps payments to charges
5. `BankAccount` - Real bank accounts
6. `BankTransaction` - Imported bank transactions
7. `ReconciliationSession` - Bank reconciliation tracking

### Phase 2: Seed Default Accounts

Create predefined accounts for each organization:
- Rent Income
- Late Fee Income
- Security Deposit Liability
- Bank – Operating
- Bank – Trust
- Accounts Receivable – Tenant

### Phase 3: Wire Business Logic

Update services to create journal entries when:
- Creating charges (DR AR → CR Income)
- Recording payments (DR Bank → CR AR)
- Allocating payments to charges
- Processing refunds

### Phase 4: Reporting (Later Phases)

Build reports using `JournalLine` filtered by:
- `propertyId` - Property-level P&L
- `accountId` - Account-level ledgers
- `tenantId` - Tenant-level statements

---

## Prisma Schema Additions

### 1. Core Ledger Models

```prisma
// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

model Account {
  id             String      @id @default(cuid())
  organizationId String
  name           String      // e.g., "Rent Income", "Security Deposit Liability"
  code           String?     // Optional chart-of-accounts code (e.g., "4000")
  type           AccountType // ASSET, LIABILITY, INCOME, EXPENSE, EQUITY
  subtype        String?     // BANK, AR, AP, DEPOSIT, etc.
  isSystem       Boolean     @default(false) // System accounts can't be deleted
  isActive       Boolean     @default(true)

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  journalLines   JournalLine[]

  @@index([organizationId])
  @@index([type])
  @@unique([organizationId, code]) // Unique code per organization
}

enum AccountType {
  ASSET
  LIABILITY
  INCOME
  EXPENSE
  EQUITY
}

// ============================================================================
// JOURNAL / LEDGER (Double-Entry)
// ============================================================================

model JournalTransaction {
  id             String   @id @default(cuid())
  organizationId String
  date           DateTime
  description    String
  sourceType     String   // "CHARGE", "PAYMENT", "REFUND", "ADJUSTMENT", "TRANSFER"
  sourceId       String?  // ID of source entity (chargeId, paymentId, etc.)

  createdAt      DateTime @default(now())
  createdById    String?

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy      User?        @relation(fields: [createdById], references: [id], onDelete: SetNull)
  lines          JournalLine[]
  bankTransactions BankTransaction[] // For reconciliation

  @@index([organizationId])
  @@index([date])
  @@index([sourceType, sourceId])
}

model JournalLine {
  id                   String             @id @default(cuid())
  journalTransactionId String
  accountId            String
  amount               Decimal            @db.Decimal(18, 2)
  direction            JournalDirection   // DEBIT or CREDIT

  // Dimension tags for reporting
  propertyId           String?
  unitId               String?
  leaseId              String?
  tenantId             String?

  createdAt            DateTime           @default(now())

  // Relations
  journalTransaction   JournalTransaction @relation(fields: [journalTransactionId], references: [id], onDelete: Cascade)
  account              Account            @relation(fields: [accountId], references: [id], onDelete: Restrict)
  property             Property?          @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  unit                 Unit?              @relation(fields: [unitId], references: [id], onDelete: SetNull)
  lease                Lease?             @relation(fields: [leaseId], references: [id], onDelete: SetNull)
  tenant               Tenant?            @relation(fields: [tenantId], references: [id], onDelete: SetNull)

  @@index([journalTransactionId])
  @@index([accountId])
  @@index([propertyId])
  @@index([leaseId])
  @@index([tenantId])
}

enum JournalDirection {
  DEBIT
  CREDIT
}

// ============================================================================
// CHARGES, PAYMENTS, ALLOCATIONS
// ============================================================================

// Update existing Charge model or create if doesn't exist
model Charge {
  id             String       @id @default(cuid())
  organizationId String
  propertyId     String?
  unitId         String?
  leaseId        String?
  tenantId       String?

  chargeType     ChargeType
  description    String
  dueDate        DateTime
  amount         Decimal      @db.Decimal(18, 2)
  currency       String       @default("USD")
  status         ChargeStatus @default(OPEN)
  accountId      String       // Income or liability account

  // Recurring charge support (optional for MVP)
  isRecurring    Boolean      @default(false)
  recurringRuleId String?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  createdById    String?

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  property       Property?    @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  unit           Unit?        @relation(fields: [unitId], references: [id], onDelete: SetNull)
  lease          Lease?       @relation(fields: [leaseId], references: [id], onDelete: SetNull)
  tenant         Tenant?      @relation(fields: [tenantId], references: [id], onDelete: SetNull)
  account        Account      @relation(fields: [accountId], references: [id], onDelete: Restrict)
  createdBy      User?        @relation(fields: [createdById], references: [id], onDelete: SetNull)
  allocations    PaymentAllocation[]

  @@index([organizationId])
  @@index([tenantId])
  @@index([leaseId])
  @@index([status])
  @@index([dueDate])
}

enum ChargeType {
  RENT
  LATE_FEE
  UTILITY
  DEPOSIT
  PET_FEE
  PARKING
  STORAGE
  AMENITY
  OTHER
}

enum ChargeStatus {
  OPEN
  PARTIALLY_PAID
  PAID
  VOID
}

// Update existing Payment model or create if doesn't exist
model Payment {
  id             String        @id @default(cuid())
  organizationId String
  propertyId     String?
  leaseId        String?
  tenantId       String?

  amount         Decimal       @db.Decimal(18, 2)
  currency       String        @default("USD")
  method         PaymentMethod
  status         PaymentStatus
  externalId     String?       // Stripe paymentIntent/charge ID
  receivedAt     DateTime
  notes          String?       @db.Text

  // Stripe-specific fields
  stripePaymentIntentId String?
  stripeChargeId        String?
  stripeFee             Decimal? @db.Decimal(18, 2)

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  createdById    String?

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  property       Property?    @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  lease          Lease?       @relation(fields: [leaseId], references: [id], onDelete: SetNull)
  tenant         Tenant?      @relation(fields: [tenantId], references: [id], onDelete: SetNull)
  createdBy      User?        @relation(fields: [createdById], references: [id], onDelete: SetNull)
  allocations    PaymentAllocation[]

  @@index([organizationId])
  @@index([tenantId])
  @@index([status])
  @@index([receivedAt])
  @@index([externalId])
}

enum PaymentMethod {
  STRIPE_CARD
  STRIPE_ACH
  CASH
  CHECK
  BANK_TRANSFER
  MONEY_ORDER
  MANUAL_ADJUSTMENT
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
  CANCELED
}

// NEW: Payment Allocation (many-to-many between Payments and Charges)
model PaymentAllocation {
  id          String   @id @default(cuid())
  paymentId   String
  chargeId    String
  amount      Decimal  @db.Decimal(18, 2)
  allocatedAt DateTime @default(now())
  createdById String?

  // Relations
  payment     Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  charge      Charge  @relation(fields: [chargeId], references: [id], onDelete: Cascade)
  createdBy   User?   @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@index([paymentId])
  @@index([chargeId])
}

// ============================================================================
// BANK ACCOUNTS & TRANSACTIONS
// ============================================================================

model BankAccount {
  id                String          @id @default(cuid())
  organizationId    String
  name              String
  type              BankAccountType
  externalId        String?         // Plaid account ID or processor reference
  lastFour          String?         // Last 4 digits for display
  routingNumber     String?
  accountNumber     String?         // Encrypted or masked
  isDefaultOperating Boolean        @default(false)
  isDefaultTrust     Boolean        @default(false)
  isActive          Boolean         @default(true)

  // Plaid-specific
  plaidAccessToken  String?
  plaidItemId       String?

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  // Relations
  organization      Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  transactions      BankTransaction[]
  reconciliationSessions ReconciliationSession[]

  @@index([organizationId])
  @@index([type])
}

enum BankAccountType {
  OPERATING
  TRUST
  SAVINGS
  OTHER
}

model BankTransaction {
  id                   String                 @id @default(cuid())
  bankAccountId        String
  date                 DateTime
  amount               Decimal                @db.Decimal(18, 2)
  description          String
  externalId           String?                // Bank/Plaid transaction ID
  status               BankTransactionStatus  @default(UNRECONCILED)
  journalTransactionId String?                // Links to ledger when reconciled

  // Additional metadata from bank/Plaid
  category             String?
  merchantName         String?
  pending              Boolean                @default(false)

  importedAt           DateTime               @default(now())
  reconciledAt         DateTime?

  // Relations
  bankAccount          BankAccount            @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  journalTransaction   JournalTransaction?    @relation(fields: [journalTransactionId], references: [id], onDelete: SetNull)

  @@index([bankAccountId])
  @@index([date])
  @@index([status])
  @@index([journalTransactionId])
  @@unique([bankAccountId, externalId]) // Prevent duplicate imports
}

enum BankTransactionStatus {
  UNRECONCILED
  RECONCILED
  EXCLUDED
}

model ReconciliationSession {
  id            String      @id @default(cuid())
  bankAccountId String
  startDate     DateTime
  endDate       DateTime
  status        ReconciliationStatus @default(IN_PROGRESS)
  notes         String?     @db.Text

  createdById   String
  createdAt     DateTime    @default(now())
  completedAt   DateTime?

  // Relations
  bankAccount   BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  createdBy     User        @relation(fields: [createdById], references: [id], onDelete: Restrict)

  @@index([bankAccountId])
  @@index([status])
}

enum ReconciliationStatus {
  IN_PROGRESS
  COMPLETED
  DISCARDED
}
```

---

## Default Accounts Seed Data

When an organization is created, seed the following accounts:

```typescript
// Seed accounts for new organization
const defaultAccounts = [
  // ASSETS
  { name: 'Bank – Operating', code: '1000', type: 'ASSET', subtype: 'BANK', isSystem: true },
  { name: 'Bank – Trust', code: '1010', type: 'ASSET', subtype: 'BANK', isSystem: true },
  { name: 'Accounts Receivable – Tenant', code: '1200', type: 'ASSET', subtype: 'AR', isSystem: true },

  // LIABILITIES
  { name: 'Security Deposit Liability', code: '2100', type: 'LIABILITY', subtype: 'DEPOSIT', isSystem: true },
  { name: 'Accounts Payable', code: '2200', type: 'LIABILITY', subtype: 'AP', isSystem: true },

  // INCOME
  { name: 'Rent Income', code: '4000', type: 'INCOME', subtype: 'RENT', isSystem: true },
  { name: 'Late Fee Income', code: '4100', type: 'INCOME', subtype: 'FEE', isSystem: true },
  { name: 'Pet Fee Income', code: '4110', type: 'INCOME', subtype: 'FEE', isSystem: true },
  { name: 'Parking Income', code: '4120', type: 'INCOME', subtype: 'FEE', isSystem: true },
  { name: 'Utility Income', code: '4200', type: 'INCOME', subtype: 'UTILITY', isSystem: true },
  { name: 'Other Income', code: '4900', type: 'INCOME', subtype: 'OTHER', isSystem: true },

  // EXPENSES
  { name: 'Maintenance Expense', code: '5000', type: 'EXPENSE', subtype: 'MAINTENANCE', isSystem: true },
  { name: 'Repairs Expense', code: '5100', type: 'EXPENSE', subtype: 'REPAIRS', isSystem: true },
  { name: 'Utilities Expense', code: '5200', type: 'EXPENSE', subtype: 'UTILITIES', isSystem: true },
  { name: 'Insurance Expense', code: '5300', type: 'EXPENSE', subtype: 'INSURANCE', isSystem: true },
  { name: 'Property Tax Expense', code: '5400', type: 'EXPENSE', subtype: 'TAX', isSystem: true },
  { name: 'Management Fee Expense', code: '5500', type: 'EXPENSE', subtype: 'FEE', isSystem: true },

  // EQUITY
  { name: 'Owner\'s Equity', code: '3000', type: 'EQUITY', subtype: null, isSystem: true },
];
```

---

## Migration File Structure

```bash
# Create migration
pnpm --filter database prisma migrate dev --name add-financial-ledger

# This creates:
# packages/database/prisma/migrations/YYYYMMDDHHMMSS_add_financial_ledger/
#   ├── migration.sql
```

### Migration SQL (Skeleton)

```sql
-- CreateEnum for AccountType
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum for JournalDirection
CREATE TYPE "JournalDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable Account
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "AccountType" NOT NULL,
    "subtype" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_organizationId_fkey" FOREIGN KEY ("organizationId")
      REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Account_organizationId_idx" ON "Account"("organizationId");
CREATE INDEX "Account_type_idx" ON "Account"("type");
CREATE UNIQUE INDEX "Account_organizationId_code_key" ON "Account"("organizationId", "code");

-- CreateTable JournalTransaction
CREATE TABLE "JournalTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "JournalTransaction_organizationId_fkey" FOREIGN KEY ("organizationId")
      REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalTransaction_createdById_fkey" FOREIGN KEY ("createdById")
      REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JournalTransaction_organizationId_idx" ON "JournalTransaction"("organizationId");
CREATE INDEX "JournalTransaction_date_idx" ON "JournalTransaction"("date");
CREATE INDEX "JournalTransaction_sourceType_sourceId_idx" ON "JournalTransaction"("sourceType", "sourceId");

-- CreateTable JournalLine
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journalTransactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "direction" "JournalDirection" NOT NULL,
    "propertyId" TEXT,
    "unitId" TEXT,
    "leaseId" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLine_journalTransactionId_fkey" FOREIGN KEY ("journalTransactionId")
      REFERENCES "JournalTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId")
      REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JournalLine_propertyId_fkey" FOREIGN KEY ("propertyId")
      REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalLine_unitId_fkey" FOREIGN KEY ("unitId")
      REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalLine_leaseId_fkey" FOREIGN KEY ("leaseId")
      REFERENCES "Lease" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalLine_tenantId_fkey" FOREIGN KEY ("tenantId")
      REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JournalLine_journalTransactionId_idx" ON "JournalLine"("journalTransactionId");
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");
CREATE INDEX "JournalLine_propertyId_idx" ON "JournalLine"("propertyId");
CREATE INDEX "JournalLine_leaseId_idx" ON "JournalLine"("leaseId");
CREATE INDEX "JournalLine_tenantId_idx" ON "JournalLine"("tenantId");

-- CreateTable PaymentAllocation
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId")
      REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentAllocation_chargeId_fkey" FOREIGN KEY ("chargeId")
      REFERENCES "Charge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentAllocation_createdById_fkey" FOREIGN KEY ("createdById")
      REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");
CREATE INDEX "PaymentAllocation_chargeId_idx" ON "PaymentAllocation"("chargeId");

-- ... (BankAccount, BankTransaction, ReconciliationSession similar pattern)
```

---

## Invariants & Constraints

### Database-Level Constraints

1. **Balanced Journal Entries**
   - Application-level check (not DB constraint): `SUM(debits) = SUM(credits)` per JournalTransaction
   - Consider adding a trigger or check constraint if database supports it

2. **Payment Allocation Limits**
   - Application-level: `SUM(allocations.amount for charge) <= charge.amount`
   - Application-level: `SUM(allocations.amount for payment) <= payment.amount`

3. **Unique Bank Transactions**
   - `@@unique([bankAccountId, externalId])` prevents duplicate imports

4. **Organization Scoping**
   - All financial tables have `organizationId`
   - All queries MUST filter by `organizationId`

### Application-Level Validations

```typescript
// Example: Validate journal entry balances
async function createJournalEntry(dto: CreateJournalEntryDto) {
  const debits = dto.lines.filter(l => l.direction === 'DEBIT');
  const credits = dto.lines.filter(l => l.direction === 'CREDIT');

  const totalDebits = debits.reduce((sum, l) => sum + l.amount, 0);
  const totalCredits = credits.reduce((sum, l) => sum + l.amount, 0);

  if (totalDebits !== totalCredits) {
    throw new UnbalancedJournalEntryException(totalDebits, totalCredits);
  }

  // Create transaction + lines in database transaction
  return await prisma.$transaction(async (tx) => {
    const journal = await tx.journalTransaction.create({ data: dto });
    await tx.journalLine.createMany({ data: dto.lines });
    return journal;
  });
}
```

---

## Testing Strategy for Schema

### 1. Schema Validation Tests

```typescript
// Test that migration creates all tables
describe('Financial Schema Migration', () => {
  it('should create Account table with correct indexes', async () => {
    // Query pg_indexes or similar
  });

  it('should create JournalTransaction and JournalLine tables', async () => {
    // Verify table exists
  });

  it('should enforce unique constraint on Account code per org', async () => {
    // Try to create duplicate code, expect error
  });
});
```

### 2. Seed Data Tests

```typescript
describe('Default Accounts Seeding', () => {
  it('should create default accounts for new organization', async () => {
    const org = await createTestOrganization();
    const accounts = await prisma.account.findMany({
      where: { organizationId: org.id }
    });

    expect(accounts).toHaveLength(17); // Based on seed data above
    expect(accounts.find(a => a.name === 'Rent Income')).toBeDefined();
  });
});
```

### 3. Invariant Tests

```typescript
describe('Journal Entry Invariants', () => {
  it('should reject unbalanced journal entries', async () => {
    const entry = {
      lines: [
        { accountId: 'acc1', amount: 1000, direction: 'DEBIT' },
        { accountId: 'acc2', amount: 900, direction: 'CREDIT' }, // Unbalanced!
      ]
    };

    await expect(createJournalEntry(entry)).rejects.toThrow(UnbalancedJournalEntryException);
  });
});
```

---

## Next Steps

1. **Review Existing Schema:**
   - Open `packages/database/prisma/schema.prisma`
   - Identify which models already exist (Charge, Payment, etc.)
   - Determine which fields need to be added vs which are new models

2. **Create Migration:**
   - Add new models to `schema.prisma`
   - Run `pnpm --filter database prisma migrate dev --name add-financial-ledger`
   - Review generated SQL

3. **Update Seed Script:**
   - Modify `packages/database/prisma/seed.ts`
   - Add logic to create default accounts for test organization

4. **Test Migration:**
   - Apply migration locally
   - Verify tables created
   - Run seed, verify default accounts exist
   - Rollback and test idempotency

5. **Document for Team:**
   - Add migration notes to CHANGELOG
   - Update README with new financial entities
   - Create example queries for common reporting needs

---

## Related Documents

- `FINANCIAL_DOMAIN_MODEL.md` - Conceptual model this schema implements
- `property-edit-modal.md` - Feature spec that references this schema
- `PHASE_0_TASKS.md` - Infrastructure setup required before migration
- `ROADMAP.md` - Overall project phases and timeline
