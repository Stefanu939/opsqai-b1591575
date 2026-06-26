## Sprint XIV — OPSQAI Academy

A net-new flagship module: AI-powered onboarding & continuous learning, fully isolated from the operational KB. This plan covers DB schema, server functions, AI flows, UI, certificates, retraining, RBAC, and marketing.

---

### 1. Database (one migration)

New tables (all with `company_id`, RLS scoped to `current_company_id()` + platform admin bypass, GRANTs to `authenticated` + `service_role`):

- `academy_departments` — name, description (department scope for paths)
- `academy_learning_paths` — title_en/de/ro, department_id, target_role, mandatory, passing_score, difficulty, language_default, order_index, published
- `academy_chapters` — path_id, title, summary, order_index
- `academy_lessons` — chapter_id, title, objectives[], explanation (md), examples (md), best_practices (md), summary (md), source_doc_id (nullable FK → knowledge_documents), version, published, language, estimated_minutes
- `academy_quizzes` — lesson_id, generated_at, model, question_count, difficulty (cache of last AI quiz pool, optional)
- `academy_enrollments` — user_id, path_id, status (assigned/in_progress/completed/overdue), started_at, completed_at, due_at
- `academy_lesson_progress` — enrollment_id, lesson_id, status, time_spent_seconds, attempts, last_score, completed_at
- `academy_quiz_attempts` — lesson_id, user_id, questions jsonb, answers jsonb, score, passed, created_at
- `academy_certificates` — user_id, path_id, certificate_code (uuid), score, issued_at, pdf_path (storage), qr_payload, revoked
- `academy_retraining_events` — lesson_id, reason, source_doc_id, created_at; plus `academy_retraining_assignments` per affected user
- `academy_settings` — company_id (unique), passing_score, quiz_min, quiz_max, default_difficulty, certificate_template jsonb, languages[]

Triggers:

- `touch_updated_at` on all
- After `knowledge_documents` UPDATE: if a lesson references it, insert `academy_retraining_events` + reassign progress for completed users → notification

Storage bucket: `academy-certificates` (private, signed URL on demand).

Permissions added to `role_permissions`:

- `academy.manage` (admin, manager, supervisor — also platform_owner/admin via inheritance)
- `academy.publish` (admin, manager)
- `academy.learn` (everyone)

### 2. Server functions (`src/lib/academy.functions.ts` + `.server.ts`)

- `listDepartments`, `upsertDepartment`
- `listPaths(filters)`, `getPath(id)` with chapters+lessons
- `createPath`, `updatePath`, `publishPath`
- `createChapter`, `reorderChapters`, `createLesson`, `updateLesson`
- `convertSopToLesson(documentId, chapterId, language)` → calls Lovable AI (`google/gemini-3-flash-preview`) with SOP text; returns structured lesson JSON (objectives, explanation, examples, best_practices, summary)
- `generateQuiz(lessonId, language)` → AI generates 2–5 questions (MCQ / TF / short) grounded in lesson content
- `gradeQuizAttempt(lessonId, answers)` → AI grades short answers + explains wrong ones, returns remediation question
- `enrollEmployee`, `myEnrollment`, `recordLessonProgress`, `completeLesson`
- `issueCertificate(enrollmentId)` → generates PDF (pdf-lib) with logo, QR (qrcode), uploads to storage, returns signed URL
- `academyDashboardKpis(companyId)`, `academyAnalytics(companyId)`, `knowledgeHeatmap(companyId)`, `aiRecommendations(companyId)`
- `chatWithLesson(lessonId, history, message)` — RAG over Academy KB only (lesson content + sibling lessons in path)

All protected with `requireSupabaseAuth` + `has_permission` checks via `assertPermission` helper.

### 3. Routes (TanStack file-based, under `_authenticated`)

```
src/routes/_authenticated/app/academy/
  index.tsx              -> Employee landing (AI welcome, my paths, progress)
  onboarding.tsx         -> AI intake (department/role/language) → assign path
  path.$pathId.tsx       -> Path overview + chapter list
  lesson.$lessonId.tsx   -> Interactive AI lesson + chat sidebar
  quiz.$lessonId.tsx     -> AI quiz runner
  certificates.tsx       -> My certificates
  admin/index.tsx        -> Manager dashboard (KPIs + charts)
  admin/paths.tsx        -> Manage paths/chapters/lessons (tree)
  admin/lesson.$lessonId.edit.tsx
  admin/analytics.tsx    -> Analytics page (recharts)
  admin/heatmap.tsx      -> Knowledge heatmap
  admin/settings.tsx     -> Academy settings
  admin/retraining.tsx   -> Retraining status
```

Add nav entry "Academy" (🎓) to the main sidebar (`src/components/app/app-sidebar.tsx`) gated by `academy.learn`.

Add "Convert to Academy Lesson" action in the KB document row menu (`src/routes/_authenticated/app/knowledge/...`).

### 4. AI Experience

