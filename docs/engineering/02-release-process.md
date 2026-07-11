# 2. Release process

1. Cut a release branch.
2. Run pre-release checklist (chapter 8).
3. Bump `installer_version` in `platform_config` seed + `package.json`.
4. Update `CHANGELOG.md` and `RELEASE_NOTES.md`.
5. Sign the release manifest with the release private key (offline HSM).
6. Publish Docker image, sign with cosign.
7. Publish activation-bundle-eligible signing key rotation if applicable.
8. Merge, tag, publish.
