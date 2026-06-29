# MediCircle — Consent & Legal Framework (Proposal for review)

*A research-backed plan for the consent, terms, waiver, and marketing instruments the portal must capture at every
point where it handles users and their data — sign-up, patient/clinical registration, provider onboarding, bookings,
teleconsult, e-prescription/pharmacy, and **event / workshop / retreat / health-camp registrations**. Scope: the
**MediCircle/DiagDesk** healthcare program · **India only**. **This is a proposal to review together and decide on —
not a finalized policy, and not legal advice.** Final wording must be drafted/reviewed by Indian healthtech counsel.*

> **The single most important finding:** in India a **consent/waiver is risk-mitigating *evidence*, not a liability
> shield**. You **cannot** contract out of liability for death, personal injury, gross negligence, fraud, or
> statutory duties (Indian Contract Act §23; *Central Inland Water Transport v. Brojo Nath Ganguly*, SC 1986), and
> the **Consumer Protection Act 2019** can void one-sided terms and still impose product/service liability. Real
> protection = **accurate informed consent + genuine safety/clinical standards + data-protection compliance +
> neutral-intermediary posture + insurance** — the forms support that, they don't replace it.

---

## 1. Why this matters (the exposure, from the case research)
- **Data breach is the live Indian failure mode** — AIIMS Delhi ransomware (2022), the ICMR/COVID leak of ~81.5 cr
  records (2023, CBI probe), and **Star Health** (2024, Madras HC litigation, flagged DPDP exposure up to **₹250 cr**).
  DPDP penalties: **up to ₹250 cr** for weak security safeguards, **₹200 cr** for failure to notify a breach.
- **Ad-tech leakage of health data is the most-penalized behaviour globally** — FTC v. **GoodRx / BetterHelp / Flo**
  (sharing health data with Facebook/Google for ads). Maps directly onto a DPDP purpose-limitation + consent failure.
- **"Active platform" loses intermediary safe-harbour** — *Amway v. 1MG* (Delhi HC) refused §79 safe-harbour to a
  commission-earning platform → treated as a principal, not a neutral intermediary.
- **Signed consent does not cure unauthorized/negligent acts** — *Samira Kohli v. Dr. Prabha Manchanda* (SC 2008).
- **Mandatory arbitration cannot oust the consumer forum** — *Emaar MGF v. Aftab Singh* (SC 2019).

## 2. The instruments (what we capture, and what each can/can't do)

| # | Instrument | Purpose | What it CAN do | What it CANNOT do |
|---|---|---|---|---|
| A | **Privacy Notice + granular data-processing consent** (DPDP §5–§7) | Lawful basis to collect/use/share personal & health data | Establish purpose-bound, informed, withdrawable consent | Authorize processing beyond stated purpose; be bundled/pre-ticked |
| B | **Terms of Service / User Agreement** (per role) | The binding contract to use the portal | Set acceptable use, payments, IP, **limitation of liability (B2B)**, indemnity, dispute resolution | Impose unfair/unconscionable consumer terms; oust the consumer forum |
| C | **Liability waiver + assumption-of-risk + medical disclaimer** | Events/workshops/**retreats**/camps + any physical/wellness activity; AI-assistive disclaimer | Evidence the user was informed of ordinary risks & disclaimers | Waive death/injury/**gross negligence**/fraud/statutory liability |
| D | **Marketing / promotional consent + cookie/tracking consent** (DPDP + TRAI DLT/TCCCPR) | **Keeping a user/patient record to promote our products & other services**; promotional SMS/WhatsApp/email/push/in-app; analytics cookies | Separate **opt-in** for promotions; per-channel/per-purpose choices; cookie choices | Be **mandatory / a condition of using the portal**; be assumed/bundled with service consent; target children; share health data with ad platforms |
| E | **Clinical / telemedicine consent** (separate, per-encounter) | Informed consent for tests/procedures/teleconsult | Procedure-specific, recorded consent (*Samira Kohli*; TPG 2020) | Be a one-time blanket consent for all future care |
| F | **Cross-party data-sharing consent** (per purpose) | Sharing with a specific lab/pharmacy/insurer/another doctor | Per-recipient, per-purpose, revocable authorization | Be a blanket "share with anyone" toggle |

