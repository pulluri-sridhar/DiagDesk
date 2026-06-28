# MediCircle — Full Feature Catalogue

*Every feature planned for the **five-sided India healthcare platform** — **Diagnostic Centers · Doctors/Hospitals
· Pharmacies · On-Demand Home-Care · Patients** — in a logical order: platform foundation → provider operations
(doctor, lab, pharmacy, home-care) → patient experience → insurance → engagement → cross-cutting. Each item is
phase-tagged **[R1] (MVP) / [R2] / [R3]** (the MediCircle releases). This is the backlog seed; it maps to the
services in [microservices.md](microservices.md), the per-participant build in
[../medicircle-vision.md](../medicircle-vision.md), and the PRD functional requirements (FR-IDs).*

> **DiagDesk is the lab node** — the deeper offline-first diagnostic-center product that ships as **node 1**.
> Sections **8–17 (Diagnostic Center / Lab)** are the DiagDesk lab node; the surrounding sides connect to it.

---

> ## ⚠️ Compliance banner — NO referral-commission engine
>
> Indian law (**NMC Professional Conduct Regulations, 2023**) **prohibits fee-splitting / referral commissions
> to Registered Medical Practitioners**. **There is no commission engine in MediCircle.** No feature in this
> catalogue pays a doctor — or any party — a cut for *sending* a patient. Lab↔doctor **associations** and
> **referral analytics** are retained (relationship + volume insight, **no payout**). Any "doctor earnings"
> surface is **subscription / operations** revenue or a compliant **professional-services contract**
> (`fixed` / `per_service`, **never per-referral / never %-of-bill**). The encoded principle holds network-wide:
> *money may flow to whoever buys/pays for a good or service; never to a person in return for sending a patient.*
> **Monetization = SaaS subscriptions + patient transaction fees + home-care take-rate + lawful B2B + consented
> insurance lead-gen.** See [../medicircle-vision.md](../medicircle-vision.md) §3 and ADR-007/010.

---

## 1. Platform foundation — identity, access & onboarding
1.1 Phone-OTP signup/login for all roles (email optional, social login optional) — **[R1]** · (FR-1.1)
1.2 Role-based onboarding wizards — Patient, Doctor, Diagnostic Center (+branches/staff), Pharmacy (+staff/delivery agents), **Home-Care Professional** (nurse, physiotherapist, visiting doctor, patient-care attendant), Insurance Partner, Admin — **[R1]** · (FR-1.2)
1.3 RBAC with **org- and branch-scoped** permissions; role/permission catalogue; staff invited by org admins — **[R1]** · (FR-1.4)
1.4 Multi-branch support for diagnostic centers and pharmacy chains; org → branch → staff hierarchy — **[R1]** · (FR-1.5)
1.5 Session management, device binding, JWT; Keycloak-backed OIDC — **[R1]**
1.6 Subscription plans (tiered) with billing, invoices, and **entitlements / feature-gating** per provider org — **[R1]** · (FR-2.1)

## 2. Platform foundation — KYC, credentialing & verification (the trust backbone)
2.1 KYC / credential capture per role — **[R1]** · (FR-1.3)
2.2 Doctor registration verification (**NMC / State Medical Council**) — **[R1]**
2.3 Diagnostic-center license + **NABL** verification — **[R1]**
2.4 Pharmacy **drug-license** verification — **[R1]**
2.5 **Home-care professional credentials** — nursing-council / physiotherapy registration, ID & **background checks** — **[R1]** · (FR-13.1)
2.6 GSTIN capture; **bank details for lawful payouts** (home-care professionals, lawful B2B) — **[R1]**
2.7 Verification state machine `NOT_SUBMITTED → SUBMITTED → VERIFIED | REJECTED`; admin review queue; resubmission — **[R1]**
2.8 Edge-case flagging — duplicate phone, expired license, name mismatch → routed to admin — **[R1]**

