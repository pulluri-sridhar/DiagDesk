# DiagDesk — Final Tech Stack

*Production-ready from day one. Built to scale from a single lab to thousands without rework.*
*Constraints honored: microservices · PostgreSQL + RLS · API gateway · security & observability from day one ·
offline-first · India data residency · best-in-class tools for healthcare.*

> **Last reviewed:** 2026-06-29 · **Status:** LOCKED

---

## At a glance

| Layer | Choice | Why |
|---|---|---|
| **Primary backend** | **Java / Spring Boot** | Team has deep expertise; proven at enterprise scale; rich ecosystem for healthcare (FHIR, HL7, batch) |
| **Workflow state** | **Spring State Machine** | Manages lab workflow saga (order → sample → processing → result → billing) within Spring ecosystem — no new platform to learn |
| **Performance / edge services** | **Go** | Device gateway (high-concurrency analyzer sockets) + sync engine (small static binary at edge) |
| **Async messaging** | **Apache Kafka** | Event backbone, choreography-based sagas, transactional outbox, durable replay |
| **Internal sync calls** | **gRPC** | Typed contracts, efficient binary protocol between services |
| **External API** | **REST** via Kong Gateway | Standard, tooling-friendly, easy for B2B partners to consume |
| **API Gateway (north-south)** | **Kong Gateway OSS** | Rate limiting per tenant/user/endpoint, API keys, auth plugin, B2B partner routing — from MVP to scale |
| **Service mesh (east-west)** | **Istio** | mTLS between all services, circuit breaking, traffic shifting, observability integration; team already knows it |
| **Database** | **PostgreSQL 16 + RLS** | ACID, multi-tenant row-level security, JSONB for flexible payloads — db-per-service |
| **Cache / sessions** | **Redis** | Industry standard; battle-tested in healthcare at scale; Redis Enterprise has HIPAA-eligible configurations |
| **Object storage** | **S3-compatible** (DO Spaces / AWS S3 / Azure Blob / E2E) | Managed, durable, India-region; report PDFs, DICOM, documents — provider-agnostic S3 API |
| **Search** | **OpenSearch** | Patient, catalog, and test search at scale; Apache 2.0 |
| **AuthN** | **Keycloak** | OIDC + OTP (email/SMS/WhatsApp) + passkeys; self-hosted, India-resident |
| **AuthZ** | **OPA + RBAC + PostgreSQL RLS** | Three-layer defense: gateway enforces roles, OPA evaluates fine-grained ABAC policies, RLS isolates every row by tenant |
| **Secrets** | **HashiCorp Vault** | Industry standard for secrets management; dynamic secrets, PHI encryption-as-a-service; widely adopted in healthcare enterprises |
| **WAF / DDoS / bot** | **Cloudflare** | WAF + DDoS + bot defense; free tier for MVP, Pro/Business for production |
| **Traces / metrics / logs** | **OpenTelemetry → Grafana stack** | One instrumentation standard; Prometheus (metrics) + Loki (logs) + Tempo (traces) + Grafana (dashboards); self-hosted, India-resident |
| **Error tracking** | **Sentry** (self-hosted) | Exception tracking + release health; BSL license — internal use free |
| **Product analytics** | **PostHog** (self-hosted) | Funnels, feature flags, session insights; MIT licensed |
| **Feature flags** | **PostHog flags** | Reuse existing PostHog — no separate tool needed |
| **Frontend — web** | **React + TypeScript + Vite + PWA** | Offline counter app (core differentiator); shared TS types across FE/BE |
| **UI components** | **Tailwind CSS + shadcn/ui** | Accessible, data-dense-friendly components you own; no licensing, no vendor lock-in |
| **Mobile** | **React Native (Expo)** | Patient, phlebotomist, owner apps; shared TypeScript types |
| **Interop** | **HL7 v2 (HAPI) + FHIR R4 (HAPI FHIR)** | ABDM HIP, analyzer & EHR integration |
| **Payments** | **Razorpay / PhonePe** | India rails, UPI-first |
| **Notifications** | **Resend** (email) · **WhatsApp BSP** · **SMS (DLT-registered)** | All behind one Notification service — providers swappable |
| **Cloud / region** | **Provider-agnostic managed, India-region** — start on **DigitalOcean Bangalore / Fly.io Mumbai**; graduate to **AWS Mumbai / Azure India** (HIPAA BAA) or **E2E / Yotta** (sovereign) per contract | India-region data residency (DPDP + CERT-In); provider is a swap, not a rewrite; final provider TBD |
| **Edge orchestration** | **k3s** | Lightweight K8s at branch edge; runs offline with local Postgres |
| **Cloud orchestration** | **Managed Kubernetes** (DOKS / EKS / AKS / E2E) | Fully managed, India-region; portable across providers |
| **IaC** | **Terraform** | BSL license — internal infra use is permitted; team already knows it |
| **GitOps / CD** | **ArgoCD** | Declarative, Git-driven deployments; Apache 2.0 |
| **CI** | **GitHub Actions** | Pipelines, supply-chain security scans |
| **Monorepo** | **Nx** | Polyglot monorepo (Java + Go + TypeScript); dependency graph + affected commands in CI |
| **Supply-chain security** | **Trivy + Syft + cosign + Semgrep + OWASP ZAP + gitleaks** | SBOM, image signing, SAST, DAST, secret scanning — baked into CI |

