# ADR-001: Authentication

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture
**Related:** [tech-stack.md](../tech-stack.md), [technical-architecture.md](../technical-architecture.md) §7,
[security-hardening.md](../security-hardening.md)

---

## Context
DiagDesk is a multi-tenant, India-resident (DPDP/CERT-In), offline-first healthcare platform with several very
different user types — lab staff/admins (handle PHI + money daily), patients (phone-first, occasional), and
referring doctors / B2B partners. We need authentication that is secure, India-resident, works at the lab
counter during internet outages, and is low-friction for patients.

## Decision

### 1. Identity provider — **Keycloak (self-hosted)**
- Self-hosted on the India K8s cluster → identity data stays **India-resident** with no hyperscaler/SaaS-IdP
  dependency (Auth0/Cognito are excluded — they run on excluded clouds).
- Protocols: **OpenID Connect / OAuth 2.0**.

### 2. Flows per client
- **Web (counter/admin/patient/doctor portals):** OIDC **Authorization Code + PKCE** (no browser secrets).
- **Mobile apps:** Authorization Code + PKCE (native).
- **Service-to-service:** **mTLS** (Linkerd) + OAuth2 **client-credentials**.
- **Public / B2B APIs:** OAuth2 client-credentials / API keys with per-key quotas.

### 3. Tokens & session
- Short-lived **JWT access tokens** + **rotating refresh tokens**.
- **Kong (gateway) validates the JWT** at the edge and propagates verified `tenant_id` / `branch_id` / role
  claims to services.

### 4. Multi-tenancy model
- **Single shared Keycloak realm** with a **`tenant_id` claim** + groups/roles (scales to many SMB tenants far
  better than realm-per-tenant). Claims flow gateway → service → **Postgres RLS** as the final isolation layer.

### 5. OTP-based login — **Yes (email / SMS / WhatsApp)**
- Implemented via a **custom Keycloak Authenticator (SPI)** that delivers codes through **our existing
  Notification service** — so OTP reuses the same providers, no separate stack:
  - **Email OTP → Resend** (low cost; payload is just a code, no PHI).
  - **SMS OTP →** DLT-registered Indian provider (MSG91/Gupshup/Kaleyra).
  - **WhatsApp OTP →** BSP using **authentication-category templates** (copy-code).
- **Passwordless / magic-link** option for patients via email/phone.

### 6. Auth policy per user type (convenience for patients, strength for privileged users)
| User | Login | Rationale |
|---|---|---|
| **Patients** | **Phone OTP — WhatsApp-first, SMS fallback** (email OTP optional) | Phone-first, password-free, high conversion |
| **Doctors / B2B** | Phone or email OTP | Low-friction, occasional users |
| **Lab staff** | **Password / Email-OTP** + a second factor: **Authenticator-app (TOTP)** or **biometric** (passkeys) | Handle PHI **and** money daily |
| **Admin / owner** | **Passkeys (biometric) or password + TOTP**, MFA enforced | Highest privilege |
- **Rationale for the split:** SMS/WhatsApp OTP is vulnerable to **SIM-swap/interception** — acceptable for
  patient convenience, **not** as the sole factor for staff/admin. ABHA-based login added for patients in V2.

### 6a. Staff biometric login (stakeholder #21)
- **Device biometric via passkeys/WebAuthn [MVP]:** fingerprint/face unlock on the staff workstation/phone —
  standards-based, phishing-resistant, no extra hardware; satisfies the "biometric login" ask and doubles as MFA.
- **Email-OTP for staff [MVP]:** a low-friction factor (via Resend, code-only, no PHI) for staff without a
  registered passkey/TOTP yet, or as a fallback.
- **Hardware fingerprint scanners [V1]:** many Indian labs use USB fingerprint devices at the counter. Planned as
  a device-integration workstream that enrols a biometric template (stored as sensitive personal data under DPDP —
  explicit consent + encrypted, never leaves India) and maps it to the user's passkey/credential. Biometric data
  is **never** a sole factor for money operations without a second factor.

### 7. Authentication vs authorization (kept separate — defense in depth)
- Keycloak = **authN** (who you are). **AuthZ** = **RBAC roles + OPA/ABAC policies + Postgres RLS** — a bug in
  one layer doesn't leak cross-tenant data.

### 8. Offline-first auth at the lab counter
- The branch edge node **caches Keycloak's JWKS** to **validate JWT signatures locally** during outages.
- Supports a **longer-lived edge session** so staff aren't locked out mid-outage.
- **Revocations/role changes reconcile on reconnect** (a revoked user is cut off once the link returns).

### 9. Abuse hardening (full detail in [security-hardening.md](../security-hardening.md))
- OTP/login: strict per-phone/email/IP/device limits, exponential backoff, **CAPTCHA on risk**, OTP expiry +
  single-use + attempt lockout, **cost caps** to prevent OTP send-bombing, anti-enumeration responses.
- Keycloak brute-force detection; Kong rate limiting; WAF/bot protection at the edge.

## Consequences
- **Positive:** India-resident, standards-based, one IdP for all clients; patient-friendly passwordless;
  strong privileged-user auth; OTP reuses notification infra; works offline.
- **Costs/risks:** custom Authenticator SPI to build & maintain; OTP messaging has per-send cost (mitigated by
  caps + WhatsApp templates); self-hosting Keycloak is platform-team responsibility (HA, upgrades, backups).
- **Revisit if:** a managed India-resident IdP emerges, or passkeys mature enough to replace OTP for patients.
