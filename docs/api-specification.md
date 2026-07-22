# DiagDesk — API Specification, UI Mockups & Page-API Mapping
## Diagnostic Engine (Core Logic) + User/Analytics Services

> **Copy action:** This document lives in the Claude plans folder and will be written to
> `/Users/sridharraopulluri/Projects/DiagDesk/docs/api-specification.md` inside the repo.
> It covers three things in order:
> - **Part 1** — REST API contracts for all 10 microservices (Service 1–10)
> - **Part 2** — ASCII wireframe mockups for all screens across 4 apps (Counter PWA, Owner Portal, Patient App, Doctor Portal)
> - **Part 3** — Page-by-page API mapping: every button/menu click → exact HTTP method + endpoint

**Context:** This plan documents the individual REST API contracts for every microservice inside the
"Diagnostic Engine (Core Logic) & User/Analytics Services" block of the DiagDesk architecture diagram.
All APIs are versioned at `/v1`, authenticated via Keycloak JWT (Kong validates), tenant-isolated via
`tenant_id` in JWT + Postgres RLS, and emit OTel traces. Audit-logging is automatic for all stateful
mutations. Common headers: `Authorization: Bearer <JWT>`, `X-Tenant-Id`, `X-Branch-Id`, `X-Idempotency-Key`
(all state-changing endpoints).

---

## Common conventions

| Convention | Value |
|---|---|
| Base path | `/v1` |
| Auth | `Authorization: Bearer <JWT>` (Keycloak OIDC) |
| Tenant isolation | `tenant_id` in JWT → Kong header propagation → Postgres RLS |
| Content-Type | `application/json` |
| Pagination | `?page=0&size=20` → `{ data[], page, size, total }` |
| Error envelope | `{ error: { code, message, details[] } }` |
| ID format | UUIDv7 (sortable, edge-generated) |
| Timestamps | ISO-8601 UTC |
| Idempotency | `X-Idempotency-Key` header on all POST/PATCH |
| Soft deletes | `DELETE` sets `deleted_at`; never hard-deletes patient/clinical data |

---

## Service 1 — Patient (MPI) Service
**Tech:** Java/Spring Boot | **Port:** 8081 | **Base path:** `/v1/patients`

### Endpoints

#### `POST /v1/patients`
Register a new patient (creates or links via MPI dedup).
```
Request:
{
  "first_name": "string",
  "last_name": "string",
  "date_of_birth": "1990-05-15",
  "gender": "male|female|other",
  "phone": "+919876543210",
  "email": "patient@example.com",         // optional
  "address": { "line1", "city", "state", "pincode" },
  "aadhaar_last4": "1234",               // optional, masked
  "blood_group": "B+",
  "allergies": ["penicillin"],
  "referred_by_doctor_id": "uuid"        // optional
}

Response 201:
{
  "patient_id": "uuid",
  "uhid": "LAB-2026-00001",
  "mpi_match_score": 0.0,               // >0.7 = possible duplicate surfaced
  "potential_duplicates": [],            // populated if match_score > threshold
  "created_at": "2026-07-10T09:00:00Z"
}
```
**Permission:** `registration.create`

---

#### `GET /v1/patients/{patient_id}`
Get full patient profile.
```
Response 200:
{
  "patient_id": "uuid",
  "uhid": "LAB-2026-00001",
  "first_name", "last_name", "date_of_birth", "gender",
  "phone", "email", "address",
  "blood_group", "allergies",
  "consent_status": "obtained|pending|revoked",
  "created_at", "updated_at"
}
```
**Permission:** `registration.create`

---

#### `GET /v1/patients`
Search patients.
```
Query params:
  q          — name, phone, UHID, Aadhaar-last4
  branch_id  — filter by branch
  page, size

Response 200:
{
  "data": [{ patient_id, uhid, name, phone, dob }],
  "page", "size", "total"
}
```
**Permission:** `registration.create`

---

#### `PUT /v1/patients/{patient_id}`
Update patient demographics.
```
Request: subset of registration fields (all optional)
Response 200: updated patient object
```
**Permission:** `registration.create`

---

#### `POST /v1/patients/dedup-check`
MPI deduplication check before registration (non-persisting).
```
Request:  { "first_name", "last_name", "date_of_birth", "phone" }
Response 200:
{
  "potential_matches": [
    { "patient_id", "uhid", "name", "phone", "match_score": 0.91 }
  ]
}
```
**Permission:** `registration.create`

---

#### `GET /v1/patients/{patient_id}/history`
Patient's complete test order history.
```
Query: page, size, date_from, date_to
Response 200:
{
  "data": [{ order_id, order_date, tests[], status, report_url }]
}
```
**Permission:** `registration.create`

---

#### `POST /v1/patients/{patient_id}/consent`
Capture DPDP consent at registration.
```
Request:
{
  "consent_type": "data_processing|marketing",
  "purpose": "diagnostic_testing",
  "language_code": "en|hi|te",
  "consent_text_version": "v2.1",
  "ip_address": "192.168.1.1",
  "captured_via": "counter|kiosk|app"
}

Response 201:
{
  "consent_id": "uuid",
  "captured_at": "2026-07-10T09:00:00Z",
  "hash": "sha256-of-consent-record"
}
```
**Permission:** `registration.create`

---

#### `GET /v1/patients/{patient_id}/consent`
Get all consent records for a patient.
```
Response 200:
{
  "consents": [{ consent_id, type, purpose, status, captured_at }]
}
```
**Permission:** `audit.view`

---

## Service 2 — Catalog & Rate-Card Service
**Tech:** Java/Spring Boot | **Port:** 8082 | **Base path:** `/v1`

### Test Master

#### `POST /v1/tests`
Create a test in the lab's test master.
```
Request:
{
  "code": "CBC",
  "name": "Complete Blood Count",
  "method": "Automated Analyzer",
  "unit": "cells/µL",
  "specimen_type": "Blood",
  "container": "EDTA",
  "tat_hours": 4,
  "department_id": "uuid",
  "is_custom": false,
  "nabl_code": "NABL-HEM-001"  // null if custom
}

Response 201:
{ "test_id": "uuid", "created_at": "..." }
```
**Permission:** `master.test.manage`

---

#### `GET /v1/tests`
List/search tests in catalog.
```
Query: q, department_id, is_custom (bool), page, size
Response 200: { data: [{ test_id, code, name, unit, tat_hours, department }], ... }
```

#### `GET /v1/tests/{test_id}`
Get single test with full detail including reference ranges.

#### `PUT /v1/tests/{test_id}`
Update test. Name change needs `master.test.edit_name`; rate change needs `master.test.edit_rate`.
```
Request: partial update (any subset of test fields)
Response 200: updated test object
```

#### `DELETE /v1/tests/{test_id}`
Soft-delete test (sets deleted_at; prevents future ordering; historical orders unaffected).
**Permission:** `master.test.manage`

---

#### `GET /v1/nabl-catalogue`
Browse the seeded global NABL test catalogue for import.
```
Query: q (search), category
Response 200:
{ "data": [{ nabl_code, name, method, specimen_type, default_reference_ranges[] }] }
```

#### `POST /v1/tests/import-from-nabl`
Import one or more tests from NABL catalogue (inherits reference ranges).
```
Request: { "nabl_codes": ["NABL-HEM-001", "NABL-BIO-042"] }
Response 201:
{ "imported": [{ test_id, nabl_code, name }], "already_exists": ["NABL-BIO-042"] }
```
**Permission:** `master.test.manage`

---

### Reference Ranges

#### `POST /v1/tests/{test_id}/reference-ranges`
Add age/sex-specific reference range.
```
Request:
{
  "age_min_years": 0, "age_max_years": 12,
  "gender": "all|male|female",
  "lower_limit": 4.0, "upper_limit": 11.0,
  "critical_low": 2.0, "critical_high": 30.0,
  "unit": "×10³/µL"
}
Response 201: { "range_id": "uuid" }
```
**Permission:** `master.test.manage`

#### `GET /v1/tests/{test_id}/reference-ranges`
List all ranges for a test.

#### `PUT /v1/tests/{test_id}/reference-ranges/{range_id}`
Update a reference range.

#### `DELETE /v1/tests/{test_id}/reference-ranges/{range_id}`
Delete a reference range.

---

### Panels & Packages

#### `POST /v1/panels`
Create a test panel or health package.
```
Request:
{
  "name": "Liver Function Test",
  "type": "panel|package",
  "test_ids": ["uuid1", "uuid2"],
  "description": "Comprehensive liver health panel"
}
Response 201: { "panel_id": "uuid" }
```
**Permission:** `master.test.manage` / `master.package.manage` (for packages)

#### `GET /v1/panels`
List panels. Query: `type (panel|package)`, `q`, `page`, `size`.

#### `GET /v1/panels/{panel_id}`
Get panel with constituent tests.

#### `PUT /v1/panels/{panel_id}`
Update panel.

#### `DELETE /v1/panels/{panel_id}`
Soft-delete panel.

---

### Rate Cards

#### `POST /v1/rate-cards`
Create a rate card.
```
Request:
{
  "name": "CGHS TMS 2.0 — Bangalore",
  "type": "branch|b2b_partner|scheme",
  "branch_id": "uuid",       // for branch type
  "partner_id": "uuid",      // for b2b_partner type
  "scheme_code": "CGHS",     // for scheme type
  "effective_from": "2026-01-01",
  "effective_to": "2026-12-31",
  "items": [
    { "test_id": "uuid", "price": 250.00, "gst_rate": 0, "is_exempt": true }
  ]
}
Response 201: { "rate_card_id": "uuid" }
```
**Permission:** `master.test.edit_rate`

#### `GET /v1/rate-cards`
List rate cards. Query: `type`, `branch_id`, `partner_id`, `active_on_date`.

#### `GET /v1/rate-cards/{rate_card_id}`
Get full rate card with all line items.

#### `PUT /v1/rate-cards/{rate_card_id}`
Update rate card.

#### `DELETE /v1/rate-cards/{rate_card_id}`
Soft-delete rate card.

#### `POST /v1/rate-cards/resolve`
Resolve the correct price for a test given patient/partner context — used by Order service.
```
Request:
{
  "test_id": "uuid",
  "branch_id": "uuid",
  "patient_type": "cash|b2b|insurance",
  "b2b_partner_id": "uuid",     // if b2b
  "scheme_code": "CGHS"          // if scheme-based
}
Response 200:
{
  "price": 250.00,
  "gst_rate": 0.00,
  "is_gst_exempt": true,
  "rate_card_id": "uuid",
  "rate_card_name": "CGHS TMS 2.0"
}
```

---

### Departments

#### `GET /v1/departments`
List all departments. Response: `[{ department_id, name, code }]`

#### `POST /v1/departments`
Create department. Request: `{ name, code, section_head_id? }` **Permission:** `master.department.manage`

#### `PUT /v1/departments/{department_id}`
Update department.

---

### Letterheads / Stationery

#### `POST /v1/letterheads`
Upload letterhead stationery for report rendering.
```
Request (multipart/form-data):
  logo: <file>
  header_html: "string"
  footer_html: "string"
  margin_top_mm: 20
  margin_bottom_mm: 20
  branch_id: "uuid"

Response 201: { "letterhead_id": "uuid", "preview_url": "..." }
```
**Permission:** `report.stationery.manage`

#### `GET /v1/letterheads`
List letterheads.

#### `PUT /v1/letterheads/{letterhead_id}`
Update letterhead.

---

## Service 3 — Order & Workflow Service
**Tech:** Java/Spring Boot + Spring State Machine | **Port:** 8083

### Orders

#### `POST /v1/orders`
Create a new diagnostic order.
```
Request:
{
  "patient_id": "uuid",
  "branch_id": "uuid",
  "tests": [
    { "test_id": "uuid" },
    { "panel_id": "uuid" }
  ],
  "referred_by_doctor_id": "uuid",    // optional
  "b2b_partner_id": "uuid",           // optional — drives rate card selection
  "priority": "routine|urgent|stat",
  "clinical_notes": "Suspected dengue fever",
  "collection_type": "walk_in|home_collection|b2b"
}

Response 201:
{
  "order_id": "uuid",
  "order_number": "ORD-2026-00142",
  "accession_numbers": ["ACC-2026-001"],
  "invoice_id": "uuid",
  "estimated_tat": "2026-07-10T14:00:00Z",
  "status": "pending_collection"
}
```
**Permission:** `registration.create`

---

#### `GET /v1/orders/{order_id}`
Get order with tests, accessions, and current status.

#### `GET /v1/orders`
List orders.
```
Query: patient_id, status, branch_id, date_from, date_to, priority, page, size
```

#### `PATCH /v1/orders/{order_id}/cancel`
Cancel an order (only before processing starts).
```
Request: { "reason": "string", "cancelled_by": "uuid" }
Response 200: { "order_id", "status": "cancelled", "cancelled_at" }
```

#### `POST /v1/orders/{order_id}/add-tests`
Add reflex/add-on tests to an existing order.
```
Request: { "test_ids": ["uuid"], "reason": "Reflex testing" }
Response 200: { "new_accession_numbers": ["ACC-2026-002"] }
```
**Permission:** `registration.create`

---

### Samples (Pre-analytical)

#### `POST /v1/samples`
Accession a sample — generates barcode label.
```
Request:
{
  "order_id": "uuid",
  "specimen_type": "Blood",
  "container": "EDTA",
  "collected_by": "uuid",
  "collected_at": "2026-07-10T09:15:00Z",
  "collection_location": "counter|home|b2b_site"
}

Response 201:
{
  "accession_id": "uuid",
  "accession_number": "ACC-2026-00142",
  "barcode": "3719200142",
  "label_url": "/v1/samples/ACC-2026-00142/label",
  "status": "collected"
}
```
**Permission:** `registration.create`

---

#### `GET /v1/samples/{accession_id}`
Get sample with full status history.
```
Response 200:
{
  "accession_id", "accession_number",
  "order_id", "patient_id",
  "specimen_type", "container",
  "status": "collected|received|in_process|processed|rejected|reported",
  "collected_at", "received_at", "processed_at",
  "tat_deadline": "2026-07-10T13:15:00Z",
  "tat_breached": false
}
```