---

## Traffic architecture — Kong + Istio (not redundant)

Kong and Istio handle completely different boundaries:

```
Internet / B2B partners
        │
   [ Cloudflare ]          ← WAF, DDoS, bot defense
        │
  [ Kong Gateway ]         ← North-south: auth, rate-limit per tenant/user/endpoint,
        │                    API keys, request routing to BFFs
  ──────┼──────────────────────── Cluster boundary
        │
  [ Istio sidecar mesh ]   ← East-west: mTLS between every service,
        │                    circuit breaking, retries, traffic shifting
  [ Services ]
```

Kong handles everything at the cluster edge. Istio handles everything inside. No config overlap.

---

## Polyglot policy — keep it minimal

Two languages only:

- **Java / Spring Boot** — all domain microservices
- **Go** — Device Integration Gateway (high-concurrency analyzer TCP sockets) and Sync Engine (small static binary at every branch edge node)

No other languages introduced without an explicit architectural decision. Protects a small team's velocity and keeps hiring straightforward.

---

## Database decision — PostgreSQL, not MongoDB

**PostgreSQL is the system of record everywhere.**

| Need | PostgreSQL | MongoDB |
|---|---|---|
| Multi-row ACID (bill + line items + B2B receivable in one transaction) | Native | Weaker — multi-document transactions exist but are not the model's strength |
| Multi-tenant isolation via Row-Level Security | Built-in (`tenant_id` RLS, enforced at DB layer) | No equivalent — app-code only |
| Relational integrity (FK across patient / order / result / invoice) | Enforced by DB | App-enforced only |
| Reporting / MIS (joins, window functions, BI tools) | Full SQL ecosystem | Aggregation pipeline — weaker BI fit |
| Flexible payloads (FHIR bundles, device results, audit metadata) | **JSONB** — document flexibility without losing relational guarantees | Native, but you lose the above |
| Compliance primitives (field encryption, hash-chained audit, PITR) | pgcrypto, RLS, PITR | Bolt-on |
| Managed option with India-region + BAA | Yes — RDS/Aurora (AWS Mumbai), Azure Database for PostgreSQL | MongoDB Atlas India region runs on AWS/GCP; no BAA equivalent for PHI isolation |

**JSONB closes the only real gap.** Store FHIR resources, device payloads, and template definitions as JSONB columns inside Postgres. One operational datastore, minimal ops surface for a small team.

---

## Lab workflow saga — Spring State Machine + Kafka

The core lab workflow (registration → order → sample collection → processing → result → validation → report → billing) is a long-running, multi-step saga that must survive failures at any step.

**Approach:** Spring State Machine manages state transitions within each service. Kafka events carry state changes between services (choreography pattern). Each transition is idempotent — ULID/UUIDv7 IDs prevent duplicate processing on replay.

```
Patient registers
      │ Kafka: PatientRegistered
Order placed
      │ Kafka: OrderCreated
Sample collected
      │ Kafka: SampleCollected
Processing (device gateway)
      │ Kafka: ResultRaw
Result validated
      │ Kafka: ResultValidated
Report generated
      │ Kafka: ReportReady
Billing triggered
      │ Kafka: InvoiceCreated
```

Spring State Machine provides auditability and retry hooks at each step without introducing a separate workflow orchestration platform.

---

## Offline-first edge — branch node architecture

The branch edge node is the core differentiator. Counter operations never block on connectivity.

