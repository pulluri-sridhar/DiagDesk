# DiagDesk — Roadmap & Architecture Sketch

*Phased plan. Timeframes are indicative and assume a small founding team.*

---

## Sequencing principle

A lab won't switch software for a single differentiating module — it must first **run daily operations** on
DiagDesk. So the MVP is the operational core (table stakes done well + offline-first), and the India-specific
**B2B & partner management** and **compliance** modules — what makes labs *stay* and what we *market* — land in
V1. Radiology and the ABDM/ecosystem layer are V2.

---

## MVP (0–4 months) — "Run the lab end to end, offline-resilient"

**Goal:** a lab can fully operate on DiagDesk from day one.

- **Lab Core (LIS):** patient registration, order entry, barcode/QR sample tracking, accessioning,
  multi-level result validation, configurable reports + digital signatures.
- **Analyzer interfacing** for the top ~10 analyzers (HL7/ASTM): Roche, Sysmex, Beckman, Erba, Mindray,
  Siemens, etc. — to eliminate manual transcription.
- **Billing:** cash/partial payments, dues tracking, discounts-with-approval, GST-aware invoicing
  (mixed exempt/taxable lines), day-end cash reconciliation.
- **Report delivery:** white-labeled **WhatsApp** (staff-initiated/manual) **+ SMS + email** + a basic patient
  portal; **saved letterhead/stationery** with an **inline-editable print preview**; **review → owner/pathologist
  sign-off**; **print-count** and **report-handover** (incl. **barcode scan at handover**).
- **Offline-first sync** — the key differentiator; registration, barcode printing, and billing must work
  during outages.
- **Basic multi-branch** support + **owner-defined granular RBAC** (per-feature permission catalogue set at
  user creation — [rbac-permissions.md](rbac-permissions.md)) + **Email-OTP / TOTP / passkey-biometric MFA**.
- **Master data incl. a NABL test-catalogue picker** (+ custom tests) and a **Departments** master.
- **Inventory (owner's big pain):** reagent/kit master with **`tests_per_kit`** consumption + **reorder-threshold
  low-stock alerts**; **expense management** (day-to-day, categorised); **discount at registration with mandatory
  justification**.
- **DPDP-compliant foundation:** consent capture, India-region hosting, tamper-evident audit logging
  (per-patient/per-investigation views), configurable retention, and **local + cloud backup/DR**.

**Exit criterion:** a Tier-2 standalone lab completes the full journey on DiagDesk —
register → collect → run (analyzer) → validate → report (WhatsApp) → bill → collect payment — with no gap.

---

## V1 (4–8 months) — "Win on India-specific money + compliance"

- **B2B & Partner management** (the differentiating wedge — *compliant, no commissions*): institutional rate
  contracts, B2B credit ledger + receivables aging with overdue alerts, reference-lab outsourcing,
  referral-source analytics (no payout), and a doctor/B2B engagement portal. (Paying referral commissions is
  illegal — see [compliance-anti-kickback.md](compliance-anti-kickback.md).)
- **Compliant referral economics:** **professional-services contracts** (pay for genuine services rendered, on a
  `fixed`/`per_service` basis — never per-referral) + **referral activity statements** (analytics, no payout) —
  [ADR-010](adr/010-compliant-referral-economics.md).
- **Rate-card manager:** per-branch, per-B2B-partner, per-scheme rate lists, including **CGHS TMS 2.0 tiered
  rates** and **TPA pre-auth** empanelment billing.
- **NABL QC module:** auto **Levey-Jennings charts**, Westgard rules, IQC/EQAS logs, sample-rejection tracking
  with reason codes, controlled-document versioning.
- **Procurement & health packages:** supplier management + purchase orders (on top of the MVP inventory core);
  **health-package creation**; **hardware fingerprint-scanner** integration.
- **Patient experience:** online booking, **home-collection logistics** (phlebotomist assignment + routing),
  **online payments**, recall/follow-up reminders.
- **MIS dashboards:** TAT, QC, and revenue **by branch and by department**.

---

## V2 (8–14 months) — "Unified diagnostics + ecosystem"

- **Radiology RIS + light PACS/teleradiology** — the unified Path+Radiology white space (one portal vs two
  systems today).
- **ABDM HIP certification** — M1/M2 (ABHA linking + FHIR care-context) to unlock the **₹15/ABHA-linked-
  transaction incentive**; M4/NHCX for digital insurance claims.
- **PC-PNDT Form-F** online generation/filing (radiology segment) and **biomedical-waste** digital reporting.
- **Self-serve report & financial builders** (attacks the customization complaint).
- **Public API marketplace** + website booking widget.
- **AI registration** from handwritten requisitions.

---

## V3 (north star) — "MediCircle ecosystem"

Connect **Doctors · Pharmacies · Diagnostic Centers · Home-Care** around a consented patient record, with
DiagDesk as node 1, built on the same India-region (provider-agnostic managed), consent-first, **anti-kickback-clean** foundation. Begins
only once DiagDesk is a clear category winner. See [medicircle-vision.md](medicircle-vision.md) and
[ADR-009](adr/009-medicircle-platform-direction.md).

---

## Architecture sketch (constraints, not final choices)

- **Tenancy:** multi-tenant SaaS; **tenant = lab organization**, with branches/collection-centers as
  sub-units; strict tenant isolation + RBAC.
- **Offline-first:** local-first data layer at each branch with conflict-aware sync to cloud — the defining
  differentiator. Core counter operations must never block on connectivity.
- **Data residency:** **India-region hosting** by default (DPDP); encryption at rest/in transit; platform-wide
  tamper-evident audit logging.
- **Integrations:** pluggable **HL7/ASTM** driver layer (per-device); **FHIR** for ABDM care-contexts;
  payment gateway; WhatsApp Business API; SMS/email providers.
- **Compliance as platform primitives:** consent records, retention policies, and audit trails are shared
  services (not per-module bolt-ons) — overlaps cleanly with ABDM's consent-driven HIP model.
- **Certification cost (vendor-borne; plan & budget for it):** ABDM sandbox → functional testing →
  **WASA security audit** → NHA review → production; NABL alignment to ISO 15189:2022.
- **Stack:** to be chosen in the build-planning phase; the above are hard constraints any stack must satisfy.

---

## Risks & watch-items

- **ABDM certification lead time & cost** (sandbox → WASA → NHA) can gate the incentive story — start early.
- **Offline-first sync** adds real engineering complexity; it is the differentiator, so invest, but scope the
  MVP conflict model tightly.
- **CGHS TMS 2.0 churn (Oct 2025 reset)** is a timely wedge but a moving target — keep rate cards data-driven.
- **GST** is largely a non-issue for small exempt-only labs — avoid over-building the tax engine in MVP.
- **D2C aggregator pressure** on patient footfall is an existential threat to our customers; the patient-
  experience toolkit (V1) is how we help them defend.

---

## Verification of the planning deliverable

- Cross-check every claim in `market-research.md` against its cited source URLs.
- Walk a Tier-2 standalone-lab persona through the MVP module list and confirm the full patient journey has no
  gap.
- Confirm every **MANDATORY** compliance item (DPDP, PC-PNDT where USG present, BMW) has a roadmap home (see
  `compliance-matrix.md`).
- Review roadmap sequencing with the stakeholder before any build-planning (architecture/stack) phase.
