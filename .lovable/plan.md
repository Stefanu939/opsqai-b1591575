## Goal

Customerul primește în ZIP binare native pentru toate cele 3 OS-uri, astfel încât să poată dublu-clic (Windows) sau `./install-macos` / `./install-linux` fără să depindă de bash / WSL / PowerShell policies.

## De ce Go (enterprise-grade choice)

- **Single static binary**, zero runtime dependencies (fără Node, fără .NET, fără Python) — exact ce se așteaptă în medii enterprise/air-gapped.
- **Cross-compilation reproducibilă** din CI Linux: `GOOS=windows/darwin/linux GOARCH=amd64/arm64 go build` — un singur toolchain produce toate binarele, deterministic.
- **Semnabil**: `.exe` semnabil cu Authenticode, `.app`/binary macOS semnabil cu codesign+notarization când customerul cere (hook-uri pregătite, semnarea efectivă rămâne outside RC scope).
- **Auditabil**: sursa Go trăiește în repo (~200 linii), nu un binar opac. Reproducible builds cu `-trimpath -ldflags="-s -w -buildid="`.
- Respinse: ps2exe (doar Windows, dependent de PowerShell execution policy, greu de semnat), Node+pkg (~40MB binar, surface mare, deja EOL upstream), .bat/.ps1 pur (nu e un „executabil" în sensul cerut de user, blocat frecvent de Group Policy).

## Livrabile în ZIP (extindere față de starea curentă)

| Fișier | OS | Notă |
| --- | --- | --- |
| `install.exe` | Windows x64 | Dublu-clic; deschide o consolă, rulează pașii, deschide `/first-run` în browser default |
| `install-macos` | macOS universal (amd64+arm64 via `lipo`) | `chmod +x` + `./install-macos` |
| `install-linux` | Linux x64 | idem |
| `install.sh` | POSIX fallback | rămâne — util pentru servere headless / SSH-only |
| restul fișierelor | — | neschimbate (`docker-compose.yml`, `.env.template`, `entrypoint.sh`, `activation-bundle.json`, `README.md`, `CHECKSUMS.sha256`) |

Binarele Go replică 1:1 contractul `install.sh`:
1. `checkPrereqs()` — verifică `docker` și `docker compose` în PATH; pe Windows detectează Docker Desktop și indică linkul dacă lipsește.
2. `seedEnv()` — copiază `.env.template` → `.env` doar dacă `.env` lipsește (idempotent).
3. `dockerComposeUp()` — rulează `docker compose up -d` în directorul curent.
4. `waitHealthy()` — polling la `http://localhost:${OPSQAI_PORT}/health` până la 120 s.
5. `printAndOpenWizard()` — printează URL-ul `.../first-run` și, pe desktop OS, îl deschide în browser (`start` / `open` / `xdg-open`).
6. Flag `--restore` — replică DR runbook 5.5.4 (prompt path, `docker compose down`, `opsqai restore --archive`, up, wait).
7. Flag `--help` — usage identic cu install.sh.

Toate mesajele identice cu install.sh ca text/ordine, ca să nu divergă documentația.

## Arhitectură cod

```text
installer/                     ← sursă Go (nouă)
  go.mod
  main.go                      ← flag parsing, orchestrare (~150 loc)
  prereq.go                    ← check docker + compose plugin per OS
  env.go                       ← seedEnv, .env parsing pentru OPSQAI_PUBLIC_URL
  health.go                    ← HTTP polling
  browser.go                   ← open URL cross-platform
  restore.go                   ← --restore flow

src/lib/installation-package.server.ts
  ← constanta INSTALL_SH rămâne
  ← nouă: încarcă cele 3 binare pre-buildate din `installer/dist/` la runtime
  ← le include în ZIP-ul generat; CHECKSUMS.sha256 le acoperă

scripts/build-installer.sh     ← rulat în CI înainte de test/build:
  GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o installer/dist/install.exe ./installer
  GOOS=darwin  GOARCH=amd64 go build ... -o installer/dist/install-macos-amd64 ./installer
  GOOS=darwin  GOARCH=arm64 go build ... -o installer/dist/install-macos-arm64 ./installer
  lipo -create ... -output installer/dist/install-macos
  GOOS=linux   GOARCH=amd64 go build ... -o installer/dist/install-linux ./installer
```

Binarele buildate sunt commit-ate în `installer/dist/` (Git LFS) SAU regenerate ca artifact în build pipeline; recomandarea e artifact CI pentru reproducible builds, dar în absența pipeline-ului expunem `bun run installer:build` care rulează scriptul local dacă Go e prezent, altfel fail cu mesaj clar.

Server-side loading: `installation-package.server.ts` face `fs.readFileSync('installer/dist/install.exe')` etc. Dacă un binar lipsește la runtime, endpointul de download returnează 503 cu mesaj „installer binaries not built — run `scripts/build-installer.sh`", nu servește un ZIP incomplet.

## Securitate

- `install.exe` nu conține secrete — logica e generică; secretele vin din `activation-bundle.json` și `.env`, care rămân outside binar.
- `CHECKSUMS.sha256` acoperă și cele 3 binare — customer verifică integritatea înainte să ruleze.
- Documentație în `docs/security-documentation/`: added note că binarele sunt reproducible builds; SHA-256 din CHECKSUMS trebuie confirmat cu semnătura ZIP-ului la download.
- Hook pentru Authenticode signing (Windows) și codesign + notarization (macOS) marcat ca `TODO(release-signing)` în build script — semnarea efectivă necesită certificate customer, în afara scope-ului RC dar documentată.

## Docs updates

- `docs/administrator-guide/02-installation.md`: tabelul de fișiere, quick-start cu 3 variante (Windows dublu-clic, macOS `./install-macos`, Linux `./install-linux` sau `./install.sh`).
- `docs/administrator-guide/03-setup-wizard.md`: link la installer nou.
- `docs/engineering/06-publish-docker.md`: pas nou „build installer binaries" în release checklist.

## Tests

- `src/lib/__tests__/installation-package.test.ts`: verifică ZIP-ul conține `install.exe`, `install-macos`, `install-linux` și `install.sh`; verifică CHECKSUMS le include; folosește fixtures mici (fișiere placeholder 1-byte) când `installer/dist/` nu e populat, ca testele să ruleze și fără Go toolchain.
- `installer/` Go tests unitare pentru env parsing și health polling (mock HTTP server) — nu sunt gate-uite de bunx vitest (rulează cu `go test ./installer/...` opțional în CI).

## Out of scope

- Semnare cod efectivă (Authenticode / notarization) — necesită certificatele customerului.
- .msi / .pkg / .deb installere — un binar single-file e suficient pentru cerință; instalatoare cu UI grafic sunt v1.1.
