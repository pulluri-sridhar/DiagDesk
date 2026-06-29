# MediCircle — Market Research & Compliance

| | |
|---|---|
| **Document** | Market Research & Compliance v2.0 (reconciled to DiagDesk's hard anti-kickback line) |
| **Date** | 2026-06-28 |
| **Scope** | India-first launch market · five-sided platform (labs · doctors/hospitals · pharmacies · patients · on-demand home-care). DiagDesk is the **lab node**. |
| **Status** | Research-based guidance — **NOT legal advice.** Validate with an Indian healthcare-regulatory lawyer before launch, and re-confirm the live notification status of every instrument cited (several are draft/in-abeyance). |

> ⚠️ **Not legal advice.** This document grounds MediCircle's product strategy in current (2026) India market
> data and regulation. Confirm the current NMC notification status, e-pharmacy rules, Telemedicine Practice
> Guidelines, DPDP Rules, and any newly enacted state cut-practice statutes with Indian healthcare counsel
> before building or shipping.

> **Reconciled stance.** This version adopts **DiagDesk's HARD anti-kickback posture** (see
> [compliance-anti-kickback.md](../compliance-anti-kickback.md), [ADR-007](../adr/007-no-referral-commission-tooling.md),
> [ADR-010](../adr/010-compliant-referral-economics.md), and the
> [reconciliation](../medicircle-reconciliation.md)). The earlier MediCircle §8 draft kept a commission engine
> "OFF by default for RMPs." **We go further: MediCircle builds NO commission engine at all** — only compliant
> economics (B2B buyer billing + professional-services contracts on a `fixed`/`per_service` basis + referral
> *analytics*). All other compliance analysis from the prior §8 is carried over.

---

## 1. Market context (India, 2026)

| Segment | Signal |
|---|---|
| **Diagnostics** | ~85% **unorganized**; only ~18% of labs **NABL-accredited**; margin compression (revenue/test ₹233 → ₹187, FY21–FY25); growth increasingly driven by **at-home sample collection**; consolidation pressure from national chains. |
| **E-pharmacy** | **Legal limbo** — draft rules unnotified since 2018; Delhi HC barred unlicensed online sale; CDSCO non-compliance notices; **nationwide chemist shutdown (May 20, 2026)** against aggregators and AI-generated prescriptions; ~50M livelihoods tied to retail pharmacy. |
| **Home healthcare** | Large & fast-growing (~₹600B by 2026, ~16% CAGR; → ~$74B by 2034); constrained by **no quality standards**, **trained-staff shortage**, **trust/safety**, weak insurance reimbursement. |
| **Telemedicine** | Adoption up ~500% post-COVID; governed by the **Telemedicine Practice Guidelines** (RMP-only, identity + consent, record retention, **no Schedule X via tele**). |
| **ABDM / ABHA** | **840M+ ABHA IDs**; ABDM increasingly **mandatory** for AB-PMJAY providers; HIP incentives (₹15/ABHA-linked txn). |
| **Records** | Still largely **paper/fragmented**; high **out-of-pocket** spend; lost prescriptions; long waits; low awareness of entitlements (PM-JAY, Jan Aushadhi). |

---

## 2. Pain points by stakeholder

**Doctors** — paper prescriptions, fragmented records, no longitudinal patient view, manual scheduling/admin,
shallow software adoption outside metros; rising teleconsult demand but compliance-bound (RMP-only, consent,
retention).

**Diagnostic labs** — thin/compressing margins, price wars, low accreditation/quality trust (only ~18% NABL),
rising compliance burden (Clinical Establishments Act, BMW, PC-PNDT where radiology applies), workforce
shortage, consolidation pressure; need **volume + differentiation + home collection**.

**Pharmacies (neighbourhood chemists)** — existential threat from e-pharmacy aggregators, prescription
**forgery/reuse**, expiry-driven inventory loss, thin margins, little digital tooling; ~50M livelihoods at
stake.

**Patients** — fragmented records, **high out-of-pocket** cost, waiting times, lost prescriptions, low
awareness of entitlements (PM-JAY, Jan Aushadhi), trust gaps.