> **Provider side:** providers (doctors/labs/pharmacies/home-care) also sign a **Data Processing Agreement (DPA)** +
> provider Terms allocating data-fiduciary/processor responsibilities — this is what protects *subscribers* too.

### 2.1 Promotional use of the user/patient record (added requirement)

The portal will keep a record of all users — **subscribers (providers) and patients** — and we want **written consent**
to use it to **promote our products and other services**. This is the **single highest-risk data use** (it is exactly
what the FTC penalized in GoodRx/BetterHelp), so it is fenced with its own instrument (D) and these rules:

- **Separate, explicit, opt-in written consent** — a distinct, unticked clickwrap consent (logged: version, timestamp,
  IP/device, channels, purposes), **never bundled** with the privacy notice or ToS. Captured at sign-up **and**
  manageable later from a consent dashboard. (Optionally e-signed for higher assurance, but a logged clickwrap is
  legally "written" under IT Act §10A.)
- **⚠️ It must be OPTIONAL — not a gate to use the portal.** DPDP §6 requires consent to be **free and not conditioned**
  on providing a service beyond what's necessary. **Making marketing consent mandatory makes it invalid** and worsens
  exposure. Mandatory gates are only the **privacy notice (A)** and **ToS (B)**; promotional consent (D) is opt-in and
  declining it must not block portal use.
- **Granular** — per **channel** (email / SMS / WhatsApp / push / in-app) and per **purpose**: (i) **our own
  products/services**, and (ii) **partner / third-party offers** — *enabled* but behind a **separate, explicit
  consent**. Preferred model: **first-party delivery** (the platform sends the partner's offer; the partner receives
  **no user PII**). If user PII is ever actually shared with a partner, that requires its own explicit consent **plus
  a data-sharing agreement** with the partner. Partner offers must also be **non-health-based** (see next bullet).
- **No health-based targeting — full stop.** *(Decision.)* We do **not** target promotions using any health
  attribute (condition, test, prescription, etc.), and we **never** share health data with third-party ad platforms,
  SDKs, or pixels (the GoodRx/BetterHelp failure mode). Promotional segmentation uses only non-health attributes.
- **Consent capture method (tiered).** *(Decision.)* **Clickwrap-logged is the default** for the marketing/promotional
  consent (and for sign-up/registration) — legally written under IT Act §10A. **E-signature (Aadhaar eSign / DSC)** is
  reserved for **provider/subscriber B2B agreements + the DPA** and **high-risk physical-activity waivers**. SMS/WhatsApp
  promotions add the **TRAI DCA OTP double opt-in** on top.
- **Children excluded.** No promotional profiling or targeted ads to under-18 accounts (DPDP §9) — suppress them entirely.
- **Revocable any time**, as easily as granted — every message carries an unsubscribe; withdrawal moves the user to a
  **suppression list** honoured promptly; withdrawal of marketing consent **does not** affect their service.
- **Messaging-channel compliance** — promotional SMS/voice need **TRAI DLT registration + DCA OTP opt-in**; WhatsApp
  needs opt-in + approved templates; email needs a working unsubscribe. (Both DPDP consent **and** TRAI consent apply.)
- **Purpose-limitation by design** — service data is **not** repurposed for marketing without this fresh consent; the
  promotional record is segmented from the clinical record; access is role-gated and audited.

## 3. Touchpoint → instrument gating matrix

| Touchpoint | A Privacy | B ToS | C Waiver | D Mktg | E Clinical | F Sharing | Notes |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **Account sign-up** (any role) | ✅ | ✅ | | opt-in | | | Mandatory A+B to proceed; D optional, separate, default-off |
| **Patient registration** | ✅ | ✅ | | opt-in | | | + verifiable **guardian consent** if under-18 |
| **Provider onboarding** (doctor/lab/pharmacy/home-care) | ✅ | ✅ (+**DPA**) | | | | | KYC/credentialing; DPA allocates data roles |
| **Test / diagnostic booking** | | | | | ✅ | ✅ (lab) | Clinical consent + share order with chosen lab |
| **Teleconsultation** | | | (AI disclaimer) | | ✅ | | Implied if patient-initiated; **explicit if provider-initiated** (TPG 2020), recorded |
| **E-prescription → pharmacy** | | | | | | ✅ (pharmacy) | Share Rx with chosen licensed pharmacy only |
| **Home-care visit** | | ✅ | ✅ | | ✅ | ✅ (pro) | In-home **physical** service → waiver + emergency contact + visit OTP |
| **Workshop / retreat / health-camp registration** | ✅ | ✅ | ✅ | opt-in | (health screening) | | **Waiver + medical disclaimer + assumption-of-risk + emergency contact**; PAR-Q-style health screen for physical activity |
| **Insurance recommendation / sharing** | | | | | | ✅ (insurer) | Explicit consent before any summary is shared (consented lead only) |
| **Marketing / broadcast** | | | | ✅ | | | DLT/DCA OTP opt-in **and** fresh DPDP purpose consent |

