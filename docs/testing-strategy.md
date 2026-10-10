# DiagDesk — Testing & Quality Strategy

*Senior-tester view. Playwright-led E2E plus a full test pyramid tuned for a multi-tenant, microservices,
offline-first healthcare platform. Quality gates run in CI on every PR. Companion to
[tech-stack.md](tech-stack.md) and [technical-architecture.md](technical-architecture.md).*

---

## 1. Principles
- **Shift-left:** most coverage at the cheap, fast layers; few, high-value E2E journeys at the top.
- **Test behavior, not implementation;** every bug fixed gets a regression test.
- **Real dependencies where it matters:** integration tests use **Testcontainers** (real Postgres/Kafka/Redis),
  not mocks, because RLS, transactions, and event flow are where defects hide.
- **The differentiators get the hardest tests:** offline sync, money/billing, and compliance (RLS isolation,
  audit, consent) are explicitly chaos- and adversarially tested.
- **CI is the gate:** a PR merges only if the pyramid + security + a11y gates pass.

---

## 2. The pyramid & tools

| Layer | Scope | Tooling |
|---|---|---|
| **Unit** | Pure logic, domain rules, calculations (result formulas, B2B billing, GST) | **JUnit 5 + AssertJ** (Java services), **Go testing** (edge services), **Vitest** (frontend / shared TS libs) |
| **Component (FE)** | React components/screens in isolation | **React Testing Library** + **Storybook** interaction tests; **MSW** to mock APIs |
| **Integration (BE)** | A service against real Postgres/Kafka/Redis; repository + RLS + outbox | **Testcontainers** + **Spring Boot Test** (`@SpringBootTest` / MockMvc / REST Assured) |
| **Contract** | Service-to-service & API compatibility | **Pact** (consumer-driven) + **Spectral** lint on OpenAPI/AsyncAPI |
| **E2E (web)** | Full user journeys through the real UI + stack | **Playwright** |
| **E2E (mobile)** | Patient & phlebotomist React Native apps | **Maestro** (preferred) or Detox |
| **Load / soak** | Throughput, latency SLOs, sustained load | **k6** |
| **Security** | SAST/DAST/deps/secrets/containers | **Semgrep**, **OWASP ZAP**, **Trivy**, **gitleaks**, **Dependabot** |
| **Accessibility** | WCAG on key screens | **axe-core** via Playwright |
| **Visual regression** | Catch unintended UI changes | Playwright screenshots / **Chromatic** (with Storybook) |
| **Resilience / chaos** | Network faults, offline↔online sync | **Toxiproxy** + custom sync harness |
| **Mutation (selective)** | Test-suite effectiveness on critical modules | **Stryker** (billing, validation, B2B receivables only) |

---

## 3. Playwright (E2E) — how we use it
- **Critical journeys as the E2E suite** (kept small and stable):
  1. Walk-in: register → bill (partial cash) → barcode → result → validate → WhatsApp report.
  2. Home collection: book → assign/route → collect → process → deliver → online pay.
  3. B2B settlement: institutional order → contract rate → account statement → receivables aging. (Plus a
     guardrail test: attaching a payout to a referral source is blocked — anti-kickback compliance.)
  4. Compliance: IQC plotted on L-J → immutable audit → consent captured.
- **Practices:** role-based fixtures & storage-state auth (skip login per test), per-test **tenant isolation**
  (fresh tenant + RLS), API-seeded setup (arrange via API, act via UI), `data-testid` selectors, network
  stubbing for third parties (WhatsApp/payment/HL7), trace-on-failure, parallel sharding in CI.
- **Cross-browser** (Chromium/WebKit/Firefox) + **PWA/offline** runs (service-worker + offline mode).
- **Accessibility** assertions (axe) embedded in E2E for key screens.
- **Visual snapshots** on report rendering and dashboards.

---

## 4. Specialized testing for our differentiators
- **Offline-first sync (highest risk):** a harness that (a) writes at the edge while offline, (b) injects
  network partitions with **Toxiproxy**, (c) reconnects and asserts convergence; adversarial cases on
  **money records** (no blind last-write-wins on billing), duplicate prevention via idempotency keys, and
  ULID/UUIDv7 id-collision safety.
- **Analyzer integration:** **mock HL7/ASTM analyzer simulators** feed results to the Device Gateway;
  assert mapping, reference-range flagging, and no transcription drift.
- **Multi-tenant isolation (security-critical):** automated tests prove tenant A can never read tenant B via
  API or a leaked query — **Postgres RLS** verified at the integration layer.
- **Compliance:** audit-trail tamper-evidence (hash-chain) tests; DPDP consent gating; data-subject
  access/erasure flows; retention-job correctness.
- **Billing/finance correctness:** property-based tests (fast-check) on GST, partial payments, rounding,
  refunds; mutation-tested.

---

## 5. CI quality gates (GitHub Actions, per PR)
1. Lint + format (Spotless/Checkstyle for Java, gofmt/golangci-lint for Go, ESLint + tsc + Prettier for TS).
2. Unit + component (coverage threshold enforced).
3. Integration (Testcontainers) + contract (Pact) verification.
4. Build + container scan (Trivy) + **SBOM** (Syft) + image signing (cosign).
5. Security: Semgrep (SAST), gitleaks (secrets), Dependabot; **ZAP (DAST)** on the deployed preview env.
6. E2E (Playwright) + a11y (axe) on an ephemeral **preview environment** per PR.
7. k6 smoke/load on a nightly/scheduled pipeline (not every PR).
8. Merge blocked unless gates pass; trunk-based with feature flags.

---

## 6. Test data & environments
- **Synthetic, non-PHI data** via factories + **Faker** (Indian names/addresses, realistic test panels); never
  use real patient data in non-prod.
- **Environments:** ephemeral PR preview → `sit` → `dev` → `prod` (mirrors the branch setup); India-region
  throughout (DPDP). Seed scripts provision a clean tenant per test run.
- **Observability in test:** traces/metrics from test runs flow to the same OTel/Grafana stack to catch
  regressions in latency/SLOs early.

---

### Tooling summary (one line)
**JUnit 5/AssertJ + Go testing + Vitest + RTL/Storybook + MSW** (unit/component) · **Testcontainers + Spring Boot Test + Pact** (integration/contract)
· **Playwright** (web E2E, a11y, visual) · **Maestro** (mobile E2E) · **k6** (load) · **Toxiproxy** (sync chaos)
· **Semgrep/ZAP/Trivy/gitleaks** (security) · **Stryker + fast-check** (critical-module rigor).