**Home-care professional services** — booming demand but **no standards**, **trained-staff shortage**,
**trust/safety**, weak reimbursement, low awareness in tier 2/3.

---

## 3. Regulatory constraints (model-shaping)

### 3.1 Doctor referral commissions are prohibited — MediCircle builds NO commission engine

**Paying a doctor a commission / cut / kickback for referring a patient or specimen is illegal in India — and
the prohibition binds the *payer* (the lab/platform), not just the doctor.**

- **IMC (Professional Conduct, Etiquette and Ethics) Regulations, 2002 — Clause 6.4.1 (operative today).**
  Bars a physician from giving, soliciting, or receiving "any gift, gratuity, commission or bonus in
  consideration of or return for the referring, recommending or procuring of any patient," and any
  "division, transference, assignment, subordination, rebating, splitting or refunding of any fee." It
  **explicitly extends to diagnostics** ("specimen or material for diagnostic purposes"). Only carve-out:
  salaries to qualified staff under supervision.
- **NMC RMP (Professional Conduct) Regulations, 2023 — notified 2 Aug 2023, kept in abeyance 23 Aug 2023.**
  Goes further (explicitly bars commissions from diagnostic centres for referrals; bars doctors from using
  online platforms/agents to procure patients, up to 3-month suspension). **Not in force, but we design for
  it anyway** — it future-proofs the program.
- **Binds the payer — *Apex Laboratories v. DCIT* (Supreme Court, 2022).** Such inducements are "prohibited
  by law"; the prohibition on the doctor's acceptance is "no less a prohibition on … the giver." Referral
  payments are **non-deductible** under Income-Tax §37(1) Expl. 1 + **CBDT Circular 5/2012** — a direct
  tax-exposure flag for any lab/platform that pays.
- **State "cut-practice" criminal laws — mostly draft** (Maharashtra's Prevention of Cut Practice bill covers
  labs/payers, up to 5 yrs). No live criminal statute yet, but the ethics + tax regime already bites.

**Decision (reconciled, stronger than prior MediCircle §8).** MediCircle does **not** build any
referral-commission/kickback functionality on **any** side of the platform — not even "OFF by default." See
[ADR-007](../adr/007-no-referral-commission-tooling.md) and [ADR-010](../adr/010-compliant-referral-economics.md).

**Encoded principle:** *Money may flow to whoever **buys/pays for** the test or service, or for a **genuine
service rendered** — never to a person in return for **sending** the patient.*

| ❌ NOT built (would facilitate an illegal act) | ✅ Built instead (compliant) |
|---|---|
| Per-referral or %-of-bill amounts **owed to a referring doctor**; commission accrual; payout/earnings statements or wallets keyed to a referrer; TDS-on-payout | **B2B buyer billing** — rate contracts where the **institution is the buyer** (hospital/clinic/corporate/TPA/reference lab); invoices to the institution; B2B credit & receivables aging |
| A "doctor incentive ledger" / `commission_agreements` / `commission_ledger` / Route-payout machinery | **Professional-services contracts** — `professional_service_contract` on a **`fixed`/`per_service`** basis (reporting, consulting, teleradiology); paid via `service_engagement` rows referencing a **service actually rendered**, never a referred patient |
| Disguised referral fees (marketing/collection/handling) routed to a referrer; cash-flagging for off-book cuts | **Referral-source analytics (no payout)** — read-only volume/revenue-*generated* dashboards for CRM/marketing/capacity, permission-gated, **never** "amount owed to Dr. X" |

- **Guardrail as a feature.** The system **separates "customer billing" from "referral source"** and
  **blocks/warns + audit-logs** any attempt to attach a payout to a `referring_doctor`, or to key a
  `service_engagement` to referral volume rather than a rendered service. A professional-service contract
  whose counterparty also refers patients is **flagged for review**, not auto-paid.
- **Doctor → patient messaging is restricted** to **non-promotional clinical communication** (reports,
  reminders, care content) with consent — promotional/infomercial messaging risks soliciting/advertising.
