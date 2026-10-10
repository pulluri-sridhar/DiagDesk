# DiagDesk — Architecture Diagram

*Synthesized from `technical-architecture.md` and `tech-stack.md`. Render with any Mermaid-capable viewer.*

---

## 1. System Context (C4 Level 1)

```mermaid
graph TB
  subgraph Actors["Actors"]
    LabStaff["Lab Staff / Counter"]
    Phleb["Phlebotomist"]
    Patient["Patient"]
    Doctor["Doctor / B2B Partner"]
    Admin["Owner / Admin"]
  end

  subgraph DiagDesk["DiagDesk Platform — India-region Managed Cloud"]
    CF["☁ Cloudflare\nWAF · DDoS · Bot Defense"]
    KONG["Kong API Gateway\nAuth · Rate-limit · Routing"]
    Platform["Microservices\n(Java/Spring Boot + Go)"]
    Edge["Branch Edge Nodes\n(k3s · offline-first)"]
  end

  subgraph External["External Systems"]
    Analyzers["Lab Analyzers\nHL7 / ASTM"]
    ABDM["ABDM / NHCX\n(Health ecosystem)"]
    Payments["Razorpay / PhonePe / UPI"]
    Comms["WhatsApp · SMS · Email"]
  end

  LabStaff -->|"PWA (offline-first)"| Edge
  Phleb -->|"Mobile App"| CF
  Patient -->|"Patient Portal / App"| CF
  Doctor -->|"B2B Portal / API"| CF
  Admin -->|"Admin Portal"| CF

  CF --> KONG
  KONG --> Platform
  Edge <-->|"sync when online"| Platform

  Analyzers -->|"HL7/ASTM sockets"| Edge
  Platform <-->|"FHIR R4 / NHCX"| ABDM
  Platform -->|"Payment API"| Payments
  Platform -->|"Delivery"| Comms
```

---

## 2. Container View — Microservices & Data Flow (C4 Level 2)

```mermaid
graph TB
  KONG["Kong API Gateway"]

  subgraph BFF["Backend for Frontend (BFFs)"]
    CBFF["Counter BFF"]
    PBFF["Patient BFF"]
    PHBFF["Phlebotomist BFF"]
    ABFF["Admin BFF"]
  end

  subgraph PlatformSvc["Platform / Cross-cutting Services"]
    IAM["Identity & Access\n(Keycloak OIDC · MFA · Passkeys)"]
    TEN["Tenant & Org\n(orgs · branches · entitlements)"]
    NOTI["Notification\n(WhatsApp · SMS · Email)"]
    AUD["Audit & Consent\n(DPDP · hash-chained log)"]
    SYNC_SVC["Sync Engine (Go)\n(branch ⇄ cloud reconciliation)"]
  end

  subgraph CoreLab["Core Lab Domain — MVP"]
    PAT["Patient (MPI)\n(registration · dedup)"]
    CAT["Catalog & Rate-Card\n(tests · panels · pricing · CGHS)"]
    ORD["Order & Workflow\n(orders · accessioning · barcode · TAT)"]
    RES["Result & Validation\n(capture · delta · critical checks)"]
    DEV["Device Gateway (Go)\n(HL7/ASTM analyzer sockets)"]
    REP["Reporting\n(PDF · digital signature · delivery)"]
    BIL["Billing & Invoicing\n(GST · cash · dues · payments)"]
  end

  subgraph V1Svc["V1 Services"]
    B2B["B2B & Partner Billing\n(rate contracts · credit ledger · outsourcing)"]
    QC["Quality & Compliance\n(NABL · L-J charts · Westgard · EQAS)"]
    INV["Inventory\n(reagents · expiry · reorder)"]
    BOOK["Booking & Home-Collection\n(scheduling · phlebotomist routing)"]
    MIS["MIS / Analytics\n(CQRS read models · dashboards)"]
  end

  subgraph V2Svc["V2 Services"]
    INTEROP["Interop — ABDM HIP\n(ABHA · FHIR · NHCX claims)"]
    RAD["Radiology RIS\n(modality worklist · PACS/DICOM)"]
  end

  BUS{{"Kafka / Redpanda\nEvent Backbone (AsyncAPI)"}}

  KONG --> BFF
  BFF --> PlatformSvc
  BFF --> CoreLab
  BFF --> V1Svc
  BFF --> V2Svc

  ORD -->|"OrderCreated"| BUS
  RES -->|"ResultValidated"| BUS
  BIL -->|"InvoiceCreated"| BUS
  SYNC_SVC -->|"SyncDelta"| BUS

  BUS -->|"ReportReady"| REP
  BUS --> NOTI
  BUS --> AUD
  BUS --> MIS
  BUS --> B2B
  BUS --> INTEROP

  DEV -->|"HL7 result"| RES
```

