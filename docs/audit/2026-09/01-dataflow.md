# Audit flux de date — comunicații externe (2026-09)

Domeniu: analiză statică read-only a codului sursă din acest repo (`/dev-server`). Nu s-a rulat aplicația și nu s-a capturat trafic de rețea live; toate afirmațiile sunt derivate din cod, cu citare `fișier:linie`. Orice comportament ce nu poate fi confirmat din sursă e marcat **NEVERIFICAT**.

## 1. Rezumat

Proiectul are două moduri de rulare, comutate prin variabile de mediu la build/runtime:

- **Cloud** (`opsqai.lovable.app`) — implicit când `OPSQAI_PLATFORM_MODE`/`VITE_OPSQAI_MODE` nu indică self-host. Folosește Supabase și Lovable AI Gateway.
- **Self-Hosted** — activat prin `OPSQAI_PLATFORM_MODE=selfhost` / `OPSQAI_DEPLOYMENT_TYPE=selfhosted` (`src/lib/ai-adapters/registry.ts:57-61`) și `VITE_OPSQAI_MODE=selfhost` la build (`package.json:9`, `src/lib/platform/mode.ts:26-41`). Rulează inferența AI local (Ollama) și poate opera fără nicio conexiune externă, cu excepția câtorva funcții opționale, explicit fail-open, descrise mai jos.

## 2. Furnizori AI (chat, embeddings, TTS/STT)

### 2.1 Lovable AI Gateway (implicit Cloud)
- Fișier: `src/lib/ai-adapters/lovable.ts:1-83`.
- Endpoint: `https://ai.gateway.lovable.dev/v1` (`lovable.ts:15`), sub-căi `/chat/completions` (implicit din SDK), `/audio/speech` (`lovable.ts:59`), `/audio/transcriptions` (`lovable.ts:69`), `/embeddings` (`lovable.ts:78`).
- Autentificare: header `Lovable-API-Key` din `process.env.LOVABLE_API_KEY` (`lovable.ts:18-27`).
- Payload trimis: mesajele de chat construite de aplicație (prompturi + conținut din baza de cunoștințe folosit ca context RAG — **NEVERIFICAT** exact ce câmpuri de conținut client intră în prompt, cod de construcție a prompt-ului nu a fost inspectat linie cu linie în acest audit), text pentru TTS/STT, text pentru embeddings (`buildBody`, `lovable.ts:80`). Aceasta înseamnă că **documente/întrebări/răspunsuri ale clientului pot părăsi infrastructura clientului** către gateway-ul Lovable, ceea ce este comportamentul de proiectare pentru Cloud.
- Gating: acest adaptor este activ implicit doar când `defaultAdapterId()` întoarce `"lovable"`, adică atunci când `isSelfHostedRuntime()` este fals (`registry.ts:63-65`). Pe un runtime Self-Hosted, `getActiveAdapter()` **aruncă eroare** dacă `AI_PROVIDER` ar fi setat la un adaptor non-local (`registry.ts:85-90`), deci Lovable Gateway nu poate fi activat accidental pe Self-Hosted.

### 2.2 Ollama (implicit Self-Hosted, 100% local)
- Fișier: `src/lib/ai-adapters/ollama.ts`, `ollama-models.ts:1-22`.
- Endpoint implicit: `http://127.0.0.1:11434` (`ollama-models.ts:16`), suprascris prin `OLLAMA_BASE_URL`.
- Test de acceptanță dedicat verifică faptul că orice request non-local aruncă eroare și că nu se trimite header `Authorization` (`src/lib/ai-adapters/ollama.test.ts:9-34`). Confirmă intenția de proiectare: **niciun conținut nu părăsește mașina** cât timp `OLLAMA_BASE_URL` rămâne pe loopback (dacă un operator îl repointează manual către o gazdă externă, cererile ar pleca acolo — responsabilitatea configurării revine operatorului).

