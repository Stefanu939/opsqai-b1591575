# Audit deployment & operations — OPSQAI Self-Hosted

Data: 2026-09-06
Domeniu: `opsqai-windows/` (installer NSIS, WinSW, Caddy, desktop-shell), `installer/` (Go CLI), `docker/` (referință Docker), `opsqai-windows/services/` și `opsqai-windows/tools/` (bootstrap, backup, updater, service-manager).
Metodă: audit strict pe cod/config existent în repo. Fiecare afirmație este ancorată `path:line`. Ce nu poate fi verificat din repo (comportament runtime pe o mașină Windows reală, conținutul cheilor private de semnare, politici organizaționale) este marcat **NEVERIFICAT**.

---

## 1. Rezumat executiv

Pachetul Self-Hosted rulează ca 5 servicii Windows (WinSW) sub `LocalSystem` (implicit, fără `<serviceaccount>` explicit), cu PostgreSQL încorporat, TLS local prin Caddy (`tls internal`), un flux de auto-update semnat Ed25519 cu rollback automat, și un backup/restore CLI (`opsqai backup ...`). Referința Docker separată nu are TLS, expune portul aplicației și portul consolei MinIO nu e mapat dar service-urile interne comunică fără TLS pe rețeaua compusă (acceptabil pt. o rețea Docker privată, dar fără watch pe `POSTGRES_PASSWORD`/`MINIO_ROOT_PASSWORD` implicite slabe dacă operatorul nu le schimbă). Există puncte pozitive solide: parolele nu sunt niciodată hardcodate (parolă admin generată criptografic + forțare schimbare), ACL-uri `icacls` aplicate pe fișiere sensibile (`config.json`, `license.opsqai`, `jwt-signing.key`), verificare SHA-256 pe fiecare parte a payload-ului de instalare și pe artefactele de update, semnătură Ed25519 pe manifestul de update, izolare loopback+SCRAM pentru Postgres, rulare Electron cu `contextIsolation`/`sandbox`. Rămân recomandări de întărit: cont de serviciu dedicat (non-`LocalSystem`) pentru procesele care nu au nevoie de privilegii de sistem, ACL explicit pe directorul de backup-uri (conține dump-uri necriptate ale bazei de date), pinning al certificatului CA Caddy dincolo de `rejectUnauthorized:false`/`ignore-certificate-errors`, și eliminarea fișierului `.env` real (chei publice Supabase, nesensibil dar totuși într-un repo public/privat trebuie tratat ca politică).

---

## 2. Windows installer (NSIS, wizard, payload)

### 2.1 Privilegii de instalare
- `RequestExecutionLevel admin` — instalatorul rulează întotdeauna ca administrator (`opsqai-windows/installer/nsis/OPSQAI-Setup.nsi:24`). Corect pentru a scrie în `$PROGRAMFILES64`, `ProgramData`, HKLM și a înregistra servicii.
- Instalare implicită în `$PROGRAMFILES64\OPSQAI` (`OPSQAI-Setup.nsi:22`) — cale protejată standard (scriere necesită admin), pozitiv.
- Wizard-ul Electron post-instalare este lansat **negativ** cu `ExecWait` (nu `nsExec`) tocmai pentru compatibilitate GUI (`OPSQAI-Setup.nsi:161-174`) — comentariul documentează corect motivul tehnic, dar înseamnă că wizard-ul GUI moștenește contextul elevat al instalatorului (rulează ca admin) — **NEVERIFICAT** dacă wizard-ul validează input-uri suficient (nu am revizuit `wizard.js` complet în acest raport, în afara domeniului cerut).
- Verificare integritate payload: fiecare parte `.7z` este verificată cu SHA-256 via `certutil.exe` înainte de extragere cu `7zr.exe`, altfel `Abort` (`OPSQAI-Setup.nsi:94-114`). **Control pozitiv.**
- Instalare silențioasă (`/S /CONFIG=<json>`) documentată în `opsqai-windows/docs/unattended-install.md:1-47`; fișierul `answers.json` conține secrete în clar (parole DB externă, chei API, parolă admin) și documentația recomandă livrare pe canal securizat + ștergere după rulare (`unattended-install.md:40-47`) — bun control organizatoric, dar **nu există aplicare tehnică** (installer-ul nu șterge automat `answers.json` după consum) — Severitate: **Medie** (secretele pot rămâne pe disc dacă operatorul uită să le șteargă).

