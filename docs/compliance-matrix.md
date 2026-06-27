# DiagDesk — Compliance Matrix

*How India's regulatory landscape maps to DiagDesk modules and roadmap phases. See `market-research.md`
Part C for sources and detail.*

---

## Priority summary

| Item | Status | Software wedge | DiagDesk phase |
|---|---|---|---|
| **Anti-kickback — referral commissions** (IMC 2002 Clause 6.4.1; NMC; *Apex Laboratories* SC 2022) | **MANDATORY** — binds the lab as payer | **Do NOT build a commission engine.** Compliant B2B billing (institution = buyer), referral-source analytics (no payout), guardrail that blocks payouts attached to referrers | **MVP** (design constraint) — see [compliance-anti-kickback.md](compliance-anti-kickback.md) |
| **DPDP Act 2023 + Rules 2025** | **MANDATORY** (all health data) | Consent mgmt, India data residency, 72-hr breach workflow, audit logs | **MVP** (foundation) |
| **PC-PNDT Form F** (radiology/USG) | **MANDATORY** where ultrasound present | Online Form-F generation/filing | **V2** (with radiology) |
| **Biomedical Waste Rules 2016** | **MANDATORY** for BMW generators | Barcode/waste-bag logs, annual-report (digital from 2026) | **V2** |
| **NABL — ISO 15189:2022** | Voluntary, but **required for CGHS/insurance** | IQC/EQAS logs, auto L-J charts, Westgard, audit-ready controlled docs | **V1** (QC module) |
| **CGHS / ECHS / TPA empanelment** | Optional but high-revenue; **NABL-gated** | Per-scheme rate cards (CGHS TMS 2.0 tiered), pre-auth tracking, NHCX claims | **V1** (rate cards) / **V2** (NHCX) |
| **ABDM / HIP (M1–M4)** | **Voluntary**, incentivized (₹15/txn, up to ₹4 cr) | ABHA linking, FHIR care-context, NHCX | **V2** (certification) |
| **GST e-invoicing** | Conditional (₹5 cr / ₹10 cr); core services **exempt** | Mixed exempt/taxable billing, conditional IRP reporting | **MVP** (basic) / scale later |
| **Clinical Establishments Act 2010** | **State-dependent** | Registration record-keeping | As needed |

---

## Notes & build implications

### Mandatory, build into the foundation
- **DPDP** is the single biggest cross-cutting obligation. Treat consent, retention, breach handling, audit
  logging, and **India data residency** as platform primitives in the MVP — not later bolt-ons. Multilingual
  (22 scheduled languages) consent notices overlap with ABDM's consent-driven model.

### Mandatory where the segment applies
- **PC-PNDT Form-F** is mandatory for *every* ultrasound on a pregnant woman and carries **criminal
  liability** — high-motivation feature for the radiology segment; online filing already exists to integrate
  with. Lands in V2 alongside radiology.
- **Biomedical Waste** annual reporting goes digital (national portal) from 2026; barcode waste-bag tracking
  is the hook.

### Voluntary but commercially decisive
- **NABL (ISO 15189:2022)** is voluntary in general but a **prerequisite for CGHS/insurance empanelment**, and
  the QC requirements (daily IQC, L-J charts, EQAS) map directly to a sellable "NABL-ready / audit-ready"
  module (V1).
- **CGHS** migrated to **TMS 2.0** with a fresh re-empanelment cycle triggered **13 Oct 2025** — an acute,
  timely billing pain and a wedge; keep rate cards data-driven since rates are a moving target.
- **ABDM HIP** is voluntary but unlocks **₹15 per ABHA-linked transaction** (lab must exceed 500
  transactions/month) and up to ₹4 cr under DHIS — a concrete incentive + "ABDM-certified" buying criterion.
  The vendor bears certification cost (sandbox → functional testing → **WASA security audit** → NHA review →
  production) — budget and start early (V2).

### Don't over-build
- **GST:** core diagnostic services are **exempt**; most small target labs won't trigger e-invoicing
  (thresholds ₹5 cr / ₹10 cr). MVP billing should handle mixed exempt/taxable lines and conditional IRP
  reporting without an over-engineered tax engine.
- **Clinical Establishments Act** adoption is **state-by-state** — keep registration record-keeping flexible
  rather than assuming a national standard.