- **Health packages are lab-owned**, not doctor-designed-for-doctor-commission — a doctor-designed package
  earning the RMP a cut is fee-splitting; redesign as **lab-owned packages with no RMP kickback**.

> **Re-narrative for investors:** *MediCircle replaces the illegal referral-cut economy with compliant,
> transparent SaaS + lawful B2B + an ABDM-native record + trusted home care — and it never ships the
> kickback rails in the first place.*

### 3.2 E-pharmacy

Law is unsettled (draft rules unnotified; Delhi HC barred unlicensed online sale; CDSCO notices; the May-2026
chemist shutdown). Position MediCircle as **enabling licensed local / in-house pharmacies**, **not** a
pan-India aggregator. Enforce:

- **Valid prescriptions only** + **anti-forgery and reuse-prevention** (e-signed, ABHA-linked, reuse-prevention
  registry).
- **Schedule H / H1 / X and narcotics** controls — dispensing guardrails per schedule.
- Partner with (not disintermediate) neighbourhood chemists.

### 3.3 Telemedicine

Governed by the **Telemedicine Practice Guidelines**:

- **RMP-only** consultations; patient **identity + informed consent**.
- **No narcotics / Schedule X** prescribing via tele.
- **≥3-year** record retention.

### 3.4 Data

- **DPDP Act 2023 (+ Rules 2025)** — **consent-first**, **India data residency**, purpose limitation, breach
  workflow, audit logs; biometric/health data is sensitive personal data.
- **CERT-In** — incident reporting / security directions.
- **ABDM / ABHA + FHIR R4** — consent-driven health records; increasingly mandatory for AB-PMJAY providers.

> **AI is assistive-only.** Across all five sides, AI (report cues, decision support, summarization) is
> **strictly assistive with mandatory doctor sign-off** — never autonomous diagnosis, prescribing, or
> dispensing. This aligns with the platform-wide stance in the reconciliation doc.

---

## 4. Compliant monetization

No RMP referral commissions anywhere — and no commission engine to toggle. MediCircle monetizes via:

1. **SaaS subscriptions** for provider operations portals (doctor / lab / pharmacy).
2. **Patient transaction fees** (tests, teleconsults, pharmacy fulfilment).
3. **Home-care take-rate** + professional subscriptions.
4. **Lawful B2B** — institution-as-buyer billing + **genuine professional-services contracts**
   (`fixed`/`per_service`); never per-referral.
5. **Insurance lead-gen** (consented) — without RMP procurement incentives.

---

## 5. Compliance matrix

| Item | Status | Software wedge | Phase |
|---|---|---|---|
| **Anti-kickback — referral commissions** (IMC 2002 Cl. 6.4.1; NMC 2023 in abeyance; *Apex Laboratories* SC 2022) | **MANDATORY** — binds the payer | **Build NO commission engine.** B2B buyer billing + `professional_service_contract` (`fixed`/`per_service`, never per-referral) + referral **activity** analytics (no payout) + guardrail blocking payouts attached to referrers ([ADR-007](../adr/007-no-referral-commission-tooling.md)/[010](../adr/010-compliant-referral-economics.md)) | **MVP / lab node** (design constraint) |
| **DPDP Act 2023 + Rules 2025** | **MANDATORY** (all health data) | Consent management, **India residency**, 72-hr breach workflow, audit logs, retention policy | **MVP** (foundation) |
| **CERT-In directions** | **MANDATORY** | Incident logging + reporting workflow, log retention | **MVP / V1** |
| **E-pharmacy** (draft rules; Delhi HC; CDSCO; May-2026 shutdown) | **MANDATORY** where dispensing | **Licensed local/in-house only** (not aggregator); valid-Rx enforcement; **anti-forgery + reuse-prevention**; Schedule H/H1/X + narcotics controls | **V2/V3** (pharmacy side) |
| **Prescription integrity** | **MANDATORY** (supports e-pharmacy + telemed) | E-signed, **ABHA-linked** prescriptions; **reuse-prevention registry**; schedule guardrails; anti-forgery | **V2/V3** |
| **Telemedicine Practice Guidelines** | **MANDATORY** where teleconsult offered | **RMP-only**, identity + consent, **no Schedule X via tele**, **≥3-yr** record retention | **V2/V3** (doctor/teleconsult side) |
| **ABDM / ABHA + FHIR R4** | **Voluntary**, incentivized (₹15/ABHA-linked txn; mandatory for AB-PMJAY) | ABHA linking, FHIR care-context, NHCX, consent artifacts | **V2** (certification) |
| **NABL — ISO 15189:2022** | **Voluntary**, but **required for CGHS/insurance** empanelment | IQC/EQAS logs, L-J charts, Westgard, audit-ready controlled docs | **V1 / lab node** (QC module) |
| **Home-care credentialing** | Good-practice / trust backbone (no statutory standard yet) | Background-verified, **certified** professionals (nursing council, etc.); live visit tracking + SOS; two-way ratings; visit insurance | **V3** (home-care side) |
| **Doctor → patient messaging** | **MANDATORY** (advertising/solicitation limits) | Restrict to **non-promotional** clinical comms (reports, reminders, care content) with consent | **MVP / V2** |
| **AI assistive-only + doctor sign-off** | **MANDATORY** (clinical safety) | AI cues/decision-support gated behind **mandatory RMP sign-off**; never autonomous diagnosis/prescribing | **All phases** |

