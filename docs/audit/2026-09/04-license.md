# Audit sistem de licențiere OPSQAI — 2026-09-04

Domeniu: generare/stocare chei, semnare Ed25519 și plic de token, activare online/offline,
legare de instalație (tenant binding), copiabilitate licență, rezistență la falsificare/reuse,
suprafețe de bypass, expunere secrete în bundle-ul frontend, expunere date client, revocare/CRL,
expirare/reînnoire/manipulare ceas, și lanțul de update (descriptor, SHA-256, distribuție LAN peer,
instalare din fișier).

Metodologie: analiză statică a codului sursă citat mai jos (path\:line). Nicio modificare de cod nu a
fost făcută. Tot ce nu a putut fi verificat direct din cod/config este marcat **NEVERIFICAT**.

---

## 1. Generare și stocare chei de semnare (`license_signing_keys`, envelope encryption)

**Fapte verificate:**

- Cheile Ed25519 sunt generate lazy la prima cerere cu `generateKeyPairSync("ed25519")`
  (`src/lib/license-signing.server.ts:193`) și persistate în `license_signing_keys`
  (`src/lib/license-signing.server.ts:198-204`).
- Cheia privată este criptată la stocare cu AES-256-GCM, cheie derivată din secretul runtime
  `LICENSE_SIGNING_KEK` prin `SHA-256(raw)` (`src/lib/license-kek.server.ts:20-29`, `:38-45`).
  Formatul e `enc.v1.<ivB64>.<ciphertextB64>.<tagB64>` (`src/lib/license-kek.server.ts:10-11,44`).
- Rândurile vechi în plaintext sunt acceptate transparent și re-criptate la următoarea citire
  (`src/lib/license-signing.server.ts:177-185`, `license-kek.server.ts:48-51`).
- La nivel DB: `GRANT SELECT` inițial pe toată tabela către `authenticated`, apoi `REVOKE` urmat de
  `GRANT SELECT` doar pe coloanele publice (fără `private_key_pem`)
  (`supabase/migrations/20260708191855_a683c29d-fd22-4f10-a90e-7198e2024eee.sql:11,21-22`).
  RLS activ, policy permite `SELECT` metadate doar `platform_admin`
  (`...sql:13,16-18`). `service_role` are `ALL` (`...sql:12`).

**Constatări:**

### [MEDIU] KEK derivat prin hash simplu, nu KDF dedicat pentru chei de criptare
`createHash("sha256").update(raw,"utf8").digest()` (`src/lib/license-kek.server.ts:28`) transformă
secretul `LICENSE_SIGNING_KEK` într-o cheie AES de 32B. SHA-256 nu este un KDF cu "key-stretching"
(ex. HKDF/PBKDF2/Argon2); dacă `LICENSE_SIGNING_KEK` are entropie redusă (ex. o parolă slabă setată
manual la deploy), un atacator cu acces la ciphertext poate încerca atacuri prin dicționar offline
mult mai rapid decât cu un KDF lent. Notă: hash-ul este folosit aici corect ca derivare de cheie
simetrică AES — **nu** ca mecanism de integritate/semnare, deci nu se încalcă directiva
"never describe SHA hashing as encryption"; aici SHA-256 e un pas de derivare, iar criptarea reală e
AES-256-GCM (autentificat corect).
**Impact:** compromis al bazei de date + `LICENSE_SIGNING_KEK` slab → recuperare cheie privată Ed25519
→ falsificare nelimitată de licențe.
**Remediere:** derivă cheia KEK cu HKDF-SHA256 (cu salt/info fix) sau impune `LICENSE_SIGNING_KEK`
cu entropie minimă validată la boot (≥256 biți, generat random, nu introdus manual).

### [INFORMATIV] Fără rotație/versionare explicită a KEK
Nu există cod pentru rotația `LICENSE_SIGNING_KEK` (schimbare secret → re-criptare completă a
rândurilor). O schimbare a secretului fără migrare face toate rândurile `enc.v1.*` ilizibile
(`decryptPem` va arunca `Malformed encrypted PEM envelope` sau eșec GCM tag) — risc operațional, nu
de securitate per se. **NEVERIFICAT** dacă există proceduri operaționale de rotație în afara codului.

### [OK] Separarea privilegiilor cheii private este corectă
Coloana `private_key_pem` este exclusă explicit din `GRANT` pentru `authenticated`
(`...sql:21-22`), iar cererile aplicației folosesc `supabaseAdmin` (service role) pentru citire/scriere
(`license-signing.server.ts:169-175,198`). Acest control reduce corect suprafața față de un cont
`platform_admin` compromis la nivel API, dar nu față de acces direct la DB ca superuser/service_role.

