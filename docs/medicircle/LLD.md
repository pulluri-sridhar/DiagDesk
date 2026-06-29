# MediCircle — Low-Level Design (LLD)

*Component-level design for the five-sided MediCircle platform (**Diagnostic Centers · Doctors/Hospitals ·
Pharmacies · On-Demand Home-Care · Patients**). DiagDesk is the deep **lab node**; the connective layer
(doctor / pharmacy / patient / home-care) starts as a **cloud modular monolith** and extracts services as load
grows. Companion to [HLD.md](HLD.md), [data-model.md](data-model.md) and the canonical service list in
[microservices.md](microservices.md).*

| | |
|---|---|
| **Document** | Low-Level Design v2.0 (reconciled) |
| **Status** | Draft for review |
| **Date** | 2026-06-28 |
| **Related** | [HLD.md](HLD.md) · [data-model.md](data-model.md) · [microservices.md](microservices.md) · [../medicircle-reconciliation.md](../medicircle-reconciliation.md) |

> **Reconciled decisions baked in** (see [reconciliation §3](../medicircle-reconciliation.md)):
> India-sovereign hosting (no hyperscaler) · **integer paise** money (`bigint`, currency `INR`) · **UUIDv7**
> (time-sortable) IDs · transactional outbox + idempotency keys · **Keycloak OIDC** + RBAC + org-scope + RLS ·
> DPDP + ABDM/ABHA + FHIR R4 · **AI assistive-only with mandatory doctor sign-off**.
>
> **No commission engine.** MediCircle does **not** model, compute, accrue, or pay any per-referral commission.
> There is **no commission ledger** and **no commission-computation algorithm** anywhere in this design. Money
> that flows *to a professional* is always tied to a **rendered service** under a compliant
> `professional_service_contract` (basis `fixed` or `per_service` — **never `per_referral`**), or is a home-care
> wage, a B2B settlement, or a refund. Referral relationships are captured as **analytics only** (a source field,
> never a monetary field). See [ADR-007 / ADR-010](../adr/007-no-referral-commission-tooling.md) and
> [reconciliation §4](../medicircle-reconciliation.md).

---

## 1. Backend layering (per service / module)

Every service — whether an independent lab-node microservice or a bounded-context module inside the connective
monolith — follows the same **hexagonal** shape:

```
Controller (HTTP/WS, DTO validation)  ─►  Service / use-case (transactions, sagas)
        │                                      │
        ▼                                      ▼
  Guards / Policies (RBAC + org-scope)     Repository (Prisma/TypeORM)  ─►  Postgres (RLS)
        │                                      │
        ▼                                      ▼
   OpenAPI schema                        Domain events  ─►  Outbox  ─►  bus
                                          (lab: Kafka · connective: BullMQ)
```

**Cross-cutting conventions (every service):**

- **DTO validation:** request/response DTOs validated with `class-validator` / `zod`; never trust client input.
  Errors are typed domain errors → **RFC-7807** `application/problem+json` at the edge.
- **IDs & tenancy:** **UUIDv7** PKs (edge-safe, time-sortable). `org_id` / `branch_id` derived from the verified
  Keycloak JWT → `SET app.org_id` → **Postgres RLS** on every query. No cross-org read without an explicit
  consent grant.
- **Transactional outbox:** domain events are written in the **same DB transaction** as the state change, then
  relayed to the bus (Kafka at the lab core, BullMQ in the connective layer). Guarantees at-least-once side
  effects with exactly-once *transition* semantics (dedup on `outbox_event.id`).
- **Idempotency:** all mutating endpoints accept an `Idempotency-Key` header; the key + request hash is persisted
  and replays return the original response. Payment/provider webhooks additionally dedupe on the **provider event
  id**.
- **Money:** integer **paise** (`bigint`), currency `INR`. All money mutations run in serializable / `SELECT …
  FOR UPDATE` transactions (see §9). No floats anywhere in the money path.
- **Audit:** every stateful action emits an **audit** event consumed by Audit & Admin (hash-chained, immutable).

---

## 2. Domain state machines

> Notation: `─►` transition; *side branches* listed separately. Each transition writes an outbox event in-tx.
> **None of these machines models a "commission" anywhere** — the only money states are payment/refund (§2.7),
> rendered-service settlement, and home-care wage payout.

### 2.1 Test order (lab node)
```
DRAFT ─► ORDERED ─► PAYMENT_PENDING ─► PAID ─► REGISTERED ─► SAMPLE_COLLECTED
      ─► IN_PROCESS ─► REPORT_READY ─► REPORT_DELIVERED ─► COMPLETED
Side branches:
  PAYMENT_PENDING ─► PAYMENT_FAILED ─► (retry) PAYMENT_PENDING
  ORDERED | PAYMENT_PENDING ─► CANCELLED
  PAID ─► NO_SHOW          (patient never visited; refund per policy)
  any  ─► REFUNDED          (triggers Payments refund flow — NOT a commission reversal)
```
> The referring doctor is recorded on the order as a **non-monetary source** (`referring_doctor_id`) for
> referral analytics only. No accrual, ledger, or payout is created from a test order.

### 2.2 Medicine order (pharmacy)
```
CREATED ─► PAYMENT_PENDING ─► PAID ─► ACCEPTED_BY_PHARMACY ─► PACKED
   ─► (PICKUP_READY ─► PICKED_UP) | (OUT_FOR_DELIVERY ─► DELIVERED)
   ─► CLOSED
Side branches:
  PAYMENT_PENDING ─► PAYMENT_FAILED ─► (retry)
  CREATED | PAYMENT_PENDING | ACCEPTED_BY_PHARMACY ─► CANCELLED
  any ─► REFUNDED
  ACCEPTED_BY_PHARMACY ─► REJECTED_BY_PHARMACY (out of stock / Rx invalid) ─► (re-route | refund)
```

