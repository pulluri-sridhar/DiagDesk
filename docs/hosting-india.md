# DiagDesk — India Hosting Decision (Provider-Agnostic Managed, India-Region)

*Posture: **provider-agnostic managed hosting, India-region.** Pick the provider for fit, not ideology — keep
**India-region data residency** as the hard rule and the architecture **portable** (Kubernetes + Postgres +
S3 API) so the provider is a **swap, not a rewrite**. **Start cheap/fast** on a managed provider (DigitalOcean
Bangalore / Fly.io Mumbai); **graduate per contract** to AWS Mumbai / Azure India (HIPAA BAA, broadest managed
set) or E2E Networks / Yotta (India-sovereign / GovCloud / MeitY-STQC / Tier-IV). The **final provider is an
open decision** (founders decide within days). This doc records the compliance basis, the provider landscape,
and the tiers. Companion to [tech-stack.md](tech-stack.md), [ADR-004](adr/004-hosting-and-data-residency.md),
and [technical-architecture.md](technical-architecture.md).*

---

## 1. The compliance reality (what actually forces what)

| Obligation | Status | What it means for hosting |
|---|---|---|
| **DPDP Act 2023 + Rules 2025** (notified 13 Nov 2025; ~18-month window → ~May 2027) | Uses a **"negative list"** — data may leave India *except* to restricted countries; **no list notified yet** | **Blanket India-localization is NOT yet legally mandatory.** But Government can impose conditions on **health/sensitive** data. → India residency is the prudent **default**, not (yet) a hard law. |
| **CERT-In Directions (2022)** | **MANDATORY** | **180 days of logs retained *within India*** + **6-hour breach reporting**. This is the rule that *does* effectively force India-resident log/observability storage. |
| **ABDM HDMP + EHR/FHIR standards** (only if you join ABDM) | Mandatory *if* integrating ABHA | Consent artefacts, FHIR serialization of lab reports, India-resident federated data. |
| **MeitY CSP empanelment + STQC audit** | **Optional** for private B2B | Required only to sell to **government / PSU / CGHS-type** buyers. You don't get empanelled — **your cloud provider does**. Choose an empanelled CSP to keep that door open. |

**Bottom line:** The binding constraint is **India-region residency** (driven by CERT-In + the prudent
default for health data), **not** any ban on hyperscalers. AWS Mumbai / Azure India are fully allowed (and are
the BAA-bearing graduation tier). The real decision is **which managed provider to start on and how to keep the
build portable** so the choice can change without a rewrite.

---

## 2. The portability model (so the provider is a swap, not a rewrite)

Some independent "managed data service" vendors deliver their **India region by running on AWS/GCP Mumbai**
(e.g. **Aiven, Redpanda Cloud, Grafana Cloud, MongoDB Atlas**) — fine for residency, but they add a vendor
dependency. The portable model we standardize on is: **managed Postgres + K8s + object storage (and, where
available, Kafka/Redis) from whichever provider is chosen, and self-host the rest (Keycloak, Vault,
Grafana/Prometheus) on that managed Kubernetes.** Because everything rides on **Kubernetes + Postgres + the S3
API**, moving between DigitalOcean/Fly, AWS/Azure, and E2E/Yotta is a re-deploy, not a re-architecture.
(Temporal has been removed from the platform — the lab saga is **Spring State Machine + Kafka choreography** —
so there is no separate workflow engine to host on any tier.)

---

## 3. Provider evaluation (does a *genuine* managed Postgres DBaaS exist?)

Researched June 2026. "Genuine DBaaS" = provider-operated provisioning + HA + backups, not "a VM with
Postgres installed."

| Provider | Managed Postgres | Managed K8s | S3 object store | Managed Kafka / Redis | MeitY/STQC | Healthtech-relevant certs | Verdict |
|---|---|---|---|---|---|---|---|
| **E2E Networks** (NSE-listed) | **Yes** — DBaaS; HA via read-replica **promotion**; backups to *your* bucket | Yes | Yes (EOS) | **Yes — managed Kafka + Valkey (Redis)** | Yes | SOC2, ISO 27001/17/18, PCI; **HIPAA not advertised** | **Most complete managed set + transparent INR pricing** |
| **Yotta (Yntraa "SutraDB")** | **Yes — fullest:** auto-failover, multi-zone sync replication, **PITR**, 99.95% SLA | Yes | Yes | Not clearly managed (self-host) | Yes (VPC+GCC) | **HIPAA explicit** + DPDP/RBI/SEBI pre-mapped; Tier IV | **Best compliance depth / enterprise & GovCloud** |
| **Jio Enterprise Cloud** | **Yes** — managed PG (async HA, read replicas, auto-backup) + MySQL/Mongo/Redis | Yes | Yes | **Yes (Kafka via Confluent)** | MeitY-accredited DCs | ISO 27001 family; **SOC2/HIPAA unverified**; young product | Credible, disruptor pricing; **maturity to validate** |
| **ESDS** (eNlight) | **Yes** — PG 13+, read replicas, cross-region | Limited public detail | Not confirmed | No | Yes (+broad ISO/PCI/SOC, DPDP-aligned) | Govt/BFSI-leaning option |
| Sify / CtrlS-Cloud4C / NxtGen / Tata / Pi / WebWerks / Krutrim / Zadara / NTT-Netmagic | **No genuine self-service Postgres DBaaS** — managed-on-VM or managed-services engagement | Varies | Varies | No | Mostly yes | Strong DCs, but DB is a managed engagement, not a product |

