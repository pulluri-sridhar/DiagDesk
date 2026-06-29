# MediCircle — Data Model (Schema & Relationships)

*Platform-wide PostgreSQL schema for the five-sided **MediCircle** program (**Diagnostic Centers ·
Doctors/Hospitals · Pharmacies · On-Demand Home-Care · Patients**). DiagDesk is the **lab node**, built deepest;
its [data-model](../design/data-model.md) is the format/depth reference for this doc. Tables are **owned by the
service** that manages them (database-per-service for lab-node services, modules sharing a logical DB in the
connective layer — see [microservices.md](microservices.md)) and grouped here for one coherent view. This is the
prior MediCircle DB design brought to DiagDesk depth and **reconciled** with the locked decisions in
[medicircle-reconciliation.md](../medicircle-reconciliation.md) — most importantly, the **commission engine is
removed** (see Compliance note).*

> **Reconciled in:** integer-paise money · UUIDv7 PKs · Keycloak OIDC · transactional outbox · org-scoped RLS ·
> DPDP consent-first · ABDM/ABHA + FHIR R4 · provider-agnostic managed hosting, India-region · **no commission/payout-for-referral tables**.

### Conventions
- **PK:** `id uuid` (**UUIDv7** — time-sortable, edge/append-safe). FKs are `*_id`. Tables are **snake_case,
  plural**. Enums via Postgres `CREATE TYPE`.
- **Money:** **integer paise** (`bigint`) everywhere, with `currency char(3) DEFAULT 'INR'`. **Never** floats or
  `numeric` for money — the prior MediCircle `numeric` commission/price columns are normalised to paise here.
- **Timestamps:** `timestamptz`; `created_at`/`updated_at` on every table; **soft delete** via
  `deleted_at timestamptz null` where rows are user/clinical data.
- **Tenancy & RLS:** org-owned rows carry `diagnostic_center_id` / `pharmacy_id` / `hospital_id` (or a generic
  `org_type`+`org_id`) as the scoping key; **Row-Level Security** policies filter on the verified Keycloak JWT
  org claim. The lab node additionally carries `branch_id` for edge scoping.
- **Async:** every state change that drives a side-effect writes a row to **`outbox_event`** in the same
  transaction (the relay publishes to Kafka). Write idempotency is guarded by **`idempotency_key`**.
- **Flexible/interop payloads:** JSONB for device/AI/FHIR/audit blobs; **FHIR R4** resources cached in
  `fhir_resources`; `pgvector` for AI retrieval embeddings; `pg_trgm` GIN indexes for name search.
- **Indexes:** every FK + common lookups; org-scoped tables lead with the scoping column to align with RLS and
  (lab node) Citus sharding / monthly RANGE partitioning of append-heavy tables (`sample_events`, `result_values`,
  `payments`, `notifications`, `audit_logs`, `outbox_event`).
- **Compliance (critical):** there are **no commission/payout-for-referral tables or columns** anywhere — the prior
  `commission_agreements`, `commission_rules`, `commission_ledger`, and per-referral `payouts`/order
  `commission_*` columns are **dropped**. `doctor_lab_associations` are analytics/relationship links carrying **no
  money owed**. The only lawful money-to-a-professional path is **`professional_service_contracts`** on a
  **`fixed`/`per_service`** basis (never `per_referral`) settled through **`service_engagements`** that reference a
  service actually rendered. See the Compliance note at the end.

### Entity-relationship diagram
![MediCircle ERD](diagrams/medicircle-erd.png)

*Mermaid source: [`diagrams/medicircle-erd.mmd`](diagrams/medicircle-erd.mmd) (≈55 core tables).*

---

## Relationships (FK summary)
- `users` 1—1 `patients` / `doctors` / `care_professionals`; `users` 1—* `org_staff`, `sessions`, `kyc_documents`,
  `credentials`, `user_roles`, `device_tokens`, `notifications`
- `roles` *—* `permissions` via `role_permission`; `users` *—* `roles` via `user_roles` (org-scoped); `users` 1—*
  `user_permission` (per-user override) → `permissions`
- `diagnostic_centers` / `pharmacies` / `hospitals` 1—* `branches`, `org_staff`; `diagnostic_centers` 1—* `tests`,
  `health_packages`, `rate_cards`, `patient_lab_links`, `doctor_lab_associations`
- `patients` 1—* `patient_links` (MPI cross-org linkage), `consents`, `consultations`, `test_orders`,
  `medicine_orders`, `home_visit_bookings`, `insurance_leads`; `patients` 1—0..1 `abha_links`
- `consents` 1—* `consents` (revocation chain); `patients` 1—* `fhir_resources`
- `tests` 1—* `test_parameters` / `reference_ranges`; `test_panels` *—* `tests` via `test_panel_items`;
  `health_packages` *—* `tests` via `health_package_tests`; `rate_cards` 1—* `rate_card_items` → `tests`
- `medicines` *—1 `medicine_compositions`; `medicine_brands` *—1 `medicines`
- `test_orders` 1—* `test_order_items` → `tests`; `test_orders` →(opt) `doctors` (referral **source**),
  `consultations`; `test_orders` 1—* `samples` 1—* `sample_events`; `test_orders` 1—1 `accessions`
- `test_order_items` 1—* `results` 1—* `result_values`; `results` 1—* `validations`
- `test_orders` 1—* `lab_reports`; `lab_reports` 1—* `report_files` / `report_print_log` / `report_handover`;
  `report_stationery` 1—* `lab_reports`; `lab_reports` 1—* `ai_analyses` 1—* `ai_analysis_findings`
- `consultations` 1—* `prescriptions` 1—* `prescription_items` → `medicines`; `consultations` 1—0..1
  `video_sessions`; `prescriptions` 1—* `rx_signatures` / `rx_dispense_registry`
- `prescriptions` 1—* `medicine_orders` 1—* `medicine_order_items`; `medicine_orders` 1—0..1 `deliveries` *—1
  `delivery_agents`
- `care_professionals` *—* `home_care_services` (via `care_professional_services`); `care_professionals` 1—*
  `professional_availability`; `patients` 1—* `home_visit_bookings` 1—1 `home_visits` *—1 `care_professionals`;
  `patients` 1—* `care_plans` 1—* `home_visit_bookings` (recurring)
- `inventory_items` 1—* `inventory_batches` 1—* `stock_ledger`; `inventory_items` 1—0..1 `test_kits`; `vaccines`
  is an `inventory_items` subtype (`kind = 'VACCINE'`)
- `payments` 1—* `refunds`; `payouts` (home-care/lawful-B2B only) 1—* `settlements`; `invoices` 1—* `invoice_items`
  / `credit_notes`; `subscription_plans` 1—* `subscriptions` 1—* `entitlements`
- `doctor_lab_associations` are analytics links (no money); `professional_service_contracts` 1—*
  `service_engagements` (paid for services rendered, never per-referral); `b2b_agreements` bill institutions
- `expense_categories` 1—* `expenses`; `qc_runs` 1—* `lj_points`; `insurance_providers` 1—*
  `insurance_recommendations` 1—* `insurance_leads`
- **Clinic & Hospital (HIS):** `clinic` / `hospital` 1—1 `hospitals` (extend org); `hospitals` 1—* `encounter`,
  `ward`, `appointment`, `tariff`, `bill_package`, `formulary_item`, `duty_roster`
- `patients` 1—* `encounter` (type opd/ipd/er); `encounter` 1—* `clinical_order`, `nursing_note`,
  `vital_observation`, `intake_output`, `medication_administration`, `care_plan_ipd`; `encounter` 1—0..1 `admission`
- `admission` 1—1 (current) `bed_allocation` *—1 `bed`; `ward` 1—* `room` 1—* `bed`; `bed` 1—* `bed_allocation`
  (history); `admission` 1—* `advance_payment`, 1—1 `discharge_summary`
- `clinical_order` (CPOE) →(opt) `test_orders` / `prescriptions` / `ot_schedule`; `clinical_order` 1—*
  `medication_administration` (eMAR) and 1—* `bill_line`
- `encounter` 1—0..1 `ot_schedule` 1—1 `ot_case`; `ot_case` 1—1 `anaesthesia_record`, 1—* `surgical_note`,
  1—* `implant_log`; `ot_case`/`surgical_note` carry `icd_code` refs
