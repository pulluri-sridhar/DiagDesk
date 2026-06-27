# DiagDesk — Tech Stack (Decisive Reference)

*The opinionated, recommended stack. Rationale and diagrams live in [technical-architecture.md](technical-architecture.md).*
*Constraints honored: microservices, PostgreSQL, API Gateway, clean code, observability + security from day 1,
multi-tenant SaaS, offline-first, India data residency (DPDP).*

---

## At a glance

| Layer | Choice | Why (1-liner) | Notable alternative |
|---|---|---|---|
| **Primary backend** | **NestJS (TypeScript)** — modular, DI, hexagonal-friendly | One language across FE+BE, shared types, fast India hiring, clean-architecture out of the box | Java 21 + Spring Boot for the V2 Interop/FHIR service if HAPI maturity is needed |
| **Performance/edge services** | **Go** (Device Gateway, Sync Engine) | High-concurrency analyzer sockets + small edge binary | Rust (Sync Engine) |
| **API Gateway (edge)** | **Kong Gateway (OSS)** | Mature plugins: OIDC, rate-limit, OTel, mTLS | **Apache APISIX** (OSS-native) |
| **Internal comms** | **gRPC** (sync) + **Kafka/Redpanda** (async events) | Typed contracts + event backbone with outbox/CDC | RabbitMQ / NATS (lighter) |
| **Workflow/saga** | **Temporal** | Durable sagas, scheduled jobs (payouts, recalls, home-collection) | Camunda / app-level sagas |
| **Database** | **PostgreSQL 16** — database-per-service; multi-tenant via **Row-Level Security (RLS)** on `tenant_id` | Strong, open, RLS isolation; logical replication for edge sync | Per-tenant DB for large labs |
| **Edge (branch) store** | **PostgreSQL (or SQLite) on k3s/Docker agent** | Counter ops work offline; sync to cloud | — |
| **Cache / sessions** | **Redis** (ElastiCache) | Sessions, rate-limit counters, idempotency keys | — |
| **Object storage** | **S3 (AWS Mumbai)** + **MinIO** at edge | Report PDFs, documents, (V2) DICOM | — |
| **Search** | **OpenSearch** | Patient/report search, MIS | Postgres FTS (MVP) |
| **AuthN** | **Keycloak** (OIDC/OAuth2, self-hosted, India-resident) | SSO, JWT, refresh tokens, MFA | Ory Hydra/Kratos |
| **AuthZ** | **OPA / OpenpolicyAgent** (ABAC) + RBAC + Postgres RLS | Fine-grained, externalized policy | Cerbos |
| **Secrets** | **HashiCorp Vault** | Dynamic secrets, encryption-as-a-service | AWS Secrets Manager |
| **Service mesh** | **Linkerd** | mTLS + golden metrics, lightweight | Istio (heavier) |
| **Observability** | **OpenTelemetry** → **Grafana LGTM** (Loki logs, Tempo traces, Mimir/Prometheus metrics) + Grafana | Self-host, India-resident, one tracing standard | Grafana Cloud / Datadog |
| **Error tracking** | **Sentry** | Exceptions + release health (already wired) | — |
| **Product analytics** | **PostHog** | Funnels, feature flags, session insight (already wired) | — |
| **Feature flags** | **Unleash** (or PostHog flags) | Trunk-based dev, safe rollout | Flagsmith |
| **Frontend — web (counter/admin/MIS)** | **React + TypeScript + Vite**, PWA (offline-capable) | Offline counter ops; shared TS | Next.js (SSR not needed for app) |
| **Counter desktop (optional)** | **Tauri** wrapper over the PWA | Native printing/peripherals, small binary | Electron |
| **Frontend — mobile (patient + phlebotomist)** | **React Native** | Shared skills; offline routing for phlebotomist | Flutter |
| **Interop** | **HL7 v2 (HAPI)**, **FHIR R4 (HAPI FHIR)**, **DICOM (V2)** | ABDM HIP, analyzer & EHR integration | — |
| **Payments** | **Razorpay / PhonePe** (UPI-first) | India rails, UPI/cards/netbanking | Cashfree |
| **Messaging** | **Email: Resend** · **WhatsApp Business API (BSP)** · **SMS (DLT-compliant Indian provider)** | Transactional email + email OTP (Resend, low cost); report delivery, reminders, OTP across channels | Swappable behind the Notification service |
| **Cloud / region** | **E2E Networks** (India-sovereign, NSE-listed, MeitY-empanelled) — Mumbai/Delhi-NCR | DPDP residency + **no hyperscaler**; genuine managed Postgres DBaaS, managed K8s, S3-compatible object store | **Yotta (Yntraa)** or **ESDS** (both India-sovereign, MeitY) |
| **Orchestration** | **E2E Managed Kubernetes** in cloud; **k3s** at branch edge | India-resident managed K8s; lightweight edge | Yotta/ESDS managed K8s |
| **IaC / GitOps / CI-CD** | **Terraform** + **ArgoCD** + **GitHub Actions** | Reproducible infra, declarative deploys | Flux |
| **Repo strategy** | **Nx monorepo** (shared contracts/libs) | Contract sharing for a small team | Polyrepo + shared lib pkgs |
| **Supply-chain security** | Trivy + Syft (SBOM) + cosign (signing) + Semgrep (SAST) + OWASP ZAP (DAST) + gitleaks + Dependabot | "Secure from day 1" in CI | Snyk |

