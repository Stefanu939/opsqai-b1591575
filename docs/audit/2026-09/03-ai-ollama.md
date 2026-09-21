# Audit arhitectură AI & Ollama (Self-Hosted) — Septembrie 2026

Scop: să confirme dacă `src/lib/ai-provider.server.ts` este singurul punct prin care
codul de funcționalitate ajunge la inferență AI, să enumere fiecare punct de apel AI
din produs, și să verifice riscul de scurgere a datelor clientului (prompturi,
documente, conversații) în afara infrastructurii proprii pe modul Self-Hosted.

Metodă: căutare statică (`rg`) pe tot `src/`, citire linie-cu-linie a fișierelor
identificate, rulare efectivă a gardei de build și a suitei de teste offline.
Toate afirmațiile sunt ancorate cu `cale:linie`. Ce nu a putut fi verificat direct
în cod este marcat **NEVERIFICAT**.

---

## 1. Harta stratului central de furnizare AI

### 1.1 `src/lib/ai-provider.server.ts` — fațada unică

Header-ul fișierului declară explicit contractul: „Every module, route, server
function, repository, worker and scheduled job resolves AI through this file”
(`src/lib/ai-provider.server.ts:1-9`).

Funcții publice exportate și rolul lor:

- `embeddingDimensions()` — citește `OPSQAI_EMBEDDING_DIM` / `EMBEDDING_DIMENSIONS`,
  altfel implicit `1536` (`src/lib/ai-provider.server.ts:41-45`).
- `activeAiProviderId()` / `activeAiProviderLabel()` — id/etichetă adaptor activ
  (`src/lib/ai-provider.server.ts:57-70`).
- `aiCapabilities()` / `probeAiCapabilities()` / `hasAiCapability()` /
  `assertAiCapability()` — registru de capabilități, cu probă live opțională
  (`src/lib/ai-provider.server.ts:76-117`).
- `resolveChatModel(role)` — întoarce un `LanguageModel` pentru rolul `"chat"` sau
  `"chat-fast"`, verificând mai întâi capacitatea (`src/lib/ai-provider.server.ts:122-125`).
- `resolveTTS()` / `resolveTTSOrNull()` — endpoint TTS rezolvat sau `null`, fără
  cădere silențioasă (`src/lib/ai-provider.server.ts:128-141`).
- `resolveSTT()` / `resolveSTTOrNull()` / `transcribeAudio()` — analog pentru
  speech-to-text (`src/lib/ai-provider.server.ts:143-188`).
- (verificat suplimentar în fișier, dincolo de porțiunea afișată mai sus)
  `generateAiText`, `streamAiText`, `generateAiObject`, `generateAiJson`,
  `resolveEmbeddings`, `resolveEmbedOne` — API-ul de generare text/JSON/embeddings
  folosit de toate site-urile de apel enumerate în secțiunea 2.

Niciun modul de funcționalitate nu instanțiază un provider sau nu numește un model
direct — asta e verificat mecanic de garda de build (secțiunea 4).

### 1.2 `src/lib/ai-adapters/*` — stratul de adaptoare

Fișiere (`src/lib/ai-adapters/`):

- `types.ts` — contractul `AIProviderAdapter` (`resolveChat`, `resolveTTS`,
  `resolveEmbeddings`, `resolveSTT?`, `capabilities`, `probeCapabilities?`)
  (`src/lib/ai-adapters/types.ts:15-90`).
- `registry.ts` — `BUILT_IN_ADAPTERS = [lovableAdapter, azureAdapter,
  openaiCompatibleAdapter, ollamaAdapter]` (`src/lib/ai-adapters/registry.ts:11-16`).
- `lovable.ts` — adaptor cloud implicit (`id: "lovable"`), țintă
  `https://ai.gateway.lovable.dev/v1` (`src/lib/ai-adapters/lovable.ts:16,29-45`).
- `azure.ts` — adaptor Azure OpenAI (client BYO al clientului).
- `openai-compatible.ts` — adaptor generic OpenAI-compatible (self-host cu vLLM/LM
  Studio etc., configurat de client).