```
Branch edge node (k3s + local Postgres)
    ├── PWA counter app (service worker + IndexedDB)
    ├── Go sync agent (change-log push/pull to cloud)
    └── Go device gateway (HL7/ASTM analyzer sockets)
```

**Conflict resolution:**
- Append-only operations (orders, results, samples) — low conflict by design
- Mutable records — field-level last-write-wins with Lamport clocks
- Money records (billing, payments) — domain reconciliation only; never blind last-write-wins

Tested with Toxiproxy chaos harness: network partitions injected, convergence and idempotency asserted.

---

## Frontend stack

| Concern | Choice |
|---|---|
| Language / build | React 18 + TypeScript + Vite |
| UI components | Tailwind CSS + shadcn/ui (you own the source, fully customizable) |
| Offline counter | PWA + service worker + IndexedDB (Dexie) backed by branch edge node |
| Server state | TanStack Query |
| Local UI state | Zustand |
| Forms / validation | React Hook Form + Zod |
| Data grids | TanStack Table |
| Charts (L-J, MIS) | Recharts |
| Mobile | React Native (Expo) — patient, phlebotomist, owner apps |

---

## Observability stack

All services emit **OpenTelemetry** traces, metrics, and logs from day one using the shared service template.

| Signal | Tool |
|---|---|
| Metrics | Prometheus + Grafana |
| Logs | Loki |
| Traces | Tempo |
| Dashboards | Grafana |
| Errors | Sentry (self-hosted) |
| Product analytics | PostHog (self-hosted) |

Business metrics tracked alongside technical RED/USE metrics: turnaround time, rejection rate, B2B receivables/billing accuracy, sync lag.

Correlation IDs propagated across gRPC calls, Kafka events, and the edge sync boundary for end-to-end trace visibility.

---

## Security — defense in depth

| Layer | What it does |
|---|---|
| **Cloudflare** | WAF, DDoS protection, bot defense at the internet boundary |
| **Kong Gateway** | Rate limiting (per IP / user / tenant / endpoint), API key management, JWT validation plugin |
| **Keycloak** | OIDC authentication, OTP (email/SMS/WhatsApp), passkeys for staff/admin |
| **Istio** | mTLS between every service inside the cluster — zero-trust internal network |
| **OPA** | ABAC policy evaluation — fine-grained authorization externalized from service code |
| **PostgreSQL RLS** | Tenant isolation enforced at the database layer — last line of defense |
| **HashiCorp Vault** | Dynamic secrets, field-level PHI encryption, secret rotation |
| **Semgrep + ZAP + gitleaks** | SAST, DAST, secret scanning in every CI run |

**Compliance:** DPDP consent/retention/breach handling · CERT-In 180-day in-India log retention · hash-chained audit trail · VAPT before go-live.

---

## India hosting — provider-agnostic managed strategy

**Data residency requirement:** All PHI and logs must remain in India (DPDP + CERT-In 180-day retention). Use
India-region data centers exclusively, on **whichever managed provider is chosen** — the architecture is kept
portable (Kubernetes + Postgres + S3 API) so **the provider is a swap, not a rewrite**. The final provider is
an open decision (see [ADR-004](adr/004-hosting-and-data-residency.md)); the rows below show the candidates.

| Building block | Start tier — DO Bangalore / Fly.io Mumbai | Hyperscaler tier — AWS Mumbai / Azure India | Sovereign tier — E2E / Yotta |
|---|---|---|---|
| PostgreSQL (managed, HA + PITR) | DO Managed Postgres (Fly → external managed PG) | RDS/Aurora · Azure Database for PostgreSQL | E2E/Yotta managed Postgres |
| Kubernetes | DOKS / Fly Machines | EKS / AKS | E2E / Yotta managed K8s |
| Kafka | Self-hosted on K8s | MSK · Event Hubs (Kafka-compatible) | E2E managed / self-hosted |
| Redis | DO Managed Redis | ElastiCache · Azure Cache for Redis | E2E/Yotta managed Valkey |
| Object storage (S3 API) | DO Spaces | S3 · Azure Blob | E2E S3-compatible |
| Vault, Keycloak, Grafana stack | Self-hosted on K8s | Self-hosted on K8s | Self-hosted on K8s |

**Start tier — DigitalOcean Bangalore / Fly.io Mumbai.** Begin here: fast to stand up, cost-effective, full
managed Postgres/K8s/Redis/object-store (on Fly, pair app compute with an external managed Postgres). Good for
pilot/MVP and non-regulated workloads.

