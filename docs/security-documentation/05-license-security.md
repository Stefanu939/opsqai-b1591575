# 5. License security

## Signing

- Algorithm: Ed25519 (RFC 8032).
- Private keys held **only** in the Management Center.
- Every token carries `license_version: 1`, `kind`, `install_id`, `key_id`.
- Verifier rejects unknown `license_version` or unknown `key_id`.

## Key rotation

- Multiple active signing keys can coexist (`license_signing_keys.active = true`).
- Rotation cadence: annual, or immediately upon suspected compromise.
- Dual-signing window: **≥ 90 days** overlap so offline installs pick up the new key via their next activation bundle before the old one is deactivated.
- Emergency rotation (compromise): all outstanding tokens signed by the compromised key are added to the CRL; a fresh activation bundle is generated for every install and pushed via the Customer Portal.

## Revocation

- Central CRL held on the MC.
- CRL is Ed25519-signed and included in every activation bundle.
- Installs refresh CRL via heartbeat (online) or bundle import (offline).
- Doctor warns when CRL age > 30 days.

## Offline activation

- Bundle format is JSON, itself Ed25519-signed.
- Bundle includes: all current licenses for the install, active signing-key public keys, latest CRL.
- Bundle expiry: 90 days from issuance. Portal reminds the customer at 60 and 75 days.

## Installation package regeneration

- The Management Center packages the activation bundle inside a signed
  installation ZIP (see `docs/administrator-guide/02-installation.md`).
- `install_id` is a human-readable slug (e.g. `edeka-prod-01`), assigned
  once when the `license_installs` row is created and validated by
  `InstallIdSchema`. It is **not** derived from `order_id` or any other
  field — it is stored, not computed. This is the same slug already used
  by `licenses`, heartbeat, CRL, and the activation bundle across earlier
  phases; Phase 4.5 intentionally does **not** introduce a second identity
  scheme.
- Regeneration is idempotent because `generateInstallationPackage` reads
  the existing `install_id` from `license_installs` and reuses it — the
  same order always produces the same identity as long as the row exists.
  A customer that regenerates the package does not fork into a new install.
- Default on regeneration: the previous bundle is added to the CRL and
  stops activating new installs on the next heartbeat. The audit log records
  `installation_package.generated` with `previous_bundle_revoked = true`.
- Escape hatch: a platform admin can check *"Keep previous bundle valid"*
  when the customer is running a restored backup that must keep its old
  bundle working. This is surfaced with an explicit warning in the MC UI.
- The generated ZIP holds NO customer infrastructure secrets (AD-009).
  `POSTGRES_PASSWORD` and `MINIO_ROOT_PASSWORD` are placeholders; the
  bundled `entrypoint.sh` generates strong random values on first boot and
  writes them to a customer-owned data volume.
- Download URLs are Ed25519-signed and time-limited to 24 hours. Every
  download is logged with actor, IP, user-agent, and expiry into
  `installation_package_downloads` for audit.

## Recovery if the `license_installs` row is lost

Because `install_id` is stored (not computed), a lost or corrupted
`license_installs` row cannot be automatically re-derived. Recovery is a
documented manual step:

1. Platform admin retrieves the original slug from one of:
   - the audit log (`installation_package.generated` entries carry `install_id`),
   - the customer's own copy of the installation ZIP (the `.env.template`
     and the signed activation bundle both embed the slug),
   - the customer portal audit trail.
2. Admin re-creates the `license_installs` row with the **exact same**
   `install_id` slug via the standard install-provisioning flow.
3. Regenerate the installation package; the customer's existing deployment
   continues to validate against the same identity.
4. If the slug cannot be recovered from any of the above sources, a new
   slug must be issued and this is a **hard reset**, logged as such. A
   hard reset is a two-sided operation, not just an MC action:
   - MC side: platform admin provisions a new `license_installs` row with
     the new slug and generates a fresh installation package.
   - Customer side: the running installation must be reconfigured locally
     — update `OPSQAI_INSTALL_ID` in `.env`, replace the on-disk activation
     bundle with the newly issued one, and restart. The old running
     instance will **not** automatically recognize the newly issued slug;
     support must not assume "regenerate = done" in this path.


