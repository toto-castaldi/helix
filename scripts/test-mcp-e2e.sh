#!/bin/bash
set -euo pipefail

# ============================================
# Helix MCP Server - End-to-End Test Script
# ============================================
#
# Prerequisites:
#   1. Local Supabase must be running:
#      npm run supabase:start
#
#   2. Edge Functions must be served in a separate terminal:
#      npx supabase functions serve --env-file supabase/.env
#
# Usage:
#   bash scripts/test-mcp-e2e.sh
#
# The script will:
#   - Create a test user and API key
#   - Exercise all 20 resources, 16 tools, 5 prompts
#   - Test auth and validation error paths
#   - Clean up test data
#   - Print pass/fail summary
#   - Exit 0 on success, 1 on failure

# ============================================
# Constants
# ============================================

MCP_URL="http://127.0.0.1:54321/functions/v1/helix-mcp"
DB_HOST="127.0.0.1"
DB_PORT="54322"
DB_USER="postgres"
DB_NAME="postgres"
TEST_USER_ID="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
TEST_EMAIL="test@helix.local"

# ============================================
# Colors
# ============================================

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Counters
# ============================================

PASS=0
FAIL=0
TOTAL=0
RPC_ID=1

# ============================================
# Helper Functions
# ============================================

next_id() {
  local current=$RPC_ID
  RPC_ID=$((RPC_ID + 1))
  echo "$current"
}

mcp_call() {
  local method="$1"
  local params="$2"
  local id="$3"
  curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -H "X-Helix-API-Key: $TEST_API_KEY" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"id\":$id,\"params\":$params}"
}

mcp_call_no_auth() {
  local method="$1"
  local params="$2"
  local id="$3"
  curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"id\":$id,\"params\":$params}"
}

assert_result() {
  local test_name="$1"
  local response="$2"
  TOTAL=$((TOTAL + 1))

  # Check valid JSON
  if ! echo "$response" | jq . > /dev/null 2>&1; then
    echo -e "  ${RED}FAIL${NC} $test_name (invalid JSON)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check has "result" key
  local has_result
  has_result=$(echo "$response" | jq 'has("result")')
  if [ "$has_result" != "true" ]; then
    local err_msg
    err_msg=$(echo "$response" | jq -r '.error.message // "unknown error"')
    echo -e "  ${RED}FAIL${NC} $test_name (no result key: $err_msg)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check does NOT have "error" key
  local has_error
  has_error=$(echo "$response" | jq 'has("error")')
  if [ "$has_error" = "true" ]; then
    local err_msg
    err_msg=$(echo "$response" | jq -r '.error.message // "unknown error"')
    echo -e "  ${RED}FAIL${NC} $test_name (has error: $err_msg)"
    FAIL=$((FAIL + 1))
    return
  fi

  echo -e "  ${GREEN}PASS${NC} $test_name"
  PASS=$((PASS + 1))
}

assert_error() {
  local test_name="$1"
  local response="$2"
  TOTAL=$((TOTAL + 1))

  # Check valid JSON
  if ! echo "$response" | jq . > /dev/null 2>&1; then
    echo -e "  ${RED}FAIL${NC} $test_name (invalid JSON)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check has "error" key
  local has_error
  has_error=$(echo "$response" | jq 'has("error")')
  if [ "$has_error" = "true" ]; then
    echo -e "  ${GREEN}PASS${NC} $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name (expected error, got result)"
    FAIL=$((FAIL + 1))
  fi
}

