# DiagDesk — Data Model (Schema & Relationships)

*MVP-core PostgreSQL schema. Companion to [HLD.md](HLD.md) / [LLD.md](LLD.md). Tables are **owned by the
service** that manages them (database-per-service) — grouped here for one coherent view.*

### Conventions
- **PK:** `uuid` (UUIDv7/ULID — edge-safe). **Tenancy:** every tenant-scoped table has `tenant_id uuid` (+
  `branch_id` where relevant) with **Row-Level Security** filtering on the verified JWT claim.
- Timestamps `timestamptz`; soft-delete via `deleted_at` where needed; `created_at`/`updated_at` on all tables.
- Money: `numeric(12,2)`. JSONB for flexible/FHIR payloads. Standard indexes on every FK + common lookups.
- **Compliance:** there are **no referral-commission/payout tables or columns** anywhere. `referring_doctor` is a
  referral **source** for analytics only ([ADR-007](../adr/007-no-referral-commission-tooling.md)). Legitimate
  professional payments use `professional_service_contract` on a **`fixed`/`per_service`** basis (never
  per-referral) — [ADR-010](../adr/010-compliant-referral-economics.md).
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
- `tenant` 1—* `branch`, `app_user`, `patient`, `referring_doctor`, `b2b_partner`, `test`, `rate_card`, `invoice`, `audit_log`, `department`, `permission`
- `app_user` *—* `role` via `user_role` (scoped by `branch_id`); `role` *—* `permission` via `role_permission`; `app_user` 1—* `user_permission` (override) → `permission`
- `department` 1—* `test` (`test.department_id`); `nabl_test_catalog` 1—* `test` (`test.nabl_ref`, nullable; `test.is_custom` for non-NABL)
- `b2b_partner` 1—1 `b2b_account`; `b2b_account` 1—* `b2b_receivable`
- `test_panel` *—* `test` via `panel_item`; `test` 1—* `reference_range`; `rate_card` 1—* `rate_card_item` → `test`; `health_package` 1—* `health_package_item` → `test`
- `patient` 1—* `order`; `order` →(opt) `referring_doctor` (source), `b2b_partner`; `order` 1—* `order_item` → `test`
- `order` 1—* `sample` 1—* `sample_event`; `order_item` 1—* `result` 1—* `result_value`; `result` 1—* `validation`
- `order` 1—* `report` 1—* `report_delivery`/`report_print_log`/`report_handover`; `report_template` 1—* `report`; `report_stationery` 1—* `report_template`
- `order` 1—1 `invoice` 1—* `invoice_line`/`payment`; `invoice` 1—* `b2b_receivable` (B2B payer); `patient` 1—* `consent`
- `inventory_item` 1—* `stock_ledger`; `inventory_item` 1—1 `test_kit` (kit items); `expense_category` 1—* `expense`
- `professional_service_contract` 1—* `service_engagement` (paid for services rendered, never per-referral)

---

## Data dictionary (MVP core)

### Tenancy & platform
**tenant** — `id` PK · `name` · `region` (India) · `plan` · `created_at`
**branch** — `id` PK · `tenant_id` FK · `name` · `type` (collection/hub) · `address` · `pincode`
**app_user** — `id` PK · `tenant_id` FK · `email` · `phone` · `kc_subject` (Keycloak) · `status` ·
  `user_type` (non_financial/financial/admin/owner) · `view_financial_reports_days` int · `discount_limit_pct`
**role** — `id` PK · `tenant_id` FK · `name` · `permissions` jsonb *(baseline)*
**user_role** — `user_id` FK · `role_id` FK · `branch_id` FK *(composite PK)*
**permission** — `key` PK · `label` · `category` · `value_type` (bool/int/text) *(catalogue — see [rbac-permissions.md](../rbac-permissions.md))*
**role_permission** — `role_id` FK · `permission_key` FK · `value` (nullable) *(composite PK)*
**user_permission** — `user_id` FK · `permission_key` FK · `effect` (grant/revoke) · `value` (nullable) *(composite PK — per-user override)*
**consent** — `id` PK · `tenant_id` FK · `patient_id` FK · `purpose` · `status` · `lang` · `at`
**audit_log** — `id` PK · `tenant_id` FK · `entity` · `entity_id` · `action` · `actor_id` · `prev_hash` ·
  `hash` · `payload` jsonb · `at` *(append-only, hash-chained)*