- `appointment` 1—0..1 `queue_token`, 1—0..1 `encounter`; `clinic` 1—* `appointment` / `queue_token`
- `admission` 1—1 `mrd_record` *—* `icd_code` via `mrd_coding`; `icd_code` is a global master
- `hospital_bill` 1—* `bill_line`; `tariff` / `bill_package` 1—* `bill_line` / `hospital_bill`; `advance_payment`
  →(opt) `payments`; `hospital_bill` →(opt) `payments`
- `pre_authorization` 1—* `tpa_claim`; `admission` 1—* `pre_authorization` / `pmjay_claim`; `bill_package` 1—*
  `pmjay_claim` / `pre_authorization`; claims gated by `consents`
- `formulary_item` *—1 `medicines` / `medicine_compositions`; `ward` 1—* `ward_stock` / `drug_indent`; `ward_stock`
  *—1 `inventory_batches`; `drug_indent` drives `ward_stock` + `stock_ledger`
- all sensitive mutations → `audit_logs`; all async side-effects → `outbox_event`

---

## Data dictionary

Type shorthand: `uuid`, `text`, `int`, `bigint` (paise), `bool`, `ts` (`timestamptz`), `jsonb`, `enum`, `vector`.
Every table has `created_at ts`; clinical/user tables add `updated_at ts` and `deleted_at ts` (soft delete).

### Identity & access
*Owner: Identity & Access (Keycloak-backed), Credentialing & Verification.*
- **users** — `id`(uuid) PK · `phone`(text, E.164, unique) · `email`(citext, unique) · `full_name`(text) ·
  `primary_role`(enum) · `status`(enum: pending/active/suspended/deactivated) · `keycloak_subject`(text) ·
  `locale`(text) · `last_login_at`(ts) · soft-delete. *Keycloak is the IdP; row mirrors subject for joins.*
- **roles** — `id`(uuid) PK · `name`(enum, unique) · `description`(text). *Role catalogue.*
- **permissions** — `id`(uuid) PK · `code`(text, unique, e.g. `orders:create`) · `category`(text) ·
  `value_type`(enum: bool/int/text) · `description`(text). *Permission catalogue.*
- **role_permission** — `role_id`(uuid) FK · `permission_id`(uuid) FK · `value`(text, nullable) · **(role_id,
  permission_id) PK**. *Baseline grant per role.*
- **user_permission** — `user_id`(uuid) FK · `permission_id`(uuid) FK · `effect`(enum: grant/revoke) ·
  `value`(text, nullable) · **(user_id, permission_id) PK**. *Per-user override.*
- **user_roles** — `user_id`(uuid) FK · `role`(enum) · `org_id`(uuid, nullable) · **(user_id, role, org_id) PK**.
  *Multi-role, org-scoped membership.*
- **sessions** — `id`(uuid) PK · `user_id`(uuid) FK · `refresh_token_hash`(text) · `device_info`(jsonb) ·
  `ip`(inet) · `expires_at`(ts) · `revoked_at`(ts). *Refresh/device binding.*
- **otp_requests** — `id`(uuid) PK · `phone`(text) · `code_hash`(text) · `purpose`(text) · `attempts`(int) ·
  `expires_at`(ts) · `consumed_at`(ts). *Phone-OTP login (rate-limited).*
- **kyc_documents** — `id`(uuid) PK · `owner_user_id`(uuid) FK · `org_id`(uuid, nullable) · `doc_type`(text:
  NMC_REG/DRUG_LICENSE/NABL/GSTIN/PAN/BANK) · `doc_number`(text, encrypted) · `file_id`(uuid) · `status`(enum:
  not_submitted/submitted/verified/rejected) · `reviewed_by`(uuid) FK · `remarks`(text).
- **credentials** — `id`(uuid) PK · `owner_user_id`(uuid) FK · `org_id`(uuid, nullable) · `credential_type`(text:
  NMC/state_council/NABL/drug_license/nursing/physio) · `authority`(text) · `reference_no`(text) ·
  `valid_from`(date) · `valid_to`(date) · `verification_case_id`(uuid, nullable) · `status`(enum). *Trust backbone
  — distinct from raw `kyc_documents`; drives approval queues.*
- **verification_cases** — `id`(uuid) PK · `subject_user_id`(uuid) FK · `org_id`(uuid, nullable) · `kind`(text) ·
  `status`(text: open/in_review/approved/rejected) · `assignee_id`(uuid) FK · `decided_at`(ts) · `notes`(text).
- **addresses** — `id`(uuid) PK · `owner_type`(text) · `owner_id`(uuid) · `line1`/`line2`(text) · `city`/`state`/
  `pincode`(text) · `country`(text) · `lat`/`lng`(float) · `is_default`(bool). *Polymorphic; geo-indexed.*

### Organizations & profiles
*Owner: Organizations & Profiles.*
- **diagnostic_centers** — `id`(uuid) PK · `owner_user_id`(uuid) FK · `name`(text) · `license_no`(text) ·
  `nabl_accredited`(bool) · `gstin`(text) · `kyc_status`(enum) · `rating`(numeric, non-money) ·
  `bank_account`(jsonb, encrypted) · `settlement_account_id`(text) · soft-delete. *The lab org = DiagDesk tenant.*
- **pharmacies** — `id`(uuid) PK · `owner_user_id`(uuid) FK · `name`(text) · `drug_license_no`(text) ·
  `gstin`(text) · `parent_clinic`(text) · `delivery_radius_km`(numeric) · `kyc_status`(enum) ·
  `bank_account`(jsonb, encrypted) · soft-delete.
- **hospitals** — `id`(uuid) PK · `owner_user_id`(uuid) FK · `name`(text) · `registration_no`(text) ·
  `gstin`(text) · `type`(text: clinic/nursing_home/hospital) · `kyc_status`(enum) · soft-delete. *Doctor/hospital
  side org.*
- **branches** — `id`(uuid) PK · `org_type`(enum: diagnostic_center/pharmacy/hospital) · `org_id`(uuid) ·
  `name`(text) · `address_id`(uuid) FK · `phone`(text) · `is_active`(bool). *Edge unit for the lab node.*
- **org_staff** — `id`(uuid) PK · `user_id`(uuid) FK · `org_type`(enum) · `org_id`(uuid) · `branch_id`(uuid) FK ·
  `staff_role`(text: nurse/phlebotomist/pharmacist/manager) · `is_active`(bool).
- **doctors** — `id`(uuid) PK · `user_id`(uuid, unique) FK · `registration_no`(text) · `council`(text) ·
  `qualification`(text) · `experience_years`(int) · `clinic_name`(text) · `consultation_fee_paise`(bigint) ·
  `kyc_status`(enum) · `rating`(numeric) · `bank_account`(jsonb, encrypted — for **service** fees, not referrals) ·
  soft-delete.
- **specializations** — `id`(uuid) PK · `name`(text, unique). **doctor_specializations** — `doctor_id`(uuid) FK ·
  `specialization_id`(uuid) FK · **(doctor_id, specialization_id) PK**.
- **patients** — `id`(uuid) PK · `user_id`(uuid, unique) FK · `mpi_no`(text) · `dob`(date) · `gender`(enum) ·
  `blood_group`(text) · `abha_number`(text, nullable) · `emergency_contact`(jsonb) · `allergies`(text[]) ·
  soft-delete. *Platform-side master patient; lab-side linkage via `patient_lab_links`.*
- **patient_links** — `id`(uuid) PK · `patient_id`(uuid) FK · `linked_patient_id`(uuid) FK · `relation`(text:
  self/dependent/family) · `verified_at`(ts). *MPI cross-org / dependent linkage at the platform tier.*
- **care_professionals** — `id`(uuid) PK · `user_id`(uuid, unique) FK · `type`(enum: nurse/physiotherapist/doctor/
  attendant/caregiver) · `agency_id`(uuid, nullable) · `registration_no`(text) · `qualification`(text) ·
  `experience_years`(int) · `bio`(text) · `kyc_status`(enum) · `background_check_status`(text) · `rating`(numeric) ·
  `acceptance_rate`(numeric) · `service_areas`(jsonb) · `base_lat`/`base_lng`(float) · `is_on_call`(bool) ·
  `bank_account`(jsonb, encrypted — for **home-care payouts**) · soft-delete.