**Hyperscaler tier — AWS Mumbai / Azure India.** Graduate here when a contract needs an explicit **HIPAA BAA**,
the broadest managed set, or an enterprise compliance portfolio (HIPAA, HITRUST CSF, SOC 1/2/3, PCI DSS, ISO
27001). Sign the **BAA before any PHI enters** the environment.

**Sovereign tier — E2E Networks / Yotta (Yntraa).** Graduate here when a deal needs an **India-sovereign,
non-hyperscaler** posture, GovCloud, or MeitY/STQC + Tier-IV (public-sector/CGHS).

> Pin everything to an India region; keep all logs in India (180 days); sign a **DPA/BAA** with the chosen
> provider before any PHI enters the environment. The provider choice is deferred — the portability rule keeps
> switching cheap.

---

## Open source status — every tool

| Technology | License | Cost |
|---|---|---|
| Java / Spring Boot | Apache 2.0 | Free |
| Go | BSD | Free |
| Apache Kafka | Apache 2.0 | Free |
| gRPC | Apache 2.0 | Free |
| Spring State Machine | Apache 2.0 | Free |
| React + TypeScript + Vite | MIT | Free |
| Tailwind CSS + shadcn/ui | MIT | Free |
| React Native (Expo) | MIT | Free |
| PostgreSQL 16 | PostgreSQL License | Free |
| Redis | RSALv2 (2024) | Free for internal use; not for resale as a managed service |
| OpenSearch | Apache 2.0 | Free |
| Keycloak | Apache 2.0 | Free |
| OPA (Open Policy Agent) | Apache 2.0 | Free |
| Kong Gateway OSS | Apache 2.0 | Free |
| Istio | Apache 2.0 | Free |
| HashiCorp Vault | BSL 1.1 (2023) | Free for internal use; not for competing with HashiCorp |
| Cloudflare | Proprietary | Free tier → paid |
| OpenTelemetry | Apache 2.0 | Free |
| Prometheus + Grafana | Apache 2.0 / AGPL | Free (self-hosted) |
| Loki + Tempo | AGPL-3.0 | Free (self-hosted) |
| Sentry (self-hosted) | BSL | Free (internal use) |
| PostHog (self-hosted) | MIT | Free |
| Nx monorepo | MIT | Free |
| Kubernetes + k3s | Apache 2.0 | Free |
| Terraform | BSL | Free (internal infra use) |
| ArgoCD | Apache 2.0 | Free |
| GitHub Actions | Proprietary | Free tier |
| Trivy + Semgrep + ZAP + gitleaks | Apache 2.0 / LGPL | Free |
| AWS / Azure / DigitalOcean | Proprietary | Paid (hosting — unavoidable) |
| Razorpay / PhonePe | Proprietary | Transaction fees |

**Redis and Vault licensing note:** Both changed licenses (Redis in 2024, Vault in 2023). DiagDesk uses both internally to run its own product — this is permitted under both licenses. The restriction applies only if you were selling Redis or Vault as a managed service to others, which DiagDesk does not do.

---

## Locked decisions

1. **Primary backend: Java / Spring Boot** — team expertise; no NestJS/TypeScript backend.
2. **Go** for device gateway and sync engine only — no other services.
3. **Kafka choreography + Spring State Machine** for sagas — no Temporal.
4. **Kong (north-south) + Istio (east-west)** — both retained; serve different boundaries; no Kuma.
5. **Redis** — mature, battle-tested, HIPAA-eligible in enterprise configuration; RSALv2 license is permissible for internal product use.
6. **HashiCorp Vault** — industry standard for secrets management in healthcare; BSL license is permissible for internal use; not competing with HashiCorp.
7. **Cloudflare** for WAF/DDoS.
8. **Provider-agnostic managed hosting, India-region** — start on **DO Bangalore / Fly.io Mumbai**; graduate to **AWS Mumbai / Azure India** (HIPAA BAA) or **E2E / Yotta** (sovereign) per contract. Stack kept portable (K8s + Postgres + S3 API) so the provider is a swap, not a rewrite; final provider TBD (see ADR-004). Sign a BAA with the chosen provider before PHI enters the environment.
9. **Nx monorepo** — polyglot (Java + Go + TypeScript) with dependency graph.
10. **Terraform** — BSL license is permissible for internal infrastructure management; not competing with HashiCorp.

> These decisions are final for MVP through V2 scale. Revisit only if a specific bounded context
> proves a hard requirement that this stack cannot meet — and document it as an ADR.
