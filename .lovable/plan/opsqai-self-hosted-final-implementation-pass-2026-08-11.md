# OPSQAI Self-Hosted — Final Implementation Pass

Self-Hosted only. Cloud, Management Center, demo tenant, licensing, migrations, Ollama and provider architecture stay as they are; shared files get platform-scoped additions, never Cloud removals.

IMPORTANT — IMPLEMENTATION, NOT AUDIT

This is the final implementation pass.

Do not respond with another audit/plan instead of implementing the changes.

Do not stop after source changes or green tests.

For every feature, follow the complete chain:

SOURCE

→ SELF-HOSTED BUILD

→ PACKAGED ARTIFACT

→ INSTALLED SELF-HOSTED APPLICATION

Management Center, Demo and Cloud are NOT the target of this work.

If the same shared component is used by Cloud and Self-Hosted, preserve the

Cloud behavior and add the Self-Hosted behavior through platform-aware logic.

Do not create duplicate UI implementations.

Do not claim a UI feature is implemented because the component/button exists

in source code. Verify that the permission state, route, bundle and installed

Self-Hosted application actually render it.

Do not claim runtime verification unless the installed Windows application was

actually opened and tested.

When something cannot be runtime-verified in your environment, explicitly mark

it:

SOURCE: verified

TESTED: verified/not verified

PACKAGED: verified/not verified

RUNTIME VERIFIED: pending local Windows test

Do not hide incomplete work behind "tests green", "typecheck clean", or

"build successful".  
1. Icons — one approved source

Audited mapping (verified in repo):

```text
opsqai-windows/installer/nsis/assets/opsqai.ico  <- single Windows source
  NSIS MUI_ICON / MUI_UNICON        (installer exe)
  NSIS shortcut + Add/Remove icon   (installed shortcut)
  wizard/package.json  --icon       (OPSQAI-Wizard.exe)
  desktop-shell/package.json --icon (OPSQAI.exe)
  desktop-shell main.cjs iconPath() (window + tray)
  build.ps1:542 -> payload\assets\opsqai.ico
WEB: public/favicon.svg|.ico, public/icons/*, manifest.webmanifest, __root.tsx links
APPROVED MARK: public/brand/sovereign-mark.svg
```

Problems found: `opsqai.ico` renders as a plain blue dot (placeholder, not the Sovereign Mark), and `public/favicon.svg` is still the older navy meridian mark.

Work: regenerate `opsqai.ico` from the Sovereign Mark at 16/24/32/48/64/128/256 (same filename, no reference changes); regenerate `favicon.svg`, `favicon.ico`, `icons/icon-32/192/512`, maskable and apple-touch from the same mark; add `build.ps1` assertions that `payload\assets\opsqai.ico` is byte-identical to source and that the icon extracted from `OPSQAI-Setup.exe`, `OPSQAI-Wizard.exe` and `OPSQAI.exe` matches it, so a stale icon fails the build.

## 2. Installer wizard — truthful UI

Verified: `buildBootstrapArgs` forwards only installId, company, admin name/email/password, `--db-mode` (+ external), `--storage-mode`, `--ai`, `--license`, `--smtp`. Install/data folders and shortcuts are owned by NSIS; services already auto-start.

- Options: replace the editable-looking folder inputs with an informational "Install locations" block (`C:\Program Files\OPSQAI`, `C:\ProgramData\OPSQAI`) plus the line that locations are managed by the installer. Remove the Desktop-shortcut / Start-Menu / Start-with-Windows checkboxes; state as informational rows that shortcuts are created and that OPSQAI runs as Windows services starting automatically. Keep the Ollama model fields (really forwarded).
- Database: keep bundled vs external, keep the real connection test, tighten wording.
- Administrator: state it creates the first local OPSQAI platform administrator for this installation, not a Cloud account; show the real password rules.
- Review: only forwarded values — license edition/seats/modules, fixed paths, database mode (+ external host), AI config, admin email, SMTP when set.
- Install: keep the existing stage list; re-verify every `STAGE_MATCHERS` regex against current `init.js` log lines and fix drift so no stage is decorative.
- Finish: success message + Launch OPSQAI (already spawns `desktop-shell\OPSQAI.exe`) + Open logs. Nothing else.

## 3. Academy — Create course

Wire a permission-gated ("academy.manage") Create course dialog on the Academy page to the existing `upsertAcademyPath` server function and local `pg-academy-repository`; on success invalidate Academy queries and open the new course editor. No Supabase, no RBAC bypass. Tests: authorized create, Worker denied, persistence after reload, no Cloud call.

## 4. Temporary-password flow

After a successful password update: rotate the local session via `/api/auth/refresh` so the `must_change_password` claim clears, unmount the reset page, and redirect to the normal post-login entry (Dashboard). Failure keeps the user on the page with a visible error; expired session redirects to login; success shows "Password updated successfully" with a working "Continue to OPSQAI" fallback and never leaves a hanging loader.

