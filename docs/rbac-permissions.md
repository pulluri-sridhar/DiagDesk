# DiagDesk — RBAC & Granular Permissions

*How the lab **owner** decides exactly what each user can see and do — set at user-creation time and editable
later. Formalizes the granular permission model the stakeholder showed us in their legacy "User Acc.Details"
screen, mapped onto DiagDesk's layered authorization (RBAC roles + per-feature permissions + OPA/ABAC +
Postgres RLS). Companion to [adr/008-granular-rbac-permissions.md](adr/008-granular-rbac-permissions.md) and
[adr/authentication.md](adr/authentication.md).*

---

## 1. Model overview

Authorization is **layered, defense-in-depth** (no single layer is trusted alone):

1. **User type** — a coarse band on `app_user` (`non_financial` / `financial` / `admin` / `owner`) that sets a
   sensible permission baseline.
2. **Role** — a named bundle of permissions (e.g. *Receptionist, Technician, Pathologist, Accountant, Manager*),
   **branch-scoped** via `user_role`.
3. **Per-feature permissions** — fine-grained boolean/valued flags from a **permission catalogue**; granted to a
   role (`role_permission`) and/or overridden per user (`user_permission`). **This is what the owner toggles when
   creating an account.**
4. **OPA/ABAC** — externalized policy for contextual rules (e.g. "approver must differ from requester").
5. **Postgres RLS** — the final tenant/branch isolation layer keyed on the verified JWT claims.

> Effective permission = role grants **unioned** then user-level overrides applied (an override can **grant** or
> **revoke**). All permission changes are **audit-logged** and take effect immediately (reconciled at the edge on
> reconnect).

---

## 2. User types (baseline bands)

| Type | Baseline | Typical holder |
|---|---|---|
| **Non-Financial** | Operational features (registration, samples, results, reports) but **no money/financial reports** | Technician, data-entry |
| **Financial** | Operational **plus** billing, collections, financial reports (bounded by the flags below) | Receptionist-cum-cashier, accountant |
| **Admin** | Manage master data + users + most features; no ownership-only controls | Branch manager |
| **Owner** | Everything, including creating users and assigning the permissions below | Lab owner / director |

---

## 3. Permission catalogue

Each entry is a stable `key` (stored in the `permission` catalogue) the owner can grant per role or per user.
Grouped by area. Valued permissions (e.g. a limit) carry a numeric/text parameter on `user_permission`.

### Registration & discounts
| Key | Type | Effect |
|---|---|---|
| `registration.create` | bool | Register patients / create orders |
| `registration.edit_date` | bool | *Allow Date Changing in Registration* — back-date a registration (sensitive) |
| `registration.edit_referral_name` | bool | *Allow Referral-name Editing in Registration* |
| `discount.apply` | bool | Apply a discount at registration/billing |
| `discount.limit_pct` | value | *Use Discount Limit / Disc Limit %* — max discount this user may apply without approval |
| `discount.post_after_bill` | bool | *Allow Post Discount* — discount after the invoice is raised |
| `discount.approve` | bool | Approve above-limit discounts (the approver) |

> Every discount requires a **mandatory free-text justification** (#8) regardless of limit; above-limit
> discounts additionally require a `discount.approve` holder. Both are audit-logged.

### Masters & catalogue
| Key | Type | Effect |
|---|---|---|
| `master.test.manage` | bool | Add/edit tests (incl. picking from NABL catalogue, creating custom tests) |
| `master.test.edit_name` | bool | *Allow Test-name Changing* |
| `master.test.edit_rate` | bool | *Allow Test-rate Changing* |
| `master.department.manage` | bool | Manage departments/sections |
| `master.doctor.manage` | bool | Manage referring doctors |
| `master.partner.manage` | bool | Manage B2B partners / accounts |
| `master.package.manage` | bool | Create/edit health packages |

### Reports (clinical)
| Key | Type | Effect |
|---|---|---|
| `report.validate` | bool | Technical validation |
| `report.signoff` | bool | Pathologist/owner sign-off + digital signature |
| `report.print` | bool | Print reports |
| `report.deliver` | bool | Send report (WhatsApp/SMS/email — manual) |
| `report.handover` | bool | Mark/scan report handed to patient |
| `report.format_edit_after_print` | bool | *Allow Standard/Word/Crystal Report Format Editing After Printing* |
| `report.reprint_due_patients` | bool | *Allow Printing Reports For Due (unpaid) Patients* |
| `report.stationery.manage` | bool | Edit saved letterhead/stationery |

### Financial reports & collections
| Key | Type | Effect |
|---|---|---|
| `finance.reports.master` | bool | *Allow Master Reports* |
| `finance.reports.money_collections` | bool | *Allow Money Collections Reports* |
| `finance.reports.today_user_collection` | bool | *Allow Today User Collection* |
| `finance.reports.today_bill_register` | bool | *Allow Today Bill Register* |
| `finance.reports.expenses` | bool | *Allow Expenses Reports* |
| `finance.reports.referral_activity` | bool | Referral **activity** statements (compliant — volume/revenue *generated*, **no payout**) |
| `finance.reports.only` | bool | *Allow Financial Reports Only* — restrict the user to financial reporting |
| `finance.reports.view_days` | value | *View Financial Reports upto N Days* — caps how far back this user can query |
| `finance.export` | bool | *Allow Crystal/CSV Reports Exporting* |

### Operations & admin
| Key | Type | Effect |
|---|---|---|
| `expense.entry` | bool | Record day-to-day expenses |
| `inventory.manage` | bool | Stock receipt/issue/consumption, kits, thresholds |
| `loyalty.edit` | bool | *Allow LoyaltyCards Details Editing in Registration* (loyalty = V1) |
| `users.manage` | bool | Create users + assign permissions (owner/admin) |
| `audit.view` | bool | View audit trail |

> The legacy "Allow **Referral Payment** Reports" toggle is **intentionally not** reproduced. Referral money is
> handled only through the compliant channels (`finance.reports.referral_activity` for analytics; B2B billing
> and professional-service contracts for any legitimate payment) — see
> [adr/010-compliant-referral-economics.md](adr/010-compliant-referral-economics.md).

---

## 4. Owner-driven account creation (the #6 workflow)
When the owner creates a user they: pick a **user type** → pick one or more **roles** → optionally **toggle/limit
individual permissions** above (grants or revokes) → set valued limits (`discount.limit_pct`,
`finance.reports.view_days`) → assign **branch scope**. The resulting effective permission set is materialised
into the user's JWT/role claims (validated at the gateway) and enforced again at the DB by RLS. Any later change
is immediate and audit-logged.

---

## 5. Schema (see [design/data-model.md](design/data-model.md))
- `permission` — catalogue (`key`, `label`, `category`, `value_type`).
- `role` — `permissions jsonb` baseline; `role_permission` — explicit grants per role.
- `user_permission` — per-user override (`grant`/`revoke` + optional `value`).
- `app_user` — adds `user_type`, `view_financial_reports_days`, `discount_limit_pct`.

All tenant-scoped, RLS-enforced, UUIDv7 PKs, audit-logged — consistent with the platform conventions.
