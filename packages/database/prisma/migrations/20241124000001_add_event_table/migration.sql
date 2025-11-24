-- CreateTable for Event (analytics tracking)
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "userId" TEXT,
    "organizationId" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Event_organizationId_idx" ON "Event"("organizationId");
CREATE INDEX IF NOT EXISTS "Event_userId_idx" ON "Event"("userId");
CREATE INDEX IF NOT EXISTS "Event_name_idx" ON "Event"("name");
CREATE INDEX IF NOT EXISTS "Event_category_idx" ON "Event"("category");
CREATE INDEX IF NOT EXISTS "Event_createdAt_idx" ON "Event"("createdAt");
CREATE INDEX IF NOT EXISTS "Event_sessionId_idx" ON "Event"("sessionId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