assert_tool_result() {
  local test_name="$1"
  local response="$2"
  TOTAL=$((TOTAL + 1))

  # Check valid JSON
  if ! echo "$response" | jq . > /dev/null 2>&1; then
    echo -e "  ${RED}FAIL${NC} $test_name (invalid JSON)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check has result.content array
  local has_content
  has_content=$(echo "$response" | jq 'has("result") and (.result | has("content")) and (.result.content | type == "array")')
  if [ "$has_content" != "true" ]; then
    local err_msg
    err_msg=$(echo "$response" | jq -r '.error.message // "no result.content"')
    echo -e "  ${RED}FAIL${NC} $test_name (no result.content array: $err_msg)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check does NOT have result.isError
  local is_error
  is_error=$(echo "$response" | jq -r '.result.isError // false')
  if [ "$is_error" = "true" ]; then
    local err_text
    err_text=$(echo "$response" | jq -r '.result.content[0].text // "unknown"')
    echo -e "  ${RED}FAIL${NC} $test_name (isError=true: $err_text)"
    FAIL=$((FAIL + 1))
    return
  fi

  echo -e "  ${GREEN}PASS${NC} $test_name"
  PASS=$((PASS + 1))
}

assert_tool_error() {
  local test_name="$1"
  local response="$2"
  TOTAL=$((TOTAL + 1))

  # Check valid JSON
  if ! echo "$response" | jq . > /dev/null 2>&1; then
    echo -e "  ${RED}FAIL${NC} $test_name (invalid JSON)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check result.isError is true
  local is_error
  is_error=$(echo "$response" | jq -r '.result.isError // false')
  if [ "$is_error" = "true" ]; then
    echo -e "  ${GREEN}PASS${NC} $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name (expected isError=true)"
    FAIL=$((FAIL + 1))
  fi
}

assert_http_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  TOTAL=$((TOTAL + 1))

  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}PASS${NC} $test_name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name (expected HTTP $expected, got HTTP $actual)"
    FAIL=$((FAIL + 1))
  fi
}

run_sql() {
  PGPASSWORD=postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null | head -1
}

# Extract UUID from tool response text like "Session created successfully. ID: <uuid>"
extract_id() {
  echo "$1" | jq -r '.result.content[0].text' | grep -oP '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1
}

# ============================================
# Setup
# ============================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Helix MCP Server - E2E Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}--- Setup ---${NC}"

# Generate test API key
TEST_API_KEY="hx_test_$(openssl rand -hex 16)"
HASH=$(echo -n "$TEST_API_KEY" | sha256sum | cut -d' ' -f1)
echo "  Generated test API key: ${TEST_API_KEY:0:12}..."

# Create test user in auth.users
run_sql "INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('$TEST_USER_ID', '00000000-0000-0000-0000-000000000000', '$TEST_EMAIL', '\$2a\$10\$PxQpV9RTqJRCXHy3TRAzqeJQtVUFv1cFqfSyxxJpRxzPQJPeEXAMi', now(), 'authenticated', 'authenticated', '{\"provider\":\"email\",\"providers\":[\"email\"]}', '{}', now(), now(), '', '')
  ON CONFLICT (id) DO NOTHING;"
echo "  Created test user: $TEST_USER_ID"

# Insert API key hash
run_sql "INSERT INTO public.coach_ai_settings (user_id, helix_mcp_api_key_hash)
  VALUES ('$TEST_USER_ID', '$HASH')
  ON CONFLICT (user_id) DO UPDATE SET helix_mcp_api_key_hash = '$HASH';"
echo "  Inserted API key hash"