---

## 2. Semnare Ed25519 și plic de token (JWT/`opsqai.v1.*`, claims)

**Fapte verificate:**

- Format token: `opsqai.v1.<payloadB64>.<sigB64>` (legacy) sau JWT standard EdDSA de 3 părți,
  `header.payload.signature` (`src/lib/license-signing.server.ts:96-105,108-131`).
- `signPayloadWithKey` include `kid` în header dar semnează doar `header.payload`
  (`:99-104`) — standard JWS, corect.
- Verificare: `edVerify` cu cheia publică din `license_signing_keys` după `key_id`
  (`:108-131`, `:337-377`). Verifică `license_version === 1`, `kind`, `expires_at`
  (`:311-327`).
- **Fără `nbf`/`iat` obligatorii** — payload conține `issued_at` dar nu este validat împotriva
  ceasului (`verifyLicenseTokenTyped`, `:311-327`, nicio verificare `issued_at <= now`).
- Claims `InstallLicensePayload` includ `customer`, `seats`, `profile`, `products`,
  `core_capabilities` — plaintext (nesecrete criptografic, doar semnate)
  (`license-signing.server.ts:47-60`).

**Constatări:**

### [MEDIU] Lipsă verificare `issued_at` / fereastră de valabilitate viitoare
Un token cu `issued_at` în viitor sau extrem de vechi este acceptat câtă vreme semnătura e validă și
`expires_at` nu a trecut (`verifyLicenseTokenTyped`, `license-signing.server.ts:311-327`). Nu schimbă
suprafața de atac major (semnătura tot protejează conținutul), dar elimină un strat de apărare-în-adâncime
împotriva reluării unor tokenuri revocate-apoi-reemise cu ID identic dacă logica de rotație a
`key_id` ar eșua. **Impact:** redus. **Remediere:** validează `issued_at <= now + toleranță`.

### [OK] Rezistență la falsificare a semnăturii
Ed25519 (EdDSA) e un algoritm modern, fără confuzie de algoritm posibilă (spre deosebire de JWT cu
`alg: none` sau HMAC/RSA confusion) — headerul e generat server-side, nu e citit de la client pentru a
alege algoritmul (`signPayloadWithKey`, `:97-104`; verificarea nu inspectează `header.alg` deloc — vezi
mai jos).

### [SCĂZUT] Header `alg`/`kid` neinspectat la verificare (nu doar `payload.key_id`)
`splitAndVerify` (`license-signing.server.ts:108-131`) nu validează câmpul `alg` din header JWT înainte
de a apela `edVerify` cu cheia publică Ed25519 — dar cum `createPublicKey`/`edVerify` din Node forțează
tipul de cheie (Ed25519), o confuzie de algoritm (ex. RS256/HS256) nu este exploatabilă practic aici
pentru că `edVerify` ar eșua cu o cheie non-Ed25519. Risc teoretic scăzut, dependent de comportamentul
intern al `node:crypto`. **NEVERIFICAT** exhaustiv pentru toate versiunile Node suportate.

---

## 3. Activare online vs offline

**Fapte verificate (Cloud → `license-import.server.ts`):**

- `verifyTokenForImport` verifică semnătura cu cheia publică din DB găsită după `key_id`
  (`license-import.server.ts:36-44,50-87`), validează `kind` (install/module),
  `install_id` opțional, și `isValidModuleKey` (`:77-80`).
- `importLicenseToken` face upsert în `licenses`, autoritatea rămânând semnătura, DB e doar cache
  (comentariu `:12-13`, cod `:94-181`).
- CRL: `importRevocationList` parsează manual `key_id` din payload fără verificare semnătură înainte
  de a încărca cheia (`:196-215`) — dar semnătura CRL e verificată explicit după (`verifyCrl`, `:213`)
  înainte de aplicare — corect, "trust but verify".

**Fapte verificate (Self-Hosted → `selfhost-license-activation.server.ts`):**

- Verificare locală cu cheia publică pinned pe disc (`OPSQAI_LICENSE_PUBLIC_KEY_PATH`)
  (`:46-50`).
- `activateSelfHostLicense` scrie tokenul brut pe disc ca fișier de licență
  (`writeFile(file, token.trim())`, `:192`) — fără nicio protecție suplimentară a fișierului (permisiuni
  OS out-of-scope pentru acest audit, **NEVERIFICAT**).
