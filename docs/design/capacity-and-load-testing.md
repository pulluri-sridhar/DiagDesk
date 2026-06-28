# DiagDesk — Capacity Planning & Load-Testing Plan

*How we size the platform per throughput tier and prove it with k6. Companion to
[scalability-and-data-at-scale.md](scalability-and-data-at-scale.md), [HLD.md](HLD.md).*

> All numbers are **engineering estimates to size and test against**, not guarantees — validate with the k6
> profiles below and re-tune from real metrics. Load uses the **compliant** endpoints (B2B billing; no
> commission/payout paths exist).

---

## 1. Workload model (defensible, bottom-up)

**Per *busy active lab* per day** (≈200 patients, ~3 tests each):

| Operation | Rows/day | Notes |
|---|---|---|
| registrations (`patient`/`consent`) | ~200 | + returning lookups |
| orders + items | 200 + 600 | ~3 tests/order |
| samples + sample_events | 250 + ~1,000 | ~4 lifecycle transitions each |
| results + result_values | 600 + ~3,000 | ~5 analytes/result |
| validations | 600 | tech + pathologist |
| reports + deliveries | 200 + ~400 | ~2 channels each |
| invoices + lines + payments | 200 + 600 + 220 | cash/UPI/partial + B2B |
| notifications | ~1,000 | status + report links |
| audit_log + outbox_event | ~8,000 | every mutation, hash-chained + events |
| **Total write rows/lab/day** | **≈ 17,000** | |

**Peak concentration:** ~8 active hours with a morning peak (~28% of the day in the peak hour) →

> **Peak write rate ≈ (17,000 × 0.28) / 3,600 ≈ 1.3 writes/sec per lab.**
> **Reads ≈ 5× writes** (worklists, lookups, dashboards). **Events/sec ≈ writes** (outbox).

So the platform's **peak write TPS ≈ 1.3 × (number of active labs)**:

| Active labs | Peak write TPS | Peak **writes/min** | Write rows/day |
|---|---|---|---|
| 100 | ~130 | ~8k | ~1.7M |
| 1,000 | ~1,300 | ~78k | ~17M |
| 5,000 | ~6,600 | ~400k | ~85M |
| **~13,000** | **~17,000** | **~1.0M/min** | ~220M |
| **~25,000** | **~33,000** | **~2.0M/min** | ~430M |

→ **"Millions of transactions per minute" ≈ a 13k–25k busy-lab network.** The tiers below scale to it.

---

## 2. Throughput tiers & provisioning ladder

Capacity assumptions (conservative, with **≤60% CPU / ≤70% pool** headroom): a tuned Postgres/Citus worker
sustains **~3–6k simple writes/sec** when fed by **batched Kafka consumers** (multi-row `COPY`); a read replica
serves **~10–20k reads/sec**; one Kafka broker partition handles **~10–50k msg/sec**.

| Tier | Labs / peak write TPS | App replicas (hot svcs) | PostgreSQL / Citus | Read replicas | PgBouncer | Kafka | Redis | ClickHouse |
|---|---|---|---|---|---|---|---|---|
| **T1 Pilot** *(= MVP lean)* | ≤100 · ~150 TPS | 2–3 per svc | 1 managed PG / service (no sharding) | 1 (reporting) | 1 (txn pool) | 3 brokers · 6–12 part/topic | 1 (HA pair) | — (PG read models) |
| **T2 Growth** | ~1k · ~1.3k TPS | 3–5 | PG (vertical) **or** Citus 2–3 workers | 2 | 1–2 | 3–5 brokers · 24 part | 3-node | 1 node |
| **T3 Scale** | ~5k · ~6.6k TPS | 6–10 (HPA) | **Citus** coord + 4–8 workers | 2–3 per shard | per cluster | 6 brokers · 48–96 part | 3–6-node | 3 nodes |
| **T4 Hyperscale** | 13k–25k · 17k–33k TPS | autoscale 16–40+ | **Citus** 16–32 workers (regional sub-shards) | 3+/shard | per cluster | 12+ brokers · 192+ part | cluster | 6+ nodes |

**Mapping to phasing:** T1 = the MVP "run it lean" setup; T2–T4 = the **scale-out** path in
[scalability-and-data-at-scale.md](scalability-and-data-at-scale.md) — **no schema rewrite** (tenant_id shard
key, UUIDv7 PKs, monthly partitions already baked in). Promote a tier when the **breakpoint test** (below)
shows SLO erosion at ~70% of current capacity.

---

