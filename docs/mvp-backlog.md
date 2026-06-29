# DiagDesk — Phase 0 Foundation & MVP Backlog

*Sprint-ready breakdown: the foundation that must exist before features, then the MVP epics → user stories
with acceptance criteria, in build order, ending with the first end-to-end vertical slice. Maps to
[features.md](features.md) (MVP-tagged items), [technical-architecture.md](technical-architecture.md), and
[testing-strategy.md](testing-strategy.md).*

**Story format:** `As a <role>, I want <capability>, so that <value>.` Acceptance criteria in Given/When/Then.
**Definition of Done (every story):** code + unit/integration tests (Testcontainers), contract tests where it
crosses a service, OpenAPI updated, OTel traces/metrics emitted, RBAC + RLS enforced, audit logged where
stateful, a11y-checked UI, passes CI gates ([testing-strategy.md §5](testing-strategy.md)), works offline if it
is a counter operation.

---

## Phase 0 — Foundation (≈3–4 weeks, no product features until done)

> Goal: a "golden path" so every later service inherits security, observability, tenancy, and CI by cloning a
> template. This is what makes "clean, secure, observable from day 1" real instead of aspirational.

### F0.1 — Monorepo & service template
- Nx monorepo; shared libs: `auth`, `telemetry`, `tenancy` (RLS context), `events` (outbox), `testing`.
- A **service template** (Java 21 + Spring Boot 3) preloaded with: OTel, Keycloak auth guard, RLS-aware DB
  module, outbox + Kafka publisher, OPA client, health/readiness probes, structured logging, Dockerfile, CI
  pipeline.
- **Done when:** `nx g service <name>` scaffolds a running service that authenticates, emits a trace, exposes
  `/health`, and ships a passing pipeline — with zero hand-wiring.

### F0.2 — CI/CD & quality gates
- GitHub Actions: lint → typecheck → unit → integration (Testcontainers) → contract (Pact) → build → Trivy +
  SBOM (Syft) + cosign → Semgrep/gitleaks → deploy to **ephemeral preview env** → Playwright + axe.
- ArgoCD GitOps to `sit`/`dev`; trunk-based with feature flags (Unleash).
- **Done when:** a trivial PR runs all gates green and auto-deploys a preview URL.

### F0.3 — Infrastructure (provider-agnostic managed, India region)
- Terraform: managed K8s, managed PostgreSQL, S3-compatible object store, managed Kafka + Valkey — on the
  chosen India-region provider (start on DigitalOcean Bangalore / Fly.io Mumbai; portable to AWS Mumbai /
  Azure India or E2E / Yotta). Stack kept portable so the provider is a swap, not a rewrite.
- Self-hosted on K8s: Keycloak, Vault, OTel Collector + Grafana/Loki/Tempo/Mimir, Sentry.
- All pinned to India region; logs retained in-India (CERT-In).
- **Done when:** a service can reach Postgres (RLS on), publish/consume Kafka, read a Vault secret, and its
  traces/logs/metrics appear in Grafana.

### F0.4 — Edge node & sync skeleton
- Branch edge: k3s (or Docker Compose) running local Postgres + Go Sync Agent + Go Device Gateway stub.
- Sync Engine (cloud) ↔ Sync Agent: change-log push/pull, idempotent, resumable; ULID/UUIDv7 ids.
- **Done when:** a record created offline at the edge appears in cloud after reconnect, and vice-versa, with a
  Toxiproxy partition test passing.

### F0.5 — Identity, tenancy & security baseline
- Keycloak realms; JWT with `tenant_id`/`branch_id`/roles; gateway (Kong) validates and propagates claims.
- Postgres RLS policies keyed on `tenant_id`; OPA policy bundle; mTLS (Istio).
- **Done when:** an automated test proves tenant A cannot read tenant B via API or DB, and an unauthorized role
  is denied by OPA.

---

## MVP Epics (build order)

> Each epic is a thin, releasable increment. Offline-first (F0.4), audit/consent (E10), and observability are
> threaded through every epic, not bolted on at the end.

### E1 — Organization, branches, users & roles
- **S1.1** As a lab owner, I want to onboard my organization and add branches, so that the system reflects my
  network. *AC:* Given a verified owner, when I complete the setup wizard, then org + ≥1 branch exist with
  config (hours, logo, letterhead) and are tenant-isolated.
- **S1.2** As an admin, I want to create staff users and assign branch-scoped roles, so that access is least-
  privilege. *AC:* role changes take effect immediately; actions are audit-logged; a user sees only their
  branch's data.