#### `PATCH /v1/samples/{accession_id}/status`
Transition sample through workflow states.
```
Request:
{
  "status": "received|in_process|processed",
  "updated_by": "uuid",
  "notes": "string"
}
Response 200: { accession_id, status, updated_at }
```

#### `POST /v1/samples/{accession_id}/reject`
Reject a sample with reason code.
```
Request:
{
  "rejection_reason_code": "hemolyzed|clotted|insufficient_volume|wrong_container|unlabelled",
  "notes": "Sample was hemolyzed on arrival",
  "re_collection_required": true
}
Response 200: { "rejection_id": "uuid", "status": "rejected" }
```

#### `GET /v1/samples/{accession_id}/label`
Download barcode/QR label PDF (for printing at counter — works offline via edge cache).
```
Response 200: application/pdf
```

#### `GET /v1/worklist`
Pending test worklist for analyzer/technician.
```
Query: branch_id, department_id, analyzer_id, date
Response 200:
{
  "data": [
    { accession_id, accession_number, test_id, test_name, patient_name, priority, tat_deadline }
  ]
}
```

#### `GET /v1/orders/tat-breaches`
Active TAT breach list for ops dashboard.
```
Query: branch_id, department_id
Response 200:
{
  "data": [
    { order_id, accession_number, patient_name, test_name, deadline_at, breach_minutes }
  ]
}
```

#### `GET /v1/samples/handover-pending`
List samples/reports not yet handed to patient.
```
Response 200:
{ "data": [{ accession_id, patient_name, report_ready_at, waiting_minutes }] }
```

#### `PATCH /v1/samples/{accession_id}/handover`
Mark report as handed over to patient.
```
Request:
{
  "handed_over_to": "string",
  "method": "manual|barcode_scan",
  "barcode_scanned": "3719200142",  // if barcode_scan
  "handed_over_by": "uuid"
}
Response 200: { "handover_id": "uuid", "handed_over_at": "..." }
```
**Permission:** `report.handover`

---

## Service 4 — Device Integration Gateway (Go)
**Tech:** Go | **Port:** 8084 | **Base path:** `/v1`

#### `POST /v1/device-connections`
Register an analyzer connection.
```
Request:
{
  "analyzer_id": "ROCHE-COBAS-001",
  "display_name": "Roche Cobas c311 — Biochem Bay 1",
  "protocol": "HL7_v2|ASTM_1394",
  "host": "192.168.1.50",
  "port": 5500,
  "model": "Roche Cobas c311",
  "serial_number": "RC311-2024-001",
  "department_id": "uuid",
  "branch_id": "uuid"
}
Response 201:
{ "connection_id": "uuid", "status": "connected|disconnected" }
```
**Permission:** admin/owner

---

#### `GET /v1/device-connections`
List all registered analyzer connections with live status.
```
Response 200:
{ "data": [{ connection_id, display_name, protocol, status, last_seen_at }] }
```

#### `GET /v1/device-connections/{connection_id}`
Get connection details + last heartbeat.

#### `DELETE /v1/device-connections/{connection_id}`
Remove analyzer registration (disconnects socket).

#### `PATCH /v1/device-connections/{connection_id}/reconnect`
Force reconnect to analyzer.
```
Response 200: { "status": "connected", "reconnected_at": "..." }
```

#### `GET /v1/device-connections/{connection_id}/status`
Live health status (for dashboard polling).
```
Response 200:
{
  "connection_id", "status",
  "last_heartbeat_at", "messages_received_today": 142,
  "results_matched_today": 139, "results_unmatched_today": 3
}
```

#### `POST /v1/worklist-download/{connection_id}`
Push pending worklist to an analyzer.
```
Request: { "accession_ids": ["ACC-2026-00142"] }   // empty = all pending
Response 200:
{ "sent_count": 12, "failed_ids": [] }
```

#### `GET /v1/device-messages`
Query raw HL7/ASTM message log (troubleshooting).
```
Query: connection_id, from, to, status (all|matched|unmatched)
Response 200:
{ "data": [{ message_id, received_at, raw_message, status, matched_accession_id? }] }
```
**Permission:** `admin`

---

#### `GET /v1/unmatched-results`
Results received from analyzers that couldn't be auto-matched.
```
Response 200:
{ "data": [{ message_id, analyzer_id, patient_name_in_message, test_code, value, received_at }] }
```

#### `POST /v1/unmatched-results/{message_id}/match`
Manually match an unmatched result to an accession.
```
Request: { "accession_id": "uuid" }
Response 200: { "result_id": "uuid", "matched_at": "..." }
```
**Permission:** `report.validate`

---

## Service 5 — Result & Validation Service
**Tech:** Java/Spring Boot | **Port:** 8085

#### `POST /v1/results`
Submit a result (from Device Gateway or manual entry).
```
Request:
{
  "accession_id": "uuid",
  "test_id": "uuid",
  "value": "7.2",
  "unit": "×10³/µL",
  "method": "Automated",
  "source": "analyzer|manual",
  "entered_by": "uuid",
  "raw_hl7_segment": "OBX|1|NM|CBC^..."  // optional, from device gateway
}

Response 201:
{
  "result_id": "uuid",
  "value": "7.2",
  "flags": [],           // "H" | "L" | "CRITICAL_HIGH" | "CRITICAL_LOW"
  "reference_range": "4.0 - 11.0",
  "validation_status": "pending|auto_validated|pending_manual_validation",
  "created_at": "..."
}
```
**Permission:** `report.validate` (manual) — auto from Device Gateway (internal, service-to-service)

---

#### `GET /v1/results/{result_id}`
Get a single result with full flags and validation trail.

#### `GET /v1/results`
List results for an order or accession.
```
Query: accession_id, order_id, status, flagged_only (bool), page, size
```

#### `PUT /v1/results/{result_id}`
Amend a result (creates new version, retains history).
```
Request:
{
  "value": "7.8",
  "unit": "×10³/µL",
  "amendment_reason": "Repeat analysis after rerun requested"
}
Response 200:
{
  "result_id", "version": 2, "value": "7.8",
  "previous_value": "7.2", "amended_at": "...", "amended_by": "uuid"
}
```
**Permission:** `report.validate`

---

#### `POST /v1/results/{result_id}/validate`
Level-1 technical validation (technician sign-off).
```
Request: { "notes": "Within expected range for age group" }
Response 200:
{
  "validation_id": "uuid",
  "level": 1,
  "validated_at": "...",
  "validated_by": "uuid",
  "new_status": "pending_signoff"
}
```
**Permission:** `report.validate`

---

#### `POST /v1/results/{result_id}/signoff`
Level-2 pathologist sign-off + digital signature.
```
Request:
{
  "signature_type": "digital|pin",
  "pin": "****",           // if pin-based
  "notes": "Clinically correlated"
}
Response 200:
{
  "signoff_id": "uuid",
  "signed_at": "...",
  "signed_by": "uuid",
  "new_status": "signed_off"
}
```
**Permission:** `report.signoff`

---

#### `POST /v1/results/{result_id}/reject-validation`
Send result back (pathologist rejects tech validation).
```
Request: { "reason": "Value appears erroneous — please re-run" }
Response 200: { "result_id", "status": "pending_rerun" }
```
**Permission:** `report.signoff`

---

#### `GET /v1/results/{result_id}/delta-check`
Compare current value to patient's last result (delta check).
```
Response 200:
{
  "delta_pct": 45.2,
  "previous_value": "5.0",
  "previous_date": "2026-06-01",
  "delta_flag": true,
  "alert_message": "WBC count increased 45% vs last visit"
}
```

#### `POST /v1/results/{result_id}/repeat-request`
Request a re-run.
```
Request: { "reason": "Hemolyzed sample", "priority": "urgent" }
Response 201: { "repeat_request_id": "uuid", "status": "pending" }
```

#### `GET /v1/results/pending-validation`
Queue of results awaiting validation/sign-off.
```
Query: department_id, branch_id, level (1|2), page, size
Response 200:
{ "data": [{ result_id, test_name, patient_name, value, flags, pending_since }] }
```

#### `GET /v1/results/critical-alerts`
Unacknowledged critical value results.
```
Response 200:
{ "data": [{ result_id, test_name, patient_name, phone, value, flag: "CRITICAL_HIGH" }] }
```

#### `POST /v1/results/{result_id}/acknowledge-critical`
Log critical value callback/acknowledgement.
```
Request:
{
  "called_at": "2026-07-10T10:05:00Z",
  "called_to_phone": "+919876543210",
  "caller_id": "uuid",
  "response_notes": "Patient informed; advised to go to emergency"
}
Response 200: { "acknowledgement_id": "uuid" }
```

#### `GET /v1/results/{result_id}/audit-trail`
Full history: entries, amendments, validations.
```
Response 200:
{ "events": [{ event_type, version, value, actor, timestamp }] }
```
**Permission:** `audit.view`

---

## Service 6 — Reporting Service
**Tech:** Java/Spring Boot | **Port:** 8086

#### `POST /v1/reports/generate`
Generate a report PDF (triggered by `ResultValidated` event or manually).
```
Request:
{
  "order_id": "uuid",
  "template_id": "uuid",
  "letterhead_id": "uuid",
  "preview_only": false
}
Response 201:
{
  "report_id": "uuid",
  "status": "draft|pending_signoff",
  "preview_url": "/v1/reports/uuid/preview",
  "created_at": "..."
}
```

---

#### `GET /v1/reports/{report_id}`
Get report metadata and current lifecycle status.
```
Response 200:
{
  "report_id", "order_id", "patient_id",
  "status": "draft|pending_signoff|signed_off|delivered",
  "version": 1,
  "print_count": 0,
  "signed_by": null,
  "signed_at": null,
  "pdf_url": null,
  "created_at"
}
```

#### `GET /v1/reports/{report_id}/preview`
Render a preview of the report (pre-sign-off; inline-editable state).
```
Response 200: application/pdf (watermarked "DRAFT — NOT FOR DISTRIBUTION")
```

#### `GET /v1/reports/{report_id}/pdf`
Download the final signed PDF.
```
Response 200: application/pdf
```
(Returns 403 if report is not yet signed off — unsigned reports cannot be issued.)

---

#### `PATCH /v1/reports/{report_id}`
Inline-edit report content before sign-off.
```
Request:
{
  "clinical_notes": "Elevated WBC — suggest clinical correlation",
  "formatted_sections": {
    "interpretation": "Findings consistent with mild leukocytosis"
  }
}
Response 200: { "report_id", "status": "draft" }
```
**Permission:** `report.signoff` (only authorized signatories can edit)

---

#### `POST /v1/reports/{report_id}/signoff`
Apply pathologist/owner digital signature → finalizes report.
```
Request:
{
  "pin": "****",
  "signature_type": "digital",
  "notes": "Reviewed and signed"
}
Response 200:
{
  "report_id",
  "status": "signed_off",
  "signed_pdf_url": "/v1/reports/uuid/pdf",
  "signed_at": "...",
  "signed_by": "uuid"
}
```
**Permission:** `report.signoff`

---

#### `POST /v1/reports/{report_id}/deliver`
Deliver report via specified channels (staff-initiated for WhatsApp — not auto-push).
```
Request:
{
  "channels": ["whatsapp", "sms", "email"],
  "recipient_type": "patient|doctor|b2b",
  "recipient_id": "uuid",
  "secure_link_expiry_hours": 48
}
Response 200:
{
  "delivery_ids": [
    { "channel": "whatsapp", "delivery_id": "uuid", "status": "queued" }
  ]
}
```
**Permission:** `report.deliver`

---

#### `GET /v1/reports/{report_id}/delivery-status`
Live delivery status per channel.
```
Response 200:
{
  "deliveries": [
    { "channel": "whatsapp", "status": "delivered|failed|pending", "delivered_at": "..." }
  ]
}
```

#### `POST /v1/reports/{report_id}/print`
Record a print action (increments print_count; written to print-log).
```
Request:
{
  "copies": 2,
  "printed_by": "uuid",
  "printer_id": "COUNTER-PRINTER-1"
}
Response 200:
{
  "print_log_id": "uuid",
  "print_count": 3,
  "printed_at": "..."
}
```
**Permission:** `report.print`

---

#### `GET /v1/reports/{report_id}/print-log`
View complete print history.
```
Response 200:
{ "prints": [{ print_log_id, copies, printed_by, printed_at }] }
```

#### `GET /v1/reports/{report_id}/versions`
Report amendment/version history.
```
Response 200:
{ "versions": [{ version, status, amended_at, amended_by, change_summary }] }
```

---

### Report Templates

#### `POST /v1/report-templates`
Create a report template for a test/department.
```
Request:
{
  "name": "CBC Report — Standard",
  "department_id": "uuid",
  "test_ids": ["uuid1", "uuid2"],    // tests this template covers
  "letterhead_id": "uuid",
  "template_html": "<html>...</html>",
  "format": "standard|cumulative"
}
Response 201: { "template_id": "uuid" }
```
**Permission:** `report.stationery.manage`

#### `GET /v1/report-templates`
List templates. Query: `department_id`, `test_id`.

#### `GET /v1/report-templates/{template_id}`
Get template.

#### `PUT /v1/report-templates/{template_id}`
Update template.

---

## Service 7 — MIS / Analytics Service (CQRS Read Model)
**Tech:** Java/Spring Boot | **Port:** 8087
**Note:** All endpoints are GET-only — this service only reads its own denormalized projections fed by Kafka
events. No writes allowed via API. Common query params: `branch_id`, `date_from`, `date_to`, `compare_to`.

#### `GET /v1/analytics/summary`
Executive summary dashboard — headline KPIs.
```
Query: branch_id (optional — omit for all branches)
Response 200:
{
  "registrations_today": 47,
  "revenue_today": 82500.00,
  "revenue_mtd": 1820000.00,
  "tat_breach_count": 3,
  "pending_samples": 12,
  "reports_delivered_today": 44,
  "critical_alerts_unack": 1,
  "top_alerts": [
    { "type": "tat_breach", "message": "3 orders past TAT in Hematology" }
  ]
}
```
**Permission:** owner/manager role

---