### Consent & records
*Owner: Consent & Health Records.*
- **consents** — `id`(uuid) PK · `patient_id`(uuid) FK · `scope`(enum: share_with_insurer/share_with_doctor/
  abdm_link/marketing/ai_analysis) · `grantee_type`(text) · `grantee_id`(uuid) · `status`(enum: granted/revoked/
  expired) · `purpose`(text) · `lang`(text) · `granted_at`(ts) · `expires_at`(ts) · `revoked_at`(ts).
  *DPDP-revocable; gates AI, sharing, marketing.*
- **abha_links** — `id`(uuid) PK · `patient_id`(uuid, unique) FK · `abha_number`(text) · `abha_address`(text) ·
  `linked_at`(ts). *ABDM/ABHA linkage.*
- **fhir_resources** — `id`(uuid) PK · `patient_id`(uuid) FK · `resource_type`(text: Patient/Observation/
  DiagnosticReport) · `fhir_id`(text) · `resource`(jsonb, **FHIR R4**). *Exported/cached FHIR for interop.*

### Catalog (tests)
*Owner: Catalog & Rate-Card (lab node).*
- **tests** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `code`(text) · `name`(text) · `category`(text) ·
  `sample_type`(text) · `price_paise`(bigint) · `tat_hours`(int) · `fasting_required`(bool) · `is_custom`(bool:
  non-NABL lab-created) · `is_active`(bool). *No commission columns.* GIN trigram on `name`.
- **test_parameters** — `id`(uuid) PK · `test_id`(uuid) FK · `name`(text) · `unit`(text) · `ref_low`/`ref_high`
  (numeric) · `ref_gender`(enum, nullable) · `age_min`/`age_max`(int). *Analyte definitions.*
- **test_panels** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `name`(text) · `is_active`(bool).
  **test_panel_items** — `panel_id`(uuid) FK · `test_id`(uuid) FK · **(panel_id, test_id) PK**.
- **reference_ranges** — `id`(uuid) PK · `test_id`(uuid) FK · `analyte`(text) · `sex`(enum) · `age_min`/`age_max`
  (int) · `low`/`high`(numeric) · `critical_low`/`critical_high`(numeric) · `unit`(text). *Sex/age-banded ranges
  (DiagDesk depth, superseding flat `test_parameters` ranges).*
- **health_packages** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `doctor_id`(uuid, nullable) FK ·
  `name`(text) · `description`(text) · `price_paise`(bigint) · `audience_filter`(jsonb) · `is_active`(bool).
  ***No commission_type/commission_value*** (removed). **Lab-owned** packages — no RMP kickback.
- **health_package_tests** — `package_id`(uuid) FK · `test_id`(uuid) FK · **(package_id, test_id) PK**.
- **rate_cards** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `name`(text) · `scheme`(text: default/CGHS/
  ECHS/TPA/B2B) · `branch_id`(uuid, nullable) FK · `is_active`(bool).
- **rate_card_items** — `rate_card_id`(uuid) FK · `test_id`(uuid) FK · `price_paise`(bigint) · **(rate_card_id,
  test_id) PK**.

### Catalog (medicines)
*Owner: Medicine Master & Brand↔Generic.*
- **medicine_compositions** — `id`(uuid) PK · `generic_name`(text) · `strength`(text) · `form`(text: tablet/syrup)
  · unique (generic_name, strength, form). *Chemical/generic master.*
- **medicines** — `id`(uuid) PK · `brand_name`(text) · `manufacturer`(text) · `composition_id`(uuid) FK ·
  `schedule`(text: OTC/H/H1/X) · `hsn_code`(text) · `is_active`(bool). GIN trigram on `brand_name`. *Marketed
  product; substitution via shared `composition_id`.*
- **medicine_brands** — `id`(uuid) PK · `medicine_id`(uuid) FK · `brand_label`(text) · `packing`(text) ·
  `mrp_paise`(bigint) · `is_active`(bool). *Brand/pack variants under a medicine for brand↔generic display.*

### Orders & samples
*Owner: Order & Workflow (lab node).*
- **test_orders** — `id`(uuid) PK · `order_no`(bigserial) · `patient_id`(uuid) FK · `diagnostic_center_id`(uuid)
  FK · `branch_id`(uuid, nullable) FK · `consultation_id`(uuid, nullable) FK · `doctor_id`(uuid, nullable) FK
  *(referring **source** — analytics only)* · `b2b_agreement_id`(uuid, nullable) FK · `status`(enum) ·
  `amount_paise`(bigint) · `currency`(char3) · `notes`(text) · `ordered_at`(ts) · `completed_at`(ts).
  ***No `commission_total_paise`*** (removed).
- **test_order_items** — `id`(uuid) PK · `order_id`(uuid) FK · `test_id`(uuid) FK · `test_name`(text, snapshot) ·
  `price_paise`(bigint) · `status`(text). ***No `commission_type/value/paise`*** (removed).
- **samples** — `id`(uuid) PK · `order_id`(uuid) FK · `barcode`(text) · `container`(text) · `sample_type`(text) ·
  `status`(text) · `collected_at`(ts). *Barcode sample tracking.*
- **sample_events** — `id`(uuid) PK · `sample_id`(uuid) FK · `event`(text: collected/received/in_process/
  rejected) · `reason_code`(text) · `actor_id`(uuid) FK · `at`(ts). *Append-only lifecycle; partition by month.*
- **accessions** — `id`(uuid) PK · `order_id`(uuid) FK · `accession_no`(text, unique per center) · `at`(ts).
- **patient_lab_links** — `id`(uuid) PK · `patient_id`(uuid) FK · `diagnostic_center_id`(uuid) FK ·
  `lab_patient_code`(text) · unique (diagnostic_center_id, lab_patient_code) · unique (patient_id,
  diagnostic_center_id). *Platform patient ↔ lab's internal unique patient id.*

### Results & reports
*Owner: Result & Validation, Reporting, Device Gateway (lab node).*
- **results** — `id`(uuid) PK · `order_item_id`(uuid) FK · `status`(text) · `source`(text: analyzer/manual) ·
  `instrument`(text) · `device_message_id`(uuid, nullable) FK. *Result capture.*
- **result_values** — `id`(uuid) PK · `result_id`(uuid) FK · `analyte`(text) · `value`(text) · `value_num`
  (numeric) · `unit`(text) · `flag`(enum: normal/high/low/critical/abnormal) · `delta`(numeric). *Append-heavy;
  partition by month.*
- **validations** — `id`(uuid) PK · `result_id`(uuid) FK · `validated_by`(uuid) FK · `level`(text: tech/
  pathologist) · `remark`(text) · `at`(ts). *Multi-level sign-off.*
- **device_messages** — `id`(uuid) PK · `branch_id`(uuid) FK · `instrument`(text) · `protocol`(text: HL7/ASTM) ·
  `raw`(text) · `parsed`(jsonb) · `status`(text) · `received_at`(ts). *Edge analyzer interfacing (Go gateway).*
- **lab_reports** — `id`(uuid) PK · `order_id`(uuid) FK · `stationery_id`(uuid) FK · `state`(text: draft/
  in_review/preliminary/final) · `reviewed_by`(uuid, nullable) FK · `signed_by`(uuid, nullable) FK ·
  `signature`(text) · `version`(int) · `print_count`(int) · `handover_status`(text: pending/handed_over) ·
  `report_date`(ts) · `delivered_at`(ts).
- **report_files** — `id`(uuid) PK · `report_id`(uuid) FK · `file_id`(uuid) · `kind`(text: PDF) · `ocr_done`
  (bool). *Rendered PDF/object-store reference.*
- **report_stationery** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `branch_id`(uuid, nullable) FK ·
  `header_html`/`footer_html`(text) · `logo_uri`(text) · `margins`(jsonb) · `is_active`(bool). *Saved
  letterhead; preview renders the report on it.*
- **report_print_log** — `id`(uuid) PK · `report_id`(uuid) FK · `printed_by`(uuid) FK · `copies`(int) · `at`(ts).
  *Drives `lab_reports.print_count`.*
- **report_handover** — `id`(uuid) PK · `report_id`(uuid) FK · `handed_to`(text) · `method`(text: barcode/
  manual) · `scanned_barcode`(text, nullable) · `by_user`(uuid) FK · `at`(ts).

