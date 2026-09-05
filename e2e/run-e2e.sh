#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DiagDesk End-to-End Integration Test
#
# Tests the complete patient → order → sample accession → result → report flow.
#
# Flow:
#   1. Register patient (patient-service)
#   2. Seed catalog test (catalog-service)
#   3. Create order (order-service) — auto-creates sample, returns accessionId UUID
#   4. Submit result (result-service, accessionId resolves orderId via order-service)
#   5. Generate report (reporting-service)
#   6. Sign off report (reporting-service)
#   7. Verify final report state
#   8. List API sanity checks
#
# Prerequisites:
#   - All 5 service JARs built: mvn package -DskipTests -B
#   - Infrastructure running: docker compose -f infra/docker-compose.e2e.yml up -d
#   - jq installed
#
# Usage:
#   ./e2e/run-e2e.sh                   # starts services too
#   ./e2e/run-e2e.sh --skip-startup    # services already running (CI)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SKIP_STARTUP=false
JARS_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-startup) SKIP_STARTUP=true; shift ;;
    --jars-dir)     JARS_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

TENANT_ID="00000000-0000-0000-0000-000000000001"
PATIENT_URL="http://localhost:8081"
CATALOG_URL="http://localhost:8082"
ORDER_URL="http://localhost:8083"
RESULT_URL="http://localhost:8085"
REPORT_URL="http://localhost:8086"

PIDS=()
PASS=0
FAIL=0
ERRORS=()

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
pass() { PASS=$((PASS+1)); log "  PASS: $*"; }
fail() { FAIL=$((FAIL+1)); ERRORS+=("$*"); log "  FAIL: $*"; }

# ── Start service JARs ────────────────────────────────────────────────────────
start_service() {
  local name="$1" jar_glob="$2" port="$3"
  local jar
  jar=$(ls ${jar_glob} 2>/dev/null | head -1)
  if [ -z "$jar" ]; then
    log "ERROR: JAR not found matching: $jar_glob"
    log "       Run: cd backend && mvn package -DskipTests -B"
    exit 1
  fi
  log "Starting $name on port $port..."
  SPRING_PROFILES_ACTIVE=local \
  DB_HOST=localhost DB_PORT=5433 DB_NAME=diagdesk DB_USER=diagdesk DB_PASSWORD=diagdesk \
  KAFKA_BOOTSTRAP=localhost:9092 \
  SPRING_DATA_REDIS_HOST=localhost SPRING_DATA_REDIS_PORT=6380 \
  SPRING_KAFKA_LISTENER_AUTO_STARTUP=false \
  SUPABASE_URL="" SUPABASE_SERVICE_ROLE_KEY="" \
  PATIENT_SERVICE_URL="http://localhost:8081" \
  CATALOG_SERVICE_URL="http://localhost:8082" \
  RESULT_SERVICE_URL="http://localhost:8085" \
  ORDER_SERVICE_URL="http://localhost:8083" \
  LAB_NAME="E2E Test Lab" \
  java -Xms128m -Xmx256m -jar "$jar" --server.port="$port" \
    >/tmp/diagdesk-${name}.log 2>&1 &
  PIDS+=($!)
}

wait_healthy() {
  local name="$1" url="$2" retries=40
  log "Waiting for $name to be ready..."
  for i in $(seq 1 $retries); do
    if curl -sf "${url}/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
      log "$name is UP"
      return 0
    fi
    sleep 3
  done
  log "ERROR: $name did not become healthy after $((retries*3))s"
  log "--- Last 30 lines of $name log ---"
  tail -30 /tmp/diagdesk-${name}.log 2>/dev/null || true
  exit 1
}

