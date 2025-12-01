-- Add missing User security/lockout fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastFailedLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

-- Add missing WorkOrderStatus value ON_HOLD
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ON_HOLD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus')) THEN
        ALTER TYPE "WorkOrderStatus" ADD VALUE 'ON_HOLD' AFTER 'IN_PROGRESS';
    END IF;
END $$;

-- Create NotificationType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM (
            'PAYMENT_RECEIVED',
            'PAYMENT_FAILED',
            'PAYMENT_REMINDER',
            'AUTOPAY_UPCOMING',
            'AUTOPAY_PROCESSED',
            'AUTOPAY_FAILED',
            'LEASE_EXPIRING',
            'LEASE_EXPIRED',
            'LATE_FEE_APPLIED',
            'WORK_ORDER_UPDATE'
        );
    END IF;
END $$;

-- Create NotificationStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
        CREATE TYPE "NotificationStatus" AS ENUM (
            'PENDING',
            'SENT',
            'FAILED',
            'READ'
        );
    END IF;
END $$;

-- Create NotificationChannel enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationChannel') THEN
        CREATE TYPE "NotificationChannel" AS ENUM (
            'EMAIL',
            'SMS',
            'IN_APP'
        );
    END IF;
END $$;

-- Create Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientUserId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Notification table
CREATE INDEX IF NOT EXISTS "Notification_organizationId_idx" ON "Notification"("organizationId");
CREATE INDEX IF NOT EXISTS "Notification_status_idx" ON "Notification"("status");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");
CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_idx" ON "Notification"("recipientUserId");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
