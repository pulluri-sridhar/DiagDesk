# MediCircle — Design Package

*The full design package for **MediCircle**, the five-sided India healthcare platform (**Diagnostic Centers ·
Doctors/Hospitals · Pharmacies · On-Demand Home-Care · Patients**). Clinics & Hospitals are now first-class
providers with a dedicated **Clinic edition** (OPD operations) and a **Hospital HIS edition** (full Hospital
Information System) — see [clinic-hospital-his.md](clinic-hospital-his.md). **DiagDesk is the lab node**, built deeper; this
package brings the rest of the program to the same documentation depth, **reconciled** with the DiagDesk decisions
(see [../medicircle-reconciliation.md](../medicircle-reconciliation.md) and
[../adr/009-medicircle-platform-direction.md](../adr/009-medicircle-platform-direction.md)).*

> **Phase:** design / planning — no application code. These docs live in the DiagDesk repo for now (this session's
> scope); they relocate to the `medicircle` repo at build-start (~July 2026).
>
> **Locked decisions reflected throughout:** Java 21 + Spring Boot 3 backend (Go at the lab edge; TypeScript
> FE/mobile only) · provider-agnostic managed hosting, India-region (start DO Bangalore / Fly.io Mumbai; graduate
> to AWS Mumbai / Azure India (BAA) or E2E / Yotta (sovereign) per contract) · **no commission engine** (compliant
> economics only) · Keycloak OIDC · **integer paise** money · UUIDv7 · transactional outbox · DPDP + ABDM/ABHA +
> FHIR R4 · AI assistive-only with mandatory doctor sign-off · hybrid edge+cloud architecture.

---

## Documents

| Doc | What's inside |
|---|---|
| [microservices.md](microservices.md) | **The services list** — all 32 services across the 5 sides + shared platform; responsibilities, owned tables, deps, edge, phase, start-as |
| [HLD.md](HLD.md) | High-Level Design — principles, NFRs, C4 context/container, service catalogue, core flows, data/integration/security/deployment/observability/scalability |
| [LLD.md](LLD.md) | Low-Level Design — backend layering, state machines, sequences, API contract, key algorithms, per-service internals |
| [data-model.md](data-model.md) | Full PostgreSQL data dictionary (~58 tables) + relationships + ERD; integer paise, UUIDv7, RLS; **no commission tables** |
| [tech-stack.md](tech-stack.md) | Program-wide tech stack (all five sides) — Java/Spring Boot, provider-agnostic India-region; supersedes the prior AWS-based MediCircle stack |
| [features.md](features.md) | Full feature catalogue per participant, phase-tagged R1/R2/R3 |
| [roadmap.md](roadmap.md) | R1 (Jul–Sep 2026) → R2 → R3 phased delivery; DiagDesk lab node ships first |
| [compliance.md](compliance.md) | Market research + India 2026 regulatory constraints (NMC anti-kickback, e-pharmacy, telemedicine, DPDP, ABDM) + **platform-operator credentials & a pre-launch checklist** (§7) |
| [consent-legal-framework.md](consent-legal-framework.md) | **Consent & legal framework (proposal)** — privacy/ToS/waiver/marketing instruments, touchpoint→gating matrix, mandatory-accept UX, Company + subscriber protections, case-law risk register, open decisions |
| [clinic-hospital-his.md](clinic-hospital-his.md) | Clinic operations + full Hospital Information System (HIS) — ADT/IPD/OT/nursing/MRD/cashless; enterprise track |
| [market-research-hospitals-clinics.md](market-research-hospitals-clinics.md) | **Market research** — hospital & clinic challenges in India (2026) mapped to MediCircle's one-stop solution; sourced |

## Diagrams (`diagrams/`)
- **`medicircle-context.png/.svg`** — C4-L1 system context (5 actor types + platform + external integrations)
- **`medicircle-container.png/.svg`** — C4-L2 container/service view (apps → gateway → services + datastores + edge)
- **`medicircle-erd.png/.svg`** — entity-relationship diagram of the core schema
- Sources are the matching `.mmd` files (Mermaid), rendered offline.

## How this relates to DiagDesk
DiagDesk's lab-focused docs ([../design/HLD.md](../design/HLD.md), [../design/data-model.md](../design/data-model.md),
[../tech-stack.md](../tech-stack.md), [../features.md](../features.md), …) remain the **deep build of the lab node**.
This package is the **program-wide** umbrella: it summarizes the lab node and fully specifies the other four sides.
The conflict resolutions (anti-kickback, hosting, architecture, conventions) are recorded once in
[../medicircle-reconciliation.md](../medicircle-reconciliation.md) and applied consistently here.