# Create test client
CLIENT_ID=$(run_sql "INSERT INTO public.clients (user_id, first_name, last_name, gender, age_years)
  VALUES ('$TEST_USER_ID', 'Test', 'Client', 'male', 30)
  RETURNING id;")
echo "  Created test client: $CLIENT_ID"

# Create test gym
GYM_ID=$(run_sql "INSERT INTO public.gyms (user_id, name, address)
  VALUES ('$TEST_USER_ID', 'Test Gym', 'Via Test 1')
  RETURNING id;")
echo "  Created test gym: $GYM_ID"

# Get a default exercise ID from seed data
EXERCISE_ID=$(run_sql "SELECT id FROM public.exercises WHERE user_id IS NULL LIMIT 1;")
echo "  Using seed exercise: $EXERCISE_ID"

# Get exercise name for create_training_plan
EXERCISE_NAME=$(run_sql "SELECT name FROM public.exercises WHERE id = '$EXERCISE_ID';")
echo "  Exercise name: $EXERCISE_NAME"

# Get a tag for tag-based resource test
TAG=$(run_sql "SELECT tag FROM public.exercise_tags LIMIT 1;")
echo "  Using tag: $TAG"

echo ""
echo -e "${GREEN}Setup complete${NC}"
echo ""

# Disable exit-on-error for test sections (accumulate pass/fail)
set +e

# ============================================
# 1. Protocol Tests
# ============================================

echo -e "${YELLOW}--- Protocol Tests ---${NC}"

# Test: initialize (no auth required)
RESP=$(mcp_call_no_auth "initialize" '{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}' "$(next_id)")
assert_result "initialize" "$RESP"

# Test: notifications/initialized (no id field = notification, expect HTTP 202)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}')
assert_http_status "notifications/initialized (HTTP 202)" "202" "$STATUS"

# Test: GET returns 405
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$MCP_URL")
assert_http_status "GET returns 405" "405" "$STATUS"

# Test: ping (with auth)
RESP=$(mcp_call "ping" '{}' "$(next_id)")
assert_result "ping" "$RESP"

echo ""

# ============================================
# 2. Auth Tests
# ============================================

echo -e "${YELLOW}--- Auth Tests ---${NC}"

# Test: no API key
RESP=$(mcp_call_no_auth "resources/list" '{}' "$(next_id)")
assert_error "resources/list without API key" "$RESP"

# Test: invalid API key
RESP=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "X-Helix-API-Key: hx_invalid_key_12345" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"resources/list\",\"id\":$(next_id),\"params\":{}}")
assert_error "resources/list with invalid API key" "$RESP"

echo ""

# ============================================
# 3. Resource List Test
# ============================================

echo -e "${YELLOW}--- Resource List ---${NC}"

RESP=$(mcp_call "resources/list" '{}' "$(next_id)")
assert_result "resources/list" "$RESP"
RESOURCE_COUNT=$(echo "$RESP" | jq '.result.resources | length')
echo -e "  ${BLUE}INFO${NC} Resource count: $RESOURCE_COUNT (expected 20)"

echo ""

# ============================================
# 4. Concrete Resource Read Tests
# ============================================

echo -e "${YELLOW}--- Concrete Resource Reads (9 tests) ---${NC}"

for URI in "helix://clients" "helix://gyms" "helix://exercises" "helix://exercises/tags" "helix://sessions" "helix://sessions/planned" "helix://group-templates" "helix://coach/summary" "helix://today"; do
  RESP=$(mcp_call "resources/read" "{\"uri\":\"$URI\"}" "$(next_id)")
  assert_result "read $URI" "$RESP"
done

echo ""

# ============================================
# 5. Tool Tests (create data, capture IDs)
# ============================================

echo -e "${YELLOW}--- Tool Tests (16 tools) ---${NC}"

# create_session
RESP=$(mcp_call "tools/call" "{\"name\":\"create_session\",\"arguments\":{\"client_id\":\"$CLIENT_ID\",\"session_date\":\"2026-03-01\",\"gym_id\":\"$GYM_ID\"}}" "$(next_id)")
assert_tool_result "create_session" "$RESP"
SESSION_ID=$(extract_id "$RESP")
echo -e "  ${BLUE}INFO${NC} Created session: $SESSION_ID"

# add_session_exercise
RESP=$(mcp_call "tools/call" "{\"name\":\"add_session_exercise\",\"arguments\":{\"session_id\":\"$SESSION_ID\",\"exercise_id\":\"$EXERCISE_ID\",\"sets\":3,\"reps\":10}}" "$(next_id)")
assert_tool_result "add_session_exercise" "$RESP"
SESSION_EXERCISE_ID=$(extract_id "$RESP")
echo -e "  ${BLUE}INFO${NC} Created session exercise: $SESSION_EXERCISE_ID"

# update_session
RESP=$(mcp_call "tools/call" "{\"name\":\"update_session\",\"arguments\":{\"session_id\":\"$SESSION_ID\",\"notes\":\"Test notes\"}}" "$(next_id)")
assert_tool_result "update_session" "$RESP"

# update_session_exercise
RESP=$(mcp_call "tools/call" "{\"name\":\"update_session_exercise\",\"arguments\":{\"session_exercise_id\":\"$SESSION_EXERCISE_ID\",\"sets\":3,\"reps\":12}}" "$(next_id)")
assert_tool_result "update_session_exercise" "$RESP"

# duplicate_session
RESP=$(mcp_call "tools/call" "{\"name\":\"duplicate_session\",\"arguments\":{\"session_id\":\"$SESSION_ID\",\"new_date\":\"2026-03-02\"}}" "$(next_id)")
assert_tool_result "duplicate_session" "$RESP"
DUPLICATE_SESSION_ID=$(extract_id "$RESP")
echo -e "  ${BLUE}INFO${NC} Duplicated session: $DUPLICATE_SESSION_ID"

# complete_session (on duplicate)
RESP=$(mcp_call "tools/call" "{\"name\":\"complete_session\",\"arguments\":{\"session_id\":\"$DUPLICATE_SESSION_ID\"}}" "$(next_id)")
assert_tool_result "complete_session" "$RESP"

# reorder_session_exercises
RESP=$(mcp_call "tools/call" "{\"name\":\"reorder_session_exercises\",\"arguments\":{\"session_id\":\"$SESSION_ID\",\"exercise_ids\":[\"$SESSION_EXERCISE_ID\"]}}" "$(next_id)")
assert_tool_result "reorder_session_exercises" "$RESP"

# create_training_plan
RESP=$(mcp_call "tools/call" "{\"name\":\"create_training_plan\",\"arguments\":{\"client_id\":\"$CLIENT_ID\",\"session_date\":\"2026-03-03\",\"exercises\":[{\"exercise_name\":\"$EXERCISE_NAME\",\"sets\":4,\"reps\":8}]}}" "$(next_id)")
assert_tool_result "create_training_plan" "$RESP"
PLAN_SESSION_ID=$(extract_id "$RESP")
echo -e "  ${BLUE}INFO${NC} Training plan session: $PLAN_SESSION_ID"

# create_group_template
RESP=$(mcp_call "tools/call" "{\"name\":\"create_group_template\",\"arguments\":{\"name\":\"Test Template\"}}" "$(next_id)")
assert_tool_result "create_group_template" "$RESP"
TEMPLATE_ID=$(extract_id "$RESP")
echo -e "  ${BLUE}INFO${NC} Created template: $TEMPLATE_ID"

# update_group_template
RESP=$(mcp_call "tools/call" "{\"name\":\"update_group_template\",\"arguments\":{\"template_id\":\"$TEMPLATE_ID\",\"name\":\"Updated Template\"}}" "$(next_id)")
assert_tool_result "update_group_template" "$RESP"

# add_template_exercise
RESP=$(mcp_call "tools/call" "{\"name\":\"add_template_exercise\",\"arguments\":{\"template_id\":\"$TEMPLATE_ID\",\"exercise_id\":\"$EXERCISE_ID\",\"sets\":3,\"reps\":12}}" "$(next_id)")
assert_tool_result "add_template_exercise" "$RESP"
TEMPLATE_EXERCISE_ID=$(extract_id "$RESP")
echo -e "  ${BLUE}INFO${NC} Created template exercise: $TEMPLATE_EXERCISE_ID"

# apply_template_to_session
RESP=$(mcp_call "tools/call" "{\"name\":\"apply_template_to_session\",\"arguments\":{\"template_id\":\"$TEMPLATE_ID\",\"session_id\":\"$SESSION_ID\",\"mode\":\"append\"}}" "$(next_id)")
assert_tool_result "apply_template_to_session" "$RESP"

echo ""

# ============================================
# 6. Templated Resource Read Tests
# ============================================

echo -e "${YELLOW}--- Templated Resource Reads (11 tests) ---${NC}"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://clients/$CLIENT_ID\"}" "$(next_id)")
assert_result "read helix://clients/{id}" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://clients/$CLIENT_ID/card\"}" "$(next_id)")
assert_result "read helix://clients/{id}/card" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://clients/$CLIENT_ID/goals\"}" "$(next_id)")
assert_result "read helix://clients/{id}/goals" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://clients/$CLIENT_ID/sessions\"}" "$(next_id)")
assert_result "read helix://clients/{id}/sessions" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://gyms/$GYM_ID\"}" "$(next_id)")
assert_result "read helix://gyms/{id}" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://exercises/$EXERCISE_ID\"}" "$(next_id)")
assert_result "read helix://exercises/{id}" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://exercises/$EXERCISE_ID/lumio\"}" "$(next_id)")
assert_result "read helix://exercises/{id}/lumio" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://exercises/tags/$TAG\"}" "$(next_id)")
assert_result "read helix://exercises/tags/{tag}" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://sessions/date/2026-03-01\"}" "$(next_id)")
assert_result "read helix://sessions/date/{date}" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://sessions/$SESSION_ID\"}" "$(next_id)")
assert_result "read helix://sessions/{id}" "$RESP"

RESP=$(mcp_call "resources/read" "{\"uri\":\"helix://group-templates/$TEMPLATE_ID\"}" "$(next_id)")
assert_result "read helix://group-templates/{id}" "$RESP"

echo ""

# ============================================
# 7. Tool List Test
# ============================================

echo -e "${YELLOW}--- Tool List ---${NC}"

RESP=$(mcp_call "tools/list" '{}' "$(next_id)")
assert_result "tools/list" "$RESP"
TOOL_COUNT=$(echo "$RESP" | jq '.result.tools | length')
echo -e "  ${BLUE}INFO${NC} Tool count: $TOOL_COUNT (expected 16)"

echo ""

# ============================================
# 8. Prompt Tests
# ============================================

echo -e "${YELLOW}--- Prompt Tests ---${NC}"

RESP=$(mcp_call "prompts/list" '{}' "$(next_id)")
assert_result "prompts/list" "$RESP"
PROMPT_COUNT=$(echo "$RESP" | jq '.result.prompts | length')
echo -e "  ${BLUE}INFO${NC} Prompt count: $PROMPT_COUNT (expected 5)"

RESP=$(mcp_call "prompts/get" "{\"name\":\"plan-session\",\"arguments\":{\"client_id\":\"$CLIENT_ID\"}}" "$(next_id)")
assert_result "prompts/get plan-session" "$RESP"

RESP=$(mcp_call "prompts/get" "{\"name\":\"weekly-plan\",\"arguments\":{\"client_id\":\"$CLIENT_ID\",\"start_date\":\"2026-03-01\",\"sessions_count\":\"3\"}}" "$(next_id)")
assert_result "prompts/get weekly-plan" "$RESP"

RESP=$(mcp_call "prompts/get" "{\"name\":\"session-review\",\"arguments\":{\"session_id\":\"$SESSION_ID\"}}" "$(next_id)")
assert_result "prompts/get session-review" "$RESP"

RESP=$(mcp_call "prompts/get" "{\"name\":\"daily-briefing\"}" "$(next_id)")
assert_result "prompts/get daily-briefing" "$RESP"

RESP=$(mcp_call "prompts/get" "{\"name\":\"template-analysis\"}" "$(next_id)")
assert_result "prompts/get template-analysis" "$RESP"

echo ""

# ============================================
# 9. Validation Tests
# ============================================

echo -e "${YELLOW}--- Validation Tests ---${NC}"

# Invalid UUID for client_id
RESP=$(mcp_call "tools/call" '{"name":"create_session","arguments":{"client_id":"not-a-uuid","session_date":"2026-03-01"}}' "$(next_id)")
assert_tool_error "create_session with invalid client_id" "$RESP"

# Missing session_date
RESP=$(mcp_call "tools/call" '{"name":"create_session","arguments":{"client_id":"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}}' "$(next_id)")
assert_tool_error "create_session with missing session_date" "$RESP"

# Missing session_id for update_session
RESP=$(mcp_call "tools/call" '{"name":"update_session","arguments":{"notes":"test"}}' "$(next_id)")
assert_tool_error "update_session with missing session_id" "$RESP"

echo ""

# ============================================
# 10. Destructive Tool Tests (run last)
# ============================================

echo -e "${YELLOW}--- Destructive Tool Tests ---${NC}"

# remove_template_exercise
RESP=$(mcp_call "tools/call" "{\"name\":\"remove_template_exercise\",\"arguments\":{\"template_exercise_id\":\"$TEMPLATE_EXERCISE_ID\"}}" "$(next_id)")
assert_tool_result "remove_template_exercise" "$RESP"

# delete_group_template (must remove exercises from sessions first)
# Remove the applied template exercises from session
APPLIED_SE_IDS=$(run_sql "SELECT id FROM public.session_exercises WHERE session_id = '$SESSION_ID' AND template_id = '$TEMPLATE_ID';")
for se_id in $APPLIED_SE_IDS; do
  mcp_call "tools/call" "{\"name\":\"remove_session_exercise\",\"arguments\":{\"session_exercise_id\":\"$se_id\"}}" "$(next_id)" > /dev/null
done

RESP=$(mcp_call "tools/call" "{\"name\":\"delete_group_template\",\"arguments\":{\"template_id\":\"$TEMPLATE_ID\"}}" "$(next_id)")
assert_tool_result "delete_group_template" "$RESP"

# remove_session_exercise
RESP=$(mcp_call "tools/call" "{\"name\":\"remove_session_exercise\",\"arguments\":{\"session_exercise_id\":\"$SESSION_EXERCISE_ID\"}}" "$(next_id)")
assert_tool_result "remove_session_exercise" "$RESP"

# delete_session
RESP=$(mcp_call "tools/call" "{\"name\":\"delete_session\",\"arguments\":{\"session_id\":\"$SESSION_ID\"}}" "$(next_id)")
assert_tool_result "delete_session" "$RESP"

echo ""

# Re-enable strict mode
set -e

# ============================================
# Cleanup
# ============================================

echo -e "${YELLOW}--- Cleanup ---${NC}"

# Delete all sessions for the test user's clients (catches duplicated and plan sessions)
run_sql "DELETE FROM public.session_exercises WHERE session_id IN (SELECT id FROM public.sessions WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = '$TEST_USER_ID'));" > /dev/null
run_sql "DELETE FROM public.sessions WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = '$TEST_USER_ID');" > /dev/null
run_sql "DELETE FROM public.group_template_exercises WHERE template_id IN (SELECT id FROM public.group_templates WHERE user_id = '$TEST_USER_ID');" > /dev/null
run_sql "DELETE FROM public.group_templates WHERE user_id = '$TEST_USER_ID';" > /dev/null
run_sql "DELETE FROM public.goal_history WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = '$TEST_USER_ID');" > /dev/null
run_sql "DELETE FROM public.clients WHERE user_id = '$TEST_USER_ID';" > /dev/null
run_sql "DELETE FROM public.gyms WHERE user_id = '$TEST_USER_ID';" > /dev/null
run_sql "DELETE FROM public.coach_ai_settings WHERE user_id = '$TEST_USER_ID';" > /dev/null
run_sql "DELETE FROM auth.users WHERE id = '$TEST_USER_ID';" > /dev/null

echo "  Cleaned up all test data"

# Verify cleanup
REMAINING=$(run_sql "SELECT count(*) FROM public.clients WHERE user_id = '$TEST_USER_ID';")
if [ "$REMAINING" = "0" ]; then
  echo -e "  ${GREEN}Cleanup verified${NC}: no test clients remaining"
else
  echo -e "  ${RED}Cleanup issue${NC}: $REMAINING test clients still exist"
fi

echo ""

# ============================================
# Summary
# ============================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Results: $PASS passed, $FAIL failed out of $TOTAL tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
