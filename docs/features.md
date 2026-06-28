# DiagDesk — Full Feature Catalogue

*Every feature planned for the portal, in a logical order: platform foundation → master data → patient
lifecycle → sample-to-report → money → quality/compliance → analytics → ecosystem → cross-cutting. Each item
is phase-tagged **[MVP] / [V1] / [V2]**. This is the backlog seed; it maps to the modules in
[product-strategy.md](product-strategy.md) and the services in [technical-architecture.md](technical-architecture.md).*

---

## 1. Platform foundation & administration
1.1 Tenant (lab organization) onboarding & setup wizard — **[MVP]**
1.2 Multi-branch / collection-center management (hierarchy: org → branch → collection center → hub) — **[MVP]**
1.3 User management; staff profiles; designations — **[MVP]**
1.4 Roles & permissions (RBAC) — **owner-defined, granular per-feature permissions** set at user-creation (catalogue + per-user overrides), branch-scoped — **[MVP]** · see [rbac-permissions.md](rbac-permissions.md)
1.5 Authentication & MFA: **Email-OTP**, **Authenticator-app (TOTP)**, and **biometric** login — device biometric via passkeys/WebAuthn **[MVP]** + **hardware fingerprint-scanner** integration **[V1]**; password policy, session management — **[MVP]** · see [adr/authentication.md](adr/authentication.md)
1.6 Org/branch configuration (working hours, holidays, letterheads, logos, branding) — **[MVP]**
1.7 Subscription / plan & entitlement management (what the lab has paid for) — **[MVP]**
1.8 Audit log of all admin actions (immutable) — **[MVP]**
1.9 White-labeling (branded reports, portal, messages) — **[V1]**
1.10 Single sign-on / directory integration for larger chains — **[V2]**

## 2. Master data & catalogue
2.1 Test master (tests, methods, units, specimen type, container, TAT) — built by **picking from a global NABL test catalogue** (seeds tests + reference/critical ranges) **and** creating **custom non-NABL tests** the lab performs — **[MVP]**
2.2 Test panels / profiles — **[MVP]**; **health-package creation** (test bundles + package pricing) — **[V1]**
2.3 Reference ranges (age/sex/method-specific) & critical (panic) value limits — **[MVP]**
2.4 Department / section setup (biochem, hematology, micro, pathology, radiology…) — **[MVP]**
2.5 Rate cards — per branch, per B2B partner, per scheme (CGHS TMS 2.0 / ECHS / TPA) — **[MVP→V1]**
2.6 Referring doctors & entities directory — **[MVP]**
2.7 B2B partners (hospitals, clinics, corporates, collection franchises) — **[MVP]**
2.8 Reference / outsourcing lab directory (for tests sent out) — **[V1]**
2.9 Specimen & container master, barcode label templates — **[MVP]**
2.10 Report templates & formats (per test/department, configurable) — **[MVP]**
2.11 Discount & coupon schemes, approval rules — **[MVP]**

## 3. Patient management
3.1 Quick patient registration (walk-in) with minimal fields — **[MVP]**
3.2 Master Patient Index (MPI) — dedup & matching, unique patient ID — **[MVP]**
3.3 Patient demographics, contacts, history, family linkage — **[MVP]**
3.4 QR / self-registration & kiosk check-in — **[V1]**
3.5 ABHA (ABDM) ID creation/linking & verification — **[V2]**
3.6 AI registration from handwritten requisition / prescription scan — **[V2]**
3.7 Patient consent capture (DPDP) at registration — **[MVP]**

## 4. Appointments & booking
4.1 Appointment scheduling & slot management (per branch/modality) — **[V1]**
4.2 Online booking (website widget + patient app) — **[V1]**
4.3 Home-collection booking with pincode/serviceability check — **[V1]**
4.4 Appointment reminders & no-show reduction — **[V1]**
4.5 Queue / token management for walk-ins — **[V1]**

## 5. Home collection & phlebotomist logistics
5.1 Phlebotomist roster & assignment — **[V1]**
5.2 Phlebotomist mobile app (visit list, navigation, offline) — **[V1]**
5.3 Route planning & optimization across pincodes — **[V1]**
5.4 On-site collection capture (barcode at doorstep, labelling, consent) — **[V1]**
5.5 Cold-chain / sample-handoff tracking to hub — **[V1]**
5.6 Collection payment (UPI/cash) at doorstep — **[V1]**

