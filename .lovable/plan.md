# Self-Hosted: finalizare module client (KB/FAQ upload+export, Academy, RBAC, AI Chat, logo, users)

Doar build-ul Self-Hosted instalat la client. Cloud/Management Center și demo-ul MC rămân neschimbate.

## Stare actuală (verificată în cod)

Deja funcțional Self-Hosted:
- **Primul Superadmin din installer** — `admin-seed.mjs` creează contul din formularul de setup și îi acordă rolul protejat `platform_owner`.
- **RBAC** — migrări `0012` + `0013` (roluri Superadmin / Manager / Supervisor / Worker, permisiuni, owner nelimitat).
- **AI Chat** — `src/routes/api/chat.ts` este platform-agnostic (retrieval din KB/FAQ prin repository local + provider AI local).
- **Users add** — `users.functions.ts` creează utilizatori local, fără Cloud.
- **Logo companie / profil** — `avatar.ts` + `profile.functions.ts` merg prin storage provider local.
- **KB** — upload document, upload versiune nouă (repository + storage provider local).

Încă Cloud-only (aruncă „Cloud provider was reached inside a Self-Hosted build”):
- **Academy** — `academy.functions.ts` și `academy-lms.functions.ts` folosesc integral `getCloudSupabase`.
- **Export KB / FAQ** — `exports.functions.ts` (tabela `exports`, ZIP, storage, audit) este Cloud-only.
- Module conexe folosite de client: `sop-ack`, `sop-versions`, `knowledge-gaps`, `internal-requests`, `onboarding`.
- **FAQ nu are import de fișiere** (doar adăugare manuală).

Rămân intenționat Cloud-only (MC): licențe, portal, customers, releases, mc-admin, platform-overview, subscription-lifecycle, installation-package, dr, email logs, analytics, api-keys, webhooks, system-docs, companies, setup, deployment-mode, first-run, admin-stats, support.

## Ce construim

### 1. Export KB / FAQ în Self-Hosted
- `IExportRepository` cu implementare Cloud (existentă) și Postgres local.
- ZIP scris/citit prin `getStorageProvider()` (bucket `exports`), download prin URL semnat local.
- Migrare `0014_exports.sql` pentru tabela `exports` (kind, mode, format, status, progress, sha256, bytes, file_count, storage_path, error, timestamps).
- Audit prin repository-ul local, nu prin RPC Cloud.

### 2. Import FAQ (buton nou `Import`)
- **CSV / XLSX**: coloane `question`, `answer`, `category?`, `is_active?` — preview, validare, creare în masă.
- **PDF / DOCX**: text extras server-side, providerul AI local propune perechi Q/A pe care userul confirmă/editează înainte de salvare.
- Salvarea folosește repository-ul FAQ existent (merge identic Cloud și Self-Hosted).

### 3. Academy pe repository local
- `IAcademyRepository` (learning paths, chapters, lessons, versiuni, enrollments, progres, quiz attempts, certificate, retraining, settings, KPI/heatmap).
- Implementare Cloud = interogările actuale; implementare Self-Hosted pe Postgres local, cu KPI/heatmap calculate în SQL local (fără RPC Cloud).
- Migrare `0015_academy.sql`: tabelele `academy_*` din Cloud, adaptate Self-Hosted (fără FK spre tabele Cloud, fără funcții Cloud), plus indexuri.
- Generarea de lecții din SOP folosește retrieval-ul KB local + providerul AI local.

### 4. Module conexe KB/SOP
- `sop-ack`, `sop-versions`, `knowledge-gaps`, `internal-requests`, `onboarding` mutate pe repository per platformă; tabelele lipsă adăugate în migrarea `0016_sop_gaps_requests.sql`.

### 5. Verificări (DoD)
- Într-o instalare curată: login Superadmin din installer → creare user → upload SOP → întrebare în AI Chat cu răspuns grounded → import + export FAQ → creare learning path Academy și parcurgere lecție → upload logo companie.
- Fără nicio eroare „Cloud provider was reached”.
- `verify-bundle`, `verify-source-imports`, `verify-selfhost-migrations` și testele trec.

## Detalii tehnice

- Contracte noi în `src/lib/providers/contracts/`, implementări în `providers/cloud/*.server.ts` și `providers/selfhost/*.server.ts`, înregistrate în registry-ul de boot.
- Migrări noi: `0014_exports.sql`, `0015_academy.sql`, `0016_sop_gaps_requests.sql` (fingerprint SHA-256 ca celelalte).
- Parsarea CSV/XLSX/PDF/DOCX rulează exclusiv în server functions, ca să nu crească bundle-ul clientului.
- Ordinea de execuție: 1 → 2 → 3 → 4, fiecare pas complet și verificat înainte de următorul.