## 3. Sizing method (the math)
- **Concurrency (Little's Law):** `in-flight = arrival_rate × service_time`. e.g. 6,600 TPS × 8ms = ~53
  concurrent in-flight writes → trivially handled across replicas; the constraint is **DB connections**, not
  CPU.
- **Connections:** `client_conns = pods × per-pod_pool`; **PgBouncer (transaction mode)** funnels them to
  `backend_conns ≈ 2–4 × vCPU` of the DB. e.g. 300 pods × 5 = 1,500 client → ~150 backend. Never let raw
  connections hit Postgres.
- **Kafka partitions:** `≥ max(target_TPS / per_partition_TPS, desired_consumer_parallelism)`; size for the
  busiest topic (audit/outbox) and round up for rebalancing headroom.
- **Storage:** `rows/day × avg_row_bytes × replication` → size monthly partitions; **DETACH+archive** beyond
  the DPDP-retention hot window to keep the hot set small.
- **Headroom:** provision so steady-state sits at **≤60% CPU** and replica/Kafka lag ≈ 0; that buffer absorbs
  spikes before autoscaling reacts.

---

## 4. k6 load-test profiles

Run against **staging** (a scaled-down but architecturally identical env). Six profiles:

| Profile | Shape | Purpose | Key thresholds |
|---|---|---|---|
| **Smoke** | 1–5 VUs, 1 min | sanity / correctness | errors 0, checks 100% |
| **Load** | ramp → target VUs, hold 20–30 min | meet SLOs at expected peak | p95 within SLO, errors <1% |
| **Stress** | ramp past target (1.5–2×) | find the knee | graceful degradation, no errors-storm |
| **Soak** | target, 2–8 h | leaks, partition bloat, replica lag | stable p95, flat memory, lag≈0 |
| **Spike** | 1× → 10× in seconds | autoscaling + backpressure | recovers < 2 min, no data loss |
| **Breakpoint** | ramp until SLO breaks | the capacity number → next tier | record TPS at first SLO breach |

**SLO thresholds (tied to HLD NFRs):**
- Counter ops (edge-equivalent) **p95 < 1s**; cloud OLTP write **p95 < 50ms, p99 < 150ms**; list/worklist
  **p95 < 100ms**; MIS dashboard **p95 < 500ms**; `http_req_failed < 1%`; `checks > 99%`.

**Example k6 — the walk-in journey** (`tests/load/walkin.js`):
```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
const BASE = __ENV.BASE_URL, TOKEN = __ENV.TOKEN;
const H = { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json',
                       'Idempotency-Key': () => crypto.randomUUID() } };
export const options = {
  scenarios: { load: { executor: 'ramping-vus', startVUs: 0,
    stages: [ {duration:'3m',target:200}, {duration:'20m',target:200}, {duration:'3m',target:0} ] } },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration{name:register}': ['p(95)<300'],
    'http_req_duration{name:invoice}':  ['p(95)<50','p(99)<150'],
    'http_req_duration{name:report}':   ['p(95)<100'],
    'checks': ['rate>0.99'],
  },
};
export default function () {
  group('walk-in', () => {
    const p = http.post(`${BASE}/v1/patients`, JSON.stringify(rndPatient()), {...H, tags:{name:'register'}});
    check(p, { 'registered': r => r.status===201 });
    const o = http.post(`${BASE}/v1/orders`, JSON.stringify(rndOrder(p.json('id'))), {...H, tags:{name:'order'}});
    http.post(`${BASE}/v1/invoices`, JSON.stringify(rndInvoice(o.json('id'))), {...H, tags:{name:'invoice'}});
    http.post(`${BASE}/v1/results`, JSON.stringify(rndResult(o.json('id'))), {...H, tags:{name:'result'}});
    http.get(`${BASE}/v1/reports/${o.json('id')}`, {...H, tags:{name:'report'}});
  });
  sleep(Math.random()*2 + 1); // think-time
}
```
- **Async / Kafka-lag test:** drive ingestion at target TPS, assert **consumer lag returns to ~0** within an
  SLO window and audit/read-model rows reconcile (no loss).
- **Offline-sync chaos:** the **Toxiproxy** harness ([testing-strategy.md](../testing-strategy.md) §4) — write
  at the edge under partition, reconnect, assert convergence + money-record reconciliation under load.

---

## 5. Pass/fail gates & CI
- **Gates** = the SLO thresholds above; a profile **fails CI** if any threshold breaches.
- **Nightly** Load + (weekly) Soak in **GitHub Actions** against staging; **Breakpoint** run before each tier
  promotion. Spike run before big campaigns/seasonal peaks.
- **Watch during runs:** p95/p99 per endpoint, `http_req_failed`, **DB CPU & replication lag**, **Kafka
  consumer lag**, **PgBouncer** wait/saturation, per-partition write rate, GC/heap (services). All already in
  OpenTelemetry → Grafana.
- **Reading a breakpoint:** the TPS at first SLO breach × 0.7 = safe operating ceiling for the current tier →
  if forecast load exceeds it, **promote to the next tier** (add Citus workers / replicas / Kafka partitions
  per the ladder) and re-run.

> **Bottom line:** sized bottom-up (op-mix → TPS → nodes), the ladder scales from a lean MVP to a ~25k-lab,
> ~2M-txn/min network by **adding nodes along axes the schema already supports** — and the k6 profiles prove
> each tier holds its latency SLOs before customers ever feel it.
