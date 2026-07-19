# OPSQAI Desktop Shell

Thin Electron client that renders the locally-served OPSQAI Self-Hosted UI
(`https://localhost`) inside a native window, so end users see a real
desktop application instead of a browser tab.

## What it does

- Waits for `https://localhost/health` to return 200 before showing the app.
- Trusts the local Caddy certificate for `localhost` / `127.0.0.1` only —
  no "Not secure" warning.
- Starts required Windows services (`OpsqaiDatabase`, `OpsqaiPlatform`,
  `OpsqaiCaddy`) on demand via `sc.exe start`, if the user has the
  permission (installer registers the shortcut as run-as-user; a limited
  user without SeStart falls back to the "Open logs" / retry UI).
- Single-instance: launching the icon a second time just focuses the
  existing window.
- Tray icon: minimize-to-tray, quick access to "Open in browser".

## What it does NOT do

- No business logic, no state, no DB access.
- Never talks to the internet — the shell is fully offline.
- Does not touch the wizard, migrations, licensing or Caddy config.

## Files

| File | Purpose |
| --- | --- |
| `main.cjs` | Electron main process: window, health-gate, service control, cert trust |
| `preload.cjs` | `contextBridge` API for splash + error pages |
| `renderer/splash.html` | Boot progress screen |
| `renderer/error.html` | Recovery UI when `/health` never comes up |
| `package.json` | Electron + `@electron/packager` |

## Build

`opsqai-windows/build/build.ps1` step **2c** packages this folder with
`@electron/packager` into `payload/desktop-shell/`. The NSIS installer
copies it under `%ProgramFiles%\OPSQAI\desktop\` and creates the Desktop
+ Start Menu shortcuts pointing at `OPSQAI.exe`.