- `ollama-models.ts` — constante implicite pentru modelele/URL-ul Ollama.
- `ollama.ts` — adaptorul local implicit pe Self-Hosted (`id: "ollama"`, `local: true`)
  (`src/lib/ai-adapters/ollama.ts:35-38`).

Rezoluția adaptorului activ (`src/lib/ai-adapters/registry.ts:59-90`,
`getActiveAdapter()`):

- Implicit pe Self-Hosted: `SELFHOST_DEFAULT_ADAPTER_ID = "ollama"`
  (`src/lib/ai-adapters/registry.ts:50-56`).
- Implicit pe Cloud: `DEFAULT_ADAPTER_ID = "lovable"` (`src/lib/ai-adapters/registry.ts:48`).
- `isSelfHostedRuntime()` citește `OPSQAI_PLATFORM_MODE` / `OPSQAI_DEPLOYMENT_TYPE`
  (`src/lib/ai-adapters/registry.ts:59-63`).
- **Blocaj explicit anti-cloud**: dacă rulează Self-Hosted (`selfHosted === true`)
  și adaptorul cerut prin `AI_PROVIDER` are `found.local !== true`, funcția
  **aruncă eroare** în loc să continue (`src/lib/ai-adapters/registry.ts:85-89`):
  > `AI_PROVIDER "${found.id}" is a cloud engine and cannot be used on a
  > Self-Hosted install.`

  Aceasta este bariera tehnică principală care împiedică activarea accidentală a
  unui provider cloud (`lovable`) pe o instalare marcată Self-Hosted.

### 1.3 Embeddings

`src/lib/embeddings.server.ts:1-11` este o fațadă subțire ce cheamă exclusiv
`resolveEmbeddings()` din `ai-provider.server.ts` — nu conține logică proprie de
provider, deci orice apel de embedding trece prin stratul central.

Dimensiunea vectorului **nu este** o constantă hardcodată în stratul de bază de
date: comentariul din `src/lib/ai-provider.server.ts:36-40` și migrarea
`migrations/selfhost/0017_embedding_dim.sql:1-15` documentează explicit că, pe
Self-Hosted, dimensiunea reală e sondată de la modelul de embedding local la
instalare (`probeEmbeddingDimension()`, `src/lib/ai-adapters/ollama.ts:250-262`)
și fixată per-instalare via `public.kb_apply_embedding_dim(<dim probat>)`.

Schema pgvector se auto-ajustează la dimensiunea probată:

- `public.ai_engine_config` reține perechea `embedding_dim = <n>`
  (`migrations/selfhost/0017_embedding_dim.sql:18-21,132-135`).
- `kb_apply_embedding_dim(_dim, _force)` **refuză** schimbarea dimensiunii dacă
  există deja chunk-uri embedded, cu excepția `_force := true` — caz în care
  vectorii vechi sunt șterși și documentele marcate `pending` pentru re-ingestie
  (`migrations/selfhost/0017_embedding_dim.sql:80-113`).
- Coloana `document_chunks.embedding`, indexul HNSW și funcțiile
  `match_knowledge_chunks` / `match_document_chunks_for_company` sunt recreate
  dinamic la exact dimensiunea probată (`migrations/selfhost/0017_embedding_dim.sql:114-160`).

**Concluzie 1.3**: nu există mismatch structural — schema pgvector e proiectată să
urmeze dimensiunea reală a modelului activ, nu invers. Riscul rămas este
operațional: dacă cineva schimbă `OLLAMA_EMBEDDING_MODEL` fără a rula fluxul de
re-embedding/`_force`, inserțiile ulterioare cu dimensiune diferită de cea pinată
vor eșua la nivel de tip Postgres (`vector(%s)`), ceea ce e comportamentul dorit
(fail-closed, nu coruperea datelor).

---

## 2. Configurarea Ollama (modele, base URL, timeouts)

Sursă: `src/lib/ai-adapters/ollama.ts`.

