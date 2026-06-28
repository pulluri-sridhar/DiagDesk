# MediCircle — Ecosystem Vision (V3 north star)

*Where DiagDesk goes after it wins the diagnostic-center workflow: a connected **care-and-commerce circle**
linking **Doctors/Hospitals, Pharmacies, Diagnostic Centers, On-Demand Home-Care, and Patients**. A full prior
MediCircle product design exists (PRD/HLD/LLD/schema/spec) in a separate repo; this doc is the **north-star**
summary reconciled with the DiagDesk decisions. See [medicircle-reconciliation.md](medicircle-reconciliation.md)
and [ADR-009](adr/009-medicircle-platform-direction.md).*

> **Phase:** V3 horizon. DiagDesk (the lab product) is **node 1** and must succeed standalone first. MediCircle
> is the platform it grows into — built on the same **India-sovereign, DPDP-compliant, consent-first,
> anti-kickback-clean, AI-assistive-with-sign-off** foundation.

---

## 1. The thesis
Indian outpatient care is fragmented across actors who exchange paper and phone calls today: **doctors** order
tests / prescribe / refer; **diagnostic centers** run tests and return reports (DiagDesk's beachhead);
**pharmacies** fulfil prescriptions; **home-care** delivers nursing/physio/attendant visits; **patients** sit in
the middle with no shared record. **MediCircle** is the connective tissue — a **consented, interoperable**
exchange of orders, reports, prescriptions, and visits, with the patient in control of their data. DiagDesk
already sits in the middle of this flow, which is why the lab is the natural first node. **MediCircle is an
operations platform first** (each provider runs day-to-day work) *and* a connectivity layer second.

---

## 2. What gets built for each participant

### Doctors / Hospitals — operations portal + subscription SaaS
KYC (NMC/State-Council reg) · subscriptions/billing · associate preferred labs · patient management +
**longitudinal history** · per-visit records · **digital test ordering** into a lab's catalog · **e-prescription**
(brand or generic, dosage/frequency/duration) · **reports back + AI decision-support cues** (assistive, doctor
signs off) · **teleconsultation** + follow-ups · dashboards · **non-promotional** clinical content to patients.
Hospitals add multi-branch/department + operations. **No referral commission to doctors** — monetization is
subscription + operations; any payment only via professional-services contract or lawful B2B.

### Pharmacies — operations portal + prescription fulfilment
KYC (drug license), chains/staff/delivery agents · **GST billing**/counter sales/returns · receive
**e-prescriptions** → inventory · **brand↔generic (composition) mapping** + substitutes · **payment link** →
**pickup or home delivery** (~1–2 km radius, pharmacy-owned agent) + tracking/POD · **inventory** with batch +
**expiry** alerts (FEFO) · **prescription integrity** (valid-prescription, anti-forgery + reuse-prevention,
Schedule H/H1/X + narcotics guardrails). Positioned to **enable licensed local/in-house pharmacies** — a partner
to neighbourhood chemists, **not** a pan-India aggregator (given the unsettled e-pharmacy law).

### On-Demand Home Care — care-pro app + booking (new pillar)
Professional onboarding & **verification** (nurses, physiotherapists, visiting doctors, patient-care attendants:
council reg, ID, background checks) · **Care-Pro app** (availability/on-call, accept/decline, navigation/live
location, **geo check-in/out**, visit notes + vitals, earnings) · **service catalog** (injection/IV, wound
dressing, elderly care, post-op physio, attendant shifts) · **booking** (on-call/scheduled) → **matching &
dispatch** + **visit OTP** · **care plans** (recurring/multi-visit) · visit record flows into patient history ·
payments + **professional payouts** · **SOS/safety**, two-way ratings, audit. Reuses the same engine for
**at-home sample collection / phlebotomist dispatch** (ties back to the lab) and later **chronic/RPM programs**.

### Patients — free mobile app
Phone-OTP · view prescribed tests, **pick lab, pay** (UPI/cards/wallet) · **reports** in-app + **WhatsApp**/email,
downloadable · full **medical-history timeline** · **teleconsults** + reminders · view **e-prescription**, buy
meds (prescribed pharmacy or nearest; pickup/delivery + tracking) · **book home-care visits**, live-track,
OTP-confirm, rate · **consent management** (granular, revocable) + DPDP rights · **insurance** recommendations +
consented summary-sharing (lead only, no underwriting v1); affordability (PM-JAY/Jan Aushadhi awareness) ·
engagement (content/advisories/packages/camps, consent + opt-out) · offline-tolerant history/report viewing.

### Shared platform services
Identity + RBAC + KYC · consent registry · multi-channel notifications (push / SMS-DLT / WhatsApp / email via
**Resend**) · payments & settlement · immutable audit · **ABDM/ABHA + FHIR** · admin console (KYC queues,
disputes, moderation, compliance) · **credentialing/verification engine** (NMC, NABL, drug license, nursing
council) as the trust backbone.

---

## 3. Value flows — and the compliance line (carried over from ADR-007/010)
MediCircle **amplifies** the anti-kickback discipline. The encoded principle holds on every edge of the circle:

> **Money may flow to whoever buys/pays for a good or service; never to a person in return for *sending* a
> patient.**

- ✅ **Legitimate:** a patient (or TPA/insurer/employer) pays for a test, medicine, or home visit; a facility pays
  another under a transparent B2B contract; a professional is paid for **services actually rendered** (a
  teleconsult, a slide read) under a documented contract.
- ❌ **Never:** per-referral commissions / kickbacks between doctors, labs, pharmacies, or home-care — the
  guardrail from [ADR-010](adr/010-compliant-referral-economics.md) applies network-wide. There is **no commission
  engine** (the prior MediCircle design's gated engine is removed — see
  [medicircle-reconciliation.md](medicircle-reconciliation.md)).
- **Monetization:** SaaS subscriptions + patient transaction fees + **home-care take-rate** + lawful B2B +
  consented insurance lead-gen — never a cut for steering a patient.

## 4. Reconciled program decisions (from the DiagDesk build)
- **Hosting:** India-sovereign, **no hyperscaler** (E2E/Yotta, [ADR-004](adr/004-hosting-and-data-residency.md));
  MediCircle's AWS choices get sovereign swaps (SES→Resend, Textract→alt OCR, S3→S3-compatible, etc.).
- **Anti-kickback:** DiagDesk's **no-commission-engine** posture program-wide (ADR-007/010).
- **Architecture:** **hybrid** — the lab node keeps the **offline-first edge** + right-sized services; the
  connective layer starts as a cloud modular monolith and extracts services later.
- **AI:** assistive only; the treating doctor signs off and is accountable.
- **Conventions:** integer **paise** money, **Keycloak** OIDC, UUIDv7, consent-first DPDP.

## 5. Built on what DiagDesk already has
Consent & DPDP primitives · ABDM/FHIR interop (V2) · Keycloak identity (OTP/passkeys/biometric) · notifications ·
the anti-kickback guardrail — each becomes a multi-party platform service.

## 6. Phasing (indicative — aligned to MediCircle R1/R2/R3, post-DiagDesk-V2)
1. **V3.0 / R1 — Doctor ⇄ Lab loop + operations portals:** onboarding/KYC, provider operations (billing/invoices/
   reports), associations, digital orders, reports/delivery, patient app. (Engagement, not payment.)
2. **V3.1 / R2 — Pharmacy + clinical depth:** e-prescription + brand↔generic, pharmacy fulfilment + delivery,
   **teleconsult**, **AI cues**, inventory/expiry, **on-demand home-care booking + visit records**, analytics.
3. **V3.2 / R3 — Care continuity:** home-care **care plans + recurring visits + professional payouts**,
   content/packages/camps, **insurance** recommendations + consented sharing, deeper **ABDM/ABHA + FHIR**.
4. **V3.3 — Patient super-profile:** one consented longitudinal record across the circle (ABDM-anchored).

## 7. Risks & open questions
- **Regulatory surface widens** (e-pharmacy limbo, telemedicine guidelines, home-care licensing, advertising
  limits) — **[legal review]** per vertical before each step.
- **Anti-kickback vigilance** scales with participants — automated detection of disguised referral flows.
- **Don't dilute the core:** MediCircle only begins once DiagDesk is a clear category winner; this doc aligns
  direction, it does not pull scope forward.
