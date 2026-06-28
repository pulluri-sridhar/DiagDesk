# DiagDesk — Scalability & Data-at-Scale Design

*How the data tier handles **millions of records and a high transaction rate per minute** with low latency.
Companion to [data-model.md](data-model.md), [HLD.md](HLD.md), [technical-architecture.md](../technical-architecture.md).*

> **Framing (honest):** "millions of transactions/minute" ≈ **tens of thousands of writes/second** — that is
> hyperscale. The design below **scales horizontally to that ceiling**; you provision to *actual* load and add
> nodes as you grow. Nothing here is a single-box bottleneck. (For context, even a 5,000-lab network at heavy
> load is far below this — so this gives generous headroom.)

---

## 1. Principles
1. **Scale by partitioning the problem, not buying a bigger box.** Domain (db-per-service) × tenant (sharding)
   × time (table partitioning) — three independent axes of horizontal scale.
2. **Keep OLTP transactions tiny and hot-path-only.** Everything non-critical (audit, analytics, notifications)
   is **async via Kafka** — the OLTP write is never blocked by downstream work.
3. **Separate reads from writes.** Replicas + CQRS read models + a columnar store keep heavy queries off OLTP.
4. **Edge-first absorbs spikes.** Branch writes are local and **batch-synced**, smoothing cloud write bursts.

---

## 2. Write path — high throughput, low latency
- **Database-per-service** already spreads write load by domain; the hottest services (Order, Result, Billing,
  Notification, Audit) scale independently and can each own a distributed cluster.
- **Horizontal sharding with Citus (distributed PostgreSQL):** distribution column = **`tenant_id`**, so each
  tenant's rows **co-locate on one shard** (joins stay local, no cross-shard fan-out on the hot path). Writes
  and reads spread across many worker nodes; add nodes to add capacity. The largest tenants can be pinned to
  their own shard/DB without code change (RLS + `tenant_id` make this transparent).
- **Time-range partitioning** (declarative) on append-heavy tables — **monthly** RANGE partitions on
  `order`, `sample_event`, `result_value`, `report_delivery`, `payment`, `invoice_line`, `notification`,
  `audit_log`, `outbox_event`. Benefits: partition pruning (queries touch one/few partitions), small hot
  indexes, cheap archival (DETACH old partitions), no giant-table VACUUM.
- **Kafka as the ingestion buffer / queue-based load leveling:** spikes land in Kafka; consumers drain at a
  steady rate and **batch-insert** (multi-row / `COPY`) → far higher sustained write throughput than row-by-row.
  Transactional **outbox** + **idempotent** consumers (dedup on `idempotency_key`/event id) keep it exactly-once
  in effect.
- **UUIDv7/ULID PKs** are **time-ordered** → near-append B-tree inserts (no index hot-spotting or page splits
  that random UUIDv4 causes), and edge-safe.
- **Short transactions, no hot rows:** counters/aggregates are derived in read models, not incremented on a
  shared OLTP row; sequences avoided in favor of client-side UUIDv7.

## 3. Read path — fast queries at scale
- **Read replicas** per cluster; the app routes read-only/reporting queries to replicas (primary handles writes).
- **CQRS read models / materialized projections** built from Kafka events serve dashboards and lists — heavy
  MIS queries **never hit OLTP**. Refreshed incrementally.
- **ClickHouse** (or Citus **columnar** storage) for analytics/BI at scale — time-series rollups (revenue, TAT,
  referral-source volume) over billions of rows in milliseconds, fed from the event stream. (See
  [analytics-insights.md](../analytics-insights.md).)
- **Redis/Valkey caching** for hot, read-mostly data: test catalog, rate cards, reference ranges, sessions,
  idempotency keys, and rate-limit counters — cuts OLTP read load dramatically.
- **OpenSearch** for patient/report/accession search — off the OLTP path.

## 4. Connections, pooling & indexing
- **PgBouncer (transaction pooling)** in front of every Postgres cluster — hundreds of service pods multiplex
  onto a small, bounded set of backend connections (Postgres degrades past a few hundred real connections).
- **Indexing discipline:** `tenant_id`-leading **composite** indexes (aligns with RLS + sharding + pruning);
  **partial indexes** for hot statuses (e.g., pending worklist); **BRIN** indexes on time-ordered partition
  columns (tiny, ideal for append tables); avoid over-indexing write-hot tables.
- **RLS overhead** is minimized by keeping `tenant_id` first in every index and setting it as a session GUC;
  for the very hottest tenants, a dedicated shard/DB removes even that.

## 5. Elasticity, backpressure & reliability
- **Autoscaling:** K8s HPA on services by CPU/Kafka-lag; Kafka consumer groups scale out to drain faster;
  read replicas scale with query load.
- **Backpressure:** queue-based load leveling (Kafka) + circuit breakers + per-tenant **rate limits** prevent a
  spike (or one noisy tenant) from degrading others.
- **Idempotency + DLQ** everywhere so retries under load are safe; poison messages park in a dead-letter queue.

## 6. Lifecycle — keep the hot set small
- **Hot** (recent months) on fast OLTP storage → **warm** (older partitions, possibly columnar) → **cold**
  (object storage / ClickHouse) for archival, honoring **DPDP retention**. Old partitions DETACH+archive in
  one cheap metadata op — no mass deletes.

## 7. Latency SLOs & how we hold them
| Path | Target | How |
|---|---|---|
| Counter register/bill (edge) | < 1s p95 | local-first write, no cloud round-trip on hot path |
| Cloud OLTP write | < 50ms p95 | sharded, partitioned, pooled, tiny txns, UUIDv7 |
| List/worklist read | < 100ms p95 | replicas + partial indexes + cache |
| MIS dashboard | < 500ms p95 | CQRS read models / ClickHouse, never OLTP |
| Async (audit/notify/analytics) | seconds, off hot path | Kafka, batched consumers |

Monitored via OpenTelemetry → Grafana: p95/p99 per endpoint, **replication lag**, **Kafka consumer lag**,
per-partition write rates, PgBouncer saturation, slow-query log — each with an SLO and alert.

## 8. Phasing (don't over-build on day one)
- **MVP:** single managed Postgres per service + **PgBouncer** + monthly partitioning + Redis cache + Kafka
  buffer + read replica for reporting. This alone serves a large, busy multi-branch network comfortably.
- **Scale-out (when metrics demand):** introduce **Citus** sharding by `tenant_id`, add worker nodes, stand up
  **ClickHouse** for analytics, add replicas. The schema (tenant_id everywhere, UUIDv7 PKs, partition keys) is
  **already shaped for this**, so scaling out is configuration + data redistribution — not a rewrite.

> **Net:** the data model is **sharding-ready (tenant_id), partition-ready (time keys), and replica/CQRS-ready
> (events)** from day one. We run it lean for MVP and scale horizontally to millions-of-txn/min territory by
> adding nodes — with no schema rewrite and no single bottleneck.
