# Self-Hosted: final convergence pass

Goal: make the Windows Self-Hosted build work end-to-end for the first admin created in the installer — login, internal chat bubble, KB/FAQ upload & AI answers, AI Audit, user/role management, and module licensing.

## 1. License decoding (blocks modules showing up)

`src/lib/license.tsx` still decodes the legacy 4-part `opsqai.v1.*` token. The installer and Management Center now issue standard JWT EdDSA licenses.

- Update `decodeTokenPayload` to accept both:
  - standard JWT payload (`{install_id, company_name, tier, modules, max_users, expires_at, ...}`)
  - legacy `opsqai.v1.*` payload (keep for backwards compatibility)
- Ensure `effectiveModules` returns the union of `BASIC_MODULES` plus the modules listed in the JWT `modules` claim.
- Verify the license context is injected by the desktop shell via `window.__OPSQAI_LICENSE__` and read by `license.tsx`.

## 2. Role presets & first admin ownership

The migration `0013_owner_roles_and_presets.sql` defines `platform_owner` / `platform_admin` and renames display names. Remaining gaps:

- Verify the installer seeder assigns the first admin `platform_owner` and marks it protected.
- Ensure `authorization.ts` treats `platform_owner` as having every permission (short-circuit in `hasPermission`).
- Verify the Users page can create members with email + temporary password and assign one of: Superadmin (`platform_owner`/`platform_admin`), Manager (`manager`), Supervisor (`team_leader`), Worker (`employee`).
- Block self-demotion/deletion of the last owner.

## 3. Internal chat bubble on Self-Hosted

`src/components/support/chat-glider.tsx` already uses `chat.functions.ts` and the registry. Remaining work:

- Remove the `cloudFeaturesEnabled()` gate in `src/routes/__root.tsx` so `ChatGlider` renders in `selfhost` mode.
- Add a polling refresh path inside `ChatGlider` for Self-Hosted (no realtime), keeping the Supabase realtime path only when a browser provider exists.
- Verify attachment upload/download through the local NTFS storage provider.

## 4. KB / FAQ upload and grounded AI Chat

- Verify the upload button is visible for roles with `kb.manage` / `faq.manage`.
- Ensure uploaded documents are chunked and embedded using the local pgvector path (Self-Hosted migration `0010_kb_pgvector.sql` + `0016_academy_gaps.sql`).
- Confirm `match_document_chunks_for_company` (or the local equivalent) is called by the chat route and returns chunks.
- Keep the lowered similarity threshold (0.12) and confidence threshold (0.3) so SOPs in English match questions in German/Romanian.
- Keep the grounded system prompt: answer only from SOP/FAQ, never describe AI capabilities, and answer from the available inventory when the user asks a general capability question.

## 5. AI Audit runnable on local data

- Add `ai_audit` to the module catalog so it appears when licensed.
- Verify the AI Audit "Run" button is visible to Superadmin/Manager.
- Ensure the audit runs against local documents and produces a score + findings + recommended actions (not an empty/stale state).

## 6. Organization / profile / company logo

- Verify `app.organization.tsx` loads profile, departments, and AI config on Self-Hosted without Cloud-only calls.
- Ensure company logo upload uses `profile.functions.ts` / `avatar.ts` through the local storage provider.
- Ensure `companyName` is populated in `useAuth` on Self-Hosted by reading from the platform config or license payload.

## 7. Demo content for Self-Hosted preview

The Management Center demo tenant exists but demo documents lack files/chunks/embeddings.

- Attach real sample PDFs to the 8 demo knowledge documents.
- Generate chunks + embeddings so AI Chat can cite them.
- Verify the 10 FAQs are bilingual (EN/DE) and top up any missing translations.
- Ensure the demo Academy learning path has lessons, a quiz, and an enrolled demo learner.
- Make demo content re-runnable/removable in one action.

## 8. Verification

- `bun run typecheck` clean.
- `opsqai-windows/build/verify-source-imports.mjs` clean.
- `opsqai-windows/build/verify-bundle.mjs` clean on a Self-Hosted build.
- Manual pass: sign in as installer admin → Chat bubble → upload SOP → ask AI → run AI Audit → create user → assign role → view Modules.

## Out of scope for this plan

- Cloud/MC new features.
- Marketing site redesign beyond keeping shared design tokens consistent.
- Self-Hosted Windows installer structural changes (installer already works).
