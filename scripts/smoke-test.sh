#!/bin/bash
set -e

# PropertyMaster Post-Deployment Smoke Test
# Run this script after deployment to verify critical paths are working

echo "=============================================="
echo "PropertyMaster Smoke Test"
echo "=============================================="
echo ""

# Configuration
API_BASE_URL="${API_URL:-http://localhost:3001/api/v1}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
TENANT_PORTAL_URL="${TENANT_PORTAL_URL:-http://localhost:3002}"

TESTS_PASSED=0
TESTS_FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

info() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

# Helper function for HTTP requests
http_test() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3

    info "Testing: $description"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10)

    if [[ "$HTTP_CODE" == "$expected_status" ]]; then
        pass "$description (HTTP $HTTP_CODE)"
        return 0
    else
        fail "$description (Expected $expected_status, got $HTTP_CODE)"
        return 1
    fi
}

# ==============================================
# API Health Checks
# ==============================================
echo ""
echo "1. API Health Checks"
echo "--------------------"

http_test "$API_BASE_URL/health" 200 "Health endpoint"
http_test "$API_BASE_URL/health/ready" 200 "Readiness probe"
http_test "$API_BASE_URL/health/live" 200 "Liveness probe"
http_test "$API_BASE_URL/health/version" 200 "Version endpoint"

# ==============================================
# API Authentication Endpoints
# ==============================================
echo ""
echo "2. Authentication Endpoints"
echo "---------------------------"

# Test password requirements endpoint (no auth needed)
http_test "$API_BASE_URL/auth/password-requirements" 200 "Password requirements"

# Test login endpoint exists (should return 401 without credentials)
info "Testing: Login endpoint (expecting 401)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    --connect-timeout 10)

if [[ "$HTTP_CODE" == "401" ]]; then
    pass "Login endpoint responds (HTTP 401 as expected)"
else
    fail "Login endpoint unexpected response (HTTP $HTTP_CODE)"
fi

# ==============================================
# API Protected Endpoints
# ==============================================
echo ""
echo "3. Protected Endpoints (Expecting 401)"
echo "--------------------------------------"

# These should all return 401 without auth
PROTECTED_ENDPOINTS=(
    "/properties"
    "/units"
    "/leases"
    "/tenants"
    "/payments"
    "/work-orders"
    "/documents"
    "/reports/occupancy"
)

for endpoint in "${PROTECTED_ENDPOINTS[@]}"; do
    info "Testing: $endpoint (expecting 401)"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$endpoint" --connect-timeout 10)

    if [[ "$HTTP_CODE" == "401" ]]; then
        pass "$endpoint is protected (HTTP 401)"
    else
        fail "$endpoint returned unexpected status (HTTP $HTTP_CODE)"
    fi
done

# ==============================================
# Frontend Availability
# ==============================================
echo ""
echo "4. Frontend Availability"
echo "------------------------"

# Admin frontend
info "Testing: Admin frontend"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" --connect-timeout 10)
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "304" ]]; then
    pass "Admin frontend accessible (HTTP $HTTP_CODE)"
else
    fail "Admin frontend not accessible (HTTP $HTTP_CODE)"
fi

# Tenant portal
info "Testing: Tenant portal"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TENANT_PORTAL_URL" --connect-timeout 10)
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "304" ]]; then
    pass "Tenant portal accessible (HTTP $HTTP_CODE)"
else
    fail "Tenant portal not accessible (HTTP $HTTP_CODE)"
fi

# ==============================================
# API Response Time
# ==============================================
echo ""
echo "5. API Response Time"
echo "--------------------"

info "Testing: Health endpoint response time"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_BASE_URL/health" --connect-timeout 10)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)
RESPONSE_INT=${RESPONSE_MS%.*}

if [[ $RESPONSE_INT -lt 500 ]]; then
    pass "Health endpoint response time: ${RESPONSE_INT}ms"
else
    fail "Health endpoint too slow: ${RESPONSE_INT}ms (should be <500ms)"
fi

# ==============================================
# SSL/TLS Check (if HTTPS)
# ==============================================
echo ""
echo "6. SSL/TLS Check"
echo "----------------"

if [[ "$API_BASE_URL" == https://* ]]; then
    info "Testing: SSL certificate"
    SSL_EXPIRY=$(echo | openssl s_client -servername "${API_BASE_URL#https://}" -connect "${API_BASE_URL#https://}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)

    if [[ -n "$SSL_EXPIRY" ]]; then
        pass "SSL certificate valid until: $SSL_EXPIRY"
    else
        fail "Could not verify SSL certificate"
    fi
else
    info "Skipping SSL check (not using HTTPS)"
fi

# ==============================================
# Webhook Endpoint
# ==============================================
echo ""
echo "7. Stripe Webhook Endpoint"
echo "--------------------------"

info "Testing: Stripe webhook endpoint"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_BASE_URL/payments/webhook/stripe" \
    -H "Content-Type: application/json" \
    -d '{}' \
    --connect-timeout 10)

# Webhook should return 400 (bad request without proper signature) or 200
if [[ "$HTTP_CODE" == "400" || "$HTTP_CODE" == "200" ]]; then
    pass "Stripe webhook endpoint accessible (HTTP $HTTP_CODE)"
else
    fail "Stripe webhook endpoint issue (HTTP $HTTP_CODE)"
fi

# ==============================================
# Summary
# ==============================================
echo ""
echo "=============================================="
echo "Smoke Test Summary"
echo "=============================================="
echo ""
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo "Total:  $TOTAL"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some smoke tests failed. Please investigate.${NC}"
    exit 1
fi