---

## 3. Branch Edge Node — Offline-First Architecture

```mermaid
graph LR
  subgraph Edge["Branch Edge Node  —  k3s (or Docker Compose)"]
    PWA["Counter PWA\n(React · Service Worker · IndexedDB / Dexie)"]
    LocalPG[("Local PostgreSQL\n(branch working set)")]
    SyncAgent["Sync Agent (Go)\n(CDC push/pull · LWW + domain rules)"]
    DevGW["Device Gateway (Go)\n(HL7/ASTM TCP sockets)"]
  end

  subgraph Cloud["Cloud — Managed K8s (India region)"]
    CloudSync["Sync Engine"]
    CloudSvc["Microservices"]
    CloudPG[("PostgreSQL cluster\n(per-service)")]
    Kafka{{"Kafka"}}
  end

  subgraph Lab["Lab Equipment"]
    Analyzer["Analyzers\n(Roche · Sysmex · Beckman…)"]
  end

  PWA -->|"local-first reads/writes"| LocalPG
  DevGW -->|"parsed results"| LocalPG
  Analyzer -->|"HL7 / ASTM"| DevGW
  LocalPG -->|"CDC change log"| SyncAgent

  SyncAgent <-->|"push changes / pull deltas\n(when online)"| CloudSync
  CloudSync --> Kafka
  Kafka --> CloudSvc
  CloudSvc --> CloudPG
```

---

## 4. Request Flow — Order → Report → Delivery (Sequence)

```mermaid
sequenceDiagram
  participant C as Counter (Edge PWA)
  participant ORD as Order & Workflow
  participant DEV as Device Gateway
  participant RES as Result & Validation
  participant REP as Reporting
  participant NOTI as Notification

  C->>ORD: Create order + accession (barcode)
  ORD-->>RES: OrderCreated (Kafka event)
  DEV->>RES: Analyzer result (HL7) for accession
  RES->>RES: Validate (delta / critical rules)
  RES-->>REP: ResultValidated (Kafka event)
  REP->>REP: Render PDF + digital signature
  REP-->>NOTI: ReportReady (Kafka event)
  NOTI->>NOTI: Deliver via WhatsApp / SMS / Email
```

---

## 5. Security & Traffic Layers

```mermaid
graph TB
  Internet["Internet / B2B Partners / Mobile Apps"]

  CF["Cloudflare\nWAF · DDoS · Bot defense"]

  KONG["Kong Gateway  (north-south)\nOIDC token validation · Rate-limit per tenant/user/endpoint\nAPI keys · B2B routing · WAF plugin"]

  ISTIO["Istio Service Mesh  (east-west)\nmTLS between every service · Circuit breaking\nRetries · Traffic shifting · Observability"]

  subgraph Services["Microservices"]
    SVC["Java/Spring Boot services\n+ Go edge services"]
  end

  OPA["OPA — ABAC policies\n(externalized fine-grained AuthZ)"]
  RLS["PostgreSQL RLS\n(tenant_id row-level isolation — last line of defense)"]
  VAULT["HashiCorp Vault\nDynamic secrets · PHI column encryption (Tink/pgcrypto)"]
  KEYCLOAK["Keycloak (OIDC)\nAuthN · short-lived JWT · MFA · Passkeys"]

  Internet --> CF --> KONG
  KONG -->|"verified tenant/user claims"| ISTIO
  ISTIO --> Services
  Services --> OPA
  Services --> RLS
  Services --> VAULT
  KONG --> KEYCLOAK
```

---

## 6. Observability Stack