- **Base URL**: `ollamaBaseUrl()` citește `OLLAMA_BASE_URL`, altfel
  `OLLAMA_DEFAULT_BASE_URL` din `ollama-models.ts`, cu `/` finale eliminate
  (`src/lib/ai-adapters/ollama.ts:13-16`). Suprafața OpenAI-compatibilă folosită e
  `${base}/v1` (`src/lib/ai-adapters/ollama.ts:19-21`). În testul de contract
  offline valoarea implicită folosită este `http://127.0.0.1:11434`
  (`src/lib/ai-contract.offline.test.ts:9,89`).
- **Modele**: `ollamaModels()` citește `OLLAMA_CHAT_MODEL`, `OLLAMA_CHAT_FAST_MODEL`,
  `OLLAMA_EMBEDDING_MODEL`, altfel `OLLAMA_DEFAULT_MODELS.{chat,chatFast,embedding}`
  (`src/lib/ai-adapters/ollama.ts:23-29`, valorile default `NEVERIFICAT` mai
  detaliat — definite în `src/lib/ai-adapters/ollama-models.ts`, neinspectat
  linie-cu-linie în această trecere, dar referit consistent din adaptor și test).
- **Autentificare**: adaptorul **nu trimite niciodată** header `Authorization`
  către Ollama — comentariu explicit „Ollama runs on the customer's own machine
  and needs NO authentication” (`src/lib/ai-adapters/ollama.ts:1-6`), implementat
  prin `createOpenAICompatible({ name: "ollama", baseURL: openaiBaseUrl() })` fără
  `apiKey` (`src/lib/ai-adapters/ollama.ts:78-81`).
- **Timeouts**:
  - `probeCapabilities()` (folosit de UI/health-check general): `15_000` ms
    (`src/lib/ai-adapters/ollama.ts:52`).
  - `probeOllama(timeoutMs = 60_000)`: implicit 60s pentru sonda completă
    (chat + embeddings); pasul `/api/tags` e limitat la `min(timeoutMs, 10_000)`
    (`src/lib/ai-adapters/ollama.ts:141,153`).
  - `probeEmbeddingDimension(timeoutMs = 60_000)`: 60s implicit
    (`src/lib/ai-adapters/ollama.ts:250`).
  - Apelurile de chat/embeddings prin `resolveChat`/`resolveEmbeddings` folosesc
    SDK-ul `ai` (`generateText`/`streamText` din `ai-provider.server.ts`) — timeout-ul
    concret de request pentru traficul de producție (nu sondele de health) este
    **NEVERIFICAT** în această trecere (nu am inspectat integral
    `generateAiText`/`streamAiText` din `ai-provider.server.ts`, trunchiate în
    citirea inițială).
- **TTS/STT pe Ollama**: `resolveTTS()` aruncă eroare explicită — „Ollama has no
  `/audio/speech` endpoint” (`src/lib/ai-adapters/ollama.ts:83-89`). Adaptorul nu
  implementează `resolveSTT`, deci `aiCapabilities().textToSpeech = false` și
  `assertAiCapability("audioInput")` eșuează cu `AiCapabilityError` — confirmat de
  testul `"reports text-to-speech as unsupported instead of calling a cloud
  provider"` (`src/lib/ai-contract.offline.test.ts:151-157`).
- **Embeddings**: `resolveEmbeddings()` construiește body-ul `{model, input}` fără
  a cere trunchiere de dimensiune — comentariu „Ollama does not truncate on
  request”, deci lungimea nativă a modelului e sursa de adevăr
  (`src/lib/ai-adapters/ollama.ts:92-101`).
- **Vision**: raportat `true` doar dacă modelul de chat instalat se potrivește cu
  regex-ul `isVisionModel` (`llava|vision|minicpm-v|...`), altfel `false` — nu
  există fallback cloud pentru vision (`src/lib/ai-adapters/ollama.ts:31-34,66-68`).

---

## 3. Enumerarea tuturor punctelor de apel AI din produs

