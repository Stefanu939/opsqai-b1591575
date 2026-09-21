# Audit 05 — Inventar date personale & Inventar teste de securitate

Data: 2026-09. Domeniu: `migrations/selfhost/*.sql` (Self-Hosted), `supabase/migrations/*.sql` (Management Center/Cloud), cod sursă `src/`. Metodă: analiză statică read-only (grep pe schema SQL + `information_schema`-equivalent din `CREATE TABLE`, plus rulare read-only a suitei de teste `vitest`). Fiecare afirmație este însoțită de `cale:linie`. Elementele care nu pot fi verificate din schema/cod disponibil sunt marcate **NEVERIFICAT**.

---

## 1. Inventar de date cu caracter personal

### 1.1 Legendă
- **Self-Hosted (SH)** = schema din `migrations/selfhost/*.sql`
- **Management Center (MC)** = schema din `supabase/migrations/*.sql`
- „Ambele” = tabel/coloană echivalentă există în ambele scheme (nume identic sau funcțional echivalent)

### 1.2 Identitate / cont utilizator

| Tabel.coloană | Tip dată | SH | MC | Sursă |
|---|---|---|---|---|
| `public.users.email` | email | ✅ | — (auth gestionat de `auth.users`, Supabase Auth) | `migrations/selfhost/0001_bootstrap.sql:78` |
| `public.profiles.full_name`, `.department` | nume, departament | — | ✅ | `supabase/migrations/20260617163908_45b63302-2caa-4d13-837f-024e3ea435c3.sql:9` |
| `public.sessions.expires_at`, `public.refresh_tokens.expires_at`, `public.password_resets.expires_at` | token-uri sesiune/resetare (date pseudonime legate de cont) | ✅ | NEVERIFICAT (echivalent gestionat de Supabase Auth intern, schema nu e în `supabase/migrations`) | `migrations/selfhost/0001_bootstrap.sql:97,107,116` |
| `public.platform_owner_allowlist` | email owner platformă | — | ✅ | `supabase/migrations/20260626114603_74948993-0b3c-4eff-b44d-e9b8f54b2866.sql:8` (`email text PRIMARY KEY`) |

### 1.3 Chat / conversații (conținut generat de utilizator)

| Tabel.coloană | Tip dată | SH | MC | Sursă |
|---|---|---|---|---|
| `public.messages.content` | conținut chat | ✅ | ✅ | SH: `migrations/selfhost/0008_chat_feedback_integrations.sql:38`; MC: `supabase/migrations/20260617163908_45b63302-2caa-4d13-837f-024e3ea435c3.sql:70` |
| `public.threads` (leagă mesaje de `user_id`) | metadate conversație | ✅ | ✅ | `migrations/selfhost/0008_chat_feedback_integrations.sql:14`; `supabase/migrations/20260617163908_...:50` |
| `public.direct_messages` | mesagerie internă (chat privat) | ✅ | NEVERIFICAT (nu apare `direct_messages` în `supabase/migrations`) | `migrations/selfhost/0012_rbac_messages_ai_audit.sql:135` |
| `public.document_chunks.content` | text extras din documente încărcate (poate conține date personale din documente HR/CRM) | ✅ | ✅ | `migrations/selfhost/0010_kb_pgvector.sql:72,77`; `supabase/migrations/20260618081253_f353b6f9-0240-414b-b8d1-7675c5161f0c.sql:45,49` |
| `public.ai_audits` | audit interacțiuni AI (conține `question`/context, posibil date personale) | ✅ | echivalent conceptual la `public.audit_log` (`question`, `answer_preview`) | `migrations/selfhost/0012_rbac_messages_ai_audit.sql:149`; `supabase/migrations/20260618081253_...:98` |

### 1.4 Jurnale de audit

| Tabel.coloană | Tip dată | SH | MC | Sursă |
|---|---|---|---|---|
| `public.audit_log` | user_id + acțiune | ✅ | ✅ | `migrations/selfhost/0001_bootstrap.sql:145`; `supabase/migrations/20260618081253_f353b6f9-0240-414b-b8d1-7675c5161f0c.sql:98` |
| `public.hr_employee_audit_log.actor_name`, `.details` (jsonb) | nume actor + detalii schimbări HR | ✅ | NEVERIFICAT (HR e specific SH; nu am găsit `hr_employee_audit_log` în `supabase/migrations`) | `migrations/selfhost/0042_hr_core.sql:119-131` |

### 1.5 HR (angajare) — date sensibile, exclusiv Self-Hosted în schema inspectată

