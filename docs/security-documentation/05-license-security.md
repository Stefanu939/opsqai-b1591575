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
- Regeneration is idempotent for `install_id`: the same order always
  produces the same identity, so a customer that regenerates the package
  does not fork into a new install.
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

