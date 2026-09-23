# Audit de securitate — OPSQAI Self-Hosted (2026-09)

Metodologie: analiză statică de cod/config, fără execuție. Fiecare afirmație are citare `path:line`. Ce nu a putut fi verificat din cod e marcat **NEVERIFICAT**.

## Sumar severități

| Severitate | Nr. constatări |
|---|---|
| Critical | 1 |
| High | 4 |
| Medium | 6 |
| Low | 4 |

---

## CRITICAL

### C1. Rutele `customer-writer`, `workspace-chat`, `internal-chat` ocolesc complet abstracția de autentificare Self-Hosted și folosesc direct Supabase Cloud
- **Dovadă**: `src/routes/api/customer-writer.ts:2-40`, `src/routes/api/workspace-chat.ts:4,44-58`, `src/routes/api/internal-chat.ts:9-13` instanțiază `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, ...)` și validează tokenul prin `supabase.auth.getClaims(token)`, în loc să folosească `getAuthProvider()`/`requireAuth` (`src/lib/providers/require-auth.ts:26-84`), care e singurul mecanism platform-agnostic (JWT EdDSA local pe Self-Hosted).
- **Impact**: Pe o instalare Self-Hosted reală (fără `SUPABASE_URL`), aceste 3 rute răspund `500 Server misconfigured` — deci sunt indisponibile — **cu excepția** cazului în care operatorul/instalatorul setează totuși `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` (de exemplu moștenite dintr-un mediu hibrid sau dintr-un `.env` de dezvoltare copiat din greșeală în producție — vezi C.env de mai jos). În acel caz, tokenul JWT emis de sistemul local (EdDSA, `iss=opsqai-selfhost`) nu va fi niciodată validat de acest client Supabase extern, dar dacă cineva controlează sau otrăvește acele variabile de mediu, un atacator poate folosi un JWT Supabase Cloud arbitrar pentru a trece verificarea acestor 3 rute, ocolind complet RBAC-ul, throttling-ul și sesiunile locale definite pentru Self-Hosted. Este o breșă arhitecturală de izolare tenant/edition: cod care presupune Cloud rulează neschimbat în bundle-ul Self-Hosted.
- **Remediere**: Toate rutele `src/routes/api/**` trebuie să obțină identitatea exclusiv prin `getAuthProvider().verifyAccessToken()` / `requireAuth` middleware, niciodată printr-un `createClient` Supabase codificat direct în handler. Adăugați un test de build (similar cu `opsqai-windows/build/__tests__/verify-ai-boundary.test.ts`) care interzice `@supabase/supabase-js` `createClient(` în afara `src/lib/providers/cloud/**`.

---

## HIGH

### H1. `/api/auth/password-reset-request` nu are limitare de rată (throttling)
- **Dovadă**: `src/routes/api/auth/password-reset-request.ts:6-26` — nicio verificare de tip `assertNotThrottled` (comparați cu `signin.ts:33` care apelează throttling-ul din `local-auth.server.ts:147-169`). `requestPasswordReset` din `local-auth.server.ts:316-330` interoghează `users.findByEmail` fără backoff.
- **Impact**: Un atacator poate trimite volum mare de cereri de resetare parolă pentru orice email, generând (a) flood de inserturi în `password_resets` (`migrations/selfhost/0002_local_auth.sql:13-17` arată doar index, fără rate-limit la nivel DB), (b) potențial flood de emailuri prin SMTP provider (`src/lib/providers/selfhost/smtp-notification.server.ts`) — DoS asupra contului de e-mail al clientului sau asupra jurnalului Windows Event Log pentru instalări air-gapped.
- **Remediere**: Aplicați aceeași bucket de throttling per `email:`/`ip:` ca la `signIn`, cu un plafon mai relaxat (ex. 5/oră).

