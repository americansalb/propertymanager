-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "accessCodes" TEXT,
ADD COLUMN     "breakerPanelLocation" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "parkingNotes" TEXT,
ADD COLUMN     "petNotes" TEXT,
ADD COLUMN     "petsAllowed" BOOLEAN,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "waterShutoffLocation" TEXT,
ADD COLUMN     "yearBuilt" INTEGER;
