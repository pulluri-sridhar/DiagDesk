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

NestJS / TypeScript backend · **PostgreSQL** · UUIDv7 PKs · transactional outbox · React + Tailwind + shadcn ·
React Native patient app · **DPDP + ABDM/ABHA + FHIR R4** · **AI strictly assistive with mandatory doctor sign-off** ·
WhatsApp-first patient comms · and — importantly — **the same legal conclusion** that **NMC 2023 bans RMP referral
commissions**. The two were designed independently and still converged on the core stack and the compliance reading.

---

## 3. Conflicts & resolutions (the decisions)

| # | Conflict | DiagDesk | MediCircle (prior) | **Resolution (program-wide)** |
|---|---|---|---|---|
| 1 | **Anti-kickback** | Builds **no commission engine**; compliant economics only ([ADR-007](adr/007-no-referral-commission-tooling.md)/[010](adr/010-compliant-referral-economics.md)) | Ships a **commission engine**, "OFF by default" for RMPs, B2B-only | **Adopt DiagDesk's no-engine line.** Remove MediCircle's `commission_agreements`/`commission_ledger`/Route-payout machinery; replace with **B2B-buyer billing + `professional_service_contract` (fixed/per_service) + referral analytics**. *MediCircle's own §8 market research already recommends dropping RMP commissions — this resolves an internal tension in MediCircle, it doesn't fight it.* |
| 2 | **Hosting / residency** | India-sovereign, **no hyperscaler** (E2E/Yotta, [ADR-004](adr/004-hosting-and-data-residency.md)) | **AWS Mumbai** (EKS, RDS, S3, CloudFront, Textract, SES, Secrets Manager) | **India-sovereign, no hyperscaler, program-wide.** MediCircle's AWS stack becomes the "alternative"; apply the swap list in §5. |
| 3 | **Architecture** | Right-sized microservices + db-per-service + Kafka/Temporal + **offline-first edge (k3s)** | Cloud-only **modular monolith** + BullMQ, no edge | **Hybrid.** The **lab node keeps the offline-first edge** + right-sized services (counter-critical, must run through outages). The **connective layer** (doctor/pharmacy/patient/home-care) may start as a **cloud modular monolith** and extract services later. Both docs already say "monolith/right-sized → services later," so this is a spectrum, not a contradiction. |
| 4 | **Money representation** | `numeric(12,2)` | **integer paise (`bigint`)** | **Integer paise program-wide** (safer money convention). DiagDesk docs flagged for alignment when the lab schema is implemented — not mass-edited here. |
| 5 | **Identity** | **Keycloak OIDC** (+ OTP/passkeys/biometric) | Self-managed JWT/OTP (Keycloak optional) | **Keycloak OIDC** canonical (more robust; already DiagDesk ADR-001). |
| 6 | **Async / frontend (minor)** | Kafka; Vite PWA (offline counter) | BullMQ; Next.js portals | **Coexist:** Kafka at the lab core, BullMQ acceptable in the connective layer; **Next.js** for portals + **Vite PWA** for the offline counter. |

---

## 4. Compliant monetization (unified)

No RMP referral commissions anywhere. The program monetizes via:
1. **SaaS subscriptions** for provider operations portals (doctor / lab / pharmacy).
2. **Patient transaction fees** (tests, teleconsults, pharmacy fulfilment).
3. **Home-care take-rate** + professional subscriptions.
4. **Lawful B2B** (institution-as-buyer; genuine professional-services contracts) — never per-referral.
5. **Insurance lead-gen** (consented) — without RMP procurement incentives.

---

## 5. AWS → sovereign swap list (for MediCircle build-start)

| MediCircle (AWS) | Sovereign replacement (DiagDesk-aligned) |
|---|---|
| SES (email) | **Resend** (already chosen in DiagDesk) |
| S3 | **S3-compatible object store** on E2E / Yotta |
| Textract (OCR) | Self-hosted/alt OCR (e.g. Tesseract/Docling) on the India cluster |
| CloudFront | India CDN/edge |
| Secrets Manager | **Vault** |
| RDS / ElastiCache / OpenSearch | Managed Postgres / Valkey / OpenSearch on E2E (Yotta for fuller HA/PITR) |
| EKS/ECS | Managed Kubernetes on the sovereign CSP; **k3s** at the lab edge |

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

- Apply the **AWS → sovereign swap list** (§5) to the MediCircle infra/integration choices.
- **Remove the commission engine** from MediCircle's schema; wire in DiagDesk's compliant model
  (`professional_service_contract`/`service_engagement` + B2B billing + referral analytics).
- Align **money representation** to integer paise across both repos.
- Confirm **Keycloak** as the program IdP.
- **[Legal review]** before any commission/e-pharmacy/telemedicine/advertising work (NMC 2023, e-pharmacy limbo,
  Telemedicine Practice Guidelines) — carry over MediCircle §8 and DiagDesk's anti-kickback docs.
- Decide repo strategy when build starts (DiagDesk lab node as a service inside the MediCircle monorepo, or a linked
  repo) — out of scope for this planning phase.