---

## Polyglot policy (keep it minimal)

Start **single-language** for all domain services. Introduce **Go only** for the two services where it earns
its keep:
- **Device Integration Gateway** — many concurrent persistent TCP sockets to analyzers (HL7/ASTM).
- **Sync Engine** — small static binary deployed to every branch edge node.

Everything else stays in the primary language to protect a small team's velocity and hiring.

---

## Database decision — PostgreSQL, not MongoDB (ADR)

**Decision: PostgreSQL is the system of record everywhere. MongoDB is not adopted.**

DiagDesk's core is **transactional, relational, and financial** — orders, billing, referral commissions,
B2B receivables, rate cards, audit. That demands what Postgres gives natively and MongoDB does not:

| Need | Postgres | MongoDB |
|---|---|---|
| **Multi-row ACID** (a bill + its line items + a commission accrual must commit atomically) | First-class | Weaker; multi-document txns exist but are not the model's strength |
| **Multi-tenant isolation** via **Row-Level Security** | Built-in (`tenant_id` RLS) | No equivalent — enforced only in app code |
| **Relational integrity** (FKs across patient/order/result/invoice) | Enforced | App-enforced |
| **Reporting / MIS** (joins, window functions, BI tools) | SQL ecosystem | Aggregation pipeline, weaker BI fit |
| **Schema-flexible data** (FHIR bundles, variable result payloads, report templates, audit metadata) | **JSONB** — document flexibility without losing relational guarantees | Native, but you give up the above |
| **Compliance primitives** | pgcrypto field encryption, hash-chained audit, PITR, RLS | Bolt-on |
| **India-resident MANAGED option (no hyperscaler)** | **Yes** — E2E, Yotta (SutraDB), ESDS offer managed Postgres | **MongoDB Atlas runs on AWS/GCP Mumbai → excluded by the no-hyperscaler rule**; self-hosting Mongo HA is pure ops toil |

**JSONB closes the only real gap** ("we need flexible schemas"): store FHIR resources, device payloads, and
template definitions as JSONB columns inside Postgres and keep one operational datastore. A document store is
revisited only if a *specific* future bounded context proves it — and even then, given the no-hyperscaler
constraint, Postgres JSONB or object storage is preferred. **Standardize on Postgres to minimize a small
team's operational surface.**

---

## Frontend stack (detail)

- **Language/build:** React 18 + **TypeScript** + Vite.
- **UI foundation:** Tailwind CSS + **shadcn/ui** — clean, modern, accessible, data-dense-friendly, and the
  base that the component sources below build on.
- **Component sources:** **21st.dev** — a registry of shadcn/Tailwind-compatible React components — for faster
  UI assembly (drops straight into our shadcn base). Treat it as an accelerator: **vet each component for
  accessibility, offline behavior, and bundle size** before adopting in clinical/data-dense screens.
- **Animation/motion:** **Framer Motion** for micro-interactions and polish. Use **judiciously** — rich on
  patient-facing portal/app, restrained on the lab counter (performance + no distraction in clinical flows;
  honor `prefers-reduced-motion`).
- **Data/state:** **TanStack Query** (server state) + Zustand (local UI state); **React Hook Form + Zod**
  (typed forms/validation); **TanStack Table** (grids); **Recharts/visx** (L-J charts, MIS dashboards).
- **Offline (counter app):** **PWA** + service worker + **IndexedDB (Dexie)** for the local working set,
  backed by the branch edge node; optional **Tauri** wrapper for native printing/peripherals.
- **Mobile:** **React Native (Expo)** for patient + phlebotomist apps (offline maps/routing for phlebotomists).
- **Shared types:** the **Nx monorepo** shares TypeScript contracts (and NestJS end-to-end types) between FE
  and BE.

