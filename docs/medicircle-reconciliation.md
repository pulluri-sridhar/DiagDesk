# DiagDesk ⇄ MediCircle — Reconciliation & Positioning

*How the deep, lab-first **DiagDesk** build relates to the broader, five-sided **MediCircle** platform designed
earlier — and the decisions that make them **one coherent program** rather than two divergent products.
Companion to [medicircle-vision.md](medicircle-vision.md) and [ADR-009](adr/009-medicircle-platform-direction.md).*

> **Phase:** Planning/docs only — no application code. Nothing here edits the external MediCircle repo.

---

## 1. The realization

**DiagDesk is MediCircle's "Diagnostic Center (Lab)" node — built far deeper.** MediCircle is a five-sided platform
(**labs · doctors/hospitals · pharmacies · patients · on-demand home-care**) designed in May 2026 and held in a
**separate repo** (`techie-yogi/medicircle`, branch `claude/business-idea-documentation-5bwO0`, build start ~July 2026)
with a full PRD/HLD/LLD/DB-schema/tech-stack/compliance/spec set. DiagDesk takes the **lab node** and builds it to
production depth (offline-first edge, HL7/ASTM analyzers, NABL QC, RLS multi-tenancy, capacity/scale, granular RBAC,
the hard anti-kickback posture). We already named MediCircle as DiagDesk's **V3 north star**
([ADR-009](adr/009-medicircle-platform-direction.md)); this doc reconciles the two into a single program.

**Program shape:** lab-first go-to-market. DiagDesk (lab MVP → V2) ships first as **node 1**; MediCircle is the V3
umbrella that wraps it and adds the other four sides.

---

## 2. Where they already align (keep as-is)

**PostgreSQL** · UUIDv7 PKs · transactional outbox · React + Tailwind + shadcn · React Native patient app ·
**DPDP + ABDM/ABHA + FHIR R4** · **AI strictly assistive with mandatory doctor sign-off** · WhatsApp-first
patient comms · and — importantly — **the same legal conclusion** that **NMC 2023 bans RMP referral
commissions**. The two were designed independently and still converged on the core data model and the
compliance reading. *(Backend language diverged — MediCircle assumed NestJS/TypeScript; the program now
standardizes on **Java 21 + Spring Boot 3** with TypeScript for frontend/mobile only and Go for the edge — see
§3 and [ADR-006](adr/006-backend-language.md).)*

---

## 3. Conflicts & resolutions (the decisions)

| # | Conflict | DiagDesk | MediCircle (prior) | **Resolution (program-wide)** |
|---|---|---|---|---|
| 1 | **Anti-kickback** | Builds **no commission engine**; compliant economics only ([ADR-007](adr/007-no-referral-commission-tooling.md)/[010](adr/010-compliant-referral-economics.md)) | Ships a **commission engine**, "OFF by default" for RMPs, B2B-only | **Adopt DiagDesk's no-engine line.** Remove MediCircle's `commission_agreements`/`commission_ledger`/Route-payout machinery; replace with **B2B-buyer billing + `professional_service_contract` (fixed/per_service) + referral analytics**. *MediCircle's own §8 market research already recommends dropping RMP commissions — this resolves an internal tension in MediCircle, it doesn't fight it.* |
| 2 | **Hosting / residency** | **Provider-agnostic managed, India-region** ([ADR-004](adr/004-hosting-and-data-residency.md)); start DO/Fly, graduate to AWS/Azure (BAA) or E2E/Yotta (sovereign); final provider TBD | **AWS Mumbai** (EKS, RDS, S3, CloudFront, Textract, SES, Secrets Manager) | **Provider-agnostic managed, India-region, program-wide.** AWS is **allowed** (BAA-bearing graduation tier) — the rule is **India residency + portability**, not avoiding hyperscalers. MediCircle's AWS-**coupled** services are made provider-agnostic / India-region (see §5), not banned. |
| 2a | **Backend language** | **Java 21 + Spring Boot 3** (TS = frontend/mobile only; Go for device gateway + sync engine) ([ADR-006](adr/006-backend-language.md)) | **NestJS / TypeScript** (shared FE/BE types) | **Java 21 + Spring Boot 3 program-wide.** Team expertise + enterprise HIS scope + HAPI FHIR/HL7 maturity. Drop the "shared FE/BE types" rationale → **contract-first OpenAPI/gRPC** generated clients. |
| 3 | **Architecture** | Right-sized microservices + db-per-service + Kafka + **Spring State Machine** sagas + **offline-first edge (k3s)** | Cloud-only **modular monolith** + BullMQ, no edge | **Hybrid.** The **lab node keeps the offline-first edge** + right-sized services (counter-critical, must run through outages). The **connective layer** (doctor/pharmacy/patient/home-care) may start as a **cloud modular monolith** and extract services later. Both docs already say "monolith/right-sized → services later," so this is a spectrum, not a contradiction. |
| 4 | **Money representation** | `numeric(12,2)` | **integer paise (`bigint`)** | **Integer paise program-wide** (safer money convention). DiagDesk docs flagged for alignment when the lab schema is implemented — not mass-edited here. |
| 5 | **Identity** | **Keycloak OIDC** (+ OTP/passkeys/biometric) | Self-managed JWT/OTP (Keycloak optional) | **Keycloak OIDC** canonical (more robust; already DiagDesk ADR-001). |
| 6 | **Async / frontend (minor)** | Kafka; Vite PWA (offline counter) | BullMQ; Next.js portals | **Unify on Kafka + Spring-native async** across both layers (the Node-only BullMQ no longer fits the Java/Spring backend); **Next.js** for portals + **Vite PWA** for the offline counter. |