### 2.3 Teleconsult session (doctor)
```
SCHEDULED ─► ROOM_CREATED ─► WAITING ─► IN_PROGRESS ─► ENDED ─► NOTES_SAVED ─► CLOSED
Side branches:
  SCHEDULED | WAITING ─► NO_SHOW (patient or doctor)
  SCHEDULED ─► CANCELLED | RESCHEDULED
```

### 2.4 Home-visit booking (home-care)
```
REQUESTED ─► (matching) ─► OFFERED ─► ASSIGNED ─► CONFIRMED ─► EN_ROUTE
   ─► CHECKED_IN ─► IN_PROGRESS ─► CHECKED_OUT ─► COMPLETED ─► CLOSED
Side branches:
  OFFERED ─► DECLINED ─► (re-match) OFFERED
  OFFERED ─► OFFER_EXPIRED (TTL) ─► (re-match) OFFERED
  REQUESTED | ASSIGNED | CONFIRMED ─► CANCELLED
  CONFIRMED | EN_ROUTE ─► NO_SHOW (professional or patient)
  matching exhausted ─► UNFULFILLED (widen radius / escalate to admin / queue scheduled retry)
  any ─► REFUNDED
```
> Settlement to the professional is a **wage payout** for the rendered, geo-verified visit (CHECKED_OUT →
> COMPLETED triggers a `service_engagement` settlement), **not** a referral commission. A `REFUNDED` visit
> reverses the **wage payout** for that engagement, never any commission.

### 2.5 Report lifecycle (lab node)
```
PENDING ─► PRELIMINARY ─► UNDER_VALIDATION ─► VALIDATED ─► SIGNED ─► READY
        ─► DELIVERED ─► (ACKNOWLEDGED)
Side branches:
  VALIDATED | SIGNED ─► AMENDED (new version; supersedes prior, prior retained) ─► UNDER_VALIDATION
  any ─► WITHHELD (critical result hold / admin hold)
```

### 2.6 AI analysis (doctor decision-support — assistive only)
```
QUEUED ─► RUNNING ─► COMPLETED(findings, confidence) ─► PENDING_DOCTOR_REVIEW
        ─► ACCEPTED | OVERRIDDEN_BY_DOCTOR | DISMISSED     (always doctor-gated)
        ─► FAILED (retry/backoff; never blocks report delivery)
```
> AI output **never** auto-notifies the patient and **never** transitions a clinical artifact on its own. A
> doctor sign-off (ACCEPT / OVERRIDE / DISMISS) is mandatory and audited before any AI cue is surfaced to a
> patient-facing artifact.

### 2.7 Payment / refund (Payments & Settlement — money authority)
```
Payment:  INITIATED ─► AUTHORIZED ─► CAPTURED ─► SETTLED
          INITIATED ─► FAILED ─► (retry) INITIATED
          AUTHORIZED ─► VOIDED
Refund:   REFUND_REQUESTED ─► REFUND_PROCESSING ─► REFUNDED
          REFUND_PROCESSING ─► REFUND_FAILED ─► (retry)
Payout (home-care wage / B2B settlement only):
          ELIGIBLE ─► QUEUED ─► PROCESSING ─► PAID
                  ─► FAILED ─► (retry) QUEUED
                  ─► REVERSED (on upstream refund of the rendered service)
```
> `payout` here means **only** a home-care professional wage, a lawful B2B settlement, or a refund-driven
> reversal of one. There is **no commission accrual** feeding any of these states.

### 2.8 Encounter / admission lifecycle (Hospital HIS — Group G)
```
REGISTERED ─► ADMITTED ─► IN_WARD | ICU ─► (OT) ─► DISCHARGE_INITIATED ─► BILLED ─► DISCHARGED
Side branches:
  IN_WARD ⇄ ICU                 (ward/ICU transfers; bed re-allocation)
  any ─► (referral / cross-consult — non-terminal)
```
> One FHIR `Encounter`-aligned `encounter`/`admission` spine (Group G: **G2 ADT**, **G3 Bed/Ward**,
> **G4 IPD & Nursing/CPOE/eMAR**, **G5 OT**) threads orders, eMAR, nursing notes, the ICD-coded discharge
> summary (**G7 MRD**), and the final bill (**G6**). Integer paise, RLS, audit, FHIR projection as everywhere.
> Full detail in [clinic-hospital-his.md](clinic-hospital-his.md).

### 2.9 TPA / cashless claim (Hospital Billing — Group G6)
```
ESTIMATE ─► PRE_AUTH_REQUESTED ─► APPROVED | REJECTED ─► CLAIM_SUBMITTED ─► SETTLED
Side branches:
  REJECTED ─► (resubmit) PRE_AUTH_REQUESTED | (convert to self-pay)
  APPROVED ─► (enhancement) PRE_AUTH_REQUESTED
```
> **G6 Hospital Billing & TPA/Cashless** (tariff/packages, advances, interim/final bills, **PM-JAY**). Consented
> sharing per the consent framework; settlement money is integer paise. Detail in
> [clinic-hospital-his.md](clinic-hospital-his.md).

---

## 3. Key sequence flows

### 3.1 Create test order / referral
```
Doctor → API: POST /api/v1/orders {patientId, labId, testIds[], referringDoctorId?, notes}
API: validate doctor↔lab association (active) + patient consent
API (tx): test_order(ORDERED) + items (price snapshot per item)
          + patient_lab_link (create lab patient if new)
          + record referring_doctor_id as SOURCE only (no money field)
          + outbox: OrderCreated
API → Doctor: 201 {orderId, status:ORDERED, amountPaise, items[], paymentLink}
Worker(OrderCreated): notify patient (payment link) + notify lab
```
> No commission preview, no ledger entry, no rate snapshot for a referral. The 201 response carries **no**
> `commission` block (contrast the prior MediCircle DTO).