### 2.2 Dezinstalare și date reziduale
- La dezinstalare, ștergerea datelor (`%ProgramData%\OPSQAI`) este acum **implicită** ("Recommended"), cu opțiune explicită de păstrare doar dacă operatorul confirmă de două ori (`OPSQAI-Setup.nsi:249-269`) — remediază o problemă istorică de moștenire a datelor unei companii vechi de către o instalare nouă (comentat explicit în cod, linia 250-253). **Control pozitiv.**
- La `--data-mode fresh`, datele vechi sunt arhivate (nu șterse) în `%ProgramData%\OPSQAI\archive\...` (`opsqai-windows/services/bootstrap/init.js:238-268`), permițând recuperare — pozitiv, dar arhiva nu are ACL restrictiv aplicat explicit în acest bloc de cod (spre deosebire de `config.json`/chei) — Severitate: **Scăzută** (moștenește ACL implicit NTFS al `ProgramData`, care e de regulă Users:read — **NEVERIFICAT** fără mediu Windows real).

---

## 3. Servicii Windows (WinSW) — conturi și drepturi

### 3.1 Cont de rulare
- Niciun fișier WinSW (`OpsqaiDatabase.xml`, `OpsqaiPlatform.xml`, `OpsqaiCaddy.xml`, `OpsqaiUpdater.xml`, `OpsqaiWorker.xml`, `OpsqaiHello.xml`) nu conține un element `<serviceaccount>` — toate rulează implicit sub **LocalSystem** (comportament implicit WinSW când tag-ul lipsește). Verificat prin lipsa `<serviceaccount>`/`<user>` în toate cele 6 fișiere (`opsqai-windows/winsw-configs/*.xml`).
  - Impact: `LocalSystem` are privilegii extinse pe mașină (acces la SAM, drivere, toate fișierele locale). Toate cele 5 servicii de producție (Database, Platform, Worker, Caddy, Updater) rulează cu acest nivel, deși niciunul nu are nevoie de mai mult decât citire/scriere în `ProgramData\OPSQAI` și legare pe porturi loopback.
  - Severitate: **Medie-Ridicată**. Compromiterea oricăruia dintre cele 5 procese Node (`platform/index.js`, `worker/index.js`, `updater/index.js`) — de exemplu printr-o vulnerabilitate în dependențe npm sau în procesarea unui manifest de update rău-format — acordă atacatorului control total asupra sistemului Windows, nu doar asupra aplicației OPSQAI.
  - Remediere: rulare sub un cont de serviciu dedicat cu privilegii minime (`NT SERVICE\OpsqaiPlatform` virtual account, sau LocalService/NetworkService după caz), cu ACL explicit doar pe `ProgramData\OPSQAI` și `ProgramFiles\OPSQAI`. Excepție justificată: `OpsqaiDatabase` — comentariul din cod indică explicit că `postgres.exe` **refuză** să ruleze sub un cont administrativ și `pg_ctl` face drop de privilegii via `CreateRestrictedToken` (`opsqai-windows/services/database/index.js:127-134`) — deci procesul `postgres.exe` propriu-zis rulează cu token restrâns chiar dacă serviciul wrapper (`node.exe` supervizor) e LocalSystem. Acest lucru reduce, dar nu elimină, expunerea (procesul supervizor Node rămâne LocalSystem).
- Toate serviciile au `<onfailure>` cu backoff (5s/10s/60s) și `<resetfailure>1 hour` — bun pentru reziliență operațională, nu e control de securitate per se.

### 3.2 Suprafață de rețea locală
- `OpsqaiDatabase`: Postgres legat explicit pe `127.0.0.1` (`ensure-config.js:14`, `pg_hba.conf` restricționat la `127.0.0.1/32` și `::1/128` cu `scram-sha-256` — `ensure-config.js:23-26`). **Control pozitiv puternic** — nicio expunere de rețea a bazei de date.
- `OpsqaiPlatform`: nu am identificat fișierul care specifică bind address-ul HTTP-ului intern al platformei în acest domeniu de audit (fișierul `platform/index.js` nu a fost solicitat explicit) — **NEVERIFICAT** dacă ascultă doar pe `127.0.0.1:3000` sau pe toate interfețele; Caddy face proxy către `127.0.0.1:3000` (`Caddyfile:19`), ceea ce sugerează design loopback-only, dar fără citirea sursei serviciului nu se poate confirma definitiv.

---

## 4. ACL-uri pe fișiere/foldere secrete

