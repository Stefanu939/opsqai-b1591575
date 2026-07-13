adaugă o constrângere la nivel de bază de date (ex. un index unic parțial, sau un lacăt explicit — `SELECT ... FOR UPDATE` pe un rând de configurare, sau pur și simplu o coloană `setup_completed_at` verificată **și** setată atomic, într-o singură tranzacție, nu în doi pași separați). Testul de verificare cerut în plan („POST direct la firstRunCreateAdmin → trebuie Forbidden") ar trebui completat cu un test de dublă-cerere simultană (`Promise.all` cu două apeluri paralele), nu doar apeluri secvențiale — altfel condiția de rasă poate trece neobservată chiar și prin testele lor.

**Un lucru de clarificat, nu neapărat o greșeală:**

La pasul 4 (AI Provider) și 5 (SMTP), planul spune că secretele „merg via `add_secret`/env" — dar în contextul unui wizard rulat de un client fără cunoștințe tehnice (exact scenariul pe care tu însuți l-ai descris, „nu vreau să editez fișiere manual"), nu e clar din text **cum** ajunge secretul acolo prin interfața wizard-ului, fără ca utilizatorul să deschidă manual `.env`. Cere-le să clarifice explicit: câmpul de parolă din formularul wizard-ului scrie direct o variabilă de mediu la runtime (posibil, dacă `entrypoint.sh`/aplicația suportă asta), sau chiar wizard-ul tot cere clientului să editeze un fișier la un moment dat, undeva pe drum? Dacă răspunsul e a doua variantă, contrazice exact motivul pentru care ai cerut acest wizard.  
First-Run Setup Wizard (Phase 5)

Distinct from `/_authenticated/app/platform/setup.tsx` (the Doctor panel, unchanged). The new wizard is a **public** route reachable only when the install has zero platform admins.

## Route & gate

- New route: `src/routes/first-run.tsx` at URL `/first-run` (public — NOT under `_authenticated/`).
- New server fn `getFirstRunGate` (no auth middleware) returns `{ open: boolean, reason }`:
  - `open=true` iff `OPSQAI_MODE==="selfhost"` AND `SELECT count(*) FROM user_roles WHERE role IN ('platform_owner','platform_admin')` is 0 (via `supabaseAdmin`, loaded inside the handler).
  - Otherwise `open=false` — the route renders a "Setup already completed" panel with a link to `/auth`. `beforeLoad` calls the gate and `throw redirect({ to: "/auth" })` when closed. This is the **security-critical boundary**.
- Once ANY admin exists, the gate flips permanently closed. There is no "reopen" affordance — a lost admin uses the DR break-glass flow, not this route.
- Every state-changing step server fn re-runs the gate check at the top of `.handler()` (defense in depth: `throw new Error("Forbidden: setup already completed")` if an admin now exists). No `requireSupabaseAuth`; authorization is "install has no admins".

## Steps (10)

Reuses existing server code where it exists; adds thin new server fns where it doesn't. Persists progress as string IDs in `platform_config.setup_progress` reusing the `SETUP_STEPS` catalog (extending it with new IDs where needed — never storing secrets).