#### `GET /v1/analytics/revenue`
Revenue & collections breakdown.
```
Query:
  branch_id, period (today|wtd|mtd|ytd|custom), date_from, date_to,
  group_by (day|week|month|test|department|doctor|partner)

Response 200:
{
  "total": 1820000.00,
  "cash": 980000.00,
  "credit": 840000.00,
  "collected": 1540000.00,
  "outstanding": 280000.00,
  "trend": [{ "period": "2026-07-01", "revenue": 62000.00, "collected": 55000.00 }],
  "by_group": [{ "label": "CBC", "revenue": 15400.00, "volume": 62 }]
}
```
**Permission:** `finance.reports.money_collections`

---

#### `GET /v1/analytics/tat`
Turnaround time analytics.
```
Query: branch_id, department_id, period, test_id
Response 200:
{
  "avg_tat_minutes": 187,
  "p95_tat_minutes": 340,
  "breach_count": 7,
  "breach_rate_pct": 4.2,
  "by_department": [{ "department": "Hematology", "avg_tat": 120, "breaches": 2 }],
  "by_test": [{ "test_name": "Culture & Sensitivity", "avg_tat": 2880 }]
}
```
**Permission:** `finance.reports.master`

---

#### `GET /v1/analytics/samples`
Sample volume and rejection analytics.
```
Query: branch_id, department_id, period
Response 200:
{
  "total_samples": 432,
  "rejected_count": 18,
  "rejection_rate_pct": 4.2,
  "rejection_reasons": [
    { "code": "hemolyzed", "count": 9 },
    { "code": "insufficient_volume", "count": 5 }
  ],
  "trend": [{ "date": "2026-07-01", "total": 48, "rejected": 2 }]
}
```

---

#### `GET /v1/analytics/referrals`
Referral-source analytics. **No payout/commission data ever included.**
```
Query: period, top_n (default 20), branch_id
Response 200:
{
  "referral_sources": [
    {
      "doctor_id": "uuid",
      "name": "Dr. Priya Sharma",
      "type": "doctor|clinic|b2b",
      "volume_this_period": 84,
      "volume_prev_period": 91,
      "revenue_generated": 182000.00,
      "trend": "declining",
      "win_back_flag": true
    }
  ]
}
```
**Permission:** `finance.reports.referral_activity`

---

#### `GET /v1/analytics/patients/geography`
Patient acquisition & geography analytics.
```
Query: branch_id, period
Response 200:
{
  "pincode_heatmap": [{ "pincode": "560001", "count": 42, "lat": 12.97, "lng": 77.60 }],
  "source_channels": [
    { "channel": "walk_in", "count": 210, "pct": 61 },
    { "channel": "b2b", "count": 98, "pct": 29 },
    { "channel": "home_collection", "count": 35, "pct": 10 }
  ],
  "new_vs_repeat": { "new": 142, "repeat": 201 }
}
```

---

#### `GET /v1/analytics/tests/performance`
Test & department performance.
```
Query: period, department_id
Response 200:
{
  "top_tests": [{ "test_id", "test_name", "volume": 112, "revenue": 28000.00 }],
  "bottom_tests": [...],
  "by_department": [{ "department_name", "volume", "revenue", "rejection_rate" }]
}
```

---

#### `GET /v1/analytics/operations`
Operations health — productivity & pending work.
```
Query: branch_id, period
Response 200:
{
  "productivity_per_tech": [
    { "user_id", "name", "samples_processed": 48, "results_entered": 46 }
  ],
  "pending_worklist_count": 12,
  "overdue_samples": 3,
  "day_end_pending": false
}
```

---

#### `GET /v1/analytics/finance`
Finance & receivables health.
```
Query: period
Response 200:
{
  "b2b_aging": {
    "0_30_days": 85000.00,
    "31_60_days": 42000.00,
    "61_90_days": 18000.00,
    "over_90_days": 9000.00,
    "total_outstanding": 154000.00
  },
  "discount_leakage": 8200.00,
  "day_end_variance_today": 0.00
}
```
**Permission:** `finance.reports.money_collections`

---

#### `GET /v1/analytics/qc`
QC pass/fail analytics (feeds NABL audit-readiness).
```
Query: department_id, period
Response 200:
{
  "qc_pass_rate_pct": 96.2,
  "failed_qc_runs": [{ "test_id", "test_name", "failed_at", "rule_violated": "2-2s" }],
  "westgard_violations": 2,
  "nabl_readiness_score": 94
}
```

---

#### `GET /v1/analytics/inventory`
Inventory analytics for ops.
```
Response 200:
{
  "low_stock_items": [{ "item_id", "name", "qty_on_hand": 4, "reorder_threshold": 10 }],
  "expiring_soon": [{ "item_id", "name", "expiry_date": "2026-08-01", "qty": 50 }],
  "top_consumption": [{ "item_name", "tests_per_day_avg": 12 }]
}
```

---

#### `GET /v1/analytics/alerts`
Auto-surfaced anomaly alerts for the owner dashboard.
```
Response 200:
{
  "alerts": [
    {
      "alert_id": "uuid",
      "type": "revenue_drop|referral_drop|tat_spike|rejection_spike",
      "severity": "high|medium|low",
      "message": "Revenue down 8% WoW — Bangalore branch",
      "triggered_at": "2026-07-10T06:00:00Z",
      "acknowledged": false
    }
  ]
}
```

---

#### `POST /v1/analytics/alerts/{alert_id}/acknowledge`
Acknowledge an alert.
```
Response 200: { "alert_id", "acknowledged_at": "..." }
```

---

#### `POST /v1/analytics/digests`
Subscribe to scheduled insight digest.
```
Request:
{
  "frequency": "daily|weekly|monthly",
  "channels": ["email", "whatsapp"],
  "send_time": "08:00",
  "timezone": "Asia/Kolkata"
}
Response 201: { "subscription_id": "uuid" }
```
**Permission:** owner/manager role

#### `GET /v1/analytics/digests`
List digest subscriptions.

#### `DELETE /v1/analytics/digests/{subscription_id}`
Cancel a digest subscription.

---

## Service 8 — Notification Service
**Tech:** Java/Spring Boot | **Port:** 8088

#### `POST /v1/notifications/send`
Send a notification via one channel.
```
Request:
{
  "recipient_type": "patient|doctor|staff",
  "recipient_id": "uuid",
  "channel": "whatsapp|sms|email",
  "template_id": "uuid",
  "variables": {
    "patient_name": "Ravi Kumar",
    "report_link": "https://...",
    "otp": "482910"
  }
}
Response 202:
{ "notification_id": "uuid", "status": "queued", "queued_at": "..." }
```

---

#### `GET /v1/notifications/{notification_id}`
Get notification with delivery status.
```
Response 200:
{
  "notification_id", "channel", "recipient_id",
  "status": "queued|sent|delivered|failed|bounced",
  "sent_at", "delivered_at",
  "failure_reason": null
}
```

#### `GET /v1/notifications`
Query notification history.
```
Query: recipient_id, channel, status, template_id, date_from, date_to, page, size
```

#### `POST /v1/notifications/{notification_id}/retry`
Retry a failed notification.
```
Response 202: { "notification_id", "status": "queued" }
```

---

### Notification Templates

#### `POST /v1/notification-templates`
Create a notification template.
```
Request:
{
  "name": "Report Ready — WhatsApp",
  "channel": "whatsapp|sms|email",
  "subject": "Your Lab Report is Ready",       // email only
  "body": "Dear {{patient_name}}, your {{test_name}} report is ready...",
  "variables": ["patient_name", "test_name", "report_link"],
  "dlt_template_id": "1234567890",             // SMS (DLT-registered) only
  "language_code": "en"
}
Response 201: { "template_id": "uuid" }
```
**Permission:** admin/owner

---

#### `GET /v1/notification-templates`
List templates. Query: `channel`, `q`.

#### `GET /v1/notification-templates/{template_id}`
Get template.

#### `PUT /v1/notification-templates/{template_id}`
Update template.

#### `DELETE /v1/notification-templates/{template_id}`
Soft-delete template.

---

#### `GET /v1/notifications/delivery-stats`
Aggregated delivery statistics.
```
Query: channel, period
Response 200:
{
  "channel": "whatsapp",
  "sent": 842,
  "delivered": 819,
  "failed": 23,
  "pending": 0,
  "delivery_rate_pct": 97.3
}
```

---

## Service 9 — Audit & Consent (DPDP) Service
**Tech:** Java/Spring Boot | **Port:** 8089

**Note:** Audit events are written by other services via internal gRPC (not via this REST API).
These REST endpoints are for querying and compliance workflows.

#### `GET /v1/audit-events`
Query the immutable audit log.
```
Query:
  entity_type (patient|order|result|report|invoice|user),
  entity_id, actor_id, action, from, to, page, size

Response 200:
{
  "data": [
    {
      "event_id": "uuid",
      "entity_type": "result",
      "entity_id": "uuid",
      "action": "result.validate",
      "actor_id": "uuid",
      "actor_role": "technician",
      "payload_hash": "sha256...",
      "chain_hash": "sha256...",
      "timestamp": "..."
    }
  ]
}
```
**Permission:** `audit.view`

---

#### `GET /v1/audit-events/{event_id}`
Get a single audit event.

#### `GET /v1/audit-events/patient/{patient_id}`
All audit events for a specific patient (per-patient audit trail view).
**Permission:** `audit.view`

#### `POST /v1/audit/verify-chain`
Verify hash chain integrity across the log (NABL tamper-evidence check).
```
Request: { "from": "2026-01-01", "to": "2026-07-10" }
Response 200:
{
  "chain_valid": true,
  "events_checked": 18421,
  "first_broken_event_id": null,
  "verified_at": "..."
}
```
**Permission:** admin/owner

---

### Consent Management

#### `POST /v1/consents`
Record consent for a patient (called by Patient Service internally).
```
Request:
{
  "patient_id": "uuid",
  "consent_type": "data_processing|marketing|research",
  "purpose": "diagnostic_testing",
  "language_code": "en",
  "consent_text_version": "v2.1",
  "captured_via": "counter|kiosk|patient_app",
  "ip_address": "192.168.1.1",
  "captured_at": "2026-07-10T09:00:00Z"
}
Response 201:
{ "consent_id": "uuid", "hash": "sha256...", "captured_at": "..." }
```

#### `GET /v1/consents/{consent_id}`
Get a specific consent record.

#### `GET /v1/consents/patient/{patient_id}`
All consent records for a patient.
```
Response 200:
{ "consents": [{ consent_id, type, purpose, status, captured_at, revoked_at }] }
```

#### `POST /v1/consents/{consent_id}/revoke`
Revoke a consent.
```
Request: { "reason": "Patient requested withdrawal", "revoked_by": "uuid" }
Response 200: { "consent_id", "status": "revoked", "revoked_at": "..." }
```

---

### Data Subject Rights (DPDP)

#### `POST /v1/data-subject-requests`
Submit a data subject access or erasure request.
```
Request:
{
  "patient_id": "uuid",
  "request_type": "access|erasure|portability|correction",
  "contact_phone": "+919876543210",
  "verification_otp": "482910"
}
Response 201:
{
  "dsr_id": "uuid",
  "request_type": "erasure",
  "status": "received",
  "estimated_completion": "2026-07-17T00:00:00Z"
}
```

#### `GET /v1/data-subject-requests/{dsr_id}`
Get DSR status.

#### `GET /v1/data-subject-requests`
List all DSRs (compliance officer view).
```
Query: status (pending|in_progress|completed|overdue), request_type, page, size
```
**Permission:** admin/owner

---

### Breach Notification (DPDP 72hr / CERT-In 6hr)

#### `POST /v1/breach-notifications`
File a data breach incident — triggers the 72-hr DPDP and 6-hr CERT-In workflows.
```
Request:
{
  "title": "Unauthorized DB access — patient records",
  "description": "string",
  "affected_patients_count": 240,
  "data_categories": ["name", "dob", "test_results"],
  "detected_at": "2026-07-10T07:30:00Z",
  "initial_severity": "high|medium|low"
}
Response 201:
{
  "breach_id": "uuid",
  "dpdp_deadline": "2026-07-13T07:30:00Z",
  "cert_in_deadline": "2026-07-10T13:30:00Z",
  "status": "open"
}
```
**Permission:** owner/admin

#### `GET /v1/breach-notifications/{breach_id}`
Get breach status and workflow progress.

#### `PATCH /v1/breach-notifications/{breach_id}`
Update breach notification (add notified_authorities_at, resolution notes).

#### `GET /v1/breach-notifications`
List breach incidents.

---

### Retention

#### `GET /v1/retention/policies`
List active data retention policies.
```
Response 200:
{ "policies": [{ policy_id, data_category, retention_days, action_on_expiry }] }
```

#### `POST /v1/retention/policies`
Create a retention policy.
**Permission:** owner/admin

#### `POST /v1/retention/run`
Manually trigger a retention sweep (also runs on cron).
```
Response 202: { "job_id": "uuid", "status": "started" }
```

---

## Service 10 — B2B & Partner Billing Service
**Tech:** Java/Spring Boot | **Port:** 8090

### B2B Partners

#### `POST /v1/b2b-partners`
Create a B2B partner.
```
Request:
{
  "name": "Apollo Clinic Koramangala",
  "type": "hospital|clinic|corporate|tpa|reference_lab|collection_franchise",
  "contact_name": "Dr. Mehta",
  "contact_phone": "+919876543210",
  "contact_email": "accounts@apolloclinic.com",
  "address": { "line1", "city", "state", "pincode" },
  "gst_number": "29ABCDE1234F1Z5",
  "credit_limit": 100000.00,
  "billing_cycle": "monthly|fortnightly|weekly",
  "credit_days": 30
}
Response 201: { "partner_id": "uuid", "account_number": "B2B-2026-0042" }
```
**Permission:** `master.partner.manage`

---

#### `GET /v1/b2b-partners`
List partners. Query: `type`, `q`, `has_overdue (bool)`, `page`, `size`.

#### `GET /v1/b2b-partners/{partner_id}`
Get partner with credit utilization and account summary.

#### `PUT /v1/b2b-partners/{partner_id}`
Update partner.

#### `DELETE /v1/b2b-partners/{partner_id}`
Soft-delete partner.