## 4. Mandatory-accept UX & consent-record design
- **Separate, unticked checkboxes per purpose** — never pre-ticked, never bundled (DPDP §6 + Consumer Protection
  (E-Commerce) Rules 2020). Mandatory instruments (A Privacy, B ToS, and E/C/F where the action requires them) **gate
  the action**; optional ones (D marketing) are clearly separable and **default-off**.
- **Clickwrap, not browsewrap** — explicit "I have read and agree" action; log **version + timestamp + IP/device**
  (IT Act §10A makes the e-contract valid; clickwrap is enforceable, browsewrap is weak).
- **Layered notice** — a short, plain-language summary (what data · why · who it's shared with · how long · your
  rights) with a link to the full notice; the **§5 itemized notice** is presented *before* consent.
- **Immutable consent record** — store each consent artifact (instrument, version, purpose, locale, timestamp, IP)
  in the existing `consents` table, written to the **hash-chained audit** (Audit service). This evidentiary trail is
  what makes consent defensible.
- **Withdrawal as easy as granting** (DPDP §6(4)–(6)) — a self-service consent dashboard; withdrawal stops the
  relevant processing promptly and is logged. Architect for a future **Consent Manager** integration.
- **Re-consent on material change** — new version → re-prompt; don't silently carry old consent forward.
- **Minors (<18)** — verifiable **guardian consent** (e.g., DigiLocker-grade, per DPDP Rule 10); **no tracking /
  behavioural ads** to children; remember a minor cannot validly contract (Contract Act §11).
- **Multilingual** — offer the notice in the user's language (DPDP contemplates the 22 scheduled languages);
  low-literacy-friendly.

## 5. Content principles — "clear and accurate, for an informed decision"
Plain language (target ~8th-grade reading level), **no dark patterns**, each consent states **what** data, **why**
(purpose), **who** it's shared with, **how long** it's kept, and **your rights** (access, correction, erasure,
grievance). Disclaimers (AI is assistive-only; the platform connects you to independent licensed providers and is
not itself the treating provider; wellness activities carry inherent risk) are stated up front. Marketing and
non-essential cookies are **off by default** with a genuine choice.

## 6. How this protects the **Company** (realistically)
A waiver alone won't shield us, so the protection is a **stack**:
1. **Accurate, granular, logged consent** → defensible DPDP posture + evidence of informed agreement.
2. **Neutral-intermediary posture (IT Act §79)** → published grievance officer, takedown only on court/govt order,
   avoid taking an "active principal" role that forfeits safe-harbour (*Amway/1MG*).
3. **Enforceable contract terms** → limitation-of-liability + indemnity that work **B2B** (caps tied to fees, carve
   out fraud/wilful/IP/statutory), and **fair, non-unconscionable** consumer terms that survive CPA scrutiny.
4. **Genuine safety/compliance** → provider credentialing, clinical-consent capture, security safeguards, **6-hour
   CERT-In + 72-hour DPBI + affected-user** breach runbook, **no ad-tech leakage of health data**.
5. **Insurance** → cyber/data-breach, professional indemnity, and **public-liability/event** cover for retreats &
   camps. (The case law says safety + insurance, not contract language, is the real backstop.)

## 7. How this protects **subscribers** (the providers)
- The platform's **shared consent record** (clinical + data) supports the provider's own informed-consent defense.
- The **DPA + provider Terms** allocate data-fiduciary/processor duties so responsibilities are clear.
- Credentialing + neutral-platform framing keep liability with the act, not vicariously on every party.
- No referral-commission tooling (ADR-007/010) keeps subscribers clear of anti-kickback exposure.