### AI decision support
*Owner: AI Decision Support (assistive-only, mandatory doctor sign-off).*
- **ai_analyses** — `id`(uuid) PK · `report_id`(uuid) FK · `patient_id`(uuid) FK · `model`(text) ·
  `model_version`(text) · `status`(enum: queued/running/completed/pending_doctor_review/accepted/overridden/
  dismissed/failed) · `summary`(text) · `confidence`(numeric) · `reviewed_by_doctor_id`(uuid, nullable) FK ·
  `reviewed_at`(ts) · `doctor_decision`(text). *Gated by `consents` (scope `ai_analysis`); versioned + audited.*
- **ai_analysis_findings** — `id`(uuid) PK · `analysis_id`(uuid) FK · `observation`(text) · `correlation`(text) ·
  `suggested_followups`(text[]) · `severity`(enum) · `citations`(jsonb). *Retrieval via `clinical_knowledge`
  (pgvector embeddings).*

### Consultations
*Owner: Consultations & Prescriptions, Teleconsultation, Prescription Integrity.*
- **consultations** — `id`(uuid) PK · `doctor_id`(uuid) FK · `patient_id`(uuid) FK · `type`(text: in_person/tele/
  follow_up) · `parent_consultation_id`(uuid, nullable) FK · `complaint`(text) · `diagnosis`(text) · `notes`(text)
  · `occurred_at`(ts).
- **prescriptions** — `id`(uuid) PK · `consultation_id`(uuid) FK · `doctor_id`(uuid) FK · `patient_id`(uuid) FK ·
  `advice`(text) · `file_id`(uuid, generated PDF).
- **prescription_items** — `id`(uuid) PK · `prescription_id`(uuid) FK · `medicine_id`(uuid, nullable) FK ·
  `free_text`(text) · `dose`(text) · `frequency`(text) · `timings`(enum[]: morning/afternoon/evening/night/sos) ·
  `before_food`(bool) · `duration_days`(int) · `instructions`(text).
- **video_sessions** — `id`(uuid) PK · `consultation_id`(uuid, nullable) FK · `doctor_id`(uuid) FK ·
  `patient_id`(uuid) FK · `status`(enum: scheduled/room_created/waiting/in_progress/ended/no_show/cancelled/
  rescheduled) · `provider`(text: 100ms) · `room_id`(text) · `join_url`(text) · `scheduled_at`/`started_at`/
  `ended_at`(ts) · `recording_file_id`(uuid, **only with consent**).
- **rx_signatures** — `id`(uuid) PK · `prescription_id`(uuid) FK · `doctor_id`(uuid) FK · `signature_hash`(text) ·
  `abha_linked`(bool) · `signed_at`(ts) · `cert_ref`(text). *E-sign + ABHA-linked anti-forgery.*
- **rx_dispense_registry** — `id`(uuid) PK · `prescription_id`(uuid) FK · `dedupe_key`(text, unique) ·
  `schedule_class`(text: H/H1/X/narcotic) · `dispensed_at`(ts) · `dispensed_by_pharmacy_id`(uuid, nullable) FK.
  *Reuse-prevention registry; Schedule H/H1/X guardrails.*

### Pharmacy & fulfilment
*Owner: Pharmacy Fulfilment & Delivery.*
- **medicine_orders** — `id`(uuid) PK · `order_no`(bigserial) · `prescription_id`(uuid, nullable) FK ·
  `patient_id`(uuid) FK · `pharmacy_id`(uuid) FK · `status`(enum) · `fulfilment`(enum: pickup/delivery) ·
  `delivery_address_id`(uuid) FK · `items_total_paise`(bigint) · `delivery_fee_paise`(bigint) ·
  `grand_total_paise`(bigint).
- **medicine_order_items** — `id`(uuid) PK · `medicine_order_id`(uuid) FK · `prescription_item_id`(uuid,
  nullable) FK · `medicine_id`(uuid) FK · `is_substitute`(bool) · `batch_id`(uuid) FK · `quantity`(int) ·
  `unit_price_paise`(bigint) · `line_total_paise`(bigint).
- **deliveries** — `id`(uuid) PK · `medicine_order_id`(uuid) FK · `agent_id`(uuid, nullable) FK · `status`(enum:
  pending/assigned/picked_up/out_for_delivery/delivered/failed) · `distance_km`(numeric) · `picked_up_at`/
  `delivered_at`(ts) · `proof_file_id`(uuid, POD) · `otp_code_hash`(text).
- **delivery_agents** — `id`(uuid) PK · `pharmacy_id`(uuid) FK · `user_id`(uuid, nullable) FK · `name`(text) ·
  `phone`(text) · `is_available`(bool).

### Home care
*Owner: Home Care & On-Demand.*
- **home_care_services** — `id`(uuid) PK · `owner_type`(text: platform/agency) · `owner_id`(uuid, nullable) ·
  `name`(text) · `category`(text: nursing/physio/elderly_care/post_op/phlebotomy) · `delivered_by_type`(enum) ·
  `duration_min`(int) · `base_price_paise`(bigint) · `is_active`(bool). *Catalogue of bookable visits.*
- **care_professional_services** — `professional_id`(uuid) FK · `service_id`(uuid) FK ·
  `price_override_paise`(bigint, nullable) · **(professional_id, service_id) PK**.
- **professional_availability** — `id`(uuid) PK · `professional_id`(uuid) FK · `weekday`(int, nullable) ·
  `start_at`/`end_at`(ts, nullable) · `is_blocked`(bool). *Recurring/explicit slots + leave.*
- **care_plans** — `id`(uuid) PK · `patient_id`(uuid) FK · `created_by_user_id`(uuid) FK · `service_id`(uuid,
  nullable) FK · `professional_id`(uuid, nullable) FK · `title`(text) · `schedule`(jsonb) · `status`(text).
  *Recurring program → spawns bookings.*
- **home_visit_bookings** — `id`(uuid) PK · `booking_no`(bigserial) · `patient_id`(uuid) FK ·
  `requested_by_user_id`(uuid) FK · `service_id`(uuid) FK · `care_plan_id`(uuid, nullable) FK ·
  `professional_id`(uuid, nullable) FK · `kind`(enum: on_call/scheduled) · `status`(enum: requested…completed/
  cancelled/no_show/refunded) · `address_id`(uuid) FK · `scheduled_at`(ts) · `amount_paise`(bigint) ·
  `platform_fee_paise`(bigint, **platform take-rate** — not a referral commission) · `currency`(char3).
- **home_visit_offers** — `id`(uuid) PK · `booking_id`(uuid) FK · `professional_id`(uuid) FK · `rank`(int) ·
  `status`(text: offered/accepted/declined/expired) · `offered_at`/`responded_at`/`expires_at`(ts). *Dispatch
  matching.*
- **home_visits** — `id`(uuid) PK · `booking_id`(uuid, unique) FK · `professional_id`(uuid) FK · `check_in_at`(ts)
  · `check_in_lat`/`check_in_lng`(float) · `check_out_at`(ts) · `check_out_lat`/`check_out_lng`(float) ·
  `patient_otp_hash`(text) · `vitals`(jsonb) · `notes`(text). *Geo check-in/out + visit OTP → patient history.*
- **visit_attachments** — `id`(uuid) PK · `home_visit_id`(uuid) FK · `file_id`(uuid) · `kind`(text: photo/report/
  consent).

### Inventory
*Owner: Inventory (labs and pharmacies).*
- **inventory_items** — `id`(uuid) PK · `org_type`(enum: pharmacy/diagnostic_center) · `org_id`(uuid) ·
  `kind`(enum: medicine/reagent/consumable/vaccine) · `medicine_id`(uuid, nullable) FK · `vaccine_id`(uuid,
  nullable) FK · `label`(text) · `reorder_level`(int). *Vaccines are a `kind`-typed item (see `vaccines`).*
- **inventory_batches** — `id`(uuid) PK · `inventory_item_id`(uuid) FK · `batch_no`(text) · `quantity`(int) ·
  `mrp_paise`(bigint) · `cost_paise`(bigint) · `manufactured_on`(date) · `expiry_date`(date). *FEFO; expiry-
  indexed.*
- **test_kits** — `id`(uuid) PK · `inventory_item_id`(uuid) FK · `diagnostic_center_id`(uuid) FK · `name`(text) ·
  `tests_per_kit`(int) · `tests_remaining`(int) · `lot_no`(text) · `expiry`(date) · `linked_test_id`(uuid,
  nullable) FK. *Per-test consumption tracking (DiagDesk depth).*