- **S1.3** As a staff member, I want to log in with MFA — **Email-OTP, Authenticator-app (TOTP), or biometric
  (passkey)** — so that access is secure. *AC:* failed-login lockout, session expiry, refresh-token rotation;
  ≥2 factors enforced for money operations.
- **S1.4** As an owner, I want to set **granular per-feature permissions** when creating a user (from the
  permission catalogue, with per-user overrides + limits like discount-% and financial-report-days), so that
  access matches each role. *AC:* effective permissions = role ∪ overrides; enforced at gateway **and** RLS;
  changes immediate + audit-logged. See [rbac-permissions.md](rbac-permissions.md).

### E2 — Master data & catalogue
- **S2.1** Manage the **test master** (test, method, unit, specimen, container, TAT, reference & critical
  ranges). *AC:* age/sex-specific ranges resolve correctly at result time.
- **S2.2** Define **panels/profiles/packages**. *AC:* ordering a panel expands to its tests and prices.
- **S2.3** Manage **rate cards** per branch and per B2B partner. *AC:* the correct price is auto-selected by
  patient type/partner at billing.
- **S2.4** Configure **report templates** per test/department. *AC:* a template renders a valid PDF with
  placeholders resolved.
- **S2.5** Maintain **referring doctors** and **B2B partners**. *AC:* searchable; linkable to an order.
- **S2.6** Build the test master by **picking from the global NABL catalogue** (seeds ranges) **and** creating
  **custom non-NABL tests**. *AC:* picked tests inherit NABL reference ranges; `is_custom` tests are clearly
  flagged; both are orderable.
- **S2.7** Manage a **Departments** master and a **saved letterhead/stationery**. *AC:* tests carry a
  `department_id`; a report template renders on the saved letterhead in preview.

### E3 — Patient registration & MPI
- **S3.1** As front-desk, I want fast walk-in registration with minimal fields, so that queues move. *AC:*
  register in < 30s; works **offline**; duplicate suggestions surfaced (MPI match).
- **S3.2** Capture **DPDP consent** at registration. *AC:* consent record stored with purpose + timestamp;
  blocking if mandatory consent declined.
- **S3.3** Retrieve a returning patient by phone/ID. *AC:* history visible; no duplicate created.

### E4 — Order entry & billing
- **S4.1** Create an **order** (tests/panels) for a patient. *AC:* price from correct rate card; TAT computed;
  works offline.
- **S4.2** Generate an **invoice** with **cash/UPI/partial payments & dues**. *AC:* balance tracked; partial
  payment recorded; receipt printable at the counter offline.
- **S4.3** **GST-aware** invoicing for mixed exempt/taxable lines. *AC:* correct tax per line; compliant
  invoice number sequence.
- **S4.4** Apply **discounts at registration with a mandatory free-text justification**. *AC:* a discount cannot
  be saved without a justification; amounts above the user's `discount_limit_pct` require an authorized approver;
  both justification + approver are audit-logged.
- **S4.5** **Day-end cash reconciliation**. *AC:* expected vs collected per shift; variance flagged.

### E5 — Sample lifecycle (pre-analytical)
- **S5.1** **Accession & print barcode/QR** on order. *AC:* unique accession id; label prints offline.
- **S5.2** Track **sample status** (collected → received → in-process → reported). *AC:* each transition
  timestamped and audit-logged; TAT clock runs.
- **S5.3** Record **sample rejection** with reason codes. *AC:* reason captured; feeds QC analytics; triggers
  re-collection task.
- **S5.4** **TAT breach alerts**. *AC:* pending-beyond-TAT samples surfaced on the ops dashboard.

### E6 — Analyzer integration & result capture
- **S6.1** Interface a common analyzer via **HL7/ASTM** (Device Gateway). *AC:* results auto-matched to
  accession; unmatched results quarantined for review.
- **S6.2** **Manual result entry** for non-interfaced tests. *AC:* formula/derived values computed;
  range-flagged (H/L/critical).
- **S6.3** Worklist download to analyzer. *AC:* pending tests appear on the analyzer worklist.

### E7 — Results & validation
- **S7.1** **Auto-validation** of in-range results by rule. *AC:* configurable rules; out-of-range held for
  human validation.
- **S7.2** **Multi-level validation / authorization** (tech → pathologist sign-off). *AC:* unauthorized result
  cannot be reported; every change audit-logged.