### 2.3 Azure OpenAI (opțional, Self-Hosted, resursă a clientului)
- Fișier: `src/lib/ai-adapters/azure.ts:1-83`.
- Endpoint: `https://{AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/...` (`azure.ts:52,62,71`), cheie `AZURE_OPENAI_API_KEY` (`azure.ts:18-25`).
- Payload: prompturi chat, text TTS/STT/embeddings — conținutul clientului pleacă spre resursa Azure pe care o deține/administrează clientul (nu spre Lovable/OPSQAI).
- Gating: activat doar prin `AI_PROVIDER=azure` (`.env.example:8-15`), permis doar dacă adaptorul e marcat `local` — **NEVERIFICAT** dacă `azureAdapter.local` e `true` (nu era vizibil în fragmentul citit); dacă nu, activarea pe Self-Hosted ar eșua conform regulii din `registry.ts:85-90`.

### 2.4 Generic OpenAI-compatible (opțional, Self-Hosted)
- Fișier: `src/lib/ai-adapters/openai-compatible.ts:1-76`.
- Endpoint configurabil integral de client: `GENERIC_AI_BASE_URL` (`openai-compatible.ts:19-24`), cheie `GENERIC_AI_API_KEY`.
- Destinație externă depinde 100% de valoarea pusă de administrator (poate fi orice serviciu compatibil OpenAI, on-prem sau cloud terț).

## 3. Management Center / Cloud de licențiere — Self-Hosted → opsqai.de

### 3.1 Heartbeat periodic
- Fișier: `src/lib/providers/selfhost/heartbeat-sender.server.ts:1-219`.
- Destinație: `POST {mcBaseUrl}/api/public/selfhost-heartbeat`, implicit `DEFAULT_MC_BASE_URL = "https://opsqai.de"` (`heartbeat-sender.server.ts:41`, `:138`), suprascris de operator prin config Self-Host.
- Declanșator/mod: doar Self-Hosted; pornit din bootstrap-ul Self-Host (nu apare deloc pe Cloud). Se poate dezactiva: funcția `startHeartbeatSender` nu programează nimic dacă `opts.enabled === false` sau `!opts.mcBaseUrl` (`heartbeat-sender.server.ts:182-185`).
- Payload exact (`buildPayload`, `heartbeat-sender.server.ts:79-107`, validat de `HeartbeatPayloadSchema` în `src/lib/selfhost-heartbeat-schema.ts:49-66`):
  - `installation_id`, `signed_token` (JWT-ul de licență semnat)
  - `organization_name` (numele firmei din configurare, opțional)
  - `country`, `primary_language` (din env)
  - `app_version`, `license_status`, `enabled_modules` (listă de nume module)
  - `status` ("running"/"degraded"/etc.), `last_maintenance_at`, `next_maintenance_at`
  - `usage`: bloc opțional de metrici **agregate, numai numere** (`UsageMetricsSchema`, strict — orice câmp text în plus face schema să respingă payload-ul, testat explicit în `src/lib/__tests__/usage-audit-privacy.test.ts:33-36` cu exemplul respins `last_document_title: "Contract Ionescu"`)
  - `timestamp`
  - **Nu conține**: nume de utilizatori, e-mailuri, conținut de documente, conversații sau prompturi. Comentariul din cod afirmă explicit acest lucru (`heartbeat-sender.server.ts:5-7`) și este confirmat de schema strictă.
- Gating opt-out: `collectUsage` este furnizat de bootstrap "unless the install's telemetry level is disabled" (`heartbeat-sender.server.ts:32-36`) — **NEVERIFICAT** codul exact de bootstrap care leagă nivelul de telemetrie de acest parametru (nu a fost inspectat separat în acest audit).
- Comportament la eșec: fail-open — orice eroare de rețea e prinsă și logată local, aplicația continuă normal (`heartbeat-sender.server.ts:150-154`, comentariu de design `:1-7`).

