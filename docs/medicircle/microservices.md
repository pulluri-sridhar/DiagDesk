# MediCircle — Microservices / Services Catalogue

*The complete set of services to be built for **MediCircle** (the five-sided platform: **Diagnostic Centers ·
Doctors/Hospitals · Pharmacies · On-Demand Home-Care · Patients**). DiagDesk is the **lab node**, built as
offline-first edge + microservices; the connective layer starts as **modular-monolith modules** that extract to
independent services as load grows ([medicircle-reconciliation.md](../medicircle-reconciliation.md) §3). This is the
**canonical service list** — `HLD.md`, `LLD.md`, and `data-model.md` align to it.*

> **Reconciled decisions baked in:** India-sovereign hosting (no hyperscaler) · **no commission engine** (compliant
> economics only — ADR-007/010) · Keycloak OIDC · **integer paise** money · UUIDv7 · transactional outbox · DPDP +
> ABDM/ABHA + FHIR R4 · AI assistive-only with doctor sign-off.

---

## Legend
- **Start-as:** `service` = independent microservice from day one (lab-node services + money/clinical-critical);
  `module` = bounded-context module inside the connective modular monolith, **extractable** to a service later.
- **Edge?:** ✅ = also runs at the **branch edge** (k3s + local Postgres, offline-first) for the lab node.
- **Phase:** first release the service ships in (R1 = MVP, R2, R3) — mirrors [roadmap.md](roadmap.md).

---

## A. Platform & shared services (used by every side)

| # | Service | Responsibilities | Owns (key tables) | Start-as | Edge? | Phase |
|---|---|---|---|---|---|---|
| 1 | **API Gateway / BFF** (Kong + per-client BFFs) | Edge routing, OIDC validation, rate-limit, WAF, WebSocket gateway, OpenAPI | — | service | ✅ | R1 |
| 2 | **Identity & Access** (Keycloak-backed) | Phone-OTP/JWT auth, sessions, device binding, RBAC + org-scope, role/permission catalogue | `users`, `roles`, `permissions`, `role_permission`, `user_permission`, `sessions` | service | ✅ | R1 |
| 3 | **Credentialing & Verification** | KYC + credential checks (NMC/State-Council, NABL, drug license, nursing/physio council), background checks, approval queues — the trust backbone | `kyc_documents`, `credentials`, `verification_cases` | module | | R1 |
| 4 | **Organizations & Profiles** | Diagnostic centers, pharmacies, hospitals, branches, org staff; doctor/patient/professional profiles; **MPI** (master patient index, cross-org linkage) | `diagnostic_centers`, `pharmacies`, `hospitals`, `branches`, `org_staff`, `doctors`, `patients`, `patient_links` | service | ✅ | R1 |
| 5 | **Consent & Health Records** | Consent registry (DPDP, revocable), ABHA linkage, **FHIR R4** adapter/exchange | `consents`, `abha_links`, `fhir_resources` | module | | R1→R3 |
| 6 | **Notifications** | Multi-channel dispatch — **Resend** (email), WhatsApp (Gupshup/Meta), MSG91 (SMS-DLT), FCM (push); templates, prefs, quiet hours | `notification_templates`, `notifications`, `notification_prefs` | service | | R1 |
| 7 | **Payments & Settlement** | Payments, refunds, **payouts** (home-care professional payouts, lawful B2B), split settlement (Razorpay Route), reconciliation. **No referral-commission ledger.** | `payments`, `refunds`, `payouts`, `settlements` | service | | R1 |
| 8 | **Billing & Invoicing** | Provider operations: **GST** invoices/receipts, day-book/collections, returns, exportable financial reports (labs/pharmacies/doctors) | `invoices`, `invoice_items`, `credit_notes` | service | ✅ | R1 |
| 9 | **Subscriptions & Entitlements** | Provider SaaS plans, billing, entitlements/feature-gating | `subscription_plans`, `subscriptions`, `entitlements` | module | | R1 |
| 10 | **Audit & Admin** | Immutable hash-chained audit (clinical/financial/consent), disputes, content moderation, fraud monitoring | `audit_logs`, `disputes`, `moderation_cases` | service | ✅ | R1 |
| 11 | **Analytics / MIS** | CQRS read-models + dashboards (referrals, conversion, revenue, TAT, home-care, reconciliation) | `mv_*` read models | module | | R2 |
| 12 | **Search & Discovery** | OpenSearch index for lab/doctor/test/content discovery, ranking | (index only) | module | | R2 |
| 13 | **Notification/Job Workers + Scheduler** | BullMQ consumers + cron: reports pipeline, AI analysis, payouts, delivery dispatch, OCR, **expiry scans**, monthly statements, follow-up reminders | — | service | | R1 |

