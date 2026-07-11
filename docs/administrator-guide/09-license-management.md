# 9. License management

## Installing an Installation License

1. Go to `/app/platform/license-activation`.
2. Paste the Installation License token (starts with `opsqai.v1.`).
3. Click **Verify** — the install checks signature, `install_id`, and version. Rejects mismatches.
4. Click **Activate** — token is stored in `licenses` and the install exits Recovery Mode if it was in it.

## Adding a Module License

Same page, **Add License** button. Paste the token. The verifier enforces:

- `license_version == 1`
- `kind == "module"`
- `install_id` matches
- Signing key `key_id` present in `license_signing_keys`
- Not revoked (CRL check)

## Offline activation bundle

If the install cannot reach opsqai.de:

1. Customer downloads the activation bundle from the Customer Portal (Downloads section).
2. Bundle is uploaded via `/app/platform/license-activation` → **Import Bundle**.
3. The verifier accepts CRL + all licenses in one atomic import.

## Revocation

If OPSQAI revokes a license, the next successful heartbeat (or the next imported bundle) delivers the CRL update and the module locks.
