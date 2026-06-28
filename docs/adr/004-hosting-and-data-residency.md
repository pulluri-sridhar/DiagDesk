# ADR-004: Hosting & Data Residency

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture
**Related:** [hosting-india.md](../hosting-india.md), [tech-stack.md](../tech-stack.md),
[technical-architecture.md](../technical-architecture.md) §9

---

## Context
DiagDesk handles Indian patient health data and must be hosted **in India only**, explicitly **not** on AWS,
Azure, or GCP (a sovereignty/business choice). We need a provider that gives a small team enough **managed**
building blocks (so we don't self-host everything) while satisfying India's compliance regime.

Key compliance facts: **DPDP** does not yet mandate blanket localization (negative-list model, no restricted
list notified) — but **CERT-In** *does* require **180-day logs retained within India** and **6-hour breach
reporting**, and health data is sensitive, so India residency is the prudent default. **MeitY empanelment** is
optional for private B2B but required to sell to government/CGHS.

A practical constraint: most "India-region" independent managed services (Aiven, MongoDB Atlas, Redpanda/
Temporal/Grafana Cloud) actually run on **AWS/GCP Mumbai** — excluded by the no-hyperscaler rule.

## Decision

1. **Primary provider: E2E Networks** (NSE-listed, MeitY+STQC, transparent INR pricing) — the most complete
   non-hyperscaler managed set: **managed PostgreSQL + managed Kafka + managed Valkey(Redis) + managed
   Kubernetes + S3-compatible object storage**.

2. **Compliance/enterprise tier: Yotta (Yntraa)** — chosen when a contract needs **explicit HIPAA**, **fuller
   managed-Postgres HA + PITR + 99.95% SLA**, **Tier IV**, or **GovCloud** (public-sector/CGHS). (ESDS / Jio
   Enterprise Cloud are credible further alternatives.)

3. **Self-hosted on the managed K8s** (no India-resident managed option without a hyperscaler): **Keycloak,
   Temporal, Vault**, and the **Grafana/Loki/Tempo/Mimir** observability stack (the latter also satisfies the
   CERT-In in-India log rule). Lean on E2E's managed Kafka/Valkey to cut toil.

4. **Residency & compliance posture:** pin everything to an India region; keep **all logs in India (180 days)**;
   wire a **6-hour CERT-In** + **72-hour DPDP** breach runbook; sign DPAs; default to India data residency.

5. **Pre-commitment guardrails:** POC the DBaaS **failover (RTO/RPO) and PITR**; get written India-region +
   (if needed) BAA commitments; verify **S3-API compatibility** of the object store; confirm current MeitY
   empanelment.

## Consequences
- **Positive:** India-sovereign, DPDP/CERT-In aligned, no hyperscaler; managed Postgres/K8s/object-store (+E2E
  Kafka/Valkey) minimize self-hosting; a clear escalation path (Yotta) for regulated/government deals.
- **Costs/risks:** must self-host Keycloak/Temporal/Vault/observability → a platform/SRE owner is required;
  Indian-CSP DBaaS HA maturity varies (mitigated by POC); less ecosystem tooling than hyperscalers.
- **Revisit if:** a DPDP notification restricts health-data transfer further, a contract mandates HIPAA/GovCloud
  (→ Yotta), or an India-resident managed option for Temporal/Keycloak/observability emerges.
