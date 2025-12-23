-- Set landlord password directly via migration
UPDATE "User"
SET "passwordHash" = '$2a$12$tIF7Kf.yZYgEpYXQBqrqQu/lspj9O0AKbmV33Ok62Crl4ahbGhbAu'
WHERE "email" = 'landlord@aalb.org';
