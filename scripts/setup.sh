#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   🏢  PropertyMaster - Automated Setup Script               ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Remember to update your .env file with proper values!"
fi

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
pnpm db:generate

# Run migrations
echo "🗄️  Running database migrations..."
pnpm db:migrate

# Seed database (optional)
read -p "🌱 Would you like to seed the database with demo data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd packages/database && pnpm seed
    cd ../..
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   ✅  Setup Complete!                                        ║"
echo "║                                                               ║"
echo "║   Next steps:                                                ║"
echo "║   1. Review and update your .env file                        ║"
echo "║   2. Run 'pnpm dev' to start development servers             ║"
echo "║   3. Visit http://localhost:3001/api/docs for API docs       ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