```mermaid
graph LR
  subgraph Services["All Microservices + Edge Nodes"]
    OTEL_SDK["OpenTelemetry SDK\n(traces · metrics · logs)"]
  end

  COLLECTOR["OTel Collector"]

  subgraph LGTM["Grafana LGTM Stack  (self-hosted, India)"]
    MIMIR["Mimir / Prometheus\n(metrics · RED · USE · business KPIs)"]
    LOKI["Loki\n(structured JSON logs · PII-scrubbed)"]
    TEMPO["Tempo\n(distributed traces · correlation IDs)"]
    GRAFANA["Grafana\n(dashboards · SLOs · error budgets)"]
    ALERT["Alertmanager / Grafana OnCall"]
  end

  SENTRY["Sentry (self-hosted)\n(exceptions · release health)"]
  POSTHOG["PostHog (self-hosted)\n(funnels · feature flags · session insights)"]

  OTEL_SDK --> COLLECTOR
  COLLECTOR --> MIMIR & LOKI & TEMPO
  MIMIR & LOKI & TEMPO --> GRAFANA
  GRAFANA --> ALERT
  OTEL_SDK --> SENTRY
  OTEL_SDK --> POSTHOG
```

---

## 7. Infrastructure & Delivery

```mermaid
graph TB
  subgraph Repo["Nx Monorepo (GitHub)"]
    CODE["Java services · Go services · TypeScript FE/Mobile\nShared OpenAPI / AsyncAPI / Proto contracts\nService template (OTel · Keycloak · RLS · outbox · OPA · health)"]
  end

  subgraph CI["CI — GitHub Actions"]
    BUILD["Build · Unit · Integration\n(Testcontainers — real Postgres/Kafka)"]
    SCAN["Semgrep (SAST) · OWASP ZAP (DAST)\nTrivy (images/deps) · gitleaks · Syft (SBOM)\ncosign image signing · Pact contract tests"]
    DEPLOY["Build & push signed image\nArgoCD sync"]
  end

  subgraph Cloud["India-region Managed Cloud  (DigitalOcean BLR1 → AWS Mumbai / E2E)"]
    K8S["Managed Kubernetes\n(DOKS / EKS / AKS / E2E)"]
    PGSVC["Managed PostgreSQL (per service)\n+ RLS + PITR"]
    REDIS_C["Managed Redis / Valkey\n(cache · sessions)"]
    S3["S3-compatible Object Storage\n(report PDFs · DICOM · documents)"]
    KAFKA_C["Kafka / Redpanda\n(managed or self-hosted on K8s)"]
    SEARCH["OpenSearch\n(patient · catalog · test search)"]
    SELFHOST["Self-hosted on K8s:\nKeycloak · Vault · Grafana LGTM · Sentry · PostHog"]
  end

  subgraph EdgeDeploy["Branch Edge Nodes"]
    K3S["k3s + Docker Compose\nCounter PWA · Sync Agent · Device Gateway\nLocal PostgreSQL · MinIO"]
  end

  Repo --> CI
  CI --> Cloud
  CI --> EdgeDeploy
  CODE -->|"Terraform (IaC)"| Cloud
  CODE -->|"ArgoCD (GitOps)"| Cloud
```

---

## 8. Phase Build Order

| Phase | Timeframe | What ships |
|---|---|---|
| **Foundation** | Pre-MVP | Nx monorepo · service template · Kong · Keycloak · Vault · Postgres+RLS · Kafka · OTel→Grafana · CI/CD with security scans · Edge node + Sync Engine skeleton |
| **MVP** | 0–4 months | Identity · Tenant · Patient MPI · Catalog/Rate-Card · Order/Workflow · Result · Device Gateway · Reporting · Billing · Notification · Audit/Consent — all offline-capable |
| **V1** | 4–8 months | B2B & Partner Billing · Quality & Compliance · Inventory · Booking & Home-Collection · MIS/Analytics |
| **V2** | 8–14 months | Interop (ABDM HIP/FHIR/NHCX) · Radiology RIS + PACS/DICOM |
| **V3** | North star | MediCircle — five-sided platform (Doctors · Pharmacies · Home-Care · Patients + DiagDesk lab node) |