- **`config.json`** (parole DB embedded, config SMTP, AI): după scriere, se rulează `icacls.exe ... /inheritance:r /grant:r SYSTEM:F /grant:r BUILTIN\Administrators:F` (`opsqai-windows/services/bootstrap/init.js:421-430`) — elimină moștenirea ACL implicită și restrânge accesul la SYSTEM + Administrators. **Control pozitiv.** Fișierul e scris inițial cu `mode: 0o600` (`opsqai-windows/services/common/config.js:73`), deși pe NTFS modul POSIX din Node are efect limitat — ACL-ul explicit ulterior (icacls) e mecanismul real de protecție pe Windows.
- **`license.opsqai`**: scris cu `mode: 0o600`, apoi `icacls` identic (SYSTEM + Administrators) (`init.js:369-384`). **Control pozitiv.**
- **`jwt-signing.key`** (cheie privată Ed25519 pentru semnarea JWT-urilor de sesiune): generată doar dacă nu există deja, scrisă cu `mode: 0o600`, apoi `icacls` SYSTEM+Administrators (`init.js:386-401`). Cheia publică (`jwt-signing.pub`) nu primește ACL restrictiv (corect, e publică). **Control pozitiv** pe protecția cheii private.
- **`license-verify.pub`**: scrisă cu `mode: 0o644` (world-readable), fără `icacls` (`init.js:403-419`) — corect, e o cheie publică de verificare, nu necesită restricție.
- **Directorul de backup (`%ProgramData%\OPSQAI\backups`)**: creat cu `fs.mkdirSync(backupDir, { recursive: true })` (`opsqai-windows/services/backup/create.js:75`) — **fără niciun apel `icacls` sau restricție ACL explicită** găsit în `create.js`, `restore.js`, `verify.js`, `prune.js`, `scheduled.js`. Arhivele conțin dump-uri complete PostgreSQL (`pg_dump -F c`) necriptate + arborele de storage al clienților.
  - Impact: dacă ACL-ul moștenit de pe `ProgramData` (creat de instalator la `OPSQAI-Setup.nsi:148-152`, tot fără `icacls` explicit vizibil în secțiunea de instalare) nu e restrictiv, orice utilizator local autentificat ar putea citi dump-uri complete ale bazei de date (inclusiv hash-uri de parole, date de business ale companiei). Severitate: **Ridicată** (date sensibile în clar pe disc, fără control de acces documentat/aplicat explicit în cod).
  - Remediere: aplicare `icacls` (SYSTEM + Administrators only) pe `%ProgramData%\OPSQAI\backups` la creare, similar cu tratamentul `config.json`/`jwt-signing.key`; opțional criptare la repaus (ex. cu o cheie derivată din config, sau folosind `pg_dump` + criptare GPG/age a arhivei `.tar.gz`).
- Task-ul programat de backup (`opsqai backup schedule`) rulează sub `SYSTEM` (`/RU SYSTEM` — `opsqai-windows/tools/service-manager/index.js:351`), consistent cu restul modelului de privilegii LocalSystem.

---

## 5. PostgreSQL încorporat

- `initdb` rulat cu `--auth-local=scram-sha-256 --auth-host=scram-sha-256` și parolă transmisă prin `--pwfile` (fișier temporar `mode 0o600`, șters imediat după) — **niciodată pe argv** (evită expunerea parolei în lista de procese) (`opsqai-windows/services/database/index.js:61-104`). **Control pozitiv puternic.**
- Parola superuser (`opsqai`) e generată cu `crypto.randomBytes(24).toString("base64url")` (24 bytes de entropie, ~192 biți) (`database/index.js:65`), persistată doar în `config.json` (protejat ACL, secțiunea 4). **Control pozitiv.**
- `postgresql.conf`/`pg_hba.conf` sunt reparate idempotent la fiecare pornire a serviciului (`ensure-config.js:35-90`), eliminând drift-ul care ar putea redeschide accesul non-loopback. **Control pozitiv** — proiectat explicit ca reacție la un bug istoric documentat în comentarii (`database/index.js:11-18`).
- Backup: `pg_dump -F c` (format custom, comprimat) — nu produce SQL în clar dar tot conține date sensibile necriptate în arhivă; vezi secțiunea 4 pentru lipsa ACL pe director.
- Restore: verifică integritatea SHA-256 înainte de `pg_restore`, oprește serviciile app/worker (nu și DB), restaurează cu `--clean --if-exists --no-owner --no-privileges` (`opsqai-windows/services/backup/restore.js:82-129`) — bune practici standard pentru restore curat.

---

## 6. Caddy — TLS

