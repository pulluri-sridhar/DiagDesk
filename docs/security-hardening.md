# DiagDesk — Security Hardening & Abuse Prevention

*How we defend against DDoS, rate-abuse, credential attacks, bots, and nuisance traffic — in depth, layered.
Complements the platform security in [technical-architecture.md](technical-architecture.md) §7 and the
security testing in [testing-strategy.md](testing-strategy.md).*

> Principle: **defense in depth.** No single control is trusted; an attacker must defeat layers at the edge,
> the gateway, the app, and the data tier. Everything is India-resident (DPDP/CERT-In).

---

## 1. Layered defense overview

| Layer | Threat it stops | Control |
|---|---|---|
| **Edge / CDN + WAF** | Volumetric DDoS, OWASP Top-10, bad bots, geo/IP abuse | **Indusface AppTrana** (India-based managed WAF+DDoS+bot) — or Cloudflare; plus the chosen provider's own anti-DDoS scrubbing |
| **API Gateway (Kong)** | Request floods, oversized payloads, scraping | **Rate limiting** (per IP / user / tenant / endpoint), request-size limits, IP allow/deny, ACLs, schema validation |
| **Auth (Keycloak)** | Brute force, credential stuffing, OTP abuse | Brute-force lockout, OTP throttling + backoff, CAPTCHA on risk, passwordless/passkeys for staff |
| **Application services** | Logic abuse, injection, IDOR, noisy-neighbor | Input validation, parameterized queries, idempotency, **per-tenant quotas**, output encoding |
| **Data tier (Postgres)** | Cross-tenant access | **Row-Level Security** + least-privilege roles |
| **Observability** | Slow/低-and-slow attacks, anomalies | Rate-limit metrics, anomaly alerts, automated blocking |

---

## 2. Rate limiting (the core of nuisance/abuse control)

Enforced primarily at **Kong**, backed by **Redis/Valkey** counters (sliding window), at multiple scopes so one
abuser can't degrade others:

- **Per IP** — blunt protection against floods and scrapers.
- **Per authenticated user** — stops a single account hammering APIs.
- **Per tenant** — **noisy-neighbor protection**: one lab's traffic can't starve another (fairness in a
  multi-tenant system).
- **Per endpoint / sensitivity tier** — tight limits on expensive or sensitive routes (login, OTP, search,
  report generation, exports); generous limits on cheap reads.
- **Per API key (B2B/public APIs)** — plan-based **quotas** (req/min, req/day) tied to the partner's tier.
- **Burst vs sustained** — token-bucket allowing short bursts but capping sustained rates.
- **Responses:** `429 Too Many Requests` with `Retry-After`; progressive penalties (slow-down → temp block →
  longer block) for repeat offenders.

### OTP / login — special hardening (high-abuse surface, also a cost risk)
- Strict limits **per phone, per email, per IP, per device**; exponential backoff between resends.
- **CAPTCHA** (hCaptcha / reCAPTCHA) triggered on risk signals (many attempts, new device, datacenter IP).
- OTP **expiry (≈5 min)**, single-use, max verify attempts then lockout.
- **Cost guardrail:** OTP/SMS/WhatsApp cost money — caps + alerts prevent a "send-bomb" running up the bill.
- Anti-enumeration: identical responses whether or not an account exists.

---

## 3. DDoS protection
- **Volumetric (L3/L4):** absorbed by the **CSP's anti-DDoS** scrubbing + the **CDN/WAF edge** (AppTrana/
  Cloudflare) before traffic reaches our cluster.
- **Application (L7):** WAF rules + Kong rate limiting + bot management; autoscaling on K8s to absorb spikes;
  circuit breakers and load shedding so a flood degrades gracefully, not catastrophically.
- **Always-on** posture for the public surfaces (patient booking, login, report links); stricter for
  unauthenticated routes.

---

## 4. Bot & automation defense
- **Bot management** (AppTrana/Cloudflare) to separate humans from scrapers/credential-stuffers.
- CAPTCHA on signup, OTP, and public booking when risk is detected.
- Device fingerprinting + velocity checks on registration/booking to stop fake-account and spam-booking nuisance.
- Honeypot fields + behavioral signals on public forms.

---

## 5. Application & API hardening (OWASP-aligned)
- **OWASP ASVS** as the checklist; WAF covers OWASP Top-10 at the edge.
- Input validation at every boundary (Zod/DTO), parameterized queries (no string SQL), output encoding.
- **IDOR/authorization** tests: object-level checks + RLS so a user can't reach another's/another tenant's
  records by guessing IDs.
- Security headers (HSTS, CSP, X-Frame-Options), strict CORS, secure cookies, TLS 1.3, mTLS between services.
- Secrets in **Vault**; no secrets in code/images; signed images (cosign); dependency/secret scanning in CI.
- Idempotency keys + replay protection on state-changing endpoints.

---

## 6. Detection, response & assurance
- **Real-time monitoring:** rate-limit hit metrics, 4xx/5xx spikes, auth-failure spikes, geo anomalies →
  Grafana alerts → auto-block / on-call.
- **Audit trail** (hash-chained) for forensic review; access logging on PHI.
- **CERT-In compliance:** 180-day in-India logs, **6-hour incident reporting** runbook.
- **VAPT (pen testing)** by a CERT-In-empanelled auditor before launch and periodically — also satisfies the
  **WASA** security audit required for ABDM (V2).
- **Bug-bounty / responsible-disclosure** program once the product is public (later phase).
- Incident-response playbooks (DDoS, account takeover, data breach) rehearsed.

---

## 7. What ships when
- **MVP:** Kong rate limiting (IP/user/tenant/endpoint), OTP/login hardening, WAF + CSP anti-DDoS at the edge,
  security headers, RLS, secrets in Vault, audit + CERT-In logging, CI security scans.
- **V1:** bot management, per-API-key quotas (B2B/public APIs), anomaly-based auto-blocking, first VAPT.
- **V2:** ABDM WASA audit, bug-bounty program, advanced behavioral/risk-based auth.
