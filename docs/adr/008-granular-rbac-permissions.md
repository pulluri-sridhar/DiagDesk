# ADR-008: Granular, Owner-Defined RBAC Permissions

**Status:** Accepted · **Date:** 2026-06 · **Deciders:** Architecture + Product
**Related:** [rbac-permissions.md](../rbac-permissions.md), [authentication.md](authentication.md) (ADR-001),
[technical-architecture.md](../technical-architecture.md) §7, [design/data-model.md](../design/data-model.md)
**Source:** stakeholder call 2026-06-28 (#6) — [stakeholder-call-2026-06-28.md](../stakeholder-call-2026-06-28.md)

---

## Context
The diagnostic-center owner runs a small, multi-role team (receptionist-cashier, technician, pathologist,
accountant, manager) and wants to decide **exactly which features each user can access when creating the
account** — mirroring their legacy "User Acc.Details" screen, which exposed dozens of per-feature toggles
(discount limits, test-name/rate editing, which financial reports are visible, back-dating registrations, report
export, etc.). Our existing model (ADR-001) had **roles with a `permissions jsonb`** but no formalized,
owner-facing **per-feature permission catalogue** or **per-user overrides**. We need that granularity without
abandoning the layered, defense-in-depth authorization (roles + OPA/ABAC + Postgres RLS).

## Decision
Adopt a **catalogue-driven, owner-configurable permission model** layered as:

1. **User type** (`app_user.user_type`: `non_financial` / `financial` / `admin` / `owner`) — a coarse baseline.
2. **Roles** (branch-scoped via `user_role`) — named bundles of permissions.
3. **Permission catalogue** (`permission`) — stable feature keys (e.g. `discount.apply`, `master.test.edit_rate`,
   `finance.reports.money_collections`, `report.format_edit_after_print`, `registration.edit_date`), some
   **valued** (e.g. `discount.limit_pct`, `finance.reports.view_days`).
4. **Grants & overrides** — `role_permission` (per role) + `user_permission` (per-user grant/revoke + optional
   value). The owner toggles these at user creation; effective set = role grants unioned, then user overrides
   applied.
5. **OPA/ABAC** for contextual rules (e.g. approver ≠ requester) and **Postgres RLS** as the final tenant/branch
   isolation layer.

Effective permissions are carried in verified JWT/role claims (validated at the Kong gateway) and **re-enforced
at the database** by RLS. All permission changes are **audit-logged** and take effect immediately (reconciled at
the edge on reconnect). The full catalogue lives in [rbac-permissions.md](../rbac-permissions.md).

**Compliance note:** the legacy "Allow Referral **Payment** Reports" toggle is **deliberately not** reproduced;
referral money is handled only through compliant channels (ADR-007 / ADR-010). A `finance.reports.referral_activity`
permission exposes referral **analytics** (no payout) only.

## Consequences
- **Positive:** matches how owners actually think about access; least-privilege by default; a single catalogue
  keeps UI, API, and policy in sync; no loss of the RLS/OPA safety net.
- **Costs/risks:** a larger permission surface to test; must guard against permission sprawl (keep the catalogue
  curated and documented); owner UX must make sensible role defaults so most users need zero per-flag tweaking.
- **Revisit if:** the catalogue grows unwieldy (consider permission groups/presets) or a customer needs
  attribute-based rules beyond what OPA policies cover.
