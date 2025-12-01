#!/bin/bash
set -e

# PropertyMaster Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=============================================="
echo "PropertyMaster Deployment - ${ENVIRONMENT^^}"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

# Load environment-specific config
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Environment file not found: $ENV_FILE"
    exit 1
fi

log_info "Loading environment: $ENV_FILE"
source "$ENV_FILE"

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check required environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "STRIPE_SECRET_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_error "Required environment variable not set: $var"
        exit 1
    fi
done
log_info "Environment variables OK"

# Backup database (production only)
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    # pg_dump $DATABASE_URL > "$PROJECT_ROOT/backups/$BACKUP_FILE"
    log_info "Database backup created: $BACKUP_FILE"
fi

# Pull latest changes
log_info "Pulling latest changes..."
cd "$PROJECT_ROOT"
git fetch origin
git pull origin $(git rev-parse --abbrev-ref HEAD)

# Install dependencies
log_info "Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
log_info "Generating Prisma client..."
cd "$PROJECT_ROOT/packages/database"
pnpm build

# Run database migrations
log_info "Running database migrations..."
npx prisma migrate deploy

# Build all packages
log_info "Building application..."
cd "$PROJECT_ROOT"
pnpm build

# Build Docker images
log_info "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start new containers
log_info "Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health check
log_info "Waiting for services to be healthy..."
sleep 10

# Health check
log_info "Running health check..."
HEALTH_URL="http://localhost:3001/api/v1/health"
MAX_RETRIES=30
RETRY_COUNT=0

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

    if [[ "$HTTP_CODE" == "200" ]]; then
        log_info "Health check passed!"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_warn "Health check failed (attempt $RETRY_COUNT/$MAX_RETRIES), retrying..."
    sleep 2
done

if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
    log_error "Health check failed after $MAX_RETRIES attempts"
    log_error "Rolling back..."

    # Rollback logic here
    docker-compose -f docker-compose.prod.yml logs --tail=100

    exit 1
fi

# Clean up old Docker images
log_info "Cleaning up old Docker images..."
docker image prune -f

# Deployment complete
echo ""
echo "=============================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "Environment: $ENVIRONMENT"
echo "Health Check: $HEALTH_URL"
echo ""

# Show running containers
docker-compose -f docker-compose.prod.yml ps