## 6. Order entry & billing
6.1 Order creation (tests/panels) — walk-in, B2B, home collection — **[MVP]**
6.2 Invoice generation; itemized billing — **[MVP]**
6.3 Payment handling: cash, card, UPI, partial payments, dues tracking — **[MVP]**
6.4 GST-aware invoicing (mixed exempt/taxable lines) & e-invoicing when applicable — **[MVP]**
6.5 Discounts & concessions — applicable at **patient registration**; a **mandatory free-text justification** is required for every discount, above-limit discounts need an approver, and both are audit-logged; per-user discount limit (`disc_limit_%`) — **[MVP]**
6.6 Online payment gateway (Razorpay/UPI) & payment links — **[V1]**
6.7 Day-end cash reconciliation & shift closing — **[MVP]**
6.8 Refunds, cancellations, credit notes — **[MVP]**
6.9 Add-on / reflex test billing after registration — **[V1]**

## 7. Sample lifecycle (pre-analytical)
7.1 Accessioning & barcode/QR generation — **[MVP]**
7.2 Sample collection status & labelling — **[MVP]**
7.3 Sample tracking across stages (collected → received → in-process → reported) — **[MVP]**
7.4 Sample rejection capture with reason codes (feeds QC) — **[MVP]**
7.5 Inter-branch sample routing (collection center → processing hub) — **[V1]**
7.6 Outsourcing / referral to external lab + result reconciliation — **[V1]**
7.7 Turnaround-time (TAT) tracking & breach alerts — **[MVP]**
7.8 Chain-of-custody / cold-chain logging — **[V1]**

## 8. Analyzer / device integration (analytical)
8.1 HL7/ASTM analyzer interfacing (bi-directional) — **[MVP]**
8.2 Pre-built drivers for common analyzers (Roche, Sysmex, Beckman, Erba, Mindray, Siemens…) — **[MVP]**
8.3 Worklist download to analyzers; auto result capture — **[MVP]**
8.4 Manual result entry (for non-interfaced tests) — **[MVP]**
8.5 Instrument QC data capture from analyzers — **[V1]**

## 9. Results & validation
9.1 Result entry & calculation (formulas, derived values) — **[MVP]**
9.2 Auto-validation rules; reference-range flagging (H/L/critical) — **[MVP]**
9.3 Delta check (vs patient history) — **[V1]**
9.4 Multi-level validation / authorization — a saved report routes to a **review queue** for **owner/pathologist review → digital signature** (sign-off state machine on `report.state`); unsigned reports cannot be issued — **[MVP]**
9.5 Critical value alerting & callback log — **[V1]**
9.6 Repeat / rerun & amendment workflow with audit — **[MVP]**
9.7 Culture & sensitivity (microbiology) structured results — **[V1]**
9.8 Histopathology / cytology descriptive reporting — **[V1]**

## 10. Report generation & delivery
10.1 Report rendering (PDF) from templates with digital signature; **saved letterhead/stationery** (logo, header/footer, margins) so the **print-preview is the actual report on the letterhead**, and the preview is **inline-editable** before sign/print — **[MVP]**
10.2 Cumulative / trend reports across visits — **[V1]**
10.3 Multi-language report options — **[V1]**
10.4 Report delivery: WhatsApp + SMS + email — **WhatsApp send is staff-initiated (manual)**, not auto-pushed; delivery status tracked — **[MVP]**
10.5 Patient portal / app report access — **[V1]**
10.6 Doctor/B2B portal report access (bulk) — **[V1]**
10.7 Report re-print, version history, partial/preliminary reports; **print-count visible** (each print increments a counter + writes a print-log of who/when/copies) — **[MVP]**
10.9 **Report handover tracking** — mark a report **handed over to the patient**, including by **scanning the report/accession barcode** at handover (records who/when/method); pending-handover worklist — **[MVP]**
10.8 Report access security (OTP/link expiry, watermarking) — **[V1]**

## 11. Patient & doctor engagement
11.1 Notification engine (templated WhatsApp/SMS/email, DLT-compliant) — **[MVP]**
11.2 Status notifications (registered, sample collected, report ready) — **[MVP]**
11.3 Recall / follow-up & health-checkup reminders — **[V1]**
11.4 Patient mobile app (reports, bookings, payments, history) — **[V1]**
11.5 Doctor engagement portal (referrals, reports, statements) — **[V1]**
11.6 Feedback / ratings & complaints capture — **[V1]**
11.7 Campaigns / promotions to patients & doctors — **[V2]**

## 12. Radiology & imaging (diagnostic-center expansion)
12.1 Radiology Information System (RIS): modality worklist, scheduling — **[V2]**
12.2 Structured radiology reporting + templates — **[V2]**
12.3 Light PACS / DICOM image storage & viewer — **[V2]**
12.4 Teleradiology (remote reporting workflow) — **[V2]**
12.5 PC-PNDT Form-F generation & online filing (ultrasound) — **[V2]**