---

## 3a. Unified tech stack (one program, one stack)

All five sides (lab · doctors/hospitals · pharmacies · home-care · patients) run on **one Java/Spring Boot/
PostgreSQL backbone** — a deliberate choice for team expertise, enterprise HIS reliability, and lower ops.
TypeScript is the **frontend/mobile** language and **Go** is the lab-edge language; service contracts are
**contract-first OpenAPI/gRPC** generating typed clients. The differences are not different *stacks*; they are
how the architecture is **composed** and which **add-ons** each surface pulls in.

### Shared core — identical across all five sides
| Layer | Choice |
|---|---|
| Backend | **Java 21 + Spring Boot 3** (Go for the lab edge; TS for frontend/mobile only) |
| Database | PostgreSQL 16 (+ pgvector, pg_trgm) |
| Identity | **Keycloak OIDC** (canonical — ADR-001) |
| Cache / queue | Redis / Valkey |
| Object store | **S3-compatible** (provider-agnostic S3 API, India-region) |
| Payments | Razorpay |
| Notifications | **Resend** (email) · WhatsApp (Gupshup/Meta) · MSG91 (SMS-DLT) · FCM (push) |
| Records / interop | ABDM/ABHA + FHIR R4 (HAPI) |
| Conventions | UUIDv7 · **integer paise** money · transactional outbox · DPDP consent-first |
| Service contracts | **Contract-first OpenAPI / gRPC** (typed clients; not shared FE/BE types) |
| Observability | OpenTelemetry → Grafana LGTM + Sentry + PostHog |
| Hosting | **Provider-agnostic managed, India-region** (start DO/Fly → AWS/Azure or E2E/Yotta; TBD) |

### Differs by surface — composition + add-ons, not a different stack
- **Architecture:** lab node = right-sized microservices + db-per-service + **Kafka** + **Spring State Machine**
  sagas + **offline-first edge** (k3s + local Postgres + **Go** sync agent + **Go** device gateway); connective
  layer (doctor/pharmacy/patient/home-care) = cloud **Spring Modulith modular monolith** + **Kafka/Spring-native
  async**, extract services later.
  *Go is lab-edge-only; Spring Boot is the backend everywhere else; TypeScript is frontend/mobile only.*
- **Frontend:** **Next.js** provider portals · React + **Vite PWA** offline lab counter · **React Native (Expo)**
  patient + care-pro apps (all React + TS + Tailwind + shadcn).
- **Add-ons pulled in only where relevant:** 100ms (teleconsult) · Google/OLA Maps (home-care matching + pharmacy
  delivery) · Anthropic Claude (AI cues, doctor sign-off) · alt/self-hosted OCR (report parsing) · HL7/ASTM Go
  device gateway (lab only) · OpenSearch (discovery, later phase).

> **Through-line:** DiagDesk and the prior MediCircle designs already shared ~90% of the data layer (PostgreSQL ·
> UUIDv7 · outbox · React Native · ABDM/FHIR). Reconciliation had to unify the **backend language** (Java/Spring
> Boot, not NestJS), **hosting** (provider-agnostic managed, India-region), **identity** (Keycloak), **money**
> (integer paise), and **remove the commission engine** — see §3.

