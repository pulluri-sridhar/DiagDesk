# MediCircle — Roadmap

*Phased plan for the **five-sided India healthcare platform** — **Diagnostic Centers · Doctors/Hospitals ·
Pharmacies · On-Demand Home-Care · Patients**. Releases are **R1 (MVP) / R2 / R3**, aligned to the PRD
scope-by-release table and the canonical [microservices.md](microservices.md) build order. Timeframes are
indicative and assume a small founding team.*

> **DiagDesk is the lab node and ships first as node 1.** MediCircle is an **operations platform first** (every
> provider runs daily work in their portal) and a **connectivity layer second** (consented exchange of orders,
> reports, prescriptions, and visits). The deeper offline-first diagnostic-center product (DiagDesk) is the
> beachhead the rest of the circle connects to.

---

> ## ⚠️ Compliance line — carried into every release
>
> **No referral commission to doctors. No commission engine.** (NMC Professional Conduct Regulations, 2023 bans
> fee-splitting to RMPs.) Money may flow to whoever **buys/pays** for a good or service, or to a professional for
> **services actually rendered** under a documented contract — **never** for *sending* a patient. Monetization =
> **SaaS subscriptions + patient transaction fees + home-care take-rate + lawful B2B + consented insurance
> lead-gen.** Lab↔doctor **associations** and **referral analytics** are retained (relationship + volume insight,
> **no payout**).

---

## Sequencing principle

