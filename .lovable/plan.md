# Self-Hosted: Upload & Export pentru KB și FAQ

Doar pentru build-ul Self-Hosted instalat la client. Nu se modifică Cloud/Management Center și nici demo-ul din MC.

## Ce există deja (verificat)

- **KB** (`app.knowledge.tsx`): buton `Upload document`, upload versiune nouă, buton `Export`. Upload-ul merge deja platform-agnostic (repository + storage provider) → funcționează Self-Hosted.
- **FAQ** (`app.faq.tsx`): buton `Add FAQ` (manual) + buton `Export`. **Nu** există import de fișiere.
- **Export** (`exports.functions.ts`): întreg pipeline-ul folosește `getCloudSupabase(...)`, care în Self-Hosted aruncă eroare → butoanele Export din KB și FAQ eșuează la client.

## Ce construim

### 1. Export funcțional în Self-Hosted
- Extragem citirile/ștergerile din `exports.functions.ts` într-un repository per platformă (`IExportRepository`): implementare Cloud (existentă, prin Supabase) și implementare Self-Hosted pe Postgres local.
- Arhiva ZIP se scrie și se citește prin `getStorageProvider()` (bucket `exports`), nu prin Supabase Storage; download-ul primește un URL semnat local în loc de signed URL Cloud.
- Migrare Self-Hosted nouă (`0014_exports.sql`) pentru tabela `exports` (id, kind, mode, format, status, progress, sha256, bytes, file_count, storage_path, error, timestamps) + indexuri.
- Audit-ul exportului se scrie prin repository-ul de audit local, nu prin RPC Cloud.

### 2. Import FAQ (buton nou `Import`)
- Dialog nou cu două căi:
  - **CSV / XLSX**: coloane `question`, `answer`, `category` (opțional), `is_active` (opțional). Preview cu rândurile detectate, validare, apoi creare în masă.
  - **PDF / DOCX**: textul e extras și trimis la providerul AI configurat local (fără Cloud), care propune perechi întrebare/răspuns; utilizatorul le bifează/editează înainte de salvare.
- Salvarea folosește repository-ul FAQ existent (deja platform-agnostic), deci merge identic Cloud și Self-Hosted.

### 3. Verificări
- `Export` KB + FAQ produce ZIP descărcabil în Self-Hosted.
- `Import` FAQ creează intrări care apar imediat în listă și devin căutabile de AI Chat.
- Guardrail-urile rămân active: `verify-bundle` și `verify-source-imports` trec (nicio referință Cloud nouă), plus migrarea nouă trece `verify-selfhost-migrations`.

## Detalii tehnice

- Fișiere noi: `src/lib/providers/contracts/export-repository.ts`, `src/lib/providers/cloud/supabase-export-repository.server.ts`, `src/lib/providers/selfhost/pg-export-repository.server.ts`, `src/components/admin/faq-import-dialog.tsx`, `migrations/selfhost/0014_exports.sql`.
- Fișiere modificate: `src/lib/exports.functions.ts` (fără `getCloudSupabase`), `src/lib/faqs.functions.ts` (`importFaqs` bulk + extragere AI), `src/routes/_authenticated/app.faq.tsx` (buton `Import`), înregistrare provider în registry-ul de boot.
- Parsarea XLSX/CSV și extragerea textului din PDF/DOCX rulează server-side, în server functions, ca să nu crească bundle-ul clientului.
