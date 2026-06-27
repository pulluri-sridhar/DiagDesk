# DiagDesk

**An all-in-one SaaS portal for diagnostic centers (pathology & radiology labs) in India.**

DiagDesk aims to win India's large, fragmented, rapidly-formalizing diagnostic-lab market by giving
Tier 2/3 standalone labs and small chains an **affordable, complete, offline-resilient, ABDM/NABL-ready**
platform that natively handles the doctor-referral economy at the heart of Indian diagnostics.

> **Status:** Planning phase. This repository currently holds market research and product strategy only —
> no application code yet.

## Why DiagDesk

- **~130,000+ labs, ~80–85% unorganized**, a ~USD 11B market growing ~11–12% CAGR — formalizing fast under
  NABL, ABDM, and DPDP, which is exactly when SMBs adopt SaaS.
- Incumbents are barbelled: premium tools that are expensive, internet-dependent, and full of add-on fees,
  versus a cheap-but-shallow long tail. The **"missing middle" — affordable yet complete — is open.**
- The **doctor-referral economy** (commissions, B2B credit, per-partner rate cards) is the financial center
  of gravity and is under-served by software — our wedge.

## Documentation

| Doc | What's inside |
|---|---|
| [docs/stakeholder-plan.md](docs/stakeholder-plan.md) | **Start here** — consolidated plan for stakeholder/end-user review & sign-off |
| [docs/product-strategy.md](docs/product-strategy.md) | Positioning, target segment, differentiators, module map, business thesis |
| [docs/market-research.md](docs/market-research.md) | Sourced research: pain points, competitive teardown, regulatory & market context |
| [docs/roadmap.md](docs/roadmap.md) | Phased roadmap (MVP → V1 → V2) and the architecture sketch |
| [docs/features.md](docs/features.md) | Full feature catalogue in logical order, phase-tagged (MVP/V1/V2) |
| [docs/mvp-backlog.md](docs/mvp-backlog.md) | Phase-0 foundation + MVP epics → user stories with acceptance criteria, sprint sequence |
| [docs/compliance-matrix.md](docs/compliance-matrix.md) | Mandatory-vs-incentivized compliance map (DPDP, PC-PNDT, BMW, NABL, CGHS, ABDM, GST) |
| [docs/tech-stack.md](docs/tech-stack.md) | Decisive tech-stack reference (microservices, Postgres, API gateway, observability, security) |
| [docs/technical-architecture.md](docs/technical-architecture.md) | Full technical architecture: service decomposition, data, comms, offline sync, security, observability, infra (with diagrams) |
| [docs/testing-strategy.md](docs/testing-strategy.md) | Testing & quality strategy: Playwright-led E2E + full pyramid, CI gates |
| [docs/security-hardening.md](docs/security-hardening.md) | Rate limiting, DDoS/WAF, bot & OTP-abuse defense, layered hardening |
| [docs/analytics-insights.md](docs/analytics-insights.md) | Revenue/ops/growth insights: dashboards, referral & geographic analytics, trends |
| [docs/adr/](docs/adr/README.md) | **Architecture Decision Records** — auth, multi-tenancy/RLS, offline-sync, hosting, database, language |
| [docs/hosting-india.md](docs/hosting-india.md) | India-only hosting decision (no hyperscaler): provider evaluation + DPDP/CERT-In/MeitY basis |

## Open strategic decisions

These defaults are adopted in the strategy docs and are open for revision:

1. **Beachhead** — Tier 2/3 standalone & small chains (default).
2. **MVP wedge** — Core LIS + billing + report delivery (default); Referral/B2B engine as fast-follow.
3. **Differentiators** — offline-first + transparent pricing + ABDM/NABL-native.
4. **Path + Radiology** — pathology LIS first; radiology RIS/PACS in V2.
