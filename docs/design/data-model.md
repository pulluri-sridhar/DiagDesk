# DiagDesk — Data Model (Schema & Relationships)

*MVP-core PostgreSQL schema. Companion to [HLD.md](HLD.md) / [LLD.md](LLD.md). Tables are **owned by the
service** that manages them (database-per-service) — grouped here for one coherent view.*

### Conventions
- **PK:** `uuid` (UUIDv7/ULID — edge-safe). **Tenancy:** every tenant-scoped table has `tenant_id uuid` (+
  `branch_id` where relevant) with **Row-Level Security** filtering on the verified JWT claim.
- Timestamps `timestamptz`; soft-delete via `deleted_at` where needed; `created_at`/`updated_at` on all tables.
- Money: `numeric(12,2)`. JSONB for flexible/FHIR payloads. Standard indexes on every FK + common lookups.
- **Compliance:** there are **no commission/payout tables or columns** anywhere. `referring_doctor` is a
  referral **source** for analytics only ([ADR-007](../adr/007-no-referral-commission-tooling.md)).
- **Built for scale (see [scalability-and-data-at-scale.md](scalability-and-data-at-scale.md)):** the schema is
  **sharding-ready** (`tenant_id` is the Citus distribution column — a tenant co-locates on one shard),
  **partition-ready** (append-heavy tables — `order`, `sample_event`, `result_value`, `report_delivery`,
  `payment`, `invoice_line`, `notification`, `audit_log`, `outbox_event` — are **monthly RANGE partitions**),
  and **replica/CQRS-ready** (events → read models / ClickHouse). UUIDv7 PKs keep inserts append-friendly.
  Indexes are `tenant_id`-leading composites (+ partial/BRIN) to align with RLS, sharding and pruning.

### Entity-relationship diagram
![ERD](diagrams/11-erd.png)

---

## Relationships (FK summary)
- `tenant` 1—* `branch`, `app_user`, `patient`, `referring_doctor`, `b2b_partner`, `test`, `rate_card`, `invoice`, `audit_log`
- `app_user` *—* `role` via `user_role` (scoped by `branch_id`)
- `b2b_partner` 1—1 `b2b_account`; `b2b_account` 1—* `b2b_receivable`
- `test_panel` *—* `test` via `panel_item`; `test` 1—* `reference_range`; `rate_card` 1—* `rate_card_item` → `test`
- `patient` 1—* `order`; `order` →(opt) `referring_doctor` (source), `b2b_partner`; `order` 1—* `order_item` → `test`
- `order` 1—* `sample` 1—* `sample_event`; `order_item` 1—* `result` 1—* `result_value`; `result` 1—* `validation`
- `order` 1—* `report` 1—* `report_delivery`; `order` 1—1 `invoice` 1—* `invoice_line`/`payment`
- `invoice` 1—* `b2b_receivable` (B2B payer); `patient` 1—* `consent`

---

## Data dictionary (MVP core)

### Tenancy & platform
**tenant** — `id` PK · `name` · `region` (India) · `plan` · `created_at`
**branch** — `id` PK · `tenant_id` FK · `name` · `type` (collection/hub) · `address` · `pincode`
**app_user** — `id` PK · `tenant_id` FK · `email` · `phone` · `kc_subject` (Keycloak) · `status`
**role** — `id` PK · `tenant_id` FK · `name` · `permissions` jsonb
**user_role** — `user_id` FK · `role_id` FK · `branch_id` FK *(composite PK)*
**consent** — `id` PK · `tenant_id` FK · `patient_id` FK · `purpose` · `status` · `lang` · `at`
**audit_log** — `id` PK · `tenant_id` FK · `entity` · `entity_id` · `action` · `actor_id` · `prev_hash` ·
  `hash` · `payload` jsonb · `at` *(append-only, hash-chained)*
**notification** — `id` PK · `tenant_id` FK · `channel` · `template` · `to` · `status` · `at`
**idempotency_key** — `key` PK · `tenant_id` · `scope` · `result_ref` · `created_at`
**outbox_event** — `id` PK · `aggregate` · `type` · `payload` jsonb · `published` bool · `created_at`

### Master data
**test** — `id` PK · `tenant_id` FK · `code` · `name` · `department` · `specimen_type_id` FK · `method` ·
  `tat_hours` · `gst_rate` · `active`