## Notifications & email (providers + data-residency guardrail)

- **Email — Resend** for all transactional email **and email OTP** (low cost, good DX). **SMS** via a
  DLT-registered Indian provider (MSG91/Gupshup/Kaleyra). **WhatsApp** via a BSP using authentication-category
  templates for OTP. All sit **behind one Notification service**, so providers are swappable and OTP delivery
  (any channel) reuses this layer.
- **Data-residency guardrail (important):** Resend is a **US/AWS-based processor**. DPDP doesn't currently
  forbid this (negative-list model, no restricted list notified), but health data is sensitive, so:
  - **Email OTP is fine** — the payload is just a code, no PHI.
  - **Do NOT put PHI in report-delivery emails** (no patient reports as attachments, no diagnoses in the body).
    Email a **secure, authenticated, expiring link** to the patient portal; the **report itself stays on
    India-resident object storage**. Good security practice regardless of residency.
  - Sign a **DPA** with Resend; data minimization (email address + code/link only); keep the option to swap to
    an India-resident SMTP relay if a future DPDP notification restricts health-data transfer.

### Design workflow (design → code)
- **Google Stitch** (Google Labs) for **AI-assisted UI design** — rapidly generate screen designs/flows from
  prompts, iterate, and export to Figma/markup.
- **Pipeline:** Stitch for ideation/mockups → normalize into a **shared design system** (Tailwind design
  tokens: color, spacing, type, components) → implement with shadcn/ui + **21st.dev** components + **Framer
  Motion** → document in **Storybook**.
- **Guardrail:** Stitch output and 21st.dev components are **accelerators, not the source of production truth** —
  everything passes through our design tokens, accessibility checks (axe), and Storybook so the UI stays
  consistent, accessible, and offline/performance-safe. This keeps "modern & user-friendly" without
  fragmenting the design language.

---

## India hosting (no hyperscaler) — managed building blocks

With the **no-AWS/Azure/GCP** rule, anchor on a **MeitY-empanelled India-sovereign cloud**. The independent
"India-region" managed services (Aiven, Redpanda Cloud, Temporal Cloud, Grafana Cloud) all run on AWS/GCP
Mumbai under the hood and are therefore **excluded**. See [hosting-india.md](hosting-india.md) for the full
comparison and compliance basis (DPDP, CERT-In, MeitY).

| Building block | Managed on India-sovereign cloud? |
|---|---|
| PostgreSQL | **Yes** — E2E DBaaS; **Yotta SutraDB** (auto-failover, PITR, 99.95% SLA); ESDS |
| Kubernetes | **Yes** — E2E / Yotta / ESDS managed K8s |
| Object storage (S3-compatible) | **Yes** — E2E EOS, Yotta S3 |
| Kafka | **Yes on E2E** (managed Apache Kafka); self-host elsewhere |
| Redis | **Yes on E2E** (managed **Valkey**); self-host elsewhere |
| Keycloak, Temporal, Grafana/Prometheus stack, Vault | **Self-host** on the managed K8s (no India-resident managed option) |

**Recommendation:** **E2E Networks** as the primary (most complete managed set — Postgres + Kafka + Valkey +
K8s + object store — plus transparent INR pricing; NSE-listed, MeitY+STQC). **Yotta (Yntraa)** as the
compliance/enterprise alternative and the pick if you need explicit **HIPAA** attestation, fuller managed-PG
HA/PITR, Tier IV, or GovCloud for public-sector lab contracts. Run a short **POC to validate DBaaS failover +
PITR and obtain a written BAA + India-region commitment** before signing.

---

## Decisions — LOCKED (senior-architect call)
1. **Backend language: NestJS (TypeScript)** primary + **Go** for device gateway & sync engine. (Java/Spring
   Boot reserved as a per-service option for the V2 ABDM/FHIR Interop service only, if HAPI proves necessary —
   per-service polyglot is allowed by the architecture.)
2. **Hosting: E2E Networks** (primary). **Yotta/Yntraa** is the regulated-workload/HIPAA/GovCloud tier if/when
   a public-sector or HIPAA contract requires it.
3. **Platform components self-hosted** on the managed K8s (Keycloak, Temporal, Vault, observability) — budget a
   platform/SRE owner; lean on E2E's managed Kafka/Valkey to reduce toil.
4. **Repo: Nx monorepo.**
5. **Testing: Playwright-led** — see [testing-strategy.md](testing-strategy.md) for the full toolchain.

> These are the recommended defaults to build on. They remain reversible at build-planning if the team's
> hiring or a contract requirement changes the calculus (esp. #1 and #2).