## 3. Platform foundation — consent, audit, notifications & shared records
3.1 **Consent registry** (DPDP) — per scope (insurer / other doctor / ABDM / marketing / AI), **revocable + expiring** — **[R1]** · (FR-4.6)
3.2 DPDP data-subject rights — data export / erasure requests — **[R1]** · (FR-12.4)
3.3 **Immutable, hash-chained audit log** of clinical, financial, and consent events — **[R1]** · (FR-12.4)
3.4 Multi-channel **notification engine** — push (FCM), SMS (MSG91, DLT-compliant), WhatsApp Business (Gupshup/Meta), email (Resend), in-app — **[R1]** · (FR-11.1)
3.5 Event-driven templates — order created, payment success, report ready, teleconsult invite/reminder, **home-visit booked/assigned/en-route/completed**, expiry alert, delivery updates, invoice issued — **[R1]** · (FR-11.2)
3.6 Per-user channel preferences, opt-outs, quiet hours — **[R1]** · (FR-11.3)
3.7 **Master Patient Index (MPI)** — cross-org patient linkage, unique platform identity — **[R1]**
3.8 ABHA (ABDM) linkage & **FHIR R4** record exchange/adapter — **[R3]** (consent primitives land R1) · (NFR: ABDM/FHIR)

## 4. Doctor / Hospital portal — associations & patient management
4.1 Doctor **dashboard / home** — today's patients, pending report reviews, upcoming teleconsults, alerts — **[R1]**
4.2 Search & **associate preferred diagnostic centers** by area, profile, ratings, offered tests; favourite/associate — **[R1]** · (FR-2.2)
4.3 **Doctor↔lab associations** (relationship records; **no payout**) — **[R1]**
4.4 Patient management — create / search patient; **longitudinal history timeline** (visits, tests, prescriptions, meds, home visits) — **[R1]** · (FR-2.3)
4.5 Per-visit **record management** — complaint, diagnosis, notes, attachments — **[R1]** · (FR-2.4)

## 5. Doctor / Hospital portal — test ordering & e-prescription
5.1 **Digital test ordering** — select tests from a lab's catalog; see **price + TAT**; place order with unique patient linkage — **[R1]** · (FR-2.5, FR-3.2)
5.2 **E-prescription** — add medicines (brand or generic), dose, frequency, timings, before/after food, duration, instructions → **e-signed PDF**; ABHA-linked — **[R2]** · (FR-2.6)
5.3 Post-teleconsult flow — revise meds / order more tests / order a **home visit** (re-enters order/prescription flow) — **[R2]** · (FR-6.3)

## 6. Doctor / Hospital portal — reports, AI cues & teleconsult
6.1 **Review reports** — structured results delivered to doctor for review — **[R1]** · (FR-5.1)
6.2 **AI decision-support cues** — from patient age/sex + structured results → flag abnormal values, possible correlations, suggested next tests; **assistive only**, versioned, citations — **[R2]** · (FR-5.2)
6.3 **Mandatory doctor sign-off** — `PENDING_DOCTOR_REVIEW` → ACCEPT / OVERRIDE / DISMISS (audited); doctor decision overrides AI; AI output **never** sent to patient and **never** auto-acts — **[R2]** · (FR-5.3)
6.4 **Teleconsultation (video)** — doctor initiates/schedules; secure patient join link; waiting room; in-call notes; consent-gated recording (off by default) — **RMP-only** — **[R2]** · (FR-6.1–6.4)
6.5 Scheduled **follow-ups** with reminders — **[R2]** · (FR-6.2)
6.6 Message patient — **clinical, non-promotional** comms only (NMC advertising bar) — **[R1]**

## 7. Doctor / Hospital portal — operations, billing & dashboards
7.1 **Operations dashboards** — referrals, conversion, patients, consultation collections — **[R1]** · (FR-2.7)
7.2 **Referral analytics (no payout)** — volume / conversion by associated lab, read-only, informational — **[R1]**
7.3 Consultation **billing & invoices** — GST-compliant, day-book/collections — **[R1]** · (FR-3.8 pattern)
7.4 Hospital extensions — multi-branch / department + operations — **[R2]**
7.5 **No "earnings from referrals" surface.** Doctor revenue = subscription / operations only; any payment to a doctor is a compliant **professional-services contract** (see §18.4) — **[R1]**

