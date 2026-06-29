# DiagDesk — Stakeholder Plan (for Review & Sign-off)

*A single, scannable plan for stakeholders and end users to review before development begins. It links to the
detailed docs and ends with the decisions we need signed off. **No code is written until this is approved.***

**Status:** Planning · **Date:** 2026-06 · **Owner:** Product/Engineering

| Detailed reference | Purpose |
|---|---|
| [product-strategy.md](product-strategy.md) | Positioning, segment, differentiators, module map |
| [market-research.md](market-research.md) | Sourced pain points, competitive teardown, regulation |
| [roadmap.md](roadmap.md) | MVP → V1 → V2 scope + architecture sketch |
| [compliance-matrix.md](compliance-matrix.md) | Mandatory-vs-incentivized compliance |
| [tech-stack.md](tech-stack.md) | Decisive technology stack |
| [technical-architecture.md](technical-architecture.md) | Microservices design, data, security, observability |
| [hosting-india.md](hosting-india.md) | India-region hosting decision (provider-agnostic managed) |

---

## 1. Executive summary

DiagDesk is an **all-in-one, India-first SaaS platform for diagnostic centers** (pathology + radiology labs).
It targets the **130,000+ lab market (~80–85% unorganized, ~11–12% CAGR)** that is formalizing fast under
NABL, ABDM and DPDP. We win the **Tier 2/3 standalone and small-chain lab** with an **offline-resilient,
transparently-priced, ABDM/NABL-ready** product with **compliant B2B revenue management + referral analytics +
doctor engagement** (no illegal commission tooling — paying referral cuts is prohibited; see
[compliance-anti-kickback.md](compliance-anti-kickback.md)). Built as **microservices on PostgreSQL**, **hosted
on a provider-agnostic managed, India-region cloud** (portable — the provider is a swap, not a rewrite), with
**security and observability from day one**.

---

## 2. Problem & opportunity (one screen)

- **B2B revenue is under-managed** — slow institutional receivables (~52% overdue 90+ days in Tier-2 metros)
  and manual per-partner rate lists. *(Note: paying referring doctors a commission is illegal — DiagDesk does
  not build that; it provides compliant B2B billing + referral analytics instead.)*
- **~75% of turnaround time and most errors are non-analytical** (sample handling, transcription).
- **Cash + paper front office** drives revenue leakage and poor patient experience.
- **D2C brands** (Healthians, Orange Health, Tata 1mg) are taking patient footfall — notably ignoring doctors.
- **Compliance is rising** (NABL ISO 15189:2022, DPDP, PC-PNDT, CGHS TMS 2.0) and pushing digitization.
- Incumbents are **barbelled** (expensive premium vs cheap-and-shallow), leaving the **affordable-yet-complete
  "missing middle"** open.

---

## 3. Target users & personas

| Persona | What they need | Modules they live in |
|---|---|---|
| **Lab owner / admin** (often a pathologist) | Revenue visibility, B2B receivables, multi-branch control, compliance | MIS, B2B & Partner, Quality, Billing |
| **Front-desk / counter staff** | Fast registration, billing, "works even when internet is down" | Lab Core, Billing (offline-first) |
| **Lab technician** | Sample tracking, analyzer results, validation, fewer rejections | Lab Core, Quality |
| **Phlebotomist** | Home-collection assignments + routing, correct labelling | Booking & Home-Collection (mobile) |
| **Referring doctor / B2B partner** | Order status, reports, B2B account/credit statements (no commissions) | B2B & Partner, patient/doctor portal |
| **Patient** | Online booking, WhatsApp reports, payments, reminders | Patient Experience |

---

## 4. Product scope & phasing (summary — full detail in roadmap.md)

- **MVP (0–4 mo) — "run the lab end-to-end, offline-resilient":** registration → barcode → analyzer
  interfacing → validation → report (WhatsApp/SMS/email) → billing (cash/partial/GST); basic multi-branch;
  RBAC; **DPDP-compliant foundation**.
- **V1 (4–8 mo) — "win on India money + compliance":** B2B & Partner management (compliant — no commissions),
  rate cards (CGHS/TPA), NABL QC (L-J charts), inventory, online booking + home collection + payments, MIS.
- **V2 (8–14 mo) — "unified diagnostics + ecosystem":** Radiology RIS + light PACS, ABDM HIP (₹15/txn
  incentive), PC-PNDT Form-F, biomedical-waste reporting, self-serve builders, public APIs.

---

## 5. Key end-to-end journeys (what end users will validate)

1. **Walk-in:** register → bill (partial cash) → collect sample (barcode) → analyzer result → validate →
   WhatsApp report. *Must work through an internet outage.*
2. **Home collection:** patient books online → phlebotomist assigned + routed → sample collected/labelled →
   processed at hub → report delivered → payment online.
3. **B2B settlement (compliant):** institutional order → B2B contract rate billed to the *buying* institution →
   monthly account statement → receivables aged and chased. Referral *sources* are tracked for analytics only —
   **never** a per-referral payout to a doctor.
4. **Compliance:** daily IQC auto-plotted on Levey-Jennings → audit trail immutable → consent captured →
   (radiology) Form-F filed.

---

## 6. Non-functional requirements (NFRs)

| Area | Target |
|---|---|
| **Availability** | Counter-critical paths keep working **offline**; cloud target 99.9% |
| **Performance** | Registration/billing screens < 1s p95 at the counter (local-first) |
| **Scalability** | Multi-tenant to thousands of labs; large tenants isolatable to dedicated DB |
| **Security** | OIDC + RBAC/ABAC + Postgres RLS; mTLS; field-level PHI encryption; immutable audit |
| **Privacy/residency** | **DPDP**: consent, retention, 72-hr breach; **India-only data + CERT-In 180-day in-India logs** |
| **Observability** | OpenTelemetry traces/metrics/logs; SLOs on the four journeys above; error budgets |
| **Compliance-ready** | NABL QC artifacts, PC-PNDT Form-F, ABDM HIP (V2) |
| **Maintainability** | Clean code (DDD/hexagonal), service template, contract tests, ADRs |

