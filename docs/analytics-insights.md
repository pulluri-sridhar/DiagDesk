# DiagDesk — Analytics & Insights

*The owner/management "command center": revenue, operations, and growth insight at a glance — what's working,
what's not, and what to improve. Enriches the MIS items in [features.md](features.md) §17 and is delivered in
the web admin **and** the Lab owner app ([features.md](features.md) §19 app portfolio).*

> Goal: a lab owner opens DiagDesk and within seconds knows **how the business is doing and what to act on** —
> without exporting to Excel or calling staff.

---

## 1. Questions the insights answer

- **Revenue:** today / MTD / YTD; by branch, test, department, modality; cash vs credit; collected vs
  outstanding; period-over-period growth.
- **What's working / not:** top & bottom tests/packages by revenue and volume; margin by test; idle capacity;
  conversion of enquiries/bookings to billed orders.
- **Where patients come from:** **geographic/pincode heatmap**, walk-in vs home-collection vs B2B, online vs
  offline, channel (website/app/WhatsApp/referral), new vs repeat patients.
- **Who refers most:** **top referring doctors & B2B partners** by volume, **revenue *generated***, and growth;
  doctors slipping (declining referrals) for win-back. *Analytics only — never a commission paid to a referrer*
  (anti-kickback; see [compliance-anti-kickback.md](compliance-anti-kickback.md)).
- **Seasonality & trends:** day-of-week / month / seasonal demand patterns; test-mix shifts (e.g., dengue/flu
  season); trend lines and forecasts for capacity & inventory planning.
- **Operations health:** TAT (and breaches), sample rejection rate & reasons, productivity per tech/branch,
  pending/overdue worklists.
- **Money health:** B2B receivables aging, overdue partners, discount leakage, day-end variances.
- **Compliance health:** QC pass rate, audit/consent coverage, NABL-readiness indicators.

---

## 2. Dashboards (views)

1. **Executive summary** — headline KPIs + alerts ("revenue down 8% WoW", "Dr. X referrals dropped 40%",
   "TAT breaches up").
2. **Revenue & collections** — trends, breakdowns, cash vs credit, outstanding.
3. **Referral sources & doctors** — leaderboard by volume & revenue *generated*, growth/decline, win-back list (no payouts).
4. **Patient acquisition & geography** — pincode heatmap, source channels, new vs repeat, acquisition cost.
5. **Test & department performance** — volume/revenue/margin mix, top/bottom movers.
6. **Operations** — TAT, rejections, productivity, pending work.
7. **Finance & receivables** — B2B aging, discounts, day-end.
8. **Trends & seasonality** — time-series, forecasts, comparisons.
9. **Alerts & anomalies** — auto-surfaced changes worth attention.

Every view: **date-range + branch + comparison-period** filters, drill-down to detail, and **export
(PDF/Excel)**.

---

## 3. Proactive insight (not just dashboards)
- **Scheduled digests** — daily/weekly/monthly summary delivered by **email (Resend) / WhatsApp** to owners.
- **Alerts & anomaly detection** — significant drops/spikes (revenue, referrals, TAT, rejections) pushed to the
  Lab owner app.
- **Actionable nudges** — "these 5 doctors are referring less — call them", "reorder reagent X before the
  seasonal spike", "branch Y has idle capacity on Tuesdays".
- **Predictive (V2)** — demand/seasonality forecasting for staffing, inventory, and capacity.

---

## 4. Technical approach
- **Source:** services emit domain events → **CQRS read models / projections** purpose-built for analytics
  (denormalized, fast) — keeps heavy queries off the transactional databases.
- **Store:** start with **PostgreSQL materialized views + read models**; introduce **ClickHouse** (or Postgres
  columnar) if query volume/cardinality grows. India-resident throughout (DPDP).
- **In-app dashboards:** built with **Recharts/visx** on the read models (fast, embedded, branded).
- **Ad-hoc / deep BI:** self-hosted **Metabase** (or Apache Superset) on the analytics store for power users —
  open-source, India-resident, no hyperscaler.
- **Distinction:** **PostHog** (already in the stack) = *product* analytics (how users use the app, funnels,
  feature flags). This module = *business* analytics (revenue, ops, growth). Different audiences, both kept.
- **Performance & isolation:** all multi-tenant analytics enforce **tenant RLS**; pre-aggregation + caching
  (Valkey) for instant dashboards; scheduled rollups for heavy metrics.
- **Access control:** insights are role-gated (owner/manager see business KPIs; branch managers see their
  branch).

---

## 5. Phasing
- **MVP:** operational dashboard (registrations, samples, TAT, pending) — [features.md](features.md) §17.1.
- **V1:** full revenue/referral/geography/test-performance/finance dashboards, scheduled digests, alerts, the
  **Lab owner app** view, exports.
- **V2:** anomaly detection at scale, predictive forecasting, self-serve custom report builder, ClickHouse if
  warranted.