---

## 8. Diagnostic Center / Lab node (DiagDesk) — catalog & rate cards
8.1 **Test master** — built by **picking from a global NABL test catalogue** (seeds tests + reference/critical ranges) **and** creating custom non-NABL tests; code, category, sample type, parameters/ranges, price, TAT, fasting — **[R1]** · (FR-3.1)
8.2 Test **panels / profiles** — **[R1]**
8.3 **Reference ranges** (age/sex/method-specific) & critical (panic) value limits — **[R1]**
8.4 **Health packages** (lab-owned test bundles + package pricing) — **[R1]**
8.5 **Rate cards** — per branch, per B2B partner, per scheme (CGHS / ECHS / TPA) — **[R1→R2]**

## 9. Diagnostic Center / Lab node — orders, samples & TAT
9.1 **Orders inbox** — receive incoming digital orders; auto-create lab patient record if new (**unique lab ID linked to platform identity**) — **[R1]** · (FR-3.2)
9.2 **Order workflow** state machine — `ORDERED → REGISTERED → SAMPLE_COLLECTED → IN_PROCESS → REPORT_READY → DELIVERED → COMPLETED` (+ NO_SHOW / CANCELLED) — **[R1]** · (FR-3.3)
9.3 **Accessioning & barcode/QR** sample tracking — **[R1]**
9.4 **Sample lifecycle** — collected → received → in-process → reported; rejection capture with reason codes — **[R1]**
9.5 **TAT tracking & breach alerts** — **[R1]**
9.6 **At-home sample collection / phlebotomist dispatch** — via the home-visit matching engine (§15) — **[R2]** · (spec §6 roadmap)

## 10. Diagnostic Center / Lab node — analyzer interfacing & results
10.1 **HL7/ASTM analyzer interfacing** (bi-directional) at the branch edge — **Device Gateway** — **[R1]**
10.2 Worklist download to analyzers; **auto result capture** — **[R1]**
10.3 **Manual / structured result entry** (for non-interfaced tests) — **[R1]** · (FR-3.4)
10.4 **PDF report upload** + optional LIS/CSV import — **[R1]** · (FR-3.4)
10.5 **OCR / parse** uploaded PDF reports into structured parameters where possible — **[R2]** · (FR-5.4)
10.6 Parameter values with **reference ranges and flags** (Normal / High / Low / Critical) — **[R1]**
10.7 **Auto-validation rules**; **multi-level validation → digital sign-off** (unsigned reports cannot be issued) — **[R1]** · (FR-3.4)

## 11. Diagnostic Center / Lab node — reporting, letterhead & handover
11.1 Report **templates + saved letterhead/stationery** (logo, header/footer, margins) — **print-preview is the actual report on the letterhead**, inline-editable before sign/print — **[R1]**
11.2 Report **PDF render + digital signature** — **[R1]**
11.3 Report **delivery orchestration** — deliver to **doctor + patient**; **WhatsApp** + SMS + email; delivery status tracked — **[R1]** · (FR-3.4, FR-4.2)
11.4 **Print log** — print-count visible; each print increments a counter + writes who/when/copies — **[R1]**
11.5 **Report handover tracking** — mark report handed over to patient, incl. **barcode scan at handover** (records who/when/method); pending-handover worklist — **[R1]**

## 12. Diagnostic Center / Lab node — inventory & test-kits
12.1 Reagent / consumable / **vaccine** master + stock ledger — **[R1]** · (FR-3.7)
12.2 **Test-kit master** — `tests_per_kit`; each test run **decrements** the kit's remaining count; lot/expiry tracked — **[R1]**
12.3 **Batch + expiry tracking (FEFO)**; expiry & low-stock alerts — **[R1]** · (FR-3.7)
12.4 **Reorder-threshold alerting** — per-item threshold triggers low-stock alert + purchase requisition — **[R1]**
12.5 Supplier management & purchase orders — **[R2]**

