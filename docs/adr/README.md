# Architecture Decision Records (ADRs)

Authoritative log of DiagDesk's significant technical decisions. Each ADR records the **Context**, the
**Decision**, and its **Consequences**. ADRs consolidate decisions made across the planning docs into a single
place; the linked source doc holds the fuller rationale.

| ADR | Decision | Status | Source doc |
|---|---|---|---|
| [001](authentication.md) | Authentication — Keycloak OIDC, OTP channels, per-user policy, offline tokens | Accepted | tech-stack, technical-architecture §7 |
| [002](002-multi-tenancy-and-data-isolation.md) | Multi-tenancy & data isolation — database-per-service + `tenant_id` + Postgres RLS | Accepted | technical-architecture §4 |
| [003](003-offline-first-and-sync.md) | Offline-first & sync model — edge nodes + conflict-aware sync | Accepted | technical-architecture §6 |
| [004](004-hosting-and-data-residency.md) | Hosting & data residency — provider-agnostic managed, India-region (start DO/Fly; graduate to AWS/Azure or E2E/Yotta per contract) | Accepted | hosting-india |
| [005](005-database-postgresql.md) | Database — PostgreSQL (not MongoDB) | Accepted | tech-stack |
| [006](006-backend-language.md) | Backend language — Java 21 + Spring Boot 3 (primary) + Go for edge services; TypeScript frontend/mobile only | Accepted | tech-stack |
| [007](007-no-referral-commission-tooling.md) | No referral-commission tooling (anti-kickback compliance) | Accepted | compliance-anti-kickback |
| [008](008-granular-rbac-permissions.md) | Granular, owner-defined RBAC permissions (catalogue + per-user overrides) | Accepted | rbac-permissions |
| [009](009-medicircle-platform-direction.md) | MediCircle platform direction (V3 north star) | Accepted (direction) | medicircle-vision |
| [010](010-compliant-referral-economics.md) | Compliant referral economics (extends ADR-007) | Accepted | compliance-anti-kickback |

> New decisions: add a numbered file, set Status (Proposed → Accepted → Superseded), and link it here.
