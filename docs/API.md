# DiagDesk API Reference

A **10-service India-first SaaS diagnostic lab platform** built on **Java 21 / Spring Boot 3.3.4** and **Go**. DiagDesk manages the complete diagnostic workflow — patient registration, test ordering, sample collection, analyzer result ingestion, pathologist validation, PDF report generation, and delivery — across multi-tenant branch labs with a central cloud analytics tier.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     React / Vite Frontend                                │
│              (Vercel CDN — offline-first, service worker)                │
│  Supabase JS client for reads/auth fallback                              │
│  Offline queue (IndexedDB) replays mutations on reconnect               │
└─────────────────────────┬────────────────────────────────────────────────┘
                          │ HTTPS  (X-Tenant-Id + Bearer JWT)
                          ▼
┌────────────────── Branch Services (k3s / EC2) ───────────────────────────┐
│  patient-service   :8081  POST/GET/PUT  /v1/patients                     │
│  catalog-service   :8082  POST/GET/PUT  /v1/tests, /v1/panels            │
│  order-service     :8083  POST/GET/PATCH /v1/orders, /v1/samples         │
│  device-gateway    :8084  ASTM/HL7 raw TCP → JSON → Kafka   (Go)        │
│  result-service    :8085  POST/GET/PUT  /v1/results                      │
│  reporting-service :8086  POST/GET      /v1/reports                      │
│  notification-svc  :8088  POST/GET      /v1/notifications                │
└───────┬───────────────────────────────────────────────────────────────────┘
        │ Kafka topics (choreography, no orchestrator)
        ▼
