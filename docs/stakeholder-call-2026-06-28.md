# DiagDesk — Stakeholder Call Notes & Requirements Traceability (2026-06-28)

*Call with the key stakeholder — a diagnostic-center owner (primary end user). Captures 22 operational
requirements from their day-to-day running of a lab, plus two screenshots of their **current** legacy portal,
and maps each requirement to where it is now addressed in the planning docs + schema + roadmap phase.*

> **Phase:** Planning only — these are doc/design changes, not application code.

---

## Inputs from the call

### Screenshot A — an echocardiography report (their current report output)
Used **only as a design reference** for the report **letterhead / stationery + structured-fields + signature**
requirement (#16/#17). Observations folded into the design:
- **Letterhead** = colour logo + centre name + tagline at the top; **footer** = address + phone + email band.
- **Body** = structured clinical fields (chambers, valves, measurements with units), an **Impression** block,
  and a **signing doctor block** (name, qualifications, designation) with a **hand-signature** image.
- Implication: report templates must support a saved **letterhead/stationery**, structured measurement fields,
  an impression/notes section, and an authorised-signatory block with a digital/scanned signature.

> ⚠️ **PHI:** the screenshot contains a **real patient name and a real clinic identity**. It is **NOT committed**
> to this repository. Only the textual template/letterhead spec derived from it is recorded here.

### Screenshot B — "User Acc.Details" (their current RBAC screen)
No PHI. Used as the source for the **granular permission catalogue** (#6) — see
[rbac-permissions.md](rbac-permissions.md). Notable per-feature toggles observed: user type
(Non-Financial / Financial / Admin), Use Discount Limit + Disc Limit %, Allow Post Discount, Allow Test-name
Changing, Allow Test-rate Changing, Allow Referral-name Editing in Registration, Allow Master Reports, Allow
Referral Payment Reports, Allow Money Collections Reports, Allow Printing Reports for Due Patients, Allow
Expenses Reports, Allow Today User Collection, Allow Today Bill Register, Allow Crystal/Word/Standard Report
Format Editing After Printing, Allow LoyaltyCards Editing, Allow Date Changing in Registration, View Financial
Reports upto N Days, Allow Financial Reports Only.

> Note: the legacy "Allow **Referral Payment** Reports" toggle reflects the (now-illegal) commission practice.
> DiagDesk replaces it with **compliant referral economics** — see #19 below and
> [adr/010-compliant-referral-economics.md](adr/010-compliant-referral-economics.md).

---

## Decisions taken on the call
1. **#19 Referral payments → "compliant referral economics."** Model only the **legal** money flows — (i) genuine
   B2B/wholesale where the doctor/clinic **is the buyer**, and (ii) **professional-services contracts** (e.g. a
   consultant pathologist / teleradiology read paid for services actually rendered). Per-patient / %-of-bill
   commission stays **forbidden and guardrail-blocked**. Extends [ADR-007](adr/007-no-referral-commission-tooling.md),
   does not weaken it.
2. **#22 MediCircle → dedicated strategy + ADR** (ecosystem of Doctors, Pharmacies, Diagnostic Centers, Home
   Care; V3 horizon) — [medicircle-vision.md](medicircle-vision.md), [ADR-009](adr/009-medicircle-platform-direction.md).
3. **MVP pull-ins:** Inventory + test-kit + thresholds (#1/#3/#4), Expense management (#7), and Granular RBAC +
   letterhead + report-handover (#6/#16/#12/#13) move from V1 into **MVP**.
4. **#21 Biometric → both** device biometric (passkeys/WebAuthn) **and** a planned hardware fingerprint-scanner
   integration; alongside Email-OTP and Authenticator-app (TOTP) MFA.

---

## Requirements traceability matrix

| # | Requirement | How DiagDesk addresses it | Where (doc · schema) | Phase |
|---|---|---|---|---|
| 1 | **Inventory management** (a big challenge) | Reagent/consumable master + stock ledger (receipt/issue/consumption); expiry & batch/lot tracking | features §14 · `inventory_item`, `stock_ledger` | **MVP** |
| 2 | **NABL reference for standard tests + range values** | Global **NABL test catalogue** seeds tests + reference/critical ranges (age/sex/method) | features §2.1/§15 · `nabl_test_catalog`, `reference_range` | **MVP** |
| 3 | **Test-kit size — tests doable per kit (10/100)** | `test_kit` with **`tests_per_kit`**; each test run **decrements** remaining; lot/expiry | features §14.2 · `test_kit`, `stock_ledger` | **MVP** |
| 4 | **Threshold alert for stock availability** | Per-item **`reorder_threshold`** → low-stock alert + reorder requisition | features §14.4 · `inventory_item.reorder_threshold` | **MVP** |
| 5 | **WhatsApp reports — manual initiation** | Report delivery is **staff-initiated** (a "Send on WhatsApp" action), not auto-push; status tracked | features §10.4 · `report_delivery` | **MVP** |
| 6 | **RBAC — owner decides features at account creation** | Granular per-feature **permission catalogue** + per-user overrides, set by owner when creating the user | [rbac-permissions.md](rbac-permissions.md), [ADR-008](adr/008-granular-rbac-permissions.md) · `permission`, `role_permission`, `user_permission` | **MVP** |
| 7 | **Expense management (day-to-day, many scenarios)** | Expense entry with categories (rent, salaries, utilities, reagents, maintenance, petty cash…), expense reports | features §16.2 · `expense`, `expense_category` | **MVP** |
| 8 | **Discount at registration + mandatory free-text justification** | Discount field at registration requires a **justification** (free text) + approver; audit-logged | features §6.5 · `invoice.discount_justification` | **MVP** |
| 9 | **Department-wise financial reports** | `department` entity; tests carry `department_id`; finance MIS sliceable by department | features §16.6/§17 · `department`, `test.department_id` | **MVP→V1** |
| 10 | **Number of prints per report visible** | Each print increments `report.print_count` and writes a print-log row (who/when/copies) | features §10.7 · `report.print_count`, `report_print_log` | **MVP** |
| 11 | **Complete audit log per transaction/investigation/patient** | Existing hash-chained `audit_log` for every stateful action + **per-patient / per-investigation audit views** | features §15.4 · `audit_log` | **MVP** |
| 12 | **Track whether report handed over to patient** | `report_handover` records handover (who/when/method) | features §10.7 · `report_handover` | **MVP** |
| 13 | **Barcode scan at report handover** | Handover captured by scanning the report/accession barcode → marks "handed over" | features §10.7 · `report_handover.scanned_barcode` | **MVP** |
| 14 | **Create departments, users, tests, doctors, etc.** | Master-data management UIs incl. a new **Departments** master | features §1/§2 · `department`, `app_user`, `test`, `referring_doctor` | **MVP** |
| 15 | **NABL master list → pick performed tests + create custom** | Pick from the global NABL catalogue into the lab's test master; create **custom non-NABL** tests (`is_custom`) | features §2.1 · `nabl_test_catalog`, `test.is_custom`, `test.nabl_ref` | **MVP** |
| 16 | **Letterhead/stationery + inline-editable print preview** | Saved `report_stationery` (header/footer/logo); preview = actual report **with** letterhead, **inline-editable** before sign/print | features §10.1 · `report_stationery`, `report_template.layout` | **MVP** |
| 17 | **Report → owner/pathologist review + digital signature** | Review queue → multi-level sign-off state machine on `report.state`; signature applied at sign-off | features §9.4/§10.1 · `report.reviewed_by/signed_by/signature` | **MVP** |
| 18 | **Health package creation** | Packages of tests with package pricing | features §2.2 · `health_package`, `health_package_item` | **V1** |
| 19 | **Show doctor referral payments (legally)** | **Compliant referral economics** — money only to a buyer (B2B) or for genuine professional services; per-patient commission blocked; referral **activity statements** (analytics, no payout) | features §13 · `professional_service_contract`, `service_engagement`; [ADR-010](adr/010-compliant-referral-economics.md) | **V1** |
| 20 | **Local and cloud backups** | Edge local backup + managed cloud DBaaS HA/PITR; documented RPO/RTO + export | features §19.9 · (infra) ADR-004 | **MVP** |
| 21 | **Biometric / Email-OTP / Authenticator-app MFA for staff** | Email-OTP + TOTP authenticator + biometric (passkeys **and** hardware fingerprint scanners) | features §1.5 · [ADR-001](adr/authentication.md) | **MVP** (scanners V1) |
| 22 | **MediCircle — Doctors + Pharmacies + Diagnostic Centers + Home Care ecosystem** | Dedicated ecosystem strategy + ADR; DiagDesk is node 1 | [medicircle-vision.md](medicircle-vision.md), [ADR-009](adr/009-medicircle-platform-direction.md) | **V3** |

---

## Phasing impact (re-phase vs prior roadmap)
- **Pulled into MVP** (were V1): inventory + test-kit + reorder thresholds (#1/#3/#4), expense management (#7),
  granular RBAC (#6), letterhead/stationery + inline preview (#16), report-handover + barcode (#12/#13),
  discount-at-registration + justification (#8), print-count (#10), backup/DR detail (#20). NABL-catalogue
  picker + Departments master are foundational and sit in MVP too.
- **Stays V1:** health packages (#18), department-wise finance dashboards (#9), professional-service-contract
  referral economics + activity statements (#19), purchase orders/suppliers, hardware fingerprint-scanner
  integration (#21).
- **New V3 horizon:** MediCircle (#22).

See [roadmap.md](roadmap.md), [features.md](features.md), [design/data-model.md](design/data-model.md), and the
new ADRs for the detail.