- **stock_ledger** — `id`(uuid) PK · `batch_id`(uuid) FK · `change_qty`(int, +in/−out) · `reason`(text: dispense/
  restock/consumption/expiry/adjust) · `ref_type`(text) · `ref_id`(uuid) · `actor_id`(uuid) FK · `at`(ts).
  *Append-only stock movements.*
- **vaccines** — `id`(uuid) PK · `name`(text) · `manufacturer`(text) · `recommended_age`(text). *Vaccine master;
  stocked via `inventory_items` (`kind = 'VACCINE'`).*

### Payments & billing
*Owner: Payments & Settlement, Billing & Invoicing, Subscriptions & Entitlements.*
- **payments** — `id`(uuid) PK · `purpose`(enum: test_order/medicine_order/subscription/health_package/
  teleconsult/home_visit) · `ref_type`(text) · `ref_id`(uuid) · `payer_user_id`(uuid) FK · `amount_paise`(bigint)
  · `currency`(char3) · `status`(enum: created/pending/paid/failed/refunded/partially_refunded) · `provider`(text:
  razorpay) · `provider_order_id`/`provider_payment_id`(text) · `idempotency_key`(text, unique) · `meta`(jsonb).
  *Append-heavy; partition by month.*
- **refunds** — `id`(uuid) PK · `payment_id`(uuid) FK · `amount_paise`(bigint) · `reason`(text) ·
  `provider_refund_id`(text) · `status`(text: processing/done/failed).
- **payouts** — `id`(uuid) PK · `payee_type`(text: care_professional/pharmacy/lab) · `payee_id`(uuid) ·
  `period_start`/`period_end`(date) · `amount_paise`(bigint) · `status`(enum: scheduled/processing/paid/failed) ·
  `provider`(text) · `provider_payout_id`(text) · `statement_file_id`(uuid). ***Home-care professional payouts and
  lawful B2B settlement only — NEVER referral commissions.*** *(see Compliance note).*
- **settlements** — `id`(uuid) PK · `payout_id`(uuid, nullable) FK · `org_type`(enum) · `org_id`(uuid) ·
  `gross_paise`(bigint) · `fee_paise`(bigint) · `net_paise`(bigint) · `period_start`/`period_end`(date) ·
  `status`(text) · `reconciled_at`(ts). *Split-settlement reconciliation.*
- **invoices** — `id`(uuid) PK · `invoice_no`(text, unique) · `payment_id`(uuid, nullable) FK · `issuer_org_type`
  (enum) · `issuer_org_id`(uuid) · `bill_to_user_id`(uuid, nullable) FK · `b2b_agreement_id`(uuid, nullable) FK ·
  `ref_type`(text) · `ref_id`(uuid) · `subtotal_paise`(bigint) · `discount_paise`(bigint) ·
  `discount_justification`(text, mandatory when discount>0) · `discount_approved_by`(uuid, nullable) FK ·
  `tax_paise`(bigint) · `total_paise`(bigint) · `gstin`(text) · `status`(text: issued/paid/refunded/cancelled) ·
  `file_id`(uuid). *GST provider-ops billing.*
- **invoice_items** — `id`(uuid) PK · `invoice_id`(uuid) FK · `description`(text) · `hsn_sac`(text) ·
  `quantity`(int) · `unit_price_paise`(bigint) · `tax_rate`(numeric, GST %) · `line_total_paise`(bigint).
- **credit_notes** — `id`(uuid) PK · `invoice_id`(uuid) FK · `reason`(text) · `amount_paise`(bigint) ·
  `gst_reversal_paise`(bigint) · `issued_at`(ts) · `file_id`(uuid). *GST credit note for returns/adjustments.*
- **subscription_plans** — `id`(uuid) PK · `name`(text) · `audience`(enum: doctor/lab_admin/pharmacy_admin) ·
  `price_paise`(bigint) · `interval`(text: monthly/yearly) · `features`(jsonb) · `is_active`(bool). *Provider SaaS.*
- **subscriptions** — `id`(uuid) PK · `plan_id`(uuid) FK · `subscriber_user_id`(uuid) FK · `status`(enum:
  trialing/active/past_due/cancelled/expired) · `current_period_start`/`current_period_end`(ts) ·
  `provider_sub_id`(text).
- **entitlements** — `id`(uuid) PK · `subscription_id`(uuid) FK · `feature_key`(text) · `limit_value`(int,
  nullable) · `is_enabled`(bool). *Feature-gating derived from the active plan.*

### Associations & contracts (compliant — replaces the commission engine)
*Owner: Associations & Contracts.*
- **doctor_lab_associations** — `id`(uuid) PK · `doctor_id`(uuid) FK · `diagnostic_center_id`(uuid) FK ·
  `is_preferred`(bool) · `status`(text: active/paused). ***Analytics/relationship link only — NO money owed, NO
  commission fields.*** *Referral volume/revenue surfaces in `mv_*` read models, never as a payable.*
- **professional_service_contracts** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `party_name`(text) ·
  `party_type`(text: consultant_pathologist/radiologist/teleradiologist/other) · `service_type`(text: reporting/
  consulting/teleradiology) · `basis`(enum: **fixed/per_service** — ***no `per_referral`***) · `rate_paise`
  (bigint) · `is_also_referrer`(bool, *true → flagged for compliance review, never auto-paid*) · `is_active`(bool).
  *The only lawful money-to-a-professional path.*
- **service_engagements** — `id`(uuid) PK · `contract_id`(uuid) FK · `service_ref`(text: report/study **actually
  performed**) · `qty`(int) · `amount_paise`(bigint) · `at`(ts). *Guardrail: must reference a rendered service,
  not a referred patient; settled (if at all) via lawful `payouts`/`invoices`.*
- **b2b_agreements** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `partner_type`(text: hospital/clinic/
  corporate/TPA/ref_lab) · `partner_name`(text) · `gstin`(text) · `rate_card_id`(uuid, nullable) FK ·
  `credit_limit_paise`(bigint) · `billing_cycle_days`(int) · `status`(text). *Institution-as-buyer billing —
  lawful B2B, never per-referral.*

### Engagement
*Owner: Engagement.*
- **content_items** — `id`(uuid) PK · `author_user_id`(uuid) FK · `org_type`(enum) · `org_id`(uuid) · `type`(enum:
  voice/poster/pdf/text/video) · `title`(text) · `body`(text) · `file_id`(uuid) · `status`(enum: draft/
  pending_moderation/approved/rejected/published) · `audience_filter`(jsonb) · `moderated_by`(uuid) FK ·
  `published_at`(ts).
- **campaigns** — `id`(uuid) PK · `owner_user_id`(uuid) FK · `name`(text) · `content_id`(uuid) FK · `channel`(enum)
  · `audience_filter`(jsonb) · `scheduled_at`(ts) · `status`(text). *Consent + opt-out enforced.*
- **health_camps** — `id`(uuid) PK · `organizer_user_id`(uuid) FK · `diagnostic_center_id`(uuid, nullable) FK ·
  `title`(text) · `description`(text) · `is_free`(bool) · `venue_address_id`(uuid) FK · `starts_at`/`ends_at`(ts).
- **health_camp_registrations** — `id`(uuid) PK · `camp_id`(uuid) FK · `patient_id`(uuid) FK · `registered_at`(ts)
  · unique (camp_id, patient_id).

### Insurance
*Owner: Insurance.*
- **insurance_providers** — `id`(uuid) PK · `name`(text) · `contact`(jsonb) · `api_config`(jsonb) · `is_active`
  (bool).
- **insurance_recommendations** — `id`(uuid) PK · `doctor_id`(uuid, nullable) FK · `patient_id`(uuid) FK ·
  `provider_id`(uuid) FK · `rationale`(text). *Ailment-based; no procurement incentive.*
- **insurance_leads** — `id`(uuid) PK · `recommendation_id`(uuid, nullable) FK · `patient_id`(uuid) FK ·
  `provider_id`(uuid) FK · `consent_id`(uuid) FK · `shared_summary_file_id`(uuid) · `status`(text: created/
  contacted/converted/closed). *Lead-gen on **consented** medical-summary sharing.*

