# OPSQAI Updater — Signing Runbook

The updater trusts exactly one Ed25519 public key, pinned into the
installer at build time. This document describes how to generate the
signing key, publish a manifest, and rotate the key.

## Key generation (offline, once)

Run on an air-gapped machine. The private key never leaves this host.

```powershell
# Private key (KEEP OFFLINE, HSM or encrypted USB)
openssl genpkey -algorithm ed25519 -out opsqai-update-priv.pem

# Public key (shipped in the installer)
openssl pkey -in opsqai-update-priv.pem -pubout -out opsqai-update-pub.pem
```

Copy `opsqai-update-pub.pem` to `opsqai-windows/payload/updater/pubkey.pem`
before running `build.ps1`. `build.ps1` embeds it into every installer under
`%ProgramFiles%\OPSQAI\updater\pubkey.pem`.

## Manifest format

`updates.opsqai.de/channel/<stable|beta>/manifest.json`:

```json
{
  "channels": {
    "stable": {
      "version": "1.2.0",
      "url": "https://updates.opsqai.de/artifacts/OPSQAI-Setup-1.2.0.exe",
      "sha256": "…",
      "notes": "https://opsqai.de/releases/1.2.0"
    }
  },
  "signature": "base64(Ed25519 signature of the canonical JSON above)"
}
```

Canonicalisation: recursively sort object keys, encode with `JSON.stringify`
(no whitespace). See `canonicalize()` in `index.js`.

## Signing a release

```bash
node sign-manifest.js \
  --in  manifest.unsigned.json \
  --key opsqai-update-priv.pem \
  --out manifest.json
```

(See `sign-manifest.js` next to this README — offline tool.)

Upload the signed `manifest.json` **after** the artifact is reachable at
`url`; otherwise online clients will attempt to download a 404 and back off.

## Rotating the key

1. Generate a new key pair.
2. Ship a Windows update whose payload contains the new `pubkey.pem`.
3. Only after the fleet is on the new version (see telemetry) can you sign
   subsequent manifests with the new private key.

Rotating the key while a fraction of the fleet still trusts the old key
will make those clients stop updating until a human runs the installer.

## Update source: Management Center first, signed CDN manifest as fallback

Since the Management Center became the release registry, the updater no longer
depends on the CDN manifest:

1. The application performs a licensed update check against
   `POST /api/public/v1/updates/check` on the Management Center. The answer
   contains an Ed25519-signed descriptor (same license key the installation
   already pins) with version, notes, SHA-256 and a short-lived download URL.
   The verified descriptor is written to
   `%ProgramData%\OPSQAI\updates\available.json`.
2. This service reads `available.json` first, downloads the artifact, verifies
   its SHA-256 and stages it. Automatic installs still happen inside the
   configured maintenance window; `%ProgramData%\OPSQAI\updates\command.json`
   (written by the Updates page) triggers an immediate download or install.
3. When no descriptor exists — air-gapped or Management-Center-less
   installations — the legacy signed manifest at `cfg.updates.manifestUrl` is
   used exactly as before.

Only releases marked as published in the Management Center are offered, and a
release without a SHA-256 checksum cannot be published.
