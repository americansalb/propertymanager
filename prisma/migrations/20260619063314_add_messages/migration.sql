-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_leaseId_createdAt_idx" ON "Message"("leaseId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_orgId_idx" ON "Message"("orgId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