### Clinic & Hospital (HIS)
*Owner: Clinic Operations (G1), Patient Administration & ADT (G2), Bed & Ward (G3), IPD & Nursing (G4),
OT & Surgery (G5), Hospital Billing & TPA/Cashless (G6), MRD & Clinical Coding (G7), Hospital Pharmacy &
Formulary (G8). Org-scoped on `hospital_id` (clinics are hospitals with `type='clinic'`); UUIDv7 PKs, integer-paise
money, RLS, soft-delete, audit + `outbox_event`. These rows **project to FHIR R4** (`encounter`→`Encounter`,
`vital_observation`→`Observation`, `medication_administration`→`MedicationAdministration`, `surgical_note`/`ot_case`
→`Procedure`, `tpa_claim`/`pmjay_claim`→`Claim`) cached in `fhir_resources`.*
- **clinic** — `id`(uuid) PK · `hospital_id`(uuid, unique) FK *(extends `hospitals` where `type='clinic'`)* ·
  `practice_type`(enum: solo/multi_practitioner) · `front_desk_enabled`(bool) · `online_booking_enabled`(bool) ·
  `default_slot_min`(int) · `is_active`(bool) · soft-delete. *Clinic-operations profile over an org.*
- **hospital** — `id`(uuid) PK · `hospital_id`(uuid, unique) FK *(extends `hospitals` where `type='hospital'/
  nursing_home`)* · `nabh_status`(enum: none/entry/full) · `bed_count`(int) · `uhid_prefix`(text) ·
  `his_mode`(enum: full_his/hl7_fhir_integration) · `clinical_establishment_reg_no`(text) · `is_active`(bool) ·
  soft-delete. *HIS-edition profile; `his_mode` selects full HIS vs integrate-only.*
- **encounter** — `id`(uuid) PK · `encounter_no`(bigserial) · `hospital_id`(uuid) FK · `patient_id`(uuid) FK ·
  `type`(enum: **opd/ipd/er**) · `class`(text: ambulatory/inpatient/emergency) · `status`(enum: planned/arrived/
  triaged/in_progress/onleave/finished/cancelled) · `attending_doctor_id`(uuid, nullable) FK · `department`(text) ·
  `consultation_id`(uuid, nullable) FK · `referral_source`(text) · `mlc`(bool) · `mlc_no`(text, nullable) ·
  `started_at`(ts) · `ended_at`(ts) · soft-delete. ***FHIR `Encounter`-aligned spine** unifying OPD·IPD·ER; links
  orders, notes, meds, bills, discharge.*
- **admission** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid, unique) FK · `patient_id`(uuid) FK ·
  `admitting_doctor_id`(uuid) FK · `admission_no`(text, unique per hospital) · `source`(text: opd/er/transfer/
  direct) · `status`(enum: admitted/transferred/discharged/lama/absconded/expired) · `admitted_at`(ts) ·
  `expected_discharge_at`(ts) · `discharged_at`(ts) · soft-delete. *ADT in-patient stay header (1—1 `encounter`).*
- **ward** — `id`(uuid) PK · `hospital_id`(uuid) FK · `name`(text) · `ward_type`(enum: general/private/icu/hdu/
  emergency/maternity/pediatric) · `floor`(text) · `is_active`(bool). *Ward master.*
- **room** — `id`(uuid) PK · `hospital_id`(uuid) FK · `ward_id`(uuid) FK · `room_no`(text) · `category`(text:
  general/semi_private/private/deluxe/suite) · `is_active`(bool) · unique (ward_id, room_no). *Room master.*
- **bed** — `id`(uuid) PK · `hospital_id`(uuid) FK · `room_id`(uuid) FK · `bed_no`(text) · `tariff_id`(uuid,
  nullable) FK · `status`(enum: available/occupied/reserved/blocked/housekeeping) · `housekeeping_status`(text:
  clean/dirty/in_progress) · `is_active`(bool) · unique (room_id, bed_no). *Real-time occupancy unit.*
- **bed_allocation** — `id`(uuid) PK · `hospital_id`(uuid) FK · `admission_id`(uuid) FK · `bed_id`(uuid) FK ·
  `is_current`(bool) · `reason`(text: admission/transfer/upgrade/downgrade) · `tariff_id`(uuid, nullable) FK ·
  `allocated_at`(ts) · `vacated_at`(ts, nullable) · `allocated_by`(uuid) FK. *Allocation/transfer history;
  `is_current=true` row gives the live bed (admission 1—1 current bed_allocation).*
- **clinical_order** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK · `ordered_by`(uuid) FK
  *(doctor — CPOE)* · `order_type`(enum: lab/radiology/medication/procedure/diet/nursing/referral/blood) ·
  `priority`(enum: routine/urgent/stat) · `status`(enum: draft/placed/acknowledged/in_progress/completed/cancelled)
  · `ref_type`(text) · `ref_id`(uuid, nullable: links `test_orders`/`prescriptions`/`ot_schedule`) · `details`(jsonb)
  · `ordered_at`(ts) · soft-delete. *Computerised Physician Order Entry; audited, clinician sign-off.*
- **nursing_note** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK · `nurse_id`(uuid) FK ·
  `note_type`(text: assessment/progress/handover/incident) · `shift`(text: morning/evening/night) · `body`(text) ·
  `recorded_at`(ts) · soft-delete. *Nursing assessments/notes.*
- **vital_observation** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK · `recorded_by`(uuid) FK
  · `code`(text: temp/pulse/bp_sys/bp_dia/spo2/rr/gcs/pain/weight/height) · `value_num`(numeric) · `unit`(text) ·
  `loinc_code`(text, nullable) · `flag`(enum: normal/high/low/critical) · `recorded_at`(ts). *Append-heavy; partition
  by month; → FHIR `Observation`.*
- **intake_output** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK · `recorded_by`(uuid) FK ·
  `direction`(enum: intake/output) · `category`(text: oral/iv/urine/drain/vomit/stool) · `volume_ml`(int) ·
  `recorded_at`(ts). *I/O fluid-balance chart; append-heavy.*
- **medication_administration** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK ·
  `clinical_order_id`(uuid, nullable) FK · `prescription_item_id`(uuid, nullable) FK · `formulary_item_id`(uuid,
  nullable) FK · `medicine_id`(uuid, nullable) FK · `administered_by`(uuid) FK · `dose`(text) · `route`(text) ·
  `status`(enum: scheduled/administered/held/refused/missed/self_administered) · `reason_not_given`(text) ·
  `scheduled_at`(ts) · `administered_at`(ts). ***eMAR**; → FHIR `MedicationAdministration`; append-heavy, audited.*
- **ot_schedule** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK · `theatre`(text) ·
  `surgeon_id`(uuid) FK · `procedure_name`(text) · `icd_code_id`(uuid, nullable) FK · `status`(enum: requested/
  scheduled/pre_op/in_progress/completed/cancelled/postponed) · `scheduled_start`(ts) · `scheduled_end`(ts) ·
  `pre_op_checklist`(jsonb) · soft-delete. *OT booking + pre-op checklist.*
- **ot_case** — `id`(uuid) PK · `hospital_id`(uuid) FK · `ot_schedule_id`(uuid, unique) FK · `encounter_id`(uuid) FK
  · `surgeon_id`(uuid) FK · `anaesthetist_id`(uuid, nullable) FK · `procedure_name`(text) · `wound_class`(text:
  clean/clean_contaminated/contaminated/dirty) · `status`(enum: in_progress/closed/recovery/completed) ·
  `wheel_in_at`(ts) · `incision_at`(ts) · `closure_at`(ts) · `wheel_out_at`(ts) · soft-delete. *Actual OT event →
  FHIR `Procedure`.*
- **anaesthesia_record** — `id`(uuid) PK · `hospital_id`(uuid) FK · `ot_case_id`(uuid, unique) FK ·
  `anaesthetist_id`(uuid) FK · `technique`(text: general/spinal/epidural/local/sedation) · `asa_grade`(text: I–V) ·
  `pre_anaesthetic_assessment`(jsonb) · `intra_op_chart`(jsonb) · `agents`(jsonb) · `recorded_at`(ts) · soft-delete.
- **surgical_note** — `id`(uuid) PK · `hospital_id`(uuid) FK · `ot_case_id`(uuid) FK · `author_id`(uuid) FK
  *(surgeon)* · `findings`(text) · `procedure_performed`(text) · `icd_code_id`(uuid, nullable) FK · `specimens`(text)
  · `blood_loss_ml`(int) · `signed_at`(ts) · soft-delete. *Operative note → FHIR `Procedure`.*
