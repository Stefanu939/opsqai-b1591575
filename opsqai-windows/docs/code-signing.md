# Code signing (EV certificate)

OPSQAI ships with an Extended Validation code-signing certificate. Every
executable produced by the build — `OPSQAI-Setup.exe`, the WinSW-renamed
service wrappers, and (Phase 3+) the Electron wizard/admin binaries — must
be signed with this cert before distribution. Unsigned builds trigger
SmartScreen and Defender warnings that block adoption at scale.

## One-time runner setup

1. Provision a **self-hosted Windows runner** with labels
   `self-hosted, windows, opsqai-signing`.
2. Install:
   - Windows 10/11 or Server 2022, 64-bit.
   - Windows SDK (for `signtool.exe`).
   - Node.js 20.x LTS + npm (for `npm run build:selfhosted` and the Electron
     wizard packaging step).
   - NSIS 3.09+ (add `makensis.exe` to `PATH`).
   - `openssl.exe` on `PATH` — only used by `build.ps1` to generate a
     DEV-ONLY updater key when `payload\updater\pubkey.pem` is missing.
     Not required on the signing runner (which restores the real key
     from GitHub Actions secrets before invoking `build.ps1`).
   - PowerShell 7+.
   - The EV token driver from the cert vendor (SafeNet Authentication Client
     for DigiCert; equivalent for Sectigo).
3. Plug in the EV USB token (or configure the cloud HSM per vendor docs).
4. Unlock the token once on the runner and store the PIN in the Windows
     Credential Manager under the account that runs the GitHub Actions
     service, so `signtool /a` picks the cert non-interactively.
5. Provision the **updater signing key**:
   - Private Ed25519 key stays on an offline signing station (HSM or
     encrypted USB) — never on the build runner.
   - Public key is stored as a GitHub Actions secret named
     `OPSQAI_UPDATER_PUBKEY` (full PEM contents). The workflow restores it
     to `opsqai-windows\payload\updater\pubkey.pem` before `build.ps1` runs.
6. Restrict runner access: dedicated OS user, disable interactive login for
   the runner service account, enable auditing.

## Signing command

`build/build.ps1 -Sign` runs:

```
signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a <file>
signtool verify /pa /v <file>
```

`/a` picks the best available cert in the store — the EV cert is
automatically selected when only one is present. Use `/n "OPSQAI"` in
`build.ps1` if multiple certs coexist.

## Verifying a build

On any Windows machine:

```
signtool verify /pa /v OPSQAI-Setup.exe
```

Expected: `Successfully verified: OPSQAI-Setup.exe`.
Also: right-click the file → Properties → Digital Signatures shows
"OPSQAI" as signer with a valid timestamp.

## Rotation

Renewal is a one-time re-issue by the vendor; the new cert replaces the old
on the token. No repo changes required — `signtool /a` picks the new cert
automatically. Update `docs/code-signing.md` with the new thumbprint for
audit.
