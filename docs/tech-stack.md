# DiagDesk — Tech Stack (Decisive Reference)

*The opinionated, recommended stack. Rationale and diagrams live in [technical-architecture.md](technical-architecture.md).*
*Constraints honored: microservices, PostgreSQL, API Gateway, clean code, observability + security from day 1,
multi-tenant SaaS, offline-first, India data residency (DPDP).*

---

## At a glance

| Layer | Choice | Why (1-liner) | Notable alternative |
|---|---|---|---|
| **Primary backend** | **Java 21 + Spring Boot 3** (Spring Modulith for clean boundaries) | Healthcare-grade: HAPI FHIR + HL7v2, Spring Security, native OTel/Micrometer | **NestJS (TypeScript)** if the team is JS-first |
| **Performance/edge services** | **Go** (Device Gateway, Sync Engine) | High-concurrency sockets + small edge binary | Rust (Sync Engine) |
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
| **Messaging** | **WhatsApp Business API (BSP)** + SMS (DLT-compliant) + email | Report delivery, reminders | — |
| **Cloud / region** | **AWS Mumbai (ap-south-1)** [or Azure Central India] | DPDP India residency, managed services | Self-managed India DC |
| **Orchestration** | **Kubernetes (EKS)** in cloud; **k3s** at branch edge | Standard; lightweight edge | — |
| **IaC / GitOps / CI-CD** | **Terraform** + **ArgoCD** + **GitHub Actions** | Reproducible infra, declarative deploys | Flux |
| **Repo strategy** | **Nx monorepo** (shared contracts/libs) | Contract sharing for a small team | Polyrepo + shared lib pkgs |
| **Supply-chain security** | Trivy + Syft (SBOM) + cosign (signing) + Semgrep (SAST) + OWASP ZAP (DAST) + gitleaks + Dependabot | "Secure from day 1" in CI | Snyk |

---

## Polyglot policy (keep it minimal)

Start **single-language (Java/Spring Boot)** for all domain services. Introduce **Go only** for the two
services where it earns its keep:
- **Device Integration Gateway** — many concurrent persistent TCP sockets to analyzers (HL7/ASTM).
- **Sync Engine** — small static binary deployed to every branch edge node.

Everything else stays in the primary language to protect a small team's velocity and hiring.

> **Decision to confirm:** primary backend language. **Java/Spring Boot** is recommended for healthcare
> integration maturity and durability. If your team is JS-first and hiring JS in India, swap the primary to
> **NestJS (TypeScript)** — the architecture below is language-agnostic; only the framework column changes.
