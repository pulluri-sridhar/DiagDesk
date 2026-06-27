# ADR-006: Backend Language — NestJS (TypeScript) + Go

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture
**Related:** [tech-stack.md](../tech-stack.md)

---

## Context
We need a primary backend framework for ~10 microservices built by a small startup team in India, with a React/
React Native frontend already chosen, heavy healthcare integration (HL7 device interfacing, FHIR for ABDM in
V2), and an offline-first edge component. Goals: clean code, velocity, and a strong hiring pool.

## Decision
**Primary: NestJS (TypeScript).** **Go** for the two edge/socket-heavy services.
- **NestJS** — one language across frontend + backend (shared types via the Nx monorepo), the largest hiring
  pool in India, and clean-architecture (modules/DI/ports-and-adapters) out of the box → directly serves the
  "clean code" goal and team velocity.
- **Go** — the **Device Integration Gateway** (many concurrent persistent HL7/ASTM analyzer sockets) and the
  **Sync Engine** (small static binary on every branch edge node).
- **Escape hatch:** the **V2 ABDM/FHIR Interop service** may be **Java 21 + Spring Boot (HAPI FHIR)** if
  TypeScript FHIR libraries prove insufficient — per-service polyglot is allowed by the architecture, so this
  doesn't compromise the primary stack.

## Consequences
- **Positive:** velocity + shared types + easy hiring; Go where concurrency/footprint matters; clean modular
  structure; an isolated path for FHIR depth in V2.
- **Costs/risks:** TypeScript FHIR/HL7 tooling is less mature than Java's HAPI (mitigated: HL7 lives in the Go
  gateway; FHIR is V2 with a Java escape hatch); two languages (TS + Go) to staff — kept minimal by confining
  Go to two services.
- **Revisit if:** the team is hired primarily from a Java/Spring pool, or FHIR/HL7 depth becomes central enough
  early that Java/Spring should be the primary.
