-- Change default status for new vendors to PENDING_APPROVAL
-- This must be in a separate migration because PostgreSQL requires enum values
-- to be committed before they can be used
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL'::"VendorStatus";
