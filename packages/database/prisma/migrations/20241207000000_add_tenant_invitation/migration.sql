-- CreateEnum
CREATE TYPE "TenantInvitationStatus" AS ENUM ('NOT_INVITED', 'PENDING', 'ACCEPTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "invitationStatus" "TenantInvitationStatus" NOT NULL DEFAULT 'NOT_INVITED';
ALTER TABLE "Tenant" ADD COLUMN "invitationToken" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "invitationSentAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "invitationExpiresAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "invitedByUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_invitationToken_key" ON "Tenant"("invitationToken");
