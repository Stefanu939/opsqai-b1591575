# OPSQAI Self-Hosted — Final UX Corrections

Scope: Windows installer wizard truthfulness, Bubble Chat unread notifications, the Users-list bug, and a small UX bug sweep. No architecture, provider, database, Ollama, licensing, migrations (except one tiny read-state addition only if proven missing), Cloud or Management Center changes.

## 1. Installer wizard — align UI with what it really does

Verified facts from the code:
- `main.cjs::buildBootstrapArgs` passes only: `installId`, company name, admin email/password/first/last, `--db-mode` (+ `--db-external`), `--storage-mode` (+ s3), `--ai`, `--license`, `--smtp`.
- The Options screen collects **install folder, data folder, Desktop shortcut, Start Menu entry, Start with Windows** — none of these reach the installer. Install/data folders are fixed by NSIS (`C:\Program Files\OPSQAI`, `C:\ProgramData\OPSQAI`); shortcuts are created by NSIS; services are Windows services that already start with Windows.
- Database: both modes are real. Embedded skips the connection test; external is validated through `wizard:testDatabase` and forwarded.
- Install progress: stage list in `wizard.js` is already derived from real bootstrap log lines via the `STAGE_MATCHERS` regexes.
- Finish: `wizard:finish(launch)` really launches `desktop-shell\OPSQAI.exe` (browser fallback).

Changes, screen by screen:
1. Welcome / 2. License / 3. System check — keep; only reword text that overstates what is checked (labels must match `wizard:runSystemChecks` results).
2. Options (step 4):
   - Replace the fake editable-looking folder inputs with a read-only "Install locations" summary that states these paths are fixed by the installer.
   - Remove the Desktop shortcut / Start Menu checkboxes, or keep them only as a static statement of what NSIS actually creates (no toggles that do nothing).
   - Remove "Start OPSQAI when Windows starts" toggle; replace with a one-line note that OPSQAI runs as Windows services and starts automatically.
   - Keep the Ollama model fields (they are really forwarded in `--ai`).
3. Database (step 5) — keep both modes; keep the connection test gate; tighten wording (Bundled PostgreSQL vs External PostgreSQL server).
4. Administrator (step 6) — clarify it creates the first **local** OPSQAI platform administrator used to sign in after install; state password rules actually enforced; explicitly not a Cloud account.
5. Review (step 7) — rebuild the summary from state that is actually sent: License (edition/seats/modules from the validated token), Install locations (fixed paths), Database mode (+ external host), AI models, Administrator email, SMTP if configured. Drop shortcut/autostart rows.
6. Install (step 8) — keep the real stage list; verify each regex still matches current `init.js` log lines and fix any drift so no stage is decorative.
7. Finish (step 9) — single accurate success message plus the working actions (Launch OPSQAI, open logs). No other buttons.

Branding, layout, and the Sovereign Mark stay as they are.

## 2. Bubble Chat — unread notifications

Existing infrastructure to reuse: `unread_count` per conversation from the chat conversations query, and the `markRead` server function already called when a conversation is open. No new tables unless the repository genuinely lacks read state — checked first, and only then the smallest local addition.

- Lift a lightweight unread-total subscription into `ChatGlider` so the floating button shows a count badge (`9+` cap) when the panel is closed.
- Brief pulse/ring animation on the bubble when the total increases.
- One grouped in-app toast ("New message from <name>" / "N new messages") per arrival burst, throttled so polling never spams; suppressed for the conversation currently open and visible.
- Panel open in list view: show unread pills (already present) and keep them live.
- Panel open in another conversation: that conversation keeps its unread pill; badge reflects other conversations only.
- Window unfocused: use `document.visibilityState` to allow the toast/badge; also set an unread prefix on `document.title` so the desktop shell taskbar shows activity. No external notification service.
- Marking read stays server-side (`markRead`), so unread state survives close/reopen, navigation, and re-render; closing the panel preserves the active conversation (already persisted in localStorage).
- Composer polish: send button loading state, failed-send error with retry, clearer sender/time separation.

## 3. Users list — created user missing

Diagnosis is **not yet confirmed**; step one is to prove it. Suspect area, from reading `listUsers`:
- For a platform admin, `scope` is `null` and the list is rebuilt from `authAdmin.listUsers()` + `profileRepo.findByUserId`, dropping any user whose profile lookup returns null.
- For a company admin, `scope` is the synthetic tenant id and `listByCompany` filters on `COALESCE(company_id, $1) = $1`, so a mismatched `company_id` hides the row.
- `createUser` inserts into `public.users` then calls `profileRepo.updateByUserId(...)`; if that update fails or writes a different company id, the user can still log in but not appear.

Plan:
1. Add temporary structured server-side logging in `listUsers`/`createUser` (auth user count, profile hit/miss, resolved scope, company ids) to identify which of the above actually happens on the installed build.
2. Fix the identified cause in the existing local repository path only — no Users-system rewrite, no Supabase/Cloud calls, no auth/RBAC change. Most likely a scope/company-filter or profile-row correction so the list and the create path use the same authoritative local source.
3. Ensure the Users page invalidates and refetches after create (already invalidates `["app-users"]`; verify it actually resolves) so the new user appears without a reload.
4. Verify persistence after reload and after logout/login, and that email, name, Worker role, and status render correctly.

## 4. Small UX bug sweep (only in touched areas)

Installer wizard, Bubble Chat, Users page: fix dead-looking buttons, dialogs that cannot close, silent successes, never-resolving loaders, stale lists after create/edit/delete, and duplicate floating elements.

## 5. Visual direction from the reference images

Applies to Self-Hosted only: deepen the existing dark enterprise theme toward the reference dashboards — deep navy/emerald surfaces, tighter KPI stat cards, softer card borders with subtle glow, chart-friendly accent gradients — using the existing tokens in `src/styles.css` and the `card-enterprise` / `hover-lift` utilities. No new design system, no Cloud/MC restyling.

## 6. Verification

- `bunx tsgo --noEmit`, full vitest suite, plus new tests for unread-count derivation/throttling and the Users-list scope fix.
- Self-Hosted app build and Windows installer build; confirm the packaged wizard files and frontend provenance hash match the sources just changed (no stale artifact).
- Final report: installer screens changed, obsolete UI removed, options verified against implementation, unread implementation, Users root cause, files changed, tests, typecheck, build results.