- **Welcome / intake**: conversational form → server fn picks matching path (department + role).
- **Interactive lesson**: lesson page renders the structured content; right-side chat (`useChat` to `/api/academy-chat`) answers only from the current lesson + path content (no operational KB).
- **Quizzes**: server fn calls AI with strict JSON schema for question objects; never persists static quiz; remediation loop generates a fresh question on wrong answer.
- **Recommendations**: nightly server fn aggregates quiz failure rates per lesson + suggests SOP updates.

`src/routes/api/academy-chat.ts` — streaming chat route scoped to one lesson.

### 5. Certificates

`src/lib/academy-certificate.server.ts` uses `pdf-lib` + `qrcode` to render a branded A4 landscape PDF, uploads to `academy-certificates/{company}/{cert_code}.pdf`, returns signed URL. Verification page at `/verify/$code` (public route reading minimal certificate metadata via anon-safe RPC).

### 6. Retraining

DB trigger on `knowledge_documents` UPDATE creates retraining event; server cron (existing pg_cron pattern) creates notifications for affected users and flips their lesson progress to `needs_review`. Manager retraining page lists status.

### 7. Analytics & Heatmap

Postgres functions (in same migration) returning JSONB:

- `academy_kpis(p_company)`
- `academy_completion_over_time(p_company, from, to)`
- `academy_score_distribution(p_company)`
- `academy_department_performance(p_company)`
- `academy_heatmap(p_company)` (failure rate, avg time, revisits per lesson)

Charts via `recharts` (already in stack) in admin pages.

### 8. RBAC

`hasPermission('academy.manage')` gates admin routes; `academy.learn` for employee routes. Platform Owner already inherits via existing `has_permission` chain.

### 9. Marketing site

Update `src/routes/index.tsx` and add `src/routes/academy.tsx` (public marketing page) with hero, feature list (AI guided learning, interactive lessons, dept paths, AI quizzes, dashboards, certificates, heatmaps, recommendations, auto retraining), and CTA. Add Academy entry to feature list / nav. Each route gets its own `head()` metadata.

### 10. i18n

Add EN/DE/RO strings under a new `academy` namespace in `src/i18n/*`.

### 11. Verification

- `tsgo` typecheck
- Drive Playwright through: sign in as Platform Owner → /app/academy → onboarding → start lesson → quiz pass → certificate download → admin dashboard renders.

---

### Technical notes

- New deps: `pdf-lib`, `qrcode` (server-only).
- AI model: `google/gemini-3-flash-preview` via existing `ai-gateway.server.ts`; structured output via `Output.object`.
- All server functions use `requireSupabaseAuth`; admin ones additionally check `has_permission`.
- All new tables follow CREATE → GRANT → ENABLE RLS → POLICY order.
- Storage bucket created via `supabase--storage_create_bucket` after migration.

Scope is large (~30 new files, 1 large migration, 1 storage bucket, ~12 server functions, ~12 routes, marketing updates). I'll implement in a single pass and verify the happy path with Playwright.Excellent implementation plan.

Please include the following additional Enterprise capabilities before starting development.

====================================================

1. AI COURSE GENERATOR  
====================================================

In addition to "Convert SOP to Academy Lesson", allow managers to generate an entire Learning Path automatically.

Example:

Select multiple SOPs

↓

AI automatically creates:

- Course structure
- Chapters
- Lessons
- Learning objectives
- Practical examples
- Summaries
- Quizzes

Managers may edit before publishing.

# ====================================================  
2. ROLE-BASED LEARNING PATHS

Learning Paths should not only depend on Department.

They should also support:

- Job Position
- Experience Level
- Seniority
- Employment Type

Example:

Warehouse

↓

Operator

↓

Junior

↓

Learning Path A

Warehouse

↓

Operator

↓

Senior

↓

Learning Path B

# ====================================================  
3. AI LEARNING ASSISTANT

Inside every lesson,

employees should always have access to an AI Tutor.

The AI should answer only using the Academy Knowledge Base for that lesson and learning path.

It should never use the operational Knowledge Base.

# ====================================================  
4. MANAGER COURSE ASSIGNMENTS

Managers should be able to:

- Assign courses manually
- Assign courses to departments
- Assign courses to roles
- Assign courses to individual employees
- Set due dates
- Mark courses as mandatory or optional

# ====================================================  
5. COURSE VERSIONING

Every lesson should have versions.

Managers should be able to:

- View previous versions
- Restore previous versions
- Compare versions

# ====================================================  
6. COURSE LIBRARY

Create an Academy Library.

Managers can browse:

- Draft courses
- Published courses
- Archived courses

# ====================================================  
7. EMPLOYEE PROFILE

Every employee should have an Academy Profile.

Display:

- Assigned Learning Paths
- Completed Courses
- Certificates
- Current Progress
- Average Score
- Training Hours
- Required Retraining

# ====================================================  
8. WEBSITE

OPSQAI Academy should be promoted as one of the platform's flagship Enterprise modules.

It should appear alongside:

- AI Assistant
- Knowledge Base
- AI Workspace
- AI Workspace Audit
- Templates
- Analytics

Describe Academy as:

"Transform your company's operational knowledge into an AI-powered onboarding and continuous learning experience."

This module should become one of the primary selling points of OPSQAI.

&nbsp;