## 13. Diagnostic Center / Lab node — quality (NABL)
13.1 Internal Quality Control (**IQC**) — **Levey-Jennings** charts, **Westgard** rules — **[R3]**
13.2 **EQAS** participation & tracking — **[R3]**
13.3 NABL **controlled-document** control (versions, retention) & accreditation readiness — **[R3]**

## 14. Diagnostic Center / Lab node — billing, expenses & operations
14.1 **Operations: billing & invoicing** — GST-compliant invoices/receipts for tests & packages; day-book/collections; refunds — **[R1]** · (FR-3.8)
14.2 Exportable financial reports — **[R1]** · (FR-3.8)
14.3 **Expense management** — day-to-day expense entry across categories (rent, salaries, utilities, reagent purchase, maintenance, petty cash, misc) + expense reports — **[R1]**
14.4 **B2B / institutional billing** — rate contracts, credit accounts, statements, receivables aging (account-as-**buyer**, lawful B2B — never referral payouts) — **[R2]**

---

## 15. On-Demand Home-Care — onboarding, catalog, booking & matching
15.1 **Professional onboarding & verification** (nurses, physiotherapists, visiting doctors, patient-care attendants) — uses Credentialing (§2.5): council reg, ID, background checks, status — **[R2]** · (FR-13.1)
15.2 **Service catalog** — injection/IV, wound dressing, elderly care, post-op physiotherapy, attendant shifts — price, duration, professional type; platform- or provider-owned — **[R2]** · (FR-13.2)
15.3 **Booking** — patient (or doctor on behalf) requests **on-call (ASAP)** or **scheduled** visit; selects service, address, date/time — **[R2]** · (FR-13.3)
15.4 **Matching & dispatch** — rank verified pros by **type + proximity + availability + rating + acceptance**; offers with short TTL (on-call); accept/decline; reassign on decline/timeout — **[R2]** · (FR-13.4)
15.5 **Availability management** — slots, on-call toggle, leave — **[R2]** · (FR-13.5)
15.6 **Visit lifecycle** — `REQUESTED → OFFERED → ASSIGNED → CONFIRMED → EN_ROUTE → CHECKED_IN → IN_PROGRESS → CHECKED_OUT → COMPLETED` (+ CANCELLED / NO_SHOW / REFUNDED) — **[R2]**

## 16. On-Demand Home-Care — visit execution, care plans & payouts
16.1 **Visit execution** — geo-tagged **check-in / check-out** at patient's home; visit notes, vitals/observations, attachments; patient-confirmed completion — **[R2]** · (FR-13.6)
16.2 **Visit records → patient history** — notes/vitals flow into the medical timeline — **[R2]** · (FR-13.6)
16.3 **Care plans** — recurring / multi-visit (e.g., daily dressing for 7 days) with auto-scheduled visits + reminders — **[R3]** · (FR-13.7)
16.4 **Payments & payouts** — per-visit or plan pricing; patient payment; **platform take-rate**; **professional payouts + statements** (lawful service payment, not a referral cut) — **[R3]** · (FR-13.8)
16.5 **Safety & trust** — SOS/help, **visit OTP** verification, two-way ratings/reviews, full visit audit; verified-profile badge; optional visit insurance — **[R2]** · (FR-13.9)

---

## 17. Pharmacy — e-prescription intake, fulfilment & inventory
17.1 **E-prescription inbox** — receive validated, ABHA-linked doctor prescriptions into pharmacy inventory — **[R2]** · (FR-7.1)
17.2 **Brand↔generic (chemical-composition) mapping** — suggest in-stock substitutes (FEFO; exclude controlled) — **[R2]** · (FR-7.2)
17.3 **Fulfilment** — patient **payment link** → **pickup or home delivery**; delivery radius config (default ≈1–2 km); pharmacy-owned delivery-agent assignment — **[R2]** · (FR-7.3)
17.4 **Delivery tracking + proof of delivery** (delivery OTP); minimal/configurable delivery fee — **[R2]** · (FR-7.4)
17.5 **Pharmacy inventory** — batch + expiry; low-stock alerts; stock movement on dispense (FEFO) — **[R2]** · (FR-7.5)
17.6 **Prescription integrity** — valid-prescription check, **reuse-prevention registry**, anti-forgery; e-signed/ABHA-linked; **Schedule H/H1/X + narcotics** guardrails — **[R2→R3]** · (FR-7, spec §7)
17.7 **Operations: billing & invoicing** — GST invoices for medicine orders, counter sales, returns/refunds, sales/financial exports — **[R2]** · (FR-7.6)

