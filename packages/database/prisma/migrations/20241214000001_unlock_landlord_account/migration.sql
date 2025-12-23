-- Unlock landlord account and reset failed login attempts
UPDATE "User"
SET "lockedUntil" = NULL,
    "failedLoginAttempts" = 0
WHERE "email" = 'landlord@aalb.org';