### 3.2 Payment webhook (idempotent)
```
Razorpay → API: POST /api/v1/webhooks/razorpay (HMAC signed)
API: verify signature; dedupe on provider event.id (return 200 on replay)
API (tx): payment(CAPTURED); order → PAID; outbox: OrderPaid
Worker(OrderPaid): notify lab "collect sample"; notify patient receipt
```

### 3.3 Report ready + AI + delivery
```
Lab → API: POST /api/v1/orders/{id}/report {parameters[] | fileId}
API (tx): lab_report(READY) + parameters; order → REPORT_READY; outbox: ReportReady
Worker(ReportReady):
   if PDF → OCR parse → structured params
   enqueue AIAnalysis(patient.age, patient.sex, params)   // consented, minimised
Worker(AIAnalysisDone): ai_analyses(PENDING_DOCTOR_REVIEW)  // never auto-notifies patient
Doctor: reviews cues → ACCEPT / OVERRIDE / DISMISS (audited)
API (tx on deliver): order → REPORT_DELIVERED; outbox: ReportDelivered
Worker(ReportDelivered): WhatsApp + app to patient (secure link); in-app to doctor
```

### 3.4 Mark completed (no commission)
```
Lab → API: PATCH /api/v1/orders/{id}/complete
API (tx): order → COMPLETED; outbox: OrderCompleted
Worker(OrderCompleted): update referral analytics read-model (count/conversion only)
                        notify doctor "patient visited" (informational, NO money)
```
> This flow **replaces** the prior "Mark completed → commission approved" sequence. There is no
> `commission_ledger` transition and no monthly payout aggregation of referrals.

### 3.5 Home-visit booking → matching → settlement
```
Patient → API: POST /api/v1/home-visits {serviceId, type, addressId, scheduledAt?}
API (tx): home_visit_booking(REQUESTED); outbox: VisitRequested
Worker(VisitRequested): run matching/dispatch (§5.4) → send OFFER(s) (TTL)
Professional → API: POST /api/v1/home-visits/{id}/offers/{offerId}/accept
API (tx): booking → ASSIGNED → CONFIRMED; outbox: VisitConfirmed
... EN_ROUTE → check-in(geo) → IN_PROGRESS → check-out(geo+OTP+vitals)
API (tx on check-out): booking → CHECKED_OUT → COMPLETED;
          create service_engagement(rendered) for the visit;
          outbox: VisitCompleted
Worker(VisitCompleted): Payments → wage payout(ELIGIBLE) for the rendered visit
                        (a SERVICE wage, not a referral commission)
```

---

## 4. API contract (representative, versioned `/api/v1`)

> Full machine-readable contract lives in `openapi.yaml` (generated from NestJS decorators). Conventions:
> `Authorization: Bearer <jwt>` (Keycloak); pagination `?page&limit` or cursor; errors RFC-7807
> `application/problem+json`; all mutating endpoints accept `Idempotency-Key`.

### 4.1 Auth & identity (Identity & Access)
```
POST   /api/v1/auth/otp/request        {phone}                          → {otpToken}
POST   /api/v1/auth/otp/verify         {otpToken, code}                 → {access, refresh, user}
POST   /api/v1/auth/refresh            {refresh}                        → {access, refresh}
POST   /api/v1/auth/logout
GET    /api/v1/me
POST   /api/v1/onboarding/{role}       role-specific KYC payload        → {profile, status}
```

### 4.2 Associations & Contracts (compliant — replaces commission engine)
```
GET    /api/v1/labs?lat&lng&test&radius                                 → discovery list (ranked §5.4)
POST   /api/v1/doctor/associations     {labId}                          → association (non-monetary link)
POST   /api/v1/contracts               {counterpartyId, basis:fixed|per_service, terms} → professional_service_contract
GET    /api/v1/contracts?status&from&to                                 → contracts list (NEVER per_referral)
POST   /api/v1/service-engagements     {contractId, renderedServiceRef} → engagement (rendered service)
GET    /api/v1/referral-analytics?doctorId&from&to                      → counts/conversion ONLY (no money)
```
> **Guardrail:** `POST /api/v1/contracts` with `basis:"per_referral"` (or any per-referral term) is **rejected
> `422 contract_basis_not_permitted`** and audit-logged. `referral-analytics` returns volume/conversion metrics
> with **no monetary fields**.

### 4.3 Catalog, orders, reports (lab node)
```
GET    /api/v1/labs/{id}/tests
POST   /api/v1/labs/{id}/tests         {name, price, tat, params[]}
POST   /api/v1/orders                  {patientId, labId, testIds[], referringDoctorId?, notes}
GET    /api/v1/orders/{id}
PATCH  /api/v1/orders/{id}/status      {status}                         (lab/admin only)
POST   /api/v1/orders/{id}/report      {parameters[] | fileId}
POST   /api/v1/orders/{id}/deliver
PATCH  /api/v1/orders/{id}/complete
```

### 4.4 Consultations, prescriptions, teleconsult (doctor)
```
POST   /api/v1/consultations           {patientId, complaint, diagnosis}
POST   /api/v1/consultations/{id}/prescription {items:[{medicineId,dose,freq,duration,timing,beforeFood}]}
POST   /api/v1/teleconsults            {patientId, scheduledAt}         → {sessionId}
POST   /api/v1/teleconsults/{id}/start                                 → {roomToken, joinUrl}
POST   /api/v1/teleconsults/{id}/notes {notes}
POST   /api/v1/ai-analyses/{id}/review {decision:ACCEPT|OVERRIDE|DISMISS, note} (doctor only)
```

