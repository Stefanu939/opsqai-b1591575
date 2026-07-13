## Ce înseamnă „connectat la GitHub"

Integrarea Lovable ↔ GitHub sincronizează doar **codul sursă**. Nu îmi dă acces să rulez GitHub Actions, să adaug secrete în repo, sau să public releases. Deci codul e la tine în repo, dar build-ul real al `.exe`-ului tot pe infrastructura GitHub trebuie să se întâmple.

## De ce nu pot construi eu `OPSQAI-Setup.exe` aici

Sandbox-ul meu e Linux. Instalatorul Windows are nevoie de:
- `windows-latest` runner (NSIS + signtool + PowerShell)
- Node 20 portable + PostgreSQL 16.4 Windows + Caddy Windows + WinSW + Electron wizard → ~350–400 MB payload asamblat pe Windows
- Semnătură Authenticode (opțional, dar recomandat)

Workflow-ul `.github/workflows/build-windows-installer.yml` e deja scris și face exact asta — dar rulează pe GitHub, nu la mine.

## Ce trebuie să faci TU pe GitHub (o singură dată)

### 1. Adaugă secretul `OPSQAI_UPDATER_PUBKEY` (obligatoriu)
Repo → Settings → Secrets and variables → Actions → **New repository secret**
- Name: `OPSQAI_UPDATER_PUBKEY`
- Value: cheia publică Ed25519 (PEM) pentru verificarea update-urilor semnate. Dacă nu o ai încă, generează perechea local:
  ```
  openssl genpkey -algorithm ed25519 -out opsqai-updater.key
  openssl pkey -in opsqai-updater.key -pubout -out opsqai-updater.pub
  ```
  Pune conținutul `opsqai-updater.pub` în secret. **Cheia privată `.key` NU se urcă în repo** — o păstrezi tu pentru semnat manifest-uri de update.

Fără acest secret, workflow-ul face doar un build Debug (nu Release complet).

### 2. Verifică că Actions e activat
Repo → Settings → Actions → General → „Allow all actions"

### 3. (Opțional acum, recomandat înainte de GA) Code signing
Certificat EV Authenticode + secretele `WINDOWS_CERT_PFX_BASE64` + `WINDOWS_CERT_PASSWORD`. Fără el, Windows arată „SmartScreen: More info → Run anyway". Vezi `opsqai-windows/docs/code-signing.md`.

### 4. Trigger primul build
Două variante:
- **Manual:** repo → Actions → „Build Windows installer" → Run workflow → introduci `version: 1.0.0`
- **Prin tag:** `git tag win-v1.0.0 && git push origin win-v1.0.0` → workflow-ul rulează automat și atașează `OPSQAI-Setup.exe` la GitHub Release

Build-ul durează ~15–25 min pe `windows-latest`.

## Ce pot face EU după ce ai făcut pașii de mai sus

1. Verific starea workflow-ului dacă îmi dai link la run (sau îmi lipești log-ul dacă eșuează).
2. Corectez orice eroare în `build.ps1`, `OPSQAI-Setup.nsi`, sau în wizard-ul Electron.
3. După ce ai un `OPSQAI-Setup.exe` real (>50 MB, semnat sau nu) urcat undeva accesibil (release GitHub, Lovable Asset, S3), îl leg în `src/assets/install-exe.asset.json` sau prin `OPSQAI_WINDOWS_INSTALLER_URL` — și pachetul ZIP livrat clientului va conține automat noul EXE.
4. Rulez teste, verific hash-urile, actualizez `CHECKSUMS`.

## Rezumat

| Pas | Cine |
|---|---|
| Adaugă `OPSQAI_UPDATER_PUBKEY` în Actions Secrets | **Tu** |
| Activează Actions | **Tu** |
| Trigger workflow (manual sau `win-v1.0.0` tag) | **Tu** |
| Cod signing cert (opțional acum) | **Tu** |
| Debug erori de build, ajustări NSIS/PowerShell, integrare EXE final în pachet | **Eu** |

Spune-mi când ai adăugat secretul și ai lansat primul run — de acolo preiau eu.