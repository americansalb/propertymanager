-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SENT', 'QUOTED', 'DECLINED', 'APPROVED', 'NOT_CHOSEN');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "autoAskQuotes" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trades" "Trade"[],
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "autoApproveCents" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SENT',
    "emailedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "priceLowCents" INTEGER,
    "priceHighCents" INTEGER,
    "availability" TEXT,
    "note" TEXT,
    "respondedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contractor_orgId_idx" ON "Contractor"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_tokenHash_key" ON "QuoteRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "QuoteRequest_orgId_idx" ON "QuoteRequest"("orgId");

-- CreateIndex
CREATE INDEX "QuoteRequest_requestId_idx" ON "QuoteRequest"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_requestId_contractorId_key" ON "QuoteRequest"("requestId", "contractorId");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
