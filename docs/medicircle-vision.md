# MediCircle — Ecosystem Vision (V3 north star)

*Where DiagDesk goes after it wins the diagnostic-center workflow: a connected **care-and-commerce circle**
linking **Doctors, Pharmacies, Diagnostic Centers, and Home-Care services** around the patient. This is a
**north-star** document — direction and guardrails, not a committed build. Companion ADR:
[adr/009-medicircle-platform-direction.md](adr/009-medicircle-platform-direction.md).*

> **Phase:** V3 horizon. DiagDesk (the lab product) is **node 1** and must succeed standalone first. MediCircle
> is the optional platform layer it grows into — built on the same India-sovereign, DPDP-compliant,
> consent-first, **anti-kickback-clean** foundation.

---

## 1. The thesis
Indian outpatient care is fragmented across four actors who already exchange paper and phone calls today:

- **Doctors / clinics** — order tests, prescribe medicines, refer for home care.
- **Diagnostic centers** — run tests, return reports (DiagDesk's beachhead).
- **Pharmacies** — fulfil prescriptions.
- **Home-care services** — sample collection, nursing, physio, elder care at home.

Each transition is a leaky, manual hand-off. **MediCircle** is the connective tissue: a **consented**,
**interoperable** exchange of orders, reports, prescriptions, and visits between these actors — with the patient
in control of their data. DiagDesk already sits in the middle of this flow (it receives doctor orders and emits
reports), which is why the lab product is the natural first node.

## 2. Participants & value
| Participant | Gets | Gives |
|---|---|---|
| **Patient** | One place for reports, prescriptions, bookings, home visits; consent control | Consent to share specific records for specific purposes |
| **Doctor** | Structured reports back, e-prescription, easy home-care/lab order — *engagement, not commission* | Orders + prescriptions into the network |
| **Diagnostic center** | More orders via legitimate doctor/clinic relationships; report delivery rails | Reports + availability |
| **Pharmacy** | Verified e-prescriptions, fulfilment demand | Stock/fulfilment, dispense confirmation |
| **Home-care** | Visit requests with context (orders/reports) | Field capacity, visit outcomes |

## 3. Value flows — and the compliance line (carried over from ADR-007/010)
MediCircle **amplifies** the anti-kickback discipline rather than relaxing it. The same encoded principle holds
across every edge of the circle:

> **Money may flow to whoever buys/pays for a good or service; never to a person in return for *sending* a
> patient.**

- ✅ **Legitimate:** a patient (or their TPA/insurer/employer) pays for a test, a medicine, or a home visit; a
  facility pays another facility under a transparent B2B contract; a professional is paid for **services actually
  rendered** (a teleconsult, a slide read) under a documented contract.
- ❌ **Never:** per-referral commissions / kickbacks between doctors, labs, pharmacies, or home-care — the
  product-level guardrail from [ADR-010](adr/010-compliant-referral-economics.md) applies network-wide.
- **Platform monetization** is **subscription / SaaS / transparent transaction fees to participants for platform
  services** — never a cut for steering a patient.

## 4. Built on what DiagDesk already has
- **Consent & DPDP** primitives (consent records, retention, DSAR) → the basis for cross-party data sharing.
- **ABDM / FHIR** interop (V2) → the standard rails for ABHA-linked records, e-prescriptions, care-contexts.
- **Identity** (Keycloak OIDC, OTP, passkeys) → multi-party accounts.
- **Notification** (WhatsApp/SMS/email) → cross-party messaging.
- **Anti-kickback guardrail** → extended to every money edge in the network.

## 5. Phasing (indicative, post-DiagDesk-V2)
1. **V3.0 — Doctor ⇄ Lab loop:** consented report-back + e-order with doctors already in the lab's network
   (engagement, not payment). Hardens the consent/interop layer.
2. **V3.1 — Pharmacy:** e-prescription pass-through + dispense confirmation (where a prescribing doctor opts in).
3. **V3.2 — Home-care:** visit requests carrying lab/clinical context; outcome capture.
4. **V3.3 — Patient super-profile:** one consented longitudinal record across the circle (ABDM-anchored).

## 6. Risks & open questions
- **Regulatory surface widens** (pharmacy/e-prescription rules, telemedicine guidelines, home-care licensing) —
  needs counsel per vertical before each step.
- **Anti-kickback vigilance** must scale with participants — automated detection of disguised referral flows.
- **Don't dilute the core:** MediCircle only begins once DiagDesk's lab product is a clear category winner;
  otherwise it is a distraction. This doc exists to align direction, not to pull scope forward.
