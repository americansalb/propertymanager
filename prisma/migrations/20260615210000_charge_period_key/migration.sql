-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "periodKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Charge_leaseId_type_periodKey_key" ON "Charge"("leaseId", "type", "periodKey");
