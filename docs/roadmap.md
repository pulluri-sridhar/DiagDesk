# DiagDesk — Roadmap & Architecture Sketch

*Phased plan. Timeframes are indicative and assume a small founding team.*

---

## Sequencing principle

A lab won't switch software for a single differentiating module — it must first **run daily operations** on
DiagDesk. So the MVP is the operational core (table stakes done well + offline-first), and the India-specific
**Referral & B2B engine** and **compliance** modules — what makes labs *stay* and what we *market* — land in
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
- **Report delivery:** white-labeled **WhatsApp + SMS + email** + a basic patient portal.
- **Offline-first sync** — the key differentiator; registration, barcode printing, and billing must work
  during outages.
- **Basic multi-branch** support + **role-based access control**.
- **DPDP-compliant foundation:** consent capture, India-region hosting, tamper-evident audit logging,
  configurable retention.

**Exit criterion:** a Tier-2 standalone lab completes the full journey on DiagDesk —
register → collect → run (analyzer) → validate → report (WhatsApp) → bill → collect payment — with no gap.

---

## V1 (4–8 months) — "Win on India-specific money + compliance"

- **Referral & B2B revenue engine** (the differentiating wedge): doctor commission tracking & statements
  (per-test % or flat, TDS-aware), B2B credit ledger + receivables aging with overdue alerts.
- **Rate-card manager:** per-branch, per-B2B-partner, per-scheme rate lists, including **CGHS TMS 2.0 tiered
  rates** and **TPA pre-auth** empanelment billing.
- **NABL QC module:** auto **Levey-Jennings charts**, Westgard rules, IQC/EQAS logs, sample-rejection tracking
  with reason codes, controlled-document versioning.
- **Inventory & reagents:** expiry alerts, auto-reorder, consumption tracking.
- **Patient experience:** online booking, **home-collection logistics** (phlebotomist assignment + routing),
  **online payments**, recall/follow-up reminders.
- **MIS dashboards:** TAT, QC, and revenue across branches.

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