### 3.2 Verificare actualizări (update discovery)
- Fișier: `src/lib/providers/selfhost/update-discovery.server.ts:1-330`.
- Destinație: `POST {mcBaseUrl}/api/public/v1/updates/check`, implicit `https://opsqai.de` prin `OPSQAI_MC_URL`/`OPSQAI_HEARTBEAT_URL` (`update-discovery.server.ts:72-76,114`).
- Payload (`update-discovery.server.ts:117-123`): `installation_id`, `signed_token`, `current_version`, `channel` ("stable"/"beta"). Fără conținut client.
- Descriptorul de update primit e verificat criptografic local cu cheia publică pinned (`verifyCompactToken`, `update-discovery.server.ts:184-197`) — protejează împotriva unui proxy/MITM care ar servi un artefact fals.
- Distribuție peer-to-peer opțională în LAN: `fetchUpdateBody` încearcă mai întâi un peer configurat (`peer.source`/`peer.token`, `update-discovery.server.ts:312-329`) — trafic strict intern (LAN client), doar fallback-ul merge la `update.url` extern.
- Canal de update legacy (semnat, CDN): `https://updates.opsqai.de/channel/{channel}/manifest.json`, scris doar în configurare de politică de update, nu apelat direct aici (`src/lib/selfhost-updates.functions.ts:238`) — **NEVERIFICAT** unde/dacă acest manifest e efectiv descărcat (nu s-a găsit cod de fetch pentru el în fișierele examinate; comentariul din `update-discovery.server.ts:10-12` spune că updater-ul Windows citește acest manifest doar ca fallback dacă MC nu răspunde).
- Gating: relevant doar pentru Self-Hosted (`setSelfHostUpdatePolicy` verifică `isSelfHosted()`, `src/lib/selfhost-updates.functions.ts:227`); pe Cloud nu există echivalent.

### 3.3 Doctor / diagnostics (`opsqai doctor`)
- Fișier: `src/lib/doctor.server.ts:1-244`.
- Nu face niciun apel de rețea extern — toate verificările (`checkDatabase`, `checkSigningKeys`, `checkPlatformAdmin`, `checkInstallLicense`, `checkHeartbeat`) citesc din baza de date locală/Supabase configurat, niciun `fetch` extern (`doctor.server.ts:36-244`). "Heartbeat" verificat aici este doar citirea din tabela `license_installs` a **ultimului heartbeat deja trimis** (§3.1), nu un apel live.

## 4. Conectori pentru rețele sociale / mesagerie prin Lovable Connector Gateway

### 4.1 WhatsApp prin Twilio
- Fișier: `src/lib/transport/whatsapp.server.ts:184-220`.
- Destinație: `POST https://connector-gateway.lovable.dev/twilio/Messages.json` (`:200`).
- Autentificare: `Authorization: Bearer {LOVABLE_API_KEY}` + `X-Connection-Api-Key: {TWILIO_API_KEY}` (`:200-206`).
- Payload: `To` (numărul destinatarului), `From`, `Body` — corpul mesajului este textul planului de traseu, care poate conține **nume de dispecer, adrese/coordonate de stop, note operaționale** (compus în `composeTripMessage`, `whatsapp.server.ts:123-163`) — deci **date operaționale ale clientului (nu documente RAG, dar date de business) pleacă spre gateway-ul Lovable/Twilio**.
- Gating: doar activ dacă modul WhatsApp al companiei este setat pe "twilio" ȘI ambele chei `LOVABLE_API_KEY`/`TWILIO_API_KEY` sunt prezente (`:193-198`); altfel aplicația folosește doar linkul `wa.me` local (`whatsappLink`, `:173-175`), care nu face niciun apel server — doar deschide clientul WhatsApp al utilizatorului cu textul preumplut.
- Relevanță mod: acest fișier nu verifică explicit Cloud vs Self-Hosted — depinde exclusiv de prezența cheilor de mediu. Pe un Self-Hosted fără `LOVABLE_API_KEY`, funcția aruncă eroare și rămâne pe modul "link" (`:195-198`).

### 4.2 Publicare LinkedIn programată
- Fișier: `src/routes/api/public/v1/social/publish-due.ts:1-254`.
- Destinație: `https://connector-gateway.lovable.dev/linkedin/...` (`:12`, endpoint-uri `v2/userinfo`, `v2/ugcPosts`, `v2/socialActions/.../comments`).
- Autentificare: `Bearer {LOVABLE_API_KEY}` + `X-Connection-Api-Key: {LINKEDIN_API_KEY}` (`:26-29,50-55`).
- Payload: textul postării (`row.body`) și primul comentariu (`row.first_comment`) — conținut de marketing introdus de utilizator, nu documente interne.
- Declanșator: endpoint HTTP public apelat de `pg_cron` cu un token secret verificat în tabela `social_cron_tokens` (`:113-132`) — necesită Supabase, deci relevant doar unde Supabase e prezent (tipic Cloud; pe Self-Hosted ar necesita propriul Postgres+cron, **NEVERIFICAT** dacă ruta e inclusă în build-ul Self-Hosted).