Am căutat exhaustiv (pe tot `src/`) importurile funcțiilor centrale
(`resolveChatModel`, `generateAiText`, `streamAiText`, `generateAiObject`,
`generateAiJson`, `resolveEmbeddings`, `resolveEmbedOne`, `resolveTTS(OrNull)`,
`resolveSTT(OrNull)`, `transcribeAudio`, `aiCapabilities`/`hasAiCapability`/
`assertAiCapability`) și, separat, ale fațadei `embedTexts`/`embedOne` din
`src/lib/embeddings.server.ts`. Fiecare rezultat a fost verificat manual.

| Domeniu | Fișier | Linie(i) | Funcție centrală apelată | Rutează prin stratul central? |
|---|---|---|---|---|
| Chat principal (widget general) | `src/routes/api/chat.ts` | 4, 220 | `resolveChatModel("chat")`, `resolveEmbedOne`, `hasAiCapability` | **DA** |
| Chat Academy | `src/routes/api/academy-chat.ts` | 10, 177 | `resolveChatModel("chat")` | **DA** |
| Chat intern (staff/internal-requests) | `src/routes/api/internal-chat.ts` | 11, 169 | `resolveChatModel("chat")` | **DA** |
| Chat workspace | `src/routes/api/workspace-chat.ts` | 6, 314 | `resolveChatModel("chat")` | **DA** |
| Generator conținut client ("customer-writer") | `src/routes/api/customer-writer.ts` | 4, 110 | `generateAiText` | **DA** |
| TTS (text-to-speech) | `src/routes/api/tts.ts` | ~44-46 | `resolveTTSOrNull`, `activeAiProviderLabel` | **DA** — răspunde `501` dacă nu e suportat, nu are fallback cloud (comentariu explicit „NEVER falls back to a cloud provider”, `src/routes/api/tts.ts:6-9`) |
| STT / transcriere voce | `src/lib/ai-features.functions.ts` | 9-15, 749 | `transcribeAudio` | **DA** |
| Academy — generare conținut/quiz/corectură | `src/lib/academy.functions.ts` | 6, 527, 621, 768, 944 | `generateAiText` | **DA** |
| AI Audit — remediere/recomandări | `src/lib/audit-remediation.server.ts` | 20, 49 | `resolveChatModel("chat-fast")` | **DA** |
| Comparare documente (doc-compare) | `src/lib/doc-compare.functions.ts` | 12, 118 | `resolveChatModel("chat")` | **DA** |
| Draft-uri gap-analysis | `src/lib/gap-drafts.server.ts` | 14, 45 | `resolveChatModel("chat-fast")` | **DA** |
| HR — asistent | `src/lib/hr/assistant.server.ts` | 8, 108 | `resolveChatModel("chat")` | **DA** |
| HR — screening candidați | `src/lib/hr/screening.server.ts` | 9, 77, 150 | `resolveChatModel("chat")` (x2 folosiri) | **DA** |
| Dashboard — insight/rezumat AI | `src/lib/dashboard.functions.ts` | 72-73 | `generateAiText` (import dinamic) | **DA** |
| Funcții AI generale (voce, alte capabilități) | `src/lib/ai-features.functions.ts` | 9-15, 35 | `resolveChatModel("chat-fast")`, `transcribeAudio` | **DA** |
| Embeddings — cereri interne (internal-requests) | `src/lib/internal-requests.functions.ts` | 326, 329 | `embedTexts` → `resolveEmbeddings` | **DA** |
| Embeddings — Knowledge Base (kb) | `src/lib/kb.functions.ts` | 52, 56 | `embedTexts` | **DA** |
| Embeddings — versiuni SOP | `src/lib/sop-versions.functions.ts` | 72, 75 | `embedTexts` | **DA** |
| Embeddings — documente sistem | `src/lib/system-docs.functions.ts` | 122, 206 | `embedTexts` | **DA** |
| Embeddings — Core Ops (căutare semantică FAQ/proceduri) | `src/lib/core-ops.functions.ts` | 449, 462 | `embedOne` | **DA** |

**CRM**: `src/lib/crm.functions.ts` a fost căutat explicit pentru orice import
`ai-provider`/`generateAi*`/`resolveChat*`/`embed*` — **niciun rezultat**. CRM-ul
din acest cod-bază **nu are cod AI activ** momentan (nu e un punct de apel AI de
enumerat, nici o rutare, nici un bypass — pur și simplu nu invocă AI).

