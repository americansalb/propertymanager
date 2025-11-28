-- Add missing Tenant portal fields
-- These fields were in the schema but not in the initial migration

-- Add portal access fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "portalPassword" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "lastPortalLogin" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- Add unique constraint for stripeCustomerId if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Tenant_stripeCustomerId_key'
    ) THEN
        ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
    END IF;
END $$;

-- Add index for portalEnabled
CREATE INDEX IF NOT EXISTS "Tenant_portalEnabled_idx" ON "Tenant"("portalEnabled");

-- Add missing Lease auto-pay fields
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "autoPayEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "autoPayDay" INTEGER;
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "autoPayPaymentMethodId" TEXT;

-- Add index for autoPayEnabled
CREATE INDEX IF NOT EXISTS "Lease_autoPayEnabled_idx" ON "Lease"("autoPayEnabled");

-- Add missing WorkOrder organizationId field
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Update existing WorkOrders to get organizationId from Property
UPDATE "WorkOrder" wo
SET "organizationId" = p."organizationId"
FROM "Property" p
WHERE wo."propertyId" = p."id" AND wo."organizationId" IS NULL;

-- Make organizationId NOT NULL after populating (only if there are no NULLs)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "WorkOrder" WHERE "organizationId" IS NULL) THEN
        ALTER TABLE "WorkOrder" ALTER COLUMN "organizationId" SET NOT NULL;
    END IF;
END $$;

-- Add index for WorkOrder organizationId
CREATE INDEX IF NOT EXISTS "WorkOrder_organizationId_idx" ON "WorkOrder"("organizationId");

-- Add email verification fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP(3);