- `opsqai-windows/caddy-config/Caddyfile:1-20`:
  - `admin off` (linia 2) — dezactivează API-ul de administrare Caddy (care altfel ar asculta implicit pe `localhost:2019` fără autentificare) — **control pozitiv** (reduce suprafața de atac locală).
  - `local_certs` + `tls internal` (liniile 4, 15) — folosește CA internă Caddy, auto-semnată, "trusted into LocalMachine\Root by the bootstrapper" (comentariu linia 12-13). Aceasta e o soluție rezonabilă pentru un produs on-prem fără domeniu public, dar înseamnă că certificatul e valabil doar dacă CA e efectiv instalată în magazinul `LocalMachine\Root` — pasul de instalare a CA nu a fost inclus explicit în fișierele analizate din acest domeniu (bootstrap-ul menționează "trust Caddy CA" ca pas la linia `init.js:12`, dar codul concret al acelui pas nu a fost verificat aici) — **NEVERIFICAT** ca pas complet implementat/testat.
  - HTTP (`:80`) doar face `redir https://{host}{uri} permanent` (linia 8-10) — corect, nu servește conținut pe HTTP.
  - `encode gzip zstd` (linia 17) — fără antete de securitate suplimentare (HSTS, CSP, X-Frame-Options) configurate explicit în Caddyfile — pentru o instalare loopback-only riscul e redus, dar absența e notabilă. Severitate: **Scăzută** (context loopback/desktop, nu web public).
  - Nu există restricție explicită de bind doar la `127.0.0.1`/`localhost` pt. portul 80 (blocul `:80` ascultă pe toate interfețele implicit) — dacă mașina are o interfață de rețea expusă, portul 80 redirect ar fi accesibil din LAN. Severitate: **Scăzută-Medie** — recomandare: legare explicită `127.0.0.1:80` dacă produsul e menit strict local single-machine, sau documentare clară dacă accesul LAN e intenționat.
- Desktop shell (Electron) acceptă certificatul auto-semnat **doar** pentru `localhost`/`127.0.0.1` printr-un `setCertificateVerifyProc` explicit care respinge orice alt host (`opsqai-windows/desktop-shell/main.cjs:104-114`) — **control pozitiv** (nu e un `rejectUnauthorized:false` global, e verificare pe hostname).
- Totuși, apelurile HTTPS interne din `updater/apply.js:128-130` și `tools/service-manager/index.js:105,123,446` folosesc `rejectUnauthorized: false` **global** (nu restrâns pe hostname ca în desktop-shell) — acceptabil doar pentru că țintele sunt hardcodate la `https://localhost/...`, dar codul nu are o verificare defensivă a hostname-ului țintă. Severitate: **Scăzută** (risc teoretic de MITM local dacă un proces malițios ar redirecționa `localhost` — puțin probabil pe Windows fără otrăvire DNS locală, dar practica corectă e pinning explicit).

---

## 7. Flux de auto-update (staging, verificare, rollback)

Fișiere: `opsqai-windows/services/updater/index.js`, `apply.js`, `sign-manifest.js`.

- **Staging & verificare**:
  - Manifestul de update e semnat Ed25519; verificarea foloseşte o cheie publică fixată la build (`payload/updater/pubkey.pem`, instalată în `%ProgramFiles%\OPSQAI\updater\pubkey.pem`) — `verifyManifest()` respinge orice manifest nesemnat sau cu semnătură invalidă (`updater/index.js:165-174`). **Control pozitiv** (trust pinning, nu doar TLS CA).
  - Canonicalizare JSON determinstă (chei sortate) pentru semnare/verificare consistentă (`updater/index.js:66-79`, `sign-manifest.js:17-30`). Corect implementat simetric pe semnator/verificator.
  - Artefactul descărcat e verificat cu SHA-256 față de manifest **înainte** de a fi acceptat (`updater/index.js:116-163`, linia 148-152 respinge mismatch și șterge fișierul temporar). **Control pozitiv.**
  - Notă/limitare explicit documentată: verificarea semnăturii Authenticode a EXE-ului final e "delegated to Windows when the user launches the MSI" (`updater/index.js:13-14`) — pentru instalări silențioase (`/S /Update`, folosit de `apply.js:214-219`), acest lucru înseamnă că verificarea Authenticode **nu e forțată explicit de codul OPSQAI** — se bazează pe faptul că un EXE nesemnat/semnat greșit ar fi respins de politica SmartScreen/AppLocker a SO, dacă există. Severitate: **Medie** — recomandare: verificare explicită a semnăturii Authenticode în `apply.js` înainte de `runInstaller()`, nu doar SHA-256 (SHA-256 confirmă doar integritatea față de manifest, nu autenticitatea semnăturii de cod în sine, deși manifestul e deja semnat Ed25519 deci lanțul de încredere există, dar dublarea verificării ar reduce riscul unei compromiteri a cheii Ed25519 fără a compromite și certificatul de semnare cod).
