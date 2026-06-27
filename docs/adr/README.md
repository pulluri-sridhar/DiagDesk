# Architecture Decision Records (ADRs)

Authoritative log of DiagDesk's significant technical decisions. Each ADR records the **Context**, the
**Decision**, and its **Consequences**. ADRs consolidate decisions made across the planning docs into a single
place; the linked source doc holds the fuller rationale.

| ADR | Decision | Status | Source doc |
|---|---|---|---|
| [001](authentication.md) | Authentication — Keycloak OIDC, OTP channels, per-user policy, offline tokens | Accepted | tech-stack, technical-architecture §7 |
| [002](002-multi-tenancy-and-data-isolation.md) | Multi-tenancy & data isolation — database-per-service + `tenant_id` + Postgres RLS | Accepted | technical-architecture §4 |
| [003](003-offline-first-and-sync.md) | Offline-first & sync model — edge nodes + conflict-aware sync | Accepted | technical-architecture §6 |
| [004](004-hosting-and-data-residency.md) | Hosting & data residency — India-only, no hyperscaler (E2E primary) | Accepted | hosting-india |
| [005](005-database-postgresql.md) | Database — PostgreSQL (not MongoDB) | Accepted | tech-stack |
| [006](006-backend-language.md) | Backend language — NestJS (TypeScript) + Go for edge services | Accepted | tech-stack |

> New decisions: add a numbered file, set Status (Proposed → Accepted → Superseded), and link it here.