| #   | Step                             | Server logic                                                                                                                                                                                                                                                                                                                  | Persists                                                            |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Accept License (EULA + checkbox) | new `acceptEula` fn — records timestamp in `platform_config.eula_accepted_at` (new column)                                                                                                                                                                                                                                    | new step id `eula_accepted`                                         |
| 2   | Import Installation License      | reuse `license-import.server.ts` via new unauth wrapper `firstRunImportLicense` (gate-protected)                                                                                                                                                                                                                              | existing `license_imported`                                         |
| 3   | Configure Storage                | new `firstRunTestStorage` — writes/reads/deletes a probe object in the uploads bucket                                                                                                                                                                                                                                         | existing `storage_ok`                                               |
| 4   | Configure AI Provider            | new `firstRunSetAiProvider` — writes provider selection into `platform_config.ai_provider_config` (JSON, no raw secrets — secret values go via `add_secret`/env, only non-secret identifiers persisted). Test call via active adapter's `resolveChat`.                                                                        | existing `ai_configured`                                            |
| 5   | Configure SMTP                   | new `firstRunTestSmtp` — sends probe email; persists non-secret host/port/from into `platform_email_settings` (existing table). Password reference only.                                                                                                                                                                      | existing `smtp_configured`                                          |
| 6   | Configure SSO (optional/skip)    | reuse `sso_configurations` insert if provided; else mark skipped                                                                                                                                                                                                                                                              | new step id `sso_configured` (soft)                                 |
| 7   | Configure Backup                 | new `firstRunSetBackupTarget` — writes non-secret backup target kind (`local`/`s3`/`azure`/`nas`) + endpoint into `platform_config.backup_config` (new column, no secrets)                                                                                                                                                    | new step id `backup_configured` (soft)                              |
| 8   | Test Connections                 | reuse `runDoctorReport()` from `doctor.server.ts` verbatim; render its checks. Requires overall status ≠ `fail` to proceed.                                                                                                                                                                                                   | derived (`db_ok`, `storage_ok`, `ai_configured`, `smtp_configured`) |
| 9   | Create Admin                     | new `firstRunCreateAdmin` — inside handler: re-check gate, `supabaseAdmin.auth.admin.createUser({email,password,email_confirm:true})`, insert `user_roles(user_id, role='platform_owner')`, set `platform_config.setup_completed_at = now()`. Only the FIRST call succeeds; subsequent calls fail because gate is now closed. | new step id `admin_created` (already in catalog)                    |
| 10  | Finish                           | client-side redirect to `/auth` with a success toast. Preloaded email in the sign-in form via search param.                                                                                                                                                                                                                   | —                                                                   |


## Files

- Create `src/routes/first-run.tsx` — the wizard UI (stepper, one card per step, resume support).
- Create `src/lib/first-run.functions.ts` — `getFirstRunGate`, `markFirstRunStep`, `acceptEula`, `firstRunImportLicense`, `firstRunTestStorage`, `firstRunSetAiProvider`, `firstRunTestSmtp`, `firstRunSetBackupTarget`, `firstRunRunDoctor`, `firstRunCreateAdmin`. None use `requireSupabaseAuth`; each starts with `await assertFirstRunOpen()`.
- Create `src/lib/first-run.server.ts` — `assertFirstRunOpen()` helper (single source of truth for the gate).
- Edit `src/lib/setup-steps.ts` — add `eula_accepted`, `sso_configured` (soft), `backup_configured` (soft) to the frozen catalog.
- Migration:
  - `alter table platform_config add column eula_accepted_at timestamptz`, `ai_provider_config jsonb`, `backup_config jsonb`.
  - No new grants needed (existing platform_config grants apply).
- Edit `src/routes/__root.tsx` or add a small `beforeLoad` on `/auth` that, when the gate is open, redirects to `/first-run` — so a fresh install lands users in the wizard automatically.
- Edit `docs/administrator-guide/03-setup-wizard.md` — replace the current "reopen `/app/platform/setup`" resume note with the new `/first-run` flow; keep the Doctor page description intact under a "Post-setup: Doctor panel" section.

## Verification

Playwright script under `/tmp/browser/first-run/`:

1. **Fresh case**: delete every row from `user_roles WHERE role IN ('platform_owner','platform_admin')` on a scratch DB (or use a stubbed gate override for the test). GET `/first-run` unauthenticated → renders the wizard (screenshot). Walk steps 1–9 to completion. Screenshot the redirect to `/auth`.
2. **Closed case**: after step 9 (admin now exists), GET `/first-run` again unauthenticated → **must** redirect to `/auth`. Also POST directly to `firstRunCreateAdmin` server fn → **must** return `Forbidden`. Screenshot both.
3. Doctor panel at `/app/platform/setup` still requires `isPlatformAdmin` and is unchanged (smoke test).

Report both cases in the final message with screenshot paths.

## Non-goals

- No Postgres "configure" step — DB is up before the wizard runs; only surfaced as `db_ok` inside step 8.
- No secret storage in `platform_config` — only identifiers/hostnames/kind flags. Secrets stay in `.env` / `add_secret`.
- No changes to the existing Doctor panel, `setup.functions.ts`, or `installation-package.*`.