### H2. Scurgere de erori interne către client în mai multe rute `/api/auth/*`
- **Dovadă**: `src/routes/api/auth/refresh.ts:30-33` returnează `{ error: msg }` unde `msg = e.message`, la fel `password-reset-confirm.ts:22-25` și `update-password.ts:44-47`. Mesajele posibile includ `refresh_token_reused`, `session_revoked`, `user_disabled` — utile unui atacator pentru a distinge stările interne ale unei sesiuni/tokenuri furate (session fixation / oracle de stare), spre deosebire de `signin.ts` care mapează explicit la mesaje generice (`signin.ts:44-54`) doar pentru unele cazuri.
- **Impact**: Amplifică atacuri de tip token-replay: un atacator care a interceptat un refresh token poate afla dacă acesta a fost deja rotit (`refresh_token_reused`) sau dacă sesiunea a fost revocată explicit de utilizator (`session_revoked`), informație care nu ar trebui expusă unui apelant neautentificat.
- **Remediere**: Normalizați răspunsurile de eroare publice la coduri opace (`invalid_refresh_token`), păstrând mesajele detaliate doar în logurile server-side.

### H3. Nicio politică de securitate HTTP (headers) pe aplicația web propriu-zisă
- **Dovadă**: Căutare exhaustivă `Strict-Transport-Security|X-Frame-Options|Content-Security-Policy|X-Content-Type-Options|Referrer-Policy` în `src/`, `docker/`, `opsqai-windows/` nu a găsit nicio setare pentru răspunsurile HTTP ale serverului aplicație (`docker/Dockerfile`, `src/routes/**`, `opsqai-windows/caddy-config/Caddyfile:1-20`). Singurele apariții sunt meta-tag-uri CSP în shell-ul Electron (`opsqai-windows/desktop-shell/renderer/error.html:5`, `splash.html:5`) — și acelea au `http-equiv=""` gol, deci tag-ul e inert și CSP-ul nu se aplică nici acolo.
- **Impact**: Fără `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, aplicația e vulnerabilă la clickjacking, MIME-sniffing și downgrade la HTTP dacă Caddy nu e prezent (ex. topologia Docker Compose, vezi H4).
- **Remediere**: Adăugați aceste headere fie în Caddyfile (`opsqai-windows/caddy-config/Caddyfile`), fie într-un middleware global TanStack Start, valabil pe ambele topologii de livrare (Windows + Docker).

### H4. Topologia `docker-compose.yml` publică aplicația direct pe HTTP, fără TLS/reverse-proxy
- **Dovadă**: `docker/docker-compose.yml:38-39` publică portul containerului `opsqai` (care ascultă simplu HTTP pe 3000, `docker/Dockerfile:36,47`) direct pe gazdă (`"${OPSQAI_PORT:-3000}:3000"`), fără niciun serviciu Caddy/TLS în acest compose (spre deosebire de varianta Windows care are `opsqai-windows/caddy-config/Caddyfile` cu `tls internal`). `OPSQAI_PUBLIC_URL` din `docker/.env.example:11` sugerează un URL `https://...`, dar nimic în compose termină TLS.
- **Impact**: Credențiale (JWT Bearer, cookie-uri, parole la login) circulă necriptate în clar pe rețea dacă operatorul expune acest port pe o interfață non-loopback fără un proxy TLS extern — configurație ușor de reprodus accidental (`docker/README.md` **NEVERIFICAT** dacă avertizează explicit).
- **Remediere**: Adăugați un serviciu Caddy/nginx cu TLS obligatoriu în `docker-compose.yml`, sau documentați foarte explicit că portul 3000 nu trebuie niciodată expus fără un reverse-proxy TLS în fața lui.

---

## MEDIUM

