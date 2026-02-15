#!/usr/bin/env bash
# Simple connection test script for the BioMuseum backend
# Run this from any terminal to verify the backend is running

BACKEND_URL="${1:-http://localhost:8000}"
API_URL="$BACKEND_URL/api"

echo "=========================================="
echo "🧪 BioMuseum Connection Test"
echo "=========================================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo "API URL: $API_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local name=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -X $method "$endpoint" \
        -H "Origin: http://localhost:3000" \
        -w "\n%{http_code}" \
        2>&1)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ $http_code == 200 ]] || [[ $http_code == 401 ]]; then
        echo "✅ ($http_code)"
    else
        echo "❌ ($http_code)"
    fi
}

# Test 1: Health Check
echo "1️⃣  Basic Connectivity:"
test_endpoint "GET" "$BACKEND_URL/" "Health Check"

# Test 2: CORS
echo ""
echo "2️⃣  CORS Configuration:"
echo -n "Testing CORS headers... "
cors_header=$(curl -s -I -X OPTIONS "$API_URL/organisms" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" | grep -i "access-control-allow-origin" | head -1)

if [ ! -z "$cors_header" ]; then
    echo "✅"
    echo "   $cors_header"
else
    echo "❌ (No CORS header)"
fi

# Test 3: API Endpoints
echo ""
echo "3️⃣  API Endpoints:"
test_endpoint "GET" "$API_URL/organisms" "GET /api/organisms"
test_endpoint "GET" "$API_URL/search?q=lion" "GET /api/search"
test_endpoint "POST" "$API_URL/admin/login" "POST /api/admin/login"

echo ""
echo "=========================================="
echo "✅ Connection testing complete!"
echo "=========================================="