- Legare la owner: apel la `checkLicenseOwner`/`bindInstallationOwner`
  (`:184-193`) — detaliat în secțiunea 4.

**Constatări:**

### [RIDICAT] `exportActivationBundle`/`importActivationBundle` la Self-Hosted acceptă JSON bundle "spart" fără verificare a integrității ansamblului
La calea Self-Hosted, dacă bundle-ul e JSON (nu JWT), fiecare `install_token`/`module_tokens[].signed_token`
este activat individual prin `activateSelfHostLicense` (`license-activation.functions.ts:130-153`) —
fiecare componentă e verificată separat (semnătură Ed25519 proprie), deci nu e o breșă de autenticitate,
dar bundle-ul JSON **nu are propria semnătură pe ansamblu** (spre deosebire de varianta JWT semnată din
`signBundleAsJwt`, `license-activation-core.server.ts:16-26`). Un atacator cu acces la tokenuri semnate
individual (de exemplu scurse din endpoint-ul de heartbeat, vezi §7) poate re-asambla un bundle JSON
arbitrar (alt `install_id`, alte module) — fiecare piesă rămâne verificată intrinsec, deci impactul e
limitat la "recombinare de artefacte deja valide", nu la falsificare de conținut nou.
**Impact:** mediu — permite mixarea/replay-ul de tokenuri module valide obținute din altă sursă către o
instalație țintă, dacă `install_id` din tokenuri corespunde.
**Remediere:** cere semnătura JWT a bundle-ului (`bundle_version`, `install_id`, listă de `key_id`) chiar
și pe calea Self-Hosted, în loc să accepte JSON neautentificat ca-atare.

### [OK] Verificarea offline nu are cale de bypass a semnăturii
Toate căile de import (Cloud și Self-Hosted) trec obligatoriu prin `verifyCompactToken`/`splitAndVerify`
înainte de orice scriere persistentă (`license-import.server.ts:50-87`,
`selfhost-license-activation.server.ts:72-135,162-195`). Nu există cale de "preview" sau "activare" care
să scrie fără verificare reușită.

---

## 4. Legare de instalație (Tenant Binding) și copiabilitatea unei licențe

**Fapte verificate:**

- `companyKey()` (`src/lib/selfhost-tenant-binding.server.ts:23-30`) calculează cheia de identitate
  **preferând numele companiei** (`name:<lowercase trimmed>`) și doar dacă lipsește numele, cade pe
  `install:<install_id>`. Deci legarea de tenant e legată de **numele clientului din claim-ul `customer`
  al licenței**, nu de `install_id` sau de vreun fingerprint hardware.
- `checkLicenseOwner` (`:115-125`): dacă instalația nu are deja un owner înregistrat
  (`installation_identity` gol), **orice licență e acceptată necondiționat** și devine owner
  (`{ ok: true, bound: false }`, `:120`). Nu există fingerprint de mașină/hardware ID implicat.
- `bindInstallationOwner` (`:78-104`) scrie `install_id`+`company_key`+`company_name` într-un singur
  rând `installation_identity` (PK `id BOOLEAN` — un singur rând posibil,
  `migrations/selfhost/0037_installation_identity.sql:16-23`).

**Constatări:**

### [CRITIC] O licență de instalare este liber copiabilă pe orice instalație "virgină" (fără hardware binding)
`checkLicenseOwner` (`selfhost-tenant-binding.server.ts:115-125`) nu compară `install_id` din licență
cu nimic legat de mașina fizică/containerul curent — verifică doar dacă un `company_key` diferit e deja
legat. O instalație nouă (`installation_identity` gol) **acceptă orice licență validă semnat, indiferent
de `install_id`**, și o adoptă ca owner. Combinat cu faptul că verificarea locală a `install_id`
(`selfhost-license-activation.server.ts:105-108`) compară doar cu `OPSQAI_INSTALL_ID` din mediul local —
o variabilă de configurare pe care operatorul o poate seta la orice valoare — un atacator care obține
fișierul `license.opsqai` (sau tokenul brut) de la un client poate:
  1. Instala o copie proaspătă OPSQAI (bază de date goală → `installation_identity` gol);
  2. Seta `OPSQAI_INSTALL_ID` = install_id-ul din licența furată;
  3. Activa licența furată fără nicio respingere (`checkLicenseOwner` → `bound:false` → acceptă).

