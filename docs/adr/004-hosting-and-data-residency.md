# ADR-004: Hosting & Data Residency

**Status:** Accepted · **Date:** 2026-06 (revised 2026-06-29) · **Deciders:** Architecture
**Related:** [hosting-india.md](../hosting-india.md), [tech-stack.md](../tech-stack.md),
[technical-architecture.md](../technical-architecture.md) §9

---

## Context
DiagDesk handles Indian patient health data, so **India-region data residency** is the binding requirement.
The team is small and wants enough **managed** building blocks (managed Postgres, K8s, object storage, Redis)
to avoid self-hosting everything. The **final hosting provider is an open decision** (to be made within days);
what must be locked now is the *posture* so the docs don't bind the build to one vendor.

Key compliance facts: **DPDP** does not yet mandate blanket localization (negative-list model, no restricted
list notified) — but **CERT-In** *does* require **180-day logs retained within India** and **6-hour breach
reporting**, and health data is sensitive, so India residency is the prudent default. **MeitY empanelment** is
optional for private B2B but required to sell to government/CGHS. Enterprise/insurer/hospital contracts may
demand an explicit **HIPAA BAA**.

> **Revision note (2026-06-29):** This ADR previously locked **India-sovereign, no-hyperscaler** (E2E Networks
> primary / Yotta tier). That is **reframed to provider-agnostic managed hosting**: pick the provider for fit,
> not ideology, keeping India-region residency as the hard rule. Rationale: the user wants to **start fast and
> cheap on a managed provider (DigitalOcean Bangalore or Fly.io Mumbai)** and keep AWS/Azure (HIPAA BAA, mature
> managed set) *and* the sovereign Indian CSPs (E2E/Yotta) both available as a graduation path. The provider is
> a **swap, not a rewrite** — the architecture stays portable (Kubernetes + standard managed services).

## Decision

1. **Posture: provider-agnostic, India-region, managed-first.** Any provider is acceptable if it offers
   India-region data centers, managed PostgreSQL (HA + PITR), managed/compatible Kubernetes, S3-compatible
   object storage, and managed Redis. Keep the stack **portable** (Kubernetes + Postgres + S3 API + Kafka) so
   the provider can change without an application rewrite.

2. **Start tier (cost-optimized): DigitalOcean Bangalore** (managed Postgres/K8s/Redis/Spaces, simple INR-ish
   pricing) — or **Fly.io Mumbai** for app compute (note: pair with an external managed Postgres, as Fly
   Postgres is unmanaged). Good enough for pilot/MVP and non-regulated workloads.

3. **Graduation paths (choose per contract, not now):**
   - **Hyperscaler tier — AWS Mumbai / Azure India:** when a contract needs an explicit **HIPAA BAA**, the
     broadest managed service set, or enterprise compliance portfolio (SOC/ISO/HITRUST). Sign the **BAA before
     any PHI enters** the environment.
   - **Sovereign tier — E2E Networks / Yotta (Yntraa):** when a deal needs an **India-sovereign, non-hyperscaler**
     posture, GovCloud, or MeitY/STQC + Tier-IV (public-sector/CGHS). Still fully managed Postgres/K8s/object-store.

4. **Self-hosted on the managed K8s** (portable across all tiers): **Keycloak, Vault**, the **Grafana/Loki/
   Tempo/Mimir** observability stack (also satisfies the CERT-In in-India log rule). Use the provider's managed
   Kafka/Redis where available, self-host on K8s where not.

5. **Residency & compliance posture (provider-independent):** pin everything to an India region; keep **all logs
   in India (180 days)**; wire a **6-hour CERT-In** + **72-hour DPDP** breach runbook; sign DPAs/BAAs; default
   to India data residency.

6. **Pre-commitment guardrails:** POC the DBaaS **failover (RTO/RPO) and PITR**; get written India-region +
   (if PHI) **BAA** commitments; verify **S3-API compatibility** of the object store; confirm MeitY empanelment
   only if selling to government.

## Consequences
- **Positive:** start cheap/fast (DO/Fly) without locking the build to one vendor; clear, contract-driven
  graduation to AWS/Azure (BAA) or E2E/Yotta (sovereign); portability keeps switching costs low; India
  residency + CERT-In/DPDP satisfied on every tier.
- **Costs/risks:** must keep the stack genuinely portable (avoid provider-proprietary lock-in beyond managed
  Postgres/K8s/S3); self-host Keycloak/Vault/observability → a platform/SRE owner is required; the final
  provider choice is deferred (decision owner: founders, within days).
- **Revisit when:** a contract mandates HIPAA/GovCloud, or a DPDP notification restricts health-data transfer
  further. *(The "which provider to start on" follow-up is now resolved — see the decision update below.)*

---

## Decision update — 2026-06-29: start-tier provider = **DigitalOcean Bangalore**

The deferred start-tier choice is made: **DigitalOcean, Bangalore (BLR1) region.** Use **managed Postgres (HA +
PITR) + DOKS (managed Kubernetes) + managed Redis + Spaces (S3-compatible)**, all pinned to BLR1; self-host
Keycloak/Vault/Grafana-LGTM on DOKS (also satisfies the CERT-In in-India log rule). **Fly.io Mumbai** was the
considered alternative — deprioritised because Fly Postgres is unmanaged and would require bolting on an external
managed Postgres.

This does **not** change the posture: hosting stays **provider-agnostic and portable** (K8s + Postgres + S3 API),
so DO is the *starting* tier, not a lock-in. The **graduation paths are unchanged** — **AWS Mumbai / Azure India**
(when a contract needs an explicit HIPAA BAA or the broadest managed set) and **E2E Networks / Yotta** (when a deal
needs an India-sovereign / GovCloud posture). Provider remains a **swap, not a rewrite**.

**Before pilot on DO:** POC the managed-Postgres **failover (RTO/RPO) + PITR**, confirm **Spaces S3-API
compatibility** for report PDFs/DICOM, and wire the **6-hr CERT-In / 72-hr DPDP** breach runbook. No BAA is needed
at this tier for non-PHI pilot workloads; sign a DPA, and a **BAA before any PHI** if/when graduating to a
hyperscaler tier.
