# 5. Licensing model

OPSQAI uses a two-axis model. There are no "Starter / Pro / Enterprise" tiers.

## Axis 1 — Installation License (mandatory)

- Exactly one per `install_id`.
- Carries **seat count** (`seats`) and **maintenance window** (`maintenance_expires_at`).
- Without a valid Installation License, the install boots in Recovery Mode only.

## Axis 2 — Module License (optional, per module)

- One license per module the customer subscribes to.
- Each has its own `expires_at` (module availability) and `maintenance_expires_at` (updates and support).

## Token format

Every license is a signed JWT/JWS compact token:

```text
<base64url(header)>.<base64url(payload)>.<base64url(ed25519_signature)>
```

The JWT header uses `alg: "EdDSA"`. Payload always includes `license_version: 1`, `kind`, `install_id`, `key_id`, `issued_at`, `expires_at`, `maintenance_expires_at`. Verifier rejects unknown `license_version`.

## Offline activation

The Management Center exports an **activation bundle** (`activation-bundle.jwt`) containing the Installation License, all Module Licenses, active signing keys, and a signed CRL snapshot. The bundle can be imported into an air-gapped install.

## Expiry behavior

- `expires_at` passed → module UI locked, retrieval disabled, existing data intact.
- `maintenance_expires_at` passed → module keeps working, but the installer refuses new update packages until renewed.
- `revoked = true` on any license → immediate module lock on next heartbeat or import.
