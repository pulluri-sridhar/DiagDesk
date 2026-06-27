# DiagDesk — India Hosting Decision (No Hyperscaler)

*Constraint: host in **India only**, explicitly **not** AWS / Azure / GCP. This doc records the compliance
basis, the provider evaluation, and the recommendation. Companion to [tech-stack.md](tech-stack.md) and
[technical-architecture.md](technical-architecture.md).*

---

## 1. The compliance reality (what actually forces what)

| Obligation | Status | What it means for hosting |
|---|---|---|
| **DPDP Act 2023 + Rules 2025** (notified 13 Nov 2025; ~18-month window → ~May 2027) | Uses a **"negative list"** — data may leave India *except* to restricted countries; **no list notified yet** | **Blanket India-localization is NOT yet legally mandatory.** But Government can impose conditions on **health/sensitive** data. → India residency is the prudent **default**, not (yet) a hard law. |
| **CERT-In Directions (2022)** | **MANDATORY** | **180 days of logs retained *within India*** + **6-hour breach reporting**. This is the rule that *does* effectively force India-resident log/observability storage. |
| **ABDM HDMP + EHR/FHIR standards** (only if you join ABDM) | Mandatory *if* integrating ABHA | Consent artefacts, FHIR serialization of lab reports, India-resident federated data. |
| **MeitY CSP empanelment + STQC audit** | **Optional** for private B2B | Required only to sell to **government / PSU / CGHS-type** buyers. You don't get empanelled — **your cloud provider does**. Choose an empanelled CSP to keep that door open. |

**Bottom line:** Your "no hyperscaler" rule is a **sovereignty/business choice, not a legal mandate today.**
We honor it — and it is a credible trust signal for Indian health data — but it has one sharp consequence
(next section).

---

## 2. The sharp consequence of excluding hyperscalers

Most independent "managed data service" vendors deliver their **India region by running on AWS/GCP Mumbai**:
**Aiven, Redpanda Cloud, Temporal Cloud, Grafana Cloud, MongoDB Atlas** — all excluded by your rule. So the
realistic model is: **managed Postgres + K8s + object storage (and, on some providers, Kafka/Redis) from an
Indian-sovereign cloud, and self-host the rest (Keycloak, Temporal, Grafana/Prometheus, Vault) on that
managed Kubernetes.**

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

## 4. Recommendation

**Primary: E2E Networks.** It is the most complete non-hyperscaler managed stack for a small team —
**managed Postgres + managed Kafka + managed Valkey(Redis) + managed Kubernetes + S3-compatible object
storage** in one place — with **transparent INR pricing**, NSE-listed transparency, and MeitY+STQC. This
minimizes what we must self-host to just **Keycloak, Temporal, Vault, and the Grafana/Prometheus stack**.

**Compliance/enterprise alternative: Yotta (Yntraa).** Choose it (or run it as the regulated-workload tier)
when you need **explicit HIPAA** attestation, **fuller managed-Postgres HA + PITR + 99.95% SLA**, **Tier IV**,
or **GovCloud** for public-sector / CGHS-type lab contracts. Trade-off: less price transparency; Kafka/Redis
become self-hosted.

**Also credible:** **Jio Enterprise Cloud** (disruptor pricing, broad managed DBs incl. managed Kafka via
Confluent — validate product maturity + SOC2/HIPAA) and **ESDS** (government/BFSI-leaning, broad certs).

### Decision guardrails (do before signing)
1. **POC the DBaaS**: actually test **failover RTO/RPO and point-in-time restore** — vendor HA claims vary
   (E2E is promotion-based; Yotta advertises auto-failover).
2. Get **written India-region commitment** and, if pursuing it, a **signed BAA / HIPAA scope**.
3. Confirm **CERT-In** posture (180-day in-India logs, 6-hour breach support) and current **MeitY empanelment**
   on the registry (ambud.meity.gov.in).
4. Confirm **S3-API compatibility** of the object store (some are Swift-based) before assuming drop-in S3 SDK.

---

## 5. What this means for the architecture

- **Managed from the CSP:** PostgreSQL (per-service DBs), Kubernetes, S3-compatible object storage, and —
  on E2E/Jio — Kafka and Redis/Valkey.
- **Self-hosted on the managed K8s:** Keycloak (identity), Temporal (workflows), Vault (secrets),
  OpenTelemetry Collector + **Grafana/Loki/Tempo/Mimir** (observability — also satisfies the CERT-In
  180-day-in-India log rule), and Kafka/Redis where the CSP doesn't manage them.
- **Edge nodes** (offline-first branch boxes) run **k3s + local Postgres** regardless of CSP.
- **Region:** pin everything to the provider's India region; keep all logs in India (CERT-In).
- **Budget a platform/SRE owner** for the self-hosted components (Temporal + Kafka are the main toil).
