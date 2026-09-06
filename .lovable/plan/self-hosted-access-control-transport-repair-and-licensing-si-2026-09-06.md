# Self-Hosted Access Control, Transport Repair and Licensing Simplification

## Outcome

Deliver a consistent Self-Hosted administration model:

- The first installation account is the protected **Owner** with permanent full access.
- Company **SuperAdmins** have full access; company **Admins** can be configured.
- Company Admins/SuperAdmins—not OPSQAI staff—can grant named users rights per functional area.
- Transport Overview and Operations work reliably and receive complete enterprise states and controls.
- **License & Entitlements** becomes a focused three-section page for viewing, verifying and replacing the local signed license.

## 1. Unify Self-Hosted authorization

- Preserve the existing first-run Owner bootstrap and its unrestricted server-side bypass.
- Normalize full-access detection so Owner and SuperAdmin are handled consistently in user creation, last-administrator protection, module access and Transport.
- Keep Admin configurable rather than implicitly unrestricted.
- Prevent protected Owner/SuperAdmin roles from being edited or deleted through custom-role administration.
- Backfill all current permissions for protected full-access roles and ensure future permission additions cannot leave SuperAdmin incomplete.
- Keep all changes inside the Windows Self-Hosted product; Management Center and Customer Portal authorization remain unchanged.

## 2. Add enterprise per-user rights

Create one company-administered matrix for each licensed functional area with:

- View
- Create
- Edit
- Delete
- Approve
- Administer

Include role presets plus per-user exceptions. Company Admins and SuperAdmins can assign these rights to named company users; users cannot grant rights they do not administer. The server enforces every sensitive action independently of what the interface hides.

Existing module grants and Transport grants will be migrated/bridged into this model so current installations retain access. Unlicensed products remain inaccessible regardless of assigned rights.

## 3. Repair and harden Transport

- Remove Transport's process-wide PostgreSQL date-parser mutation and scope date serialization to Transport only.
- Add defensive date normalization at repository boundaries so timestamp values are safe whether received as `Date` or text.
- Verify all related paths, not only the two visible failures: Overview, Operations, incidents, requests, audit, map, settings, notes and exports.
- Complete Overview/Operations states with persistent filters, actionable empty/error states, permission-aware actions and stable loading behavior.
- Map Transport actions to the new rights matrix: view, create, edit, delete, approve and administer; export remains an explicit controlled capability under the relevant area.

## 4. Simplify License & Entitlements

Replace the current catalog/request experience with exactly three sections:

1. **License status** — customer, installation, validity, expiry and maintenance.
2. **Active entitlements** — included capabilities, licensed products and add-ons, read-only.
3. **Verify or replace license** — paste/import the signed JWT or offline bundle, verify before activation, then apply it locally.

Remove product-request buttons, commercial catalog prompts and unrelated actions. Keep signature verification, installation matching, revocation checks and enforcement unchanged.

## 5. Compatibility and migration

- Add an additive Self-Hosted migration for the rights model and permission backfill.
- Preserve existing role keys, module assignments and Transport grants through compatibility mapping/backfill.
- Do not open unlicensed modules and do not introduce any customer configuration surface into Management Center or Portal.

## 6. Verification

- Test first Owner bootstrap, full SuperAdmin access, configurable Admin access and last-Owner/SuperAdmin protections.
- Test positive and denied server actions for every rights category, including attempted privilege escalation.
- Reproduce the timestamp failure before the fix, then verify Transport after importing/using all affected repositories in one process.
- Verify Overview and Operations with empty, populated and malformed/legacy date data.
- Verify license viewing, JWT/bundle dry-run verification, replacement and post-activation entitlement refresh.
- Run targeted tests, full typecheck/build, Self-Hosted boundary checks and responsive browser checks for the changed pages.

## Technical details

- The confirmed Transport root cause is a global `pg.types.setTypeParser` side effect in `src/lib/transport/db.server.ts`; it changes timestamp handling for unrelated repositories that call `.toISOString()`.
- Existing `user_module_access`, role permissions and Transport grants will be compatibility inputs, not competing authorization sources.
- Database authorization and server handlers remain authoritative; client-side controls are presentation only.
