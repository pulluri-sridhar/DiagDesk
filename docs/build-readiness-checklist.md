# DiagDesk — Build-Readiness / Go-No-Go Checklist

*One-page sign-off artifact: the gates that must clear before development starts. Consolidates (does not
re-derive) [stakeholder-plan.md §9](stakeholder-plan.md), [mvp-backlog.md §Phase 0](mvp-backlog.md), and the
[operator-credentials pre-launch checklist](medicircle/compliance.md). Tick the boxes; when the Go/No-Go
criteria below are met, we proceed.*

**Status:** Planning complete · awaiting §9 sign-off. **Last updated:** 2026-06-29.

---

## 1 · Decision gates — stakeholder sign-off ([§9](stakeholder-plan.md))

| Decision | Status | Owner |
|---|---|---|
| **Backend language** — Java 21 + Spring Boot 3 (+ Go edge; TS frontend/mobile) | 🔒 **LOCKED** — confirm for hiring | Engineering |
| **Hosting posture** — provider-agnostic managed, India-region | 🔒 **LOCKED** | Engineering |
| **Start-tier provider** — **DigitalOcean Bangalore (BLR1)** | ✅ **CHOSEN (2026-06-29)** | Founders |
| **Database** — PostgreSQL (Mongo not adopted) | 🔒 **LOCKED** — confirm | Engineering |
| **Beachhead** — Tier 2/3 standalone + small chains | ◻︎ recommended → **confirm** | Product |
| **MVP wedge** — Core LIS + billing + delivery first | ◻︎ recommended → **confirm** | Product |
| **V2 compliance ambition** — ABDM HIP timing + whether to chase CGHS/govt | ◻︎ **OPEN** (drives MeitY-CSP need) | Product + Founders |

**Signatures required (§12):**
- [ ] Product
- [ ] Engineering
- [ ] Clinical / NABL advisor
- [ ] Pilot lab (end user)

---

## 2 · Phase-0 foundation — build prerequisites ([mvp-backlog](mvp-backlog.md))
*≈3–4 weeks. No product features until all five are green.*

- [ ] **F0.1** — Nx monorepo + security/observability-preloaded **service template**
- [ ] **F0.2** — CI/CD + quality & supply-chain gates (Semgrep, Trivy, SBOM, gitleaks, ZAP)
- [ ] **F0.3** — Infrastructure on **DigitalOcean Bangalore**: DOKS + managed Postgres/Redis + Spaces (India BLR1); **POC DBaaS failover (RTO/RPO) + PITR**; verify Spaces S3-API compatibility
- [ ] **F0.4** — Edge node + sync skeleton (k3s + local Postgres + Go sync agent)
- [ ] **F0.5** — Identity, tenancy & security baseline (Keycloak OIDC + `tenant_id` + Postgres RLS)

---

## 3 · Compliance long-poles — start in parallel ([compliance §7](medicircle/compliance.md))
*Gate **launch**, not build — but the lead times mean they start during Phase 0 / R1.*

- [ ] **ABDM sandbox** registration + start M1 — **longest lead; start early** (production in R3)
- [ ] **VAPT** by a **CERT-In-empanelled** auditor (2–6 wks; required for ABDM go-live)
- [ ] **DPDP + CERT-In baseline** — consent, in-India logging, 6-hr breach runbook
- [ ] **TRAI-DLT** (SMS/OTP) + **WhatsApp / Meta** business verification
- [ ] **ISO 27001** kickoff (commercial, ~6–12 mo — needed for hospital/insurer deals)
- [ ] **BAA before any PHI** — *only* when graduating off DO to a hyperscaler PHI tier (not needed for the DO non-PHI pilot; sign a DPA there)

---

## 4 · Go / No-Go criteria

- **Start Phase 0 when:** all **§9 decisions signed** (section 1) **AND** the **DO Bangalore** start tier is provisioned (F0.3 kickoff).
- **Start MVP features when:** **Phase 0 F0.1–F0.5 are green** (section 2).
- **Hold / re-evaluate if:** any §9 signature is withheld, or the DO DBaaS failover/PITR POC fails (→ graduate the start tier sooner).

> **Critical path:** sign §9 → provision **DO Bangalore** → Phase 0 (3–4 wks) → MVP.
> The start provider is a **swap, not a rewrite** — graduation to AWS/Azure (HIPAA BAA) or E2E/Yotta (sovereign)
> stays open per contract ([ADR-004](adr/004-hosting-and-data-residency.md)).