- **S7.3** **Repeat/amend** a result. *AC:* amendment versioned with reason; prior version retained.

### E8 — Reporting & delivery
- **S8.1** Generate a report from template **on the saved letterhead/stationery**, with an **inline-editable
  print preview**, then route to **review → owner/pathologist sign-off + digital signature**. *AC:* preview shows
  the actual letterheaded report and is editable before sign-off; unsigned reports cannot be issued; preliminary
  vs final states; reprint with version history.
- **S8.2** Deliver via **WhatsApp (staff-initiated/manual) + SMS + email**. *AC:* WhatsApp send is an explicit
  user action (not auto-push); delivery status tracked; secure access (OTP/expiring link); retry on failure.
- **S8.3** Patient/doctor retrieves the report. *AC:* access audit-logged; watermarking on shared copies.
- **S8.4** Track **prints and handover**. *AC:* each print increments `report.print_count` + writes a print-log;
  handover marked by **scanning the report/accession barcode** (or manual), recording who/when; pending-handover
  worklist.

### E9 — Offline-first & sync (cross-cutting, hardened here)
- **S9.1** All counter ops (register/bill/barcode/result) work during an internet outage. *AC:* no blocking;
  queued for sync.
- **S9.2** Reliable reconciliation on reconnect. *AC:* convergence proven; **billing never blind-merges**
  (domain reconciliation); idempotent; Toxiproxy chaos tests green.

### E10 — Audit, consent & DPDP foundation (cross-cutting)
- **S10.1** **Tamper-evident audit trail** for all stateful actions. *AC:* hash-chained; verification job
  detects tampering.
- **S10.2** **Consent, retention & data-subject requests**. *AC:* access/erasure honored within policy;
  retention jobs run; **72-hr/6-hr breach** runbook wired.

### E11 — Operational dashboard (basic MIS)
- **S11.1** Live ops view: registrations, samples by status, pending/overdue, TAT. *AC:* per-branch; near-real-
  time from event read-model.

### E12 — Inventory & test-kits (owner-flagged priority)
- **S12.1** Manage a **reagent/consumable + test-kit master** with **`tests_per_kit`**, lot & expiry. *AC:* a kit
  records how many tests it yields; expiry tracked.
- **S12.2** **Consume stock on test run** + receipt/issue ledger. *AC:* running a test decrements the kit's
  `tests_remaining`; `stock_ledger` is append-only and reconciles `qty_on_hand`.
- **S12.3** **Reorder-threshold low-stock alerts**. *AC:* when `qty_on_hand ≤ reorder_threshold` (or a kit nears
  empty/expiry), an alert + purchase requisition is raised.

### E13 — Expense management
- **S13.1** Record **day-to-day expenses** by category (rent/salaries/utilities/reagents/maintenance/petty-cash…)
  with mode, payee, note, date. *AC:* entry permission-gated; **expense reports** by category/branch/period;
  feeds department/branch P&L.

---

## First vertical slice (Sprint 1–2 target): the **walk-in journey**

A thin path through real services proves the architecture end-to-end before breadth:
**register (offline) → order + cash bill → print barcode → manual result → pathologist sign-off → signed PDF →
WhatsApp delivery**, with audit + consent + a trace visible in Grafana, and a Playwright E2E covering the whole
journey. Stories: S3.1, S3.2, S4.1, S4.2, S5.1, S6.2, S7.2, S8.1, S8.2, S10.1, plus the F0.* foundation.

---

## Suggested sprint sequence (2-week sprints, indicative)
1. **S0a** — F0.1, F0.2 (monorepo, template, CI gates).
2. **S0b** — F0.3, F0.5 (infra, identity/tenancy/RLS).
3. **S0c** — F0.4 (edge + sync skeleton) + E1 (org/branch/users).
4. **S1** — E2 (master data) + E3 (registration + consent).
5. **S2** — E4 (order + billing) + **walk-in vertical slice** wired (S8.1 manual path).
6. **S3** — E5 (sample lifecycle) + E10 (audit/consent hardening).
7. **S4** — E6 (analyzer) + E7 (validation).
8. **S5** — E8 (reporting + delivery) + E9 (offline/sync hardening) + E11 (ops dashboard) + E12 (inventory/test-kit) + E13 (expenses) → **MVP**.

> Timeline is team-size dependent; assumes the team in [stakeholder-plan.md §8](stakeholder-plan.md). Re-estimate
> at sprint planning with the actual team.