---

### Rate Contracts

#### `POST /v1/b2b-rate-contracts`
Create a per-partner rate contract.
```
Request:
{
  "partner_id": "uuid",
  "name": "Apollo — Q3 2026 Contract",
  "effective_from": "2026-07-01",
  "effective_to": "2026-09-30",
  "test_rates": [
    { "test_id": "uuid", "price": 180.00, "is_exempt": true }
  ],
  "panel_rates": [
    { "panel_id": "uuid", "price": 550.00 }
  ]
}
Response 201: { "contract_id": "uuid" }
```
**Permission:** `master.partner.manage`

#### `GET /v1/b2b-rate-contracts`
List contracts. Query: `partner_id`, `active_on_date`.

#### `GET /v1/b2b-rate-contracts/{contract_id}`
Get contract with all rate lines.

#### `PUT /v1/b2b-rate-contracts/{contract_id}`
Update contract (only future-effective; existing billed orders unaffected).

#### `PATCH /v1/b2b-rate-contracts/{contract_id}/deactivate`
Deactivate a contract early.
```
Request: { "reason": "Contract terminated", "effective_date": "2026-08-01" }
```

---

### B2B Invoicing & Collections

#### `GET /v1/b2b-invoices`
List B2B invoices.
```
Query: partner_id, status (draft|sent|partially_paid|paid|overdue), from, to, page, size
```

#### `GET /v1/b2b-invoices/{invoice_id}`
Get invoice with all line items.

#### `POST /v1/b2b-invoices/{invoice_id}/send`
Send invoice to partner (email/WhatsApp).
```
Request: { "channels": ["email"], "notes": "Please arrange payment within 30 days" }
Response 200: { "sent_at": "...", "delivery_ids": [] }
```

#### `POST /v1/b2b-invoices/{invoice_id}/record-payment`
Record a payment received against a B2B invoice.
```
Request:
{
  "amount": 50000.00,
  "payment_date": "2026-07-10",
  "payment_mode": "neft|rtgs|cheque|upi",
  "reference_number": "UTR123456789",
  "notes": "Part payment"
}
Response 200:
{
  "payment_id": "uuid",
  "invoice_id",
  "amount_paid": 50000.00,
  "amount_outstanding": 30000.00,
  "invoice_status": "partially_paid"
}
```
**Permission:** `finance.reports.money_collections`

---

### Receivables Aging

#### `GET /v1/b2b-receivables/aging`
Receivables aging report across all or one partner.
```
Query: partner_id (optional), as_of_date (default today), branch_id
Response 200:
{
  "as_of_date": "2026-07-10",
  "total_outstanding": 287000.00,
  "aging_buckets": {
    "current_0_30": 120000.00,
    "days_31_60": 85000.00,
    "days_61_90": 52000.00,
    "over_90": 30000.00
  },
  "by_partner": [
    {
      "partner_id", "name",
      "outstanding": 85000.00,
      "overdue_bucket": "days_31_60",
      "last_payment_date": "2026-06-01"
    }
  ]
}
```
**Permission:** `finance.reports.money_collections`

---

#### `POST /v1/b2b-receivables/follow-up`
Log a collection follow-up action.
```
Request:
{
  "partner_id": "uuid",
  "invoice_id": "uuid",    // optional — or all invoices for partner
  "action_type": "call|email|visit|demand_notice",
  "notes": "Spoke with accounts team — will pay by 15th",
  "next_follow_up_date": "2026-07-15"
}
Response 201: { "follow_up_id": "uuid" }
```

#### `GET /v1/b2b-receivables/follow-ups`
List follow-up log for a partner.
Query: `partner_id`, `from`, `to`.

---

### Credit Limits

#### `GET /v1/b2b-credit-limits`
Credit limit + utilization for all partners.
```
Response 200:
{ "data": [{ partner_id, name, credit_limit, utilized, available, utilization_pct }] }
```

#### `PATCH /v1/b2b-credit-limits/{partner_id}`
Update credit limit.
```
Request: { "credit_limit": 150000.00, "reason": "Good payment track record" }
```
**Permission:** admin/owner

---

### Professional Service Contracts (Anti-kickback compliant)

#### `POST /v1/professional-service-contracts`
Create a legitimate professional services contract.
**Anti-kickback guardrail:** `fee_type` can only be `fixed` or `per_service` — never `per_referral`.
System flags for review if the professional also refers patients.
```
Request:
{
  "professional_id": "uuid",              // doctor or professional entity
  "professional_name": "Dr. Suresh Nair",
  "service_description": "Histopathology reporting consultation",
  "fee_type": "fixed|per_service",        // per_referral is BLOCKED
  "amount": 25000.00,
  "frequency": "monthly",
  "effective_from": "2026-07-01",
  "effective_to": "2026-12-31"
}
Response 201:
{
  "contract_id": "uuid",
  "compliance_flag": false,     // true if this professional also refers patients
  "compliance_note": null
}
```
**Permission:** admin/owner

---

#### `GET /v1/professional-service-contracts`
List contracts. Query: `professional_id`, `status (active|expired)`.

#### `GET /v1/professional-service-contracts/{contract_id}`
Get contract detail.

#### `PATCH /v1/professional-service-contracts/{contract_id}/terminate`
Terminate a contract early.

---

### Referral Analytics (Read-only, no payout)

#### `GET /v1/referral-analytics`
Referral-source analytics — volume and revenue *generated* only. **No payout/commission fields.**
```
Query:
  period (wtd|mtd|ytd|custom), date_from, date_to,
  top_n (default 20), branch_id, source_type (doctor|clinic|b2b)

Response 200:
{
  "period": "mtd",
  "referral_sources": [
    {
      "source_id": "uuid",
      "source_type": "doctor",
      "name": "Dr. Priya Sharma",
      "volume_this_period": 84,
      "volume_prev_period": 91,
      "revenue_generated_this_period": 182000.00,
      "trend": "declining",
      "win_back_flag": true
    }
  ],
  "disclaimer": "Analytics only. No payouts attached. Anti-kickback compliant."
}
```
**Permission:** `finance.reports.referral_activity`

---

### B2B Account Statements

#### `GET /v1/b2b-account-statements/{partner_id}`
Generate account statement for a B2B partner (statement as buyer — not commission/earnings).
```
Query: from, to, format (json|pdf)
Response 200:
{
  "partner_id", "partner_name", "account_number",
  "period": { "from": "2026-07-01", "to": "2026-07-31" },
  "opening_balance": 30000.00,
  "invoices": [{ invoice_id, date, amount, tax, status }],
  "payments": [{ payment_id, date, amount, mode, reference }],
  "closing_balance": 80000.00,
  "statement_note": "This is a buyer account statement. Not a referral earnings statement."
}
```
**Permission:** `finance.reports.money_collections`

---

## Summary: Method distribution

| Method | Count | When used |
|---|---|---|
| **GET** | ~65 | Read: queries, lists, downloads, dashboards |
| **POST** | ~45 | Create resources, trigger actions, submit events |
| **PUT** | ~15 | Full replacement update (master data) |
| **PATCH** | ~12 | Partial update or state transition |
| **DELETE** | ~8 | Soft-delete (never hard-delete clinical data) |

Total: ~145 endpoints across 10 microservices.

---

## Kafka event contracts (async complements to the REST APIs)

| Event | Published by | Consumed by |
|---|---|---|
| `PatientRegistered` | Patient MPI | Audit, Notification, MIS |
| `OrderCreated` | Order & Workflow | Billing, MIS, Notification, Audit |
| `SampleRejected` | Order & Workflow | MIS (QC analytics), Notification |
| `TatBreached` | Order & Workflow | Notification, MIS |
| `ResultRaw` | Device Gateway | Result & Validation |
| `ResultValidated` | Result & Validation | Reporting, MIS, Audit |
| `ResultSigned` | Result & Validation | Reporting |
| `ReportReady` | Reporting | Notification, MIS, Audit |
| `ReportDelivered` | Notification | MIS, Audit |
| `InvoiceCreated` | Billing (separate service) | B2B Billing, MIS, Audit |
| `B2BPaymentReceived` | B2B Billing | MIS, Audit |
| `ConsentCaptured` | Patient MPI | Audit & Consent |
| `LowStockAlert` | Inventory | Notification, MIS |

---

## Verification plan

To validate these APIs end-to-end:
1. Run the walk-in vertical slice: `POST /patients` → `POST /orders` → `POST /samples` → `POST /results`
   → `POST /results/{id}/validate` → `POST /results/{id}/signoff` → `POST /reports/generate`
   → `POST /reports/{id}/signoff` → `POST /reports/{id}/deliver`
2. Check audit trail: `GET /audit-events?entity_type=result&entity_id={id}` shows all steps.
3. Verify MIS projections: `GET /analytics/summary` reflects the walk-in after Kafka event processing.
4. Confirm anti-kickback guardrail: `POST /professional-service-contracts` with `fee_type: per_referral`
   must return `400 Bad Request`.
5. Confirm RLS isolation: create two tenants, verify tenant A cannot read tenant B's `GET /orders`.

---

---

# PART 2 — UI SCREEN MOCKUPS

Wire-level ASCII mockups for every key screen across all four apps.

**Legend:**
- `[Button]` = clickable button
- `[_____]` = text input field
- `[▼ X]` = dropdown
- `(●X)(○Y)` = radio buttons
- `☑ / ☐` = checkboxes
- `(=X=)` = active tab
- `⚠` = alert/warning indicator
- `✅ / ✕` = success / error state

---

## APP 1 — COUNTER PWA
**Users:** Lab Staff, Receptionist, Technician, Pathologist
**Platform:** Web (offline-capable PWA, runs on branch edge node)

---

### SCREEN C1 — Login
```
┌──────────────────────────────────────────────────────┐
│              🔬 DiagDesk Counter                     │
│              Koramangala Branch                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│   Email     [________________________________]       │
│   Password  [________________________________] [Show] │
│                                                      │
│             [       Sign In       ]                  │
│                                                      │
│   ──────────────── OR ────────────────               │
│                                                      │
│   [Send OTP to Email]   [Authenticator App (TOTP)]  │
│   [Use Biometric / Passkey  🔐]                      │
│                                                      │
│   OTP Code: [______]   [Verify OTP]                  │
│                                                      │
│   Forgot password? Contact your administrator.       │
│                                                      │
│   ● Offline mode available — data saved locally      │
└──────────────────────────────────────────────────────┘
```

---

