# Obține noul OPSQAI-Setup.exe prin GitHub Actions

## Context
Codul pentru installerul Windows (folderul `opsqai-windows/`) este acum actualizat în proiectul Lovable. Lovable nu generează automat fișierul `.exe` — acesta se produce prin workflow-ul GitHub Actions care rulează `build/build.ps1` pe un runner Windows.

## Ce trebuie să faci

1. **Asigură-te că proiectul Lovable este sincronizat cu GitHub.**
   - Dacă nu e conectat: Plus (+) → GitHub → Connect project → creează repo.
   - După sincronizare, modificările din `opsqai-windows/` vor apărea în repo-ul GitHub.

2. **Așteaptă/confirmă sincronizarea.**
   - Verifică în GitHub că ultimul commit include fișierele modificate recent (`opsqai-windows/services/database/ensure-config.js`, `index.js`, `bootstrap/init.js`, etc.).

3. **Declanșează build-ul.**
   - Opțiunea A — **manual**:
     - Mergi în GitHub → Actions → `build-windows-installer`.
     - Apasă **Run workflow**.
     - Completează `version` (ex: `1.0.0-fix`) și lasă `sign` pe `true` dacă vrei semnătură.
   - Opțiunea B — **prin tag**:
     - Creează un tag `win-vX.Y.Z` și push-uiește-l.
     - Workflow-ul pornește automat și atașează EXE-ul la release.

4. **Așteaptă finalizarea.**
   - Build-ul durează ~10–30 min (depinde de descărcarea Node/PostgreSQL/Caddy).
   - Dacă semnarea e activă, runner-ul trebuie să fie self-hosted `windows, opsqai-signing` cu tokenul EV deblocat.

5. **Descarcă EXE-ul.**
   - După succes, mergi la run → **Artifacts** → `OPSQAI-Setup-<version>.zip`.
   - Dezarhivează și rulează `OPSQAI-Setup.exe`.

## Pentru instalări blocate acum

Dacă ai deja o instalare care dădea eroarea `postgres not ready after 60s`:
- Oprește serviciul `OpsqaiDatabase`.
- Șterge `%ProgramData%\OPSQAI\data\pgsql\`.
- Rulează noul installer (sau scriptul de bootstrap din nou).

## Notă tehnică

- Workflow-ul este la `.github/workflows/build-windows-installer.yml`.
- Scriptul de build este `opsqai-windows/build/build.ps1`.
- Artifactul se numește `OPSQAI-Setup-<version>.exe` și apare în `opsqai-windows/build/artifacts/`.
- Build-ul Release necesită secretul `OPSQAI_UPDATER_PUBKEY` pentru verificarea auto-updaterului.