### 4.5 Home care & on-demand visits (home-care)
```
GET    /api/v1/home-care/services?type&lat&lng                         → service catalog
POST   /api/v1/home-care/professionals/onboard  {type, credentials[]}
PATCH  /api/v1/home-care/professionals/me/availability {slots[], onCall}
POST   /api/v1/home-visits             {serviceId, type:on_call|scheduled, addressId, scheduledAt?}
GET    /api/v1/home-visits/{id}
POST   /api/v1/home-visits/{id}/offers/{offerId}/accept   (professional)
POST   /api/v1/home-visits/{id}/offers/{offerId}/decline  (professional)
POST   /api/v1/home-visits/{id}/check-in   {lat, lng}
POST   /api/v1/home-visits/{id}/check-out  {lat, lng, otp, notes, vitals}
POST   /api/v1/home-visits/{id}/cancel
POST   /api/v1/care-plans              {patientId, serviceId, schedule, professionalId?}
WS     channel: home-visit:{id}        (status + live location updates)
```

### 4.6 Pharmacy & delivery
```
GET    /api/v1/prescriptions/{id}
GET    /api/v1/medicines?search&by=brand|generic
POST   /api/v1/medicine-orders         {prescriptionId, pharmacyId, fulfilment:pickup|delivery, address?}
PATCH  /api/v1/medicine-orders/{id}/status
POST   /api/v1/medicine-orders/{id}/assign-agent {agentId}
GET    /api/v1/pharmacy/{id}/inventory
POST   /api/v1/pharmacy/{id}/inventory/batches {medicineId,batchNo,expiry,qty,mrp}
```

### 4.7 Billing, payments, payouts (Payments & Billing)
```
POST   /api/v1/invoices                {accountId, lines[], gst}        → GST invoice
GET    /api/v1/b2b/{account}/statement                                 → B2B statement
GET    /api/v1/b2b/receivables?aging
GET    /api/v1/payouts?status&from&to                                  → home-care wage / B2B settlement payouts
GET    /api/v1/refunds/{id}
```
> There is **no** `/commissions` resource. `/payouts` returns only home-care wages, B2B settlements, and
> refund reversals.

### 4.8 Engagement, insurance, consent, notifications
```
POST   /api/v1/content                 {type:voice|poster|pdf|text, body, audience}   (lab-owned, moderated)
POST   /api/v1/health-packages         {labId, tests[], price, audience}              (lab-owned, no RMP kickback)
POST   /api/v1/insurance/recommendations {patientId, providerId}                      (consented)
POST   /api/v1/consents                {scope, granteeId, expiresAt}
DELETE /api/v1/consents/{id}           (revoke — immediate effect at data layer)
GET    /api/v1/notifications  ·  PATCH /api/v1/notification-prefs
WS     /ws  — channels: notifications, order:{id}, teleconsult:{id}, home-visit:{id}
```

### 4.9 Webhooks (inbound — HMAC verified, idempotent)
```
POST /api/v1/webhooks/razorpay    (payments, payouts)   — HMAC verified, dedup on event.id
POST /api/v1/webhooks/gupshup     (WhatsApp delivery)
POST /api/v1/webhooks/100ms       (room/recording events)
```

### 4.10 Sample DTOs
```jsonc
// POST /api/v1/orders
{ "patientId":"uuid","labId":"uuid","testIds":["uuid"],
  "referringDoctorId":"uuid","notes":"fasting advised" }
// 201 — NOTE: no "commission" block anywhere
{ "orderId":"uuid","status":"ORDERED","amountPaise":120000,"currency":"INR",
  "items":[{"testId":"uuid","name":"CBC","pricePaise":40000}],
  "referringDoctorId":"uuid",          // source/analytics only
  "paymentLink":"https://..." }

// POST /api/v1/contracts  (compliant professional-services contract)
{ "counterpartyId":"uuid","basis":"per_service",   // fixed | per_service — NEVER per_referral
  "terms":{ "serviceCode":"PATH_REVIEW","ratePaise":50000,"unit":"per_report" } }
```

---

## 5. Core algorithms

### 5.1 Brand → generic substitution (suggested, never automatic)
```
input: prescribed brand B
comp = medicine_brands[B].composition_id              // e.g. Paracetamol 500mg
candidates = brands_with_composition(comp)
available = candidates ∩ pharmacy_inventory_in_stock(non-expired, FEFO)
rank by: price asc, expiry (FEFO), preferred-flag
return prescribed (if in stock) + ranked substitutes (flagged "generic equivalent")
```
> Substitution is **suggested**, never auto-applied; dispensing follows pharmacy law and requires explicit
> pharmacist selection. **Controlled substances** (Schedule H/H1/X, narcotics) are **excluded** from auto-suggest.

### 5.2 Inventory FEFO + expiry alerting (labs and pharmacies)
```
on dispense(item, qty): consume from batches ordered by expiry ASC (First-Expiry-First-Out),
                        row-lock each batch (§9) to prevent oversell
test-kit consumption: decrement kit qty using tests_per_kit; raise alert when kits depleted
scheduled daily (Workers + Scheduler):
  for batch in all_batches:
    if batch.expiry <= today+30d → alert("expiring", batch)
    if batch.expiry <  today     → alert("expired"); quarantine batch (block dispense)
    if batch.qty   <= reorder_level → alert("low_stock")
```