---

## 6. Gaps & opportunities

1. **Insurance, claims & affordability** — cashless/TPA claims, PM-JAY linkage, OPD insurance, EMI/financing
   (out-of-pocket is a top patient pain; home-care reimbursement is a wedge). Insurance leads stay
   **consented**, never an RMP procurement incentive.
2. **Prescription-integrity layer** — e-signed, ABHA-linked prescriptions; **reuse-prevention registry**;
   Schedule H/H1/X + narcotics guardrails; anti-forgery.
3. **At-home sample collection / phlebotomist dispatch** — extend home-visit matching to lab draws (labs are
   growing on home demand).
4. **Lab quality & NABL accreditation support** — QC, SOPs, accreditation readiness (tackles the
   ~18%-accredited trust gap; differentiates from billing-only tools).
5. **Home-care trust & supply layer** — background-verified, certified professionals; live visit tracking +
   SOS; standardized care protocols; two-way ratings; visit insurance; training/certification pipeline (eases
   the trained-staff shortage capping the market).
6. **Chronic & elderly care / RPM programs** — recurring diabetes/cardiac/post-op subscriptions bundling
   teleconsult + home visits + diagnostics + refills (where home-health growth & recurring revenue sit).
7. **Deeper ABDM/ABHA + FHIR** — increasingly mandatory; solves fragmented-records pain; a moat.
8. **Integrate, don't rip-and-replace** — LIS/HIS/PACS and Practo/Zoho imports & integrations.
9. **WhatsApp-first, multilingual, low-literacy UX** for tier 2/3 growth.
10. **Credentialing/verification engine** (NMC, NABL, drug license, nursing council) as the trust backbone;
    fraud/dispute layer.

> **Net recommendation:** position MediCircle as **"the compliant operating system that connects healthcare"**
> — provider SaaS + ABDM-native records + trusted home care + affordability/insurance — **replacing** the
> illegal referral-cut economy rather than digitizing it, and **partnering with** (not disintermediating)
> neighbourhood chemists. AI stays **assistive-only with doctor sign-off**.

---

## 7. Platform operator — credentials, registrations & certifications

*What does the **SaaS company** (the operator of MediCircle) need, as opposed to the clinical licences held by its
**users**? Two rules of thumb:*

1. **To *build* (write software): nothing.** No licence or certificate is required to develop the platform.
2. **To *operate* live (handle health data + payments + messaging + ABDM): a stack of registrations, integration
   gates, and security audits** — but the platform stays a **technology enabler**: it **verifies** clinical
   licences, it does not hold them, and it is deliberately architected to stay **out of** drug-dispensing,
   RBI payment-aggregator, and IRDAI-intermediary scope.