## 13. B2B & Partner management — compliant, no commissions
> ⚠️ **No referral-commission engine.** Paying referring doctors a cut is illegal in India and binds the lab
> as payer (IMC 2002 Clause 6.4.1; *Apex Laboratories*, SC 2022). See
> [compliance-anti-kickback.md](compliance-anti-kickback.md). Money flows only to whoever *buys* the test, or
> for a genuine *service rendered* — never to a person for *sending* a patient
> ([ADR-010 — compliant referral economics](adr/010-compliant-referral-economics.md)).

13.1 B2B/institutional **rate contracts** (hospital, clinic, corporate, TPA, reference lab — the buyer pays) — **[V1]**
13.2 B2B **credit accounts & credit limits** — **[V1]**
13.3 B2B **billing cycles, statements & receivables aging** (statements = account-as-buyer, not earnings) — **[V1]**
13.4 Outstanding/overdue alerts & collection follow-up — **[V1]**
13.5 **Reference-lab / outsourcing** workflow with transparent per-test pricing, billed to the ordering institution — **[V1]**
13.6 **Referral-source analytics (no payout)** — volume by source doctor/clinic for marketing & capacity, read-only — **[V1]**
13.7 **Doctor / B2B engagement portal** — report delivery, communications, account statements; no commission — **[V1]**
13.8 **Compliance guardrail** — separates "customer billing" from "referral source"; blocks/warns if a payout is attached to a referrer; audit-logged — **[V1]**
13.9 Franchise / collection-center settlement (legitimate inter-entity invoicing, not referral cuts) — **[V2]**
13.10 **Professional-services contracts** — record genuine services a professional renders to the lab (reporting/consulting/teleradiology) paid on a **`fixed`/`per_service`** basis (**never per-referral / never %-of-bill**); a contract whose counterparty also refers patients is **flagged for review**, not auto-paid — **[V1]** · [ADR-010](adr/010-compliant-referral-economics.md)
13.11 **Referral activity statements** — compliant statements of volume/revenue *generated* by source (analytics, **no payout**), gated by the `finance.reports.referral_activity` permission — **[V1]**

## 14. Inventory & procurement
> Owner flagged inventory as a **big day-to-day challenge** — core inventory moves into **MVP**.

14.1 Reagent & consumable master + stock ledger — **[MVP]**
14.2 **Test-kit master** — a kit defines **`tests_per_kit`** (e.g. 10 or 100 by kit size); each test run **decrements** the kit's remaining count; lot/expiry tracked — **[MVP]**
14.3 Stock receipt, issue, **consumption linked to tests run** — **[MVP]**
14.4 Expiry alerts & batch/lot tracking — **[MVP]**
14.5 **Reorder-threshold alerting** — per-item `reorder_threshold` triggers low-stock alerts + purchase requisition — **[MVP]**
14.6 Supplier management & purchase orders — **[V1]**
14.7 Multi-branch stock transfer — **[V2]**

## 15. Quality & compliance
15.1 Internal Quality Control (IQC) — Levey-Jennings charts, Westgard rules — **[V1]**
15.2 External Quality Assurance (EQAS) participation & tracking — **[V1]**
15.3 NABL document control (controlled docs, versions, retention) — **[V1]**
15.4 Tamper-evident audit trail (hash-chained) across the platform — **[MVP]**
15.5 DPDP consent management, retention policies, data-subject (access/erasure) requests — **[MVP]**
15.6 Breach-notification workflow (72-hr DPDP / 6-hr CERT-In) — **[MVP]**
15.7 Biomedical waste log & annual digital reporting — **[V2]**
15.8 Incident / non-conformance (CAPA) management — **[V1]**

## 16. Finance & accounting
16.1 Revenue ledger & collections summary — **[MVP]**
16.2 **Expense management** — day-to-day expense entry across categories/scenarios (rent, salaries, utilities, reagent purchase, maintenance, petty cash, misc), with **expense reports** — **[MVP]**
16.3 B2B settlement & reference-lab payables accounting (institutional, not referral payouts) — **[V1]**
16.4 GST reports & filing exports — **[V1]**
16.5 Accounting-software export/integration (Tally/Zoho/etc.) — **[V2]**
16.6 P&L / financial MIS **by branch and by department** (tests carry a `department_id`) — **[MVP→V1]**

