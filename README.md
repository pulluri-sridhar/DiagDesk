# DiagDesk

**An all-in-one SaaS portal for diagnostic centers (pathology & radiology labs) in India.**

DiagDesk aims to win India's large, fragmented, rapidly-formalizing diagnostic-lab market by giving
Tier 2/3 standalone labs and small chains an **affordable, complete, offline-resilient, ABDM/NABL-ready**
platform that natively handles the doctor-referral economy at the heart of Indian diagnostics.

DiagDesk is also the **diagnostic-center (lab) node of [MediCircle](docs/medicircle/README.md)** — a five-sided
India healthcare platform (Diagnostic Centers · Doctors/Hospitals · Pharmacies · On-Demand Home-Care · Patients).
DiagDesk ships first; MediCircle is the program it grows into.

> **Status:** Planning & design phase — **no application code yet**. The repository now holds the full pre-build
> package: market research, product strategy, roadmap & feature catalogue, MVP backlog, ADRs, a complete **design
> package** (HLD, LLD, data model + ERD, scalability, capacity & load testing, diagrams, a rich Design-Document
> PDF), security/testing/hosting/analytics references, **stakeholder & team brochures**, **UI mockups**, and the
> full **MediCircle program design** (microservices, HLD/LLD, DB schema, tech stack, features, compliance).

## Why DiagDesk

- **~130,000+ labs, ~80–85% unorganized**, a ~USD 11B market growing ~11–12% CAGR — formalizing fast under
  NABL, ABDM, and DPDP, which is exactly when SMBs adopt SaaS.
- Incumbents are barbelled: premium tools that are expensive, internet-dependent, and full of add-on fees,
  versus a cheap-but-shallow long tail. The **"missing middle" — affordable yet complete — is open.**
- The **doctor-referral economy** (B2B credit, per-partner rate cards, referral analytics — handled the
  *compliant* way, no kickbacks) is the financial center of gravity and is under-served by software — our wedge.

## Documentation

| Doc | What's inside |
|---|---|
| [docs/stakeholder-plan.md](docs/stakeholder-plan.md) | **Start here** — consolidated plan for stakeholder/end-user review & sign-off |
| [docs/stakeholder-call-2026-06-28.md](docs/stakeholder-call-2026-06-28.md) | **Latest owner call** — 22 requirements + traceability matrix (inventory, RBAC, letterhead, handover, referral economics, MediCircle…) |
| [docs/rbac-permissions.md](docs/rbac-permissions.md) | Owner-defined **granular RBAC** — user types + per-feature permission catalogue + overrides |
| [docs/medicircle-vision.md](docs/medicircle-vision.md) | **MediCircle** V3 north star — per-participant build for Doctors/Hospitals · Pharmacies · Home-Care · Patients (DiagDesk = lab node) |
| [docs/medicircle-reconciliation.md](docs/medicircle-reconciliation.md) | **DiagDesk ⇄ MediCircle reconciliation** — how the lab build fits the 5-sided platform; conflict resolutions (anti-kickback, hosting, architecture) |
| [docs/medicircle/](docs/medicircle/README.md) | **MediCircle design package** — microservices list, HLD, LLD, full DB schema + ERD, tech stack, features, roadmap, compliance (all five sides, at DiagDesk depth) |
| [docs/product-strategy.md](docs/product-strategy.md) | Positioning, target segment, differentiators, module map, business thesis |
| [docs/market-research.md](docs/market-research.md) | Sourced research: pain points, competitive teardown, regulatory & market context |
| [docs/roadmap.md](docs/roadmap.md) | Phased roadmap (MVP → V1 → V2) and the architecture sketch |
| [docs/features.md](docs/features.md) | Full feature catalogue in logical order, phase-tagged (MVP/V1/V2) |
| [docs/mvp-backlog.md](docs/mvp-backlog.md) | Phase-0 foundation + MVP epics → user stories with acceptance criteria, sprint sequence |
| [docs/compliance-matrix.md](docs/compliance-matrix.md) | Mandatory-vs-incentivized compliance map (DPDP, PC-PNDT, BMW, NABL, CGHS, ABDM, GST) |
| [docs/compliance-anti-kickback.md](docs/compliance-anti-kickback.md) | **Anti-kickback law** — why DiagDesk builds no referral-commission tooling (IMC 2002, Apex SC 2022) |
| [docs/tech-stack.md](docs/tech-stack.md) | Decisive tech-stack reference (microservices, Postgres, API gateway, observability, security) |
| [docs/technical-architecture.md](docs/technical-architecture.md) | Full technical architecture: service decomposition, data, comms, offline sync, security, observability, infra (with diagrams) |
| [docs/testing-strategy.md](docs/testing-strategy.md) | Testing & quality strategy: Playwright-led E2E + full pyramid, CI gates |
| [docs/security-hardening.md](docs/security-hardening.md) | Rate limiting, DDoS/WAF, bot & OTP-abuse defense, layered hardening |
| [docs/analytics-insights.md](docs/analytics-insights.md) | Revenue/ops/growth insights: dashboards, referral & geographic analytics, trends |
| [docs/adr/](docs/adr/README.md) | **Architecture Decision Records** — auth, multi-tenancy/RLS, offline-sync, hosting, database, language, anti-kickback, granular RBAC, MediCircle, compliant referral economics |
| [docs/design/](docs/design/HLD.md) | **Design package** — HLD, LLD, data-model (ERD + dictionary), scalability, capacity & load testing, diagrams, and a rich Design-Document PDF |
| [docs/hosting-india.md](docs/hosting-india.md) | India-region hosting decision (provider-agnostic managed): provider evaluation + DPDP/CERT-In/MeitY basis |
| [design-system/](design-system/README.md) | **Design system** — single source of truth: multi-brand (DiagDesk/MediCircle) design tokens → Tailwind + CSS vars + RN theme; component standards |
| [docs/brochures/](docs/brochures/) | Visually rich **stakeholder** & **technical** brochure PDFs |
| [docs/mockups/](docs/mockups/) | Rendered DiagDesk UI mockups (portal + mobile apps) |

## Decisions locked (see [docs/adr/](docs/adr/README.md))

Authentication (Keycloak OIDC + OTP/passkeys/biometric) · multi-tenancy (db-per-service + `tenant_id` + Postgres
RLS) · offline-first sync · **hosting** (provider-agnostic managed, India-region — start on DigitalOcean
Bangalore / Fly.io Mumbai; graduate to AWS Mumbai / Azure India or E2E / Yotta per contract) · **database**
(PostgreSQL, not MongoDB) · backend language (Java 21 + Spring Boot 3, Go for edge; TypeScript frontend/mobile
only) · **anti-kickback** (no referral-commission tooling) · granular
owner-defined RBAC · compliant referral economics · **MediCircle** platform direction (V3).

## Open strategic decisions

These defaults are adopted in the strategy docs and are open for revision (sign-off in
[docs/stakeholder-plan.md](docs/stakeholder-plan.md)):

1. **Beachhead** — Tier 2/3 standalone & small chains (default).
2. **MVP wedge** — Core LIS + billing + report delivery (default); B2B/partner management as fast-follow.
3. **Differentiators** — offline-first + transparent pricing + ABDM/NABL-native.
4. **Path + Radiology** — pathology LIS first; radiology RIS/PACS in V2.