Nu există niciun secret legat de hardware, MAC, TPM sau ID de mașină generat random la instalare care să
facă o licență "nețransferabilă" tehnic — protecția e complet software și configurabilă de operator.
**Impact:** o licență plătită pentru 1 instalație poate fi rulată nelimitat pe orice număr de instalații
noi, atâta timp cât fiecare știe/setează același `install_id` — **eludare directă a modelului de
licențiere per-instalație**.
**Remediere:**
  - Generează un `install_id`/secret de instalare local, aleator, la prima pornire, stocat doar local
    (nu configurabil de operator prin variabilă de mediu vizibilă), și include-l ca parte a procesului
    de activare (challenge-response cu MC în loc de simplă comparație text).
  - La activare, verifică unicitatea `install_id` global (server-side, la MC) — de exemplu, refuză
    heartbeat-uri concurente cu `signed_token` identic de la IP-uri/fingerprint-uri de mașină diferite,
    sau implementează "activation seat" cu revocare a activării anterioare.

### [RIDICAT] Legarea per-tenant se bazează pe numele companiei, coliziuni posibile
`companyKey` normalizează numele (`trim().toLowerCase().replace(/\s+/g," ")`,
`selfhost-tenant-binding.server.ts:27`) — două companii cu nume similare/identice (ex. filiale, nume
comune) ar produce aceeași cheie, permițând activarea încrucișată a licențelor între ele fără avertisment
de "altă companie". **Impact:** mediu, expunere accidentală de date multi-tenant pe aceeași instanță.
**Remediere:** folosește un identificator stabil (UUID intern al companiei din emiterea licenței), nu
un nume text normalizat.

---

## 5. Rezistență la falsificare, modificare și reuse

**Fapte verificate:**

- Falsificare conținut: imposibilă fără cheia privată Ed25519 — orice modificare a payload-ului invalidează
  semnătura (`edVerify`, `license-signing.server.ts:116,123`). **OK**, semnătură pe payload complet, nu
  doar pe un subset.
- Reuse/replay: un token valid semnat rămâne valid pe orice instalație care are cheia publică pinned și
  fie nu are `expected_install_id` setat, fie îl setează manual identic — vezi §4 (CRITIC).
