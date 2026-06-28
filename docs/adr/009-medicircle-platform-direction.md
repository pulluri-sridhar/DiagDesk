# ADR-009: MediCircle Platform Direction (V3 north star)

**Status:** Accepted (direction) · **Date:** 2026-06 · **Deciders:** Founders + Architecture
**Related:** [medicircle-vision.md](../medicircle-vision.md), [product-strategy.md](../product-strategy.md),
[roadmap.md](../roadmap.md), [adr/007-no-referral-commission-tooling.md](007-no-referral-commission-tooling.md),
[adr/010-compliant-referral-economics.md](010-compliant-referral-economics.md)
**Source:** stakeholder call 2026-06-28 (#22) — [stakeholder-call-2026-06-28.md](../stakeholder-call-2026-06-28.md)

---

## Context
The stakeholder articulated a larger ambition — **MediCircle**, a connected ecosystem spanning **Doctors,
Pharmacies, Diagnostic Centers, and Home-Care services** around the patient. DiagDesk already sits in the middle
of this flow (it receives doctor orders and emits reports). We need a recorded decision on **how seriously and in
what shape** we carry this ambition without pulling scope forward or compromising the anti-kickback posture.

## Decision
**Adopt MediCircle as an explicit V3 north-star platform direction — not a committed near-term build.** DiagDesk
(the lab product) is **node 1** and must win its category standalone first. We commit to:

1. **Architecting DiagDesk so MediCircle is reachable without rework** — i.e. keep building the shared primitives
   that a multi-party network needs anyway: **consent/DPDP**, **ABDM/FHIR interop** (V2), **identity** (multi-party
   accounts), **notification**, and the **anti-kickback guardrail**.
2. **Carrying the compliance line network-wide:** the encoded principle — *money may flow to whoever buys/pays for
   a good or service; never to a person in return for sending a patient* — applies to **every edge** of the circle
   (doctor⇄lab, lab⇄pharmacy, etc.). Platform monetization is subscription / transparent platform fees, **never** a
   referral cut. See [ADR-010](010-compliant-referral-economics.md).
3. **Phasing** (post-DiagDesk-V2): Doctor⇄Lab loop → Pharmacy → Home-care → patient super-profile (ABDM-anchored),
   each gated on per-vertical legal review.
4. **A guardrail against distraction:** no MediCircle build begins until DiagDesk is a clear category winner.

## Consequences
- **Positive:** gives the team and stakeholders a shared, ambitious direction; ensures today's primitives are
  built network-ready; keeps the compliance story consistent as we expand.
- **Costs/risks:** scope-creep temptation (mitigated by the "node 1 must win first" guardrail); each new vertical
  widens the regulatory surface (pharmacy/e-prescription, telemedicine, home-care licensing) — needs counsel
  before each step.
- **Revisit if:** DiagDesk traction warrants pulling V3.0 (Doctor⇄Lab loop) forward, or the regulatory landscape
  for any vertical changes materially.