- **implant_log** — `id`(uuid) PK · `hospital_id`(uuid) FK · `ot_case_id`(uuid) FK · `item_name`(text) ·
  `inventory_item_id`(uuid, nullable) FK · `serial_no`(text) · `lot_no`(text) · `manufacturer`(text) · `quantity`(int)
  · `cost_paise`(bigint) · `currency`(char3) · `implanted_at`(ts). *Implant/consumable traceability.*
- **care_plan_ipd** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK · `created_by`(uuid) FK ·
  `problem`(text) · `goals`(jsonb) · `interventions`(jsonb) · `status`(enum: active/on_hold/completed/cancelled) ·
  `reviewed_at`(ts) · soft-delete. *In-patient care plan (distinct from home-care `care_plans`).*
- **appointment** — `id`(uuid) PK · `hospital_id`(uuid) FK · `clinic_id`(uuid, nullable) FK · `patient_id`(uuid) FK ·
  `doctor_id`(uuid) FK · `room_id`(uuid, nullable) FK · `channel`(text: online/walk_in/phone) · `status`(enum:
  booked/confirmed/checked_in/in_consult/completed/no_show/cancelled/rescheduled) · `slot_start`(ts) · `slot_end`(ts)
  · `encounter_id`(uuid, nullable) FK · `reminder_sent_at`(ts) · soft-delete. *OPD appointment (clinic + hospital
  OPD).*
- **queue_token** — `id`(uuid) PK · `hospital_id`(uuid) FK · `clinic_id`(uuid, nullable) FK · `appointment_id`(uuid,
  nullable) FK · `doctor_id`(uuid) FK · `token_no`(int) · `queue_date`(date) · `status`(enum: waiting/called/
  in_service/served/skipped/cancelled) · `called_at`(ts) · `served_at`(ts) · unique (hospital_id, doctor_id,
  queue_date, token_no). *Per-practitioner/room token.*
- **discharge_summary** — `id`(uuid) PK · `hospital_id`(uuid) FK · `admission_id`(uuid, unique) FK ·
  `encounter_id`(uuid) FK · `prepared_by`(uuid) FK · `signed_by`(uuid, nullable) FK · `diagnosis`(text) ·
  `course`(text) · `procedures`(text) · `discharge_meds`(jsonb) · `followup_advice`(text) · `outcome`(text:
  recovered/referred/lama/expired) · `status`(enum: draft/finalised/signed) · `file_id`(uuid) · `signed_at`(ts) ·
  soft-delete. *ICD-coded discharge document.*
- **icd_code** — `id`(uuid) PK · `system`(enum: icd10/icd11) · `code`(text) · `description`(text) · `is_active`(bool)
  · unique (system, code). *Clinical-coding master (global, not org-scoped).*
- **mrd_record** — `id`(uuid) PK · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK · `admission_id`(uuid, nullable)
  FK · `file_no`(text, unique per hospital) · `completion_status`(enum: open/deficient/complete/archived) ·
  `deficiencies`(jsonb) · `coded_by`(uuid, nullable) FK · `retention_until`(date) · `coded_at`(ts) · soft-delete.
  *Medical-records completion/deficiency + retention.*
- **mrd_coding** — `id`(uuid) PK · `mrd_record_id`(uuid) FK · `icd_code_id`(uuid) FK · `rank`(int: primary/
  secondary) · `coded_by`(uuid) FK · **(mrd_record_id, icd_code_id, rank) unique**. *Encounter↔ICD coding join.*
- **tariff** — `id`(uuid) PK · `hospital_id`(uuid) FK · `name`(text) · `scheme`(text: cash/cghs/echs/tpa/corporate/
  pmjay) · `service_code`(text) · `service_name`(text) · `rate_paise`(bigint) · `currency`(char3) ·
  `valid_from`(date) · `valid_to`(date) · `is_active`(bool). *Service-rate master per scheme (integer paise).*
- **bill_package** — `id`(uuid) PK · `hospital_id`(uuid) FK · `name`(text) · `procedure_name`(text) ·
  `icd_code_id`(uuid, nullable) FK · `scheme`(text: cash/tpa/pmjay) · `package_price_paise`(bigint) · `currency`(char3)
  · `inclusions`(jsonb) · `exclusions`(jsonb) · `los_days`(int) · `is_active`(bool). *Fixed-price surgical/treatment
  package.*
- **advance_payment** — `id`(uuid) PK · `hospital_id`(uuid) FK · `admission_id`(uuid) FK · `payment_id`(uuid,
  nullable) FK · `amount_paise`(bigint) · `currency`(char3) · `mode`(text: cash/upi/card/bank) · `status`(enum:
  received/adjusted/refunded) · `received_at`(ts). *Deposit/advance against an IPD stay; adjusted into the final
  bill.*
- **hospital_bill** — `id`(uuid) PK · `bill_no`(text, unique) · `hospital_id`(uuid) FK · `encounter_id`(uuid) FK ·
  `admission_id`(uuid, nullable) FK · `patient_id`(uuid) FK · `bill_type`(enum: opd/interim/final) · `scheme`(text:
  cash/tpa/corporate/pmjay) · `bill_package_id`(uuid, nullable) FK · `gross_paise`(bigint) · `discount_paise`(bigint)
  · `discount_justification`(text, mandatory when discount>0) · `tax_paise`(bigint) · `advance_adjusted_paise`(bigint)
  · `payable_paise`(bigint) · `currency`(char3) · `status`(enum: draft/provisional/finalised/paid/partially_paid/
  cancelled) · `gstin`(text) · `file_id`(uuid) · `finalised_at`(ts) · soft-delete. *Interim/final IPD + OPD bill
  (1—* `bill_line`).*
- **bill_line** — `id`(uuid) PK · `hospital_bill_id`(uuid) FK · `tariff_id`(uuid, nullable) FK · `clinical_order_id`
  (uuid, nullable) FK · `category`(text: bed/consultation/procedure/investigation/pharmacy/consumable/ot/package) ·
  `description`(text) · `quantity`(int) · `unit_price_paise`(bigint) · `discount_paise`(bigint) · `tax_paise`(bigint)
  · `line_total_paise`(bigint) · `currency`(char3). *Itemised charge line.*
- **pre_authorization** — `id`(uuid) PK · `hospital_id`(uuid) FK · `admission_id`(uuid) FK · `patient_id`(uuid) FK ·
  `payer_type`(enum: tpa/insurer/corporate/pmjay) · `payer_id`(uuid, nullable) FK · `policy_no`(text) ·
  `consent_id`(uuid) FK · `bill_package_id`(uuid, nullable) FK · `requested_paise`(bigint) · `approved_paise`(bigint)
  · `currency`(char3) · `status`(enum: requested/queried/approved/partially_approved/rejected/enhanced) ·
  `documents`(jsonb) · `requested_at`(ts) · `decided_at`(ts) · soft-delete. *Cashless pre-auth (1—* `tpa_claim`);
  consented sharing.*
- **tpa_claim** — `id`(uuid) PK · `hospital_id`(uuid) FK · `pre_authorization_id`(uuid, nullable) FK ·
  `hospital_bill_id`(uuid, nullable) FK · `payer_id`(uuid) FK · `claim_no`(text) · `claimed_paise`(bigint) ·
  `settled_paise`(bigint) · `disallowed_paise`(bigint) · `currency`(char3) · `status`(enum: submitted/queried/
  approved/settled/rejected/short_settled) · `documents`(jsonb) · `submitted_at`(ts) · `settled_at`(ts) ·
  soft-delete. *Cashless/TPA final claim → FHIR `Claim`.*
- **pmjay_claim** — `id`(uuid) PK · `hospital_id`(uuid) FK · `admission_id`(uuid) FK · `bill_package_id`(uuid) FK ·
  `pmjay_case_id`(text) · `hbp_package_code`(text) · `card_no`(text, encrypted) · `package_paise`(bigint) ·
  `approved_paise`(bigint) · `currency`(char3) · `status`(enum: initiated/preauth/in_treatment/claimed/approved/
  paid/rejected) · `documents`(jsonb) · `submitted_at`(ts) · soft-delete. *PM-JAY (Ayushman Bharat) package claim →
  FHIR `Claim`.*
