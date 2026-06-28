# ADR-009: MediCircle Platform Direction (V3 north star)

**Status:** Accepted (direction) · **Date:** 2026-06 · **Deciders:** Founders + Architecture
**Related:** [medicircle-vision.md](../medicircle-vision.md), [medicircle-reconciliation.md](../medicircle-reconciliation.md),
[product-strategy.md](../product-strategy.md), [roadmap.md](../roadmap.md),
[adr/004-hosting-and-data-residency.md](004-hosting-and-data-residency.md),
[adr/007-no-referral-commission-tooling.md](007-no-referral-commission-tooling.md),
[adr/010-compliant-referral-economics.md](010-compliant-referral-economics.md)
**Source:** stakeholder call 2026-06-28 (#22) — [stakeholder-call-2026-06-28.md](../stakeholder-call-2026-06-28.md);
prior **MediCircle** design (repo `techie-yogi/medicircle`)

---

## Context
The stakeholder articulated a larger ambition — **MediCircle**, a connected ecosystem spanning **Doctors/Hospitals,
Pharmacies, Diagnostic Centers, On-Demand Home-Care, and Patients**. A **full prior MediCircle product design
exists** (PRD/HLD/LLD/Postgres schema/tech-stack/compliance/spec) in a separate repo
(`techie-yogi/medicircle`, build start ~July 2026). DiagDesk is essentially MediCircle's **diagnostic-center (lab)
node, built far deeper**, and already sits in the middle of this flow. We need a recorded decision on **how
seriously and in what shape** we carry this ambition, and on **reconciling the conflicts** between the two designs
(anti-kickback posture, hosting, architecture) without pulling scope forward.

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

### Reconciled decisions (DiagDesk ⇄ prior MediCircle design)
Where the two designs conflict, **the DiagDesk decisions win program-wide** (see
[medicircle-reconciliation.md](../medicircle-reconciliation.md)):
5. **DiagDesk is the canonical lab node**; MediCircle's shallower lab module defers to it.
6. **Hosting:** **India-sovereign, no hyperscaler** ([ADR-004](004-hosting-and-data-residency.md)) **supersedes**
   MediCircle's AWS Mumbai stack; AWS-coupled services get sovereign swaps (SES→Resend, Textract→alt OCR,
   S3→S3-compatible, Secrets Manager→Vault).
7. **Anti-kickback:** the **no-commission-engine** posture (ADR-007/010) **supersedes** MediCircle's gated
   commission engine, which is **removed** and replaced with B2B billing + professional-services contracts +
   referral analytics. (MediCircle's own market research already recommended dropping RMP commissions.)
8. **Architecture:** **hybrid** — the lab node keeps DiagDesk's offline-first edge + right-sized services; the
   connective layer may start as a cloud modular monolith and extract services later.

## Consequences
- **Positive:** gives the team and stakeholders a shared, ambitious direction; folds a fully-designed prior product
  into one coherent program; ensures today's primitives are built network-ready; keeps the compliance and
  residency story consistent across every side of the circle.
- **Costs/risks:** scope-creep temptation (mitigated by the "node 1 must win first" guardrail); reconciliation work
  at MediCircle build-start (AWS→sovereign swaps, remove commission engine, align money representation); each new
  vertical widens the regulatory surface (pharmacy/e-prescription, telemedicine, home-care licensing) — needs
  counsel before each step.
- **Revisit if:** DiagDesk traction warrants pulling V3.0 (Doctor⇄Lab loop) forward, or the regulatory landscape
  for any vertical changes materially.
