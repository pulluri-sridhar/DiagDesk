# ADR-002: Multi-tenancy & Data Isolation

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture
**Related:** [technical-architecture.md](../technical-architecture.md) §4, §7, [tech-stack.md](../tech-stack.md)

---

## Context
DiagDesk is a single platform serving thousands of independent diagnostic labs. Each lab's patient (PHI),
financial, and operational data must be **strictly isolated** from every other lab's, while keeping the system
**affordable to run for many small (SMB) tenants** and **scalable** for the occasional large chain. Isolation
is a hard requirement (DPDP, patient safety) and must be enforced in depth, not by application code alone.

## Decision

1. **Tenant = lab organization.** Branches/collection-centers are sub-units within a tenant (`branch_id`).

2. **Database-per-service** (microservices own their data); **no shared database** across services.

3. **Shared-schema multi-tenancy with `tenant_id` + Postgres Row-Level Security (RLS)** inside each service's
   database:
   - Every tenant-scoped table carries `tenant_id` (and `branch_id` where relevant).
   - **RLS policies** filter every query by the `tenant_id` set from the **verified JWT claim**
     (`SET app.tenant_id`), so isolation holds even if application code has a bug.

4. **Claim propagation, defense in depth:** the gateway (Kong) validates the JWT and propagates
   `tenant_id`/`branch_id`/roles → services → database session. Authorization = **RBAC + OPA/ABAC** *plus* RLS
   as the final backstop.

5. **Large-tenant carve-out:** a large chain can be **promoted to a dedicated database/instance** without code
   change (same schema, different connection) — pay-for-isolation only where it's needed.

6. **Verification is mandatory:** automated integration tests prove **tenant A can never read tenant B** via
   API or DB (part of [testing-strategy.md](../testing-strategy.md) §4).

## Consequences
- **Positive:** strong isolation enforced at the data tier; cost-efficient for many SMB tenants (shared infra);
  scales to dedicated isolation for big tenants without rework; consistent enforcement across all services.
- **Costs/risks:** every query path must run under the correct tenant context (template + shared `tenancy` lib
  handle this); RLS adds minor query overhead; cross-tenant analytics must be deliberately designed (read
  models, never ad-hoc joins across tenants).
- **Revisit if:** a regulatory or enterprise requirement forces database-per-tenant as the default (the
  carve-out path already supports this selectively).