## 8. Records, compliance & ops (non-negotiables)
Published **grievance-redressal** mechanism + **India-based DPO** (operate at SDF-grade given sensitive health data);
auditable consent/withdrawal logs; DSAR (access/erasure) workflow; **dual breach notification** (CERT-In 6 h + DPBI
72 h + affected users); **no health-data sharing with marketing SDKs/pixels** without separate affirmative consent.

## 9. Risk register (case → mitigation)
| Risk (precedent) | Mitigation in this framework |
|---|---|
| Breach + slow notice (AIIMS, ICMR, **Star Health** → ₹250 cr) | Security safeguards + hard-wired 6 h/72 h notification runbook + DPO |
| Ad-tech health-data leakage (GoodRx/BetterHelp/Flo) | Marketing default-off; **no health-based targeting at all**; no health-data SDK/pixel sharing; separate opt-in (§2.1) |
| Forced/bundled marketing consent → invalid + worse exposure | Promotional consent is **optional opt-in, not a portal gate**; separate from privacy/ToS; revocable (§2.1) |
| Active-platform loses §79 (Amway/1MG) | Neutral-intermediary posture, grievance officer, court-order-only takedown |
| Consent scope exceeded (Samira Kohli) | Procedure-specific, recorded clinical/telemedicine consent |
| Arbitration ousting consumer (Emaar MGF) | Don't rely on forced arbitration vs consumers; consumer-forum carve-out |
| Unfair/one-sided terms void (Brojo Nath / CPA 2019) | Fair, non-unconscionable consumer terms; LoL caps only B2B with carve-outs |
| Waiver assumed to shield injury | Treat waivers as evidence; pair with safety standards + event/public-liability insurance |

## 10. Phasing (build now; DPDP hard deadline mid-2027)
- **DPDP Rules 2025 notified 13 Nov 2025**; Consent-Manager registration live **~13 Nov 2026**; substantive
  obligations (notice, security, breach reporting) enforceable **~13 May 2027** — so **build the consent engine in
  R1**, be Consent-Manager-ready by 2026, fully compliant before May 2027.
- **R1:** instruments A (privacy) + B (ToS) + E (clinical) + F (lab/pharmacy sharing) + consent engine + audit +
  grievance/DPO + breach runbook + marketing default-off.
- **R2:** C (home-care + teleconsult waivers/disclaimers), pharmacy/Rx sharing, expanded marketing (DLT/DCA).
- **R3:** event/workshop/retreat/camp waivers at scale, insurance sharing consent, Consent-Manager integration.

## 11. Open decisions — for us to review together
1. **Dispute resolution** — arbitration **with** an explicit consumer-forum carve-out, or courts only? (Forced
   arbitration is unenforceable vs consumers anyway.)
