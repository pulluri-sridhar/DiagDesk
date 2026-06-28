# DiagDesk — Anti-Kickback Compliance (Referral Commissions)

**Status:** MANDATORY compliance constraint · Affects product design directly.
*This supersedes any earlier framing of a "doctor-referral commission engine." DiagDesk does NOT build tooling
that pays referring doctors. This document records the law and the compliant design.*

> ⚠️ Not legal advice. Confirm current NMC notification status and any newly enacted state cut-practice
> statutes with Indian healthcare counsel before launch.

---

## 1. The law (current, 2025–2026)

**Paying a doctor a commission / cut / kickback for referring a patient or specimen to a diagnostic lab is
illegal — and the prohibition binds the lab (the payer), not just the doctor.**

- **IMC (Professional Conduct, Etiquette and Ethics) Regulations, 2002 — Clause 6.4.1 (operative today).**
  Prohibits a physician from giving, soliciting, or receiving "any gift, gratuity, commission or bonus in
  consideration of or return for the referring, recommending or procuring of any patient," and from any
  "division, transference, assignment, subordination, rebating, splitting or refunding of any fee." It
  **explicitly extends to diagnostics**: the section "shall apply with equal force to the referring,
  recommending or procuring … [of] specimen or material for diagnostic purposes." Only carve-out: salaries to
  qualified staff under supervision. ([NMC 2002 PDF](https://www.nmc.org.in/wp-content/uploads/2017/10/Ethics-Regulations-2002.pdf), [full text](https://indiankanoon.org/doc/100527417/))
- **NMC RMP (Professional Conduct) Regulations, 2023 — in abeyance, NOT in force.** Notified 2 Aug 2023, kept
  in abeyance 23 Aug 2023; the NMC reverted to the 2002 code. The 2023 version went further (explicitly barred
  "commissions from diagnostic centres … for referrals"). **Design for it anyway** — it future-proofs us.
  ([abeyance notice](https://complinity.com/legal-update/national-medical-commission-registered-medical-practitioner-professional-conduct-regulations-2023-not-to-be-operative-and-effective-till-further-notification-10477/))
- **Binds the payer — *Apex Laboratories v. DCIT* (SC, 2022).** Such inducements are "prohibited by law"; the
  prohibition on the doctor's acceptance is "no less a prohibition on … the giver." Referral payments are
  **non-deductible** under Income-Tax §37(1) Expl. 1 + **CBDT Circular 5/2012** — a tax-exposure flag for any
  lab that pays. ([LiveLaw](https://www.livelaw.in/top-stories/apex-laboratories-pvt-ltd-vs-deputy-commissioner-of-income-tax-large-tax-payer-unit-ii-2022-livelaw-sc-195-192556))
- **State "cut-practice" criminal laws — mostly draft.** Maharashtra's Prevention of Cut Practice bill (covers
  labs/payers; up to 5 yrs) remains a **draft**; Karnataka's 2025 Act regulates establishments but is not a
  dedicated cut-practice statute. No live criminal statute yet — but the ethics + tax regime already bites.

**Penalties:** doctor → professional misconduct, suspension/removal from the medical register. Lab → tax
disallowance + scrutiny, abetment exposure, reputational/contractual fallout (NABL/insurer/TPA), and criminal
liability if/where a state statute is enacted.

---

## 2. The line: legitimate B2B vs illegal kickback

**Principle to encode in the product:** *Money may flow to whoever **buys/pays for** the test. Money must
never flow to a person in **return for sending** the patient.*

| LEGAL — money to the buyer | ILLEGAL — money to the referrer |
|---|---|
| B2B / wholesale **contract pricing** to a hospital, clinic, corporate, TPA, or another lab **that is the customer and pays the lab** | Per-patient or %-of-bill amount **paid back to the referring doctor** |
| Genuine **reference-lab / outsourcing** with transparent, documented per-test pricing, billed to the ordering institution | A "marketing/collection/handling fee" that is really a referral cut, however labelled |
| **Corporate / insurance / TPA / scheme** rate contracts for an enrolled population | A "doctor incentive ledger" or payout wallet keyed to patient volume |
| **Volume/institutional discounts to the buying institution** | Auto-calculated kickback splits ("Dr. X gets 40% of every test") |
| **Salaries** to qualified staff under supervision | Hidden/off-book cash flagged for referrer payout |

**Referral-source tracking for analytics is permissible** — recording *which doctor/clinic a patient came
from* for operations, quality, logistics, CRM and marketing analytics is fine, **provided it is never wired to
a payout, accrual, or "amount owed to Dr. X."** Respect DPDP for any personal data.

---

## 3. What DiagDesk builds (and refuses to build)

### ❌ NOT built (would facilitate an illegal act)
- Any **referral-commission engine**: per-referral or %-of-bill amounts **owed to a referring doctor**,
  accrual, payout statements, TDS-on-payout, or "doctor earnings/incentive" ledgers.
- Disguised referral fees (marketing/collection/handling) routed to a referrer; cash-flagging for off-book cuts.

### ✅ Built (compliant alternatives)
- **B2B & Partner billing:** rate contracts where the **counterparty is the institutional buyer**; invoice the
  institution; B2B credit accounts & receivables aging.
- **Reference-lab / outsourcing workflow:** send-out management with transparent per-test pricing, TAT, invoicing
  to the ordering institution.
- **Referral-source analytics (no payout):** read-only dashboards of volume by source doctor/clinic for
  marketing & capacity planning — never linked to money owed.
- **Doctor / B2B engagement portal:** report delivery, communications, account statements (as a *buyer*, not
  *earnings*), relationship/CRM.
- **Institutional discount management** to bona-fide buyers, audit-logged.
- **Compliance guardrail (a feature):** the system **separates "customer billing" from "referral source,"** and
  **blocks/warns** if a user tries to attach a monetary payout to a referral source. Audit-trailed.

### Compliant referral economics ([ADR-010](adr/010-compliant-referral-economics.md)) — for the owner's "show referral payments, legally" ask
A diagnostic-center owner asked to record doctor referral payments *"adhering to the legalities."* We support the
money flows that **genuinely are legal**, structurally fenced off from kickbacks:
- **Professional-services contracts:** pay a professional for **services actually rendered** (reporting, consulting,
  teleradiology) on a **`fixed`/`per_service`** basis — **never per-referral, never %-of-patient-bill**. A
  `service_engagement` must reference the rendered service (a report signed, a study read), not a referred patient.
  A contract whose counterparty also refers patients is **flagged for review**, not auto-paid.
- **Buyer payments:** where the doctor/clinic **is the buyer**, use B2B billing (money flows to the buyer of the test).
- **Referral activity statements:** analytics of volume/revenue *generated* by source — **no payout**, permission-gated.
- The legacy "Referral **Payment** Reports" toggle is **not** reproduced; the guardrail still blocks any per-referral
  payout keyed to a `referring_doctor`.

**Marketing line:** DiagDesk is the *compliant* choice — it helps labs run legitimate B2B relationships, pay for
genuine professional services, and read referral analytics, and is ready for the stricter NMC 2023 regime —
instead of automating an illegal practice.
