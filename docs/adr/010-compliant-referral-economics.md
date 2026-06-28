# ADR-010: Compliant Referral Economics (extends ADR-007)

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture + Compliance + Product
**Extends:** [adr/007-no-referral-commission-tooling.md](007-no-referral-commission-tooling.md)
**Related:** [compliance-anti-kickback.md](../compliance-anti-kickback.md), [features.md](../features.md) §13,
[design/data-model.md](../design/data-model.md), [rbac-permissions.md](../rbac-permissions.md)
**Source:** stakeholder call 2026-06-28 (#19) — [stakeholder-call-2026-06-28.md](../stakeholder-call-2026-06-28.md)

---

## Context
The diagnostic-center owner asked to **"show doctor referral payments in the portal — adhering to the
legalities."** Their legacy system had an "Allow Referral Payment Reports" toggle, reflecting the entrenched (and
now **illegal**) commission practice. ADR-007 already forbids any **per-referral commission tooling**, and that
prohibition stands. But the owner's qualifier — *adhering to the legalities* — opens room to support the **money
flows that genuinely are legal**, which labs legitimately need to record: paying a doctor/clinic **as a buyer**
(B2B/wholesale), and paying a professional for **services actually rendered** (e.g. a consultant pathologist's
slide reads, a teleradiology contract). The risk is that such features become a fig-leaf for disguised kickbacks,
so they must be **structurally** constrained.

## Decision
Extend ADR-007 with **compliant referral economics** — explicitly *not* a commission engine:

1. **Buyer leg (already built):** when the doctor/clinic **is the institutional buyer**, use the existing B2B
   partner + account + receivables model. Money flows to the **buyer of the test**, transparently invoiced.
2. **Professional-services contracts (new):** a `professional_service_contract` entity records genuine,
   documented services a professional renders to the lab (e.g. reporting/consulting), with a **basis of
   `fixed` or `per_service`** — **never `per_referral` / never %-of-patient-bill**. Payable via
   `service_engagement` rows that reference the **service actually performed** (a report signed, a study read),
   **not** a patient the professional referred.
3. **Referral activity statements (analytics, no payout):** read-only statements of **volume/revenue *generated*
   by source** for CRM/marketing/capacity — surfaced under the `finance.reports.referral_activity` permission —
   **never** an "amount owed to Dr. X."
4. **Guardrail (hardened):** the system continues to **separate "customer billing" from "referral source"** and
   **blocks/warns + audit-logs** any attempt to (a) attach a payout to a `referring_doctor`, or (b) key a
   `service_engagement` to referral volume rather than a rendered service. A professional-service contract whose
   counterparty is also the patient's referrer is **flagged for review**, not auto-paid.

**Encoded principle (unchanged from ADR-007):** *Money may flow to whoever buys/pays for the test, or for a
genuine service rendered; never to a person in return for sending the patient.*

## Consequences
- **Positive:** meets the owner's real need (record legitimate doctor payments) **without** reintroducing
  kickback tooling; gives sales a truthful "yes, the legal way" answer; keeps the trust differentiator intact and
  stays ready for the stricter NMC 2023 regime.
- **Costs/risks:** the professional-services channel could be abused to disguise referral fees — mitigated by the
  basis constraint (`fixed`/`per_service`), the referrer-overlap flag, mandatory documentation of the service,
  and audit. Sales/onboarding must explain the line clearly.
- **Revisit if:** a formally permitted, transparent referral-fee regime is enacted (confirm with counsel), or
  abuse patterns emerge that need tighter automated detection.