**notification** — `id` PK · `tenant_id` FK · `channel` · `template` · `to` · `status` · `at`
**idempotency_key** — `key` PK · `tenant_id` · `scope` · `result_ref` · `created_at`
**outbox_event** — `id` PK · `aggregate` · `type` · `payload` jsonb · `published` bool · `created_at`

### Master data
**department** — `id` PK · `tenant_id` FK · `name` · `code` *(biochem/haematology/micro/pathology/radiology…)*
**nabl_test_catalog** *(GLOBAL — not tenant-scoped; seeds the test master)* — `id` PK · `code` · `name` ·
  `department` · `method` · `loinc` (nullable) · `default_ranges` jsonb
**test** — `id` PK · `tenant_id` FK · `code` · `name` · `department_id` FK · `specimen_type_id` FK · `method` ·
  `tat_hours` · `gst_rate` · `active` · `is_custom` bool *(true = non-NABL, lab-created)* · `nabl_ref` FK→`nabl_test_catalog` (nullable)
**test_panel** — `id` PK · `tenant_id` FK · `name` · `active`
**panel_item** — `panel_id` FK · `test_id` FK *(composite PK)*
**health_package** — `id` PK · `tenant_id` FK · `name` · `price` · `active`
**health_package_item** — `package_id` FK · `test_id` FK *(composite PK)*
**reference_range** — `id` PK · `test_id` FK · `analyte` · `sex` · `age_min` · `age_max` · `low` · `high` ·
  `critical_low` · `critical_high` · `unit`
**specimen_type** — `id` PK · `tenant_id` FK · `name`
**container** — `id` PK · `tenant_id` FK · `name` · `color`
**rate_card** — `id` PK · `tenant_id` FK · `name` · `scheme` (default/CGHS/ECHS/TPA/B2B) · `branch_id` FK (nullable)
**rate_card_item** — `rate_card_id` FK · `test_id` FK · `price` *(composite PK)*
**report_stationery** — `id` PK · `tenant_id` FK · `branch_id` FK (nullable) · `header_html` · `footer_html` ·
  `logo_uri` · `margins` jsonb · `active` *(saved letterhead — preview renders the report on it, inline-editable)*
**report_template** — `id` PK · `tenant_id` FK · `name` · `department_id` FK · `stationery_id` FK · `layout` jsonb

### Parties
**patient** — `id` PK · `tenant_id` FK · `mpi_no` · `name` · `age` · `sex` · `phone` · `email` · `abha`
  (nullable) · `address` · `pincode`
**referring_doctor** *(referral SOURCE — analytics only; **no payout/commission columns**)* — `id` PK ·
  `tenant_id` FK · `name` · `speciality` · `phone` · `clinic` · `note`
**b2b_partner** — `id` PK · `tenant_id` FK · `name` · `type` (hospital/clinic/corporate/TPA/ref-lab) · `gstin` · `contact`
**b2b_account** — `id` PK · `partner_id` FK · `rate_card_id` FK · `credit_limit` · `billing_cycle_days` · `status`
**professional_service_contract** *(compliant — pays for SERVICES rendered, never per-referral; [ADR-010](../adr/010-compliant-referral-economics.md))* —
  `id` PK · `tenant_id` FK · `party_name` · `party_type` (consultant_pathologist/radiologist/other) ·
  `service_type` (reporting/consulting/teleradiology…) · `basis` (**fixed/per_service** — *no `per_referral`*) ·
  `rate` · `is_also_referrer` bool *(true → flagged for review, not auto-paid)* · `active`