- Revocare per-token nu invalidează un token deja copiat pe alt `install_id`-config dacă acel `install_id`
  nu apare (încă) în `licenses` (comentariu explicit `license-signing.server.ts:371-373`: "absența unui
  rând nu e fatală"). **Impact:** o instanță complet offline/air-gapped cu un token furat nu va fi
  niciodată verificată contra CRL dacă nu importă manual CRL-ul — comportament documentat ca fiind
  intenționat pentru rezistență offline, dar reduce rezistența la reuse pentru instanțe care nu
  sincronizează CRL. **[MEDIU]** — Remediere: forțează o expirare relativ scurtă (`expires_at`) pentru
  instalări noi/neîncrezute, combinat cu heartbeat obligatoriu periodic pentru instanțele cu conectivitate.

---

## 6. Suprafețe de bypass a validării

**Fapte verificate:**

- `evaluateModuleAccess` (`license-enforcement.server.ts:62-98`) e funcția centrală, unic punct de decizie,
  apelată din `requireModule`/`assertModule`/`assertModuleForCompany`. Nu am găsit cale alternativă de
  verificare a modulelor care ocolească acest fișier (căutare `isValidModuleKey`/`requireModule` limitată
  la acest modul, verificare manuală a apelanților nu a fost extinsă la toate rutele — **NEVERIFICAT**
  exhaustiv pentru toate cele ~global routes ale aplicației).
- CORE capabilities sunt mereu permise cu doar o licență de instalare validă, necondiționat de plată de
  modul (`:82-89`) — comportament documentat intenționat ("Core is never deniable by module licensing").
- Self-Hosted: `requireModule` (`:138-164`) — dacă `ent.coreCapabilities === null` (adică
  `core_capabilities` lipsește din claim, cazul licențelor legacy), verificarea suplimentară de core e
  omisă complet (`:146`, condiție `coreCapabilities !== null`) — comportament de compatibilitate
  descendentă documentat ca "legacy all-Core" (`license-signing.server.ts:58`).

**Constatări:**

### [SCĂZUT] Enforcement "fail-open" pe eroare de citire licență la readonly-grace
`isLicenseReadOnly()` (`license-readonly.server.ts:38-49`) este explicit "fail-open": orice eroare la
citirea entitlements → `readOnly=false` (scrieri permise) (`:44-45`, comentariu `:35`). Aceasta e o decizie
de business documentată (nu bloca clientul din cauza unei erori tranzitorii), dar înseamnă că o eroare
provocată deliberat în providerul de licențiere (ex. corupere fișier licență) menține scrierile deblocate
în loc să le restricționeze. **Impact:** scăzut spre mediu, în funcție de cât de ușor un atacator local
poate provoca acea eroare. **Remediere:** fail-closed cu cache de ultimă stare bună, în loc de fail-open
necondiționat, sau limitează fereastra de grație la un TTL scurt după eroare.

### [INFORMATIV] Cache TTL 60s pentru starea read-only
`TTL_MS = 60_000` (`license-readonly.server.ts:31`) — o revocare/expirare proaspătă poate rămâne
neaplicată timp de până la 60s pe acel proces. Impact minor.

---

## 7. Expunere secrete în bundle frontend / expunere date client

**Fapte verificate:**

- `license-activation-panel.tsx` este un client component ce apelează exclusiv `createServerFn`
  (`importActivationToken`, `previewActivationToken`, `importActivationBundle`,
  `:9-13`) — verificarea semnăturii rulează server-side, nu există cheie publică/privată inclusă în
  JS-ul livrat browserului pentru acest flux (`:30-35` comentariu confirmă design-ul).
- `getLicenseEntitlements` (`license.functions.ts:11-29`) expune către browser doar
  `LicenseEntitlements` (edition, seats, modules, expiresAt etc.) — nu conține tokenul semnat brut sau
  cheia. **OK** pentru acest endpoint.
- **[RIDICAT] `heartbeat.ts` — endpoint public neautentificat expune tokenul semnat complet**:
  `POST /api/public/v1/license/heartbeat` (`src/routes/api/public/v1/license/heartbeat.ts:1-96`) este
  explicit "low-trust", identifică apelantul **doar prin `install_id`** (comentariu `:5-8`), fără nicio
  autentificare (fără semnătură, fără secret în request). Răspunsul include
  `latest_token: lic.revoked ? null : lic.signed_token` (`:90`) — adică **tokenul de licență semnat
  complet**, plus `revoked_reason` (text liber, potențial informație de business/suport internă) (`:87`).
  `install_id` respectă doar regex slab (`z.string().min(3).max(64)`, `:14`), fără proof-of-possession.
  Orice terț care ghicește/cunoaște un `install_id` (posibil predictibil — ex. slug al numelui companiei,
  conform pattern-ului folosit la emitere `InstallIdSchema` din `license-activation.functions.ts:14-18`,
  regex `^[a-z0-9][a-z0-9-]{2,}$`) poate obține tokenul complet de licență al clientului respectiv fără
  nicio autorizare.
  **Impact:** scurgere directă a artefactului de licență (inclusiv `customer`, `seats`, expirări) și,
  combinat cu §4 (CRITIC — lipsă hardware binding), permite clonarea completă a licenței pe o instalație
  nouă doar cunoscând/ghicind `install_id`-ul țintă. Acesta este cel mai direct vector de
  **"copiere a licenței pe altă instalație"** identificat în audit.
  **Remediere:**
  - Nu returna niciodată `signed_token` complet pe un endpoint neautentificat identificat doar prin
    `install_id`; cere un secret de heartbeat (HMAC cu o cheie per-instalație emisă la activare) sau
    limitează răspunsul la câmpuri strict necesare fără tokenul semnat brut (clientul deja îl are local).
  - Adaugă rate limiting/allowlisting IP și logare a cererilor cu `install_id` necunoscut pentru
    detectarea enumerării.
  - Alternativ, cere clientului să trimită propriul `signed_token` curent ca proof-of-possession (similar
    cu `updates/check.ts`, care CERE `signed_token` — vezi mai jos, contrast pozitiv).

### [OK, contrast pozitiv] `updates/check.ts` cere proof-of-possession
Spre deosebire de `heartbeat.ts`, endpoint-ul `/api/public/v1/updates/check`
(`src/routes/api/public/v1/updates/check.ts:74-79`) cere explicit `signed_token` valid al instalației și
verifică prin `verifyHeartbeatInstallTokenFromDb` înainte de a răspunde — design corect, ar trebui aplicat
și la `heartbeat.ts`.

### [SCĂZUT] `releases.ts` expune public cheia publică de semnare — comportament intenționat, dar fără autentificare/rate limiting
`GET /api/public/v1/license/releases` expune `public_key_pem` necondiționat (`releases.ts:73-80`) —
aceasta e o cheie publică, deci nu e secretă prin design (necesară pentru pinning în setup wizard), însă
endpoint-ul e complet neautentificat și fără rate limiting vizibil în cod, expunând și `checksum`-uri și
URL-uri semnate de storage (`createSignedUrl`, `:47-49,55-57`, validitate 3600s) — expunerea de link-uri
semnate temporare către oricine interoghează endpoint-ul public e o suprafață minoră de enumerare, dar nu
un secret pe termen lung.

---

## 8. Revocare / CRL

**Fapte verificate:**

- CRL semnat Ed25519, format `opsqai-crl.v1.<payloadB64>.<sigB64>` (`license-crl.server.ts:8-10,41-45`).
- Verificare strictă a versiunii și semnăturii înainte de aplicare (`verifyCrl`, `:53-73`).
- Aplicarea la Self-Hosted actualizează local `licenses.revoked/suspended` pe bază de
  `install_id`+`kind`(+`module_key`) (`license-import.server.ts:216-232`).
- La Cloud, `verifyLicenseTokenFromDb` respinge explicit un token al cărui rând DB e `revoked=true`
  (`license-signing.server.ts:371-374`).

**Constatări:**

### [MEDIU] Revocarea nu are efect dacă instalația nu importă niciodată CRL sau nu contactează heartbeat-ul
Pentru instalări complet offline/air-gapped fără import manual periodic al CRL (`importRevocationListFn`,
`license-activation.functions.ts:196-205`), un token revocat rămâne funcțional local la infinit — acesta
e un compromis documentat pentru suportul air-gapped, dar reprezintă o fereastră de exploatare completă
pentru orice instalație care alege să nu se conecteze niciodată. **Remediere:** impune o
`expires_at`/`maintenance_expires_at` obligatorie relativ scurtă pentru toate licențele noi, forțând
astfel re-validare periodică chiar și offline (prin re-emitere), reducând fereastra de expunere a unui
token revocat dar nesincronizat.

---

## 9. Expirare / reînnoire / manipulare a ceasului

**Fapte verificate:**

- Toate verificările de expirare folosesc `Date.now()`/`new Date()` local, fără sursă de timp externă/NTP
  securizată (`license-signing.server.ts:315,323`; `license-enforcement.server.ts:53-56,66`;
  `update-discovery.server.ts:191,197`).
- Read-only grace la expirare (nu blocare totală) — `license-readonly.server.ts:38-49`, comportament
  intenționat de business continuity.

**Constatare:**

### [MEDIU] Manipularea ceasului de sistem al instalației Self-Hosted poate reactiva o licență expirată
Deoarece nu există nicio validare a timpului față de o sursă externă de încredere (ex. server NTP
autentificat, sau ultim `issued_at`/`validated_at` monoton persistat undeva imun la rollback), un
operator/atacator cu acces la mașina Self-Hosted poate seta ceasul sistemului înapoi în timp pentru a
face ca un `expires_at`/`maintenance_expires_at` deja depășit să pară încă valid, redeschizând modulele
plătite și update-urile (`update-discovery.server.ts:191` compară `expires_at * 1000 < Date.now()`, la
fel `checkAvailable...` folosește ceasul local exclusiv).
**Impact:** ocolire a expirării licenței/mentenanței prin manipularea ceasului local — clasă de risc
comună la orice sistem de licențiere pur local, dar nemitigat aici.
**Remediere:** persistă un "high-water mark" monoton (ultimul timestamp server confirmat via heartbeat/
update-check) și refuză ceasuri locale care regresează sub acel prag; sau ancorează validarea critică
(module plătite) la confirmare periodică online cu MC, nu doar la claims locale.

---

## 10. Lanțul de securitate al update-urilor

**Fapte verificate:**

- Descriptorul de update e semnat Ed25519 cu **aceeași cheie de licențiere** pinned local
  (`license-signing.server.ts:260-286`; verificare `update-discovery.server.ts:184-197`).
- Cross-check strict: `claims.kind==="update"`, `claims.install_id` == install_id local,
  `expires_at` (55 min, `updates/check.ts:208`) nu a trecut, și **campurile plain din body HTTP trebuie să
  coincidă exact cu cele din interiorul descriptorului semnat** (`version`, `url`) înainte de acceptare
  (`update-discovery.server.ts:194-196`) — proiectare corectă anti-tamper pentru un proxy MITM care ar
  încerca să schimbe doar JSON-ul plain fără a putea refalsifica semnătura.
- SHA-256 verificat **de fiecare dată** înainte de a considera pachetul utilizabil, indiferent de sursă:
  - descărcare directă (`downloadAvailableUpdate`, `update-discovery.server.ts:554-557`);
  - fișier încărcat manual de operator (`stageUpdateFromStagedPath`, `:442-446`);
  - obligatoriu prezent (`no_checksum` dacă lipsește, `:428-431`).
- Distribuție LAN peer: endpoint dedicat, dezactivat implicit (`peer.serve` default false,
  `readPeerUpdateSettings`, `update-discovery.server.ts:297-310`), protejat cu comparație
  **constant-time** a tokenului (`timingSafeEqual`, `peer-package.ts:9-15,31`), servește doar pachete deja
  verificate local (`storedPackage`, apelat după ce SHA-256 a fost validat la descărcarea inițială,
  `:38-39`), și bytes-urile primite de la peer sunt **re-verificate integral** cu SHA-256 înainte de
  utilizare, indiferent de sursă (`fetchUpdateBody` doar aduce bytes, hash-ul se calculează mereu în
  `downloadAvailableUpdate`, `:506,554-557`) — deci un peer compromis/MITM pe LAN nu poate injecta un
  pachet modificat fără a eșua verificarea checksum.
- "Install-from-file" (upload manual/chunked): verifică `uploadId` cu regex strict
  (`/^[a-z0-9-]{8,64}$/i`, `:385,402`), acumulează chunk-uri, apoi obligă potrivirea SHA-256 cu
  `readAvailableUpdate()` (descriptorul deja verificat local) înainte de a considera fișierul instalabil
  (`stageUpdateFromStagedPath:442-446`) — nu poate fi folosit pentru a instala un artefact arbitrar
  nesemnat de MC, doar pentru a "alimenta manual" un update deja anunțat/semnat.

**Constatări:**

### [OK] Lanțul de update este proiectat corect end-to-end
Semnătură Ed25519 pe descriptor + cross-check plain-vs-semnat + verificare SHA-256 obligatorie la orice
punct de intrare a bytes-urilor (rețea directă, peer LAN, upload manual) + autentificare constant-time
pentru peer token. Nu am identificat o cale prin care un fișier neconform cu descriptorul semnat de MC
poate ajunge să fie marcat "verified"/instalabil.

### [SCĂZUT] Fereastra de 55 minute a descriptorului de update + lipsă legare la nonce per-cerere
`expires_at: now + 55*60` (`updates/check.ts:208`) — un descriptor capturat de un atacam intern (MITM cu
TLS compromis, sau proxy corporate cu inspecție) rămâne reluabil timp de aproape o oră către aceeași
instalație (`install_id` legat, deci nu e reluabil pe altă instalație) fără a schimba semnificativ
suprafața de atac, dat fiind că oricum conținutul e ancorat la `install_id` și fiecare pachet e verificat
prin hash. Risc rezidual minor. **NEVERIFICAT** dacă TLS/HSTS sunt aplicate corect la nivel de transport
(în afara scope-ului de fișiere analizate).

### [INFORMATIV] `size` anunțat e doar orientativ, nu parte a verificării de integritate
Descriptorul poartă `size`, dar decizia finală se bazează exclusiv pe SHA-256
(`update-discovery.server.ts:500-505,554-557`) — proiectare corectă, mărimea fiind folosită doar pentru
UI de progres.

---

## 11. Expunere informații despre client (customer info)

**Fapte verificate:**

- `licenses.functions.ts:61` — interogarea listei de licențe pentru MC include `company_name`,
  `contact_email`, `notes`, `handover_notes` — protejată de `requirePlatformAdmin`
  (verificat indirect prin utilizarea în alte handlere din același fișier, ex. `:104-111`).
  **NEVERIFICAT** dacă *toate* handlerele din `licenses.functions.ts` (nu doar `issueLicense`) aplică
  `requirePlatformAdmin`+`assertInstallInScope` consecvent — recomand verificare punctuală suplimentară
  în afara domeniului acestui audit (fișier de ~500+ linii, nu a fost citit integral).
- Vezi §7: `heartbeat.ts` expune `revoked_reason` (text liber potențial confidențial) fără autentificare.
- Claim-ul `customer` din tokenul de licență e plaintext (semnat, nu criptat) — vizibil oricui
  decodează Base64URL payload-ul (design intenționat pentru JWT-uri, dar de reținut: fișierul
  `license.opsqai` de pe disc conține numele clientului în clar pentru oricine are acces la fișier local).

---

## Sumar constatări pe severitate

| # | Severitate | Constatare | Locație principală |
|---|---|---|---|
| 1 | **CRITIC** | Licența de instalare e liber copiabilă pe orice instalație nouă — fără hardware/machine binding, doar `install_id` configurabil de operator | `selfhost-tenant-binding.server.ts:115-125`, `selfhost-license-activation.server.ts:105-108` |
| 2 | **RIDICAT** | Endpoint public neautentificat `heartbeat.ts` expune tokenul de licență semnat complet + `revoked_reason` doar pe baza `install_id` ghicibil | `src/routes/api/public/v1/license/heartbeat.ts:50-92` |
| 3 | **RIDICAT** | Legare de tenant bazată pe nume de companie normalizat, nu pe ID stabil — coliziuni posibile între companii | `selfhost-tenant-binding.server.ts:23-30` |
| 4 | **RIDICAT** | Import bundle JSON (necesemnat pe ansamblu) la Self-Hosted permite recombinarea de tokenuri module valide obținute din altă sursă | `license-activation.functions.ts:130-153` |
| 5 | **MEDIU** | KEK derivat prin SHA-256 simplu din secret, fără KDF cu stretching | `license-kek.server.ts:20-29` |
| 6 | **MEDIU** | Manipularea ceasului local poate ocoli expirarea licenței/mentenanței (fără sursă de timp externă) | `license-enforcement.server.ts:53-56`, `update-discovery.server.ts:191` |
| 7 | **MEDIU** | Revocare (CRL) fără efect pentru instalații care nu sincronizează niciodată | `license-import.server.ts:194-240` |
| 8 | **MEDIU** | Lipsă validare `issued_at` la verificarea tokenurilor | `license-signing.server.ts:311-327` |
| 9 | **SCĂZUT** | Enforcement fail-open la eroare de citire a licenței (read-only grace) | `license-readonly.server.ts:38-49` |
| 10 | **SCĂZUT** | Fereastră de 55 min pentru descriptorul de update, reluabil (dar legat de `install_id`) | `updates/check.ts:208` |
| 11 | **SCĂZUT** | Header JWT `alg` neinspectat explicit la verificare (risc teoretic, mitigat de `node:crypto`) | `license-signing.server.ts:108-131` |
| 12 | **INFORMATIV** | Fără rotație documentată a `LICENSE_SIGNING_KEK` | `license-kek.server.ts` |
| 13 | **INFORMATIV** | Cache TTL 60s pentru starea read-only | `license-readonly.server.ts:31` |

## Tabel de remediere prioritizată

| Prioritate | Acțiune | Referință |
|---|---|---|
| 1 | Introdu un identificator local de instalație generat aleator/nefalsificabil la prima pornire (nu dependent de o variabilă de mediu vizibilă operatorului) și un mecanism de challenge-response cu MC la activare, pentru a elimina copiabilitatea liberă a licenței | §4, constatarea CRITICĂ |
| 2 | Elimină returnarea `signed_token` complet din `heartbeat.ts` pentru apelanți neautentificați; cere proof-of-possession (semnat token curent) ca la `updates/check.ts` | §7 |
| 3 | Semnează integral bundle-urile JSON de activare Self-Hosted (nu doar componentele individuale) | §3 |
| 4 | Înlocuiește `company_key` bazat pe nume text cu un ID stabil de companie emis la licențiere | §4 |
| 5 | Derivă KEK cu HKDF (sau echivalent) în loc de SHA-256 simplu; validează entropia minimă a `LICENSE_SIGNING_KEK` la boot | §1 |
| 6 | Adaugă ancorare de timp rezistentă la rollback (high-water mark persistat / confirmare periodică online) pentru verificările de expirare | §9 |
| 7 | Reduce durata implicită de valabilitate a licențelor noi + încurajează/forțează import CRL periodic pentru a limita fereastra de expunere a revocărilor nesincronizate | §8 |
| 8 | Adaugă validare `issued_at` (nu în viitor) la verificarea tokenurilor | §2 |
| 9 | Reconsideră politica fail-open din `isLicenseReadOnly()` pentru erori susținute (fail-closed după TTL extins) | §6 |

---

*Notă privind acoperirea:* auditul s-a bazat pe fișierele explicit indicate plus cele descoperite prin
căutare (`license-crl.server.ts`, `license-enforcement.server.ts`, `license-activation-core.server.ts`,
rutele publice `heartbeat.ts`/`releases.ts`/`updates/check.ts`/`updates/peer-package.ts`, migrațiile
`0011`, `0037` și `20260708191855`). Fișierul `licenses.functions.ts` (peste 500 linii) a fost analizat
parțial (secțiunile de emitere și listare); o revizuire punctuală suplimentară a restului handlerelor
(re-issue, handover, revoke) este recomandată dar depășește adâncimea acestui pas de audit — marcat
**NEVERIFICAT** pentru acele secțiuni necitate integral.
