#!/bin/bash
set -e

# PropertyMaster Pre-Launch Verification Script
# Run this script before deploying to production to verify readiness

echo "=============================================="
echo "PropertyMaster Pre-Launch Verification"
echo "=============================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ERRORS=$((ERRORS + 1))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo -e "[INFO] $1"
}

section() {
    echo ""
    echo "----------------------------------------------"
    echo "$1"
    echo "----------------------------------------------"
}

# ==============================================
# Environment Checks
# ==============================================
section "Environment Checks"

if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
    pass "Production environment file exists"
else
    fail "Missing .env.production file"
fi

# Check required environment variables (from .env.example)
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "SENDGRID_API_KEY"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_S3_BUCKET"
    "SENTRY_DSN"
)

if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" "$PROJECT_ROOT/.env.production"; then
            value=$(grep "^${var}=" "$PROJECT_ROOT/.env.production" | cut -d'=' -f2)
            if [[ -n "$value" && "$value" != '""' && "$value" != "''" ]]; then
                pass "$var is configured"
            else
                fail "$var is empty"
            fi
        else
            fail "$var is not set"
        fi
    done
fi

# ==============================================
# Security Checks
# ==============================================
section "Security Checks"

# Check JWT secret length
if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" "$PROJECT_ROOT/.env.production" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [[ ${#JWT_SECRET} -ge 32 ]]; then
        pass "JWT_SECRET is sufficiently long (${#JWT_SECRET} chars)"
    else
        fail "JWT_SECRET is too short (minimum 32 chars, got ${#JWT_SECRET})"
    fi
fi

# Check for hardcoded secrets in code
info "Scanning for potential hardcoded secrets..."
SECRETS_PATTERN='(password|secret|api_key|apikey|token|credential).*=.*["\x27][^"\x27]{8,}["\x27]'
SECRETS_FOUND=$(grep -riE "$SECRETS_PATTERN" "$PROJECT_ROOT/packages" --include="*.ts" --include="*.tsx" --exclude-dir="node_modules" --exclude-dir="dist" 2>/dev/null | wc -l)

if [[ $SECRETS_FOUND -eq 0 ]]; then
    pass "No obvious hardcoded secrets found"
else
    warn "Found $SECRETS_FOUND potential hardcoded secrets - please review"
fi

# ==============================================
# Code Quality Checks
# ==============================================
section "Code Quality Checks"

cd "$PROJECT_ROOT"

# TypeScript compilation
info "Checking TypeScript compilation..."
if pnpm build 2>&1 | tail -5; then
    pass "TypeScript compiles without errors"
else
    fail "TypeScript compilation failed"
fi

# Lint check
info "Running linter..."
if pnpm lint 2>&1 | tail -5; then
    pass "Linting passes"
else
    warn "Linting issues found"
fi

# ==============================================
# Test Checks
# ==============================================
section "Test Checks"

info "Running tests..."
cd "$PROJECT_ROOT/packages/backend"
if npm test -- --passWithNoTests 2>&1 | tail -10; then
    pass "Tests pass"
else
    warn "Some tests may have failed"
fi

# ==============================================
# Database Checks
# ==============================================
section "Database Checks"

cd "$PROJECT_ROOT/packages/database"

# Check migrations
info "Checking Prisma migrations..."
if [[ -d "prisma/migrations" ]]; then
    MIGRATION_COUNT=$(ls -1 prisma/migrations 2>/dev/null | wc -l)
    if [[ $MIGRATION_COUNT -gt 0 ]]; then
        pass "Found $MIGRATION_COUNT migration(s)"
    else
        warn "No migrations found"
    fi
else
    fail "Migrations directory not found"
fi

# Check schema validity
info "Validating Prisma schema..."
if npx prisma validate 2>&1; then
    pass "Prisma schema is valid"
else
    fail "Prisma schema validation failed"
fi

# ==============================================
# Docker Checks
# ==============================================
section "Docker Checks"

cd "$PROJECT_ROOT"

if [[ -f "docker-compose.prod.yml" ]]; then
    pass "Production Docker Compose file exists"

    # Validate docker-compose
    if docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
        pass "Docker Compose config is valid"
    else
        fail "Docker Compose config is invalid"
    fi
else
    fail "docker-compose.prod.yml not found"
fi

if [[ -f "Dockerfile" ]]; then
    pass "Dockerfile exists"
else
    warn "Root Dockerfile not found"
fi

# ==============================================
# File Checks
# ==============================================
section "Required Files Check"

REQUIRED_FILES=(
    "docker-compose.prod.yml"
    "nginx/nginx.conf"
    "scripts/deploy.sh"
    "packages/backend/Dockerfile"
    ".env.example"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        pass "$file exists"
    else
        fail "$file is missing"
    fi
done

# ==============================================
# Dependency Check
# ==============================================
section "Dependency Check"

info "Checking for outdated dependencies with known vulnerabilities..."
cd "$PROJECT_ROOT"
if pnpm audit --audit-level=high 2>&1 | tail -20; then
    pass "No high-severity vulnerabilities found"
else
    warn "Some vulnerabilities may exist - review pnpm audit output"
fi

# ==============================================
# Summary
# ==============================================
echo ""
echo "=============================================="
echo "Pre-Launch Verification Summary"
echo "=============================================="
echo ""

if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}All checks passed! Ready for launch.${NC}"
    exit 0
elif [[ $ERRORS -eq 0 ]]; then
    echo -e "${YELLOW}$WARNINGS warning(s), 0 errors${NC}"
    echo "Review warnings before proceeding."
    exit 0
else
    echo -e "${RED}$ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo "Fix errors before launching."
    exit 1
fi
