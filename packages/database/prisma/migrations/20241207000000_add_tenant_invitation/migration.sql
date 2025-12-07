-- CreateEnum
CREATE TYPE "TenantInvitationStatus" AS ENUM ('NOT_INVITED', 'PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MOVED_OUT');

-- AlterTable - Add invitation fields
ALTER TABLE "Tenant" ADD COLUMN "invitationStatus" "TenantInvitationStatus" NOT NULL DEFAULT 'NOT_INVITED';
ALTER TABLE "Tenant" ADD COLUMN "invitationToken" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "invitationSentAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "invitationExpiresAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "invitedByUserId" TEXT;

-- AlterTable - Add status and direct unit assignment
ALTER TABLE "Tenant" ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Tenant" ADD COLUMN "unitId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "moveInDate" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "moveOutDate" TIMESTAMP(3);

-- AlterTable - Make leaseId optional
ALTER TABLE "Tenant" ALTER COLUMN "leaseId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_invitationToken_key" ON "Tenant"("invitationToken");

-- CreateIndex
CREATE INDEX "Tenant_unitId_idx" ON "Tenant"("unitId");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