---

## 7. Technology & hosting (summary — detail in tech-stack.md / hosting-india.md)

- **Architecture:** right-sized **microservices** (DDD bounded contexts, ~10 at MVP), database-per-service,
  events (Kafka) + sagas (**Spring State Machine + Kafka choreography**), **offline-first edge** at each branch.
- **Database:** **PostgreSQL** everywhere (JSONB for flexible/FHIR data) — **not MongoDB** (rationale in
  tech-stack.md).
- **Backend:** **Java 21 + Spring Boot 3** (team expertise, richest FHIR/HL7 + enterprise durability); **Go**
  for the device gateway + sync engine. **TypeScript is frontend/mobile only** — contract-first
  OpenAPI/gRPC schemas generate typed clients across the boundary.
- **Frontend:** **React + TypeScript** PWA (offline counter app) + **React Native** (patient/phlebotomist).
- **Security & observability from day 1:** Keycloak/OPA/Vault/Istio; OpenTelemetry → Grafana LGTM + Sentry.
- **Hosting (provider-agnostic managed, India-region):** start on **DigitalOcean Bangalore / Fly.io Mumbai**
  (cheap/fast); graduate per contract to **AWS Mumbai / Azure India** (HIPAA BAA) or **E2E / Yotta**
  (sovereign). Managed Postgres/K8s/object-store from the CSP, self-host Keycloak/Vault/observability on
  managed K8s. Stack kept portable so the provider is a swap, not a rewrite; final provider TBD.

---

## 8. Delivery plan, team & indicative cost

> Indicative only — to be firmed up at build-planning. Use for stakeholder budgeting, not procurement.

- **Phase 0 — Foundation (~3–4 weeks):** monorepo + service template (security + observability preloaded),
  CSP accounts, K8s, CI/CD with scans, edge-node + sync skeleton. *No features until the golden path exists.*
- **Suggested initial team:** 1 tech lead/architect, 3–4 backend, 2 frontend, 1 mobile, 1 platform/SRE (owns
  the self-hosted Kafka/observability), 1 QA, 1 product, plus design and a compliance advisor
  (NABL/DPDP/ABDM) part-time.
- **Indicative timeline:** MVP usable ~4 months, V1 ~8 months, V2 ~14 months (team-size dependent).
- **Indicative infra cost:** modest at pilot scale on the start-tier provider (DigitalOcean Bangalore /
  Fly.io Mumbai); the larger early cost is **engineering**, plus a **platform/SRE owner** for self-hosted
  components.

---

## 9. Decisions requiring stakeholder sign-off

1. **Beachhead segment** — Tier 2/3 standalone & small chains *(recommended)*.
2. **MVP wedge** — Core LIS + billing + delivery first; B2B & Partner management in V1 *(recommended)*.
3. **Backend language** — **LOCKED: Java 21 + Spring Boot 3** (team expertise, richest FHIR/HL7 + enterprise
   durability); Go for the device gateway + sync engine; TypeScript frontend/mobile only. *Confirm for hiring.*
4. **Hosting posture** — **LOCKED: provider-agnostic managed, India-region** — graduate to **AWS Mumbai / Azure
   India** (HIPAA BAA) or **E2E / Yotta** (sovereign) per contract. **Start provider chosen (2026-06-29):
   ✅ DigitalOcean Bangalore** (managed Postgres + DOKS + Redis + Spaces, BLR1); provider stays a swap, not a
   rewrite. *(See [ADR-004](adr/004-hosting-and-data-residency.md).)*
5. **Compliance ambition for V2** — ABDM HIP certification (unlocks ₹15/txn) timing and whether to pursue
   government/CGHS contracts (drives MeitY-empanelled CSP choice).
6. **Database** — **PostgreSQL confirmed** (MongoDB not adopted) — confirm.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Offline-sync complexity (esp. money records) | Favor append-only flows; domain reconciliation for billing; chaos-test sync |
| Self-hosting Kafka/observability toil | Dedicated platform/SRE owner; prefer the provider's managed Kafka/Redis where possible |
| Managed-DBaaS HA maturity varies by provider | POC failover + PITR before committing; graduate to AWS/Azure or Yotta for stronger HA/SLA |
| ABDM certification lead time (sandbox→WASA→NHA) | Start the Interop track early in V2 |
| D2C aggregators pressure customers' footfall | Ship the patient-experience toolkit in V1 to help labs defend |
| Scope creep on an "all-in-one" vision | Strict MVP→V1→V2 gating; each module maps to a validated pain point |

---

## 11. Success metrics (post-launch)

- **Adoption:** paying labs; branches live; % of a lab's daily operations actually run on DiagDesk.
- **Value delivered:** reduction in sample rejections and TAT; B2B receivables aging
  improvement; reports delivered via WhatsApp; reduction in "where's my report" calls.
- **Reliability:** uptime + successful offline-to-online sync rate; SLO attainment on the four journeys.
- **Compliance:** NABL audit-readiness; DPDP consent coverage; (V2) ABHA-linked transactions for incentives.

---

## 12. Sign-off

| Stakeholder | Role | Decision | Date |
|---|---|---|---|
| | Product | | |
| | Engineering | | |
| | Clinical / NABL advisor | | |
| | Pilot lab (end user) | | |

*On sign-off of §9, we proceed to build-planning (confirm the start-tier provider, detailed data models,
sprint plan) — then Phase 0 foundation, then MVP.*