### SCREEN C2 — Counter Dashboard (Home)
```
┌─────────────────────────────────────────────────────────────────────┐
│  🔬 DiagDesk Counter   Branch: Koramangala   [🔔 3] [👤 Priya ▼]   │
├───────────────┬─────────────────────────────────────────────────────┤
│  NAVIGATION   │  GOOD MORNING, PRIYA              Thu, 10 Jul 2026  │
│               │                                                     │
│  > Dashboard  │  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────┐│
│  > Patients   │  │Today Reg. │ │Pending    │ │Reports   │ │TAT   ││
│  > Orders     │  │    47     │ │Samples 12 │ │Ready   8 │ │Breach││
│  > Samples    │  │  ▲ +5 vs  │ │           │ │          │ │  3   ││
│  > Results    │  │ yesterday │ │           │ │          │ │  ⚠   ││
│  > Reports    │  └───────────┘ └───────────┘ └──────────┘ └──────┘│
│  > Inventory  │                                                     │
│  > Masters    │  QUICK ACTIONS  ────────────────────────────────── │
│  > Day-End    │  [+ New Patient]  [+ Walk-in Order]  [📷 Scan]     │
│               │  [Enter Results]  [Reports Queue]    [Day-End]     │
│               │                                                     │
│               │  LIVE ALERTS  ──────────────────────────────────── │
│               │  ⚠ 3 orders past TAT — Hematology dept             │
│               │  ⚠ CBC reagent kit LOW (4 tests remaining)         │
│               │  ✅ Report ready: Ravi Kumar — CBC, LFT             │
│               │  📞 CRITICAL: ACC-003 — WBC 35 (critical high)     │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C3 — Patient Search
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Patients                                      │
├───────────────┬─────────────────────────────────────────────────────┤
│  NAVIGATION   │  PATIENT SEARCH                                     │
│               │                                                     │
│  > Dashboard  │  [🔍 Search by Name, Phone, UHID, Aadhaar-last4 ] │
│  >(Patients)  │                           [Search]                  │
│  > Orders     │                                                     │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ UHID        Name           Phone   Last Visit│  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ LAB-00142  Ravi Kumar      98765…  05 Jul   │  │
│               │  │ LAB-00089  Priya Menon     97654…  01 Jul   │  │
│               │  │ LAB-00201  Arjun Shah      99887…  08 Jul   │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  Patient not found?                                 │
│               │  [+ Register New Patient]                           │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C4 — Patient Registration Form
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Patients  >  New Registration                 │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  NEW PATIENT REGISTRATION                           │
│               │  ⚠ Possible duplicate: Ravi Kumar (98765…) match   │
│               │  [View Match]  [Ignore & Continue]                  │
│               │                                                     │
│               │  First Name* [_______________] Last* [____________] │
│               │  Date of Birth* [__/__/____]  Gender* (●M)(○F)(○O) │
│               │  Phone*  [+91-__________]  Email  [_______________] │
│               │  Address [_____________________________]            │
│               │  City [_____________]  State [▼]  PIN [______]      │
│               │  Blood Group [▼ Select]  Allergies [_____________]  │
│               │  Referring Doctor [🔍 Dr. search…]                 │
│               │                                                     │
│               │  ── DPDP CONSENT (required) ─────────────────────  │
│               │  ☐ I consent to processing my health data for       │
│               │    diagnostic testing. (Language: [▼ English])      │
│               │  ☐ I consent to receiving health communication.     │
│               │                                                     │
│               │  [Check Duplicates]    [Save & Create Order ▶]     │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C5 — Order Entry & Billing
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Orders  >  New Order                          │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  Patient: Ravi Kumar | UHID: LAB-00142 | M, 35y     │
│               │  Referred by: [🔍 Search doctor…]                  │
│               │  B2B Partner: [▼ None / Select Partner]             │
│               │  Priority: (●Routine)(○Urgent)(○STAT)              │
│               │                                                     │
│               │  ── TEST SELECTION ──────────────────────────────  │
│               │  [🔍 Search test or panel…]          [+ Add]       │
│               │                                                     │
│               │  ┌───────────────────────────────────────────────┐ │
│               │  │ Test / Panel     Dept    TAT    Price   [✕]  │ │
│               │  ├───────────────────────────────────────────────┤ │
│               │  │ CBC              Hemato  4hr    ₹250   [✕]   │ │
│               │  │ LFT Panel        Biochem 6hr    ₹550   [✕]   │ │
│               │  │ TSH              Biochem 8hr    ₹350   [✕]   │ │
│               │  └───────────────────────────────────────────────┘ │
│               │  Subtotal: ₹1,150.00                               │
│               │                                                     │
│               │  ── DISCOUNT ────────────────────────────────────  │
│               │  Discount %: [___]   Amount: ₹___                  │
│               │  Justification (required): [_____________________]  │
│               │  ⚠ Above 10%? Approval required → [Request Approv] │
│               │                                                     │
│               │  ── PAYMENT ─────────────────────────────────────  │
│               │  (●Cash)(○UPI)(○Card)(○Credit/Due)(○Partial)       │
│               │  Amount Paying Now: [₹1,150]  Balance Due: ₹0      │
│               │                                                     │
│               │  [Save Draft]       [Generate Invoice & Print ▶]   │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C6 — Invoice Confirmed + Sample Accession
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Orders  >  ORD-2026-00142  ✅ Order Created  │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  ✅ ORDER CONFIRMED                                 │
│               │  Order: ORD-2026-00142 | Invoice: INV-2026-00142    │
│               │  Patient: Ravi Kumar  |  Total: ₹1,150  Paid: ₹1,150│
│               │                                                     │
│               │  ── SAMPLES TO COLLECT ──────────────────────────  │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Accession    Specimen     Tests     Label    │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ ACC-2026-001 Blood (EDTA) CBC, LFT  [🖨 Print]│ │
│               │  │ ACC-2026-002 Blood (Plain)TSH        [🖨 Print]│ │
│               │  └──────────────────────────────────────────────┘  │
│               │  [🖨 Print All Labels]   [🖨 Print Receipt]        │
│               │                                                     │
│               │  ── SAMPLE COLLECTION ───────────────────────────  │
│               │  Scan accession: [______________]  [📷 Scan]       │
│               │  Collected by: [▼ Priya (self)]                    │
│               │  Collected at: [10:15 AM]                          │
│               │                                                     │
│               │  [✓ Mark Collected]   [✕ Reject Sample]           │
│               │  Rejection reason: [▼ Hemolyzed / Clotted / ...]   │
│               │  Notes: [___________________________________]       │
│               │                                                     │
│               │  [← Back to Orders]     [➕ New Walk-in ▶]        │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C7 — Analyzer Worklist
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Worklist & Results                            │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  ANALYZER WORKLIST     Dept: [▼ All]  [Today ▼]    │
│               │                                                     │
│               │  CONNECTED ANALYZERS  ─────────────────────────    │
│               │  ● Roche Cobas c311   ✅ Connected  139 results/day │
│               │  ● Sysmex XN-550      ✅ Connected   84 results/day │
│               │  ○ Beckman DXH-800    ⛔ Disconnected [Reconnect]  │
│               │                                                     │
│               │  [↓ Push Worklist → Roche Cobas c311]              │
│               │  [↓ Push Worklist → Sysmex XN-550]                 │
│               │                                                     │
│               │  PENDING RESULTS  ─────────────────────────────    │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Accession   Patient     Test   Priority  TAT │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ ACC-001    Ravi Kumar  CBC    Routine   ⏱3h │  │
│               │  │ ACC-003    Priya M.   TSH    Urgent  ⚠ OVR  │  │
│               │  │ ACC-005    Arjun Shah LFT    Routine   ⏱1h │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  ⚠ UNMATCHED RESULTS (3) — needs manual matching   │
│               │  [Review & Match Unmatched Results]                 │
│               │                                                     │
│               │  [+ Enter Manual Result]                            │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C8 — Result Entry & Validation (Technician View)
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Results  >  ACC-2026-001                      │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  Ravi Kumar | ACC-001 | CBC | Routine | 🔵 Pending  │
│               │                                                     │
│               │  ── TEST RESULTS ────────────────────────────────  │
│               │  ┌─────────────────────────────────────────────────┐│
│               │  │ Parameter    Value    Unit      Range    Flag  ││
│               │  ├─────────────────────────────────────────────────┤│
│               │  │ WBC         [11.5 ]  ×10³/µL  4.0-10.0  ▲ H  ││
│               │  │ RBC         [ 4.8 ]  ×10⁶/µL  4.5-5.5   ─    ││
│               │  │ Hemoglobin  [14.2 ]  g/dL      13.0-17.0 ─    ││
│               │  │ Platelets   [180  ]  ×10³/µL  150-400   ─    ││
│               │  │ Neutrophils [ 78  ]  %          50-70   ▲ H   ││
│               │  └─────────────────────────────────────────────────┘│
│               │                                                     │
│               │  ⚠ DELTA CHECK: WBC ▲45% vs visit 01-Jun-2026      │
│               │  Source: (●Analyzer auto) (○Manual override)        │
│               │                                                     │
│               │  Notes for pathologist: [_________________________] │
│               │                                                     │
│               │  [Save Draft]   [✓ Validate — Send for Sign-off]   │
│               │  [↺ Request Rerun]   [📞 Acknowledge Critical]     │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C9 — Report Sign-off Queue (Pathologist View)
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Reports  >  Pending Sign-off (3)              │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  SIGN-OFF QUEUE          You: Dr. Kavitha (Path.)   │
│               │                                                     │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Patient      Tests       Validated by  Act.  │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Ravi Kumar  CBC, LFT    Priya K.    [Review]│  │
│               │  │ Priya Menon TSH         Suresh M.   [Review]│  │
│               │  │ Arjun Shah  Blood C/S   Ravi S.     [Review]│  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  ── Reviewing: Ravi Kumar — CBC ─────────────────  │
│               │  ┌─────────────────────────────────────────────┐   │
│               │  │  [Lab Letterhead]         DRAFT - NOT FINAL │   │
│               │  │  Patient: Ravi Kumar, 35Y M, 10 Jul 2026    │   │
│               │  │  CBC: WBC 11.5 [H] | RBC 4.8 | Hb 14.2     │   │
│               │  │  Interpretation: [Editable free-text here…] │   │
│               │  │  Clinical notes: [Editable…]                │   │
│               │  └─────────────────────────────────────────────┘   │
│               │  [Edit Notes / Interpretation]                      │
│               │                                                     │
│               │  [✕ Reject → Send Back to Tech]                    │
│               │  Sign-off PIN: [______]  [✍ Sign Off & Finalize]  │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C10 — Report Delivery & Handover
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Reports  >  REP-2026-00142  ✅ Signed        │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  REPORT READY: Ravi Kumar | CBC, LFT, TSH           │
│               │  Signed: Dr. Kavitha G. | 10 Jul 2026, 2:15 PM     │
│               │                                                     │
│               │  ── DELIVER REPORT ──────────────────────────────  │
│               │  [📲 Send via WhatsApp]  ← staff-initiated action   │
│               │  [📨 Send via SMS]                                   │
│               │  [📧 Send via Email]                                 │
│               │                                                     │
│               │  Delivery Status:                                   │
│               │    WhatsApp: 🕐 Pending  SMS: ✅ Delivered 2:20PM  │
│               │    Email:    ✅ Delivered 2:21PM                    │
│               │                                                     │
│               │  ── PRINT ───────────────────────────────────────  │
│               │  Print count: 1 (last: Priya K., 2:18PM)           │
│               │  Copies: [1]    [🖨 Print Report]                   │
│               │  [View Print Log]                                   │
│               │                                                     │
│               │  ── HANDOVER ────────────────────────────────────  │
│               │  Scan accession/report barcode: [_________] [📷]   │
│               │  Handed to (name): [_______________]               │
│               │  [✓ Mark Report Handed Over]                       │
│               │                                                     │
│               │  [↙ Download PDF]   [← Back to Queue]             │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C11 — Day-End Reconciliation
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Day-End Reconciliation                        │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  DAY-END  Thu 10 Jul 2026  Branch: Koramangala      │
│               │  Shift: Morning  |  Staff: Priya K.                 │
│               │                                                     │
│               │  ── COLLECTION SUMMARY ──────────────────────────  │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Mode       Expected    Collected   Variance  │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Cash       ₹32,500    [₹32,500]   ₹0  ✅   │  │
│               │  │ UPI/QR     ₹18,200     ₹18,200    ₹0  ✅   │  │
│               │  │ Card        ₹5,000      ₹5,000    ₹0  ✅   │  │
│               │  │ Credit/Due ₹12,000        —        —        │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Total Cash ₹55,700    [₹55,700]   ₹0  ✅   │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  Today: 47 registrations | 45 orders | 44 reports  │
│               │  Pending: 2 samples not yet reported                │
│               │                                                     │
│               │  Cash in drawer (enter actual): [₹32,500]          │
│               │  Variance: ₹0   ✅ Matched                         │
│               │                                                     │
│               │  [🖨 Print Day Report]    [✓ Close Shift & Submit] │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C12 — Inventory Management
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Inventory                                     │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  INVENTORY    Dept: [▼ All]   [🔍 Search item…]    │
│               │                                                     │
│               │  ⚠ LOW STOCK ALERTS ──────────────────────────    │
│               │  • CBC Kit (Sysmex): 4 tests remaining — Reorder!  │
│               │  • LFT Reagent: 8 tests remaining                  │
│               │  [Raise Purchase Requisition]                       │
│               │                                                     │
│               │  STOCK LEVELS  ───────────────────────────────    │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Item          Type    On Hand  Threshold  Exp│  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ CBC Kit       Kit100   4 ⚠      20      Aug26│  │
│               │  │ LFT Reagent   Kit50    8 ⚠      15      Sep26│  │
│               │  │ TSH Kit       Kit100  45        20      Nov26│  │
│               │  │ EDTA Tubes    Units   320        50      N/A  │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  [+ Receive New Stock]   [Record Manual Issue]     │
│               │  [View Consumption Log]  [Edit Reorder Thresholds] │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN C13 — Master Data — Test Catalog
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Counter  >  Masters                                       │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  (=Tests=)(Panels)(Rate Cards)(Doctors)(B2B)(Depts) │
│               │                                                     │
│               │  [🔍 Search test…]  [+ Add Custom Test]            │
│               │  [Import from NABL Catalogue 📥]                   │
│               │                                                     │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Code  Name              Dept     TAT  Custom │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ CBC   Complete Blood C. Hematol  4hr  No    │  │
│               │  │ LFT   Liver Function   Biochem   6hr  No    │  │
│               │  │ TSH   Thyroid          Biochem   8hr  No    │  │
│               │  │ CS001 Dengue NS1 (cust)Custom    3hr  Yes ★ │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                            [Edit] [Delete]         │
│               │                                                     │
│               │  ── Editing: CBC ─────────────────────────────── │
│               │  Name: [CBC] Method: [Automated] TAT: [4] hrs      │
│               │  Dept: [▼ Hematology]  Specimen: [Blood (EDTA)]    │
│               │  REFERENCE RANGES   [+ Add Range]                  │
│               │  Adult M: 4.0–10.0 ×10³/µL   Critical: <2 or >30  │
│               │                                                     │
│               │  [Cancel]           [Save Changes ✓]              │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

## APP 2 — OWNER / ADMIN PORTAL (Web)
**Users:** Lab Owner, Manager, Accountant, Compliance Officer
**Platform:** Web (full browser, cloud-connected)

---

### SCREEN A1 — Analytics Summary Dashboard
```
┌─────────────────────────────────────────────────────────────────────┐
│  🔬 DiagDesk Admin   [All Branches ▼]  [This Month ▼]  [👤 Owner ▼]│
├───────────────┬─────────────────────────────────────────────────────┤
│  NAVIGATION   │  ANALYTICS SUMMARY               10 Jul 2026        │
│               │                                                     │
│  > Summary    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  > Revenue    │  │Revenue  │ │Collected│ │ Orders  │ │New Pats. │ │
│  > TAT/Ops    │  │  MTD    │ │   MTD   │ │   MTD   │ │   MTD    │ │
│  > QC         │  │ ₹18.2L  │ │ ₹15.4L  │ │  1,247  │ │   342    │ │
│  > Referrals  │  │ ▲12% MoM│ │ ▲8% MoM │ │ ▲15%MoM │ │ ▲9% MoM  │ │
│  > B2B        │  └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
│  > Inventory  │                                                     │
│  > Finance    │  REVENUE TREND (Jul 2026)  ─────────────────────── │
│  > Users      │  ████████████▓▓░░░░░  [Bar chart — daily revenue]  │
│  > Audit      │  Mon Tue Wed Thu Fri Sat Sun                        │
│  > Masters    │                                                     │
│               │  ACTIVE ALERTS (3)  ──────────────────────────── │
│               │  🔴 Revenue ▼8% WoW — Whitefield branch  [Ack]    │
│               │  🟡 Dr. Sharma referrals ▼40% this week   [Ack]   │
│               │  🟢 Report delivery rate: 97.3% ✅                  │
│               │                                                     │
│               │  [📧 Subscribe to Digest]  [📊 Export Summary]    │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A2 — Revenue & Collections
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  Revenue & Collections                           │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  REVENUE ANALYTICS                                  │
│               │  Period: [▼ This Month]  Branch: [▼ All Branches]  │
│               │  Group by: (Day)(Week)(●Month)(Test)(Dept)(Doctor)  │
│               │                                                     │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │           Total      Cash    Credit  Collected│  │
│               │  │ This Mo  ₹18.2L    ₹9.8L   ₹8.4L   ₹15.4L  │  │
│               │  │ Prev Mo  ₹16.2L    ₹8.9L   ₹7.3L   ₹14.0L  │  │
│               │  │ Δ        ▲12.3%    ▲10%    ▲15%    ▲10%     │  │
│               │  └──────────────────────────────────────────────┘  │
│               │  [Trend Chart: line graph by selected period]       │
│               │  ════════════════════════════════════               │
│               │                                                     │
│               │  TOP TESTS BY REVENUE  ─────────────────────────  │
│               │  CBC: ₹1.5L (62)  LFT: ₹2.7L  TSH: ₹1.8L         │
│               │                                                     │
│               │  OUTSTANDING DUES  ────────────────────────────   │
│               │  B2B Credit: ₹2.3L  |  Patient Dues: ₹0.5L        │
│               │  [View Aging Report]                                │
│               │                                                     │
│               │  [🖨 Export PDF]   [📊 Export Excel]              │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A3 — TAT & Operations Dashboard
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  TAT & Operations                                │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  OPERATIONS HEALTH   Branch: [▼ All]  [This Week ▼]│
│               │                                                     │
│               │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│               │  │ Avg TAT  │ │TAT Breach│ │Rejection │ │Produc-│ │
│               │  │ 187 min  │ │  Rate 4% │ │ Rate 4.2%│ │tivity │ │
│               │  │p95: 340m │ │  7 orders│ │18 samples│ │ 48/day│ │
│               │  └──────────┘ └──────────┘ └──────────┘ └───────┘ │
│               │                                                     │
│               │  TAT BY DEPARTMENT  ──────────────────────────── │
│               │  Hematology:  avg 120min  breaches: 2             │
│               │  Biochemistry: avg 210min  breaches: 3            │
│               │  Microbiology: avg 2880min breaches: 2            │
│               │                                                     │
│               │  REJECTION REASONS  ──────────────────────────── │
│               │  Hemolyzed: 9  |  Insufficient vol: 5  |  Other: 4 │
│               │                                                     │
│               │  PRODUCTIVITY  ────────────────────────────────   │
│               │  Suresh M.: 48 samples  |  Ravi K.: 44 samples     │
│               │                                                     │
│               │  [📊 Export Operations Report]                     │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A4 — Referral Analytics
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  Referral Analytics                              │
│  ⚠ Analytics only — No payouts. Anti-kickback compliant.            │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  REFERRAL SOURCE ANALYTICS                          │
│               │  Period: [▼ This Month]  Branch: [▼ All]           │
│               │  Type: (●All)(○Doctor)(○Clinic)(○B2B)              │
│               │                                                     │
│               │  TOP REFERRING SOURCES  ──────────────────────── │
│               │  ┌─────────────────────────────────────────────┐   │
│               │  │ # Doctor/Source     Volume  Rev.Generated Δ │   │
│               │  ├─────────────────────────────────────────────┤   │
│               │  │ 1 Dr. Priya Sharma     84     ₹1.82L  ▼ ⚠│   │
│               │  │ 2 Dr. Suresh Nair      71     ₹1.54L  ▲ ✅│   │
│               │  │ 3 City Clinic           65     ₹1.32L  →   │   │
│               │  │ 4 Dr. Kavitha G.        52     ₹0.98L  ▲ ✅│   │
│               │  └─────────────────────────────────────────────┘   │
│               │                                                     │
│               │  WIN-BACK LIST (declining >20%) ─────────────────  │
│               │  • Dr. Priya Sharma: ▼40% WoW — suggest follow-up  │
│               │  • Apollo Clinic: ▼25% MoM                         │
│               │                                                     │
│               │  Note: "Revenue generated" = revenue from their     │
│               │  referrals. No commissions. No payouts shown.       │
│               │                                                     │
│               │  [📊 Export Referral Report (analytics only)]      │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A5 — B2B Partners Management
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  B2B & Partners                                  │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  (=Partners=)(Invoices)(Aging)(Contracts)(Pro.Svc.) │
│               │                                                     │
│               │  [🔍 Search partner…]   [+ Add Partner]            │
│               │  Filter: [▼ All Types]  [☑ Show Overdue Only]      │
│               │                                                     │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Partner       Type     Credit Limit  O/S Bal │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Apollo Clinic Hospital  ₹1L / ₹85K  ₹85K ⚠ │  │
│               │  │ HealthCo Corp Corporate ₹2L / ₹40K  ₹40K   │  │
│               │  │ City Lab (Ref)Ref.Lab   ₹50K / ₹0   ₹0 ✅  │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  ── Apollo Clinic ─────────────────────────────── │
│               │  Credit Limit: ₹1,00,000   Utilized: ₹85,000 (85%)│
│               │  Billing Cycle: Monthly    Credit Days: 30         │
│               │  Last Payment: 01 Jun 2026  Next Due: 30 Jun ⚠    │
│               │                                                     │
│               │  [View Invoices]   [View Aging]   [Rate Contract]  │
│               │  [Update Credit Limit]   [Send Statement]          │
│               │  [Log Follow-up]         [View Follow-up History]  │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A6 — Receivables Aging
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  B2B & Partners  >  Receivables Aging            │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  RECEIVABLES AGING    As of: 10 Jul 2026            │
│               │  Partner: [▼ All Partners]                          │
│               │                                                     │
│               │  ┌─────────────────────────────────────────────┐   │
│               │  │          0-30d    31-60d   61-90d  >90d Total│   │
│               │  ├─────────────────────────────────────────────┤   │
│               │  │ Amount   ₹1.20L   ₹0.85L  ₹0.52L ₹0.30L ₹2.87L│
│               │  │ %         42%      30%      18%    10%  100% │   │
│               │  └─────────────────────────────────────────────┘   │
│               │  [Aging Bar Chart]                                  │
│               │                                                     │
│               │  PARTNERS WITH OVERDUE ─────────────────────────  │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Partner    O/S Amount  Since     Bucket  Act │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Apollo     ₹85,000    15 Jun    31-60d  [↑] │  │
│               │  │ MedCare    ₹30,000    01 Jun    31-60d  [↑] │  │
│               │  └──────────────────────────────────────────────┘  │
│               │  [↑] = [Log Follow-up Action]                       │
│               │                                                     │
│               │  [📊 Export Aging Report PDF]                      │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A7 — User Management & RBAC
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  User Management                                 │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  USERS   [🔍 Search user…]   [+ Create User]       │
│               │                                                     │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Name         Role          Branch   Status   │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Priya K.    Receptionist  Koramang Active    │  │
│               │  │ Suresh M.   Technician    Koramang Active    │  │
│               │  │ Dr. Kavitha Pathologist   All      Active    │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                   [Edit] [Deactivate]              │
│               │                                                     │
│               │  ── CREATE / EDIT USER ──────────────────────────  │
│               │  Name: [___________]  Email: [_________________]   │
│               │  User Type: (○Non-Fin)(●Financial)(○Admin)(○Owner) │
│               │  Roles: [▼ Receptionist]  Branch: [▼ Koramangala] │
│               │                                                     │
│               │  PERMISSIONS (overrides)  ─────────────────────── │
│               │  ☑ registration.create   ☑ discount.apply          │
│               │  Disc. limit %: [10  ]   ☐ discount.approve        │
│               │  ☑ report.print  ☐ report.signoff  ☑ report.deliver│
│               │  ☑ finance.reports.money_collections               │
│               │  View fin. reports up to: [30] days                │
│               │  ☐ audit.view   ☐ inventory.manage                 │
│               │                                                     │
│               │  [Cancel]                [✓ Create / Save User]   │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A8 — Audit Log Viewer
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  Audit Log                                       │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  AUDIT TRAIL            [🔒 Verify Chain Integrity] │
│               │                                                     │
│               │  FILTERS  ─────────────────────────────────────── │
│               │  Entity: [▼ All]  Action: [▼ All]                  │
│               │  From: [10/07/2026]  To: [10/07/2026]  [Apply]    │
│               │  Patient: [🔍 Search patient UHID or name…]        │
│               │  Actor:   [🔍 Search staff name…]                  │
│               │                                                     │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Time    Actor     Entity    Action    Chain  │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ 10:05  Priya K.  Result    validate  🔒✅  │  │
│               │  │ 10:12  Dr.Kav.   Report    signoff   🔒✅  │  │
│               │  │ 10:15  Priya K.  Report    print     🔒✅  │  │
│               │  │ 09:50  Suresh M. Discount  apply     🔒✅  │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  Chain: ✅ Verified (18,421 events | 06:00 AM)     │
│               │                                                     │
│               │  [🔒 Verify Chain Now]   [📊 Export CSV]          │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