---

## 4. The tiers (final provider TBD — founders decide within days)

Hosting is **provider-agnostic, India-region, managed-first**. Rather than naming one winner, we lock a
**posture and a tiered shortlist**; the actual provider is an open decision recorded in
[ADR-004](adr/004-hosting-and-data-residency.md).

**Start tier (cost-optimized): ✅ selected — DigitalOcean Bangalore** (Fly.io Mumbai was the considered
alternative; deprioritised because Fly Postgres is unmanaged and would need an external managed PG). Begin here
— fast to stand up, cost-effective, full managed **Postgres + DOKS + Redis + Spaces** in the India (BLR1)
region. Good for pilot/MVP and non-regulated workloads. *(Decision 2026-06-29 — see ADR-004.)*

**Hyperscaler tier: AWS Mumbai / Azure India.** Graduate here when a contract needs an explicit **HIPAA BAA**,
the broadest managed service set, or an enterprise compliance portfolio (SOC/ISO/HITRUST). Sign the **BAA
before any PHI enters** the environment.

**Sovereign tier: E2E Networks / Yotta (Yntraa).** Graduate here when a deal needs an **India-sovereign,
non-hyperscaler** posture, **GovCloud**, or **MeitY/STQC + Tier-IV** (public-sector / CGHS). Of the two:
**E2E** is the most complete sovereign managed set for a small team — **managed Postgres + managed Kafka +
managed Valkey(Redis) + managed Kubernetes + S3-compatible object storage** with **transparent INR pricing**,
NSE-listed transparency, and MeitY+STQC. **Yotta (Yntraa)** adds **explicit HIPAA**, **fuller managed-Postgres
HA + PITR + 99.95% SLA**, and **Tier IV / GovCloud** (trade-off: less price transparency; Kafka/Redis become
self-hosted). **Also credible** in this tier: **Jio Enterprise Cloud** (disruptor pricing, broad managed DBs
incl. managed Kafka via Confluent — validate maturity + SOC2/HIPAA) and **ESDS** (government/BFSI-leaning,
broad certs).

> Whichever tier we land on, self-host the same portable set on the managed K8s — **Keycloak, Vault, and the
> Grafana/Prometheus (LGTM) stack** — and rely on the provider's managed Postgres/K8s/object-store. There is no
> Temporal to host (saga = Spring State Machine + Kafka).

### Decision guardrails (do before signing — any tier)
1. **POC the DBaaS**: actually test **failover RTO/RPO and point-in-time restore** — vendor HA claims vary
   (E2E is promotion-based; Yotta advertises auto-failover).
2. Get **written India-region commitment** and, if PHI is in scope, a **signed BAA / HIPAA scope**.
3. Confirm **CERT-In** posture (180-day in-India logs, 6-hour breach support) and — only if selling to
   government — current **MeitY empanelment** on the registry (ambud.meity.gov.in).
4. Confirm **S3-API compatibility** of the object store (some are Swift-based) before assuming drop-in S3 SDK.

---

## 5. What this means for the architecture

- **Managed from the provider:** PostgreSQL (per-service DBs), Kubernetes, S3-compatible object storage, and —
  where available (e.g. E2E/Jio, or AWS MSK/ElastiCache, or DO Managed Redis) — Kafka and Redis/Valkey.
- **Self-hosted on the managed K8s (portable across all tiers):** Keycloak (identity), Vault (secrets),
  OpenTelemetry Collector + **Grafana/Loki/Tempo/Mimir** (observability — also satisfies the CERT-In
  180-day-in-India log rule), and Kafka/Redis where the provider doesn't manage them. *(No Temporal — the lab
  saga is **Spring State Machine + Kafka choreography**, so there is no workflow engine to operate.)*
- **Edge nodes** (offline-first branch boxes) run **k3s + local Postgres** regardless of provider.
- **Region:** pin everything to the provider's India region; keep all logs in India (CERT-In); wire the
  6-hour CERT-In + 72-hour DPDP breach runbook; sign DPA/BAA before any PHI enters.
- **Budget a platform/SRE owner** for the self-hosted components (Kafka is the main toil) — and keep the build
  **portable** so the **provider is a swap, not a rewrite**.
