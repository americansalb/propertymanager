-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "parkingRentCents" INTEGER,
ADD COLUMN     "parkingSpot" TEXT,
ADD COLUMN     "petDepositCents" INTEGER,
ADD COLUMN     "petRentCents" INTEGER,
ADD COLUMN     "securityDepositCents" INTEGER,
ADD COLUMN     "utilitiesIncluded" TEXT[] DEFAULT ARRAY[]::TEXT[];