- **Pre-flight** (`apply.js:153-175`): verifică hash-ul artefactului stage-uit, spațiu liber minim (4 GiB), expirarea licenței (blochează update dacă licența a expirat). **Control pozitiv** (previne actualizări pe sisteme fără resurse sau nelicențiate).
- **Snapshot înainte de update** (`apply.js:177-196`): apelează `opsqai backup create --kind pre-update` înainte de orice modificare. **Control pozitiv** — permite rollback de date, deși rollback-ul de date **nu e automat** (vezi mai jos).
- **Backup binare + rollback**: `robocopy /MIR` de la `ProgramFiles\OPSQAI` la `ProgramData\OPSQAI\rollback\<stamp>` înainte de a rula installer-ul (`apply.js:198-212`); la eșec, se restaurează automat cu robocopy înapoi (`apply.js:277-287`, apelat din blocul `catch` la liniile 392-413).
- **Fereastră de mentenanță + auto-apply**: implicit activ (`config.updates.automatic ??= true`, `services/common/config.js:47`), fereastră implicită 02:00–04:00 (`updater/index.js:180-183`, `config.js:52-53`). Aplicarea automată rulează **fără interacțiune umană** în fereastra respectivă — risc operațional (nu strict de securitate) dacă un update introduce o regresie: rollback automat de binare există, dar **rollback de bază de date e explicit dezactivat** ("Database restore is intentionally NOT automated here", `apply.js:399-402`), lăsând sistemul într-o stare de binare vechi + schimbări de schemă posibil aplicate parțial de `runMigrations()` (`apply.js:263-275`) dacă migrarea a rulat parțial înainte de eșecul de health-check. Severitate: **Medie** — risc de inconsistență schema-vs-binar în caz de eșec parțial al migrării, documentat dar nu complet acoperit tehnic (jurnalizat în `update_history`/`audit_log`, conform comentariului `apply.js:27`, dar acțiunea corectivă rămâne manuală).
- **Health-check post-update**: probă HTTPS pe `https://localhost/health` timp de până la 90s, cu `rejectUnauthorized:false` (`apply.js:124-149`) — vezi observația din secțiunea 6 despre lipsa hostname-pinning explicit (risc teoretic redus).
- **Istoric**: fiecare rulare de update scrie o linie JSONL în `update-history.jsonl` cu pași, rezultat, hash-uri (`apply.js:311-318, 342-421`) — bun pentru audit/trasabilitate. **Control pozitiv.**
- **Lock de concurență**: `apply.lock` cu `wx` (exclusive create) previne rulări paralele de update (`apply.js:68-84`). **Control pozitiv.**

---

## 8. Backup / restore (`opsqai-windows/services/backup/`, `tools/`)

- `create.js`: `pg_dump -F c` + `tar.exe -czf` peste dump + folder storage; calculează SHA-256 și înregistrează în `platform_snapshots` (DB) cu `tag`, `kind`, `created_by` (username OS), `host` (`create.js:104-140`). Bun pentru trasabilitate, dar (repetat din secțiunea 4) **fără criptare la repaus** și **fără ACL explicit pe directorul de output**.
- `restore.js`: verifică integritatea (SHA-256 din DB) înainte de orice acțiune distructivă (`restore.js:81-87`, delegă la `verify.js`), oprește doar Platform+Worker (DB rămâne activ, evitând downtime inutil al Postgres), extrage în director temp izolat (`fs.mkdtempSync`), rulează `pg_restore --clean --if-exists --no-owner --no-privileges`, sincronizează storage cu `robocopy /MIR`. **Bune practici standard**, deși comentariul la linia 142-145 recunoaște explicit că nu verifică strict codul de ieșire robocopy (>=8 = eroare reală) — risc mic de restore parțial de storage netratat ca eroare.
- `verify.js`: recalculează SHA-256 și compară cu valoarea din DB, marchează `verified_at`. Poate rula și pe cale arbitrară (`--path`) fără a necesita o intrare DB — util pentru verificare ad-hoc externă a arhivelor.
- `service-manager/index.js` (CLI `opsqai backup ...`): comenzi distructive (`create`, `prune`, `restore`, `schedule`, `unschedule`, `db reset`) verifică toate `isAdmin()` înainte de execuție (`index.js:75-330`, verificare prin `net session`) — **control pozitiv**, previne rulare de comenzi administrative dintr-un shell neprivilegiat. `opsqai db reset` are un guard suplimentar: refuză reset pe o instalare `complete` fără `--force` (`index.js:235-247`) — previne pierdere accidentală de date.
- Programarea automată (`opsqai backup schedule`) creează un Task Scheduler zilnic la 02:15 rulând ca `SYSTEM` (`index.js:331-360`) — consistent cu modelul general LocalSystem al produsului (vezi secțiunea 3).
- Nicio politică de retenție/criptare a backup-urilor vechi documentată în cod în afara `prune.js` (nu revizuit integral aici, dar apelat cu un număr de zile implicit 14, `index.js:301-309`).

---

## 9. Docker — implementare de referință

`docker/Dockerfile`, `docker/docker-compose.yml`, `docker/entrypoint.sh`, `docker/.env.example`.

