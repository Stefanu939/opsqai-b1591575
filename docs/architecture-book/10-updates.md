# 10. Updates

Signed release manifests + cosign-signed images. See Security Documentation chapter 6.

## Architecture Decisions

- **AD-022: Release signing key ≠ license signing key.** Rationale: separate compromise domains. A license-signing compromise does not force update-chain regeneration and vice versa.
- **AD-023: Chain-of-trust upgrades via `min_prev_installer_version`.** Alternative (any-to-any upgrade) rejected: creates untested migration paths.