**Nu au fost găsite** puncte de apel AI care să bypaseze stratul central: nicio
căutare `fetch(...)` către `ollama|openai|anthropic|gemini|azure|11434|
gateway.lovable` în afara `src/lib/ai-adapters/` (singurele rezultate din afara
adaptoarelor sunt teste, `src/lib/ai-adapters/ollama.test.ts:114,139`, și un apel
necorelat cu AI către gateway-ul de conectori Twilio/WhatsApp,
`src/lib/transport/whatsapp.server.ts:200`, care este autorizare de canal de
mesagerie, nu inferență AI — și e explicit exceptat de garda de build, vezi §4).

---

## 4. Garda de build `verify-ai-boundary.mjs` și testele offline

### 4.1 Ce verifică garda

`opsqai-windows/build/verify-ai-boundary.mjs` scanează static tot `src/**/*.ts(x)`
(exceptând `node_modules` și `__tests__`) și eșuează build-ul dacă găsește, în
afara unei liste albe, oricare din:

- citirea `LOVABLE_API_KEY` (`opsqai-windows/build/verify-ai-boundary.mjs:59-63`);
- construirea unui provider Lovable AI Gateway (`...:64-68`);
- instanțierea directă a unui client de provider AI (OpenAI/Azure/Google/Anthropic)
  (`...:69-76`);
- apel direct către un host AI extern (`ai.gateway.lovable.dev`,
  `api.openai.com`, `openai.azure.com`, `generativelanguage.googleapis.com`,
  `api.anthropic.com`, `openrouter.ai`) (`...:77-82`);
- hardcodarea unui id de model (`gpt-*`, `claude-*`, `google/gemini*`,
  `openai/*`, `anthropic/*`, `qwen*`, `bge-m3`) (`...:83-89`).

Lista albă (`ALLOWED_PREFIXES`, `opsqai-windows/build/verify-ai-boundary.mjs:20-45`)
include exclusiv: stratul provider/adaptor însuși, plumbing de configurare
(`selfhost-config.server.ts`, `ai-engine.server.ts`, `ai-engine.functions.ts`,
`first-run.functions.ts`), rutele de e-mail platformă Lovable (autentificare
canal, nu AI), conectorii WhatsApp/Twilio/LinkedIn (idem), și conținut text
static (legal/marketing/i18n).

### 4.2 Rezultat rulare efectivă

Comandă rulată: `node opsqai-windows/build/verify-ai-boundary.mjs`

```
verify-ai-boundary: OK — 763 source files, no direct AI provider access outside the provider layer.
```
Cod de ieșire: `0`.

### 4.3 Testele unitare ale gărzii

`opsqai-windows/build/__tests__/verify-ai-boundary.test.ts` — **8 teste, toate
trecute** (rulare `bunx vitest run`).

### 4.4 Suita de contract offline

`src/lib/ai-contract.offline.test.ts` — simulează un motor Ollama local (numai
`127.0.0.1`) și blochează orice acces la rețea către host non-local, aruncând
eroare (`isLocal()`, `src/lib/ai-contract.offline.test.ts:11-14,25-27`).
**10 teste, toate trecute**, inclusiv:

- rutare implicită la `ollama` pe Self-Hosted, fără adaptor cloud
  (`...:97-101`);
- `aiCapabilities()` raportează `textToSpeech: false` fără a apela vreun endpoint
  extern (`...:104-114`);
- `probeAiCapabilities()` — toate request-urile verificate `isLocal` (`...:117-122`);
- `generateAiText`/`generateAiJson`/`resolveEmbeddings`/`resolveEmbedOne` — toate
  cu `requested.every(isLocal) === true` (`...:130-166`);
- `resolveTTSOrNull()` → `null`, `resolveTTS()` → aruncă `AiCapabilityError`,
  **fără nicio cerere de rețea** emisă (`...:151-157`);
