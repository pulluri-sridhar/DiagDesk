# MediCircle — Clinic Operations & Hospital Information System (HIS)

*Adds **Clinics** and **Hospitals** as first-class providers with their own deep requirements: a dedicated
**clinic-operations portal** and a **full Hospital Information System (HIS)** — in-patient (IPD), OT, wards/beds,
nursing, MRD, and cashless/TPA billing — alongside the existing OPD + connectivity. This is the **authoritative
spec**; `microservices.md`, `data-model.md`, `features.md`, `roadmap.md`, and `compliance.md` integrate it.*

> **Positioning.** MediCircle now offers **two new provider editions**: a **Clinic** edition (OPD operations) and a
> **Hospital** edition (full HIS). The HIS is **enterprise-scale** — effectively a product of its own, sold to
> NABH-track hospitals — so it runs as a **dedicated enterprise track**, not folded into the SMB R1–R3 timeline.
> MediCircle still supports **"integrate, don't rip-and-replace"**: a hospital may run the **full MediCircle HIS** or
> keep its existing HIS and connect via **HL7/FHIR** for orders/results/records. The DiagDesk **lab node is the
> in-house LIS**; Radiology **RIS/PACS** (V2) is the in-house radiology.

---

## 1. Clinic edition — operations portal (distinct from the solo-doctor portal)
For single- and multi-practitioner OPD clinics that need **clinic operations**, not just a doctor's personal portal:
- **Front desk & registration** — walk-in + appointment, UHID/MRN, MPI dedup.
- **Appointments + queue/token** — per practitioner/room; online booking; reminders; no-show handling.
- **Multi-practitioner scheduling** — rooms, slots, shared front desk, doctor rosters.
- **Consultation & records** — visit notes, vitals, e-prescription (reuses Consultations service), attachments.
- **Clinic billing** — OPD invoices/receipts (GST), consultation + procedure charges, discounts (with the anti-kickback
  guardrails + consent/RBAC already in the platform).
- **Clinic inventory** — consumables/vaccines (reuses the Inventory service: batch/expiry/FEFO/reorder).
- **Orders out** — tests to labs, e-prescription to pharmacy (reuses the connectivity layer).

## 2. Hospital edition — full HIS modules
The in-patient/enterprise requirements that the OPD layer does **not** cover:

| Module | Scope |
|---|---|
| **Patient Administration / ADT** | Registration (UHID), **Admission–Discharge–Transfer**, MLC, death register, encounter management (OPD/IPD/ER) |
| **Bed & Ward Management** | Ward/room/bed master, **real-time occupancy**, allocation/transfer, housekeeping/turnaround status |
| **OPD Management** | Hospital OPD clinics, appointments/queue, consultation, OPD billing (shares the Clinic module) |
| **IPD & Nursing** | In-patient encounter, **CPOE (doctor order entry)**, nursing assessments/notes, **eMAR (medication administration)**, vitals + **intake/output charts**, care plans, doctor rounds, referrals/cross-consults |
| **OT & Surgery** | OT **scheduling**, pre-op checklist, **anaesthesia record**, surgical/operative notes, implant & consumable tracking, post-op recovery |
| **Critical Care (ICU)** | ICU charts, ventilator/monitoring notes, scoring; (deep monitoring-device integration is an extension) |
| **Emergency / Casualty (ER)** | Triage, ER encounter, MLC, observation → admit/discharge |
| **Hospital Pharmacy & Formulary** | In-house pharmacy, **formulary**, ward indents/issue, drug administration link (eMAR), stock (extends Inventory + Pharmacy services) |
| **Hospital Lab & Radiology** | In-house **LIS = the DiagDesk lab node**; **RIS/PACS** (V2) for imaging; order→result round-trip with IPD/OPD |
| **Hospital Billing & TPA/Cashless** | **Tariff/package** plans, **deposits/advances**, interim + **final IPD bill**, corporate/insurance, **TPA pre-authorization + claims**, **PM-JAY**, refunds |
| **MRD & Clinical Coding** | **ICD-10/ICD-11** coding, **discharge summary**, record completion/deficiency tracking, retention, statutory registers |
| **Roster & Duty** | Staff/clinician duty rosters, on-call, attendance link |
| **Extensions (optional)** | **Blood Bank** (licensed), **CSSD**, **Diet/Kitchen**, **Ambulance/Bio-medical equipment**, mortuary |

**Encounter model:** one **`encounter`** spine (FHIR `Encounter`-aligned) unifies OPD · IPD · ER, linking orders,
notes, meds, bills, and the discharge summary.

