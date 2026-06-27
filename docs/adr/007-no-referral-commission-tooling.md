# ADR-007: No Referral-Commission Tooling (Anti-Kickback Compliance)

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture + Compliance
**Related:** [compliance-anti-kickback.md](../compliance-anti-kickback.md), [compliance-matrix.md](../compliance-matrix.md),
[product-strategy.md](../product-strategy.md), [features.md](../features.md) §13

---

## Context
An earlier draft positioned a **doctor-referral commission engine** (per-test % / flat payouts, accrual,
statements, TDS) as a core differentiator. Research into current Indian law shows paying referring doctors a
commission/cut for sending patients or specimens is **illegal**, and the prohibition **binds the lab as the
payer**:
- **IMC (Professional Conduct) Regulations 2002, Clause 6.4.1** (operative today) bars commissions/fee-splitting
  for referrals and **explicitly extends to diagnostics**.
- **NMC RMP Regulations 2023** (would bar diagnostic-centre referral commissions outright) are notified but **in
  abeyance** — design for them anyway.
- **Supreme Court, *Apex Laboratories* (2022)** + **CBDT Circular 5/2012**: such payments are "prohibited by
  law," non-deductible (§37(1)), and the giver is equally culpable.
- State **cut-practice** criminal bills (Maharashtra) remain draft but would criminalize payer + payee.

Building commission tooling would facilitate an illegal act and expose DiagDesk and its customers to
abetment/tax/reputational liability. It is incompatible with "compliant with all laws."

## Decision
**DiagDesk does not build any referral-commission/kickback functionality.** Specifically **prohibited in the
product**: per-referral or %-of-bill amounts owed to a referring doctor; commission accrual; payout/earnings
statements or wallets keyed to a referrer; TDS-on-payout; and disguised referral fees (marketing/collection/
handling) routed to a referrer.

**What we build instead (compliant):**
1. **B2B & Partner billing** — rate contracts where the **institution is the buyer** (hospital/clinic/corporate/
   TPA/reference lab); B2B credit & receivables aging; invoices to the institution.
2. **Reference-lab / outsourcing** with transparent, documented per-test pricing.
3. **Referral-source analytics (no payout)** — read-only volume/revenue-*generated* dashboards for marketing &
   capacity, never tied to money owed.
4. **Doctor / B2B engagement portal** — reports, communications, account statements (as a buyer).
5. **Compliance guardrail** — the system separates "customer billing" from "referral source" and **blocks/warns**
   if a user tries to attach a payout to a referral source; audit-logged.

**Encoded principle:** *Money may flow to whoever buys/pays for the test; never to a person in return for
sending the patient.*

## Consequences
- **Positive:** legally compliant and future-proof (ready for NMC 2023); a genuine trust differentiator vs
  incumbents that ship commission modules; removes abetment/tax risk for us and customers.
- **Trade-off:** we forgo a feature some labs ask for; sales must reframe the "referral economy" as **compliant
  B2B + analytics + engagement**. The guardrail may surface uncomfortable "you can't do that here" moments — by
  design.
- **Revisit if:** the legal position changes (e.g., a formally permitted, transparent referral-fee regime is
  enacted) — confirmed with counsel.