> **E-pharmacy posture:** **licensed local / in-house pharmacies only** — a partner to neighbourhood chemists,
> **not** a pan-India aggregator (given unsettled e-pharmacy law). **[Legal review required]**

---

## 18. Patient app — tests, payments, reports & history
18.1 **Home** — prescribed tests, upcoming visits/teleconsults, recent reports — **[R1]** · (spec §8)
18.2 **Tests & payments** — view prescribed tests, choose/confirm lab, see price, **pay** (UPI/cards/wallet via Razorpay); track status — **[R1]** · (FR-4.1)
18.3 **Reports** — receive in-app + **WhatsApp**/email; download PDF — **[R1]** · (FR-4.2)
18.4 **Medical-history timeline** — visits, tests, prescriptions, meds, home visits — **[R1]** · (FR-4.3)
18.5 **Teleconsult** — join from home; reminders; reschedule — **[R2]** · (FR-4.4)
18.6 **Medicines** — view e-prescription; buy from prescribed pharmacy (payment link) **or** take list to nearest pharmacy; choose **pickup / home delivery** — **[R2]** · (FR-4.5)
18.7 **Home-visit booking** — book on-call/scheduled visit; live-track; OTP-confirm; rate — **[R2]** · (FR-4.5 / FR-13)
18.8 **Consent & profile** — manage granular, revocable data-sharing consent; ABHA link; family members (roadmap) — **[R1]** (consent) / **[R3]** (ABHA) · (FR-4.6)
18.9 **Offline-tolerant** history/report viewing — **[R1]** · (NFR: mobile)

## 19. Insurance
19.1 **Plan recommendations** — based on ailments/history, recommend insurance plans/partners — **[R3]** · (FR-10.1)
19.2 **Consented lead-gen** — with explicit patient consent, share medical summary with insurer; create lead — **[R3]** · (FR-10.2)
19.3 Track **recommendation → lead → outcome** (no underwriting in v1) — **[R3]** · (FR-10.3)
19.4 Affordability awareness — PM-JAY / Jan Aushadhi; (R3+) cashless/TPA claims, NHCX — **[R3]**

## 20. Engagement, content, packages & camps
20.1 **Health content** — doctors/labs create voice note / poster / PDF / text + advisories; **admin moderation** — **[R3]** · (FR-9.1)
20.2 **Targeted broadcast** to patient segments — **consent + opt-out enforced**; non-promotional clinical comms (NMC bar) — **[R3]** · (FR-9.2)
20.3 **Custom health packages** — **lab-owned** co-created bundles (no RMP kickback on uptake) — **[R3]** · (FR-9.3)
20.4 **Health camps / campaigns** — creation, promotion, registration — **[R3]** · (FR-9.4)

---