2. **B2B limitation-of-liability cap** — level (e.g., 12 months' fees) and carve-outs.
3. **Operate at SDF-grade voluntarily?** (Recommended given sensitive health data.)
4. **Minor/guardian verification method** — DigiLocker vs other; and whether to allow under-18 accounts at all in R1.
5. **Re-consent cadence** on policy/version changes.
6. **Default marketing = off** (recommended) and the cookie-consent approach (essential-only by default).
7. **Which activities require the physical waiver** + a PAR-Q-style health screen (retreats, camps, home physio…).
8. **Insurance to carry** — cyber, professional indemnity, public-liability/event.
9. **Promotional use of the user/patient record (§2.1)** — ✅ **Decided:** (a) marketing consent is **optional opt-in,
   not a portal gate**; (b) **partner/third-party offers allowed** behind a **separate explicit consent** (first-party
   delivery preferred; PII-sharing needs its own consent + data-sharing agreement); (c) **no health-based targeting at
   all**; (d) **clickwrap-logged by default**, **e-sign reserved** for B2B/DPA agreements + high-risk waivers (+ TRAI
   DCA OTP on SMS/WhatsApp).
10. **Engage Indian healthtech counsel** to draft the final binding copy from this framework (strongly recommended).

## 12. Sources
- DPDP Act 2023 (consent §6/§7, children §9) — IndiaCode: https://www.indiacode.nic.in/handle/123456789/2002 · enforcement timeline: https://www.dpdpa.com/dpdpa_enforcement_timeline.html
- DPDP Rules 2025 (notified 13 Nov 2025) — analysis: https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/
- Verifiable parental consent (Rule 10) — Consently: https://www.consently.in/blog/verifiable-parental-consent-dpdp-rules-2025-edtech-gaming
- Clickwrap enforceability + IT Act §10A — Mondaq: https://www.mondaq.com/india/contracts-and-commercial-law/1670160/clickwrap-browsewrap-and-negotiated-saas-contracts-enforceability-in-india
- *Samira Kohli v. Prabha Manchanda* (SC 2008) — Indian Kanoon: https://indiankanoon.org/doc/438423/
- Telemedicine Practice Guidelines 2020 — https://www.indiaspend.com/wp-content/uploads/2020/05/Telemedicine.pdf
- TCCCPR 2018 + Feb 2025 amendment (DLT/DCA) — TRAI: https://trai.gov.in/sites/default/files/2025-02/Regulation_12022025.pdf
- IT Act §79 safe harbour — Cyril Amarchand: https://corporate.cyrilamarchandblogs.com/2021/07/safe-harbour-protection-for-e-commerce-platforms/
- Consumer Protection (E-Commerce) Rules 2020 (no pre-ticked consent) — Trilegal: https://trilegal.com/knowledge_repository/consumer-protection-e-commerce-rules-2020/
- Exemption clauses / unconscionability (*Brojo Nath Ganguly*) — Indian Kanoon: https://indiankanoon.org/doc/477313/ · Cyril Amarchand: https://corporate.cyrilamarchandblogs.com/2020/06/do-parties-have-an-unfettered-right-to-exclude-or-limit-their-liability-for-breach-of-contract-part-i/
- Consumer Protection Act 2019 (unfair terms, product liability) — bare Act: https://www.indiacode.nic.in/bitstream/123456789/18964/1/cpa.pdf
- *Emaar MGF v. Aftab Singh* (consumer disputes non-arbitrable) — Mondaq: https://www.mondaq.com/india/arbitration-dispute-resolution/769412/supreme-court-rules-on-the-arbitrability-of-consumer-disputes
- DPDP penalties (₹250 cr) — K&K: https://ksandk.com/data-protection-and-data-privacy/penalties-adjudication-under-indias-dpdp-act-2023/
- *Puttaswamy v. Union of India* (2017) — SC Observer: https://www.scobserver.in/cases/puttaswamy-v-union-of-india-fundamental-right-to-privacy-case-background/
- AIIMS ransomware (2022) — The Wire: https://thewire.in/government/aiims-servers-cyberattack-ransomware-rajya-sabha
- ICMR/COVID leak (2023) — The News Minute: https://www.thenewsminute.com/news/icmr-data-breach-exposes-details-of-815-crore-indians-what-you-need-to-know
- Star Health breach + Madras HC (2024) — SCC Online: https://www.scconline.com/blog/post/2025/01/28/legal-ramifications-data-breach-discussed-in-light-of-star-health-and-allied-insurance-breach/
- FTC v. GoodRx (2023) — FTC: https://www.ftc.gov/news-events/news/press-releases/2023/02/ftc-enforcement-action-bar-goodrx-sharing-consumers-sensitive-health-info-advertising
- FTC v. BetterHelp (2023) — FTC: https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising
- CERT-In 6 h vs DPDP 72 h breach duties — K&K: https://ksandk.com/data-protection-and-data-privacy/cert-in-vs-dpdp-dual-breach-notification-duties-explained/

---

## Related documents
- [compliance.md](compliance.md) — India 2026 regulatory analysis + platform-operator credentials (§7)
- [data-model.md](data-model.md) — `consents`, `abha_links`, audit tables that store the consent artifacts
- [microservices.md](microservices.md) — Consent & Health Records (#5), Audit & Admin (#10), Credentialing (#3)
- [../adr/007-no-referral-commission-tooling.md](../adr/007-no-referral-commission-tooling.md) / [010](../adr/010-compliant-referral-economics.md)

> **Not legal advice.** This is a planning framework to be reviewed together and then finalized with qualified
> Indian healthtech-regulatory counsel before any binding copy is published.
