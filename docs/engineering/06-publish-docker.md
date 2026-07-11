# 6. Publishing a Docker image

1. Build with reproducible timestamps: `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)`.
2. Tag `registry/opsqai:$installer_version` + `registry/opsqai:latest`.
3. Push.
4. `cosign sign --key <key> registry/opsqai:$installer_version`.
5. Record `digest` in the release manifest.
6. Publish signed manifest to `https://opsqai.de/releases/$installer_version/manifest.json`.