## 5. E-mail tranzacțional

### 5.1 Cloud — Lovable Email API
- Fișier: `src/lib/email-templates/send-email.ts:1-92`.
- Trimite prin SDK `@lovable.dev/email-js` (`sendLovableEmail`), folosind `LOVABLE_API_KEY` (`:40,69-83`); URL implicit gestionat de SDK, suprascriere posibilă prin `LOVABLE_SEND_URL` (`:82`).
- Payload: destinatar, adresă `from` pe domeniul `notify.opsqai.de`/`opsqai.de` (`:12-15`), subiect, HTML+text randate dintr-un șablon (`TEMPLATES`), `label`=numele șablonului, `idempotency_key`. Conținutul HTML poate include date personale (nume, linkuri de invitație, certificate) în funcție de șablon — **date client (nume, adrese e-mail) pleacă către Lovable** la fiecare trimitere.
- Gating: folosit implicit; **NEVERIFICAT** dacă acest fișier este exclus din build-ul Self-Hosted (există `verify:source-imports`/`verify:ai-boundary` în `package.json:12-13` ca gărzi de build, dar conținutul acelor scripturi nu a fost inspectat).

### 5.2 Self-Hosted — SMTP-ul clientului
- Fișier: `src/lib/providers/selfhost/smtp-notification.server.ts:1-70`.
- Trimite prin `nodemailer` direct către serverul SMTP configurat de client (`deps.host/port`, `:30-42`) — Microsoft 365, Exchange, SendGrid, relay intern etc., ales și controlat integral de client.
- Payload: mesajele de notificare ale aplicației (`EmailMessage`), nu diferă structural de conținutul trimis pe Cloud, dar **destinația este infrastructura clientului**, nu Lovable.
- Gating: activ când providerul de notificări Self-Hosted este configurat cu SMTP (implicit pentru Self-Hosted conform comentariului de design, `:1-6`).

## 6. Servicii publice fără cheie API (hărți / rutare / meteo)

Toate în `src/lib/transport/`, folosite de modulul de planificare curse (Transport):

- **OSRM (rutare)** — `https://router.project-osrm.org/route/v1/driving` (`src/lib/transport/routing.server.ts:26`). Payload: doar coordonate geografice (lat/lng) ale opririlor planificate; fără nume, fără conținut de business.
- **Open-Meteo (vreme)** — `https://api.open-meteo.com/v1/forecast` (`routing.server.ts:144`). Payload: coordonate + interval orar.
- **Nominatim/OpenStreetMap (geocodare adrese)** — `https://nominatim.openstreetmap.org/search?...` (`src/lib/transport/db.server.ts:1618`). Payload: textul căutat de dispecer pentru o adresă (`query`, poate conține adrese de firme/depozite ale clientului).
- **Google Maps (link de navigare)** — `https://www.google.com/maps/dir/?...` (`whatsapp.server.ts:120`) — nu e un apel server; e doar un link generat, deschis de browser/aplicația WhatsApp a șoferului.
- Gating comun: toate lookup-urile externe din `routing.server.ts`/`db.server.ts` sunt condiționate de setarea per-companie `trip_external_lookups`/`settings.searchProvider !== "off"` (`db.server.ts:1613-1615`, comentariu `routing.server.ts:7-8`) — un client Self-Hosted poate dezactiva aceste lookup-uri și rămâne pe estimări offline (`fallback()`, `routing.server.ts:51-55`).

## 7. Sincronizare release-uri installer (GitHub)

