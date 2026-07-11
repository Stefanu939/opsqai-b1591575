# 4. Authorization

## Model

- Roles are stored in `user_roles(user_id, role)` — never on `profiles`, never in JWT claims, never in localStorage.
- Role checks use the `has_role(_user_id, _role)` security-definer function; RLS policies call it, never a subquery on `user_roles` directly (would recurse).
- Client-side role display is presentational only; every real check runs server-side.

## Role inventory

| Role | Scope | Notes |
|---|---|---|
| `platform_admin` | Full admin of an install; on the MC, also license issuance | Highest privilege |
| `admin` | Departmental admin, all operational modules | |
| `manager` | Manage own department | |
| `member` | Regular end-user | |
| `guest` | Read-only, module-scoped | |

## Privileged server-function surface

The following server functions require `requireSupabaseAuth` + `has_role(auth.uid(), 'platform_admin')`, and every one is covered by a negative-path test asserting a non-admin receives `403`:

- `issueLicense`, `revokeLicense`, `importLicenseBundle`
- `transferInstallation`
- `generateBreakGlass`, `redeemBreakGlass`, `exitRecoveryMode`
- `issueBootstrapToken`, `redeemBootstrapToken`, `listBootstrapTokens`
- `rotateSigningKey`
- `getDeploymentInfo` (read-only but mode-scoped)

## Server-side mode enforcement

`assertMode()` (see `src/lib/deployment-mode.server.ts`) is invoked at the top of every mode-scoped server function. The UI gate is defense in depth, not the primary control.