cleanup() {
  if [ ${#PIDS[@]} -gt 0 ]; then
    log "Stopping services..."
    kill "${PIDS[@]}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [ "$SKIP_STARTUP" = "false" ]; then
  start_service "patient-service"   "${JARS_DIR}/patient-service/target/patient-service-*.jar"       8081
  start_service "catalog-service"   "${JARS_DIR}/catalog-service/target/catalog-service-*.jar"       8082
  start_service "order-service"     "${JARS_DIR}/order-service/target/order-service-*.jar"           8083
  start_service "result-service"    "${JARS_DIR}/result-service/target/result-service-*.jar"         8085
  start_service "reporting-service" "${JARS_DIR}/reporting-service/target/reporting-service-*.jar"   8086

  wait_healthy "patient-service"   "$PATIENT_URL"
  wait_healthy "catalog-service"   "$CATALOG_URL"
  wait_healthy "order-service"     "$ORDER_URL"
  wait_healthy "result-service"    "$RESULT_URL"
  wait_healthy "reporting-service" "$REPORT_URL"
fi

log "═══════════════════════════════════════════════"
log "  DiagDesk E2E Test Suite"
log "═══════════════════════════════════════════════"

post() {
  curl -sf -X POST "$1" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -d "$2"
}

get() {
  curl -sf "$1" -H "X-Tenant-Id: ${TENANT_ID}"
}

patch() {
  curl -sf -X PATCH "$1" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -d "$2"
}

assert_field() {
  local label="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | jq -r "$field" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    pass "$label — $field = '$expected'"
  else
    fail "$label — $field: expected '$expected', got '$actual'"
  fi
}

assert_nonempty() {
  local label="$1" json="$2" field="$3"
  local actual
  actual=$(echo "$json" | jq -r "$field" 2>/dev/null)
  if [ -n "$actual" ] && [ "$actual" != "null" ]; then
    pass "$label — $field is non-empty"
  else
    fail "$label — $field is empty or null"
  fi
}

assert_count_gte() {
  local label="$1" json="$2" expr="$3" min="$4"
  local count
  count=$(echo "$json" | jq "$expr" 2>/dev/null || echo 0)
  if [ "${count:-0}" -ge "$min" ]; then
    pass "$label — count $count >= $min"
  else
    fail "$label — count $count < $min (expected >= $min)"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Register patient
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 1: Register patient ─────────────────────────────────────────────"
PATIENT=$(post "${PATIENT_URL}/v1/patients" '{
  "firstName": "Priya",
  "lastName":  "Sharma",
  "dateOfBirth": "1990-05-15",
  "gender": "female",
  "phone": "+919876543210"
}')

assert_nonempty "Patient create" "$PATIENT" ".patientId"
assert_field    "Patient create" "$PATIENT" ".firstName" "Priya"
assert_nonempty "Patient create" "$PATIENT" ".uhid"
PATIENT_ID=$(echo "$PATIENT" | jq -r '.patientId')
log "  patientId = $PATIENT_ID"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Seed catalog test
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 2: Seed catalog test ────────────────────────────────────────────"
TEST_ITEM=$(post "${CATALOG_URL}/v1/tests" '{
  "code": "CBC-E2E",
  "name": "Complete Blood Count E2E",
  "tatHours": 4,
  "specimenType": "Whole Blood"
}')

assert_nonempty "Catalog test create" "$TEST_ITEM" ".test_id"
assert_field    "Catalog test create" "$TEST_ITEM" ".code" "CBC-E2E"
TEST_ID=$(echo "$TEST_ITEM" | jq -r '.test_id')
log "  testId = $TEST_ID"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Create order
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 3: Create order ─────────────────────────────────────────────────"
ORDER=$(post "${ORDER_URL}/v1/orders" "{
  \"patientId\": \"${PATIENT_ID}\",
  \"branchId\":  \"${TENANT_ID}\",
  \"tests\": [{\"testId\": \"${TEST_ID}\"}]
}")

assert_nonempty "Order create" "$ORDER" ".orderId"
assert_field    "Order create" "$ORDER" ".patientId" "$PATIENT_ID"
assert_field    "Order create" "$ORDER" ".status"    "pending_collection"
# Order auto-creates a sample — grab its UUID for result submission
assert_nonempty "Order create" "$ORDER" ".samples[0].accessionId"
assert_nonempty "Order create" "$ORDER" ".accessionNumbers[0]"
ORDER_ID=$(echo "$ORDER" | jq -r '.orderId')
ACCESSION_ID=$(echo "$ORDER" | jq -r '.samples[0].accessionId')
log "  orderId = $ORDER_ID"
log "  accessionId (sample UUID) = $ACCESSION_ID"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Submit test result (uses auto-accessioned sample UUID from order)
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 4: Submit result ────────────────────────────────────────────────"
RESULT=$(post "${RESULT_URL}/v1/results" "{
  \"accessionId\": \"${ACCESSION_ID}\",
  \"testId\":      \"${TEST_ID}\",
  \"value\":       \"7.8\",
  \"unit\":        \"cells/μL\",
  \"source\":      \"ANALYZER\"
}")

assert_nonempty "Result submit" "$RESULT" ".resultId"
assert_field    "Result submit" "$RESULT" ".orderId"  "$ORDER_ID"
assert_field    "Result submit" "$RESULT" ".patientId" "$PATIENT_ID"
# ANALYZER source with normal value → auto-validated
assert_field    "Result submit" "$RESULT" ".validationStatus" "AUTO_VALIDATED"
RESULT_ID=$(echo "$RESULT" | jq -r '.resultId')
log "  resultId = $RESULT_ID"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Generate report
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 5: Generate report ──────────────────────────────────────────────"
REPORT=$(post "${REPORT_URL}/v1/reports/generate" "{
  \"orderId\":   \"${ORDER_ID}\",
  \"patientId\": \"${PATIENT_ID}\"
}")

assert_nonempty "Report generate" "$REPORT" ".reportId"
assert_field    "Report generate" "$REPORT" ".orderId"  "$ORDER_ID"
assert_field    "Report generate" "$REPORT" ".patientId" "$PATIENT_ID"
assert_field    "Report generate" "$REPORT" ".status"   "pending_signoff"
REPORT_ID=$(echo "$REPORT" | jq -r '.reportId')
log "  reportId = $REPORT_ID"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Sign off report
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 6: Sign off report ──────────────────────────────────────────────"
SIGNOFF=$(post "${REPORT_URL}/v1/reports/${REPORT_ID}/signoff" '{"pin": "1234"}')
assert_field    "Report signoff" "$SIGNOFF" ".status"   "signed_off"
assert_nonempty "Report signoff" "$SIGNOFF" ".signedAt"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Retrieve and verify final state
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 7: Verify final report state ───────────────────────────────────"
FINAL=$(get "${REPORT_URL}/v1/reports/${REPORT_ID}")
assert_field    "Report GET" "$FINAL" ".reportId" "$REPORT_ID"
assert_field    "Report GET" "$FINAL" ".status"   "signed_off"
assert_nonempty "Report GET" "$FINAL" ".signedAt"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 8 — List API sanity checks
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "── STEP 8: List API sanity checks ──────────────────────────────────────"

PATIENT_LIST=$(get "${PATIENT_URL}/v1/patients?q=Priya")
assert_count_gte "Patient list search" "$PATIENT_LIST" '.data | length' 1

ORDER_LIST=$(get "${ORDER_URL}/v1/orders?patient_id=${PATIENT_ID}")
assert_count_gte "Order list by patient" "$ORDER_LIST" '.data | length' 1

RESULT_LIST=$(get "${RESULT_URL}/v1/results?orderId=${ORDER_ID}")
assert_count_gte "Result list by order" "$RESULT_LIST" '.data | length' 1

REPORT_LIST=$(get "${REPORT_URL}/v1/reports?patient_id=${PATIENT_ID}")
assert_count_gte "Report list by patient" "$REPORT_LIST" '.data | length' 1

# Delivery status endpoint
DELIVERY=$(get "${REPORT_URL}/v1/reports/${REPORT_ID}/delivery-status")
assert_nonempty "Report delivery status" "$DELIVERY" ".deliveries"

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════
log ""
log "═══════════════════════════════════════════════"
log "  Results: ${PASS} passed, ${FAIL} failed"
log "═══════════════════════════════════════════════"

if [ "${FAIL}" -gt 0 ]; then
  log "Failures:"
  for err in "${ERRORS[@]}"; do
    log "  ✗ $err"
  done
  exit 1
fi

log "All E2E tests passed."
