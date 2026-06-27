# ADR-005: Database — PostgreSQL (not MongoDB)

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture
**Related:** [tech-stack.md](../tech-stack.md) (full comparison table),
[adr/002-multi-tenancy-and-data-isolation.md](002-multi-tenancy-and-data-isolation.md)

---

## Context
DiagDesk's core is **transactional, relational, and financial** — orders, bills + line items + commission
accruals, B2B receivables, rate cards, audit — where atomicity and integrity are non-negotiable. We also have
**schema-flexible** data (FHIR bundles, variable result payloads, report templates). The question: one
relational store, a document store, or both.

## Decision
**PostgreSQL is the system of record everywhere. MongoDB is not adopted.**
- **Multi-row ACID** + **foreign-key integrity** for money/clinical data.
- **Row-Level Security** for multi-tenant isolation (ADR-002) — no MongoDB equivalent.
- **SQL** for MIS/analytics (joins, window functions, BI tooling).
- **JSONB** covers the "flexible schema" need (FHIR resources, device payloads, templates) **without** giving
  up relational guarantees — so a separate document store is unnecessary.
- **Practical:** MongoDB Atlas's India region runs on **excluded hyperscalers** (ADR-004); self-hosting Mongo
  HA would be pure ops toil, whereas managed Postgres is available from E2E/Yotta/Jio/ESDS.
- Database-per-service; standardize on Postgres to minimize a small team's operational surface. A document
  store is reconsidered only if a specific future bounded context proves it (and even then, Postgres JSONB or
  object storage is preferred under the no-hyperscaler constraint).

## Consequences
- **Positive:** strong consistency for money/PHI; native tenant isolation; one operational datastore; flexible
  where needed via JSONB.
- **Costs/risks:** JSONB-heavy access needs disciplined indexing/modeling; very high-cardinality analytics may
  later warrant a columnar store (ClickHouse) fed from Postgres — additive, not a reversal.
