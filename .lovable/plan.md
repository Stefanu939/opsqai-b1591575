# LogiAssist — AI Assistant for Logistics & Warehouse Operations

A bilingual (DE/EN) professional web app where warehouse and logistics employees can chat with an AI assistant trained on internal procedures, with a knowledge base, FAQ management, and admin user controls.

## Design Direction

**Visual language:** Industrial-professional. Crisp white surfaces, deep navy primary (`oklch(0.30 0.08 250)`), warm signal-amber accent (`oklch(0.78 0.16 75)`) for active/CTA states, slate neutrals. Subtle 1px hairline borders, generous whitespace, rounded-md (not pill). Inspired by Linear + DHL/Maersk operational dashboards.

**Typography:** Inter (UI) + JetBrains Mono (numbers, IDs, CMR refs).

**Layout:** Persistent left sidebar (collapsible on mobile → bottom sheet). Top bar with language toggle, user menu. Content area max-w-screen.

## Features

### Pages / Routes
- `/auth` — Email+password + Google sign-in
- `/` (dashboard) — KPI cards (conversations today, KB docs, FAQs, active users for admins), recent threads, quick-start prompts in 8 logistics categories
- `/chat/$threadId` — AI chat with streaming, thread sidebar, new-thread button
- `/knowledge` — Upload/list documents (PDF, DOCX, TXT), categorize, delete (admins upload; everyone reads)
- `/faq` — Searchable FAQ list, admins can create/edit/delete
- `/admin/users` — Admin-only: list users, assign roles (admin/employee), deactivate

### AI Assistant
- Lovable AI Gateway → `google/gemini-3-flash-preview` (streaming via AI SDK)
- System prompt scoped to logistics topics (Wareneingang, Warenausgang, loading/unloading, CMR, processes, transport planning, safety, internal procedures), bilingual responses matching user's language
- Context injection: top-matching FAQ entries + knowledge-base document excerpts (simple keyword match for v1; embeddings later)
- AI Elements for chat UI (Conversation, Message, PromptInput, Response)

### Backend (Lovable Cloud)
**Tables:**
- `profiles` (id→auth.users, full_name, department, language_pref, created_at)
- `user_roles` (id, user_id, role enum: admin|employee) + `has_role()` security-definer fn
- `threads` (id, user_id, title, created_at, updated_at)
- `messages` (id uuid, thread_id, role, content, parts jsonb, created_at)
- `knowledge_documents` (id, title, category, file_path, content_text, uploaded_by, created_at)
- `faqs` (id, question_de, question_en, answer_de, answer_en, category, created_at)

**Storage:** `knowledge-docs` bucket (private, admins write, authenticated read)

**RLS:** Users see their own threads/messages/profile; everyone authenticated reads FAQs/KB; admins manage FAQs/KB/users via `has_role(auth.uid(),'admin')`.

**Server functions:**
- `streamChat` server route `/api/chat` — auth, loads thread, retrieves FAQ/KB context, streams via AI SDK, persists messages in `onFinish`
- `createThread`, `deleteThread`, `listThreads`
- `uploadDocument`, `listDocuments`, `deleteDocument`
- FAQ CRUD
- User admin: list users, set role

### Auth
- Email/password + Google OAuth (via Lovable broker)
- First registered user auto-promoted to admin (via trigger); subsequent users default to `employee`
- Profile auto-created on signup via trigger

### i18n
Lightweight in-memory dictionary (`src/i18n/`) + `LanguageProvider` reading `profiles.language_pref`, toggle in topbar.

### Mobile
Sidebar → Sheet on `<md`. Chat composer sticky bottom. Touch-friendly 44px targets.

## Technical Notes
- TanStack Start file-based routes, `_authenticated/` gate
- AI SDK + `@ai-sdk/react` `useChat` with `DefaultChatTransport` keyed by threadId
- AI Elements installed via `bunx ai-elements@latest add conversation message prompt-input shimmer`
- shadcn for forms/tables/dialogs
- Generated logo (warehouse/route metaphor, not Sparkles)

## Out of scope for v1
Vector embeddings (keyword retrieval first), document OCR, voice input, SSO/SAML, multi-tenant.

Ready to build?