- **formulary_item** — `id`(uuid) PK · `hospital_id`(uuid) FK · `medicine_id`(uuid, nullable) FK ·
  `composition_id`(uuid, nullable) FK · `generic_name`(text) · `formulary_class`(text) · `is_restricted`(bool) ·
  `restriction_note`(text) · `is_active`(bool) · unique (hospital_id, medicine_id). *Hospital formulary (extends
  Pharmacy master).*
- **ward_stock** — `id`(uuid) PK · `hospital_id`(uuid) FK · `ward_id`(uuid) FK · `formulary_item_id`(uuid, nullable)
  FK · `inventory_item_id`(uuid, nullable) FK · `batch_id`(uuid, nullable) FK · `quantity`(int) · `par_level`(int) ·
  `updated_at`(ts). *Ward-level pharmacy/consumable stock (links Inventory `inventory_batches`).*
- **drug_indent** — `id`(uuid) PK · `hospital_id`(uuid) FK · `ward_id`(uuid) FK · `requested_by`(uuid) FK ·
  `indent_no`(text, unique per hospital) · `status`(enum: requested/approved/issued/partially_issued/rejected/
  cancelled) · `items`(jsonb) · `requested_at`(ts) · `issued_at`(ts) · `issued_by`(uuid, nullable) FK · soft-delete.
  *Ward→pharmacy indent/issue (drives `ward_stock` + `stock_ledger`).*
- **duty_roster** — `id`(uuid) PK · `hospital_id`(uuid) FK · `staff_user_id`(uuid) FK · `ward_id`(uuid, nullable) FK
  · `department`(text) · `role`(text: doctor/nurse/technician/on_call) · `shift`(enum: morning/evening/night/full) ·
  `shift_start`(ts) · `shift_end`(ts) · `is_on_call`(bool) · `status`(text: scheduled/swapped/leave) · soft-delete.
  *Staff/clinician duty roster + on-call (attendance link).*

### Quality (NABL)
*Owner: Lab Quality (NABL).*
- **qc_runs** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `test_id`(uuid) FK · `instrument`(text) ·
  `level`(text) · `lot_no`(text) · `target`/`sd`(numeric) · `run_at`(ts). *IQC run header.*
- **lj_points** — `id`(uuid) PK · `qc_run_id`(uuid) FK · `value`(numeric) · `z_score`(numeric) ·
  `westgard_flag`(text, nullable) · `at`(ts). *Levey-Jennings point + Westgard rule eval.*
- **eqas_records** — `id`(uuid) PK · `diagnostic_center_id`(uuid) FK · `test_id`(uuid) FK · `cycle`(text) ·
  `submitted_value`(numeric) · `peer_mean`(numeric) · `z_score`(numeric) · `outcome`(text). *External QA.*

### Expenses
*Owner: Expenses.*
- **expense_categories** — `id`(uuid) PK · `org_type`(enum) · `org_id`(uuid) · `name`(text: rent/salaries/
  utilities/reagents/maintenance/petty_cash/misc).
- **expenses** — `id`(uuid) PK · `org_type`(enum) · `org_id`(uuid) · `branch_id`(uuid, nullable) FK ·
  `category_id`(uuid) FK · `amount_paise`(bigint) · `mode`(text: cash/upi/bank) · `payee`(text) · `note`(text) ·
  `incurred_at`(ts) · `entered_by`(uuid) FK.

### Platform (notifications, audit, disputes, infra)
*Owner: Notifications, Audit & Admin, shared platform.*
- **notification_templates** — `id`(uuid) PK · `code`(text, unique) · `channel`(enum: push/sms/whatsapp/email/
  in_app) · `locale`(text) · `subject`(text) · `body`(text, `{{vars}}`) · `provider_template_id`(text, WhatsApp/
  DLT) · `is_active`(bool).
- **notifications** — `id`(uuid) PK · `user_id`(uuid) FK · `channel`(enum) · `template_code`(text) ·
  `payload`(jsonb) · `status`(enum: queued/sent/delivered/read/failed) · `provider_msg_id`(text) · `error`(text) ·
  `sent_at`/`read_at`(ts). *Append-heavy; partition by month.*
- **notification_prefs** — `user_id`(uuid) PK FK · `push_enabled`/`sms_enabled`/`whatsapp_enabled`/`email_enabled`
  (bool) · `marketing_opt_in`(bool) · `quiet_hours`(jsonb).
- **device_tokens** — `id`(uuid) PK · `user_id`(uuid) FK · `platform`(text: ios/android/web) · `token`(text) ·
  unique (user_id, token). *FCM push targets.*
- **files** — `id`(uuid) PK · `owner_user_id`(uuid, nullable) FK · `bucket`(text) · `object_key`(text) ·
  `mime_type`(text) · `size_bytes`(bigint) · `checksum`(text) · `is_sensitive`(bool). *S3-compatible
  (provider-agnostic, India-region) object references.*
- **audit_logs** — `id`(uuid) PK · `actor_user_id`(uuid, nullable) FK · `action`(text) · `entity_type`(text) ·
  `entity_id`(uuid) · `before`(jsonb) · `after`(jsonb) · `prev_hash`(text) · `hash`(text) · `ip`(inet) · `at`(ts).
  *Append-only, hash-chained; partition by month.*
- **disputes** — `id`(uuid) PK · `raised_by_user_id`(uuid) FK · `subject_type`(text: payment/report/order/visit) ·
  `subject_id`(uuid) · `description`(text) · `status`(enum: open/under_review/resolved/rejected) ·
  `resolution`(text) · `resolved_by`(uuid, nullable) FK. ***`subject_type` has no `commission` value*** (the prior
  schema's commission dispute path is removed).
- **reviews** — `id`(uuid) PK · `author_user_id`(uuid) FK · `subject_type`(text: doctor/lab/pharmacy) ·
  `subject_id`(uuid) · `rating`(int 1–5) · `comment`(text). *Ratings feed `rating` columns.*
- **outbox_event** — `id`(uuid) PK · `aggregate_type`(text) · `aggregate_id`(uuid) · `event_type`(text) ·
  `payload`(jsonb) · `status`(text: pending/relayed/failed) · `relayed_at`(ts). *Transactional outbox; relay →
  Kafka; partition by month.*
- **idempotency_key** — `key`(text) PK · `scope`(text) · `org_id`(uuid, nullable) · `result_ref`(text) ·
  `created_at`(ts). *Dedupes webhooks/commands (e.g. duplicate Razorpay webhook → no-op 200).*

---

## Compliance note (READ — this is load-bearing)

**There are NO commission tables and NO referral-payout columns anywhere in this schema.** The prior MediCircle DB
design (§4, §8) shipped `commission_agreements`, `commission_rules`, `commission_ledger`, per-order
`commission_total_paise` / per-item `commission_*` columns, `payment_purpose`/`ledger_status` commission flows, and
`payouts` driven by that ledger. **All of these are removed**, consistent with the NMC 2023 fee-splitting ban and
MediCircle's own §8 market-research recommendation to drop RMP commissions
([medicircle-reconciliation.md](../medicircle-reconciliation.md) §3, ADR-007 / ADR-010).

Specifically:
- `doctor_lab_associations` remain **analytics/relationship links only** — a doctor↔lab association carries **no
  money owed**. Referral **volume/revenue generated** is reported via CQRS `mv_*` read models (Analytics/MIS),
  **never as a payable**.
- The **only** lawful money-to-a-professional path is **`professional_service_contracts`** with
  `basis ∈ {fixed, per_service}` (the enum **excludes `per_referral`**), settled via **`service_engagements`** that
  must reference a **service actually rendered** (a report read, a study reported, a consult delivered) — not a
  referred patient. `is_also_referrer = true` flags the contract for **compliance review**, never auto-payment.
- `payouts` exist **only** for home-care professional payouts and **lawful B2B** settlement (institution-as-buyer);
  they are never wired to referrals. `b2b_agreements` bill institutions as buyers — never per-referral.
- `health_packages` are **lab-owned** with **no `commission_*` columns**; `disputes.subject_type` has **no
  `commission` value**.

Money is **integer paise** (`bigint`, INR) throughout — no floats/decimals for monetary amounts. All sensitive
mutations are hash-chained in `audit_logs`; consent (`consents`) gates AI, sharing, and marketing under DPDP.