### SCREEN A9 — DPDP & Consent Dashboard
```
┌─────────────────────────────────────────────────────────────────────┐
│  DiagDesk Admin  >  Compliance  >  DPDP & Consent                   │
├───────────────┬─────────────────────────────────────────────────────┤
│               │  DPDP COMPLIANCE                                    │
│               │                                                     │
│               │  CONSENT COVERAGE  ────────────────────────────── │
│               │  Obtained: 1,204 / 1,247 patients (96.6%)           │
│               │  Pending: 43  |  Revoked: 2                        │
│               │  [View Patients without Consent]                    │
│               │                                                     │
│               │  DATA SUBJECT REQUESTS (DSRs)  ─────────────────  │
│               │  Open: 2  |  Completed: 8  |  Overdue: 0           │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Patient   Type     Status      Due Date     │  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Ravi K.  Access   In Progress  15 Jul       │  │
│               │  │ Priya M. Erasure  Received     17 Jul       │  │
│               │  └──────────────────────────────────────────────┘  │
│               │  [+ File New DSR]  [View DSR Detail]               │
│               │                                                     │
│               │  BREACH INCIDENTS  ──────────────────────────── │
│               │  Active: 0   Closed: 1                             │
│               │  [+ Report Breach Incident]                        │
│               │                                                     │
│               │  RETENTION  ────────────────────────────────────  │
│               │  [View Retention Policies]  [Run Retention Sweep]  │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

## APP 3 — PATIENT MOBILE APP
**Users:** Patients
**Platform:** React Native (Expo)

---

### SCREEN P1 — Patient App Home
```
  ┌──────────────────────────────┐
  │  🔬 DiagDesk       [🔔] [👤]│
  ├──────────────────────────────┤
  │                              │
  │  Hello, Ravi! 👋              │
  │  UHID: LAB-00142             │
  │                              │
  │  ┌────────────────────────┐  │
  │  │ NEXT APPOINTMENT       │  │
  │  │ 11 Jul — CBC, LFT      │  │
  │  │ 9:00 AM, Koramangala   │  │
  │  └────────────────────────┘  │
  │                              │
  │  QUICK ACTIONS               │
  │  ┌��───────┐  ┌────────┐      │
  │  │ 📋     │  │ 📅     │      │
  │  │ My     │  │ Book   │      │
  │  │Reports │  │  Test  │      │
  │  └────────┘  └────────┘      │
  │  ┌────────┐  ┌────────┐      │
  │  │ 💳     │  │ 🏠     │      │
  │  │ Pay    │  │ Home   │      │
  │  │ Bill   │  │ Coll.  │      │
  │  └────────┘  └────────┘      │
  │                              │
  │  RECENT REPORTS (2 ready)    │
  │  • CBC — 10 Jul 2026  [View] │
  │  • LFT — 05 Jul 2026  [View] │
  └──────────────────────────────┘
```

---

### SCREEN P2 — Patient Report Access
```
  ┌──────────────────────────────┐
  │  ← My Reports   [↗ Share]   │
  ├──────────────────────────────┤
  │  CBC Report                  │
  │  10 Jul 2026                 │
  │  Dr. Kavitha G. ✍ (Signed)  │
  │                              │
  │  🔒 Secure Access            │
  │  OTP sent to +91-98765…     │
  │  Enter OTP: [______] [Verify]│
  │                              │
  │  ──── REPORT ────────────── │
  │  [Lab Letterhead]            │
  │                              │
  │  Patient: Ravi Kumar, 35M    │
  │  WBC: 11.5 [H] ×10³/µL      │
  │  Normal: 4.0–10.0            │
  │  (full report rendered)      │
  │                              │
  │  [↓ Download PDF]            │
  │  [📲 Share via WhatsApp]     │
  │                              │
  │  🔒 Access is audit-logged.  │
  └──────────────────────────────┘
```

---

## APP 4 — DOCTOR / B2B PORTAL (Web)
**Users:** Referring Doctors, B2B Partner Staff
**Platform:** Web

---

### SCREEN D1 — Doctor Portal Dashboard
```
┌─────────────────────────────────────────────────────────────────────┐
│  🔬 DiagDesk Partner Portal   Dr. Priya Sharma   [🔔] [👤]         │
├───────────────┬─────────────────────────────────────────────────────┤
│  NAVIGATION   │  MY PATIENTS — REPORT STATUS                        │
│               │                                                     │
│  > Reports    │  [🔍 Search patient name / UHID…]                  │
│  > My Account │                                                     │
│  > Activity   │  ┌──────────────────────────────────────────────┐  │
│               │  │ Patient     Tests         Date    Status  Act│  │
│               │  ├──────────────────────────────────────────────┤  │
│               │  │ Ravi Kumar CBC, LFT, TSH 10 Jul  Ready  [↗]│  │
│               │  │ Amit Patel TSH, FBS      09 Jul  Pending — │  │
│               │  │ Suma Rao  Lipid Profile  08 Jul  Ready  [↗]│  │
│               │  └──────────────────────────────────────────────┘  │
│               │  [↗] = View & Download Report                       │
│               │                                                     │
│               │  B2B ACCOUNT  ────────────────────────────────── │
│               │  Partner: Apollo Clinic                             │
│               │  Outstanding: ₹85,000  |  Credit Used: 85%         │
│               │  [View Account Statement]   [View Invoices]        │
│               │                                                     │
│               │  MY REFERRAL ACTIVITY (This Month)  ────────────  │
│               │  Patients Referred: 84                              │
│               │  Revenue Generated for Lab: ₹1.82L                 │
│               │  (Analytics only — no commissions)                  │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

---

# PART 3 — PAGE-BY-PAGE API MAPPING

**Format per screen:** Screen name → each interactive element → HTTP Method + Service + Endpoint called.
Services: MPI=Patient, CAT=Catalog, ORD=Order, DEV=Device Gateway, RES=Result, REP=Reporting, MIS=Analytics, NOTIF=Notification, AUD=Audit, B2B=B2B Partner Billing. Identity/Auth calls go to Keycloak (outside the 10 services).

