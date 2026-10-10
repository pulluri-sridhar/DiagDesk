# ADR-003: Offline-first & Sync Model

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture
**Related:** [technical-architecture.md](../technical-architecture.md) §6, [tech-stack.md](../tech-stack.md),
[product-strategy.md](../product-strategy.md)

---

## Context
Internet dependency is the **#1 operational complaint** about the incumbent (CrelioHealth): "network down = lab
stuck." Tier 2/3 labs have unreliable connectivity. **Offline resilience is DiagDesk's core differentiator** —
the lab counter must keep registering patients, printing barcodes, billing, and entering results during an
outage, then reconcile cleanly when the link returns. This is the highest-risk part of the architecture and
must be designed deliberately, especially for money-touching records.

## Decision

1. **Branch edge node** at each lab: lightweight **k3s** (or Docker Compose) running the counter app, a
   **local PostgreSQL** (working set), the **Go Sync Agent**, and the **Go Device Gateway**. Counter-critical
   operations are **local-first** and never block on connectivity.

2. **Sync transport:** the cloud **Sync Engine** ↔ edge **Sync Agent** exchange change-logs (CDC), **push and
   pull**, **idempotent and resumable**; partial syncs are safe.

3. **IDs:** **ULID / UUIDv7** generated at the edge — no dependency on a central sequence (avoids collisions and
   lets the edge create records offline).

4. **Conflict strategy (tiered by data type):**
   - **Append-only/insert-heavy flows** (orders, results, samples) → low conflict by design; favored.
   - **Mutable records** → **per-field last-write-wins** with **Lamport/vector-clock** timestamps.
   - **Money-touching records (billing/payments)** → **domain-specific reconciliation, never blind LWW** —
     payments must not silently merge incorrectly.

5. **Revocation/consistency on reconnect:** authz/role/consent changes reconcile when connectivity returns (see
   [adr/authentication.md](authentication.md) §8 for offline token validation via cached JWKS).

6. **Verification is mandatory:** a sync harness with **Toxiproxy** network-fault injection asserts convergence,
   idempotency, and correct money-record reconciliation ([testing-strategy.md](../testing-strategy.md) §4).

## Consequences
- **Positive:** the defining differentiator; labs operate through outages; safe, resumable sync; correct money
  handling.
- **Costs/risks:** real engineering complexity and an ops surface at the edge (k3s, local DB, updates) — scope
  the MVP conflict model tightly (favor append-only) and expand carefully; edge nodes hold minimal, encrypted,
  remotely-revocable data.
- **Revisit if:** connectivity assumptions change materially, or a CRDT-based store proves simpler than the
  field-LWW + domain-reconciliation approach for our workloads.