| Tabel.coloană | Tip dată | SH | MC | Sursă |
|---|---|---|---|---|
| `public.hr_employees.first_name`, `.last_name`, `.date_of_birth`, `.address`, `.email`, `.phone` | date identificare + naștere + contact | ✅ | NEVERIFICAT (nu există tabel `hr_employees` în `supabase/migrations`) | `migrations/selfhost/0042_hr_core.sql:55-64` |
| `public.hr_documents.title`, `.filename`, `.data` (bytea), `.body` | documente angajat (posibil contracte, acte identitate) | ✅ | NEVERIFICAT | `migrations/selfhost/0043_hr_extended.sql:28-42` |
| `public.hr_candidates` | date candidați recrutare | ✅ | NEVERIFICAT | `migrations/selfhost/0043_hr_extended.sql:127` |
| `public.hr_incidents`, `.hr_asset_assignments` | incidente/echipamente asociate persoanei | ✅ | NEVERIFICAT | `migrations/selfhost/0043_hr_extended.sql:79,94` |
| `public.hr_settings.retention_months_after_exit` (DEFAULT 9) | **politică de retenție declarată** pentru date HR post-plecare | ✅ | NEVERIFICAT | `migrations/selfhost/0042_hr_core.sql:16` |

### 1.6 Transport (flotă/șoferi) — Self-Hosted

| Tabel.coloană | Tip dată | SH | MC | Sursă |
|---|---|---|---|---|
| `public.transport_drivers.full_name`, `.phone`, `.email` | date contact șofer | ✅ | NEVERIFICAT | `migrations/selfhost/0029_transport.sql:79-81` |
| `public.transport_carriers.name`, `.address` | date firmă transportator | ✅ | NEVERIFICAT | `migrations/selfhost/0029_transport.sql:106,112` |
| `public.transport_documents.file_path` | documente transport (posibil CMR/acte identitate șofer) | ✅ | NEVERIFICAT | `migrations/selfhost/0029_transport.sql:136-152` |

### 1.7 CRM / formulare publice (Management Center)

| Tabel.coloană | Tip dată | SH | MC | Sursă |
|---|---|---|---|---|
| `public.contact_submissions.name`, `.email`, `.phone`, `.message` | lead-uri formular contact site public | — | ✅ | `supabase/migrations/20260630195450_d058cad1-973c-4ad4-a592-033eb395f3ee.sql:47-53` |
| `public.crm_leads`, `.crm_activities`, `.crm_lead_events`, `.crm_offers` | pipeline vânzări (nume, contact lead) | — | ✅ | `supabase/migrations/20260907215947_feba2acf-8a94-4924-bbe6-cf11b37cf97a.sql:3-97` |
| `public.study_contacts.email`, `.phone` | contacte studiu/cercetare | — | ✅ | `supabase/migrations/20260908212657_446df0fd-a74b-4fd6-af22-ea29be28242b.sql:23-26` |

### 1.8 Retenție / TTL identificate în schema live

| Mecanism | Domeniu | Sursă |
|---|---|---|
| `public.exports.expires_at`, `.deleted_at` | job-uri export (KB/FAQ/workspace ZIP), ambele scheme | `migrations/selfhost/0014_exports.sql:29` (mirror declarat explicit al tabelului Cloud, linia 3: „Mirrors the Cloud `exports` table shape”) |
| `public.workspace_files.expires_at`, `public.workspace_artifacts.expires_at` + funcție cron de ștergere (`DELETE ... WHERE expires_at < now()`) | fișiere/artefacte workspace AI, doar MC | `supabase/migrations/20260625225350_2cdeeba8-2617-4c67-b438-4b9ed414cf8a.sql:42,57,88,103,113,115` |
| `companies.workspace_retention` (`immediate`/`1h`/`24h`/`7d`/`manual`) | politică retenție per companie, doar MC | `supabase/migrations/20260625225350_2cdeeba8-2617-4c67-b438-4b9ed414cf8a.sql:3-4` |
| `public.purge_terminated_tenants()` — șterge companie + „archive anonymized audit entries” după terminare, programat via `cron.job` | ștergere tenant, doar MC | `supabase/migrations/20260705121436_b56ca3b5-60ad-4beb-a538-b3cd0db358d6.sql:106-165` |
| `public.purge_archived_audit_log()`, programat via `cron.job` | curățare audit arhivat, doar MC | `supabase/migrations/20260705145547_1278f712-0550-4f1c-9881-650bce05ac6a.sql:1-35` |
| `public.hr_settings.retention_months_after_exit` | **doar setare stocată**; nu am găsit job/cron/funcție care să citească și să aplice automat această valoare în `src/` sau în `migrations/selfhost/*.sql` → **NEVERIFICAT ca aplicat efectiv**, doar declarat | `migrations/selfhost/0042_hr_core.sql:16` |
| `sessions/refresh_tokens/password_resets.expires_at` | TTL sesiuni auth Self-Hosted | `migrations/selfhost/0001_bootstrap.sql:97,107,116` |

