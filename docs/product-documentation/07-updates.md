# 7. Updates

## Versioning

Two independent versions:

- **`installer_version`** — version of the installation package (Docker images + wizard). Starts at `1.0.0`.
- **application version** — version of the running web app.

## Update channel

Signed release manifests are hosted at opsqai.de. Each manifest declares:

- `installer_version`
- `docker_image` + `digest`
- `checksum`
- `min_prev_installer_version` (for chain-of-trust upgrades)
- `security_relevant: true|false`

`opsqai doctor` checks the running install against the latest manifest.

## Prerequisites

- Valid `maintenance_expires_at` on the Installation License and on any modules the update touches.
- `opsqai doctor` green.
- Backup completed and verified in the last 24 h (see chapter 8).