## 3. New services (to add to `microservices.md` — Group G)
- **G1 Clinic Operations** — clinic front desk, appointments/queue, multi-practitioner scheduling, OPD billing, clinic inventory.
- **G2 Patient Administration & ADT** — registration/UHID, admission/transfer/discharge, encounter management.
- **G3 Bed & Ward Management** — ward/room/bed master, occupancy, allocation/transfer, housekeeping status.
- **G4 IPD & Nursing** — in-patient encounter, **CPOE**, nursing notes, **eMAR**, vitals/I-O charts, care plans, rounds.
- **G5 OT & Surgery** — OT scheduling, pre/post-op, anaesthesia + surgical notes, implant/consumable tracking.
- **G6 Hospital Billing & TPA/Cashless** — tariff/packages, advances, interim/final bills, **pre-auth + claims**, PM-JAY.
- **G7 MRD & Clinical Coding** — ICD coding, discharge summaries, record completion, retention, statutory registers.
- **G8 Hospital Pharmacy & Formulary** — formulary, ward indents/issue, drug administration link (extends Inventory/Pharmacy).
- **Reuses:** Lab node (LIS), Radiology RIS/PACS (V2), Consultations/e-prescription, Appointments/queue, Inventory,
  Insurance (claims), Identity/RBAC, Consent, Notifications, Audit, Billing.

## 4. Key data entities (to add to `data-model.md`)
`clinic`, `hospital` (extend orgs) · `encounter` (opd/ipd/er) · `admission` · `ward`, `room`, `bed`, `bed_allocation` ·
`clinical_order` (CPOE) · `nursing_note`, `vital_observation`, `intake_output`, `medication_administration` (eMAR) ·
`ot_schedule`, `ot_case`, `anaesthesia_record`, `surgical_note`, `implant_log` · `care_plan_ipd` · `appointment`,
`queue_token` · `discharge_summary`, `icd_code`, `mrd_record` · `tariff`, `bill_package`, `advance_payment`,
`hospital_bill`, `bill_line`, `pre_authorization`, `tpa_claim`, `pmjay_claim` · `formulary_item`, `ward_stock`,
`drug_indent` · `duty_roster` · *(optional)* `blood_unit`, `blood_request`. All follow platform conventions
(UUIDv7, **integer paise**, tenant/org-scoped RLS, soft-delete, audit, FHIR projection).

## 5. Core flows
- **Admission → IPD → discharge:** ER/OPD → **admit** (encounter + bed allocation + advance) → CPOE orders (lab/
  radiology/meds) → nursing **eMAR**/vitals → doctor rounds → **transfers** (ward/ICU) → **discharge summary** (ICD
  coded) → **final bill** (+ TPA/cashless) → bed freed.
- **OT case:** schedule → pre-op checklist → OT (anaesthesia + surgical notes + implants/consumables) → post-op/recovery → IPD.
- **Cashless / TPA claim:** estimate → **pre-authorization** to TPA/insurer → approval → treatment → **final claim** +
  documents → settlement; **PM-JAY** package linkage. (Consented sharing per the consent framework.)

## 6. Compliance (hospital-specific — to add to `compliance.md`)
- **NABH** accreditation support (hospital analogue of NABL) — quality, MRD, infection control artifacts.
- **Clinical Establishments Act** — the **hospital** registers as the clinical establishment; the **platform remains a
  technology enabler** and must **not** become the establishment/operator (per the §7.3 guardrails).
- **Hospital pharmacy** holds its **Drug Licence**; **Blood Bank** (if enabled) needs its **licence** + Drugs &
  Cosmetics compliance — platform intermediates, never holds.
- **PM-JAY / TPA / IRDAI** — cashless claims via the Insurance service; IRDAI line still applies (lead-gen vs intermediary).
- **PC-PNDT** (radiology), **Biomedical Waste Rules** (hospital BMW logs), **MLC / statutory registers**, DPDP/ABDM
  consent + **FHIR** for records exchange (already program-wide).
- AI stays **assistive-only with clinician sign-off**; CPOE/eMAR have full audit.

## 7. Phasing — a dedicated **Enterprise / Hospital HIS** track
The SMB go-to-market (R1–R3: labs, clinics, pharmacies, home-care) is **not** disrupted. The HIS is a parallel track:
- **Clinic edition** can ship **~R2** (it's close to the existing doctor portal + operations).
- **Hospital HIS (Enterprise / "R4+")** — ADT/bed → IPD/nursing/CPOE/eMAR → OT → hospital billing + TPA/cashless →
  MRD/coding → pharmacy/formulary, then ICU/ER/blood-bank extensions. Longer build, dedicated team, NABH-track buyers.
- Every hospital can choose **full HIS** *or* **HL7/FHIR integration** with its existing systems.

> This expands the program materially. The lab node, anti-kickback, provider-agnostic India-region hosting, and consent decisions all carry
> over unchanged; the HIS is additive, not a change to those.