┌────────────────── Kafka Events ──────────────────────────────────────────┐
│  result-validated   result-service → reporting-service, notification     │
│  report-ready       reporting-service → notification-service             │
│  notification-events notification-service                                │
│  order-events       order-service                                        │
│  audit-events       all services → audit-consent-service                 │
└───────┬───────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────── Central Cloud Services ────────────────────────────────┐
│  mis-analytics     :8087  GET  /v1/analytics/*                           │
│  audit-consent     :8089  POST/GET /v1/audit, /v1/consent, /v1/dsr      │
│  b2b-billing       :8090  POST/GET /v1/b2b-partners, /v1/b2b-invoices   │
└───────┬───────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────── Data Layer ────────────────────────────────────────────┐
│  Supabase PostgreSQL (per-service schemas, RLS per tenant)               │
│  Redis (idempotency keys, session cache)                                 │
│  Supabase Storage (PDF reports — lab-reports bucket)                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Detail |
|----------|--------|
| **Multi-tenant** | Every request carries `X-Tenant-Id` (branch UUID); PostgreSQL RLS enforces isolation |
| **OIDC Auth** | Keycloak 24 issues JWTs; services verify via Spring Security JWKS auto-config |
| **Local dev profile** | `SPRING_PROFILES_ACTIVE=local` skips JWT verification; `X-Tenant-Id` header injects tenant |
| **Event-driven** | Kafka choreography — result validated → report generated → notification sent, no saga orchestrator |
| **Idempotency** | All POST mutations accept `X-Idempotency-Key` (UUID); Redis deduplicates within 24 h |
| **UUIDv7** | All primary keys are time-ordered UUIDv7 (sortable, index-friendly) |
| **PgBouncer** | Supabase transaction-mode pooler; all JDBC URLs include `prepareThreshold=0` |
| **PDF generation** | Thymeleaf HTML template → Supabase Storage; `pdfUrl` returned in report response |
| **SMS/WhatsApp** | MSG91 gateway (TRAI-DLT registered sender); fallback to SMS if WhatsApp fails |
| **Flyway** | Schema migrations per-service (`V1__init.sql`, `V2__seed_*.sql`) |
| **Offline-first** | Frontend service worker + IndexedDB offline queue replays mutations |

---

## Project Structure

```
DiagDesk/
├── backend/
│   ├── common-lib/                    # Shared: PageResponse, ErrorResponse, TenantFilter, UUIDv7
│   ├── patient-service/               # :8081 — Patient registration, UHID, dedup
│   ├── catalog-service/               # :8082 — Test master, panels, reference ranges, NABL catalogue
│   ├── order-service/                 # :8083 — Orders, sample accession, worklist, TAT
│   ├── device-gateway/                # :8084 — ASTM/HL7 analyzer bridge (Go)
│   ├── result-service/                # :8085 — Result entry, validation, critical alerts, delta check
│   ├── reporting-service/             # :8086 — PDF report generation, sign-off, delivery
│   ├── mis-analytics-service/         # :8087 — Revenue, TAT, referrals, operations MIS
│   ├── notification-service/          # :8088 — SMS/WhatsApp via MSG91, email
│   ├── audit-consent-service/         # :8089 — HIPAA audit log, consent, DSR, breach
│   ├── b2b-billing-service/           # :8090 — B2B partners, invoices, receivables, follow-ups
│   └── sync-engine/                   # Go — offline vector-clock sync (branch ↔ cloud)
│
├── frontend/
│   ├── src/lib/api.ts                 # All API calls + Supabase fallbacks
│   ├── src/lib/offlineQueue.ts        # IndexedDB mutation queue
│   ├── src/hooks/useOnlineStatus.ts   # Online/offline detection
│   ├── public/sw.js                   # Service worker
│   └── vercel.json                    # SPA rewrite for Vercel deployment
│
├── infra/
│   ├── docker-compose.yml             # Local dev: Keycloak, Postgres, Redis, Kafka, Grafana, Jaeger
│   ├── docker-compose.e2e.yml         # CI E2E infra: Postgres:5433, Redis:6380, Kafka:9092
│   ├── postgres/init.sql              # All 10 schemas bootstrapped
│   ├── helm/diagdesk-branch/          # Helm chart: 7 branch services + k3s
│   ├── helm/diagdesk-central/         # Helm chart: mis-analytics, audit-consent, b2b-billing
│   ├── keycloak/realm-diagdesk.json   # Realm: 6 roles, 2 clients, 4 demo users (Demo@1234)
│   ├── nginx/ec2.conf                 # Nginx reverse proxy for manual EC2 deployment
│   └── prometheus/prometheus.yml      # Metrics scrape config
│
├── e2e/
│   └── run-e2e.sh                     # Patient→Order→Result→Report E2E test
│
└── .github/workflows/
    ├── ci.yml                         # Build, test, E2E on every PR
    └── docker.yml                     # Build + push to GHCR on merge
```

---

## Authentication

### Production (Keycloak JWT)

All endpoints require a valid Keycloak JWT:

```bash
curl -X POST "https://<branch-host>/v1/patients" \
  -H "Authorization: Bearer <keycloak-jwt>" \
  -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{...}'
```

**Get a token from Keycloak:**
```bash
curl -X POST "https://<keycloak-host>/realms/diagdesk/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=diagdesk-frontend&username=receptionist@demo.diagdesk.in&password=Demo%401234"
```

### Local Dev (No JWT)

Set `SPRING_PROFILES_ACTIVE=local`. The `LocalDevTenantFilter` injects `X-Tenant-Id` as the tenant — no `Authorization` header needed:

```bash
curl -X POST "http://localhost:8081/v1/patients" \
  -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Common Headers

| Header | Required | Type | Description |
|--------|----------|------|-------------|
| `X-Tenant-Id` | **Yes** | `string` (UUID) | Branch UUID; enforced by RLS |
| `Authorization` | **Yes** (prod) | `string` | `Bearer <keycloak-jwt>` |
| `X-Idempotency-Key` | No (recommended) | `string` (UUID) | Deduplicates POST mutations for 24 h |
| `Content-Type` | Yes (POST/PUT/PATCH) | `string` | `application/json` |

---

## Common Error Responses

| Status | Meaning | Response Body |
|--------|---------|---------------|
| **200** | Success | `{ ... }` |
| **201** | Created | `{ ... }` |
| **400** | Validation error | `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "phone", "message": "..." }] } }` |
| **401** | Missing / invalid JWT | `{ "error": { "code": "UNAUTHORIZED" } }` |
| **403** | Insufficient authority | `{ "error": { "code": "FORBIDDEN", "required": "report.signoff" } }` |
| **404** | Resource not found | `{ "error": { "code": "NOT_FOUND", "message": "Patient 'X' not found" } }` |
| **409** | Duplicate / conflict | `{ "error": { "code": "CONFLICT", "message": "Patient with phone '+91...' already exists" } }` |
| **500** | Internal server error | `{ "error": { "code": "INTERNAL_ERROR" } }` |

---

## Status Enums

### `OrderStatus`

| Value | Description |
|-------|-------------|
| `pending_collection` | Order created; sample not yet collected |
| `collected` | Sample collected by phlebotomist |
| `in_processing` | Sample in the lab / analyzer |
| `partially_complete` | Some tests resulted; others pending |
| `complete` | All tests resulted and validated |
| `cancelled` | Order cancelled |

### `ResultValidationStatus`

| Value | Description |
|-------|-------------|
| `PENDING` | Awaiting technician or pathologist validation |
| `AUTO_VALIDATED` | Source = `ANALYZER` + value within reference range; auto-passed |
| `MANUAL_VALIDATED` | Pathologist reviewed and approved |
| `REJECTED` | Pathologist rejected; repeat required |

### `ReportStatus`

| Value | Description |
|-------|-------------|
| `pending_signoff` | Generated; waiting for pathologist sign-off |
| `signed_off` | Pathologist signed off; PDF generated |
| `rejected` | Report returned for amendment |

### `SampleStatus`

| Value | Description |
|-------|-------------|
| `accessioned` | Sample tube labelled and logged |
| `collected` | Collected from patient |
| `in_transit` | In transit to lab |
| `received` | Received at lab |
| `processing` | On the analyzer or in process |
| `rejected` | Sample rejected (haemolysis, insufficient volume, etc.) |
| `resulted` | Results entered |

### `NotificationChannel`

| Value | Description |
|-------|-------------|
| `SMS` | Plain SMS via MSG91 |
| `WHATSAPP` | WhatsApp Business via MSG91 |
| `EMAIL` | Transactional email |

### `AnalyticsPeriod`

`today` \| `week` \| `month` \| `quarter` \| `year`

---

## RBAC — Permission Authorities

Keycloak roles map to Spring Security authorities. Key ones used by `@PreAuthorize`:

| Authority | Roles with this permission |
|-----------|---------------------------|
| `registration.create` | receptionist, admin |
| `report.validate` | technician, pathologist, admin |
| `report.signoff` | pathologist, admin |
| `report.deliver` | receptionist, pathologist, admin |
| `report.print` | receptionist, pathologist, admin |
| `report.handover` | phlebotomist, receptionist, admin |
| `audit.view` | admin, pathologist |
| `master.test.manage` | admin |
| `master.partner.manage` | admin |
| `finance.reports.money_collections` | accountant, admin |
| `finance.reports.master` | admin |
| `finance.reports.referral_activity` | admin |
| `b2b.view` | admin, accountant |
| `b2b.edit` | admin |

---

## API Endpoints — Complete Reference

---

## 1. Patient Service — `:8081`

---

### `POST /v1/patients`

Register a new patient. Generates a unique UHID (`UHID-XXXX`) and checks for duplicates by phone.

**Required authority:** `registration.create`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | `string` | **Yes** | Patient first name (max 100 chars) |
| `lastName` | `string` | **Yes** | Patient last name (max 100 chars) |
| `dateOfBirth` | `string` (YYYY-MM-DD) | **Yes** | Must be in the past |
| `gender` | `string` | **Yes** | `"male"`, `"female"`, or `"other"` |
| `phone` | `string` | **Yes** | Indian mobile: `+91XXXXXXXXXX` |
| `email` | `string` | No | Valid email address |
| `address` | `object` | No | `{ line1, city, state, pincode }` |
| `aadhaarLast4` | `string` | No | Last 4 digits of Aadhaar |
| `bloodGroup` | `string` | No | `A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-`, `unknown` |
| `allergies` | `string[]` | No | List of known allergies |
| `referredByDoctorId` | `string` (UUID) | No | Referring doctor ID |

**Example request:**
```json
{
  "firstName": "Priya",
  "lastName": "Sharma",
  "dateOfBirth": "1990-05-15",
  "gender": "female",
  "phone": "+919876543210",
  "email": "priya.sharma@email.com",
  "address": {
    "line1": "12 MG Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560001"
  },
  "bloodGroup": "B+"
}
```

**Response (201 Created):**
```json
{
  "patientId": "019506a0-1234-7abc-8def-000000000001",
  "uhid": "UHID-0001",
  "firstName": "Priya",
  "lastName": "Sharma",
  "dateOfBirth": "1990-05-15",
  "gender": "female",
  "phone": "+919876543210",
  "email": "priya.sharma@email.com",
  "bloodGroup": "B+",
  "allergies": [],
  "createdAt": "2026-09-05T10:30:00Z"
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 409 | Patient with same phone already exists |
| 400 | Phone format invalid (not `+91XXXXXXXXXX`) |

---

### `GET /v1/patients/{patientId}`

Get full patient details by UUID.

**Required authority:** `registration.create`

**Response (200 OK):** Same structure as POST response above.

---

### `GET /v1/patients?q=&branch_id=&page=0&size=20`

Search / list patients.

**Required authority:** `registration.create`

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | `string` | Free-text search (name, phone, UHID) |
| `branch_id` | `string` (UUID) | Filter to a specific branch |
| `page` | `int` | 0-based page (default: 0) |
| `size` | `int` | Page size (default: 20) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "patientId": "019506a0-...",
      "uhid": "UHID-0001",
      "name": "Priya Sharma",
      "phone": "+919876543210",
      "dateOfBirth": "1990-05-15",
      "gender": "female"
    }
  ],
  "total": 1,
  "page": 0,
  "size": 20
}
```

---

### `PUT /v1/patients/{patientId}`

Full update of patient record.

**Required authority:** `registration.create`

**Request body:** Same as `POST /v1/patients`.

**Response (200 OK):** Full patient object.

---

### `POST /v1/patients/dedup-check`

Check if a patient with the same phone or Aadhaar last-4 already exists before registration.

**Request body:**
```json
{
  "phone": "+919876543210",
  "aadhaarLast4": "1234"
}
```

**Response (200 OK):**
```json
{
  "isDuplicate": true,
  "existingPatientId": "019506a0-...",
  "uhid": "UHID-0001",
  "matchedOn": "phone"
}
```

---

### `POST /v1/patients/{patientId}/consent`

Capture patient's written/verbal consent (DPDPA/HIPAA compliance).

**Required authority:** `registration.create`

**Request body:**
```json
{
  "consentType": "data_processing",
  "consentGiven": true,
  "method": "written",
  "notes": "Patient signed consent form at reception"
}
```

**Response (201 Created):**
```json
{
  "consentId": "019506b0-...",
  "patientId": "019506a0-...",
  "consentType": "data_processing",
  "consentGiven": true,
  "method": "written",
  "capturedAt": "2026-09-05T10:31:00Z"
}
```

---

### `GET /v1/patients/{patientId}/consent`

Get all consents for a patient.

**Required authority:** `audit.view`

**Response:** Array of consent objects.

---

## 2. Catalog Service — `:8082`

---

### `POST /v1/tests`

Create a new test in the master catalog.

**Required authority:** `master.test.manage`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | **Yes** | Unique test code (e.g., `CBC`, `LFT`) |
| `name` | `string` | **Yes** | Display name |
| `tatHours` | `int` | **Yes** | Turnaround time in hours |
| `specimenType` | `string` | **Yes** | e.g., `Whole Blood`, `Serum`, `Urine` |
| `department` | `string` | No | Department name |
| `departmentId` | `string` (UUID) | No | Department UUID |
| `price` | `number` | No | Default price (INR) |
| `method` | `string` | No | Analytical method |
| `isCustom` | `boolean` | No | Custom (non-NABL) test |
| `unit` | `string` | No | Result unit (e.g., `g/dL`) |

**Example request:**
```json
{
  "code": "CBC",
  "name": "Complete Blood Count",
  "tatHours": 4,
  "specimenType": "Whole Blood",
  "department": "Hematology",
  "price": 250,
  "unit": "cells/μL"
}
```

**Response (201 Created):**
```json
{
  "test_id": "019506c0-...",
  "created_at": "2026-09-05T10:32:00Z"
}
```

> **Note:** The create response returns `test_id` (snake_case). Full details are fetched via `GET /v1/tests/{testId}`.

---

### `GET /v1/tests/{testId}`

Get full test details including parameters and reference ranges.

**Required authority:** `isAuthenticated()`

**Response (200 OK):**
```json
{
  "testId": "019506c0-...",
  "code": "CBC",
  "name": "Complete Blood Count",
  "tatHours": 4,
  "specimenType": "Whole Blood",
  "department": "Hematology",
  "price": 250,
  "unit": "cells/μL",
  "isCustom": false,
  "createdAt": "2026-09-05T10:32:00Z"
}
```

---

### `GET /v1/tests?q=&department_id=&is_custom=&page=0&size=20`

Search / list tests.

**Response:**
```json
{
  "data": [
    {
      "testId": "019506c0-...",
      "code": "CBC",
      "name": "Complete Blood Count",
      "tatHours": 4,
      "specimenType": "Whole Blood",
      "department": "Hematology",
      "price": 250
    }
  ],
  "total": 42,
  "page": 0,
  "size": 20
}
```

---

### `PUT /v1/tests/{testId}`

Update test master data. **Required authority:** `master.test.manage`

**Request body:** Same as `POST /v1/tests`.

---

### `DELETE /v1/tests/{testId}`

Soft-delete a test. **Required authority:** `master.test.manage`

**Response:** `204 No Content`

---

### `POST /v1/tests/{testId}/reference-ranges`

Add a reference range (by age/gender/condition).

**Required authority:** `master.test.manage`

**Request body:**
```json
{
  "gender": "female",
  "ageFromYears": 18,
  "ageToYears": 60,
  "condition": null,
  "lowerBound": 11.5,
  "upperBound": 16.5,
  "criticalLow": 7.0,
  "criticalHigh": 20.0,
  "unit": "g/dL",
  "notes": "Adult women"
}
```

**Response (201 Created):** `{ "range_id": "019506d0-..." }`

---

### `GET /v1/tests/{testId}/reference-ranges`

Get all reference ranges for a test.

**Response:** Array of reference range objects with `rangeId`, `gender`, `ageFromYears`, `ageToYears`, `lowerBound`, `upperBound`, `criticalLow`, `criticalHigh`, `unit`.

---

### `GET /v1/nabl-catalogue?q=&category=&page=0&size=20`

Browse the standardised NABL test catalogue for import.

**Response:** `PageResponse<NablEntryResponse>` — entries with `nablCode`, `testName`, `specimenType`, `unit`, `category`.

---

### `POST /v1/tests/import-from-nabl`

Import one or more tests from the NABL catalogue into the tenant's master.

**Required authority:** `master.test.manage`

**Request body:**
```json
{
  "nablCodes": ["NABL-CBC-001", "NABL-LFT-002"]
}
```

**Response:**
```json
{
  "imported": 2,
  "testIds": ["019506e0-...", "019506e1-..."]
}
```

---

## 3. Order Service — `:8083`

---

### `POST /v1/orders`

Create a new lab order. Automatically creates one Sample per test item and assigns accession numbers (`ACC-XXXX`).

**Required authority:** `registration.create`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patientId` | `string` (UUID) | **Yes** | Registered patient UUID |
| `branchId` | `string` (UUID) | **Yes** | Branch UUID |
| `tests` | `array` | **Yes** | List of `{ testId }` or `{ panelId }` |
| `referredByDoctorId` | `string` (UUID) | No | Referring doctor UUID |
| `b2bPartnerId` | `string` (UUID) | No | B2B partner for billing |
| `priority` | `string` | No | `"routine"` (default) or `"urgent"` or `"stat"` |
| `clinicalNotes` | `string` | No | Clinical history / notes |
| `collectionType` | `string` | No | `"walk_in"` (default) or `"home_collection"` |

**Example request:**
```json
{
  "patientId": "019506a0-1234-7abc-8def-000000000001",
  "branchId": "00000000-0000-0000-0000-000000000001",
  "tests": [
    { "testId": "019506c0-..." },
    { "testId": "019506c1-..." }
  ],
  "priority": "routine",
  "clinicalNotes": "Fever for 3 days, rule out malaria"
}
```

**Response (201 Created):**
```json
{
  "orderId": "019506f0-...",
  "patientId": "019506a0-...",
  "branchId": "00000000-0000-0000-0000-000000000001",
  "status": "pending_collection",
  "priority": "routine",
  "orderNumber": "ORD-20260905-0001",
  "accessionNumbers": ["ACC-0001", "ACC-0002"],
  "samples": [
    {
      "accessionId": "01950700-...",
      "accessionNumber": "ACC-0001",
      "testId": "019506c0-...",
      "specimenType": "Whole Blood",
      "status": "accessioned"
    },
    {
      "accessionId": "01950701-...",
      "accessionNumber": "ACC-0002",
      "testId": "019506c1-...",
      "specimenType": "Serum",
      "status": "accessioned"
    }
  ],
  "clinicalNotes": "Fever for 3 days, rule out malaria",
  "createdAt": "2026-09-05T10:33:00Z"
}
```

> **Key field:** `samples[n].accessionId` is the UUID used by result-service when submitting results. `accessionNumbers[n]` is the human-readable label printed on the tube barcode.

---

### `GET /v1/orders/{orderId}`

Get order with all samples and current status.

**Required authority:** `isAuthenticated()`

**Response (200 OK):** Same structure as POST response.

---

### `GET /v1/orders?patient_id=&status=&branch_id=&date_from=&date_to=&priority=&assigned_to=&page=0&size=20`

Search / list orders.

| Param | Type | Description |
|-------|------|-------------|
| `patient_id` | UUID | Filter by patient |
| `status` | string | Filter by `OrderStatus` |
| `branch_id` | UUID | Filter by branch |
| `date_from` | ISO 8601 | Orders created on or after |
| `date_to` | ISO 8601 | Orders created on or before |
| `priority` | string | `routine`, `urgent`, `stat` |
| `assigned_to` | UUID | Filter by phlebotomist user ID |

**Response:** `PageResponse<OrderResponse>` — array of order summaries.

---

### `PATCH /v1/orders/{orderId}/status`

Update order status (e.g., mark as collected after phlebotomy).

**Required authority:** `isAuthenticated()`

**Request body:**
```json
{ "status": "collected" }
```

**Response (200 OK):** Full order object with updated status.

---

### `PATCH /v1/orders/{orderId}/cancel`

Cancel an order with a reason.

**Required authority:** `registration.create`

**Request body:**
```json
{ "reason": "Patient walked out before sample collection" }
```

---

### `POST /v1/orders/{orderId}/add-tests`

Add more tests to an existing order (creates new sample accessions).

**Required authority:** `registration.create`

**Request body:**
```json
{ "tests": [{ "testId": "019506c2-..." }] }
```

**Response:**
```json
{ "new_accession_numbers": ["ACC-0003"] }
```

---

### `GET /v1/orders/tat-breaches?branch_id=&department_id=`

Get all orders that have breached their promised TAT.

**Required authority:** `isAuthenticated()`

**Response:**
```json
{
  "data": [
    {
      "orderId": "019506f0-...",
      "accessionId": "01950700-...",
      "testName": "LFT",
      "tatHours": 12,
      "elapsedHours": 14.5,
      "breachMinutes": 150
    }
  ]
}
```

---

### `GET /v1/samples/{accessionId}`

Get sample details by accession UUID (used by result-service to resolve `orderId`, `patientId`, `branchId`).

**Required authority:** `isAuthenticated()`

**Response (200 OK):**
```json
{
  "accessionId": "01950700-...",
  "accessionNumber": "ACC-0001",
  "orderId": "019506f0-...",
  "patientId": "019506a0-...",
  "branchId": "00000000-...",
  "testId": "019506c0-...",
  "specimenType": "Whole Blood",
  "status": "accessioned",
  "collectedAt": null,
  "receivedAt": null
}
```

---

### `PATCH /v1/samples/{accessionId}/status`

Update sample status (e.g., `collected`, `received`, `processing`).

**Request body:** `{ "status": "received", "receivedAt": "2026-09-05T11:00:00Z" }`

---

### `POST /v1/samples/{accessionId}/reject`

Reject a sample with a reason (haemolysis, quantity not sufficient, etc.).

**Request body:**
```json
{ "reason": "haemolysis", "notes": "Grossly haemolysed — recollect" }
```

---

### `GET /v1/samples/{accessionId}/label`

Download the barcode label PDF for a sample tube.

**Response:** `application/pdf` binary (Content-Disposition: attachment)

---

### `GET /v1/worklist?branch_id=&department_id=&date=`

Get today's sample worklist grouped by department for the analyzer technician.

**Response:**
```json
{
  "data": [
    {
      "accessionId": "01950700-...",
      "accessionNumber": "ACC-0001",
      "patientName": "Priya Sharma",
      "uhid": "UHID-0001",
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "priority": "routine",
      "status": "received",
      "receivedAt": "2026-09-05T11:00:00Z"
    }
  ]
}
```

---

### `GET /v1/samples/handover-pending`

Get samples that are resulted and ready to be handed over to the reporting queue.

---

### `PATCH /v1/samples/{accessionId}/handover`

Mark sample as handed over to reporting. **Required authority:** `report.handover`

**Request body:** `{ "handedOverTo": "<user-id>", "handoverNotes": "..." }`

---

## 4. Device Gateway — `:8084` (Go)

The device gateway bridges ASTM/HL7 analyzer instruments to the DiagDesk result pipeline.

```
Analyzer (TCP/ASTM) → device-gateway :8084 → Kafka: result-validated → result-service
```

### `POST /v1/devices`

Register a new analyzer device.

**Request body:**
```json
{
  "deviceName": "Sysmex XN-1000",
  "protocol": "ASTM",
  "ipAddress": "192.168.1.50",
  "port": 4000,
  "branchId": "00000000-..."
}
```

**Response (201):**
```json
{
  "deviceId": "01950800-...",
  "deviceKey": "dgw_key_xxxxx",
  "message": "Device registered. Configure analyzer to send to device-gateway:4000"
}
```

### `GET /v1/devices`

List registered devices for the tenant.

### `GET /v1/devices/{deviceId}/status`

Check device connectivity and last-seen timestamp.

> **ASTM/HL7 results** flow: Analyzer sends raw frames over TCP → device-gateway decodes → publishes to Kafka `result-validated` topic with `source=ANALYZER` → result-service consumes → auto-validates if value within reference range.

---

## 5. Result Service — `:8085`

---

### `POST /v1/results`

Submit a test result. Called by technicians (MANUAL) or consumed from Kafka (ANALYZER).

**Required authority:** `report.validate` or `ROLE_SYSTEM`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accessionId` | `string` (UUID) | **Yes** | Sample UUID from order response |
| `testId` | `string` (UUID) | **Yes** | Test UUID |
| `value` | `string` | **Yes** | Numeric or string result value |
| `unit` | `string` | No | Result unit (e.g., `g/dL`) |
| `method` | `string` | No | Analytical method |
| `source` | `string` | **Yes** | `"ANALYZER"` or `"MANUAL"` |
| `enteredBy` | `string` (UUID) | No | User UUID (technician) |
| `rawHl7Segment` | `string` | No | Raw HL7 OBX segment (from analyzer) |
| `testCode` | `string` | No | Test code (alternate lookup when `testId` unknown) |

**Example request:**
```json
{
  "accessionId": "01950700-...",
  "testId": "019506c0-...",
  "value": "7.8",
  "unit": "cells/μL",
  "source": "ANALYZER"
}
```

**Response (201 Created):**
```json
{
  "resultId": "01950900-...",
  "accessionId": "01950700-...",
  "orderId": "019506f0-...",
  "patientId": "019506a0-...",
  "branchId": "00000000-...",
  "testId": "019506c0-...",
  "value": "7.8",
  "unit": "cells/μL",
  "source": "ANALYZER",
  "validationStatus": "AUTO_VALIDATED",
  "flags": [],
  "referenceRange": "4.5–11.0",
  "createdAt": "2026-09-05T11:30:00Z"
}
```

> **Auto-validation rule:** `source=ANALYZER` + value within reference range (no `H`, `L`, `CRITICAL_*` flags) → `AUTO_VALIDATED`. All `MANUAL` entries start as `PENDING`.

---

### `GET /v1/results/{resultId}`

Get a single result by UUID.

**Required authority:** `isAuthenticated()`

---

### `GET /v1/results?orderId=&accessionId=`

List results by order or by accession ID.

**Response:**
```json
{
  "data": [
    {
      "resultId": "01950900-...",
      "testId": "019506c0-...",
      "value": "7.8",
      "unit": "cells/μL",
      "validationStatus": "AUTO_VALIDATED",
      "flags": []
    }
  ]
}
```

---

### `PUT /v1/results/{resultId}`

Amend a result (correction). Creates an audit trail entry.

**Required authority:** `report.validate`

**Request body:**
```json
{
  "value": "8.1",
  "amendmentReason": "Transcription error corrected",
  "enteredBy": "<pathologist-user-id>"
}
```

**Response (200):** `AmendResultResponse` with previous value and amendment history.

---

### `POST /v1/results/{resultId}/validate`

Mark result as manually validated (level 1 — technician review).

**Required authority:** `report.validate`

**Request body:** `{ "comments": "Within expected range for age" }` (optional)

**Response (200):**
```json
{
  "resultId": "01950900-...",
  "validationStatus": "MANUAL_VALIDATED",
  "validatedBy": "<user-id>",
  "validatedAt": "2026-09-05T12:00:00Z"
}
```

---

### `POST /v1/results/{resultId}/signoff`

Pathologist final sign-off (level 2 validation). Publishes `result-validated` event to Kafka.

**Required authority:** `report.signoff`

**Request body:**
```json
{
  "pin": "1234",
  "comments": "Reviewed — values correlate with clinical history"
}
```

**Response (200):** Full result with `validationStatus: "MANUAL_VALIDATED"` and `signedOffAt`.

---

### `POST /v1/results/{resultId}/reject-validation`

Reject a result and request repeat. Sets status back to `PENDING`.

**Required authority:** `report.signoff`

**Request body:** `{ "reason": "Suspected haemolysis artifact — recollect" }`

---

### `GET /v1/results/{resultId}/delta-check`

Compare current result against patient's previous result for the same test (delta check for LIS safety).

**Required authority:** `isAuthenticated()`

**Response:**
```json
{
  "resultId": "01950900-...",
  "currentValue": "7.8",
  "previousValue": "6.2",
  "deltaPercent": 25.8,
  "deltaExceedsThreshold": true,
  "thresholdPercent": 20.0,
  "previousResultDate": "2026-08-15T09:00:00Z"
}
```

---

### `POST /v1/results/{resultId}/repeat-request`

Request a repeat test for a result.

**Required authority:** `report.validate`

**Request body:** `{ "reason": "QC failure on analyzer", "priority": "stat" }`

---

### `GET /v1/results/pending-validation?branch_id=&level=&page=0&size=20`

Get all results awaiting validation, optionally by validation level (1 = technician, 2 = pathologist).

**Required authority:** `report.validate` or `report.signoff`

---

### `GET /v1/results/critical-alerts`

Get unacknowledged critical results (`CRITICAL_HIGH` or `CRITICAL_LOW` flags) requiring immediate clinician notification.

**Required authority:** `isAuthenticated()`

**Response:**
```json
{
  "data": [
    {
      "resultId": "01950900-...",
      "patientName": "Priya Sharma",
      "uhid": "UHID-0001",
      "testName": "Haemoglobin",
      "value": "4.2",
      "unit": "g/dL",
      "flag": "CRITICAL_LOW",
      "criticalSince": "2026-09-05T11:30:00Z"
    }
  ]
}
```

---

### `POST /v1/results/{resultId}/acknowledge-critical`

Acknowledge a critical alert (logs who was notified and when).

**Required authority:** `isAuthenticated()`

**Request body:**
```json
{
  "notifiedPerson": "Dr. Ramesh Kumar",
  "notificationMethod": "phone",
  "notes": "Called attending physician at 12:05"
}
```

---

### `GET /v1/results/{resultId}/audit-trail`

Get full audit trail for a result (all amendments, validations, sign-offs).

**Required authority:** `audit.view`

**Response:** `{ "events": [{ "eventType", "performedBy", "performedAt", "details" }] }`

---

## 6. Reporting Service — `:8086`

---

### `POST /v1/reports/generate`

Generate a lab report from all validated results for an order. Assembles patient details, test results, reference ranges into a Thymeleaf HTML template, renders to PDF, and uploads to Supabase Storage.

**Required authority:** `report.signoff` or `ROLE_SYSTEM`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | `string` (UUID) | **Yes** | Order UUID |
| `patientId` | `string` (UUID) | **Yes** | Patient UUID |

**Example request:**
```json
{
  "orderId": "019506f0-...",
  "patientId": "019506a0-..."
}
```

**Response (201 Created):**
```json
{
  "reportId": "01950a00-...",
  "orderId": "019506f0-...",
  "patientId": "019506a0-...",
  "status": "pending_signoff",
  "pdfUrl": null,
  "createdAt": "2026-09-05T12:00:00Z"
}
```

---

### `GET /v1/reports/{reportId}`

Get report details.

**Required authority:** `isAuthenticated()`

**Response (200 OK):**
```json
{
  "reportId": "01950a00-...",
  "orderId": "019506f0-...",
  "patientId": "019506a0-...",
  "status": "signed_off",
  "pdfUrl": "https://<project>.supabase.co/storage/v1/object/public/lab-reports/01950a00-.../report.pdf",
  "signedBy": "Dr. Meera Nair",
  "signedAt": "2026-09-05T12:10:00Z",
  "clinicalNotes": null,
  "interpretation": null,
  "createdAt": "2026-09-05T12:00:00Z"
}
```

---

### `GET /v1/reports?patient_id=`

List all reports for a patient.

**Required authority:** `isAuthenticated()`

**Response:** `{ "data": [ReportResponse] }`

---

### `PATCH /v1/reports/{reportId}`

Edit a report (add clinical notes or interpretation) before sign-off.

**Required authority:** `report.signoff`

**Request body:**
```json
{
  "clinicalNotes": "Anaemia screen — review dietary iron intake",
  "interpretation": "Mild microcytic anaemia consistent with iron deficiency"
}
```

---

### `POST /v1/reports/{reportId}/signoff`

Pathologist signs off the report. Generates the final PDF and uploads to Supabase Storage. Publishes `report-ready` Kafka event triggering SMS/WhatsApp delivery.

**Required authority:** `report.signoff`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pin` | `string` | **Yes** | Pathologist's 4-digit sign-off PIN |
| `pathologistName` | `string` | No | Printed name on report |
| `notes` | `string` | No | Additional sign-off notes |

**Example request:**
```json
{
  "pin": "1234",
  "pathologistName": "Dr. Meera Nair MD Pathology",
  "notes": "Reviewed and approved"
}
```

**Response (200 OK):**
```json
{
  "reportId": "01950a00-...",
  "status": "signed_off",
  "pdfUrl": "https://<project>.supabase.co/storage/v1/object/public/lab-reports/.../report.pdf",
  "signedBy": "Dr. Meera Nair MD Pathology",
  "signedAt": "2026-09-05T12:10:00Z"
}
```

---

### `POST /v1/reports/{reportId}/deliver`

Manually trigger report delivery (SMS, WhatsApp, or email).

**Required authority:** `report.deliver`

**Request body:**
```json
{
  "channels": ["WHATSAPP", "SMS"],
  "recipients": ["+919876543210"]
}
```

**Response:**
```json
{
  "delivery_ids": [
    { "channel": "WHATSAPP", "deliveryId": "01950b00-..." },
    { "channel": "SMS",       "deliveryId": "01950b01-..." }
  ]
}
```

---

### `GET /v1/reports/{reportId}/delivery-status`

Get delivery status for all channels.

**Required authority:** `isAuthenticated()`

**Response:**
```json
{
  "deliveries": [
    {
      "deliveryId": "01950b00-...",
      "channel": "WHATSAPP",
      "status": "delivered",
      "sentAt": "2026-09-05T12:11:00Z",
      "deliveredAt": "2026-09-05T12:11:15Z"
    }
  ]
}
```

---

### `POST /v1/reports/{reportId}/print`

Mark report as printed and log printer details.

**Required authority:** `report.print`

**Request body:** `{ "printerName": "Zebra-ZD420", "copies": 1 }` (optional)

---

### `GET /v1/reports/{reportId}/print-log`

Get print history for a report.

**Response:** `{ "prints": [{ "printedBy", "printedAt", "printerName", "copies" }] }`

---

## 7. MIS Analytics Service — `:8087`

All analytics endpoints are read-only. `period` defaults to `month` unless specified.

**Base path:** `/v1/analytics`

---

### `GET /v1/analytics/summary?branch_id=&period=`

Overall lab KPI summary — total orders, revenue, samples processed, avg TAT.

**Required authority:** `finance.reports.master` or `finance.reports.money_collections`

**Response:**
```json
{
  "period": "month",
  "totalOrders": 1240,
  "totalRevenue": 1482500.00,
  "totalSamples": 1380,
  "avgTatHours": 6.2,
  "pendingCollection": 45,
  "pendingValidation": 12,
  "criticalUnacknowledged": 3
}
```

---

### `GET /v1/analytics/revenue?branch_id=&period=&group_by=`

Revenue breakdown. `group_by` can be `day`, `week`, `test`, `department`, `b2b_partner`.

**Required authority:** `finance.reports.money_collections`

---

### `GET /v1/analytics/tat?branch_id=&dept_id=&period=`

Turnaround time analysis by department and test.

**Required authority:** `finance.reports.master`

---

### `GET /v1/analytics/samples?branch_id=&period=`

Sample volume trends (daily/weekly/monthly count by specimen type).

**Required authority:** `isAuthenticated()`

---

### `GET /v1/analytics/referrals?period=&top_n=10&branch_id=`

Top N referring doctors by order count and revenue.

**Required authority:** `finance.reports.referral_activity`

---

### `GET /v1/analytics/patients/geography?branch_id=&period=`

Patient distribution by city/pincode (heat map data).

**Required authority:** `finance.reports.master`

---

### `GET /v1/analytics/tests/performance?period=&dept_id=`

Test-level performance metrics — volume, revenue, avg TAT, rejection rate.

**Required authority:** `finance.reports.master`

---

### `GET /v1/analytics/operations?branch_id=&period=`

Operational metrics — phlebotomist productivity, reject rate, collection efficiency.

**Required authority:** `isAuthenticated()`

---

### `GET /v1/analytics/finance?period=`

Financial summary — collections, outstanding B2B receivables, cash vs credit.

**Required authority:** `finance.reports.money_collections`

---

### `GET /v1/analytics/alerts`

Get active system alerts (TAT breaches, low inventory, critical results unacknowledged).

**Required authority:** `isAuthenticated()`

**Response:**
```json
{
  "alerts": [
    {
      "alertId": "01950c00-...",
      "type": "TAT_BREACH",
      "severity": "HIGH",
      "message": "15 orders have breached TAT in Biochemistry",
      "createdAt": "2026-09-05T10:00:00Z",
      "acknowledged": false
    }
  ]
}
```

---

### `POST /v1/analytics/alerts/{alertId}/acknowledge`

Acknowledge an alert.

**Required authority:** `isAuthenticated()`

**Response:** `{ "alertId": "...", "acknowledged": true, "acknowledgedAt": "..." }`

---

### `POST /v1/analytics/digests`

Subscribe to a periodic analytics digest (daily/weekly email/SMS summary).

**Request body:**
```json
{
  "frequency": "daily",
  "metrics": ["revenue", "tat", "samples"],
  "channel": "EMAIL",
  "recipient": "admin@diagdesk.in"
}
```

**Response:** `{ "subscription_id": "01950d00-..." }`

---

### `GET /v1/analytics/digests`

List all active digest subscriptions.

---

### `DELETE /v1/analytics/digests/{subscriptionId}`

Cancel a digest subscription. Returns `204 No Content`.

---

## 8. Notification Service — `:8088`

---

### `POST /v1/notifications/send`

Send a notification (SMS, WhatsApp, or email) to a patient or user.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templateCode` | `string` | **Yes** | Template code (e.g., `REPORT_READY`) |
| `channel` | `string` | **Yes** | `SMS`, `WHATSAPP`, or `EMAIL` |
| `recipientPhone` | `string` | No | `+91XXXXXXXXXX` (required for SMS/WhatsApp) |
| `recipientEmail` | `string` | No | Required for EMAIL |
| `variables` | `object` | No | Template variable substitutions |
| `patientId` | `string` (UUID) | No | Link notification to patient |
| `orderId` | `string` (UUID) | No | Link notification to order |

**Example request:**
```json
{
  "templateCode": "REPORT_READY",
  "channel": "WHATSAPP",
  "recipientPhone": "+919876543210",
  "variables": {
    "patientName": "Priya Sharma",
    "reportUrl": "https://...",
    "labName": "DiagDesk Diagnostics"
  },
  "patientId": "019506a0-...",
  "orderId": "019506f0-..."
}
```

**Response (201 Created):**
```json
{
  "notificationId": "01950e00-...",
  "channel": "WHATSAPP",
  "status": "queued",
  "templateCode": "REPORT_READY",
  "createdAt": "2026-09-05T12:11:00Z"
}
```

---

### `GET /v1/notifications/{notificationId}`

Get notification status (queued → sent → delivered / failed).

---

### `GET /v1/notifications/templates`

List all available notification templates.

**Response:**
```json
{
  "data": [
    {
      "templateId": "01950f00-...",
      "code": "REPORT_READY",
      "channel": "WHATSAPP",
      "dltTemplateId": "1234567890",
      "body": "Dear {{patientName}}, your report from {{labName}} is ready. Download: {{reportUrl}}"
    }
  ]
}
```

---

### `POST /v1/notifications/templates`

Create a notification template. **Required authority:** admin.

**Request body:**
```json
{
  "code": "COLLECTION_REMINDER",
  "channel": "SMS",
  "dltTemplateId": "1234567891",
  "body": "Dear {{patientName}}, your sample collection is scheduled for {{slotTime}}. Lab: {{labName}}. Call {{labPhone}} for changes."
}
```

---

## 9. Audit & Consent Service — `:8089`

---

### `GET /v1/audit/events?entity_type=&entity_id=&from=&to=&page=0&size=20`

Query the immutable audit log. All service-level state changes are published here via Kafka.

**Required authority:** `audit.view`

| Param | Description |
|-------|-------------|
| `entity_type` | `PATIENT`, `ORDER`, `RESULT`, `REPORT` |
| `entity_id` | UUID of the entity |
| `from`, `to` | ISO 8601 date range |

**Response:**
```json
{
  "data": [
    {
      "eventId": "01951000-...",
      "entityType": "RESULT",
      "entityId": "01950900-...",
      "action": "RESULT_VALIDATED",
      "performedBy": "<user-id>",
      "performedAt": "2026-09-05T12:00:00Z",
      "details": { "previousStatus": "PENDING", "newStatus": "MANUAL_VALIDATED" }
    }
  ],
  "total": 5
}
```

---

### `POST /v1/consent`

Record a new DPDPA/HIPAA consent event (patient consent for data sharing, research, etc.).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patientId` | `string` (UUID) | **Yes** | Patient UUID |
| `consentType` | `string` | **Yes** | `data_sharing`, `research`, `marketing` |
| `purposeDescription` | `string` | **Yes** | Plain-language description |
| `consentGiven` | `boolean` | **Yes** | `true` = granted, `false` = revoked |
| `expiresAt` | `string` (ISO 8601) | No | Consent expiry date |
| `collectedBy` | `string` (UUID) | No | Staff user UUID |

**Response (201):** Full consent record with `consentId`.

---

### `GET /v1/consent/{patientId}`

Get all active consents for a patient.

---

### `POST /v1/consent/{consentId}/revoke`

Revoke a consent. Records the revocation timestamp and reason.

**Request body:** `{ "reason": "Patient requested data deletion" }`

---

### `POST /v1/dsr`

Submit a Data Subject Request (DPDPA right to access / erasure / portability).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patientId` | `string` (UUID) | **Yes** | Patient UUID |
| `requestType` | `string` | **Yes** | `access`, `erasure`, `portability`, `correction` |
| `description` | `string` | **Yes** | Patient's request details |
| `submittedVia` | `string` | No | `portal`, `email`, `phone` |

**Response (201):**
```json
{
  "dsrId": "01951100-...",
  "patientId": "019506a0-...",
  "requestType": "erasure",
  "status": "open",
  "dueBy": "2026-10-05T00:00:00Z",
  "createdAt": "2026-09-05T12:15:00Z"
}
```

> DPDPA mandates 30-day response window. `dueBy` is auto-set to `createdAt + 30 days`.

---

### `GET /v1/dsr?status=&page=0&size=20`

List DSR requests (open, in_progress, completed).

---

### `PATCH /v1/dsr/{dsrId}`

Update DSR status and add resolution notes.

**Request body:** `{ "status": "completed", "resolutionNotes": "Data export sent to patient email" }`

---

### `POST /v1/breach`

Report a data breach event (DPDPA Article 8 — notifiable breach).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `breachType` | `string` | **Yes** | `unauthorized_access`, `data_loss`, `ransomware`, `inadvertent_disclosure` |
| `description` | `string` | **Yes** | What happened |
| `discoveredAt` | `string` (ISO 8601) | **Yes** | When breach was discovered |
| `affectedRecordsCount` | `int` | No | Estimated count |
| `affectedPatientIds` | `string[]` | No | Patient UUIDs if known |
| `containmentSteps` | `string` | No | Steps taken to contain |

**Response (201):**
```json
{
  "breachId": "01951200-...",
  "status": "open",
  "reportableToAuthority": true,
  "reportDeadline": "2026-09-07T12:15:00Z",
  "createdAt": "2026-09-05T12:15:00Z"
}
```

> DPDPA requires notifying CERT-In and DPB within 72 hours of discovery for reportable breaches. `reportDeadline = discoveredAt + 72h`.

---

### `PATCH /v1/breach/{breachId}`

Update breach report status and remediation.

**Request body:** `{ "status": "contained", "certInReference": "CERT-2026-XXXX" }`

---

## 10. B2B Billing Service — `:8090`

---

### `POST /v1/b2b-partners`

Register a new B2B partner (hospital, clinic, corporate).

**Required authority:** `master.partner.manage`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Partner organisation name |
| `type` | `string` | **Yes** | `hospital`, `clinic`, `corporate`, `ngo` |
| `contactPerson` | `string` | No | Primary contact name |
| `contactPhone` | `string` | No | Contact phone |
| `contactEmail` | `string` | No | Contact email |
| `address` | `object` | No | `{ line1, city, state, pincode }` |
| `creditLimit` | `number` | No | Credit limit in INR |
| `billingCycle` | `string` | No | `weekly`, `fortnightly`, `monthly` |
| `discountPercent` | `number` | No | Standard discount (0–100) |

**Example request:**
```json
{
  "name": "Apollo Hospitals — Koramangala",
  "type": "hospital",
  "contactPerson": "Mr. Suresh Reddy",
  "contactPhone": "+918022334455",
  "contactEmail": "lab@apollokoramangala.in",
  "creditLimit": 500000,
  "billingCycle": "monthly",
  "discountPercent": 15.0
}
```

**Response (201 Created):**
```json
{
  "partnerId": "01951300-...",
  "name": "Apollo Hospitals — Koramangala",
  "type": "hospital",
  "accountNumber": "B2B-0001",
  "creditLimit": 500000.00,
  "creditUtilized": 0.00,
  "creditAvailable": 500000.00,
  "createdAt": "2026-09-05T12:20:00Z"
}
```

---

### `GET /v1/b2b-partners?q=&has_overdue=&page=0&size=20`

List / search B2B partners.

| Param | Description |
|-------|-------------|
| `q` | Name/account search |
| `has_overdue` | `true` = only partners with overdue invoices |

**Response:** Array of `PartnerResponse` objects.

---

### `GET /v1/b2b-partners/{partnerId}`

Get partner details including credit utilisation.

---

### `PUT /v1/b2b-partners/{partnerId}`

Update partner details.

---

### `DELETE /v1/b2b-partners/{partnerId}`

Soft-delete a partner. Returns `204 No Content`.

---

### `GET /v1/b2b-invoices?partner_id=&status=&page=0&size=20`

List invoices.

| Param | Description |
|-------|-------------|
| `partner_id` | Filter by partner |
| `status` | `draft`, `sent`, `paid`, `overdue`, `disputed` |

**Response:**
```json
[
  {
    "invoiceId": "01951400-...",
    "partnerId": "01951300-...",
    "invoiceNumber": "INV-2026-09-0001",
    "totalAmount": 125000.00,
    "amountPaid": 50000.00,
    "amountOutstanding": 75000.00,
    "status": "overdue",
    "dueDate": "2026-09-01",
    "invoiceDate": "2026-08-01"
  }
]
```

---

### `GET /v1/b2b-invoices/{invoiceId}`

Get invoice details.

---

### `POST /v1/b2b-invoices/{invoiceId}/send`

Send invoice to partner via email or WhatsApp.

**Request body:** `{ "channels": ["EMAIL", "WHATSAPP"] }`

---

### `POST /v1/b2b-invoices/{invoiceId}/record-payment`

Record a payment against an invoice.

**Required authority:** `finance.reports.money_collections`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | `number` | **Yes** | Payment amount (INR) |
| `paymentDate` | `string` (YYYY-MM-DD) | **Yes** | Date of payment |
| `paymentMode` | `string` | **Yes** | `NEFT`, `RTGS`, `IMPS`, `cheque`, `cash`, `UPI` |
| `referenceNumber` | `string` | No | Bank reference / UTR |
| `notes` | `string` | No | Additional payment notes |

**Example request:**
```json
{
  "amount": 75000.00,
  "paymentDate": "2026-09-05",
  "paymentMode": "NEFT",
  "referenceNumber": "UTR20260905XXXXXX",
  "notes": "Full settlement of INV-2026-09-0001"
}
```

**Response (200):** Updated `InvoiceResponse` with `amountPaid`, `amountOutstanding`, and `status: "paid"`.

---

### `GET /v1/b2b/receivables/aging`

Ageing report — outstanding invoices bucketed by age (0–30, 31–60, 61–90, 90+ days).

**Required authority:** `b2b.view`

**Response:**
```json
{
  "generatedAt": "2026-09-05T12:30:00Z",
  "buckets": {
    "0_30": { "count": 5, "totalOutstanding": 250000.00 },
    "31_60": { "count": 3, "totalOutstanding": 180000.00 },
    "61_90": { "count": 1, "totalOutstanding": 75000.00 },
    "90_plus": { "count": 2, "totalOutstanding": 140000.00 }
  },
  "totalOutstanding": 645000.00,
  "partners": [...]
}
```

---

### `GET /v1/b2b/receivables/{partnerId}/statement?from=&to=`

Account statement for a partner over a date range (defaults to last 3 months).

**Required authority:** `b2b.view`

**Response:**
```json
{
  "partnerId": "01951300-...",
  "partnerName": "Apollo Hospitals — Koramangala",
  "periodFrom": "2026-06-05",
  "periodTo": "2026-09-05",
  "openingBalance": 0.00,
  "totalBilled": 375000.00,
  "totalPaid": 300000.00,
  "closingBalance": 75000.00,
  "transactions": [
    { "date": "2026-08-01", "description": "Invoice INV-2026-08-0001", "debit": 125000.00, "credit": 0, "balance": 125000.00 },
    { "date": "2026-08-20", "description": "Payment — UTR20260820XXXXX",  "debit": 0,        "credit": 50000.00, "balance": 75000.00 }
  ]
}
```

---

### `POST /v1/b2b/receivables/follow-ups`

Log a follow-up activity for an overdue partner.

**Required authority:** `b2b.edit`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `partnerId` | `string` (UUID) | **Yes** | Partner UUID |
| `invoiceId` | `string` (UUID) | No | Specific invoice (optional) |
| `actionType` | `string` | **Yes** | `call`, `email`, `visit`, `legal_notice` |
| `notes` | `string` | No | Follow-up notes |
| `nextFollowUpDate` | `string` (YYYY-MM-DD) | No | Scheduled next follow-up |

**Response (200):**
```json
{
  "followUpId": "01951500-...",
  "partnerId": "01951300-...",
  "actionType": "call",
  "notes": "Spoke with Mr. Suresh — committed payment by 10 Sep",
  "nextFollowUpDate": "2026-09-10",
  "loggedAt": "2026-09-05T12:35:00Z"
}
```

---

### `GET /v1/b2b/receivables/follow-ups?partner_id=`

List all follow-ups for a partner.

**Required authority:** `b2b.view`

---

### `PATCH /v1/b2b/partners/{partnerId}/credit-limit`

Update a partner's credit limit.

**Required authority:** `b2b.edit`

**Request body:** `{ "creditLimit": 750000.00 }`

---

## Kafka Event Reference

All inter-service communication uses Kafka choreography (no orchestrator).

| Topic | Publisher | Consumer(s) | Payload (key fields) |
|-------|-----------|-------------|----------------------|
| `result-validated` | result-service | reporting-service, notification-service | `resultId`, `orderId`, `patientId`, `testId`, `validationStatus`, `source` |
| `report-ready` | reporting-service | notification-service | `reportId`, `orderId`, `patientId`, `pdfUrl`, `phone` |
| `notification-events` | notification-service | audit-consent-service | `notificationId`, `channel`, `status`, `recipientPhone` |
| `order-events` | order-service | mis-analytics-service, audit-consent-service | `orderId`, `patientId`, `event` (`ORDER_CREATED`, `STATUS_CHANGED`) |
| `audit-events` | all services | audit-consent-service | `entityType`, `entityId`, `action`, `performedBy`, `tenantId` |

---

## Database Schema

Each service owns a dedicated PostgreSQL schema within Supabase. Row Level Security (RLS) policies filter every query by `tenant_id`.

### Entity Relationship (simplified)

```
patient.patients ──────────────────────────────┐
        │                                       │
        ▼                                       │
order.orders ──────────────────────────────────┤
        │                                       │
        ▼                                       │
order.samples ─────────────────────────────────┤
        │                                       │
        ▼                                       │
result.results ─────────────────────────────────┤
        │                                       │
        ▼                                       │
reporting.reports ──────────────────────────────┤
                                                │
catalog.tests ──────────────────────────────────┤
catalog.panels, catalog.reference_ranges        │
                                                ▼
                                       audit.audit_events
                                       audit.consents
                                       audit.dsrs
                                       audit.breaches
```

### Schema Summary

| Schema | Key Tables | Notes |
|--------|------------|-------|
| `patient` | `patients`, `patient_consents` | UHID sequence per tenant |
| `catalog` | `tests`, `panels`, `panel_tests`, `reference_ranges`, `departments`, `nabl_catalogue`, `rate_cards` | NABL catalogue is tenant-shared read-only |
| `order` | `orders`, `samples`, `order_items` | Accession sequence per tenant; auto-created on order |
| `result` | `results`, `result_amendments`, `repeat_requests`, `critical_acknowledgements` | Delta check uses previous result per test per patient |
| `reporting` | `reports`, `report_deliveries`, `print_log` | PDF URL stored after Supabase Storage upload |
| `notification` | `notifications`, `notification_templates` | DLT template IDs for TRAI compliance |
| `analytics` | `analytics_events`, `digest_subscriptions` | Materialized from Kafka events |
| `audit` | `audit_events`, `consents`, `dsrs`, `breaches` | Append-only; no UPDATE/DELETE permitted |
| `b2b` | `partners`, `professional_contracts`, `invoices`, `receivable_entries`, `follow_ups` | Credit utilisation updated on invoice creation |

---

## Getting Started — Local Development

### Prerequisites

- Java 21 (Temurin) — `brew install --cask temurin@21`
- Go 1.22+
- Node 20+
- Docker Desktop
- Maven 3.9+

### 1. Start Infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
# Starts: postgres:5432, redis:6379, kafka:9092, keycloak:8080, prometheus:9090, grafana:3000, jaeger:16686
```

### 2. Build and Start Services

```bash
# Build all Java services
cd backend
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
mvn package -DskipTests -B -T 1C

# Start each service (local profile — no JWT required)
SPRING_PROFILES_ACTIVE=local java -Xmx256m -jar patient-service/target/patient-service-*.jar &
SPRING_PROFILES_ACTIVE=local java -Xmx256m -jar catalog-service/target/catalog-service-*.jar &
SPRING_PROFILES_ACTIVE=local java -Xmx256m -jar order-service/target/order-service-*.jar &
SPRING_PROFILES_ACTIVE=local java -Xmx256m -jar result-service/target/result-service-*.jar &
SPRING_PROFILES_ACTIVE=local java -Xmx256m -jar reporting-service/target/reporting-service-*.jar &
```

### 3. Start Frontend

```bash
cd frontend
npm ci
# Create .env from example
cp .env.example .env
# Edit .env with your Supabase project URL and anon key
npm run dev
# → http://localhost:5173 (Vite proxy routes /v1/* to backend services)
```

### 4. Demo Keycloak Users

| Username | Password | Role |
|----------|----------|------|
| `receptionist@demo.diagdesk.in` | `Demo@1234` | Receptionist |
| `pathologist@demo.diagdesk.in` | `Demo@1234` | Pathologist |
| `technician@demo.diagdesk.in` | `Demo@1234` | Technician |
| `admin@demo.diagdesk.in` | `Demo@1234` | Admin |

---

## Running the E2E Test Suite

The E2E test exercises the complete patient → order → result → report flow across 5 services.

```bash
# Start E2E infrastructure (postgres:5433, redis:6380, kafka:9092)
docker compose -f infra/docker-compose.e2e.yml up -d

# Run the test (starts service JARs automatically)
bash e2e/run-e2e.sh

# Or if services are already running:
bash e2e/run-e2e.sh --skip-startup
```

**Flow tested:**
1. Register patient (`POST /v1/patients`)
2. Seed catalog test (`POST /v1/tests`)
3. Create order — auto-accessions sample (`POST /v1/orders`)
4. Submit analyzer result → `AUTO_VALIDATED` (`POST /v1/results`)
5. Generate report (`POST /v1/reports/generate`)
6. Sign off report (`POST /v1/reports/{id}/signoff`)
7. Verify `signed_off` status (`GET /v1/reports/{id}`)
8. List API sanity checks (patients, orders, results, reports)

---

## Deployment

### Vercel + Supabase (Free Tier)

```
Frontend → Vercel (free, CDN-global)
Database → Supabase (free, 500 MB PostgreSQL, Storage)
Backend  → Run locally or EC2 (see infra/nginx/ec2.conf)
```

**Deploy frontend:**
1. Connect GitHub repo to vercel.com → set Root Directory: `frontend`
2. Set env vars in Vercel dashboard:
   ```
   VITE_SUPABASE_URL      = https://<your-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY = sb_publishable_...
   ```
3. Push to `dev` or `main` — auto-deploys.

The frontend uses Supabase as the data fallback for all reads; Java services are needed only for business-logic writes (patient registration, order creation, result submission, report generation).

### k3s Branch Deployment (Helm)

```bash
cd infra/helm
chmod +x install-branch.sh
./install-branch.sh <image-tag> <hostname> "" letsencrypt-prod <email>
```

The script installs k3s, cert-manager, Sealed Secrets, and deploys the `diagdesk-branch` Helm chart (7 services + ingress + TLS).

### Docker Images

Built and pushed to GitHub Container Registry on every merge to `dev` or `main`:

```
ghcr.io/soumyachandran448/diagdesk/patient-service:<tag>
ghcr.io/soumyachandran448/diagdesk/catalog-service:<tag>
ghcr.io/soumyachandran448/diagdesk/order-service:<tag>
ghcr.io/soumyachandran448/diagdesk/result-service:<tag>
ghcr.io/soumyachandran448/diagdesk/reporting-service:<tag>
ghcr.io/soumyachandran448/diagdesk/notification-service:<tag>
ghcr.io/soumyachandran448/diagdesk/device-gateway:<tag>
```

---

## Configuration Reference

### Common Environment Variables (all Java services)

| Variable | Description | Default |
|----------|-------------|---------|
| `SPRING_PROFILES_ACTIVE` | `local` (no JWT) or `branch` (Keycloak) | `branch` |
| `DB_HOST` | PostgreSQL / Supabase pooler host | `localhost` |
| `DB_PORT` | `5432` (local) or `6543` (Supabase PgBouncer) | `5432` |
| `DB_NAME` | Database name | service-specific |
| `DB_USER` | Database user | `diagdesk` |
| `DB_PASSWORD` | Database password | `diagdesk` |
| `KAFKA_BOOTSTRAP` | Kafka bootstrap servers | `localhost:9092` |
| `SPRING_DATA_REDIS_HOST` | Redis host | `localhost` |
| `SPRING_DATA_REDIS_PORT` | Redis port | `6379` |
| `KEYCLOAK_ISSUER_URI` | Keycloak realm URL | (set in prod) |

### Reporting Service Extra Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL (for Storage upload) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `LAB_NAME` | Lab name printed on PDF reports |
| `PATIENT_SERVICE_URL` | `http://patient-service:8081` |
| `RESULT_SERVICE_URL` | `http://result-service:8085` |
| `CATALOG_SERVICE_URL` | `http://catalog-service:8082` |

### Notification Service Extra Variables

| Variable | Description |
|----------|-------------|
| `MSG91_AUTH_KEY` | MSG91 API authentication key |
| `MSG91_SENDER_ID` | Registered DLT sender ID |
| `MSG91_WHATSAPP_INTEGRATED_NUMBER` | WhatsApp Business number |
| `ORDER_SERVICE_URL` | `http://order-service:8083` |

---

## License

DiagDesk is proprietary software. All rights reserved.
