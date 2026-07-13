One small addition to point 4 of the recovery procedure, before applying:

Clarify explicitly that a "hard reset" also requires the customer to 

manually reconfigure their existing running installation with the new 

install_id (update .env, replace the local activation bundle) — the old 

running instance will not automatically recognize the newly issued slug. 

This is not just an MC-side action; note it as a two-sided step (MC 

issues new identity + customer applies it locally) in the doc, so support 

doesn't assume "regenerate = done" when a hard reset actually requires 

customer-side action too.  
  
Goal

Close Phase 4.5 cleanly by making the documentation match what was actually built: `install_id` is a human-readable slug (validated by `InstallIdSchema`), manually assigned once per install and reused by every subsequent regeneration — **not** a `uuidv5(namespace, "order:"+orderId)` value.

No code changes. Docs and one plan-artifact update only.

## Changes

### 1. `docs/security-documentation/05-license-security.md`

In the "Installation package regeneration" section, replace the current sentence:

> Regeneration is idempotent for `install_id`: the same order always produces the same identity, so a customer that regenerates the package does not fork into a new install.

with an explicit description of the real mechanism:

- `install_id` is a human-readable slug (e.g. `edeka-prod-01`), assigned once when the `license_installs` row is created and validated by `InstallIdSchema`.
- It is **not** derived from `order_id` or any other field; it is stored, not computed.
- Regeneration is idempotent because `generateInstallationPackage` reads the existing `install_id` from `license_installs` and reuses it — the same order always produces the same identity as long as the row exists.
- This is the same slug already used by `licenses`, heartbeat, CRL, and the activation bundle across earlier phases; Phase 4.5 intentionally does **not** introduce a second identity scheme.

### 2. Same file — new subsection "Recovery if the `license_installs` row is lost"

Document the manual DR step, since the value can no longer be recomputed automatically:

1. Platform admin retrieves the original slug from one of: the audit log (`installation_package.generated` entries carry `install_id`), the customer's own copy of the installation ZIP (`.env.template` and the signed activation bundle both embed it), or the customer portal audit trail.
2. Admin re-creates the `license_installs` row with the **exact same** `install_id` slug via the standard install-provisioning flow.
3. Regenerate the installation package; the customer's existing deployment continues to validate against the same identity.
4. If the slug cannot be recovered from any of the above sources, a new slug must be issued and the customer's install must be re-activated with a fresh bundle — this is a hard reset and must be logged as such.

### 3. `docs/engineering/04-issue-a-license.md`

Add a one-line note under "Generating the installation package" pointing at the new recovery subsection, and clarify that the slug is chosen at install-provisioning time, not at package-generation time.

### 4. `.lovable/plan.md`

Remove or strike through the `uuidv5(namespace, "order:"+orderId)` line in the Phase 4.5 entry and replace with a one-liner: *"install_id reuses the existing manual-slug convention (`InstallIdSchema`); no second identity scheme was introduced."* This keeps the artifact honest about what shipped.

## Out of scope

- No changes to `installation-package.server.ts`, `installation-package.functions.ts`, or any migration.
- No change to `InstallIdSchema` or the provisioning flow.
- No new DR tooling; recovery remains a documented manual admin step, consistent with AD-009 (MC holds no customer infra secrets and no derivable-from-nothing identity).

## Verification

- Grep `docs/` and `.lovable/plan.md` for `uuidv5` and `order:${` — should return zero hits after the edit (except possibly historical changelog entries, which stay as-is).
- Re-read `05-license-security.md` end-to-end to confirm the "regeneration is idempotent" claim now matches the code path in `generateInstallationPackage`.
---

POST-BUILD CLARIFICATION (Phase 4.5 closeout)

install_id was NOT implemented as uuidv5(namespace, "order:"+orderId).
It reuses the existing manual-slug convention (InstallIdSchema, e.g.
"edeka-prod-01") stored on license_installs; no second identity scheme
was introduced. Regeneration idempotency comes from reading the stored
slug, not from recomputing it. Manual DR procedure documented in
docs/security-documentation/05-license-security.md.