- Fișier: `src/lib/github-installer-release.server.ts:70-135`, apelat din `src/lib/installer-releases.functions.ts`.
- Destinații: `https://api.github.com/repos/{repo}/releases/latest` (`:84`), cu fallback la pagina publică `https://github.com/{repo}/releases/latest` și `.../releases/expanded_assets/{tag}` (`:103,113-114`) când API-ul GitHub e limitat (403/429).
- Payload trimis: niciun conținut client — doar un `User-Agent` fix și, opțional, `GITHUB_TOKEN` pentru autentificare (`:77-82`). Este strict metadata publică de release (versiuni, arhive), nu date de business.
- Context: funcționalitate administrativă (sincronizare artefacte de instalare), independentă de modul Cloud/Self-Hosted — rulează unde e apelată funcția respectivă (tipic din panoul de administrare al proiectului, nu din runtime-ul unei instalații client).

## 8. Telemetrie (nivel aplicație)

- Interfață: `ITelemetrySink` (`src/lib/providers/interfaces.ts`), cu nivele (`TelemetryLevel`).
- Cloud: implementarea reală **NEVERIFICAT** — nu a fost inspectat fișierul `src/lib/providers/cloud/...` pentru telemetrie; doar varianta noop a fost confirmată în `null-providers.ts`.
- Self-Hosted: `createLocalTelemetrySink` (`src/lib/providers/selfhost/local-telemetry.server.ts:1-96`) scrie evenimente **doar în fișiere JSON locale** sub `%ProgramData%\OPSQAI\logs\telemetry\` (și, cât rulează ca serviciu Windows, în Windows Event Log — comentariu `:4-6`, cod de scriere fișier `:81-93`). Niciun apel de rețea în acest fișier.
- Comentariul explicit al modulului: "Nothing is ever sent off-machine unless the customer explicitly opts in and provides an outbound endpoint (Phase 8: `Capability.Telemetry` with `full`)" (`local-telemetry.server.ts:6-7`) — funcționalitatea de trimitere efectivă la un asemenea endpoint **nu există în codul curent** (nu s-a găsit niciun `fetch` în acest fișier); afirmația "Phase 8" indică o funcție viitoare/neimplementată — tratată ca **NEVERIFICAT / neimplementată la data auditului**.
- Nivel `disabled`: evenimentele sunt aruncate silențios, fără scriere (`:82`). Nivel `anonymous`: câmpuri identificabile (`email`, `phone`, `ip`, `user_name` etc.) sunt eliminate înainte de scriere (`scrubPayload`, `:28-51`). Nivel `full`: payload-ul e păstrat integral — dar tot doar în fișierul local, conform codului inspectat.
- Nu s-au găsit în cod integrări cu Sentry, PostHog, Google Analytics, Segment, Mixpanel sau alte platforme de analytics/eroare (căutare negativă în `src/`).

## 9. Autentificare / bază de date (Supabase) — doar Cloud

- Fișiere: `src/integrations/supabase/client.ts:9-23`, `client.server.ts:9-22`, `auth-middleware.ts:9-43`.
- Destinație: `SUPABASE_URL`/`VITE_SUPABASE_URL` din `.env` (valorile reale sunt redactate în acest audit; proiectul conține un proiect Supabase configurat implicit — vezi `.env` la rădăcina proiectului).
- Aceasta este infrastructura Cloud a OPSQAI: autentificare, stocare de date de business (companii, useri, cunoștințe, conversații) pentru clienții Cloud. Pentru Self-Hosted, comentariul din `src/lib/providers/registry.ts:1-7` afirmă explicit că routarea prin `getProvider(...)` "is what keeps Self-Hosted from pulling any Supabase module into its bundle" — adică build-ul Self-Hosted nu ar trebui să conțină deloc clientul Supabase. Existența verificărilor de build `verify:source-imports`/`verify:selfhost-bundle` (`package.json:12-16`) susține acest design, dar **conținutul acelor scripturi nu a fost inspectat** în acest audit — nivelul de garanție rămâne **NEVERIFICAT** din perspectiva acestui audit static.
- Codul `doctor.server.ts` importă totuși necondiționat `@/integrations/supabase/client.server` chiar și în ramurile "selfhost" (`doctor.server.ts:38,49,101,129,183,220`) — adică fișierul sursă al Doctor-ului conține apeluri Supabase indiferent de mod; dacă acest fișier ajunge în bundle-ul Self-Hosted final este exact ce verifică `verify:selfhost-bundle`/`verify:source-imports` — **NEVERIFICAT** rezultatul acelor verificări din acest audit (nu s-au rulat scripturile, fiind audit read-only).

## 10. Tabel-sinteză

| # | Destinație externă | Domeniu/Endpoint | Mod | Date client posibil incluse | Control/gating |
|---|---|---|---|---|---|
| 1 | Lovable AI Gateway | `ai.gateway.lovable.dev` (`lovable.ts:15`) | Cloud (implicit) | Da — prompturi, context RAG, text TTS/STT | implicit dacă nu e Self-Hosted; blocat pe Self-Hosted (`registry.ts:85-90`) |
| 2 | Ollama local | `127.0.0.1:11434` (`ollama-models.ts:16`) | Self-Hosted (implicit) | Nu părăsește mașina (dacă host rămâne local) | `OLLAMA_BASE_URL` |
| 3 | Azure OpenAI | resursă a clientului (`azure.ts`) | Self-Hosted opțional | Da, dar către resursa clientului | `AI_PROVIDER=azure` + chei |
| 4 | Endpoint OpenAI-compatible generic | ales de client (`openai-compatible.ts`) | Self-Hosted opțional | Da, destinație aleasă de client | `AI_PROVIDER=openai-compatible` + chei |
| 5 | Management Center — heartbeat | `opsqai.de/api/public/selfhost-heartbeat` (`heartbeat-sender.server.ts:41,138`) | Self-Hosted | Nu — doar metadate + numere agregate | `mcBaseUrl` prezent, telemetrie ≠ disabled pentru `usage` |
| 6 | Management Center — update check | `opsqai.de/api/public/v1/updates/check` (`update-discovery.server.ts:74,114`) | Self-Hosted | Nu — id instalare, token semnat, versiune, canal | apelat manual/periodic de updater |
| 7 | Canal update CDN semnat | `updates.opsqai.de/channel/.../manifest.json` (`selfhost-updates.functions.ts:238`) | Self-Hosted | Nu | fallback când MC indisponibil (**NEVERIFICAT** cod de fetch) |
| 8 | Connector Gateway — WhatsApp/Twilio | `connector-gateway.lovable.dev/twilio` (`whatsapp.server.ts:200`) | ambele (necesită chei Lovable+Twilio) | Da — text plan de traseu, nume dispecer | `LOVABLE_API_KEY`+`TWILIO_API_KEY` prezente și mod "twilio" |
| 9 | Connector Gateway — LinkedIn | `connector-gateway.lovable.dev/linkedin` (`publish-due.ts:12`) | Cloud (necesită Supabase+cron) | Da — text postare/comentariu | token cron + chei Lovable/LinkedIn |
| 10 | Lovable Email API | gestionat de SDK `@lovable.dev/email-js` (`send-email.ts:69-83`) | Cloud | Da — nume, e-mail, conținut șablon | `LOVABLE_API_KEY` |
| 11 | SMTP client | ales de client (`smtp-notification.server.ts`) | Self-Hosted | Da, dar către infrastructura clientului | config SMTP din installer |
| 12 | OSRM | `router.project-osrm.org` (`routing.server.ts:26`) | ambele | Doar coordonate | `trip_external_lookups`/`searchProvider` |
| 13 | Open-Meteo | `api.open-meteo.com` (`routing.server.ts:144`) | ambele | Doar coordonate | idem |
| 14 | Nominatim/OSM | `nominatim.openstreetmap.org` (`db.server.ts:1618`) | ambele | Text căutare adresă | `settings.searchProvider !== "off"` |
| 15 | GitHub API | `api.github.com`, `github.com` (`github-installer-release.server.ts:84,103,113`) | administrativ | Nu | funcție de administrare release-uri |
| 16 | Supabase | `SUPABASE_URL` din `.env` | Cloud | Da — toate datele de business (prin design) | prezent doar când Supabase e cablat; ar trebui absent din bundle Self-Hosted (**NEVERIFICAT** rezultat build) |
| 17 | Telemetrie locală | fișiere locale, fără rețea (`local-telemetry.server.ts`) | Self-Hosted | N/A (nu iese din mașină) | nivel `disabled/anonymous/full`, trimitere la endpoint extern **neimplementată** în codul curent |

## 11. Comportamentul unei instalări Self-Hosted complet offline

Pe baza codului inspectat:

- **Funcționează**: autentificare, RAG/chat AI (via Ollama local, `ollama.test.ts:9-34` demonstrează zero apeluri non-locale), stocare documente, notificări (dacă SMTP-ul configurat e accesibil în rețeaua locală a clientului), planificare curse Transport cu estimări offline (`routing.server.ts:51-55`, `fallback()`), generarea de linkuri WhatsApp `wa.me` (fără apel server, doar deschide clientul local).
- **Eșuează silențios/fail-open, fără a bloca aplicația**:
  - Heartbeat către Management Center — timeout după 15s, logat local, reîncercat cu backoff exponențial (`heartbeat-sender.server.ts:126-154`).
  - Verificarea de update — întoarce `{ ok: false, reason: "unreachable" }` (`update-discovery.server.ts:126-128`).
  - Lookup-uri OSRM/Open-Meteo/Nominatim — cad pe fallback offline sau întorc doar rezultatele locale cache-uite (`routing.server.ts:51-57`, `db.server.ts` — `if (!res.ok) return local;`).
- **Eșuează cu eroare vizibilă utilizatorului** (funcționalități care necesită explicit rețeaua și nu au fallback):
  - Trimitere WhatsApp automată via Twilio — aruncă eroare dacă lipsesc cheile sau conexiunea eșuează (mesajul de eroare din `whatsapp.server.ts:213-217` cere să comuți pe modul link).
  - Trimitere e-mail Cloud (Lovable Email API) — nu se aplică pe un Self-Hosted corect configurat, care ar folosi SMTP-ul propriu; dacă SMTP-ul clientului e el însuși inaccesibil, `sendEmail` din `smtp-notification.server.ts` ar eșua (aruncă eroarea nodemailer, necaptată la acest nivel — **NEVERIFICAT** modul exact în care apelantul tratează eroarea).
  - Sincronizare release-uri GitHub — funcție administrativă, nu face parte din operarea zilnică a unei instalări client.
- **Nu există niciun apel obligatoriu de tip "phone-home" care blochează pornirea sau utilizarea aplicației** în codul inspectat: heartbeat-ul e best-effort și pornește abia la 5 secunde după boot (`FIRST_BEAT_DELAY_MS`, `heartbeat-sender.server.ts:45,205`), iar absența licenței valide pe disc doar oprește trimiterea heartbeat-ului, nu aplicația (`buildPayload`, `:57-58`).

## 12. Limitări ale acestui audit (NEVERIFICAT)

- Nu s-a inspectat conținutul complet al scripturilor de verificare a build-ului Self-Hosted (`opsqai-windows/build/verify-*.mjs`) care ar trebui să garanteze excluderea Supabase/Lovable Gateway din bundle-ul Self-Hosted.
- Nu s-a inspectat construcția exactă a prompt-urilor trimise către adaptoarele AI (ce fragmente de documente/conversații intră mot-a-mot în request) — afirmația "conținut client poate pleca" e o concluzie de design (RAG trimite context relevant la un LLM extern pe Cloud), nu o citare literală a payload-ului complet.
- Nu s-a inspectat implementarea Cloud a `ITelemetrySink` (doar varianta noop și cea Self-Hosted locală au fost găsite explicit).
- Nu s-a rulat aplicația, nu s-a capturat trafic real de rețea, nu s-au verificat header-e HTTP suplimentare trimise de librăriile SDK (`@ai-sdk/*`, `@lovable.dev/*`) dincolo de ce e vizibil în codul propriu al proiectului.
- Manifestul de update `updates.opsqai.de` — nu s-a găsit cod de `fetch` propriu-zis pentru el în acest audit; doar scrierea URL-ului în configurare a fost confirmată.
