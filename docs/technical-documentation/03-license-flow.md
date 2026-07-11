# 3. License flow

## Issue

MC platform-admin fills the form at `/app/platform/licenses` → server function `issueLicense`:

1. Validates payload (Zod).
2. Loads active signing key with the highest `key_id`.
3. Signs the payload; token = `opsqai.v1.<b64url(payload)>.<b64url(sig)>`.
4. Inserts into `licenses` with `owner_type`, `install_id`, `kind`, `expires_at`, `maintenance_expires_at`.
5. Writes `audit_log`.

## Verify (in the install)

`verifyLicenseToken(token)`:

1. Parses envelope.
2. Rejects unknown `license_version`.
3. Looks up `key_id` in `license_signing_keys`.
4. Verifies Ed25519 signature.
5. Checks `install_id` matches local `platform_config.install_id`.
6. Checks CRL.
7. Returns typed `LicenseVerdict`.

## Import bundle

`importActivationBundle(bundle)` verifies the outer bundle signature, then verifies each embedded license, updates signing keys and CRL atomically.

## Revoke

Adds `licenses.revoked = true` and pushes the CRL. Next heartbeat / bundle import propagates the block.

## Ownership transfer

Full flow in `src/lib/license-transfer.functions.ts` — new customer + new `install_id` + audit trail on both sides.