> ⚠️ Not legal advice — confirm each item, and your fund-flow/insurance/e-pharmacy structuring, with Indian
> healthtech-regulatory and payments counsel before launch. Several items below have **2025–26 status changes**.

### 7.1 What the operator needs

| Requirement | Type | Trigger (feature that makes it needed) | Notes (2026) |
|---|---|---|---|
| Company + **GST** + payment-gateway **merchant KYC** | Mandatory | Operating at all | Pvt Ltd, GST, PAN/TAN; Razorpay merchant onboarding |
| **DPDP Act 2023** compliance (Data Fiduciary) | Mandatory | Handling any personal/health data | Consent, data-principal rights, breach process, India residency. If notified a **Significant Data Fiduciary** → **DPO in India + DPIA + independent audit**. DPDP Rules being notified/phased 2025–26 — confirm current stage |
| **CERT-In** Directions (28 Apr 2022) | Mandatory | Internet-facing systems | **180-day logs retained in India**, **6-hour** incident reporting, NTP clock sync |
| **VAPT by a CERT-In-empanelled auditor** | Mandatory for ABDM · strongly expected otherwise | Go-live; ABDM WASA | Required to clear ABDM production; repeat periodically/after major change |
| **ISO 27001** (+ **SOC 2 Type II**) | Commercial, *not* legal | Selling to hospitals/insurers/enterprise | ISO 27001 is the priority cert in India; SOC 2 Type II for US buyers; both aid cyber-insurance & due-diligence (~6–12 mo to certify) |
| **ABDM milestone certification** (M1/M2/M3) → WASA audit → **NHA go-live** | Integration gate | Building ABHA/FHIR (R3) | Sandbox → milestones → CERT-In WASA → NHA production creds; enrol in **HFR** (facilities) + **HPR** (professionals); **M4/NHCX** for insurance claims. **Long lead — start the sandbox in R1** even though prod is R3 |
| **TRAI DLT** registration (entity + header + templates) | Mandatory | Sending SMS/OTP | Register as **Principal Entity** on a DLT platform; unregistered headers/templates are scrubbed/blocked |
| **WhatsApp Business API** + **Meta Business verification** | Integration gate | WhatsApp messaging | Via a BSP (Gupshup). Since **7 Oct 2025**, messaging limits are **per Business Portfolio** (all numbers share one limit) — plan capacity at portfolio level |
| **Stay OUT of RBI Payment-Aggregator scope** | Architectural | Any money movement | Use a **licensed PA + Razorpay Route**; **never pool/hold/escrow/settle customer funds** in your own account — *handling of funds* is what triggers needing an RBI **PA authorization** (note the 15-Sep-2025 PA Master Direction) |
| **PCI-DSS SAQ-A** | Mandatory (light) | Accepting card payments | Gateway-hosted/redirect → shortest questionnaire. **v4.0.1 expanded SAQ-A**: payment-page **script-integrity / tamper-detection (6.4.3, 11.6.1)** apply from 31 Mar 2025 — "redirect = nothing to do" is no longer true |
| **Stay OUT of drug-dispensing** | Architectural / legal | Pharmacy flow | The **licensed pharmacy holds the Drug License (Form 20/21)** and dispenses via a registered pharmacist; the platform **intermediates only**. **No notified e-pharmacy law** (2018 draft rules still unnotified) — **highest-uncertainty item; watch for a notification or restriction/ban** |
| **Telemedicine platform duties** (no licence) | Mandatory conduct | Teleconsult | Telemedicine Practice Guidelines 2020 §5 bind the **platform**: list/verify only **RMPs**, ensure consent, report misconduct, **no autonomous AI prescribing** (AI assists the RMP only) |
| **IRDAI intermediary** registration | Conditional | Insurance beyond pure lead-gen | Triggered at **solicitation** (compare/recommend/quote/paid-per-policy). **Pure consented lead handoff** to a licensed insurer/intermediary stays outside — a narrow lane. Categories: Web Aggregator / Corporate Agent / **IMF**. IRDAI moved intermediaries to **perpetual registration (Feb 2026)** |