Concluzie retenție: mecanisme de expirare/purjare automată există și sunt programate (`pg_cron`) doar în schema Management Center (`purge_terminated_tenants`, `purge_archived_audit_log`, `ws_*_expires_idx`). Pentru Self-Hosted, singurul TTL activ identificat este la nivel de sesiune/export; retenția HR post-angajare (`retention_months_after_exit`) este stocată ca setare dar nu am găsit codul care o execută automat (NEVERIFICAT).

### 1.9 Funcționalități de export/ștergere (drepturile persoanei vizate)

| Funcționalitate | Există? | Sursă |
|---|---|---|
| Interfață comună `IExportRepository` (export KB/FAQ/workspace) implementată separat pentru fiecare mediu | ✅ | `src/lib/providers/interfaces.ts`; implementări: `src/lib/providers/selfhost/pg-export-repository.server.ts:23-53`, `src/lib/providers/cloud/supabase-export-repository.server.ts:22-56` |
| Tabel `public.exports` cu coloane `deletion_status`, `deletion_typed`, `deleted_at` (flux de confirmare/ștergere a exportului) | ✅ | `migrations/selfhost/0014_exports.sql:9-29` |
| Ștergere hard a unui angajat HR (`deleteEmployee`) | ✅ (ștergere definitivă din `public.hr_employees`, fără anonimizare/soft-delete) | `src/lib/hr/db.server.ts:370-376` (`DELETE FROM public.hr_employees WHERE company_id = $1 AND id = $2`) |
| Export dedicat al datelor personale ale unui utilizator/angajat („portabilitate” în sensul art. 20) pe modelul „descarcă tot ce avem despre mine” | NEVERIFICAT — nu am găsit endpoint/funcție de tip `exportEmployee`, `exportUserData`, `dataSubjectExport` în `src/lib/hr.functions.ts` sau `src/lib/hr/db.server.ts`; exportul existent (`exports` table) e la nivel de KB/FAQ/workspace, nu la nivel de persoană individuală |
| Ștergere/anonimizare cont utilizator (self-service „delete my account”) | NEVERIFICAT — nu am găsit `deleteUserAccount`/`eraseUser` în `src/` |
| Ștergere tenant + anonimizare audit la reziliere (Cloud) | ✅ | `supabase/migrations/20260705121436_b56ca3b5-60ad-4beb-a538-b3cd0db358d6.sql:106-150` (funcția `purge_terminated_tenants`, comentariu explicit „archive anonymized audit entries, then delete the company”) |

---

## 2. Inventar de teste de securitate

Rulare read-only: `bunx vitest run` (nu s-a modificat cod). Rezultat obținut live:

```
Test Files  65 passed (65)
     Tests  438 passed (438)
```
(sursă: log intern al rulării, comanda `bunx vitest run --reporter=dot`, secțiunea finală „Test Files … Tests …”)

### 2.1 Acoperire pe domenii

| Domeniu cerut | Fișiere de test identificate | Stare |
|---|---|---|
| Autentificare | `src/lib/__tests__/login-throttle.test.ts` (blocare brute-force login) | ✅ trece (inclus în cele 438) |
| Autorizare / RBAC | Niciun fișier dedicat cu „rbac”/„role”/„permission” în nume găsit în `src/**/__tests__/*.test.ts*` (căutare pe 54 fișiere de test din `src`) | **LIPSĂ** — cel mai apropiat e `src/lib/__tests__/break-glass.test.ts` (verifică doar hash-ul secretului „break-glass”, nu fluxul de autorizare/RBAC în sine) |
| RLS (Row-Level Security) | Niciun test automat care interoghează Postgres cu roluri diferite pentru a verifica politicile RLS | **LIPSĂ** — verificat static: cele 85 de tabele create în `supabase/migrations/*.sql` au toate un `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` corespunzător (verificare `comm` schema-vs-RLS: 85/85 acoperite), dar nu există test automat care exercită efectiv politicile (ex. „user A nu vede rândul user B”) |
| Endpoint-uri API | Niciun fișier `*.test.ts` cu „api”/„endpoint”/„route” în nume | **LIPSĂ** ca teste de integrare HTTP; există doar teste unitare pe funcții server (`*.functions.ts` echivalente) |
| Licențiere | `src/lib/__tests__/license-enforcement.test.ts`, `license-issue.test.ts`, `license-signing.test.ts`, `license-crl.test.ts`, `license-client.test.tsx`, `src/lib/providers/__tests__/cipher-and-license.test.ts` | ✅ trec (6 fișiere) |
| AI offline | `src/lib/ai-contract.offline.test.ts`, `src/lib/ai-adapters/ollama.test.ts`, `src/lib/providers/__tests__/not-available.test.ts` | ✅ trec |
| Scurgere de date (data leakage) | `src/lib/__tests__/usage-audit-privacy.test.ts` (verifică că telemetria de utilizare e „numbers-only” și respinge orice cheie suplimentară, inclusiv una care ar transporta conținut); `src/lib/__tests__/mc-secrets-blacklist.test.ts` (verifică o listă neagră de secrete pentru Management Center); `src/lib/providers/selfhost/__tests__/no-supabase-context.test.ts` (verifică izolarea completă a contextului Supabase în build-ul Self-Hosted) | ✅ trec, dar acoperire parțială — testează izolare de mediu și schema telemetriei, nu scurgere cross-tenant de date de business |
| Izolare tenant | `src/lib/__tests__/selfhost-tenant-binding.test.ts` (normalizare `companyKey`) | ✅ trece, dar testează doar funcția de derivare a cheii, nu izolarea end-to-end a datelor |