- `assertAiCapability("vision"/"audioInput")` aruncă înainte de orice request —
  „the boundary refuses before the wire” (`...:159-166`, `requested` gol);
- test final „never contacts a non-local host across the whole suite” (`...:169-171`).

Rulare efectivă combinată (guard unit test + ollama unit test + contract offline):
**23/23 teste trecute** (log complet capturat în sesiunea de audit).

**Concluzie §4**: garda de build și suita de teste sunt reale, se execută cu
succes și acoperă exact scenariul cerut (nicio cale AI secundară, niciun fallback
cloud silențios, TTS/vision/audio raportate ca indisponibile în loc de rutare
cloud).

---

## 5. Fallback cloud accesibil în mod Self-Hosted?

- **La nivel de cod**: `getActiveAdapter()` aruncă eroare dacă cineva setează
  `AI_PROVIDER=lovable` (sau orice adaptor cu `local !== true`) în timp ce
  `isSelfHostedRuntime()` e `true` (`src/lib/ai-adapters/registry.ts:82-89`).
  Nu există cale de cod care să treacă peste această verificare — `resolveChatModel`,
  `resolveTTS`, `resolveSTT`, `resolveEmbeddings` trec toate prin
  `getActiveAdapter()` (`src/lib/ai-provider.server.ts:122-188` ș.a.).
- **Adaptorul Lovable rămâne înregistrat** în binar chiar pe build-ul
  Self-Hosted (`BUILT_IN_ADAPTERS`, `src/lib/ai-adapters/registry.ts:11-16`) —
  el nu e eliminat la compilare, doar blocat la runtime dacă modul e Self-Hosted.
  Asta înseamnă că protecția e o verificare de runtime bazată pe variabilele de
  mediu `OPSQAI_PLATFORM_MODE`/`OPSQAI_DEPLOYMENT_TYPE`, nu o eliminare fizică a
  codului cloud din pachetul Self-Hosted. Dacă un instalator/operator ar seta
  greșit aceste variabile de mediu (de ex. le-ar lăsa nesetate sau ar seta o
  valoare care nu se potrivește `selfhost`/`self-hosted`/`selfhosted`), sistemul
  ar cădea către `defaultAdapterId()` → tot `SELFHOST_DEFAULT_ADAPTER_ID` **doar
  dacă** `isSelfHostedRuntime()` întoarce `true`; dacă acele variabile lipsesc
  complet, `isSelfHostedRuntime()` întoarce `false` și sistemul s-ar comporta ca
  **Cloud implicit** (`DEFAULT_ADAPTER_ID = "lovable"`,
  `src/lib/ai-adapters/registry.ts:48,66-68`), necesitând însă `LOVABLE_API_KEY`
  (altfel `requireKey()` aruncă, `src/lib/ai-adapters/lovable.ts:17-20`).
  **Risc identificat**: corectitudinea izolării Self-Hosted depinde integral de
  faptul că instalatorul setează corect `OPSQAI_PLATFORM_MODE=selfhost` (sau
  echivalent) la provizionare; codul din acest repo nu conține el însuși dovada
  că instalatorul Windows/on-prem setează mereu această variabilă — verificarea
  concretă a scriptului de instalare/`config.json` e **NEVERIFICAT** în această
  trecere (nu am inspectat `opsqai-windows/**` dincolo de fișierele de gardă/teste
  cerute explicit).
- **Concluzie**: cu variabilele de mediu de Self-Hosted setate corect (condiție
  documentată și impusă de restul suitei — testele offline le setează explicit,
  `src/lib/ai-contract.offline.test.ts:82-88`), **niciun cod din `src/` nu poate
  ajunge la un provider cloud**: verificat static (garda de build), verificat prin
  test (contract offline, blocare de rețea non-locală) și verificat prin citirea
  logicii de rezoluție a adaptorului.

---

## 6. Pot prompturi/documente/conversații să iasă din infrastructura clientului?

Pe baza enumerării din §3 și a configurării Ollama din §2:

- Toate rutele de chat (`chat.ts`, `academy-chat.ts`, `internal-chat.ts`,
  `workspace-chat.ts`), toate generatoarele de text (Academy, AI Audit, HR,
  gap-drafts, doc-compare, dashboard insights, customer-writer) și toate
  fluxurile de embeddings (KB, SOP, system-docs, internal-requests, core-ops)
  rutează exclusiv prin `resolveChatModel`/`generateAiText`/`resolveEmbeddings`
  din `ai-provider.server.ts`, care pe Self-Hosted rezolvă la adaptorul `ollama`
  cu `local: true` (§1.2, §3).
- Adaptorul `ollama` construiește clientul cu `baseURL` = `OLLAMA_BASE_URL`
  (implicit `127.0.0.1:11434`-tip local, `src/lib/ai-adapters/ollama.ts:13-16`)
  și **fără cheie de autentificare** trimisă către un serviciu terț
  (`src/lib/ai-adapters/ollama.ts:1-6,78-81`) — traficul nu are motiv sau
  destinație să părăsească rețeaua locală.
- TTS/STT nu au implementare pe `ollama` (§2) — nu există cod care să trimită
  audio/text către un serviciu de voce cloud pe Self-Hosted; UI-ul primește
  `501`/`AiCapabilityError` în loc de o degradare silențioasă către cloud.
- Blocajul de rezoluție a adaptorului (§1.2, §5) previne comutarea la un adaptor
  non-local pe un runtime marcat Self-Hosted.

**Concluzie §6**: cu configurarea de runtime Self-Hosted corectă (variabile de
mediu setate conform §5), conținutul (prompturi, chunk-uri de documente,
conversații, audio) rămâne pe infrastructura clientului — nu am găsit niciun
punct de cod în `src/` care să trimită acest conținut către un host extern în
acest mod. Singura rezervă documentată este cea de provizionare/operare descrisă
în §5 (dependența de setarea corectă a `OPSQAI_PLATFORM_MODE`/
`OPSQAI_DEPLOYMENT_TYPE` la instalare), care este în afara acestui cod-bază de
aplicație și rămâne **NEVERIFICAT** aici.

---

## 7. Rezumat constatări

| # | Constatare | Severitate | Dovadă |
|---|---|---|---|
| 1 | Toate punctele de apel AI enumerate (chat, Academy, AI Audit, HR, embeddings, TTS/STT, dashboard) rutează prin `ai-provider.server.ts` / `embeddings.server.ts`; niciun bypass găsit. | Informativ (pozitiv) | §3, tabel complet |
| 2 | Garda de build `verify-ai-boundary.mjs` rulează cu succes (0 violări, 763 fișiere) și testele aferente (8+10+5 = 23 teste) trec. | Informativ (pozitiv) | §4 |
| 3 | Ollama nu are TTS/STT — raportat corect ca indisponibil, fără fallback cloud. | Informativ (pozitiv) | §2, §4.4 |
| 4 | Dimensiunea embedding-urilor e sondată dinamic și schema pgvector se auto-ajustează prin `kb_apply_embedding_dim`, cu protecție anti-corupere (`_force`). | Informativ (pozitiv) | §1.3 |
| 5 | Izolarea Self-Hosted vs Cloud depinde de variabilele de mediu `OPSQAI_PLATFORM_MODE`/`OPSQAI_DEPLOYMENT_TYPE` setate corect la instalare; codul adaptorului cloud (`lovable`) rămâne prezent în binar și ar deveni implicit dacă aceste variabile lipsesc. Verificarea instalatorului care setează aceste variabile e **NEVERIFICAT** (în afara ariei fișierelor inspectate). | Mediu (dependență operațională) | §5 |
| 6 | Timeout-ul concret de request pentru traficul de producție (nu sondele de health) în `generateAiText`/`streamAiText` nu a fost inspectat linie-cu-linie complet. | Scăzut (informațional) | §2, marcat NEVERIFICAT |
| 7 | CRM (`src/lib/crm.functions.ts`) nu conține cod AI — nu e un vector de risc, dar nici o funcționalitate AI de auditat. | Informativ | §3 |

*Raport generat prin analiză statică read-only; nu s-a modificat niciun fișier de cod.*