### 5.3 Lab discovery ranking
```
score = w1*test_match + w2*proximity(lat,lng) + w3*rating + w4*price_competitiveness
        + w5*doctor_preference_flag
return labs sorted by score desc, paginated
```
> `doctor_preference_flag` is a clinical/quality preference signal — **not** a paid-placement or commission
> signal. No ranking weight is bought.

### 5.4 Home-visit professional matching & dispatch
```
input: booking(serviceId, type, address, time)
required_type = service.delivered_by_type           // NURSE | PHYSIO | DOCTOR | ATTENDANT
pool = professionals where type == required_type
            and verified (Credentialing) and available_at(time) and serves_area(address)
score = w1*proximity(address) + w2*rating + w3*acceptance_rate + w4*idle_time + w5*price_fit
for pro in pool sorted by score desc:
   send OFFER (TTL e.g. 60s for on-call)            // booking: OFFERED
   if accepted → ASSIGN, stop                       // booking: ASSIGNED → CONFIRMED
   if declined/timeout → next                       // sequential or small parallel fan-out
if pool exhausted → widen radius / escalate to admin / queue scheduled retry  // booking: UNFULFILLED
```
> On-call uses short offer TTLs and proximity-first; scheduled visits can pre-book a specific professional.
> Reassignment re-enters the loop on decline / cancel / no-show. The same matching engine is **reused for
> at-home lab sample collection**.

### 5.5 AI decision-support pipeline (assistive only + sign-off + audit)
```
input: structured report params + patient.age + patient.sex   (consented, minimised — no PII beyond need)
1. rules layer:   flag values outside age/sex reference ranges (H / L / critical)
2. retrieval:     pgvector lookup over clinical reference knowledge
3. LLM (Claude):  structured findings = [{observation, possible_correlation,
                  suggested_followups[], confidence, citations}] with strict
                  "assistive, not diagnostic" guardrails
4. persist:       ai_analyses(PENDING_DOCTOR_REVIEW); version + model id recorded; NEVER auto-notify patient
5. doctor review: ACCEPT / OVERRIDE / DISMISS → recorded + audited (hash-chained); only then surfaced
```
> Mandatory doctor sign-off gates every AI cue. AI **failure** never blocks report delivery — cues are simply
> marked unavailable.

---

## 6. Per-service internals

> Structured per the canonical [microservices.md](microservices.md). Each entry: **responsibilities ·
> representative endpoints · events (published/consumed) · owned tables**. Lab-node services (14–19, 22) are
> independent microservices with edge deployment; connective-layer entries are modules in the monolith,
> extractable later.

### A. Platform & shared services

**1. API Gateway / BFF** — Edge routing, OIDC token validation, rate-limit, WAF, WebSocket gateway, OpenAPI
aggregation; per-client BFFs (patient / care-pro / portals).
• *Owns:* — (stateless). • *Events:* —.

**2. Identity & Access (Keycloak-backed)**
• Phone-OTP/JWT auth, sessions, device binding, RBAC + org-scope, role/permission catalogue.
• *Endpoints:* `POST /api/v1/auth/otp/request|verify`, `POST /api/v1/auth/refresh`, `GET /api/v1/me`,
  `POST /api/v1/users/{id}/roles`.
• *Events:* pub `user.created`, `role.assigned`. • *Owns:* `users`, `roles`, `permissions`, `role_permission`,
  `user_permission`, `sessions` (Keycloak is credential source; profiles mirrored).

**3. Credentialing & Verification** — KYC + credential checks (NMC/State-Council, NABL, drug license,
nursing/physio council), background checks, approval queues — the trust backbone.
• *Endpoints:* `POST /api/v1/onboarding/{role}`, `GET /api/v1/verification-cases?status`.
• *Events:* pub `credential.verified`, `professional.activated`; sub `*.onboarded`.
• *Owns:* `kyc_documents`, `credentials`, `verification_cases`.

**4. Organizations & Profiles** — Centers, pharmacies, hospitals, branches, org staff; doctor/patient/
professional profiles; **MPI** (master patient index, cross-org linkage).
• *Endpoints:* `POST /api/v1/patients`, `GET /api/v1/patients/search?phone=`, `POST /api/v1/patients/{id}/merge`,
  `POST /api/v1/branches`.
• *Events:* pub `patient.registered`, `patient.merged`, `org.created`. • *Owns:* `diagnostic_centers`,
  `pharmacies`, `hospitals`, `branches`, `org_staff`, `doctors`, `patients`, `patient_links`.

**5. Consent & Health Records** — Consent registry (DPDP, revocable), ABHA linkage, **FHIR R4** adapter/exchange.
• *Endpoints:* `POST /api/v1/consents`, `DELETE /api/v1/consents/{id}`.
• *Events:* pub `consent.granted`, `consent.revoked`; sub clinical events for FHIR projection.
• *Owns:* `consents`, `abha_links`, `fhir_resources`.

**6. Notifications** — Multi-channel dispatch: Resend (email), WhatsApp (Gupshup/Meta), MSG91 (SMS-DLT), FCM
(push); templates, prefs, quiet hours. Delivers OTP for Identity. **PHI guardrail:** report messages carry a
secure link, not PHI.
• *Endpoints:* `POST /api/v1/notify`, `GET /api/v1/notifications`, `PATCH /api/v1/notification-prefs`.
• *Events:* sub `*.notify`, `order.paid`, `report.delivered`, etc. • *Owns:* `notification_templates`,
  `notifications`, `notification_prefs`.

**7. Payments & Settlement** — Payments, refunds, **payouts (home-care professional wages + lawful B2B
settlement)**, split settlement (Razorpay Route), reconciliation. **No referral-commission ledger.**
• *Endpoints:* `POST /api/v1/webhooks/razorpay`, `GET /api/v1/payouts`, `GET /api/v1/refunds/{id}`.
• *Events:* pub `payment.captured`, `refund.completed`, `payout.paid`; sub `order.paid`, `visit.completed`
  (wage payout), `invoice.paid`. • *Owns:* `payments`, `refunds`, `payouts`, `settlements`.
