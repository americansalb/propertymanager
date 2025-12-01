#!/bin/sh
set -e

echo "🚀 Starting PropertyMaster Backend..."

# Run database migrations
echo "📦 Running database migrations..."
cd /app/packages/database
npx prisma migrate deploy || echo "Migration failed or already applied"

# Always run seed to ensure admin user exists with correct credentials
echo "🌱 Running database seed..."
npx tsx prisma/seed.ts || echo "Seed completed or skipped"

# Start the application
echo "✅ Starting NestJS application..."
cd /app
exec node packages/backend/dist/main.js
