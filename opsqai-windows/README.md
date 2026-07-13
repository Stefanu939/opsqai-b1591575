# OPSQAI Windows Native Installer

Native Windows deployment for OPSQAI Self-Hosted — **no Docker, no WSL, no Hyper-V**.
Ships as a single signed `OPSQAI-Setup.exe` produced by NSIS, with services wrapped by WinSW and UI powered by Electron.

## Phase status

This repository folder is the workspace for the migration described in `.lovable/plan.md`.

- [x] Phase 1 — Foundation: NSIS scaffolding, code-signing pipeline, WinSW "hello" service, silent install/uninstall
- [x] Phase 2 — Runtime: Node-server app bundle (`build:selfhosted`), Caddy on `https://localhost`, PostgreSQL Portable with scram-sha-256, migrator, bootstrap health probe
- [x] Phase 3 — Wizard (Electron 10-step) + external DB / S3 modes
- [ ] Phase 4 — Auto-updater + Service Manager + backup/restore
- [ ] Phase 5 — Docker→native migrator + QA matrix + first signed release

## Layout

```
opsqai-windows/
├── installer/nsis/          NSIS 3 script producing OPSQAI-Setup.exe
├── installer/wizard/        Electron+React wizard (10 steps) — Phase 3
├── admin-tool/              Electron+React Service Manager — Phase 4
├── services/                Node entrypoints wrapped by WinSW
├── winsw-configs/           WinSW XML per service
├── payload/                 Staged into %ProgramFiles%\OPSQAI at install time
├── build/ci/                GitHub Actions workflow (Windows runner)
└── docs/                    Architecture, code-signing, QA matrix
```

## Building locally (Windows only)

Requires: Windows 10/11, PowerShell 7, NSIS 3.09+, Node 20 LTS, and (for signed builds) the EV code-signing token plugged in.

```powershell
cd opsqai-windows
pwsh ./build/build.ps1 -Configuration Release -Sign
```

Output: `build/artifacts/OPSQAI-Setup.exe`.

Unsigned developer build (no EV token needed):

```powershell
pwsh ./build/build.ps1 -Configuration Debug
```

## Building on CI

The recognized GitHub Actions workflow lives at `.github/workflows/build-windows-installer.yml`. It builds `OPSQAI-Setup.exe`, rejects stub-sized output, uploads it as an artifact, and attaches it to `win-v*` releases. See `docs/code-signing.md` for production signing.

## Why NSIS + Electron + WinSW

Decided in `.lovable/plan.md` §3. Short version:
- **NSIS** — small, scriptable, signs cleanly, decades of Windows enterprise track record.
- **Electron** — same TS/React stack as OPSQAI web app; shared between wizard and Service Manager.
- **WinSW** — pinned static exe, wraps any process as a proper Windows Service with Event Log + auto-restart.

No .NET, no WPF, no C#.