## B. Lab node (DiagDesk) — offline-first edge + microservices

| # | Service | Responsibilities | Owns (key tables) | Start-as | Edge? | Phase |
|---|---|---|---|---|---|---|
| 14 | **Catalog & Rate-Card** | Test master (NABL catalogue picker + custom tests), panels, reference ranges, health packages, rate cards (CGHS/ECHS/TPA/B2B) | `tests`, `test_parameters`, `test_panels`, `reference_ranges`, `health_packages`, `rate_cards`, `rate_card_items` | service | ✅ | R1 |
| 15 | **Order & Workflow** | Lab order lifecycle, unique patient linkage, accessioning, barcode sample tracking, TAT | `test_orders`, `test_order_items`, `samples`, `sample_events`, `accessions`, `patient_lab_links` | service | ✅ | R1 |
| 16 | **Result & Validation** | Result capture (analyzer/manual), auto-validation, multi-level sign-off | `results`, `result_values`, `validations` | service | ✅ | R1 |
| 17 | **Device Gateway** (Go) | HL7/ASTM analyzer interfacing at the branch edge | `device_messages` | service | ✅ | R1 |
| 18 | **Reporting** | Templates + **letterhead/stationery**, PDF render + digital signature, delivery orchestration, **print log + handover (barcode)** | `lab_reports`, `report_files`, `report_stationery`, `report_print_log`, `report_handover` | service | ✅ | R1 |
| 19 | **Inventory** (labs **and** pharmacies) | Reagents/consumables/**vaccines**/medicines stock, **batch + expiry (FEFO)**, **test-kit `tests_per_kit` consumption**, reorder-threshold alerts | `inventory_items`, `inventory_batches`, `test_kits`, `stock_ledger`, `vaccines` | service | ✅ | R1 (lab) / R2 (pharmacy) |
| 20 | **Lab Quality (NABL)** | IQC, Levey-Jennings, Westgard, EQAS, controlled docs, accreditation readiness | `qc_runs`, `lj_points`, `eqas_records`, `controlled_docs` | module | | R3 |
| 21 | **Expenses** | Day-to-day provider expense tracking by category + reports | `expense_categories`, `expenses` | module | ✅ | R1 |
| 22 | **Sync Engine** (Go) | Branch ⇄ cloud offline change-log sync, conflict resolution, money-record reconciliation | `sync_state`, `outbox_event` | service | ✅ | R1 |

## C. Doctor / clinical services

| # | Service | Responsibilities | Owns (key tables) | Start-as | Edge? | Phase |
|---|---|---|---|---|---|---|
| 23 | **Associations & Contracts** | Doctor↔lab associations; **professional-service contracts** (fixed/per_service — *never per-referral*); B2B agreements. **Replaces the commission engine.** | `doctor_lab_associations`, `professional_service_contracts`, `service_engagements`, `b2b_agreements` | module | | R1 |
| 24 | **Consultations & Prescriptions** | Visits/records, **e-prescription** (dosage/frequency/duration), follow-up scheduling | `consultations`, `prescriptions`, `prescription_items` | module | | R2 |
| 25 | **Teleconsultation** | Video sessions (100ms), secure join links, waiting room, in-call notes, consent-gated recording | `video_sessions` | module | | R2 |
| 26 | **AI Decision Support** | Claude-based cues from age/sex + structured results; **assistive only + mandatory doctor sign-off**; versioned, audited; pgvector retrieval | `ai_analyses`, `ai_analysis_findings` | service | | R2 |
| 27 | **Prescription Integrity** | E-signed, ABHA-linked prescriptions; **reuse-prevention registry**; Schedule H/H1/X + narcotics guardrails; anti-forgery | `rx_signatures`, `rx_dispense_registry` | module | | R2→R3 |