## 21. Cross-cutting platform capabilities
21.1 **Offline-first lab edge** — branch runs registration, billing, barcode, results during outages (k3s + local Postgres) — **[R1]**
21.2 **Conflict-aware edge ⇄ cloud sync** + money-record reconciliation (Sync Engine) — **[R1]**
21.3 **Security** — TLS 1.2+, encryption at rest (AES-256), least-privilege RBAC, secrets in vault, **OWASP ASVS L2**; Postgres RLS tenant isolation; field-level PHI encryption — **[R1]** · (NFR)
21.4 **India data residency** (DPDP, ap-south-1 / India-sovereign hosting — no hyperscaler) — **[R1]** · (NFR)
21.5 **Observability** — centralised logs/metrics/traces, SLO dashboards, alerting — **[R1]** · (NFR)
21.6 **Data integrity** — ACID for financial flows; **idempotent payment webhooks**; integer-paise money — **[R1]** · (NFR)
21.7 **ABDM / FHIR R4** interoperability + ABHA linkage — **[R3]** · (NFR)
21.8 **Backup & DR** — PITR backups, multi-AZ; **RPO ≤ 15 min, RTO ≤ 1 h**; on-demand data export — **[R1]** · (NFR)
21.9 **Payments & settlement infra** — payments, refunds, **payouts** (home-care, lawful B2B), split settlement (Razorpay Route), reconciliation. **No referral-commission ledger.** — **[R1]**
21.10 **Analytics / MIS** — CQRS read-models + dashboards (referrals/conversion, revenue, TAT, home-care, reconciliation) — **[R2→R3]** · (FR analytics)
21.11 **Search & discovery** — index for lab/doctor/test/content discovery + ranking — **[R2]**
21.12 **Localization & accessibility** — English + major Indian languages; WhatsApp-first; **WCAG 2.1 AA** web portals; low-literacy patterns for tier 2/3 — **[R1→R2]** · (NFR)
21.13 **Admin console** — KYC/onboarding approval queues, dispute resolution, refunds, content moderation, fraud monitoring, audit-log explorer, consent registry, data export/erasure — **[R1]** · (FR-12)

---

## Apps & client portfolio
- **Patient app** (React Native / Expo) — tests, payments, reports, teleconsult, meds, **home-visit booking**, history, consent — **[R1]** (core) → **[R2]** (teleconsult/meds/home-care)
- **Care-Pro app** (React Native / Expo) — availability, accept/decline, navigation/live location, geo check-in/out, visit notes, earnings — **[R2]**
- **Web portals** (Next.js, role-routed) — Doctor/Hospital · Lab · Pharmacy · Admin, each with operations (billing/invoices/reports) — **[R1]**
- **Offline lab counter** (React + Vite PWA) — the DiagDesk edge-backed counter app — **[R1]**

---

## Phase summary
- **[R1] (MVP, Jul–Sep 2026)** — Doctor ⇄ Lab loop + provider operations portals: §1 (identity/RBAC/subscriptions), §2 (KYC/credentialing), §3 (consent/audit/notifications/MPI), §4 (associations/patient mgmt), §5.1 (test ordering), §6.1/6.6 (report review, clinical messaging), §7 (doctor operations — **no referral earnings**), **lab node §8–12, §14 (billing/expenses), §18.1–18.4/18.8–18.9 (patient core)**, §21 (cross-cutting incl. offline-first edge, security, residency, DR, payments **without** any commission ledger). Includes **NABL-catalogue picker**, **letterhead + inline preview + sign-off**, **print-log + barcode handover**, **test-kit consumption + reorder alerts**.
- **[R2] (Oct–Dec 2026)** — Pharmacy + clinical depth + home-care booking: §5.2–5.3 (e-prescription), §6.2–6.5 (AI cues + sign-off, teleconsult), §10.5 (OCR), §9.6 (at-home phlebotomy), §15–16.2/16.5 (**home-care onboarding/booking/visits/safety**), §17 (**pharmacy** intake/fulfilment/delivery/inventory/integrity/billing), §12.5 (suppliers/PO), §18.5–18.7 (patient teleconsult/meds/home-care), §21.10–21.11 (analytics/search).
- **[R3] (Q1 2027)** — Care continuity + ecosystem: §13 (**NABL QC**), §16.3–16.4 (**care plans + recurring visits + professional payouts**), §17.6 (deeper prescription integrity), §19 (**insurance** recommendations + consented lead-gen), §20 (**engagement/content/packages/camps**), §3.8/§21.7 (**deeper ABDM/ABHA + FHIR**).

> **Reconciliation note:** Every phase is **anti-kickback-clean by construction** — there is no per-referral
> commission feature anywhere in R1/R2/R3. The only money paths are buyer payments, home-care take-rate,
> lawful B2B, consented insurance lead-gen, and SaaS subscriptions.
</content>
</invoke>
