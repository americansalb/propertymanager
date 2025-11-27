# PropertyMaster - Quick Start Guide

This guide will help you set up the PropertyMaster development environment in under 10 minutes.

## Prerequisites

Ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (Install: `npm install -g pnpm`)
- **Docker & Docker Compose** ([Download](https://www.docker.com/))
- **Git**

## Step 1: Clone & Install

```bash
# Navigate to project directory
cd propertymanager

# Install all dependencies
pnpm install
```

## Step 2: Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

**Important:** Update the following values in `.env`:

- `JWT_SECRET`: Generate a secure random string
- `STRIPE_SECRET_KEY`: Add your Stripe test key (or leave blank for now)

## Step 3: Start Infrastructure

Start PostgreSQL, Redis, and Mailhog using Docker:

```bash
pnpm docker:up
```

This will start:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Mailhog (email testing) on `localhost:8025`

## Step 4: Database Setup

Generate Prisma Client and run migrations:

```bash
# Generate Prisma Client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# (Optional) Seed with demo data
cd packages/database && pnpm seed
```

## Step 5: Start Development Servers

```bash
# Start all services in development mode
pnpm dev
```

This will start:

- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs (Swagger UI)
- **Frontend Admin** (when ready): http://localhost:3000
- **Frontend Tenant** (when ready): http://localhost:3002

## Step 6: Test the API

### Using Swagger UI

Navigate to http://localhost:3001/api/docs

### Using curl

```bash
# Register a new organization and user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "organizationName": "Acme Property Management",
    "organizationType": "PROPERTY_MANAGER"
  }'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!"
  }'
```

Save the `accessToken` from the response and use it for authenticated requests:

```bash
# Get current user
curl http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get all properties
curl http://localhost:3001/api/v1/properties \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Demo Credentials (if you seeded the database)

- **Admin User**: `admin@demo.com` / `Admin123!`
- **Property Manager**: `pm@demo.com` / `PM123!`

## Useful Commands

```bash
# View database in GUI
pnpm db:studio

# Stop all Docker containers
pnpm docker:down

# Clean build artifacts
pnpm clean

# Run tests
pnpm test

# Format code
pnpm format
```

## Project Structure

```
propertymanager/
├── packages/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── auth/           # Authentication & JWT
│   │   │   ├── users/          # User management
│   │   │   ├── properties/     # Property management
│   │   │   ├── financial/      # Financial core
│   │   │   ├── payments/       # Payment processing
│   │   │   ├── work-orders/    # Maintenance operations
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── database/         # Prisma schema & migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Seed script
│   │   └── package.json
│   │
│   ├── shared/           # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── types/          # Common types
│   │   │   └── utils/          # Utility functions
│   │   └── package.json
│   │
│   ├── frontend-admin/   # PM Command Center (Coming soon)
│   ├── frontend-tenant/  # Tenant Portal (Coming soon)
│   └── mobile/           # React Native app (Coming soon)
│
├── docker-compose.yml    # Local development infrastructure
├── turbo.json           # Monorepo build configuration
└── package.json         # Root package
```

## Troubleshooting

### Port Already in Use

If ports 3001, 5432, or 6379 are already in use:

```bash
# Stop Docker containers
pnpm docker:down

# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Prisma Client Out of Sync

If you see "Prisma Client out of sync" errors:

```bash
pnpm db:generate
```

### Database Connection Issues

Ensure Docker containers are running:

```bash
docker ps
```

You should see containers for PostgreSQL, Redis, and Mailhog.

## Next Steps

- Explore the **Swagger API documentation** at http://localhost:3001/api/docs
- Review the **database schema** in `packages/database/prisma/schema.prisma`
- Check out the **strategic blueprint** in the project README
- Start building frontend applications using the API

## Getting Help

- Review API documentation: http://localhost:3001/api/docs
- Check the main README.md for architecture details
- Review the Prisma schema for data models

---

**Congratulations!** You now have a fully functional PropertyMaster API running locally.
