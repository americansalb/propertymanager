#!/bin/sh
set -e

echo "🚀 Starting PropertyMaster Backend..."

# Run database migrations
echo "📦 Running database migrations..."
cd /app/packages/database
npx prisma migrate deploy || echo "Migration failed or already applied"

# Check if seed is needed (check if admin user exists)
echo "🌱 Checking if database needs seeding..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkAndSeed() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('No users found, seeding database...');
    process.exit(1); // Exit with 1 to trigger seed
  } else {
    console.log('Database already has users, skipping seed.');
    process.exit(0);
  }
}
checkAndSeed().catch(() => process.exit(1));
" || (echo "🌱 Seeding database..." && npx tsx prisma/seed.ts)

# Start the application
echo "✅ Starting NestJS application..."
cd /app
exec node packages/backend/dist/main.js
