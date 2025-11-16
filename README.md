# PropertyMaster

**World-Class Property Management System** - The Open, AI-Powered, FinTech-Enabled Property Operating System

## Overview

PropertyMaster is a next-generation property management platform designed to fundamentally redefine asset value for property owners and operators. Built on a foundation of:

- **Open API Ecosystem**: API-first architecture enabling best-in-class integrations
- **Embedded FinTech**: Native payment processing, insurance, and financial services
- **AI-Powered Automation**: Intelligent workflows reducing operational overhead by 90%
- **Consumer-Grade UX**: Role-based interfaces designed for delight

## Architecture

This is a modern TypeScript monorepo managed with **pnpm workspaces** and **Turborepo**.

```
propertymanager/
├── packages/
│   ├── backend/          # NestJS API (GraphQL + REST)
│   ├── frontend-admin/   # PM Command Center (React)
│   ├── frontend-tenant/  # Tenant Portal (Next.js)
│   ├── mobile/           # Field App (React Native)
│   ├── database/         # Prisma Schema & Migrations
│   └── shared/           # Shared TypeScript types & utilities
├── docker-compose.yml    # Local development environment
└── turbo.json           # Build pipeline configuration
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: NestJS (modular, enterprise-grade)
- **Database**: PostgreSQL (ACID-compliant)
- **ORM**: Prisma (type-safe queries)
- **APIs**: GraphQL (primary) + REST (legacy/webhooks)
- **Auth**: JWT + RBAC
- **Payments**: Stripe Connect

### Frontend
- **Admin Dashboard**: React 18 + TypeScript + TailwindCSS
- **Tenant Portal**: Next.js 14 (App Router)
- **Mobile**: React Native + Expo
- **UI Library**: shadcn/ui
- **State**: Zustand

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Jest + Supertest + React Testing Library
- **Documentation**: OpenAPI 3.0 + Swagger UI

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+

### Installation

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis)
pnpm docker:up

# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start all services in development mode
pnpm dev
```

### Development

```bash
# Run specific package
cd packages/backend && pnpm dev
cd packages/frontend-admin && pnpm dev

# Database Studio (GUI)
pnpm db:studio

# Run tests
pnpm test

# Lint & format
pnpm lint
pnpm format
```

## Phase 1 MVP Focus

### Core Financial Engine
- Multi-entity General Ledger (accrual-based)
- Automated AP/AR with bank reconciliation
- Trust accounting (state-compliant)
- Native payment processing

### Operations Hub
- Work order lifecycle management
- Vendor management & compliance tracking
- Mobile-first maintenance app

### Target: Mid-Market PMs (100-2,000 units)

## Strategic Differentiators

1. **Open Ecosystem**: Public API from day one
2. **FinTech-First**: Embedded payments as core, not bolt-on
3. **AI Layer**: Intelligent automation across all modules
4. **Consumer-Grade UX**: Role-based interfaces designed for specific workflows

## License

Proprietary - All Rights Reserved

## Contact

For inquiries: contact@propertymaster.io
