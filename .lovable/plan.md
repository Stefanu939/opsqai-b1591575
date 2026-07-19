
# Plan: OPSQAI Desktop Shell (Electron)

Clientul primește o **aplicație desktop reală** (fereastră proprie, iconiță, taskbar) în loc de un shortcut la browser. Serviciile Windows existente (`OpsqaiPlatform`, `OpsqaiDatabase`, `OpsqaiCaddy`) rămân neatinse — shell-ul doar afișează UI-ul lor local.

## Ce se schimbă din perspectiva clientului

- Dublu-click pe iconița OPSQAI → se deschide o **fereastră aplicație** (fără bară de URL, fără avertisment "Not secure").
- Prima dată: splash "Se pornește OPSQAI…" cât timp shell-ul așteaptă serviciile.
- Dacă un serviciu e stopped → shell-ul îl pornește automat (are deja privilegiile prin instalator) sau afișează un buton clar "Repornește serviciile".
- Meniu nativ: File → Exit, Help → Doctor / Logs / About, Tray icon opțional pentru minimize-to-tray.

## Arhitectură

```text
┌─────────────────────────────────────────────┐
│  OPSQAI.exe  (Electron shell, ~90 MB)       │
│  ┌───────────────────────────────────────┐  │
│  │ BrowserWindow → https://localhost     │  │
│  │  (Caddy → OpsqaiPlatform :3000)       │  │
│  └───────────────────────────────────────┘  │
│  Main process:                              │
│   • health-gate: poll /health până OK       │
│   • service-control: sc query/start         │
│   • CA trust: acceptă cert Caddy intern     │
└─────────────────────────────────────────────┘
       ↓ (nu se atinge)
  Windows Services: Database · Platform · Caddy · Worker · Updater
```

Shell-ul e un **client subțire** — zero logică de business. Toată aplicația rămâne în serviciile deja construite.

## Livrabile

### 1. Proiect nou `opsqai-windows/desktop-shell/`

- `package.json` — Electron + `@electron/packager`, `"main": "main.cjs"`, `"type": "commonjs"`.
- `main.cjs` — creează `BrowserWindow` (1280×800, `contextIsolation: true`, `nodeIntegration: false`), încarcă `https://localhost` după health-gate.
- `preload.cjs` — expune un mic API (`opsqai.restartServices()`, `opsqai.openLogs()`, `opsqai.runDoctor()`) prin `contextBridge`.
- `splash.html` + `error.html` — pagini statice locale pentru boot și fallback.
- `assets/icon.ico` — iconița deja folosită de installer.

### 2. Health-gate & service control (main process)

- La launch: `GET https://localhost/health` cu `rejectUnauthorized: false` (certul Caddy e local, controlat de noi), retry 500 ms până max 30 s.
- Dacă timeout → `sc query OpsqaiPlatform` + `OpsqaiDatabase`; dacă `STOPPED` → `sc start` (shell-ul rulează cu privilegiile user-ului; dacă lipsesc, afișăm buton "Run as admin to repair").
- Dacă tot eșuează → `error.html` cu: status per serviciu, buton "Retry", buton "Open Doctor", buton "Copy diagnostics".

### 3. Certificat local — fără "Not secure"

`session.setCertificateVerifyProc` acceptă doar certul emis de CA-ul intern Caddy pentru `localhost` / `127.0.0.1`. Browserul extern rămâne opțiune "Open in browser" din meniu (acolo apare avertismentul până când CA-ul e trusted în Windows — separat).

### 4. Integrare în installer NSIS

- `build.ps1`: pas nou `Build-DesktopShell` → `npx @electron/packager` cu `--platform=win32 --arch=x64`, output în `payload/desktop-shell/`.
- `OPSQAI-Setup.nsi`: copiază `payload/desktop-shell/` în `%ProgramFiles%\OPSQAI\desktop\`, shortcut-ul de pe Desktop și din Start Menu țintește `OPSQAI.exe` (nu mai deschide browserul).
- Verificare mărime: installer crește de la ~330 MB la ~410-430 MB. Acceptabil pentru enterprise on-prem.

### 5. Auto-update (fază ulterioară, nu acum)

Shell-ul afișează versiunea din `platform_config.installer_version`. Update-ul aplicației rămâne prin `OpsqaiUpdater` service existent — shell-ul detectează versiune nouă la restart și afișează "Restart to apply update".

### 6. Guardrails build

- `verify-bundle.mjs`: adaugă scan pe `desktop-shell/` — nu are voie să conțină chei Cloud, Supabase URL, license private key.
- Package-uit fără `devDependencies`, `--prune` la end.

## Ce NU se schimbă

- Serviciile Windows, migrațiile, licențierea, `/health`, Caddy — zero modificări.
- MC / Cloud / Portal — nu sunt atinse (regula "două produse separate" din memory).
- UI-ul React din `src/routes/` — shell-ul îl încarcă neschimbat prin Caddy.

## Definition of Done

1. Installer finalizat produce `OPSQAI.exe` pe desktop care deschide fereastră nativă, nu browser.
2. La first launch, shell așteaptă `/health` → 200 OK, apoi afișează `/first-run` sau `/auth`.
3. Fără avertisment de certificat în fereastra Electron.
4. Dacă `OpsqaiPlatform` e stopped, shell-ul îl pornește automat sau afișează UI-ul de recovery.
5. `verify-bundle` trece; installer semnat rulează end-to-end pe VM curat Windows 11.

## Ordinea de execuție

1. Schelet `desktop-shell/` + `main.cjs` cu health-gate și `BrowserWindow`.
2. Splash + error page + preload cu API restart/logs/doctor.
3. Certificate handling + service control.
4. Integrare în `build.ps1` și `OPSQAI-Setup.nsi`, mutare shortcut.
5. Test end-to-end pe VM curat + update guardrails.