### 2.2 Ce lipsește explicit
- Niciun test de tip RBAC/permisiuni care instanțiază `public.role_permissions`/`public.permissions` (`migrations/selfhost/0012_rbac_messages_ai_audit.sql:12-38`) și verifică refuzul de acces pe un rol fără permisiune.
- Niciun test care rulează împotriva unei baze Postgres reale cu politici RLS active (toate testele găsite sunt teste unitare Vitest pe funcții pure/mock-uri, nu teste de integrare DB).
- Niciun test HTTP de tip request/response pentru endpoint-uri API (ex. server functions din `*.functions.ts`).
- Niciun test dedicat exportului/ștergerii datelor personale (drepturile persoanei vizate) — nu există `*.test.ts` care exercită `deleteEmployee`, `pg-export-repository.server.ts` sau `supabase-export-repository.server.ts`.

### 2.3 Scanare dependențe / SAST / DAST / gating CI

| Element | Găsit? | Detalii |
|---|---|---|
| CI workflow | ✅ un singur workflow | `.github/workflows/build-windows-installer.yml` — rulează pe `windows-latest`, nu conține niciun pas `test`/`vitest`/`npm run test` (căutare `grep -n "test\|vitest\|npm run\|bun run"` în fișier: singurele potriviri sunt `runs-on: windows-latest` și `bun-version: latest`, fără invocare de teste) |
| Poartă de test în CI (test gate) | **LIPSĂ** — niciun workflow nu rulează `bunx vitest run` ca o condiție de build/merge |
| Scanare dependențe (Dependabot/Renovate/Snyk) | **LIPSĂ** — nu există `.github/dependabot.yml`, `renovate.json` sau `.snyk` în repo |
| SAST (ex. CodeQL, Semgrep, SonarQube) | **LIPSĂ** — nicio referință `codeql`/`semgrep`/`sonar` în `package.json` sau `.github/` |
| DAST | **LIPSĂ** — nicio configurație identificată |
| Linting ca gate de calitate (nu securitate) | Există `eslint.config.js` și scriptul `"lint": "eslint ."` în `package.json`, dar nu este invocat din workflow-ul CI existent |

---

## Rezumat concluzii

1. Datele cu caracter personal cele mai sensibile (nume, data nașterii, adresă, contact, documente angajat) sunt concentrate în modulul HR din **Self-Hosted** (`hr_employees`, `hr_documents`, `hr_candidates`) și nu au echivalent găsit în schema Management Center inspectată.
2. Management Center are mecanisme de retenție/purjare automată (cron) mai mature (`purge_terminated_tenants`, `purge_archived_audit_log`, TTL pe `workspace_files`/`workspace_artifacts`) decât Self-Hosted, unde retenția HR e doar o setare stocată fără job de aplicare identificat (NEVERIFICAT ca activ).
3. Există o funcție de ștergere hard pentru angajați (`deleteEmployee`, `src/lib/hr/db.server.ts:370-376`) dar nu un export dedicat „toate datele despre această persoană” — deci dreptul la ștergere are suport parțial în cod, dreptul la portabilitate/export individual **NEVERIFICAT**.
4. Suita de teste (438 teste / 65 fișiere) trece integral la rularea read-only, cu acoperire solidă pe licențiere și AI offline, dar **lipsă de teste automate dedicate RBAC, RLS live și API HTTP**.
5. Nu există scanare de dependențe, SAST sau DAST în repo, iar singurul workflow CI existent nu rulează suita de teste ca poartă de calitate.
