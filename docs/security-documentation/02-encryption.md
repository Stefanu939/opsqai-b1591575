# 2. Encryption

## In transit

- All in-cluster and out-of-cluster traffic uses TLS 1.2+.
- The customer provides the certificate for their install FQDN (Let's Encrypt via reverse proxy is the reference setup).
- Communication install ↔ Management Center is HTTPS-only and mutually validated via TLS + signed request bodies.

## At rest

- PostgreSQL disk encryption is the customer's responsibility (managed PG or LUKS on the host).
- Object storage uses server-side encryption enforced by bucket policy.
- Backups MUST be encrypted before shipment to off-site storage (`age` or `gpg`).

## Application-layer

- License tokens: Ed25519 signed.
- Break-glass secret: scrypt hash (`N=2^15`, `r=8`, `p=1`, `keylen=64`), unique salt per record. Only the hash is stored.
- Bootstrap Recovery Tokens: Ed25519 signed, single-use, `install_id`-bound, TTL enforced.