**service_engagement** — `id` PK · `contract_id` FK · `service_ref` (report/study actually performed) ·
  `qty` · `amount` · `at` *(guardrail: must reference a rendered service, not a referred patient)*

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
**report** — `id` PK · `order_id` FK · `template_id` FK · `state` (draft/in_review/preliminary/final) ·
  `reviewed_by` FK (nullable) · `signed_by` FK (nullable) · `pdf_uri` · `signature` · `version` ·
  `print_count` int · `handover_status` (pending/handed_over)
**report_delivery** — `id` PK · `report_id` FK · `channel` (whatsapp/sms/email) · `initiated_by` FK *(manual send)* · `status` · `at`
**report_print_log** — `id` PK · `report_id` FK · `printed_by` FK · `copies` · `at` *(drives `report.print_count`)*
**report_handover** — `id` PK · `report_id` FK · `handed_to` · `method` (barcode/manual) · `scanned_barcode` (nullable) · `by_user` FK · `at`

### Billing (incl. compliant B2B)
**invoice** — `id` PK · `tenant_id` FK · `order_id` FK · `subtotal` · `discount` · `discount_justification` text
  *(mandatory when discount > 0)* · `discount_approved_by` FK (nullable, above-limit) · `gst` · `total` · `due` ·
  `payer_type` (b2c/b2b) · `b2b_account_id` FK (nullable)
**invoice_line** — `id` PK · `invoice_id` FK · `test_id` FK · `price` · `gst_rate`
**payment** — `id` PK · `invoice_id` FK · `mode` (cash/upi/card/partial) · `amount` · `ref` · `at`
**b2b_receivable** — `id` PK · `b2b_account_id` FK · `invoice_id` FK · `amount` · `days_overdue` · `status`

### Inventory & expenses (MVP — owner-flagged priorities)
**inventory_item** — `id` PK · `tenant_id` FK · `branch_id` FK · `name` · `category` · `unit` · `qty_on_hand` ·
  `reorder_threshold` *(low-stock alert trigger)* · `batch_no` · `expiry` · `supplier_id` FK (nullable)
**test_kit** — `id` PK · `tenant_id` FK · `inventory_item_id` FK · `name` · `tests_per_kit` int *(kit size, e.g. 10/100)* ·
  `tests_remaining` int · `lot_no` · `expiry` · `linked_test_id` FK (nullable)
**stock_ledger** — `id` PK · `tenant_id` FK · `inventory_item_id` FK · `txn` (receipt/issue/consumption/adjust) ·
  `qty` · `ref` *(e.g. test/order on consumption)* · `actor_id` FK · `at` *(append-only)*
**expense_category** — `id` PK · `tenant_id` FK · `name` *(rent/salaries/utilities/reagents/maintenance/petty_cash/misc)*
**expense** — `id` PK · `tenant_id` FK · `branch_id` FK · `category_id` FK · `amount` · `mode` (cash/upi/bank) ·
  `payee` · `note` · `incurred_at` · `entered_by` FK

---

## V1 / V2 tables (described — schema'd when those phases start)
- **Quality:** `qc_run`, `lj_point` (Levey-Jennings), `eqas_record`, `controlled_doc`.
- **Procurement (V1):** `supplier`, `purchase_order`, `po_item` (extends the MVP inventory tables above).
- **Booking/Home-collection:** `appointment`, `home_collection_visit`, `phlebotomist`, `route`.
- **Analytics (CQRS read models):** `mv_revenue`, `mv_tat`, `mv_referral_source` *(volume/revenue **generated**
  by source — never a payout)*, `mv_dept_finance` *(revenue/expense by `department`)*.
- **Interop (V2):** `abha_link`, `fhir_resource`, `nhcx_claim`. **Radiology (V2):** `study`, `modality_worklist`,
  `radiology_report`, `pcpndt_form_f`.
- **Biomedical waste (V2):** `bmw_log`.

All extension tables follow the same conventions (tenant_id + RLS, UUIDv7 PKs, audit) and **never** introduce
referral-commission/payout fields. The only money-to-a-professional path is `professional_service_contract`
(basis `fixed`/`per_service`), per [ADR-010](../adr/010-compliant-referral-economics.md).