---

## 4. Compliant monetization (unified)

No RMP referral commissions anywhere. The program monetizes via:
1. **SaaS subscriptions** for provider operations portals (doctor / lab / pharmacy).
2. **Patient transaction fees** (tests, teleconsults, pharmacy fulfilment).
3. **Home-care take-rate** + professional subscriptions.
4. **Lawful B2B** (institution-as-buyer; genuine professional-services contracts) — never per-referral.
5. **Insurance lead-gen** (consented) — without RMP procurement incentives.

---

## 5. Make MediCircle's AWS-coupled services provider-agnostic / India-region (for build-start)

MediCircle's prior design hard-wired specific **AWS-only** services. The reconciliation isn't "ban AWS" — AWS
Mumbai is an allowed graduation tier (with BAA). It's "**don't couple the build to one provider, and keep
everything India-region**." So the AWS-*proprietary* pieces are replaced with portable equivalents; the
generic managed primitives (Postgres/K8s/object-store) just run on **whichever India-region provider is chosen**.

| MediCircle (AWS-coupled) | Provider-agnostic / India-region replacement (DiagDesk-aligned) | Why |
|---|---|---|
| SES (email) | **Resend** (already chosen in DiagDesk) | Portable email API, not AWS-locked |
| S3 | **S3-compatible object store** (DO Spaces · AWS S3 · Azure Blob · E2E), India-region | Standard S3 API → provider is a swap |
| Textract (OCR) | Self-hosted/alt OCR (e.g. Tesseract/Docling) on the India cluster | Removes an AWS-proprietary dependency |
| CloudFront | India CDN/edge (e.g. Cloudflare India PoPs) | Avoid coupling to one provider's CDN |
| Secrets Manager | **Vault** | Portable across all tiers; self-hosted on K8s |
| RDS / ElastiCache / OpenSearch | Managed Postgres / Valkey / OpenSearch on the chosen provider (RDS/Aurora on AWS, or E2E/Yotta managed) | Generic managed primitives — keep the API, swap the provider |
| EKS/ECS | Managed Kubernetes on the chosen provider (DOKS/EKS/AKS/E2E); **k3s** at the lab edge | Portable K8s everywhere |

---

## 6. What each side contributes

**DiagDesk → the deep lab node** MediCircle's lab module lacks: offline-first edge + sync, HL7/ASTM analyzer
interfacing, sample lifecycle/accessioning/barcode + TAT, NABL QC (L-J/Westgard/EQAS), RLS multi-tenancy +
db-per-service, capacity/scale design (Citus/partitioning/k6), granular owner-RBAC, letterhead/stationery, report
handover + barcode, test-kit consumption, expense management, and the **hard anti-kickback posture**.

**MediCircle → everything beyond the lab** (see [medicircle-vision.md](medicircle-vision.md) for the full per-party
build): doctor/hospital portal + e-prescription + brand↔generic mapping; pharmacy fulfilment + delivery; the
**on-demand home-care pillar** (verified professionals, booking/matching/geo check-in-out, care plans, payouts);
teleconsultation; AI report decision-support; insurance recommendations/claims; a prescription-integrity layer
(e-sign, ABHA-linked, reuse-prevention); a credentialing/verification engine; and deeper ABDM/ABHA + FHIR.

---

## 7. Open items for MediCircle build-start (~July 2026)

- Make MediCircle's **AWS-coupled services provider-agnostic / India-region** (§5); pick the actual provider
  per [ADR-004](adr/004-hosting-and-data-residency.md) (start DO/Fly → AWS/Azure or E2E/Yotta; TBD).
- **Remove the commission engine** from MediCircle's schema; wire in DiagDesk's compliant model
  (`professional_service_contract`/`service_engagement` + B2B billing + referral analytics).
- Align **money representation** to integer paise across both repos.
- Confirm **Keycloak** as the program IdP.
- **[Legal review]** before any commission/e-pharmacy/telemedicine/advertising work (NMC 2023, e-pharmacy limbo,
  Telemedicine Practice Guidelines) — carry over MediCircle §8 and DiagDesk's anti-kickback docs.
- Decide repo strategy when build starts (DiagDesk lab node as a service inside the MediCircle monorepo, or a linked
  repo) — out of scope for this planning phase.