• **Guardrail:** rejects any attempt to attach a payout to a *referral* rather than a rendered service.

**8. Billing & Invoicing** — Provider GST invoices/receipts, day-book/collections, returns, exportable financial
reports; **B2B account billing** (institution = buyer), billing cycles, **receivables aging**.
• *Endpoints:* `POST /api/v1/invoices`, `GET /api/v1/b2b/{account}/statement`,
  `GET /api/v1/b2b/receivables?aging`.
• *Events:* pub `invoice.created`, `invoice.paid`. • *Owns:* `invoices`, `invoice_items`, `credit_notes`.
• **Compliance (hard rule):** separates "customer billing" from "referral source"; attaching a
  payout/commission to a `referring_doctor` is rejected and audit-logged.

**9. Subscriptions & Entitlements** — Provider SaaS plans, billing, entitlements/feature-gating.
• *Owns:* `subscription_plans`, `subscriptions`, `entitlements`. • *Events:* pub `subscription.changed`.

**10. Audit & Admin** — Immutable **hash-chained** audit (clinical/financial/consent), disputes, moderation,
fraud monitoring. • *Endpoints:* `GET /api/v1/audit?entity=`, `POST /api/v1/disputes`.
• *Events:* sub **all** domain events. • *Owns:* `audit_logs`, `disputes`, `moderation_cases`.

**11. Analytics / MIS** — CQRS read-models + dashboards: referral **volume/conversion**, revenue, TAT, home-care,
reconciliation. • *Owns:* `mv_*` read models. • *Events:* sub domain events.
• **Note:** referral analytics are **counts/conversion only — no monetary commission fields.**

**12. Search & Discovery** — OpenSearch index for lab/doctor/test/content discovery + ranking (§5.3).
• *Owns:* index only. • *Events:* sub catalog/profile changes (index projection).

**13. Notification/Job Workers + Scheduler** — BullMQ consumers + cron: reports pipeline, AI analysis, **wage/B2B
payouts**, delivery dispatch, OCR, **expiry scans**, statements, follow-up reminders.
• *Owns:* —. • *Events:* sub `report.ready`, `visit.completed`, etc.

### B. Lab node (DiagDesk) — offline-first edge + microservices

**14. Catalog & Rate-Card** — Test master (NABL picker + custom), panels, reference ranges, health packages,
rate cards (CGHS/ECHS/TPA/B2B). • *Endpoints:* `GET /api/v1/labs/{id}/tests`, `POST /api/v1/labs/{id}/tests`,
`GET /api/v1/reference-ranges?test=&age=&sex=`, `POST /api/v1/rate-cards`.
• *Owns:* `tests`, `test_parameters`, `test_panels`, `reference_ranges`, `health_packages`, `rate_cards`,
  `rate_card_items`. • *Events:* pub `catalog.changed`.

**15. Order & Workflow** — Lab order lifecycle (§2.1), unique patient linkage, accessioning, barcode sample
tracking, TAT. • *Endpoints:* `POST /api/v1/orders`, `POST /api/v1/orders/{id}/accession`,
`GET /api/v1/worklist?status`, `POST /api/v1/samples/{id}/event`.
• *Events:* pub `order.created`, `order.paid`, `order.completed`, `sample.status.changed`; sub
  `result.validated`. • *Owns:* `test_orders`, `test_order_items`, `samples`, `sample_events`, `accessions`,
  `patient_lab_links`. • **Compliance:** `referring_doctor_id` is a non-monetary **source** field only.

**16. Result & Validation** — Result capture (analyzer/manual), auto-validation (range/delta/critical),
multi-level sign-off (tech → pathologist). • *Endpoints:* `POST /api/v1/results`,
`POST /api/v1/results/{id}/validate`. • *Events:* pub `result.entered`, `result.validated`, `critical.flagged`;
sub analyzer results from Device Gateway. • *Owns:* `results`, `result_values`, `validations`.

**17. Device Gateway (Go, edge)** — HL7/ASTM analyzer interfacing at the branch edge; ORU→result mapping;
worklist download. • *Owns:* `device_messages`. • *Why Go:* many concurrent persistent sockets, small static
edge binary.

**18. Reporting** — Templates + letterhead/stationery, PDF render + digital signature, delivery orchestration,
print log + handover (barcode). • *Endpoints:* `POST /api/v1/orders/{id}/report`, `POST /api/v1/orders/{id}/deliver`.
• *Events:* pub `report.ready`, `report.delivered`; sub `result.validated`. • *Owns:* `lab_reports`,
  `report_files`, `report_stationery`, `report_print_log`, `report_handover`. PDFs in object store; secure
  expiring link only.

**19. Inventory (labs and pharmacies)** — Reagents/consumables/**vaccines**/medicines, **batch + expiry (FEFO)**,
**test-kit `tests_per_kit` consumption**, reorder alerts (§5.2). • *Endpoints:* `GET /api/v1/pharmacy/{id}/inventory`,
`POST /api/v1/pharmacy/{id}/inventory/batches`. • *Events:* pub `stock.low`, `batch.expiring`, `batch.expired`.
• *Owns:* `inventory_items`, `inventory_batches`, `test_kits`, `stock_ledger`, `vaccines`.

**20. Lab Quality (NABL)** — IQC, Levey-Jennings, Westgard, EQAS, controlled docs.
• *Owns:* `qc_runs`, `lj_points`, `eqas_records`, `controlled_docs`.

