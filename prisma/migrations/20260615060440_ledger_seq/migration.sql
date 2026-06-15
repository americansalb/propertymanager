-- DropIndex
DROP INDEX "LedgerEntry_accountType_accountId_createdAt_idx";

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "LedgerEntry_accountType_accountId_seq_idx" ON "LedgerEntry"("accountType", "accountId", "seq");