### Pozitive
- Build multi-stage; imaginea finală rulează ca utilizator non-root dedicat `opsqai` (uid 10001) (`docker/Dockerfile:39,46`). **Control pozitiv.**
- `HEALTHCHECK` configurat, verifică endpoint intern `/api/public/v1/health` (`Dockerfile:49-50`).
- `entrypoint.sh` nu loghează niciodată secretele; comentariu explicit "MUST NOT be logged" (`docker/entrypoint.sh:5, 25-28`), fișierul de secrete e citit cu `set -a; . "$SECRETS_FILE"; set +a` doar dacă e prezent, degradare grațioasă dacă lipsește (`entrypoint.sh:29-38`).
- `.env.example` conține doar placeholder-e, cu avertisment explicit "NEVER commit the real .env" (`docker/.env.example:1-2`), consistent cu practica bună (dar vezi observația de mai jos despre `.env` real din rădăcina repo-ului, care e alt fișier, pt. proiectul principal Lovable, nu pentru Docker self-hosted).
- MC (Management Center) primește explicit doar câmpuri non-secrete la heartbeat, documentat și "enforced in code" (`docker/README.md:32-40`) — deși aplicarea efectivă (`src/lib/mc-secrets-blacklist.ts`) nu a fost verificată în acest audit (în afara domeniului cerut).

### Deficiențe / riscuri
- **Fără TLS în topologia docker-compose de referință**: serviciul `opsqai` publică portul 3000 direct pe gazdă (`ports: - "${OPSQAI_PORT:-3000}:3000"`, `docker-compose.yml:38-39`) fără niciun reverse proxy TLS (Caddy/Nginx) inclus în compose. Traficul HTTP e în clar dacă operatorul nu adaugă manual un proxy TLS. Severitate: **Ridicată** pentru un mediu de producție expus dincolo de localhost — documentația (`docker/README.md:12`) recomandă accesul pe `http://localhost:...`, dar `OPSQAI_PUBLIC_URL` din `.env.example:12` sugerează `https://opsqai.example.com`, indicând intenția de expunere publică fără ca stack-ul de referință să livreze TLS. Remediere: adăugare obligatorie a unui reverse-proxy TLS (Caddy cu ACME sau certificat operator) în `docker-compose.yml`, sau documentare explicită și proeminentă că expunerea directă a portului 3000 e nesuportată/nesigură.
- **Porturi expuse fără restricție de interfață**: maparea `"${OPSQAI_PORT:-3000}:3000"` leagă implicit pe `0.0.0.0` (toate interfețele gazdă) — dacă gazda are IP public, aplicația devine accesibilă direct din Internet fără TLS. Severitate: **Ridicată** (combinat cu punctul de mai sus).
- **Parole implicite slabe / prin convenție `change-me-strong-random`**: `.env.example` conține literal placeholder-ul `change-me-strong-random` atât pentru `POSTGRES_PASSWORD` cât și `MINIO_ROOT_PASSWORD` (`docker/.env.example:21,25`). Deși e doar un exemplu (nu o valoare implicită activă în cod), riscul e ca un operator neatent să copieze fișierul fără a schimba efectiv valoarea, iar Postgres/MinIO ar porni cu o parolă previzibilă și documentată public în orice clonă a repo-ului. Nu există nicio validare la pornire (`entrypoint.sh`, `docker-compose.yml`) care să respingă explicit `change-me-strong-random` ca valoare literală. Severitate: **Medie** — recomandare: `entrypoint.sh` sau un healthcheck de pre-boot să refuze pornirea dacă `POSTGRES_PASSWORD`/`MINIO_ROOT_PASSWORD` == valoarea placeholder documentată.
- **Postgres și MinIO fără TLS interior** (`docker-compose.yml:42-67`): comunicarea `opsqai` → `postgres`/`minio` se face în clar pe rețeaua bridge `opsqai-net`. Acceptabil dacă rețeaua Docker e izolată de gazdă/alte containere (implicit, un bridge Docker privat nu e accesibil din afara host-ului), dar nu există `internal: true` pe definiția rețelei (`docker-compose.yml:73-75`), deci alte containere de pe aceeași gazdă (dacă nu sunt pe aceeași rețea) nu ar avea acces implicit, însă niciun container din afara compose nu e izolat explicit prin politică — risc redus, notat ca observație. Severitate: **Scăzută**.
- **Secrete în variabile de mediu container** (`docker-compose.yml:21-37`): `POSTGRES_PASSWORD`, `MINIO_ROOT_USER/PASSWORD` sunt injectate ca variabile de mediu simple (nu Docker secrets/`_FILE` pattern) — vizibile prin `docker inspect` sau `/proc/<pid>/environ` pentru orice proces cu acces la host/daemon Docker. Severitate: **Scăzută-Medie** — recomandare: folosire Docker secrets sau montare de fișiere `*_FILE` pentru producție, documentat ca opțiune avansată.
- Nu există niciun mecanism de rotație de chei/parole documentat pentru topologia Docker (spre deosebire de partea Windows care are `ensurePassword()`/regenerare condiționată).

