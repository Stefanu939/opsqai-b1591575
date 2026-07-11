# 6. Update security

- Release manifests are Ed25519-signed by a **release signing key**, separate from the license signing keys.
- Docker images are content-addressable by digest; the manifest pins the digest.
- Cosign signatures on published images are the source of truth for binary provenance.
- `opsqai update verify` checks the manifest signature and the image digest before applying anything.
- Chain-of-trust upgrades: the manifest declares `min_prev_installer_version`; the CLI refuses to skip past that bound.
- Rollback preserves the previous image + a pre-update schema snapshot for 7 days.
