## Plan: GitHub Release + URL stabil pentru OPSQAI-Setup.exe

### Pas 1 — Tu, pe GitHub (5 min)

1. Repo → **Actions** → run-ul verde de build Windows → descarcă artifact `OPSQAI-Setup-<versiune>` (ZIP-ul de la Actions).
2. Extrage `OPSQAI-Setup.exe`.
3. Repo → **Releases** → **Draft a new release**:
  - Tag: `win-v1.0.0`
  - Title: `OPSQAI Windows Installer v1.0.0`
  - Attach: `OPSQAI-Setup.exe`
  - Publish release
4. Click dreapta pe `OPSQAI-Setup.exe` din release → **Copy link address**. Va arăta așa:
  ```
   https://github.com/<org>/<repo>/releases/download/win-v1.0.0/OPSQAI-Setup.exe
  ```
5. Lipești URL-ul aici în chat.

**Alternativă automată (recomandat pentru release-urile viitoare):**

```
git tag win-v1.0.0
git push origin win-v1.0.0
```

Workflow-ul deja detectează tag-uri `win-v*` și creează automat release-ul cu EXE-ul atașat. Îmi dai URL-ul rezultat.

### Pas 2 — Eu, după ce am URL-ul

1. Salvez URL-ul ca secret rulare `OPSQAI_WINDOWS_INSTALLER_URL` (via `add_secret`, ca să fie disponibil în server functions).
2. Verific că `installation-package.server.ts` îl citește corect din `process.env` la generarea ZIP-ului per client — dacă nu, adaug fallback-ul.
3. Rulez `installation-package.test.ts` (sau echivalent) să confirm:
  - ZIP-ul rezultat conține `OPSQAI-Setup.exe` real (>50 MB, magic bytes `MZ`)
  - `CHECKSUMS.sha256` include hash-ul corect al EXE-ului
  - `README.md` + `activation-bundle.json` sunt prezente
4. Test end-to-end: emit o licență demo → generez bundle Ed25519 → asamblez ZIP → verific integritatea.

### Pas 3 — Tu, când ai timp

Test real pe un Windows 10/11: extragi ZIP-ul, rulezi EXE-ul ca Administrator, lipești `activation-bundle.json` în wizard, verifici că serviciile pornesc și `https://localhost/first-run` răspunde. Îmi raportezi orice eroare (log-uri în `C:\ProgramData\OPSQAI\logs\`).

### Amânate (nu blochează testarea)

- Code signing EV Authenticode (elimină SmartScreen)
- Utilitar migrare Docker → Windows
- Instalare unattended pentru rollout enterprise

### Ce am nevoie de la tine ca să încep pasul 2

Doar **URL-ul stabil** al `OPSQAI-Setup.exe` din GitHub Release. Restul îl fac eu.

&nbsp;

&nbsp;

Ai aici link-ul 

https://github.com/Stefanu939/opsqai-b1591575/releases/download/V.1.0.0/OPSQAI-Setup-1.0.0.zip