**test_panel** — `id` PK · `tenant_id` FK · `name` · `active`
**panel_item** — `panel_id` FK · `test_id` FK *(composite PK)*
**reference_range** — `id` PK · `test_id` FK · `analyte` · `sex` · `age_min` · `age_max` · `low` · `high` ·
  `critical_low` · `critical_high` · `unit`
**specimen_type** — `id` PK · `tenant_id` FK · `name`
**container** — `id` PK · `tenant_id` FK · `name` · `color`
**rate_card** — `id` PK · `tenant_id` FK · `name` · `scheme` (default/CGHS/ECHS/TPA/B2B) · `branch_id` FK (nullable)
**rate_card_item** — `rate_card_id` FK · `test_id` FK · `price` *(composite PK)*
**report_template** — `id` PK · `tenant_id` FK · `name` · `department` · `layout` jsonb

### Parties
**patient** — `id` PK · `tenant_id` FK · `mpi_no` · `name` · `age` · `sex` · `phone` · `email` · `abha`
  (nullable) · `address` · `pincode`
**referring_doctor** *(referral SOURCE — analytics only; **no payout/commission columns**)* — `id` PK ·
  `tenant_id` FK · `name` · `speciality` · `phone` · `clinic` · `note`
**b2b_partner** — `id` PK · `tenant_id` FK · `name` · `type` (hospital/clinic/corporate/TPA/ref-lab) · `gstin` · `contact`
**b2b_account** — `id` PK · `partner_id` FK · `rate_card_id` FK · `credit_limit` · `billing_cycle_days` · `status`

### Orders & samples
**order** — `id` PK · `tenant_id` FK · `branch_id` FK · `patient_id` FK · `referring_doctor_id` FK (nullable,
  source) · `b2b_partner_id` FK (nullable) · `status` · `ordered_at`
**order_item** — `id` PK · `order_id` FK · `test_id` FK · `price` · `status`
**sample** — `id` PK · `order_id` FK · `barcode` · `container_id` FK · `status` · `collected_at`
**sample_event** — `id` PK · `sample_id` FK · `event` (collected/received/in_process/rejected) · `reason_code`
  · `actor_id` · `at`
**accession** — `id` PK · `order_id` FK · `accession_no` · `at`

### Results & reports
**result** — `id` PK · `order_item_id` FK · `status` · `source` (analyzer/manual) · `instrument`
**result_value** — `id` PK · `result_id` FK · `analyte` · `value` · `unit` · `flag` (H/L/critical) · `delta`
**validation** — `id` PK · `result_id` FK · `validated_by` FK · `level` (tech/pathologist) · `remark` · `at`
**report** — `id` PK · `order_id` FK · `state` (preliminary/final) · `pdf_uri` · `signature` · `version`
**report_delivery** — `id` PK · `report_id` FK · `channel` (whatsapp/sms/email) · `status` · `at`

### Billing (incl. compliant B2B)
**invoice** — `id` PK · `tenant_id` FK · `order_id` FK · `subtotal` · `discount` · `gst` · `total` · `due` ·
  `payer_type` (b2c/b2b) · `b2b_account_id` FK (nullable)
**invoice_line** — `id` PK · `invoice_id` FK · `test_id` FK · `price` · `gst_rate`
**payment** — `id` PK · `invoice_id` FK · `mode` (cash/upi/card/partial) · `amount` · `ref` · `at`
**b2b_receivable** — `id` PK · `b2b_account_id` FK · `invoice_id` FK · `amount` · `days_overdue` · `status`

---

## V1 / V2 tables (described — schema'd when those phases start)
- **Quality:** `qc_run`, `lj_point` (Levey-Jennings), `eqas_record`, `controlled_doc`.
- **Inventory:** `inventory_item`, `stock_ledger`, `purchase_order`, `supplier`.
- **Booking/Home-collection:** `appointment`, `home_collection_visit`, `phlebotomist`, `route`.
- **Analytics (CQRS read models):** `mv_revenue`, `mv_tat`, `mv_referral_source` *(volume/revenue **generated**
  by source — never a payout)*.
- **Interop (V2):** `abha_link`, `fhir_resource`, `nhcx_claim`. **Radiology (V2):** `study`, `modality_worklist`,
  `radiology_report`, `pcpndt_form_f`.
- **Biomedical waste (V2):** `bmw_log`.

All extension tables follow the same conventions (tenant_id + RLS, UUIDv7 PKs, audit) and **never** introduce
commission/payout fields.