## 17. Analytics, MIS & dashboards
17.1 Operational dashboard (registrations, samples, TAT, pending) — **[MVP]**
17.2 Revenue & collections dashboard (branch/doctor/test) — **[V1]**
17.3 TAT & productivity analytics — **[V1]**
17.4 QC & rejection analytics — **[V1]**
17.5 Referral-source analytics (top referring doctors/clinics by volume & revenue *generated*, decline/win-back) — informational only, never tied to a payout — **[V1]**
17.6 Patient-acquisition & **geographic/pincode** analytics (source channels, new vs repeat) — **[V1]**
17.7 **Seasonality & trend** analysis + period-over-period comparison + forecasts — **[V1→V2]**
17.8 Executive summary + **alerts/anomaly detection** + actionable nudges — **[V1]**
17.9 **Scheduled insight digests** (daily/weekly via email/WhatsApp) — **[V1]**
17.10 Custom report builder (self-serve) + embedded BI (Metabase/Superset) — **[V2]**
17.11 Owner/manager mobile insights (in the Lab owner app) — **[V1]**
> See [analytics-insights.md](analytics-insights.md) for the full insights spec.

## 18. Interoperability & ecosystem
18.1 ABDM HIP integration (ABHA linking, FHIR care-context) — **[V2]**
18.2 NHCX digital insurance claims — **[V2]**
18.3 Public REST APIs & webhooks for partners — **[V1]**
18.4 Website booking widget / embeddable scripts — **[V1]**
18.5 HIS/EHR integration (for hospital B2B) — **[V2]**
18.6 Aggregator/marketplace integrations (where chosen) — **[V2]**
18.7 **MediCircle** — connected ecosystem (Doctors · Pharmacies · Diagnostic Centers · Home-Care), DiagDesk as node 1 — **[V3 north star]** · see [medicircle-vision.md](medicircle-vision.md), [ADR-009](adr/009-medicircle-platform-direction.md)

## 19. Cross-cutting platform capabilities
19.1 Offline-first operation at branch (registration, billing, barcode, results during outages) — **[MVP]**
19.2 Conflict-aware sync (edge ↔ cloud) — **[MVP]**
19.3 Security: OIDC, RBAC/ABAC, Postgres RLS tenant isolation, mTLS, field-level PHI encryption — **[MVP]**
19.4 India data residency (DPDP) + CERT-In in-India log retention — **[MVP]**
19.5 Observability: traces/metrics/logs, SLOs, alerting — **[MVP]**
19.6 Notification/communication infrastructure (multi-channel providers) — **[MVP]**
19.7 **App portfolio** (see note below) — **[MVP→V1]**
19.10 **Rate limiting, WAF & DDoS / bot protection** (per IP/user/tenant/endpoint; OTP/login hardening) — **[MVP]** · see [security-hardening.md](security-hardening.md)
19.11 Anomaly-based auto-blocking, per-API-key quotas, VAPT — **[V1]**
19.8 Localization / multi-language UI — **[V1]**
19.9 **Backup & disaster recovery** — **local (edge) backups** + **cloud DBaaS HA/PITR**, documented RPO/RTO, and on-demand **data export** — **[MVP]** · see [adr/004-hosting-and-data-residency.md](adr/004-hosting-and-data-residency.md)

---

### App & client portfolio
- **Counter / Admin web (PWA)** — front-desk + lab operations, offline-capable — **[MVP]**
- **DiagDesk Lab app (diagnostic-center mobile app)** — for owner/manager: live ops, **revenue & insights on
  the go**, alerts/anomalies, approvals (e.g. discounts), result sign-off — **[V1]**
- **Phlebotomist app** — home-collection visits, routing, doorstep capture — **[V1]**
- **Patient app** — booking, reports, payments, history — **[V1]**
- **Doctor / B2B app/portal** — referral order status, reports, and B2B account/credit statements (no commissions) — **[V1]**

### Phase summary
- **[MVP]** — run a single lab end-to-end, offline-resilient: §§1,2,3,6,7,8,9,10,11 (core), 14 (inventory + test-kit + reorder alerts), 15 (audit/DPDP), 16.1–16.2 (collections + **expense management**), 17.1, 19. Includes **owner-defined granular RBAC**, **letterhead/stationery + inline preview**, **review→sign-off**, **print-count**, **report-handover + barcode**, **NABL-catalogue picker + Departments master**, **backup/DR**, and **Email-OTP/TOTP/passkey-biometric MFA**.
- **[V1]** — India money + compliance + experience: §§4,5,13 (**compliant referral economics**: professional-service contracts + activity statements), 15 (QC), 16 (dept finance), 17, health packages, purchase orders/suppliers, hardware fingerprint-scanner integration, plus engagement & booking.
- **[V2]** — unified diagnostics + ecosystem: §12 (radiology), 18 (ABDM/NHCX/EHR), self-serve builders, BMW, marketplace.
- **[V3 north star]** — §18.7 **MediCircle** ecosystem ([medicircle-vision.md](medicircle-vision.md)).