A provider won't join a platform for a connectivity promise alone — it must first **run daily operations** there.
So every release leads with **operations utility** (each side's day-to-day work done well) and earns the
**network effect** on top. Two further rules order the work:

1. **Lab node first.** DiagDesk — the offline-first diagnostic-center node — is **node 1**. Its services
   (catalog, orders/samples, results/validation, device gateway, reporting, inventory, sync) ship as independent
   **edge microservices** in R1, because the **Doctor ⇄ Lab loop** is the platform's load-bearing first network.
2. **Trust + money rails before the verticals that ride them.** Identity, **credentialing/verification**,
   consent, audit, notifications, billing, and a payments rail (**with no commission ledger**) are R1 platform
   primitives; pharmacy, home-care, and insurance plug into them in R2/R3 rather than re-inventing them.

The connective layer starts as **modular-monolith modules** that extract to independent services as load grows;
the transactional outbox + event bus keep the seams clean.

---

## R1 — MVP (Jul–Sep 2026) — "Doctor ⇄ Lab loop + operations portals"

**Goal:** onboarding/KYC, provider operations portals (billing/invoices/reports), doctor↔lab associations,
catalog, digital referral/order + payment, reports + delivery, notifications, patient app + portals — with the
**DiagDesk lab node** running a real lab end-to-end, offline-resilient.

- **Identity & onboarding:** phone-OTP for all roles; role-based onboarding wizards; org/branch-scoped RBAC;
  multi-branch; **subscriptions + entitlements**.
- **Credentialing & verification (trust backbone):** NMC/State-Council, NABL, drug-license, and home-care council
  checks; GSTIN + bank details; admin review queues. (Home-care **onboarding** schema lands here; **booking**
  ships R2.)
- **Doctor portal:** dashboard; **associate preferred labs** (relationship, no payout); patient management +
  **longitudinal history**; per-visit records; **digital test ordering** into a lab's catalog; clinical
  (non-promotional) messaging; **operations dashboards + consultation billing**. **No referral-earnings surface.**
- **DiagDesk lab node (node 1):** **NABL-catalogue picker** + custom tests, panels, ranges, health packages,
  rate cards; **orders inbox** + unique patient linkage; accessioning + **barcode sample tracking** + TAT;
  **HL7/ASTM device gateway**; result capture (analyzer/manual/PDF) + auto-validation + **multi-level sign-off**;
  **letterhead/stationery + inline-editable preview**, PDF + digital signature, **WhatsApp/SMS/email delivery**,
  **print-log + barcode handover**; **inventory** (reagents/consumables/vaccines, **test-kit `tests_per_kit`
  consumption**, FEFO expiry, **reorder alerts**); **expenses**; **billing & GST invoices**; **offline-first edge
  + sync**.
- **Patient app:** home; **prescribed tests → choose lab → pay** (UPI/cards/wallet); **reports in-app +
  WhatsApp**; **history timeline**; granular **consent**; offline-tolerant viewing.
- **Platform primitives:** consent registry + DPDP rights; **hash-chained audit**; multi-channel notifications;
  **payments/refunds/settlement rail (no commission ledger)**; admin console (KYC queues, disputes, moderation,
  audit explorer, export/erasure); security, India-residency, observability, **backup/DR (RPO ≤ 15m / RTO ≤ 1h)**.

**Exit criterion:** a doctor orders tests into an associated lab → patient pays → the **DiagDesk lab node**
registers → collects → runs (analyzer) → validates → signs off → delivers the report (WhatsApp) to doctor +
patient → invoices — with **no per-referral payout anywhere** and the lab able to operate through outages.

---

## R2 — (Oct–Dec 2026) — "Pharmacy + clinical depth + home-care booking"

- **Clinical depth:** **e-prescription** (brand or generic, dosage/frequency/duration; e-signed, ABHA-linked);
  **teleconsultation** (video, secure join, waiting room, in-call notes, consent-gated recording) — **RMP-only**;
  scheduled follow-ups; **AI decision-support cues** (assistive only, versioned, citations) with **mandatory
  doctor sign-off** (ACCEPT/OVERRIDE/DISMISS, audited; never sent to patient); **OCR** of uploaded PDF reports.
- **Pharmacy (licensed local / in-house only — not an aggregator):** e-prescription inbox; **brand↔generic
  (composition) mapping** + substitutes (FEFO, exclude controlled); **payment link → pickup/home delivery**
  (~1–2 km radius, pharmacy-owned agent) + tracking/POD; **inventory** (batch + expiry, low-stock); **prescription
  integrity** (valid-prescription, reuse-prevention registry, Schedule H/H1/X + narcotics guardrails); **GST
  billing/counter sales/returns**.
- **On-demand home-care (new pillar — booking & visits):** professional onboarding/verification; **service
  catalog**; **booking** (on-call/scheduled); **matching & dispatch** (type + proximity + availability + rating);
  availability/on-call; **geo check-in/out + visit OTP**; visit notes/vitals → patient history; **safety/SOS +
  two-way ratings**. Reuses the matching engine for **at-home sample collection / phlebotomist dispatch** (ties
  back to the lab node).
- **Patient app:** teleconsult; **buy medicines** (prescribed/nearest pharmacy, pickup/delivery); **book
  home-care visits** + live-track + OTP.
- **Lab node additions:** suppliers + purchase orders; at-home phlebotomy.
- **Platform:** **analytics/MIS** dashboards (referrals/conversion, revenue, TAT, home-care, reconciliation);
  search & discovery.

> **Note on payouts in R2:** payouts appear **only** for **home-care professionals** (service rendered) and
> **lawful B2B** settlements — **never** as a doctor referral commission.

---

## R3 — (Q1 2027) — "Care continuity + ecosystem"

- **Home-care care continuity:** **care plans + recurring/multi-visit schedules** (auto-scheduled + reminders);
  **professional payouts + statements** (lawful service payment; **platform take-rate**, not a referral cut).
- **Lab quality:** **NABL QC** — IQC, Levey-Jennings, Westgard, EQAS, controlled documents, accreditation
  readiness.
- **Engagement:** **health content/advisories** (admin-moderated, consent + opt-out, non-promotional),
  **lab-owned custom packages** (no RMP kickback), **campaigns + health camps**.
- **Insurance:** ailment-based **plan recommendations**; **consented** medical-summary sharing → **leads** (no
  underwriting v1); recommendation → lead → outcome tracking; affordability awareness (PM-JAY/Jan Aushadhi),
  cashless/TPA/NHCX direction.
- **Interoperability:** deeper **ABDM/ABHA linkage + FHIR R4** records; toward a consented longitudinal
  patient record across the circle.

---

## Risks & watch-items — legal-review gates per vertical

> Each new vertical **widens the regulatory surface**. **[Legal review required]** before shipping the gated
> capability in each release.

- **Referral commissions (NMC 2023):** RMP fee-splitting is **prohibited** — there is **no commission engine** and
  **no doctor referral payout**. Doctor monetization is **subscription/operations** only; any doctor payment must
  be a compliant **professional-services contract** (`fixed`/`per_service`, never per-referral / never %-of-bill).
  **Anti-kickback vigilance scales with participants** — invest in automated detection of disguised referral
  flows network-wide. **[Legal review — gates R1 doctor economics.]**
- **E-pharmacy (unsettled law; chemist opposition):** enable **licensed local / in-house pharmacies only**, not a
  pan-India aggregator; valid-prescription + anti-forgery + reuse-prevention controls. **[Legal review — gates
  R2 pharmacy.]**
- **Telemedicine:** **RMP-only**, explicit consent, **no Schedule X via tele**, ≥3-year record retention,
  recording off by default. **[Legal review — gates R2 teleconsult.]**
- **Home-care licensing:** professional credentialing (nursing/physio council), background checks, visit
  safety/OTP/SOS, and any state-level home-healthcare licensing. **[Legal review — gates R2 home-care.]**
- **Advertising / solicitation (NMC):** doctor→patient messaging restricted to **non-promotional clinical**
  comms. **[Legal review — gates engagement/broadcast in R3.]**
- **Clinical liability (AI):** **assistive-only**, mandatory doctor sign-off, disclaimers, full audit; AI output
  never sent to the patient and never auto-acts.
- **Data privacy:** consent-first, **DPDP** compliance, minimal sharing, India-residency, encryption.
- **Offline-first sync** at the lab edge adds real engineering complexity; it is a core differentiator of the lab
  node — invest, but scope the R1 conflict model tightly.

---

## Build order (services, by release)

Mirrors [microservices.md](microservices.md):

- **R1:** Platform 1–10, 13 + lab node **14–19, 21, 22** + **23** (associations / professional-service
  contracts — *replaces the commission engine*).
- **R2:** Analytics 11, Search 12 + clinical **24–27** + pharmacy **28–29** + home-care **30** (booking/visits) +
  Inventory (pharmacy).
- **R3:** Lab Quality 20, home-care **30** (care plans/payouts), Engagement **31**, Insurance **32**, deeper
  Consent/FHIR (5).

---

## Verification of the planning deliverable

- Walk the **Doctor ⇄ Lab** persona through R1 and confirm the full order→report→invoice journey has no gap and
  **no per-referral payout** appears.
- Confirm every gated vertical (e-pharmacy, telemedicine, home-care, advertising) has a **[Legal review]** gate
  before its release.
- Confirm every **MANDATORY** compliance item (DPDP consent/audit, NMC anti-kickback posture, AI sign-off) is a
  platform primitive, not a per-module bolt-on.
- Re-confirm the **anti-kickback invariant** holds on every edge of the circle before each release.
</content>