### M1. Fără RLS în Postgres — izolarea multi-companie e impusă exclusiv la nivel de aplicație
- **Dovadă**: `rg` pe `migrations/selfhost/*.sql` nu găsește niciun `ENABLE ROW LEVEL SECURITY` sau `CREATE POLICY`; singurele `GRANT`-uri explicite sunt în `migrations/selfhost/0004_update_history.sql:36-38` și `0023_document_images.sql:32`, ceea ce indică faptul că rolul aplicației (`opsqai`) e proprietarul/are acces implicit total pe toate tabelele. Separarea pe `company_id` se face în cod, ex. `resolveCompanyForWrite` din `src/lib/authorization.ts:107-118` și verificările de permisiune din `hasPermission` (`src/lib/authorization.ts:41-58`).
- **Impact**: Orice interogare SQL construită greșit sau orice injecție SQL într-un repository (`pg-*-repository.server.ts`) ocolește complet izolarea între companii — nu există a doua linie de apărare la nivel de bază de date, așa cum ar oferi RLS. Pentru un produs Self-Hosted mono-tenant per instalare acest risc e parțial atenuat (o singură companie „principală" de regulă), dar aplicația suportă explicit mai multe `company_id` (`companyFromStoragePath`, `src/lib/authorization.ts:100-104`), deci riscul de izolare inter-companie pe aceeași instanță este real.
- **Remediere**: Adăugați RLS pe tabelele cu `company_id` chiar și pe Self-Hosted, cu politici bazate pe un `SET LOCAL app.current_company_id` per conexiune/tranzacție, ca linie de apărare suplimentară.

### M2. Regulile anti-tamper ale `audit_log` pot fi ocolite de rolul proprietar al tabelei
- **Dovadă**: `migrations/selfhost/0001_bootstrap.sql:145-155` — `audit_log` are reguli `DO INSTEAD NOTHING` pe `UPDATE`/`DELETE`, dar nu blochează `TRUNCATE`, și regulile pot fi eliminate cu `DROP RULE`/`ALTER TABLE` de către proprietarul tabelei. Deoarece serviciul aplicație rulează cu rolul `opsqai`, care pare a fi proprietarul schemei (nu există un rol separat, mai restrictiv, doar pentru scriere în `audit_log`), o compromitere a serverului aplicație (RCE) permite atacatorului să șteargă urmele de audit prin `TRUNCATE public.audit_log;` sau `DROP RULE audit_log_no_delete ...`.
- **Impact**: Rezistența la falsificare a jurnalului de audit e doar parțială — protejează împotriva erorilor aplicației / injecțiilor SQL simple prin interfața obișnuită, dar nu împotriva unui atacator cu execuție de cod pe server sau acces direct la baza de date cu același rol.
- **Remediere**: Rulați scrierile în `audit_log` printr-un rol PostgreSQL separat, cu `GRANT INSERT` dar fără `TRUNCATE`/`DROP RULE`/`ALTER TABLE`, sau expediați audit log-ul și către un sistem append-only extern (WORM).

### M3. `/api/public/metrics` este neautenticat by design, fără mecanism implicit de restricție
- **Dovadă**: `src/routes/api/public/metrics.ts:7-9` — comentariul recunoaște explicit: "Deliberately unauthenticated ... Caddy is expected to gate this behind mTLS or an IP allowlist". Nu există nicio configurație implicită de acest gen în `opsqai-windows/caddy-config/Caddyfile:1-20`, care nu are niciun bloc de rută pentru `/api/public/metrics`.
- **Impact**: Pe o instalare implicită, contorul Prometheus e expus public pe orice rețea care poate ajunge la `https://localhost` — deși datele sunt declarate „non-sensibile", pot ajuta la fingerprinting-ul topologiei/versiunii instalării.
- **Remediere**: Adăugați în Caddyfile-ul livrat implicit un bloc care restricționează `/api/public/metrics` la loopback/rețea internă.

### M4. Chei/token-uri de resetare parolă livrate printr-un canal neverificabil din cod
- **Dovadă**: `local-auth.server.ts:316-330` comentează explicit: "The token is returned via a side channel (SMTP provider or Windows Event Log for air-gapped installs)". Implementarea reală a livrării (SMTP vs Event Log) e în `smtp-notification.server.ts`, care **NEVERIFICAT** dacă e apelată efectiv din fluxul de reset (nu s-a găsit un apel direct `requestPasswordReset -> smtp-notification` în fișierele examinate).
- **Impact**: Dacă livrarea prin Event Log e activă pentru instalări air-gapped, orice cont Windows local cu acces la Event Viewer (nu neapărat administrator, în funcție de ACL evenimente) ar putea citi token-ul de resetare al altui utilizator (TTL 30 min, `PASSWORD_RESET_TTL_SEC`, `local-auth.server.ts:29`).
- **Remediere**: **NEVERIFICAT** — necesită inspectarea codului de livrare (`smtp-notification.server.ts` complet + integrarea cu Event Log) pentru a confirma ACL-urile aplicate.

### M5. Token-urile DPAPI trec plaintext codificat base64 ca argument de linie de comandă către PowerShell
- **Dovadă**: `src/lib/providers/selfhost/dpapi-cipher.server.ts:132-146,148-159` construiesc un script PowerShell care conține `$bytes = [Convert]::FromBase64String("<inputB64>")` interpolat direct în șirul trimis ca argument `-Command`.
- **Impact**: Argumentele proceselor spawnate sunt vizibile altor procese/utilizatori administrativi de pe aceeași mașină (ex. prin Process Explorer / `Get-CimInstance Win32_Process`), inclusiv în trace-uri ETW sau în loguri de audit de proces Windows (Sysmon Event ID 1) dacă sunt activate. Chiar dacă scopul DPAPI e „LocalMachine" (orice cont autorizat poate decripta oricum), aceasta extinde suprafața de expunere a textului cifrat/plaintext-ului către instrumentarea de proces.
- **Remediere**: Transmiteți datele prin stdin (mecanismul e deja disponibil, `runPowerShell(script, stdin)` la linia 90-114) în loc de interpolare în script, pentru a evita apariția în linia de comandă.

### M6. Absența unei limitări de rată generale pe API — doar `tts.ts` și autentificarea au throttling
- **Dovadă**: Căutarea `rate.?limit|throttle` în `src/lib` și `src/routes` găsește protecție doar în `src/routes/api/tts.ts:16-39` (in-memory, per-proces, resetat la restart) și în fluxul de autentificare (`local-auth.server.ts`). Rutele `chat.ts`, `academy-chat.ts`, `workspace-chat.ts`, `internal-chat.ts`, `customer-writer.ts` nu au limitare de rată proprie.
- **Impact**: Un utilizator autentificat (sau, în cazul C1, un atacator care ocolește autentificarea) poate genera volum nelimitat de cereri către modelul AI configurat, ceea ce pe Self-Hosted cu motor local (Ollama) poate satura CPU/GPU-ul serverului (DoS), iar pe motor cloud poate genera costuri necontrolate.
- **Remediere**: Extindeți pattern-ul de „token bucket per IP/user" din `tts.ts` la toate rutele de chat/generare AI.

---

## LOW

### L1. Fișier `.env` cu chei Supabase publishable este urmărit în Git în rădăcina proiectului
- **Dovadă**: `git ls-files | grep '^\.env$'` confirmă că `.env` e urmărit; conținutul (`.env:1-6`) expune `SUPABASE_PUBLISHABLE_KEY` și `SUPABASE_URL` pentru proiectul de dezvoltare Cloud. `.gitignore` (`/dev-server/.gitignore`) nu conține o regulă pentru `.env`.
- **Impact**: Cheile „publishable" sunt prin design expuse publicului (folosite în browser), deci impactul de securitate e redus; totuși, practica de a comite `.env` e riscantă — un viitor secret real adăugat în același fișier ar ajunge accidental în istoricul Git. Relevanța pentru Self-Hosted: acest `.env` aparține mediului de build Lovable/Cloud, nu configurației Self-Hosted (`docker/.env.example`, `opsqai-windows/**` folosesc fișiere `.env`/`secrets.env` separate, ne-urmărite).
- **Remediere**: Adăugați `.env` în `.gitignore` la nivel de proiect și păstrați doar `.env.example`.

### L2. `verifyCanary()` din cifrul AES-GCM/DPAPI returnează `true` implicit când nu există canary provizionat
- **Dovadă**: `dpapi-cipher.server.ts:68-77,164-173` — `if (!deps.canary) return true;`.
- **Impact**: Dacă instalatorul omite provizionarea canary-ului (bug sau upgrade de la o versiune veche), verificarea de „drift" a cheii de criptare a secretelor devine un no-op silențios, mascând o eventuală cheie greșită/coruptă până la eșecul efectiv de decriptare a unui secret real.
- **Remediere**: Tratați absența canary-ului ca avertisment explicit în `doctor`/`health`, nu ca succes implicit.

### L3. Codurile de eroare returnate de `/api/public/v1/-_auth.ts` disting explicit `invalid_token_format` de `invalid_or_revoked_token`
- **Dovadă**: `src/routes/api/public/v1/-_auth.ts:40-53`.
- **Impact**: Diferența de mesaj (format greșit vs. cheie invalidă/revocată) oferă un atacator care încearcă chei API un semnal minor asupra faptului că a nimerit formatul corect (`opsq_` + hash), reducând ușor spațiul de căutare la brute-force. Risc redus deoarece token-ul e un hash SHA-256 de 256 biți, impracticabil de ghicit oricum.
- **Remediere**: Unificați ambele cazuri sub `invalid_or_revoked_token` cu status 401 identic.

### L4. `src/routes/api/public/resources.$file.ts` folosește `supabaseAdmin` (client Cloud) chiar și potențial pe build-uri care includ ambele platforme
- **Dovadă**: `src/routes/api/public/resources.$file.ts:25-26` importă necondiționat `@/integrations/supabase/client.server`, spre deosebire de `verify-certificate.ts:23-33` care ramifică explicit pe `isSelfHosted()`.
- **Impact**: Pe un build Self-Hosted complet, această rută (folosită pentru PDF-uri de marketing) ar eșua silențios (funcție lipsă/eroare de import) — impact funcțional minor, nu neapărat de securitate, dar arată aceeași lipsă de disciplină a graniței Cloud/Self-Hosted semnalată la C1. **NEVERIFICAT** dacă ruta e exclusă complet din bundle-ul Self-Hosted prin `opsqai-windows/build/verify-source-imports.mjs` (nume sugerează un verificator de graniță, dar conținutul nu a fost inspectat în acest audit).

---

## Constatări pozitive (control existent, verificat)

- **Hashing parole**: argon2id, `memoryCost=64 MiB`, `timeCost=3`, `parallelism=1` — parametri rezonabili — `src/lib/providers/selfhost/pg-user-repository.server.ts:20-25,53-55`. Verificare cu timp constant simulat pentru conturi inexistente: `pg-user-repository.server.ts:99-118`, `local-auth.server.ts:208-213`.
- **Lockout/throttling login**: backoff exponențial după 3 eșecuri, lockout dur de 15 min după 10 eșecuri, bucket per email ȘI per IP — `local-auth.server.ts:33-50,146-196`; tabelă dedicată `migrations/selfhost/0019_login_throttle.sql`.
- **Sesiuni**: access token EdDSA (Ed25519) de 15 min (`local-auth.server.ts:27`), refresh token opac de 32 octeți stocat doar ca hash SHA-256 (`local-auth.server.ts:68-74,105-110`), rotație obligatorie cu detecție de reluare (`refresh_token_reused`, `local-auth.server.ts:262,271-282`), revocare completă la logout și la reset de parolă (`local-auth.server.ts:234-247,351-362`). JWT respinge explicit `alg != EdDSA` (protecție anti algorithm-confusion) — `jwt-ed25519.server.ts:93-96`.
- **Autorizare**: `hasPermission`/`requirePermission`/`requirePlatformAdmin` centralizate în `src/lib/authorization.ts:41-95`, cu supra-scriere per-utilizator prin `area_rights` doar pe Self-Hosted (`hasAreaRightsRepository`, linia 60-63) și gating suplimentar pentru grace period de licență expirată (linia 50-52).
- **Stocare fișiere**: protecție anti path-traversal explicită și testată logic (`assertSafeKey`/`assertSafeBucket`/verificare `path.relative`) — `ntfs-storage.server.ts:30-47,67-77`.
- **Rețea Postgres (Windows)**: `listen_addresses='127.0.0.1'`, `pg_hba.conf` rescris mereu la `loopback + scram-sha-256` — `opsqai-windows/services/database/ensure-config.js:14,82`; postgres pornit sub token restricționat, nu ca administrator — `opsqai-windows/services/database/index.js:127-134`.
- **Secrete runtime (Docker)**: fișier `secrets.env` cu `chmod 600`, încărcat explicit fără logare — `docker/entrypoint.sh:20-35`.
- **Criptare la repaus**: AES-256-GCM cu IV/tag per mesaj și `timingSafeEqual` pentru canary, sau DPAPI `LocalMachine` cu entropie proprie — `dpapi-cipher.server.ts:40-79,117-175`.
- **Caddy**: `admin off`, redirect HTTP→HTTPS forțat, TLS intern — `opsqai-windows/caddy-config/Caddyfile:1-16`.