### 7.2 What the platform *verifies* of its users (held by the user, not the operator)

| User | Credential the platform verifies |
|---|---|
| **Doctor** | NMC / State Medical Council registration (+ **HPR** enrolment) |
| **Diagnostic lab** | **NABL** accreditation + establishment registration (+ **HFR**) |
| **Pharmacy** | **Drug License (Form 20/21)** + registered pharmacist |
| **Home-care professional** | State Nursing Council / INC, or Physiotherapy Council registration; ID + background check |
| **All providers** | **GSTIN** + bank KYC for payouts |

> Handled by the **Credentialing & Verification** service (microservices.md #3) — the platform onboards and verifies
> these; it does not hold them.

### 7.3 Architectural "stay out of scope" guardrails
Design so the operator does **not** become: an **RBI Payment Aggregator** (never hold/pool funds — use Route escrow);
a **drug seller** (intermediate to licensed pharmacies; never dispense or take title); an **IRDAI intermediary**
(consented lead-gen only until registered); or a **Clinical Establishment** under the CEA (don't operate the
lab/clinic or employ the clinicians delivering care — that can pull state CEA rules onto the platform).

### 7.4 Pre-launch checklist & timeline (indicative)

| Item | Needed by | Rough lead time | Owner |
|---|---|---|---|
| Company / GST / gateway merchant KYC | **R1** | weeks | Founder / Finance |
| DPDP + CERT-In baseline (consent, in-India logging, 6-hr breach runbook) | **R1** | weeks–months | Legal + Security |
| First **VAPT** (CERT-In-empanelled) | **R1** | 2–6 weeks | Security |
| **TRAI DLT** + **WhatsApp/Meta** verification | **R1** | 1–4 weeks | Eng / Ops |
| **PCI SAQ-A** attestation (incl. v4 script controls) | **R1** | days–weeks | Security |
| **ABDM sandbox** registration + start M1 (long pole) | **R1** *(prod in R3)* | start early | Eng |
| **ISO 27001** kickoff | **R1** | cert ~6–12 mo | Security |
| Pharmacy-flow legal sign-off (intermediary-only) | **R2** | weeks | Legal |
| Home-care credentialing live + background-check vendor | **R2** | weeks | Ops / Legal |
| PA fund-flow structuring confirmed (stay out of RBI-PA) | **R2** | weeks | Legal / Finance |
| **ABDM** M1/M2/M3 + **WASA audit** + **NHA go-live** | **R3** *(ABHA/FHIR)* | **months** | Eng + Security |
| **IRDAI** position confirmed (lead-gen vs intermediary) | **R3** *(insurance)* | weeks–months | Legal |
| **SOC 2 Type II** (if US/enterprise demand) | **R3** | months | Security |

> Timelines are indicative; **[Legal review]** gates apply to the anti-kickback, e-pharmacy, telemedicine,
> payments-fund-flow, and insurance items. The two long poles are **ABDM certification** and **ISO 27001** — start
> both in R1.

---

## 8. Sources

- Diagnostic labs 2026 forecast — CrelioHealth: https://blog.creliohealth.com/beyond-metros-the-next-phase-of-indias-diagnostic-revolution-2026-forecast/
- Indian diagnostics margin pressure — Whalesbook: https://www.whalesbook.com/news/English/healthcarebiotech/Indian-Diagnostics-Sector-Surges-on-Home-Demand-Faces-Margin-Pressure/69dbcd7be0ea10058dbd8c1b
- NMC (Professional Conduct) Regulations 2023 — NMC: https://www.nmc.org.in/rules-regulations/national-medical-commission-registered-medical-practitioner-professional-conduct-regulations-2023-reg/
- Fee-splitting / referral ethics — Cyril Amarchand: https://corporate.cyrilamarchandblogs.com/2024/04/rx-for-referrals-navigating-the-ethical-considerations-in-indias-medical-landscape/
- NMC bars online forums/agents — Medical Dialogues: https://medicaldialogues.in/health-news/nmc/attn-doctors-using-online-forums-agents-to-procure-patients-can-lead-to-3-months-suspension-115744
- E-pharmacy regulation — Spice Route Legal: https://spiceroutelegal.com/publications/regulation-of-e-pharmacies-in-india/
- Chemists' May 20 shutdown — MediaNama: https://www.medianama.com/2026/05/223-chemist-strike-against-e-pharmacies-may-20-ai-generated-prescriptions/
- India home healthcare market — IMARC: https://www.imarcgroup.com/india-home-healthcare-market
- Home healthcare growth — Grand View Research: https://www.grandviewresearch.com/industry-analysis/india-home-healthcare-market
- Telemedicine guidelines 2026 — Doccure: https://doccure.io/telemedicine-guidelines-and-regulations-in-india-updated-for-2026/
- ABDM adoption / 840M ABHA — Qualysec: https://qualysec.com/abdm-certification/
- Fragmented records & patient pain — The Better India: https://thebetterindia.com/health-care/mydigirecords-dr-saroj-gupta-india-digital-health-records-10949737
- *Apex Laboratories Pvt. Ltd. v. DCIT* (SC, 2022) — LiveLaw: https://www.livelaw.in/top-stories/apex-laboratories-pvt-ltd-vs-deputy-commissioner-of-income-tax-large-tax-payer-unit-ii-2022-livelaw-sc-195-192556
- IMC (Professional Conduct, Etiquette and Ethics) Regulations 2002 — NMC PDF: https://www.nmc.org.in/wp-content/uploads/2017/10/Ethics-Regulations-2002.pdf
- NMC 2023 regulations kept in abeyance — Complinity: https://complinity.com/legal-update/national-medical-commission-registered-medical-practitioner-professional-conduct-regulations-2023-not-to-be-operative-and-effective-till-further-notification-10477/

**Operator credentials & certifications (§7):**
- DPDP Act 2023 + framework — MeitY: https://www.meity.gov.in/data-protection-framework
- CERT-In Directions (28 Apr 2022) + empanelled auditors — CERT-In: https://www.cert-in.org.in/
- ABDM developer sandbox + milestones — NHA: https://sandbox.abdm.gov.in/ · HFR: https://facility.abdm.gov.in/ · HPR: https://hpr.abdm.gov.in/
- RBI Payment Aggregator/PG Guidelines (17 Mar 2020): https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11822 · PA Master Direction (15 Sep 2025)
- Razorpay Route (split settlement, platform doesn't hold funds): https://razorpay.com/docs/payments/route/
- PCI-DSS v4.0.1 SAQ-A — PCI SSC: https://www.pcisecuritystandards.org/document_library/
- TRAI DLT / TCCCPR (advice to senders): https://trai.gov.in/advice-to-senders
- WhatsApp messaging limits (portfolio-level since Oct 2025) — Meta: https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
- Telemedicine Practice Guidelines 2020 (Appendix 5, §5 platform duties): https://www.indiaspend.com/wp-content/uploads/2020/05/Telemedicine.pdf
- IRDAI Web Aggregators / intermediaries: https://irdai.gov.in/web-aggregators
- NABL (lab accreditation): https://nabl-india.org/ · Clinical Establishments Act: https://clinicalestablishments.mohfw.gov.in/
- ISO 27001 vs SOC 2 for India SaaS (commercial expectation): https://codesecure.in/blogs/soc-2-vs-iso-27001-which-first-india

---

## Related DiagDesk documents

- [compliance-anti-kickback.md](../compliance-anti-kickback.md) — the hard anti-kickback line (law + compliant design)
- [compliance-matrix.md](../compliance-matrix.md) — lab-node regulatory matrix
- [ADR-007 — No referral-commission tooling](../adr/007-no-referral-commission-tooling.md)
- [ADR-010 — Compliant referral economics](../adr/010-compliant-referral-economics.md)
- [medicircle-reconciliation.md](../medicircle-reconciliation.md) — how DiagDesk (lab node) and MediCircle reconcile into one program