## 5. Users list — created user must appear

Diagnosis to confirm first with temporary structured logging in `listUsers`/`createUser` (auth user count, profile hit/miss, resolved scope, company ids). Suspects from reading the code: for a platform admin the list is rebuilt from `authAdmin.listUsers()` + `profileRepo.findByUserId` and silently drops profile misses; for a company admin `listByCompany` filters `COALESCE(company_id,$1)=$1`, so a mismatched company id hides the row; `createUser` inserts the auth row then patches the profile, so a failed/mismatched patch yields a user who can log in but never lists.

Fix in the existing local repository path only: make create and list use the same authoritative company/scope value and guarantee the profile row exists for every local user. Then invalidate + refetch the Users query so the row appears with email, first/last name, Worker role and status, and verify persistence across reload, logout/login and app restart.

## 6. Bubble Chat — unread notifications

Reuse the existing per-conversation `unread_count` and `markRead`; no new table. Lift the unread total into `ChatGlider`: count badge on the floating button (cap 9+), brief pulse when the total increases, one grouped throttled in-app toast per arrival burst, suppressed for the conversation currently open and visible. Other-conversation unread stays visible while another thread is open. When the window is unfocused, allow the toast and prefix `document.title` with the unread count. Also: send-button loading state, failed-send error with retry, clearer sender/time separation, and a check that only one bubble instance mounts.

## 7. Knowledge / FAQ / AI Audit — actions actually visible

For Knowledge, align the client-side permission gates with the permissions the server functions really require so Upload Document, Upload SOP, Re-index, version history, Export, search and the critical flag are visible to authorized admins in the installed build, while Workers keep seeing none of the admin-only actions. Same pass for FAQ (Add/Import/Export/Edit/Delete) with query invalidation so changes appear without reload. AI Audit: verify Run new audit, latest score, passed/warnings/critical and history all run through the local repository path.

## 8. Chat — multilingual + strict grounding

Server-side enforcement inside the existing Self-Hosted retrieval path (local pgvector + bge-m3 + Ollama):

- Detect the language of the current user query and instruct the model to answer in that language regardless of evidence language; document language never selects the answer language.
- Retrieval stays language-agnostic (multilingual embeddings), so a Romanian question can match a German document.
- Hard grounding gate: if no KB/FAQ evidence clears the relevance threshold, return the configured "not available in the knowledge base" response in the user's language instead of calling the model for a free answer. When evidence exists, the prompt restricts the answer to that evidence and requires citations, and prior conversation turns cannot reintroduce world knowledge.

Regression tests: RO question + DE doc, DE + EN, EN + RO, grounded question, no matching evidence, unrelated question (the basketball case), unrelated history, and no Cloud/Supabase invocation.

## 9. UI/UX polish (Self-Hosted only)

Using the existing tokens in `src/styles.css` plus `card-enterprise` / `hover-lift`: deepen the enterprise dark surfaces, tighten spacing and typographic hierarchy, cleaner KPI cards, subtle borders/glows, consistent buttons, dialogs, empty and loading states, responsive desktop/mobile. Priority order: Dashboard, AI Chat, Knowledge, FAQ, Academy, AI Audit, Users, Organization. Installer wizard keeps the same enterprise treatment. No second design system.

## 10. Small UX bug sweep

Only in the areas above: dead-looking buttons, buttons hidden by wrong client-side permission assumptions, dialogs that cannot close, silent successes, loaders that never resolve, empty states without an action, stale lists after create/edit/delete, duplicate floating elements.

## 11. Verification and honest status reporting

`bunx tsgo --noEmit`; full Vitest suite with total/passed/failed/skipped reported; Self-Hosted frontend build; Windows installer build (wizard + desktop shell); confirm the packaged frontend and wizard match the sources just changed via the provenance hash, that no stale frontend artifact is packaged, and that the icon assertions pass on `OPSQAI-Setup.exe`, `OPSQAI-Wizard.exe`, `OPSQAI.exe` and `payload\assets\opsqai.ico`.

Every item in the final report is labelled SOURCE / TESTED / PACKAGED / RUNTIME VERIFIED. Note upfront: RUNTIME VERIFIED means observed in an installed Windows build. This environment cannot install and click through a Windows EXE, so those checks are prepared as a clean-install checklist (installer screens, admin/Worker login, temp-password redirect, Users row persistence, Knowledge/FAQ/Academy/AI Audit actions, chat grounding and language cases, Bubble Chat unread, icons/shortcut) for you to run on the produced installer; nothing will be reported as runtime-verified without your confirmation.

Final report contents: files changed, Academy Create Course, temp-password fix, Users root cause and fix, Bubble Chat unread, Knowledge fixes, FAQ fixes, AI Audit verification, multilingual retrieval fix, grounding enforcement, installer UI changes, icon pipeline changes, UI/UX changes, typecheck result, full test counts, Self-Hosted build result, Windows installer build result, provenance hash, artifact verification, and the clean-install checklist status.