---

## 10. Instrumentul `installer/` (Go)

Fișiere: `installer/main.go`, `env.go`, `health.go`, `prereq.go`, `restore.go`, `browser.go`, `util.go` — nu au fost solicitate integral citite conform domeniului explicit al cererii (accent pe NSIS/winsw/desktop-shell), dar sunt listate ca parte a "Windows installer". Verificare de suprafață:
- Existența unui binar Go separat de instalare/restore sugerează o cale alternativă de instalare (posibil cross-platform sau CI); conținutul detaliat al `restore.go`/`prereq.go` **NEVERIFICAT** în acest raport — recomandare pentru o trecere separată de audit dedicată acestui modul.

---

## 11. Tabel severități — constatări principale

| # | Constatare | Severitate | Evidență | Remediere |
|---|---|---|---|---|
| 1 | Toate serviciile Windows (Database, Platform, Worker, Caddy, Updater) rulează implicit sub `LocalSystem` | Medie-Ridicată | `opsqai-windows/winsw-configs/*.xml` (lipsă `<serviceaccount>`) | Cont de serviciu dedicat cu privilegii minime per proces |
| 2 | Directorul de backup (`ProgramData\OPSQAI\backups`) fără ACL restrictiv explicit / fără criptare la repaus | Ridicată | `opsqai-windows/services/backup/create.js:75` | `icacls` SYSTEM+Administrators la creare; criptare arhivă |
| 3 | Docker compose de referință fără TLS, port aplicație expus pe toate interfețele | Ridicată | `docker/docker-compose.yml:38-39`, `docker/.env.example:12` | Adăugare reverse-proxy TLS obligatoriu în compose sau avertisment explicit |
| 4 | Placeholder de parolă `change-me-strong-random` fără validare la boot | Medie | `docker/.env.example:21,25` | Refuz de pornire dacă valoarea placeholder e detectată |
| 5 | Rollback automat de bază de date dezactivat explicit după update eșuat | Medie | `opsqai-windows/services/updater/apply.js:399-402` | Playbook/alertă operator + explorare restore semi-automat |
| 6 | Verificare Authenticode a EXE de update nu e forțată explicit în cod (doar SHA-256 + semnătură manifest) | Medie | `opsqai-windows/services/updater/index.js:13-14` | Validare explicită semnătură Authenticode înainte de `runInstaller()` |
| 7 | `answers.json` (instalare silențioasă) conține secrete în clar, fără ștergere automată post-instalare | Medie | `opsqai-windows/docs/unattended-install.md:40-47` | Ștergere automată de către installer după consum |
| 8 | Secrete Docker injectate ca variabile de mediu simple (nu Docker secrets) | Scăzută-Medie | `docker/docker-compose.yml:21-37` | Migrare la Docker secrets / pattern `_FILE` |
| 9 | Caddy `:80` fără bind explicit la loopback | Scăzută-Medie | `opsqai-windows/caddy-config/Caddyfile:8-10` | Bind explicit `127.0.0.1:80` dacă nu se dorește acces LAN |
| 10 | `rejectUnauthorized:false` global (nu pinned pe hostname) în updater/service-manager | Scăzută | `updater/apply.js:130`, `tools/service-manager/index.js:105,123,446` | Verificare hostname explicit ca în `desktop-shell/main.cjs:104-114` |
| 11 | Fișier `.env` real (chei publice Supabase) urmărit în git la rădăcina proiectului | Scăzută | `.env` (git tracked, `SUPABASE_PUBLISHABLE_KEY`) | Politică: doar chei publice/publishable în `.env` tracked; confirmare că nu conține niciodată chei secrete |

---

## 12. Controale pozitive confirmate (listă)

