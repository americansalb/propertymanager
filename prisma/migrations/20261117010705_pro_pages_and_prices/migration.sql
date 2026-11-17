-- AlterEnum
ALTER TYPE "Trade" ADD VALUE 'JUNK_REMOVAL';

-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "hourlyRateCents" INTEGER,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "licenseState" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "trades" "Trade"[] DEFAULT ARRAY[]::"Trade"[],
ADD COLUMN     "tripChargeCents" INTEGER;

-- CreateTable
CREATE TABLE "ProPrice" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "fromCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProPrice_proProfileId_taskKey_key" ON "ProPrice"("proProfileId", "taskKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_slug_key" ON "ProProfile"("slug");

-- AddForeignKey
ALTER TABLE "ProPrice" ADD CONSTRAINT "ProPrice_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

