-- Add vendor approval workflow status values to enum
ALTER TYPE "VendorStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "VendorStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Add approval tracking fields to Vendor table
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "approvalNotes" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Add user account linkage for vendor portal access
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "userId" TEXT UNIQUE;

-- Change default status for new vendors to PENDING_APPROVAL
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL'::"VendorStatus";
