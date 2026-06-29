# ADR-006: Backend Language — Java / Spring Boot + Go

**Status:** Accepted · **Date:** 2026-06 (revised 2026-06-29) · **Deciders:** Architecture
**Related:** [tech-stack.md](../tech-stack.md)

---

## Context
We need a primary backend framework for ~10 microservices, with a React/React Native frontend already chosen,
heavy healthcare integration (HL7 device interfacing, FHIR for ABDM, batch/reporting), and an offline-first
edge component. Goals: clean code, velocity, enterprise-grade reliability, and a strong hiring pool.

The team has **deep Java / Spring Boot expertise**, and the program now spans the full MediCircle scope —
including a **Hospital Information System** (ADT, IPD/CPOE, OT, MRD/ICD, TPA/cashless billing) where Spring's
maturity for long-lived transactional, batch, and integration workloads is a direct fit. Java's healthcare
interop ecosystem (**HAPI HL7 v2 + HAPI FHIR R4**) is the most mature available, which matters as FHIR/ABDM
moves from a V2 escape hatch to a first-class program capability.

> **Revision note (2026-06-29):** This ADR previously selected **NestJS (TypeScript)** as primary with a Java
> escape hatch for FHIR. The decision is **reversed to Java / Spring Boot primary** to match team expertise,
> the enterprise HIS scope, and HAPI FHIR/HL7 maturity. TypeScript remains the language of the **frontend and
> mobile** (React + Vite PWA, React Native/Expo); we lose end-to-end shared FE/BE types, accepted as the cost.

## Decision
**Primary: Java 21 + Spring Boot 3.** **Go** for the two edge/socket-heavy services.
- **Java / Spring Boot** — all domain microservices. Team expertise; proven at enterprise scale; richest
  healthcare ecosystem (HAPI FHIR/HL7, Spring Batch for reporting/reconciliation, Spring State Machine for the
  lab workflow saga). Clean modular structure (modules/DI/ports-and-adapters) serves the "clean code" goal.
- **Go** — the **Device Integration Gateway** (many concurrent persistent HL7/ASTM analyzer sockets) and the
  **Sync Engine** (small static binary on every branch edge node).
- **Saga/workflow:** **Spring State Machine + Kafka choreography** (not Temporal) — state machine per service,
  Kafka events between services, idempotent transitions keyed on ULID/UUIDv7. Keeps the platform surface small.
- **Polyglot policy:** two languages only (Java + Go). No others without an explicit ADR. TypeScript is
  frontend/mobile-only.

## Consequences
- **Positive:** matches the team's strongest skill set → velocity; enterprise-grade reliability for the HIS
  scope; best-in-class FHIR/HL7 (HAPI) and batch (Spring Batch); Go where concurrency/footprint matters; one
  saga mechanism inside the Spring ecosystem (no separate workflow platform to operate).
- **Costs/risks:** **no shared FE/BE types** across the Nx monorepo (FE/mobile stay TypeScript) — mitigated by
  contract-first OpenAPI/gRPC schemas generating typed clients; two backend languages (Java + Go) to staff —
  kept minimal by confining Go to two services.
- **Revisit if:** the team composition shifts decisively JS-first, or a bounded context proves a hard
  requirement Spring cannot meet (document as a new ADR).