**21. Expenses** — Provider expense tracking by category + reports. • *Owns:* `expense_categories`, `expenses`.

**22. Sync Engine (Go)** — Branch ⇄ cloud offline change-log sync, conflict resolution, **money-record domain
reconciliation**. • *Owns:* `sync_state`, `outbox_event`. • *Events:* relays outbox both directions
(idempotent, resumable).

### C. Doctor / clinical services

**23. Associations & Contracts** — Doctor↔lab associations; **professional-service contracts (fixed/per_service —
never per-referral)**; B2B agreements. **Replaces the commission engine.**
• *Endpoints:* `POST /api/v1/doctor/associations`, `POST /api/v1/contracts`, `POST /api/v1/service-engagements`,
  `GET /api/v1/referral-analytics`.
• *Events:* pub `contract.created`, `service_engagement.rendered` (→ Payments wage/B2B settlement),
  `association.created`. • *Owns:* `doctor_lab_associations`, `professional_service_contracts`,
  `service_engagements`, `b2b_agreements`.
• **Guardrail:** rejects `basis:per_referral` with `422 contract_basis_not_permitted`. A `service_engagement`
  must reference a **rendered service**, never a referral.

**24. Consultations & Prescriptions** — Visits/records, e-prescription (dosage/frequency/duration), follow-up
scheduling. • *Endpoints:* `POST /api/v1/consultations`, `POST /api/v1/consultations/{id}/prescription`.
• *Events:* pub `consultation.created`, `prescription.issued`. • *Owns:* `consultations`, `prescriptions`,
  `prescription_items`.

**25. Teleconsultation** — Video sessions (100ms), secure join links, waiting room, in-call notes,
consent-gated recording (§2.3). • *Endpoints:* `POST /api/v1/teleconsults`, `POST /api/v1/teleconsults/{id}/start`,
`POST /api/v1/teleconsults/{id}/notes`. • *Events:* pub `teleconsult.ended`; sub `webhooks/100ms`.
• *Owns:* `video_sessions`.

**26. AI Decision Support** — Claude-based cues from age/sex + structured results; **assistive only + mandatory
doctor sign-off**; versioned, audited; pgvector retrieval (§5.5, §2.6).
• *Endpoints:* `POST /api/v1/ai-analyses/{id}/review`. • *Events:* pub `ai_analysis.completed`,
  `ai_analysis.reviewed`; sub `report.ready`. • *Owns:* `ai_analyses`, `ai_analysis_findings`.

**27. Prescription Integrity** — E-signed, ABHA-linked prescriptions; **reuse-prevention registry**; Schedule
H/H1/X + narcotics guardrails; anti-forgery. • *Events:* pub `rx.signed`, `rx.dispensed`. • *Owns:*
`rx_signatures`, `rx_dispense_registry`.

### D. Pharmacy services

**28. Medicine Master & Brand↔Generic** — Catalogue, **brand↔composition mapping**, substitute suggestions
(§5.1). • *Endpoints:* `GET /api/v1/medicines?search&by=brand|generic`. • *Owns:* `medicines`,
`medicine_brands`, `medicine_compositions`.

**29. Pharmacy Fulfilment & Delivery** — E-prescription → order (§2.2), substitution, payment link,
**pickup/home delivery** (radius), agent assignment, tracking + POD. • *Endpoints:*
`POST /api/v1/medicine-orders`, `PATCH /api/v1/medicine-orders/{id}/status`,
`POST /api/v1/medicine-orders/{id}/assign-agent`. • *Events:* pub `medicine_order.created`, `delivery.dispatched`,
`delivery.delivered`; sub `prescription.issued`, `payment.captured`. • *Owns:* `medicine_orders`,
`medicine_order_items`, `deliveries`, `delivery_agents`.

### E. On-demand & home-care

**30. Home Care & On-Demand** — Professional onboarding (via Credentialing), service catalog, **booking +
matching/dispatch** (§5.4, §2.4), availability/on-call, geo **check-in/out** + visit OTP, **care plans**, visit
records → patient history, **wage payouts via Payments**, SOS/ratings. Reuses matching for **at-home sample
collection**.
• *Endpoints:* `POST /api/v1/home-visits`, `POST /api/v1/home-visits/{id}/check-in|check-out`,
  `POST /api/v1/home-visits/{id}/offers/{offerId}/accept|decline`, `POST /api/v1/care-plans`,
  `PATCH /api/v1/home-care/professionals/me/availability`.
• *Events:* pub `visit.requested`, `visit.confirmed`, `visit.completed` (→ wage payout), `visit.cancelled`;
  sub `professional.activated`, `payment.captured`. • *Owns:* `care_professionals`, `home_care_services`,
  `home_visit_bookings`, `home_visits`, `care_plans`, `professional_availability`.
• **Note:** the professional is paid a **wage for the rendered, geo-verified visit** — not a referral commission.

### F. Engagement & insurance

**31. Engagement** — Health content/advisories, **lab-owned** packages (no RMP kickback), campaigns, health
camps; consent + opt-out; moderation. • *Endpoints:* `POST /api/v1/content`, `POST /api/v1/health-packages`.
• *Owns:* `content_items`, `campaigns`, `health_camps`, `package_promotions`.

**32. Insurance** — Ailment-based plan recommendations, **consented** medical-summary sharing → leads; (R3+)
cashless/TPA, PM-JAY, NHCX. • *Endpoints:* `POST /api/v1/insurance/recommendations`. • *Owns:*
`insurance_providers`, `insurance_recommendations`, `insurance_leads`.
• **Note:** no RMP procurement incentives; lead-gen is consented and non-commissioned.

---

## 7. Domain model (key relationships — see [data-model.md](data-model.md) for full DDL)

