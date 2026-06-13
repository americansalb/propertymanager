-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "parkingRentCents" INTEGER,
ADD COLUMN     "parkingSpot" TEXT,
ADD COLUMN     "petDepositCents" INTEGER,
ADD COLUMN     "petRentCents" INTEGER,
ADD COLUMN     "shareWithTenant" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "utilitiesIncluded" TEXT[] DEFAULT ARRAY[]::TEXT[];