---

### C1 — LOGIN

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Click **Sign In** (email+password) | Button | POST | Keycloak | `/auth/realms/diagdesk/protocol/openid-connect/token` |
| Click **Send OTP to Email** | Button | POST | Keycloak | `/auth/realms/diagdesk/protocol/openid-connect/token` (OTP flow) |
| Click **Verify OTP** | Button | POST | Keycloak | OTP validation — custom Keycloak authenticator |
| Click **Authenticator App** | Button | — | Browser | WebAuthn / TOTP client-side flow → Keycloak |
| Click **Use Biometric / Passkey** | Button | — | Browser | `navigator.credentials.get()` → Keycloak WebAuthn |
| Page load (check offline token) | Auto | — | LocalStorage | Validate cached JWT expiry; queue refresh if needed |

---

### C2 — COUNTER DASHBOARD

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — KPI cards | Auto | GET | MIS | `/v1/analytics/summary?branch_id=X&date=today` |
| Page load — live alerts | Auto | GET | MIS | `/v1/analytics/alerts` |
| Page load — critical values | Auto | GET | RES | `/v1/results/critical-alerts` |
| Click **New Patient** | Button | — | — | Navigate to C3 (Patient Search) |
| Click **Walk-in Order** | Button | — | — | Navigate to C3 (Patient Search) |
| Click **Scan Sample** | Button | — | — | Navigate to C6 (Sample Collection) |
| Click **Enter Results** | Button | — | — | Navigate to C7 (Worklist) |
| Click **Reports Queue** | Button | — | — | Navigate to C9 (Sign-off Queue) |
| Click **Day-End** | Button | — | — | Navigate to C11 (Day-End) |
| Click alert row | Click | — | — | Navigate to relevant screen |
| **Acknowledge Critical** alert | Button | POST | RES | `/v1/results/{result_id}/acknowledge-critical` |
| Auto-refresh (every 60s) | Timer | GET | MIS | `/v1/analytics/summary` |

---

### C3 — PATIENT SEARCH

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Type in search box (debounced 300ms) | Keystroke | GET | MPI | `/v1/patients?q={term}&branch_id=X` |
| Click **Search** button | Button | GET | MPI | `/v1/patients?q={term}` |
| Click patient row | Click | GET | MPI | `/v1/patients/{patient_id}` |
| Click **Register New Patient** | Button | — | — | Navigate to C4 (Registration Form) |

---

### C4 — PATIENT REGISTRATION FORM

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Type name / phone | Keystroke | — | — | Local state only (no API until submit) |
| Click **Check Duplicates** | Button | POST | MPI | `/v1/patients/dedup-check` |
| Type in **Referring Doctor** search | Keystroke | GET | CAT | `/v1/referring-doctors?q={term}` |
| Click **View Match** (duplicate warning) | Button | GET | MPI | `/v1/patients/{matched_id}` |
| Click **Save & Create Order** | Button | POST | MPI | `/v1/patients` (creates patient) |
| — consent checked → | Auto (after save) | POST | AUD | `/v1/consents` (with patient_id from above) |
| → navigate | Auto | — | — | Navigate to C5 (Order Entry) |

---

### C5 — ORDER ENTRY & BILLING

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load (existing patient) | Auto | GET | MPI | `/v1/patients/{patient_id}` |
| Type in **test search** box | Keystroke | GET | CAT | `/v1/tests?q={term}` (debounced) |
| Select a test → price auto-fill | Auto | POST | CAT | `/v1/rate-cards/resolve` |
| Type in **panel search** | Keystroke | GET | CAT | `/v1/panels?q={term}` |
| Select panel → expand + price | Auto | POST | CAT | `/v1/rate-cards/resolve` (for each test in panel) |
| Select **B2B Partner** | Dropdown | POST | CAT | `/v1/rate-cards/resolve` (re-resolve with partner_id) |
| Type **doctor name** | Keystroke | GET | CAT | `/v1/referring-doctors?q={term}` |
| Enter **discount %** | Input | — | — | Local OPA policy check (no API; validated on submit) |
| Click **Request Approval** (above limit) | Button | POST | Identity | `/v1/approvals/discount` (Billing svc) |
| Click **Save Draft** | Button | POST | ORD | `/v1/orders` (status: draft) |
| Click **Generate Invoice & Print** | Button | POST | ORD | `/v1/orders` (creates order + accessions + invoice) |
| → payment recorded | Auto | POST | Billing | `/v1/invoices/{id}/payments` |
| → navigate | Auto | — | — | Navigate to C6 (Invoice Confirmed) |

---

### C6 — INVOICE CONFIRMED + SAMPLE ACCESSION

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | ORD | `/v1/orders/{order_id}` |
| Click **Print Label** (per sample) | Button | GET | ORD | `/v1/samples/{accession_id}/label` → PDF |
| Click **Print All Labels** | Button | GET | ORD | `/v1/samples/{accession_id}/label` × N (parallel) |
| Click **Print Receipt** | Button | GET | Billing | `/v1/invoices/{invoice_id}/pdf` |
| Scan barcode (accession) | Scan/Input | — | — | Auto-populate accession field (local lookup) |
| Click **Mark Collected** | Button | PATCH | ORD | `/v1/samples/{accession_id}/status` `{status:"collected"}` |
| Click **Reject Sample** | Button | POST | ORD | `/v1/samples/{accession_id}/reject` |
| Click **New Walk-in** | Button | — | — | Navigate to C3 |

---

### C7 — ANALYZER WORKLIST

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — worklist | Auto | GET | ORD | `/v1/worklist?branch_id=X&date=today` |
| Page load — connections | Auto | GET | DEV | `/v1/device-connections` |
| Page load — connection status | Auto | GET | DEV | `/v1/device-connections/{id}/status` (per analyzer) |
| Click **Reconnect** (offline analyzer) | Button | PATCH | DEV | `/v1/device-connections/{id}/reconnect` |
| Click **Push Worklist → Analyzer** | Button | POST | DEV | `/v1/worklist-download/{connection_id}` |
| Click **Review Unmatched Results** | Button | GET | DEV | `/v1/unmatched-results` |
| Click **Match** (unmatched result) | Button | POST | DEV | `/v1/unmatched-results/{message_id}/match` |
| Click **Enter Manual Result** | Button | — | — | Navigate to C8 (Result Entry) |
| Auto-refresh worklist (every 30s) | Timer | GET | ORD | `/v1/worklist?branch_id=X` |

---

### C8 — RESULT ENTRY (Technician)

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | RES | `/v1/results?accession_id={id}` |
| Page load — delta check | Auto | GET | RES | `/v1/results/{result_id}/delta-check` |
| Type result value | Keystroke | — | — | Local state; ref range flag computed client-side |
| Click **Save Draft** | Button | POST | RES | `/v1/results` (new) OR PUT `/v1/results/{id}` (amend) |
| Click **Validate — Send for Sign-off** | Button | POST | RES | `/v1/results/{result_id}/validate` |
| Click **Request Rerun** | Button | POST | RES | `/v1/results/{result_id}/repeat-request` |
| Click **Acknowledge Critical** | Button | POST | RES | `/v1/results/{result_id}/acknowledge-critical` |

---

### C9 — REPORT SIGN-OFF QUEUE (Pathologist)

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — queue | Auto | GET | RES | `/v1/results/pending-validation?level=2` |
| Click **Review** (open a report) | Button | GET | REP | `/v1/reports/generate` (if not yet generated) OR `/v1/reports/{id}/preview` |
| Preview renders | Auto | GET | REP | `/v1/reports/{report_id}/preview` → PDF iframe |
| Edit interpretation / notes | Input | PATCH | REP | `/v1/reports/{report_id}` (debounced auto-save) |
| Click **Reject → Send Back** | Button | POST | RES | `/v1/results/{result_id}/reject-validation` |
| Enter PIN + Click **Sign Off & Finalize** | Button | POST | REP | `/v1/reports/{report_id}/signoff` |
| → notification triggered | Auto (event) | Kafka | REP→NOTIF | `ReportReady` event → Notification service queues alert |

---

### C10 — REPORT DELIVERY & HANDOVER

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | REP | `/v1/reports/{report_id}` |
| Page load — delivery status | Auto | GET | REP | `/v1/reports/{report_id}/delivery-status` |
| Click **Send via WhatsApp** | Button | POST | REP | `/v1/reports/{report_id}/deliver` `{channels:["whatsapp"]}` |
| Click **Send via SMS** | Button | POST | REP | `/v1/reports/{report_id}/deliver` `{channels:["sms"]}` |
| Click **Send via Email** | Button | POST | REP | `/v1/reports/{report_id}/deliver` `{channels:["email"]}` |
| Poll delivery status (every 10s) | Timer | GET | REP | `/v1/reports/{report_id}/delivery-status` |
| Click **Print Report** | Button | POST | REP | `/v1/reports/{report_id}/print` (logs it, increments count) |
| → PDF opens in browser | Auto | GET | REP | `/v1/reports/{report_id}/pdf` |
| Click **View Print Log** | Button | GET | REP | `/v1/reports/{report_id}/print-log` |
| Scan barcode (handover) | Scan | — | — | Local lookup to resolve accession |
| Click **Mark Handed Over** | Button | PATCH | ORD | `/v1/samples/{accession_id}/handover` |
| Click **Download PDF** | Button | GET | REP | `/v1/reports/{report_id}/pdf` |

---

### C11 — DAY-END RECONCILIATION

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | MIS | `/v1/analytics/summary?date=today&branch_id=X` |
| Page load — collection detail | Auto | GET | Billing | `/v1/billing/day-summary?date=today&branch_id=X` |
| Enter **actual cash in drawer** | Input | — | — | Local state |
| Click **Print Day Report** | Button | GET | Billing | `/v1/billing/day-summary?format=pdf` |
| Click **Close Shift & Submit** | Button | POST | Billing | `/v1/billing/shift-close` |

---

### C12 — INVENTORY MANAGEMENT

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — stock levels | Auto | GET | MIS | `/v1/analytics/inventory` (for alerts) |
| Page load — full stock list | Auto | GET | Inventory | `/v1/inventory/items?branch_id=X` |
| Click **Raise Purchase Requisition** | Button | POST | Inventory | `/v1/inventory/purchase-requisitions` |
| Click **Receive New Stock** | Button | POST | Inventory | `/v1/inventory/receipts` |
| Click **Record Manual Issue** | Button | POST | Inventory | `/v1/inventory/issues` |
| Click **View Consumption Log** | Button | GET | Inventory | `/v1/inventory/consumption-log` |
| Click **Edit Reorder Thresholds** | Button | PUT | Inventory | `/v1/inventory/items/{item_id}` |

---

### C13 — MASTER DATA (TESTS)

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | CAT | `/v1/tests?page=0&size=20` |
| Type in **search test** | Keystroke | GET | CAT | `/v1/tests?q={term}` |
| Click **Import from NABL Catalogue** | Button | GET | CAT | `/v1/nabl-catalogue` (opens browse modal) |
| Search within NABL modal | Keystroke | GET | CAT | `/v1/nabl-catalogue?q={term}&category={c}` |
| Click **Import Selected** (NABL modal) | Button | POST | CAT | `/v1/tests/import-from-nabl` |
| Click **Add Custom Test** | Button | — | — | Open inline form |
| Click **Save** (new custom test) | Button | POST | CAT | `/v1/tests` |
| Click **Edit** on test row | Click | GET | CAT | `/v1/tests/{test_id}` + `/v1/tests/{test_id}/reference-ranges` |
| Click **Save Changes** (edit form) | Button | PUT | CAT | `/v1/tests/{test_id}` |
| Click **Add Range** | Button | POST | CAT | `/v1/tests/{test_id}/reference-ranges` |
| Click **Delete** test | Click | DELETE | CAT | `/v1/tests/{test_id}` |
| Switch to **Panels** tab | Click | GET | CAT | `/v1/panels` |
| Switch to **Rate Cards** tab | Click | GET | CAT | `/v1/rate-cards` |
| Switch to **Doctors** tab | Click | GET | CAT | `/v1/referring-doctors` |
| Switch to **Departments** tab | Click | GET | CAT | `/v1/departments` |

---

### A1 — ANALYTICS SUMMARY DASHBOARD

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — KPIs | Auto | GET | MIS | `/v1/analytics/summary` |
| Page load — alerts | Auto | GET | MIS | `/v1/analytics/alerts` |
| Change **Branch** filter | Dropdown | GET | MIS | `/v1/analytics/summary?branch_id={id}` |
| Change **Period** filter | Dropdown | GET | MIS | `/v1/analytics/summary?period={p}` |
| Click **Acknowledge** alert | Button | POST | MIS | `/v1/analytics/alerts/{alert_id}/acknowledge` |
| Click **Subscribe to Digest** | Button | POST | MIS | `/v1/analytics/digests` |
| Click **Export Summary** | Button | GET | MIS | `/v1/analytics/summary?format=pdf` |
| Click **Revenue** card / nav | Click | — | — | Navigate to A2 |
| Click **TAT Breach** card | Click | — | — | Navigate to A3 |
| Auto-refresh (every 5 min) | Timer | GET | MIS | `/v1/analytics/summary` |

---

### A2 — REVENUE & COLLECTIONS

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | MIS | `/v1/analytics/revenue` |
| Change **Period** | Dropdown | GET | MIS | `/v1/analytics/revenue?period={p}` |
| Change **Branch** | Dropdown | GET | MIS | `/v1/analytics/revenue?branch_id={id}` |
| Change **Group by** | Radio | GET | MIS | `/v1/analytics/revenue?group_by={g}` |
| Click **View Aging Report** | Link | GET | B2B | `/v1/b2b-receivables/aging` |
| Click **Export PDF** | Button | GET | MIS | `/v1/analytics/revenue?format=pdf` |
| Click **Export Excel** | Button | GET | MIS | `/v1/analytics/revenue?format=excel` |

---

### A3 — TAT & OPERATIONS

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | MIS | `/v1/analytics/tat` + `/v1/analytics/operations` + `/v1/analytics/samples` |
| Change Branch / Period filters | Dropdown | GET | MIS | `/v1/analytics/tat?branch_id=X&period=P` |
| Click **Export Operations Report** | Button | GET | MIS | `/v1/analytics/operations?format=pdf` |