```
User 1─1 (Patient | Doctor | OrgStaff | CareProfessional)
DiagnosticCenter 1─* Branch 1─* OrgStaff
Doctor *─* DiagnosticCenter  (via doctor_lab_associations)                  // NON-monetary link
Doctor | Org *─* ProfessionalServiceContract  (basis fixed|per_service)     // NEVER per_referral
ProfessionalServiceContract 1─* ServiceEngagement  (each = a RENDERED service)
Doctor 1─* Consultation 1─* Prescription 1─* PrescriptionItem *─1 Medicine
DiagnosticCenter 1─* Test 1─* TestParameter
TestOrder 1─* TestOrderItem *─1 Test ; TestOrder ·─· referring_doctor_id    // SOURCE field only
TestOrder 1─1 LabReport 1─* ReportParameter ; 1─* ReportFile
LabReport 1─* AiAnalysis 1─* AiAnalysisFinding                              // assistive, doctor-gated
TestOrder 1─* Payment                                                       // NO CommissionLedger
Prescription 1─* MedicineOrder 1─* MedicineOrderItem ; 1─0..1 Delivery *─1 DeliveryAgent
Pharmacy 1─* InventoryItem 1─* InventoryBatch  (Vaccine is an InventoryItem subtype)
CareProfessional *─* HomeCareService (by type) ; CareProfessional 1─* ProfessionalAvailability
Patient 1─* HomeVisitBooking 1─0..1 HomeVisit *─1 CareProfessional ; HomeVisit 1─* VisitNote
HomeVisit 1─0..1 ServiceEngagement 1─0..1 Payout (WAGE)                      // wage, not commission
Patient 1─* CarePlan 1─* HomeVisitBooking (recurring) ; HomeVisit 1─0..1 Payment
Patient 1─* Consent ; 1─0..1 AbhaLink ; 1─* InsuranceLead
B2BAccount 1─* Invoice 1─* InvoiceItem ; B2BAccount 1─0..1 Settlement (Payout)
```
> **Explicitly absent:** any `CommissionAgreement`, `CommissionLedger`, `CommissionEntry`, or
> referral-derived monetary entity. Money to a professional flows **only** through `ServiceEngagement → Payout
> (wage)` or B2B `Settlement`.

---

## 8. Validation, errors, and edge cases

- **No active association** when ordering → `409 no_active_association`.
- **Contract with per-referral basis** → `422 contract_basis_not_permitted` + audit-logged (the hard
  anti-kickback guardrail).
- **Payout attached to a referral** (not a rendered service) → rejected at Payments/Billing + audit-logged.
- **Duplicate payment webhook** → idempotent no-op, return `200`.
- **Refund after a rendered home-care visit** → the **wage payout** for that `service_engagement` is `REVERSED`
  (never a "commission reversal").
- **Patient no-show** (configurable T+N) → order `NO_SHOW`; refund per policy. No monetary referral effect.
- **Brand with no composition mapping** → flagged for admin enrichment; manual dispense only.
- **Expired-only stock** → block dispense; force substitute or restock.
- **Controlled substance** → excluded from auto-substitute; Prescription Integrity guardrails enforced.
- **Teleconsult join before doctor** → waiting room; join-token TTL enforced.
- **Home-visit offer TTL expiry** → `OFFER_EXPIRED` → re-match; pool exhaustion → `UNFULFILLED` + escalate.
- **Check-out geo/OTP mismatch** → reject check-out; visit stays `IN_PROGRESS`; flag for review (anti-fraud).
- **AI failure** → report still delivered; cues marked unavailable (never blocks care).
- **Consent revoked** → immediately stop sharing; future cross-org access denied at the data (RLS) layer.

---

## 9. Caching & performance

- Cache test catalog & lab discovery (Redis/Valkey, TTL 5–15 min, invalidate on write).
- Cache reference-range and brand↔composition lookups (read-mostly).
- **Materialised referral analytics read-models** for doctor dashboards — **counts/conversion only, no money**.
- Cursor pagination on orders / notifications / visits; covering indexes (see data-model §indexes).
- Presigned **S3-compatible** (sovereign) URLs for report/prescription media — never proxy large files through
  the API.
- Home-visit live location streamed over WebSocket; matching pool queries use geo (PostGIS / OLA Maps) indexes.

---

## 10. Concurrency & consistency

- **ACID for money:** all payment/refund/payout and invoice mutations run in serializable / `SELECT … FOR
  UPDATE` transactions. No floats — integer paise throughout.
- **Idempotent payment webhooks:** verify HMAC signature; dedupe on provider `event.id`; replays return the
  original `200`. The webhook handler is the single authority that transitions a payment.
- **Inventory:** decrement uses **per-batch row locks** (FEFO order) to avoid oversell; test-kit consumption is
  in the same locked tx.
- **Home-visit offers:** offer accept is a compare-and-set on booking state (`OFFERED → ASSIGNED`); the **first**
  accept wins, late accepts get `409 offer_already_taken`.
- **Outbox relay:** events fire exactly once per state transition (dedup on `outbox_event.id`); consumers are
  idempotent, with retry/backoff and a DLQ for poison messages.
- **Edge ⇄ cloud (lab node):** Sync Engine reconciles offline changes; **money records use domain
  reconciliation** (append-only favored; per-field LWW only for non-money fields). See HLD edge-sync sequence.

---

*Cross-references: [HLD.md](HLD.md) (architecture, sequences, deployment), [data-model.md](data-model.md) (full
DDL, indexes, RLS policies), [microservices.md](microservices.md) (canonical service list & build order),
[../medicircle-reconciliation.md](../medicircle-reconciliation.md) (locked program decisions).*
```
