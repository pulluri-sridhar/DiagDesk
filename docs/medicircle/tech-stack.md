# MediCircle — Program Tech Stack (Decisive Reference)

*The opinionated, recommended stack for the **whole MediCircle program** — all five sides
(**labs · doctors/hospitals · pharmacies · home-care · patients**) on one Java/Spring Boot/
PostgreSQL/Keycloak backbone, India-region.*

> **Scope.** This is the **program-wide** stack across all five sides. The deep **lab-node**
> stack (DiagDesk) lives in [`../tech-stack.md`](../tech-stack.md); the reconciliation that
> produced these decisions is in [`../medicircle-reconciliation.md`](../medicircle-reconciliation.md)
> (§3 conflicts/resolutions, §3a unified stack, §5 provider-agnostic swap list).

> **⚠️ This document supersedes the prior AWS-based MediCircle tech-stack** (§7 of the
> MediCircle handoff, "Technology Stack & Rationale v1.0", 2026-05-20). Per the
> [reconciliation](../medicircle-reconciliation.md) §2–§5, the following **LOCKED** decisions
> **override** the prior stack wherever they conflict:
> - **Backend = Java 21 + Spring Boot 3** (primary); **Go** stays lab-edge-only (device gateway +
>   sync engine); **TypeScript is frontend/mobile only**. See [Backend language](#why-a-hybrid-architecture)
>   and [ADR-006](../adr/006-backend-language.md).
> - **Provider-agnostic managed hosting, India-region.** Start on **DigitalOcean Bangalore /
>   Fly.io Mumbai**; graduate per contract to **AWS Mumbai / Azure India** (HIPAA BAA) or
>   **E2E / Yotta** (sovereign). The stack is portable (**K8s + Postgres + S3 API + Kafka**) so the
>   provider is a **swap, not a rewrite** — see [Infrastructure & DevOps](#infrastructure--devops-provider-agnostic-india-region)
>   and the swap list below. The prior AWS-coupled choices are demoted to "one tier among several."
> - **Identity = Keycloak OIDC** (not self-managed JWT).
> - **Money = integer paise** (`bigint`) everywhere (not `numeric`).
> - **No commission engine.** Monetization = SaaS + transaction fees + home-care take-rate +
>   lawful B2B (+ consented insurance lead-gen). See [Monetization](#monetization-no-commission-engine).
> - **Hybrid architecture** (lab-edge microservices + connective modular monolith) replaces the
>   prior cloud-only monolith. See [Why a hybrid architecture](#why-a-hybrid-architecture).

The stack is optimised for an **India-first healthcare platform**, a team with **deep Java /
Spring Boot expertise**, contract-first OpenAPI/gRPC clients across all five surfaces (FE/mobile
stay TypeScript), regulatory compliance (DPDP / ABDM / NMC), offline-resilient lab operations, and
a clean path from connective monolith to extracted services.

---

## At a glance

The shared core is **identical across all five sides**. Surface differences are composition +
add-ons, **not** a different stack.

| Layer | Choice | Why (1-liner) | Notable alternative |
|---|---|---|---|
| **Backend language** | **Java 21 + Spring Boot 3** | Team's deepest expertise; enterprise-grade reliability; richest healthcare ecosystem (HAPI FHIR/HL7, Spring Batch) | NestJS/Node (no longer chosen; FE/mobile stay TS) |
| **Backend** | **Spring Boot 3 (Spring Modulith)** | Modular DI, ports-and-adapters, OpenAPI, Spring Batch → clean bounded contexts | NestJS (reversed in ADR-006) |
| **Performance/edge services** | **Go** (lab Device Gateway + Sync Engine) — lab-edge only | High-concurrency analyzer sockets (HL7/ASTM) + small static edge binary | Rust (sync engine) |
| **API style** | **REST + OpenAPI + gRPC + WebSockets** | Simple, cacheable, tooling-rich; contract-first generated clients; WS for realtime (results, live location) | GraphQL (added complexity; may add for portals) |
| **Persistence** | **Spring Data JPA (Hibernate)** (+ **jOOQ** for complex SQL) | Type-safe mapping, migrations (Flyway); mirrors DB doc | MyBatis |
| **Primary DB** | **PostgreSQL 16** (+ **pgvector**, **pg_trgm**) | ACID for money; JSONB for FHIR/templates; RLS multi-tenancy; colocated vectors | MySQL; Mongo (poor fit for financial integrity) |
| **Edge (lab branch) store** | **PostgreSQL / SQLite on k3s** | Counter ops survive outages; logical-replication sync to cloud | — |
| **Cache / sessions** | **Redis / Valkey** | Cache, sessions, rate-limit, idempotency keys, WS pub/sub | — |
| **Async queue** | **Kafka** (event backbone) + **Spring-native async** (`@Async`, `@Scheduled`, ShedLock) for in-monolith jobs | Kafka = event backbone + outbox/CDC + choreography; Spring scheduling = simple durable jobs in the monolith | RabbitMQ / NATS |
| **Workflow / saga** | **Spring State Machine + Kafka choreography** | Durable sagas + scheduled jobs (payouts, home-collection, recalls) within the Spring ecosystem — no separate workflow platform | Camunda / app-level sagas |
| **Object storage** | **S3-compatible** (DO Spaces / S3 / Azure Blob / E2E EOS) + **MinIO** at lab edge | Reports/prescriptions/KYC/content; presigned URLs; encryption — **provider-agnostic S3 API, India-region** | — |
| **Search** | **OpenSearch** (later phase) | Lab/test/doctor/pharmacy discovery, content & MIS search | Postgres FTS (MVP start) |
| **Vectors** | **pgvector** | AI retrieval colocated with OLTP; no extra system | Pinecone, Qdrant |
| **Identity (AuthN)** | **Keycloak** (OIDC/OAuth2, self-hosted, India-resident) | SSO, JWT, refresh tokens, MFA, OTP/passkeys/biometric — **canonical (ADR-001)** | Self-managed JWT (prior MediCircle), Ory, Clerk, Auth0 |
| **Authorization (AuthZ)** | **OPA (ABAC)** + RBAC + **Postgres RLS** | Externalized fine-grained policy + DB-level tenant isolation | Cerbos |
| **Secrets** | **HashiCorp Vault** (self-hosted) | Dynamic secrets, encryption-as-a-service, rotation — provider-portable | — |
| **Web frontend** | **Next.js 15 (App Router) + React 19** — provider portals | SSR/RSC, routing, SEO for discovery pages; TypeScript | Remix, plain SPA |
| **Offline lab counter** | **React + TypeScript + Vite, PWA** | Counter ops work offline; service worker + IndexedDB (Dexie) backed by edge node | Next.js (SSR not needed here) |
| **Mobile** | **React Native (Expo)** — patient + care-pro apps | TypeScript; OTA updates; geo check-in/out + live location for care-pros | Flutter (separate Dart skillset) |
| **Styling/UI** | **Tailwind CSS + shadcn/ui + Radix** | Fast, accessible, consistent design system across all surfaces | MUI, Chakra |
| **Web state/data** | **TanStack Query + Zustand** (+ React Hook Form + Zod) | Server-cache + light client state; typed forms | Redux Toolkit |
| **Payments** | **Razorpay** | India rails (UPI/cards/netbanking/wallets); webhooks idempotent; **money = integer paise** | Cashfree, PhonePe PG |
| **Messaging** | **Resend** (email) · **Gupshup** (WhatsApp) · **MSG91** (SMS-DLT) · **FCM** (push) | Transactional email/OTP + report-link delivery + reminders across channels | Swappable behind one Notification service |
| **Video / teleconsult** | **100ms** | India-region WebRTC, low latency; token-gated rooms; consent-based recording | Agora, Twilio Video, Daily |
| **AI (clinical decision support)** | **Anthropic Claude** — `claude-opus-4-8` for hard cases, a **Sonnet tier** as default | Server-side, structured output, prompt caching; **assistive-only, mandatory doctor sign-off** | — |
| **OCR (report parsing)** | **Self-hosted/alt OCR** (Tesseract / Docling, self-hosted on the India cluster) | Async PDF→structured parameters; keeps PHI India-resident | Managed OCR (per-contract, India-region only) |
| **Maps / geo** | **Google Maps Platform / OLA Maps** | Geocoding, delivery radius, home-visit matching, routing & live location | Mapbox |
| **Records / interop** | **ABDM + ABHA, HL7 FHIR R4** (HAPI FHIR) (+ HL7 v2 / ASTM at lab) | Consent-driven exchange; FHIR adapter; analyzer & EHR integration | — |
| **Observability** | **OpenTelemetry → Grafana LGTM** (Loki/Tempo/Mimir) + **Sentry** + **PostHog** | One tracing standard; self-host India-resident; errors + product analytics | Grafana Cloud / Datadog (managed, non-India-region) |

---

## Integrations (India-first)

All third-party SDKs are wrapped in per-service `integrations/*` adapters so providers can be
swapped (e.g., Razorpay→Cashfree, 100ms→Agora, Gupshup→Interakt) without touching domain logic.

| Capability | Primary | Alternative | Notes |
|---|---|---|---|
| **Payments + payouts** | **Razorpay** | Cashfree, PhonePe PG | UPI/cards/netbanking/wallets; idempotent webhooks. **Money stored as integer paise (`bigint`).** Payouts for home-care take-rate / B2B settlement — **no per-referral commission flow**. |
| **WhatsApp** | **Gupshup** (Meta Cloud API) | Twilio, Interakt | Report-link delivery, reminders, OTP; pre-approved templates + media. |
| **SMS / OTP** | **MSG91** | Kaleyra, Twilio | DLT-registered templates (TRAI). |
| **Push** | **Firebase Cloud Messaging (FCM)** | APNs direct | Mobile + web push. |
| **Email** | **Resend** | India-resident SMTP relay | Transactional email + email OTP. Residency guardrail below. |
| **Video / teleconsult** | **100ms** | Agora, Twilio Video, Daily | India-region WebRTC; token-gated rooms; consent-based recording. |
| **AI (decision support)** | **Anthropic Claude** — default Sonnet tier; escalate to `claude-opus-4-8` for complex cases | — | Server-side; structured output; prompt caching; **assistive-only, doctor accountable**. |
| **OCR (report parsing)** | **Self-hosted/alt OCR** (Tesseract / Docling) on the India cluster | — | Async PDF→structured parameters. Managed OCR only if India-region (keep PHI resident). |
| **Maps / geo** | **Google Maps Platform** / **OLA Maps** | Mapbox | Geocoding, delivery radius, home-visit professional matching, routing, live location. |
| **Health records / ID** | **ABDM + ABHA, HL7 FHIR R4** (HAPI FHIR) | — | Consent-driven exchange; FHIR adapter; HIP/HIU flows. |
| **Lab interop** | **HL7 v2 (HAPI)** · **ASTM** · **DICOM (V2)** | — | Analyzer & EHR integration at the lab node (Go device gateway). |
| **Insurance / claims** | **Health-claims / TPA APIs** (NHCX-aligned) | Direct insurer APIs | Cashless/TPA, PM-JAY linkage, OPD insurance; consented sharing. Lead-gen only — no procurement incentives. |
| **E-sign / Rx integrity** | **Aadhaar e-Sign / digital signature** | DSC tokens | E-signed, ABHA-linked prescriptions; reuse-prevention registry. |
| **Identity (federation)** | **Keycloak OIDC** (self-hosted) | — | Program IdP; SSO across portals; OTP/passkeys/biometric. **Not self-managed JWT.** |

**Email residency guardrail (important).** Resend is a US/AWS-based processor. DPDP doesn't
currently forbid this (negative-list model), but health data is sensitive, so:
- **Email OTP is fine** — payload is just a code, no PHI.
- **Do NOT put PHI in emails.** No reports as attachments, no diagnoses in the body. Email a
  **secure, authenticated, expiring link** to the portal; the **report itself stays on
  India-resident object storage**.
- Sign a **DPA** with Resend; minimize data (email + code/link only); keep the option to swap to
  an India-resident SMTP relay if a future DPDP notification restricts health-data transfer.

---

## Infrastructure & DevOps (provider-agnostic, India-region)

Anchor on **provider-agnostic managed hosting, India-region**: pick the provider for fit, not
ideology, and keep the stack **portable** (Kubernetes + Postgres + S3 API + Kafka) so the provider
is a **swap, not a rewrite**. Start fast and cheap on a managed provider (**DigitalOcean Bangalore
/ Fly.io Mumbai**); graduate per contract to **AWS Mumbai / Azure India** (HIPAA BAA, broadest
managed set) or **E2E / Yotta** (India-sovereign, GovCloud). The final provider is an open decision
(see [ADR-004](../adr/004-hosting-and-data-residency.md)); India-region residency stays the hard
rule. See the lab-node [`../hosting-india.md`](../hosting-india.md) for the full DPDP/CERT-In
comparison.

| Area | Choice | Start tier (DO/Fly) | Graduation tiers |
|---|---|---|---|
| **Cloud / region** | **Provider-agnostic managed, India-region** | DigitalOcean Bangalore / Fly.io Mumbai | AWS Mumbai `ap-south-1` / Azure India (BAA) · E2E / Yotta (sovereign) |
| **Compute / orchestration** | **Managed Kubernetes**; **k3s** at the lab edge | DOKS / Fly Machines | EKS / AKS · E2E/Yotta managed K8s |
| **Containers** | **Docker** (multi-stage builds) | (same) | (same) |
| **Managed Postgres** | **Managed PostgreSQL** (auto-failover, PITR, HA) | DO Managed Postgres (Fly → external managed PG) | RDS/Aurora · Azure DB for PostgreSQL · E2E/Yotta managed PG |
| **Cache** | **Managed Redis / Valkey** | DO Managed Redis | ElastiCache · Azure Cache · E2E/Yotta managed Valkey |
| **Streaming** | **Apache Kafka** (event backbone) | Self-hosted on K8s | MSK · Event Hubs (Kafka-compat) · E2E managed / self-hosted |
| **Search** | **Managed/self-hosted OpenSearch** on the cluster | Self-hosted on K8s | Managed OpenSearch (per provider) |
| **Object store** | **S3-compatible** (S3 API); **MinIO** at edge | DO Spaces | S3 · Azure Blob · E2E EOS / Yotta S3 |
| **CDN / edge** | **India-region CDN/edge** | Cloudflare / DO | CloudFront / Azure CDN |
| **Edge security** | **Ingress/NGINX/Envoy + WAF** on the cluster | (same) | (same) |
| **Secrets** | **HashiCorp Vault** (self-hosted) | Self-hosted on K8s | Self-hosted on K8s (portable) |
| **Service mesh** | **Istio** (east-west mTLS) | Self-hosted on K8s | Self-hosted on K8s (portable) |
| **Platform components** | **Self-host Keycloak, Vault, Grafana LGTM** on managed K8s | Self-hosted on K8s | Use provider-managed Kafka/Redis where available, self-host where not |
| **DB proxy** | **PgBouncer** | (same) | RDS Proxy (optional) |
| **IaC / GitOps** | **Terraform + ArgoCD** | (same) | (same) |
| **CI/CD** | **GitHub Actions** | (same) | (same) |
| **Repo strategy** | **Nx monorepo** (shared contracts/libs) | (same) | (same) |
| **Supply-chain security** | **Trivy + Syft (SBOM) + cosign + Semgrep (SAST) + OWASP ZAP (DAST) + gitleaks + Dependabot** | (same) | (same) |

### Prior AWS-coupled → provider-agnostic swap list (canonical)

| Prior MediCircle (AWS-coupled) | Provider-agnostic replacement (India-region) |
|---|---|
| SES (email) | **Resend** (DPA + no-PHI guardrail) |
| S3 (object store) | **S3-compatible** (DO Spaces / S3 / Azure Blob / E2E; MinIO at edge) |
| Textract (OCR) | **Self-hosted/alt OCR** (Tesseract / Docling) |
| CloudFront (CDN) | **India-region CDN/edge** |
| Secrets Manager | **HashiCorp Vault** |
| RDS / ElastiCache / OpenSearch | **Managed Postgres / Redis-Valkey / OpenSearch** on the chosen provider |
| EKS / ECS | **Managed Kubernetes** on the chosen provider; **k3s** at the lab edge |
| WAF + ALB | **Ingress + WAF** on the cluster |

> **Recommendation:** **start on DigitalOcean Bangalore / Fly.io Mumbai** (fast, cost-effective,
> full managed Postgres/K8s/Redis/object-store) for pilot/MVP; **graduate to AWS Mumbai / Azure
> India** when a contract needs a HIPAA BAA or the broadest managed set, or to **E2E / Yotta** when
> a deal needs an India-sovereign / GovCloud posture. Run a short **POC validating DBaaS failover +
> PITR + S3-API compatibility and a written BAA + India-region commitment** before signing; AWS is
> now an allowed graduation tier (with BAA), not a banned one.

---

## Why a hybrid architecture

The prior MediCircle stack was a **cloud-only modular monolith** (no edge). DiagDesk's lab node
is **right-sized microservices + offline-first edge**. The reconciliation
([§3 conflict #3](../medicircle-reconciliation.md)) resolves this not as a contradiction but as a
**spectrum** — both prior docs already said "monolith/right-sized → extract services later."

**The program runs two complementary shapes, joined by one shared core:**

- **Lab node = right-sized microservices + offline-first edge.** Lab counter operations are
  **counter-critical and must run through internet outages**, and labs interface with
  **HL7/ASTM analyzers** over persistent sockets. So the lab node keeps:
  - **db-per-service** + **Kafka** event backbone (transactional outbox / CDC) + **Spring State
    Machine + Kafka choreography** sagas;
  - an **offline-first edge** on **k3s** with a **local Postgres** working set, a **Go sync
    engine** (small static binary, logical-replication sync to cloud), and a **Go device
    gateway** (many concurrent analyzer sockets). *Go is **lab-edge-only**; the backend is
    Java/Spring Boot and FE/mobile are TypeScript.*

- **Connective layer = cloud modular monolith.** The other four sides
  (**doctors/hospitals · pharmacies · patients · home-care**) start as a **single
  well-modularised Spring Boot (Spring Modulith) monolith** with **Kafka** (or Spring-native
  `@Async`/`@Scheduled` for in-process jobs). This buys a small founding team **fast iteration,
  simple local dev, one deploy, and transactional integrity** for money-critical flows. The
  bounded-context module seams + transactional outbox let us **extract `reports`,
  `notifications`, `payments`, etc. into independent services later** — without rewrites — once
  load or team size justifies the operational cost.

- **One shared core binds both.** Same Java/Spring Boot / PostgreSQL 16 / Keycloak OIDC /
  Razorpay (integer paise) / Resend+Gupshup+MSG91+FCM / ABDM+FHIR / OpenTelemetry→Grafana LGTM,
  with **contract-first OpenAPI/gRPC** schemas generating typed clients for the TypeScript FE/mobile,
  organised in the **Nx monorepo**. The differences are **how the architecture is composed and
  which add-ons each surface pulls in**, not different stacks.

**Add-ons pulled in only where relevant:** 100ms (teleconsult) · Google/OLA Maps (home-care
matching + pharmacy delivery) · Anthropic Claude (AI cues, doctor sign-off) · self-hosted OCR
(report parsing) · HL7/ASTM Go device gateway (**lab only**) · OpenSearch (discovery, later phase).

---

## Monetization (no commission engine)

**No RMP referral commissions anywhere** — NMC 2023 bans RMP referral commissions, and
MediCircle's own §8 market research already recommended dropping them. There is **no commission
engine, no `commission_ledger`, no Route-payout-per-referral machinery**. Replace with
**B2B-buyer billing + `professional_service_contract` (fixed / per_service) + referral
analytics**. The program monetizes via:

1. **SaaS subscriptions** for provider operations portals (doctor / lab / pharmacy).
2. **Patient transaction fees** (tests, teleconsults, pharmacy fulfilment).
3. **Home-care take-rate** + professional subscriptions.
4. **Lawful B2B** (institution-as-buyer; genuine professional-services contracts) — never per-referral.
5. **Insurance lead-gen** (consented) — without RMP procurement incentives.

---

## Compliance & standards

- **India DPDP Act 2023** — consent-first, purpose limitation, data-principal rights, breach
  process, **data residency** (satisfied by India-region hosting on whichever provider is chosen).
- **ABDM / ABHA** — health-ID linkage & consent framework; HIP/HIU flows.
- **HL7 FHIR R4** (+ HL7 v2 / ASTM / DICOM at the lab) — health-data interoperability.
- **TRAI DLT** — SMS template registration (MSG91); WhatsApp template pre-approval (Gupshup).
- **NMC 2023 (Telemedicine Practice Guidelines + anti-kickback)** — teleconsult conduct; **AI
  clearly assistive, doctor accountable with mandatory sign-off**; **no referral-commission
  tooling**.
- **CERT-In** — incident reporting / logging obligations.
- **Security baselines** — OWASP ASVS L2, encryption in transit/at rest (pgcrypto field-level +
  TLS), least privilege, hash-chained audit, Postgres RLS tenant isolation, Vault-managed secrets.
- **HIPAA-equivalent** controls applied as good practice (audit, access control, encryption); the
  **AWS Mumbai / Azure India** (HIPAA BAA) or **Yotta** tier available where an explicit
  HIPAA/BAA attestation is contractually required.

---

## Versions (target — pin in `package.json` / images)

Java **21 (LTS)** · Spring Boot **3.x** · Spring Modulith (current) · Node **22 LTS** (FE/mobile
tooling) · TypeScript **5.x** · Next.js **15** · React **19** · React Native **(Expo SDK current)**
· PostgreSQL **16** (pgvector, pg_trgm) · Redis/Valkey **7** · Hibernate/Spring Data JPA (current) ·
jOOQ (current) · Go **1.22+** (lab edge only) · pnpm **9** · Nx (current) · Kafka **3.x** ·
Spring State Machine (current) · Keycloak (current) · Vault (current) · Istio (current) ·
OpenSearch **2.x** · Terraform **1.9+** · ArgoCD (current).

> Current AI model line: **`claude-opus-4-8`** for hard cases, a **Sonnet tier** as the default —
> pin model IDs centrally and review per Anthropic's model-migration guidance.

---

## Decisions — LOCKED

1. **Backend language: Java 21 + Spring Boot 3** (primary) + **Go** for the lab device gateway &
   sync engine (lab-edge only). **TypeScript is frontend/mobile only** (React + Vite PWA, Next.js
   portals, React Native/Expo). No shared FE/BE types — **contract-first OpenAPI/gRPC** generates
   the typed clients (see [ADR-006](../adr/006-backend-language.md)).
2. **Hosting: provider-agnostic managed, India-region** — start on **DO Bangalore / Fly.io
   Mumbai**; graduate per contract to **AWS Mumbai / Azure India** (HIPAA BAA) or **E2E / Yotta**
   (sovereign). Portable (K8s + Postgres + S3 API + Kafka) → swap, not rewrite; final provider TBD
   (see [ADR-004](../adr/004-hosting-and-data-residency.md)).
3. **Identity: Keycloak OIDC** is the canonical program IdP (not self-managed JWT).
4. **Money: integer paise (`bigint`)** program-wide.
5. **No commission engine** — compliant monetization only (see above).
6. **Sagas: Spring State Machine + Kafka choreography** (no Temporal). **Service mesh: Istio.**
7. **Platform components self-hosted** on managed K8s (Keycloak, Vault, observability); use
   provider-managed Kafka/Redis where available, self-host where not.
8. **Repo: Nx monorepo.** **Testing: Playwright-led.**

> These supersede the prior AWS-based MediCircle stack. They remain reversible at build-planning
> if a contract requirement changes the calculus (esp. #1/#2), per the
> [reconciliation](../medicircle-reconciliation.md) §7 open items.

---

## Testing & quality

| Concern | Tooling |
|---|---|
| Unit / integration | **JUnit 5 + Mockito** (backend) · **Vitest** (frontend) |
| Integration w/ real deps | **Testcontainers** (Postgres, Kafka, Redis) |
| E2E (web) | **Playwright** (lead) |
| E2E (mobile) | **Detox** (React Native) |
| Load / performance | **k6** |
| Contract testing | **Pact** (+ schemathesis for OpenAPI) |
| Tracing / metrics / logs | **OpenTelemetry → Grafana LGTM** (Tempo / Mimir / Loki via pino) |
| Errors | **Sentry** (backend + web + mobile) |
| Product analytics / flags | **PostHog** (funnels, feature flags, session insight) |
| Security scanning | **Trivy** (images) · **Semgrep** (SAST) · **OWASP ZAP** (DAST) · **gitleaks** · `pnpm audit` (FE) · **Dependabot** |

---

*See also: [`../medicircle-reconciliation.md`](../medicircle-reconciliation.md) (program-wide
decisions & swap list) · [`../tech-stack.md`](../tech-stack.md) (deep lab-node stack) ·
[`../hosting-india.md`](../hosting-india.md) (India-region hosting compliance basis).*
