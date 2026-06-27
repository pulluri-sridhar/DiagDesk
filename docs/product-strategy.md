# DiagDesk — Product Strategy

*An all-in-one SaaS portal for diagnostic centers in India.*

---

## 1. The thesis

India's diagnostic-lab market is **large, fragmented, and formalizing**: ~130,000+ labs, ~80–85%
unorganized, a ~USD 11B market growing ~11–12% CAGR. NABL accreditation, the Ayushman Bharat Digital
Mission (ABDM), the DPDP data-privacy regime, and competition from well-funded D2C brands (Healthians,
Orange Health, Tata 1mg) are all pushing the unorganized long tail to professionalize — the precise moment
fragmented SMBs adopt software.

Incumbents leave a **"missing middle"** open: premium tools (CrelioHealth) are "extremely expensive for
regular labs," fully internet-dependent, and laden with add-on fees; the cheap long tail is shallow on
depth, compliance, and multi-branch capability.

**DiagDesk wins the Tier 2/3 standalone-and-small-chain lab with an all-in-one, offline-resilient,
transparently-priced, ABDM/NABL-ready portal that natively handles the doctor-referral economy** — the
financial center of gravity of Indian diagnostics.

---

## 2. Target customer (beachhead)

**Primary:** Tier 2/3 **standalone and small (≤5 center) pathology labs**, architected from day one for
multi-branch chains.

- Largest, least-served, fastest-adopting TAM; lower competition than the enterprise/hospital segment.
- Lower ARPU than chains, but enormous volume and a clear formalization tailwind.

**Secondary (expansion):** mid-size regional chains (5–50 centers) and **full diagnostic centers running
both pathology and radiology** — the latter is genuine white space (today they stitch separate LIS + RIS/PACS).

**Primary buyer/persona:** the owner-operator (often a pathologist or entrepreneur) who is price-sensitive,
runs on cash + paper, depends on referring doctors, and is being squeezed by D2C aggregators on price and
patient experience.

---

## 3. Positioning — where we win

Mapped to the **ranked incumbent complaints** found in research:

| Incumbent complaint (most → least common) | DiagDesk answer |
|---|---|
| 1. **Price** — premium tools unaffordable; hidden onboarding & per-integration add-ons; opaque quotes | **Published, all-inclusive pricing** — analyzer interfacing, APIs, patient portal, WhatsApp included in the plan. |
| 2. **Internet dependency / no offline** — "network down = lab stuck" | **Offline-first / sync architecture** — the lab keeps running through outages (critical for Tier 2/3). |
| 3. **Weak or paid customization** — reports, financials, fields | **Self-serve report & financial builders** in-product. |
| 4. **Stability & inconsistent support** | Reliability SLAs + India-time support as a core promise. |
| 5. **Fragmentation** — separate path / radiology / booking tools | **One portal**: LIS + billing + patient app + (V2) RIS/PACS. |

**The India-specific edge:** native **referral-doctor + B2B** handling. Note that D2C player Healthians was
publicly criticized for *ignoring doctors* — validating a referral-doctor-centric strategy that the
aggregators structurally neglect.

---

## 4. Differentiators (the bets)

1. **Offline-first resilience** — cloud + conflict-aware local sync; attacks the #1 operational complaint.
2. **Transparent all-inclusive pricing** — no surprise onboarding or per-integration fees.
3. **ABDM/NABL-native compliance** — ABDM HIP (unlocks ₹15/ABHA-linked-transaction incentive), DPDP-ready,
   NABL QC tooling (Levey-Jennings charts, Westgard rules), PC-PNDT Form-F.
4. **Unified Path + Radiology** (sequenced to V2) — one portal where today labs buy two systems.

---

## 5. Module map (the "all-in-one" surface)

1. **Lab Core (LIS):** registration, order entry, barcode/QR sample tracking, accessioning, multi-level
   result validation, analyzer interfacing (HL7/ASTM), configurable reports + digital signatures.
2. **Billing & Finance:** invoicing (cash/partial/dues), discounts-with-approval, GST mixed exempt/taxable
   lines, rate-card manager, day-end cash reconciliation, financial MIS.
3. **Referral & B2B Engine:** doctor commission tracking & statements (per-test % or flat, TDS-aware),
   B2B credit ledger + receivables aging, per-partner rate cards, outsourcing/reference-lab workflows.
4. **Patient Experience:** online booking, home-collection logistics (phlebotomist assignment + routing),
   white-labeled WhatsApp/SMS/email + patient portal/app, online payments, recall/follow-up reminders.
5. **Quality & Compliance:** NABL QC (L-J charts, Westgard, IQC/EQAS), audit trails, controlled docs,
   PC-PNDT Form-F, biomedical-waste log, DPDP consent/retention/breach.
6. **Operations:** inventory & reagents (expiry alerts, auto-reorder), staff/roles, multi-branch MIS
   (TAT/QC/revenue dashboards).
7. **Interop & Ecosystem:** ABDM HIP (ABHA linking, FHIR care-context), NHCX claims, public APIs, website
   booking widget.
8. **Radiology (V2):** RIS (modality worklist, structured reporting), light PACS/DICOM, teleradiology.

---

## 6. How each module maps to a validated pain point

| Pain (see market-research.md) | Module that addresses it |
|---|---|
| Doctor commissions leak revenue; B2B 90+ day overdue receivables; per-branch rate lists manual | Referral & B2B Engine; Billing rate-card manager |
| ~75% of TAT & most errors are pre/post-analytical; 5.15% sample rejection; manual transcription | Lab Core (barcode tracking, analyzer interfacing, rejection tracking, TAT dashboards) |
| Cash-heavy manual front office → revenue leakage | Billing (partial payments, dues, cash reconciliation, discount approvals) |
| Patients expect WhatsApp reports; call-volume overload; neglected recalls; D2C squeeze | Patient Experience (multi-channel delivery, booking, home collection, reminders) |
| Multi-branch islands; reagent stock-outs/expiry; staff shortages | Operations (multi-branch MIS, inventory, RBAC) |
| NABL/DPDP/PC-PNDT/CGHS compliance burden | Quality & Compliance; empanelment-aware Billing; ABDM in Interop |

---

## 7. Open strategic decisions (defaults adopted; flag to change)

| Decision | Default | Alternatives |
|---|---|---|
| Beachhead segment | Tier 2/3 standalone & small chains | Mid chains; full Path+Radiology centers |
| MVP wedge | Core LIS + billing + delivery | Lead with Referral/B2B; lead with Patient/D2C |
| Differentiators | Offline-first + transparent pricing + ABDM/NABL | Add Unified Path+Radiology into MVP |
| Path + Radiology timing | Pathology first; radiology in V2 | Unified from MVP |
