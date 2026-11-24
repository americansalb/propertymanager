-- AlterTable
ALTER TABLE "Contractor" ADD COLUMN     "calloutCents" INTEGER;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "emergencyLimitCents" INTEGER;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "furnaceLocation" TEXT,
ADD COLUMN     "gasShutoffLocation" TEXT;