1. Instalator NSIS rulează cu `RequestExecutionLevel admin` explicit și verifică arhitectura x64 înainte de instalare (`OPSQAI-Setup.nsi:24,120-123`).
2. Fiecare parte a payload-ului de instalare e verificată SHA-256 (`certutil`) înainte de extragere, cu `Abort` la eșec (`OPSQAI-Setup.nsi:94-114`).
3. Ștergerea datelor la dezinstalare e implicită (nu păstrarea), prevenind moștenirea datelor unei companii anterioare (`OPSQAI-Setup.nsi:249-269`).
4. Nicio parolă hardcodată: parola admin e generată criptografic (24 caractere, alfabet fără ambiguități) și forțează schimbarea la prima autentificare (`opsqai-windows/services/bootstrap/init.js:112-129`, `admin-seed.mjs:76-91`).
5. `config.json`, `license.opsqai`, `jwt-signing.key` primesc `icacls` restrictiv (SYSTEM + Administrators only) după scriere (`init.js:377-379, 396-399, 424-427`).
6. Cheia privată de semnare JWT (Ed25519) e generată o singură dată și scrisă cu `mode 0o600` + ACL (`init.js:386-401`).
7. PostgreSQL încorporat: `scram-sha-256` obligatoriu (local + host), parolă transmisă doar via `--pwfile` temporar (șters imediat), niciodată pe linia de comandă (`opsqai-windows/services/database/index.js:61-104`).
8. Postgres legat exclusiv pe `127.0.0.1`, `pg_hba.conf` restricționat la loopback IPv4/IPv6 cu SCRAM, reparat idempotent la fiecare pornire (`opsqai-windows/services/database/ensure-config.js:14,23-26,35-90`).
9. `postgres.exe` rulează sub token restrâns (non-admin) via `pg_ctl`, respectând cerința nativă PostgreSQL de a nu rula ca administrator (`database/index.js:127-134`).
10. Caddy: `admin off` (dezactivează API de administrare neautentificat), HTTP→HTTPS redirect permanent, TLS intern cu CA proprie (`opsqai-windows/caddy-config/Caddyfile:2,8-10,15`).
11. Electron desktop-shell: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` pe toate ferestrele; acceptă certificatul auto-semnat doar pentru `localhost`/`127.0.0.1`, respinge orice alt host (`desktop-shell/main.cjs:239-244,266-273,104-114`); navigarea externă se deschide în browser, nu în fereastra aplicației (`main.cjs:281-291`).
12. Manifest de auto-update semnat Ed25519 cu cheie publică fixată la build (pinning), canonicalizare JSON deterministă pentru semnare/verificare (`updater/index.js:41,165-174`, `sign-manifest.js`).
13. Artefactele de update verificate SHA-256 față de manifest înainte de acceptare, cu ștergere a fișierului corupt (`updater/index.js:116-163`).
14. Flux de update cu pre-flight (spațiu disc, expirare licență), snapshot automat pre-update, backup binar (`robocopy /MIR`) și rollback automat de binare + health-check la eșec, istoric complet în `update-history.jsonl` (`apply.js:153-421`).
15. Lock exclusiv (`apply.lock`, creare `wx`) previne rulări concurente de update (`apply.js:68-84`).
16. Backup/restore: verificare integritate SHA-256 obligatorie înainte de orice restore distructiv (`backup/restore.js:81-87`, `verify.js`).
17. Toate comenzile administrative din CLI (`opsqai backup create/restore/prune/schedule`, `opsqai db reset`) verifică explicit `isAdmin()` înainte de execuție (`tools/service-manager/index.js:75,229,285,302,323,332,363`).
18. `opsqai db reset` are guard suplimentar împotriva resetării accidentale a unei instalări complete, necesitând `--force` (`service-manager/index.js:235-247`).
19. Imaginea Docker rulează ca utilizator non-root dedicat (`opsqai`, uid 10001) (`docker/Dockerfile:39,46`).
20. `entrypoint.sh` nu loghează niciodată conținutul fișierului de secrete, doar confirmă încărcarea (`docker/entrypoint.sh:5,29-38`).
21. Management Center primește documentat-explicit doar câmpuri non-secrete la heartbeat (`docker/README.md:32-40`).
22. `.env.example` (atât rădăcina cât și `docker/`) conțin doar placeholder-e, cu avertisment explicit de a nu comite fișierul real (`docker/.env.example:1-2`).

---

## 13. Concluzie

Arhitectura Self-Hosted Windows are un nivel de maturitate ridicat pentru un produs on-prem: gestionarea secretelor (parole generate, ACL explicite, chei de semnare protejate), verificarea de integritate pe toate căile de livrare de cod (installer payload + auto-update), și fluxul de rollback automat sunt bine gândite și implementate consecvent, cu comentarii care documentează explicit motivele deciziilor de securitate (semn al unei echipe care a iterat pe incidente reale). Cele două zone care necesită atenție prioritară sunt: (a) modelul de privilegii uniform `LocalSystem` pentru toate serviciile, care contrazice principiul minimului privilegiu, și (b) lipsa de TLS/hardening implicit în topologia Docker de referință, care riscă expunere directă dacă un operator o folosește "as-is" în producție fără proxy TLS suplimentar. Backup-ul necriptat/fără ACL explicit este cel mai concret risc de confidențialitate a datelor identificat.