---

### A4 — REFERRAL ANALYTICS

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | MIS | `/v1/analytics/referrals` |
| Change period / branch | Dropdown | GET | MIS | `/v1/analytics/referrals?period={p}&branch_id={id}` |
| Change source type filter | Radio | GET | MIS | `/v1/analytics/referrals?source_type={t}` |
| Click **Export Referral Report** | Button | GET | B2B | `/v1/referral-analytics?format=pdf` |

---

### A5 — B2B PARTNERS MANAGEMENT

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — partners list | Auto | GET | B2B | `/v1/b2b-partners` |
| Type in **search** box | Keystroke | GET | B2B | `/v1/b2b-partners?q={term}` |
| Toggle **Show Overdue Only** | Checkbox | GET | B2B | `/v1/b2b-partners?has_overdue=true` |
| Click **Add Partner** | Button | — | — | Open inline form |
| Click **Save** (new partner form) | Button | POST | B2B | `/v1/b2b-partners` |
| Click partner row to expand | Click | GET | B2B | `/v1/b2b-partners/{partner_id}` |
| Click **View Invoices** | Button | GET | B2B | `/v1/b2b-invoices?partner_id={id}` |
| Click **View Aging** | Button | GET | B2B | `/v1/b2b-receivables/aging?partner_id={id}` |
| Click **Rate Contract** | Button | GET | B2B | `/v1/b2b-rate-contracts?partner_id={id}` |
| Click **Update Credit Limit** | Button | PATCH | B2B | `/v1/b2b-credit-limits/{partner_id}` |
| Click **Send Statement** | Button | GET | B2B | `/v1/b2b-account-statements/{partner_id}` |
| Click **Log Follow-up** | Button | POST | B2B | `/v1/b2b-receivables/follow-up` |
| Click **View Follow-up History** | Button | GET | B2B | `/v1/b2b-receivables/follow-ups?partner_id={id}` |

---

### A6 — RECEIVABLES AGING

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | B2B | `/v1/b2b-receivables/aging` |
| Change **Partner** filter | Dropdown | GET | B2B | `/v1/b2b-receivables/aging?partner_id={id}` |
| Change **as_of_date** | Date picker | GET | B2B | `/v1/b2b-receivables/aging?as_of_date={d}` |
| Click **Log Follow-up** [↑] | Button | POST | B2B | `/v1/b2b-receivables/follow-up` |
| Click **Export Aging Report** | Button | GET | B2B | `/v1/b2b-receivables/aging?format=pdf` |

---

### A7 — USER MANAGEMENT & RBAC

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — users list | Auto | GET | Identity | `/v1/users` (Identity/IAM service) |
| Type in **user search** | Keystroke | GET | Identity | `/v1/users?q={term}` |
| Click **Create User** | Button | — | — | Open create form |
| Permission toggles / limit fields | Input | — | — | Local state until submit |
| Click **Create / Save User** | Button | POST | Identity | `/v1/users` (with permissions payload) |
| Click **Edit** user row | Click | GET | Identity | `/v1/users/{user_id}` + `/v1/users/{user_id}/permissions` |
| Click **Save** (edit form) | Button | PUT | Identity | `/v1/users/{user_id}` + `/v1/users/{user_id}/permissions` |
| Click **Deactivate** | Button | PATCH | Identity | `/v1/users/{user_id}/deactivate` |

---

### A8 — AUDIT LOG VIEWER

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | AUD | `/v1/audit-events?from=today&to=today` |
| Apply entity / action / date filters | Button | GET | AUD | `/v1/audit-events?entity_type=X&action=Y&from=D1&to=D2` |
| Search by **patient** | Input | GET | AUD | `/v1/audit-events/patient/{patient_id}` |
| Click **Verify Chain Now** | Button | POST | AUD | `/v1/audit/verify-chain` |
| Click **Export CSV** | Button | GET | AUD | `/v1/audit-events?format=csv` (paginated export) |

---

### A9 — DPDP & CONSENT DASHBOARD

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | GET | AUD | `/v1/consents` (summary counts) |
| Page load — DSRs | Auto | GET | AUD | `/v1/data-subject-requests` |
| Page load — breaches | Auto | GET | AUD | `/v1/breach-notifications` |
| Click **View DSR Detail** | Button | GET | AUD | `/v1/data-subject-requests/{dsr_id}` |
| Click **File New DSR** | Button | POST | AUD | `/v1/data-subject-requests` |
| Click **Report Breach Incident** | Button | POST | AUD | `/v1/breach-notifications` |
| Click **View Retention Policies** | Button | GET | AUD | `/v1/retention/policies` |
| Click **Run Retention Sweep** | Button | POST | AUD | `/v1/retention/run` |

---

### P1 — PATIENT APP HOME

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — patient profile | Auto | GET | MPI | `/v1/patients/{patient_id}` |
| Page load — upcoming appointment | Auto | GET | ORD | `/v1/orders?patient_id={id}&status=active` |
| Page load — recent reports | Auto | GET | REP | `/v1/reports?patient_id={id}&limit=5` |
| Click **My Reports** | Button | — | — | Navigate to reports list |
| Click **Book Test** | Button | — | — | Navigate to booking flow (V1) |
| Click **Pay Bill** | Button | — | — | Navigate to payment (Razorpay/UPI link) |
| Click **Home Collection** | Button | — | — | Navigate to home-collection booking (V1) |
| Click report row **[View]** | Click | — | — | Navigate to P2 (Report Access) |

---

### P2 — PATIENT REPORT ACCESS

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load | Auto | POST | NOTIF | Triggers OTP send via `/v1/notifications/send` |
| Enter OTP + Click **Verify** | Button | POST | REP | `/v1/report-access/verify-otp` (secure token issued) |
| Report renders (post-OTP) | Auto | GET | REP | `/v1/reports/{report_id}/pdf` |
| Click **Download PDF** | Button | GET | REP | `/v1/reports/{report_id}/pdf` |
| Click **Share via WhatsApp** | Button | — | Browser | `navigator.share()` (native device share) |

---

### D1 — DOCTOR / B2B PORTAL

| UI Action | Trigger | Method | Service | Endpoint |
|---|---|---|---|---|
| Page load — patient list | Auto | GET | REP | `/v1/reports?referred_by_doctor_id={id}` (via B2B BFF) |
| Search by patient | Input | GET | REP | `/v1/reports?referred_by_doctor_id={id}&patient_q={term}` |
| Click **View Report** [↗] | Button | GET | REP | `/v1/reports/{report_id}/pdf` |
| Page load — B2B account summary | Auto | GET | B2B | `/v1/b2b-partners/{partner_id}` + `/v1/b2b-credit-limits` |
| Click **View Account Statement** | Button | GET | B2B | `/v1/b2b-account-statements/{partner_id}` |
| Click **View Invoices** | Button | GET | B2B | `/v1/b2b-invoices?partner_id={id}` |
| Page load — referral activity | Auto | GET | B2B | `/v1/referral-analytics?source_id={doctor_id}` |

---

## COMPLETE API INVOCATION MATRIX (quick reference)

| Endpoint | Invoked on Screen | Trigger |
|---|---|---|
| `POST /v1/patients` | C4 | "Save & Create Order" button |
| `POST /v1/patients/dedup-check` | C4 | "Check Duplicates" button |
| `GET /v1/patients?q=` | C3, D1 | Search box keystroke |
| `GET /v1/patients/{id}` | C3 (row click), C5 (page load), P1 | Various |
| `POST /v1/patients/{id}/consent` | C4 | After patient save, if consent checked |
| `GET /v1/tests?q=` | C5, C13 | Test search box |
| `POST /v1/tests` | C13 | "Save" on new custom test form |
| `PUT /v1/tests/{id}` | C13 | "Save Changes" on edit form |
| `DELETE /v1/tests/{id}` | C13 | "Delete" on test row |
| `GET /v1/nabl-catalogue` | C13 | "Import from NABL Catalogue" button |
| `POST /v1/tests/import-from-nabl` | C13 | "Import Selected" in NABL modal |
| `POST /v1/tests/{id}/reference-ranges` | C13 | "Add Range" button |
| `GET /v1/panels` | C13 | Panels tab click |
| `POST /v1/panels` | C13 | "Save" on new panel form |
| `GET /v1/rate-cards` | C13 | Rate Cards tab click |
| `POST /v1/rate-cards/resolve` | C5 | Test/panel selection, partner selection |
| `GET /v1/departments` | C13 | Departments tab click |
| `POST /v1/orders` | C5 | "Generate Invoice & Print" button |
| `GET /v1/orders/{id}` | C6 | Page load (post order create) |
| `GET /v1/orders?patient_id=` | P1 | Patient app home load |
| `PATCH /v1/orders/{id}/cancel` | C5 | "Cancel Order" action |
| `POST /v1/samples` | C6 | On order creation (auto) |
| `GET /v1/samples/{id}/label` | C6 | "Print Label" button |
| `PATCH /v1/samples/{id}/status` | C6 | "Mark Collected" button |
| `POST /v1/samples/{id}/reject` | C6 | "Reject Sample" button |
| `PATCH /v1/samples/{id}/handover` | C10 | "Mark Handed Over" button |
| `GET /v1/worklist` | C7 | Page load |
| `GET /v1/device-connections` | C7 | Page load |
| `GET /v1/device-connections/{id}/status` | C7 | Page load + poll |
| `PATCH /v1/device-connections/{id}/reconnect` | C7 | "Reconnect" button |
| `POST /v1/worklist-download/{id}` | C7 | "Push Worklist → Analyzer" button |
| `GET /v1/unmatched-results` | C7 | "Review Unmatched" button |
| `POST /v1/unmatched-results/{id}/match` | C7 | "Match" button (per unmatched row) |
| `GET /v1/results?accession_id=` | C8 | Page load |
| `GET /v1/results/{id}/delta-check` | C8 | Page load (auto) |
| `POST /v1/results` | C8 | "Save Draft" (new) |
| `PUT /v1/results/{id}` | C8 | "Save Draft" (amend) |
| `POST /v1/results/{id}/validate` | C8 | "Validate — Send for Sign-off" button |
| `POST /v1/results/{id}/repeat-request` | C8 | "Request Rerun" button |
| `POST /v1/results/{id}/acknowledge-critical` | C2, C8 | "Acknowledge Critical" button |
| `GET /v1/results/pending-validation` | C9 | Page load (sign-off queue) |
| `GET /v1/results/critical-alerts` | C2 | Dashboard load |
| `POST /v1/results/{id}/reject-validation` | C9 | "Reject → Send Back" button |
| `POST /v1/reports/generate` | C9 | "Review" button (if report not yet generated) |
| `GET /v1/reports/{id}/preview` | C9 | Report preview render |
| `PATCH /v1/reports/{id}` | C9 | Inline note editing (auto-save) |
| `POST /v1/reports/{id}/signoff` | C9 | "Sign Off & Finalize" button |
| `GET /v1/reports/{id}` | C10 | Page load |
| `POST /v1/reports/{id}/deliver` | C10 | "Send via WhatsApp/SMS/Email" buttons |
| `GET /v1/reports/{id}/delivery-status` | C10 | Poll every 10s |
| `POST /v1/reports/{id}/print` | C10 | "Print Report" button |
| `GET /v1/reports/{id}/pdf` | C10, P2, D1 | "Download PDF" button |
| `GET /v1/reports/{id}/print-log` | C10 | "View Print Log" link |
| `GET /v1/analytics/summary` | C2, A1 | Dashboard load + 60s poll |
| `GET /v1/analytics/revenue` | A2 | Page load + filter change |
| `GET /v1/analytics/tat` | A3 | Page load |
| `GET /v1/analytics/samples` | A3 | Page load |
| `GET /v1/analytics/operations` | A3 | Page load |
| `GET /v1/analytics/referrals` | A4 | Page load |
| `GET /v1/analytics/alerts` | A1, C2 | Dashboard load |
| `POST /v1/analytics/alerts/{id}/acknowledge` | A1 | "Acknowledge" button on alert |
| `POST /v1/analytics/digests` | A1 | "Subscribe to Digest" button |
| `GET /v1/analytics/inventory` | C12 | Low-stock alerts on load |
| `GET /v1/b2b-partners` | A5 | Page load |
| `POST /v1/b2b-partners` | A5 | "Save" on new partner form |
| `GET /v1/b2b-partners/{id}` | A5 | Partner row expand click |
| `PATCH /v1/b2b-credit-limits/{id}` | A5 | "Update Credit Limit" button |
| `GET /v1/b2b-invoices?partner_id=` | A5, D1 | "View Invoices" button |
| `POST /v1/b2b-invoices/{id}/record-payment` | A5 | "Record Payment" button (invoice detail) |
| `GET /v1/b2b-receivables/aging` | A5, A6 | "View Aging" + page load |
| `POST /v1/b2b-receivables/follow-up` | A5, A6 | "Log Follow-up" button |
| `GET /v1/b2b-account-statements/{id}` | A5, D1 | "Send Statement" / "View Statement" |
| `GET /v1/referral-analytics` | A4, D1 | Page load |
| `POST /v1/audit-events` | All screens | Internal (gRPC) — not REST; auto-fired on every state change |
| `GET /v1/audit-events` | A8 | Page load + filter |
| `GET /v1/audit-events/patient/{id}` | A8 | Patient-specific filter |
| `POST /v1/audit/verify-chain` | A8 | "Verify Chain Now" button |
| `POST /v1/consents` | C4 | After patient registration (consent checked) |
| `GET /v1/consents/patient/{id}` | A9 | Patient consent view |
| `POST /v1/consents/{id}/revoke` | A9 | "Revoke Consent" button |
| `POST /v1/data-subject-requests` | A9 | "File New DSR" button |
| `GET /v1/data-subject-requests` | A9 | Page load |
| `POST /v1/breach-notifications` | A9 | "Report Breach Incident" button |
| `GET /v1/retention/policies` | A9 | "View Retention Policies" button |
| `POST /v1/retention/run` | A9 | "Run Retention Sweep" button |