## D. Pharmacy services

| # | Service | Responsibilities | Owns (key tables) | Start-as | Edge? | Phase |
|---|---|---|---|---|---|---|
| 28 | **Medicine Master & Brand↔Generic** | Medicine catalogue, **brand↔chemical-composition mapping**, substitute suggestions | `medicines`, `medicine_brands`, `medicine_compositions` | module | | R2 |
| 29 | **Pharmacy Fulfilment & Delivery** | E-prescription → order, substitution, payment link, **pickup/home delivery** (radius), agent assignment, tracking + POD | `medicine_orders`, `medicine_order_items`, `deliveries`, `delivery_agents` | module | | R2 |

## E. On-demand & home-care

| # | Service | Responsibilities | Owns (key tables) | Start-as | Edge? | Phase |
|---|---|---|---|---|---|---|
| 30 | **Home Care & On-Demand** | Professional onboarding (uses Credentialing), service catalog, **booking + matching/dispatch**, availability/on-call, geo **check-in/out** + visit OTP, **care plans**, visit records → patient history, payouts (via Payments), SOS/ratings. Reuses matching for **at-home sample collection** | `care_professionals`, `home_care_services`, `home_visit_bookings`, `home_visits`, `care_plans`, `professional_availability` | service | | R2 (booking/visits) → R3 (care plans/payouts) |

## F. Engagement & insurance

| # | Service | Responsibilities | Owns (key tables) | Start-as | Edge? | Phase |
|---|---|---|---|---|---|---|
| 31 | **Engagement** | Health content/advisories, **lab-owned** packages (no RMP kickback), campaigns, health camps; consent + opt-out; moderation | `content_items`, `campaigns`, `health_camps`, `package_promotions` | module | | R3 |
| 32 | **Insurance** | Ailment-based plan recommendations, **consented** medical-summary sharing → leads; (R3+) cashless/TPA claims, PM-JAY, NHCX | `insurance_providers`, `insurance_recommendations`, `insurance_leads` | module | | R3 |

---

## Clients (apps & portals — not services, but what consumes the above)
- **Patient app** (React Native/Expo) — tests, payments, reports, teleconsult, meds, **home-visit booking**, history, consent.
- **Care-Pro app** (React Native/Expo) — availability, accept/decline, navigation/live location, geo check-in/out, visit notes, earnings.
- **Web portals** (Next.js, role-routed) — Doctor/Hospital · Lab · Pharmacy · Admin, each with operations (billing/invoices/reports).
- **Offline lab counter** (React + Vite PWA) — the DiagDesk counter app, edge-backed.

## Integration adapters (anti-corruption layer; not domain services)
Razorpay (+Route) · Gupshup/Meta WhatsApp · MSG91 SMS · FCM · **Resend** email · 100ms video · Anthropic **Claude** ·
sovereign/alt **OCR** · **ABDM/ABHA + FHIR** · Google/OLA **Maps**. All wrapped so providers can be swapped without
touching domain logic.

---

## Build order (by release)
- **R1 (MVP):** 1, 2, 3, 4, 5(consent), 6, 7, 8, 9, 10, 13 + lab node **14–19, 21, 22** + **23** (associations/contracts).
- **R2:** 11, 12 + clinical **24, 25, 26, 27** + pharmacy **28, 29** + home-care **30** (booking/visits) + Inventory(pharmacy).
- **R3:** 20 (NABL QC), home-care **30** (care plans/payouts), engagement **31**, insurance **32**, deeper Consent/FHIR.

> **Count:** 32 domain services/modules + 4 client apps + the integration-adapter layer. The **lab-node** services
> (14–19, 22) ship as independent **microservices with edge deployment** from R1; connective-layer **modules** extract
> to independent services when load/team size justifies it (the outbox + event bus keep the seams clean).
