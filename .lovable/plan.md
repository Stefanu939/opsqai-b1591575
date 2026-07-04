
# Academy → Enterprise LMS refactor

Scope: UX / workflow / capability changes only. No visual redesign. Reuse existing design tokens, shadcn components, sidebar, routing shell, auth and RBAC. All work stays inside the already-authenticated `_authenticated/app.academy.*` tree and the existing DB schema (`academy_learning_paths`, `academy_chapters`, `academy_lessons`, `academy_enrollments`, `academy_lesson_progress`, `academy_certificates`, `academy_quiz_attempts`).

## 1. Navigation — split learner from library

Update `src/components/app/app-shell.tsx` sidebar so learners get a dedicated area:

```text
Dashboard
Knowledge          → /app/knowledge   (documentation only)
My Training        → /app/academy     (assigned courses — landing)
AI Teacher         → /app/academy/teacher   (dedicated launcher)
Certificates       → /app/academy/certificates
```

- Rename the current "Academy" sidebar entry to **My Training** (icon unchanged: `GraduationCap`).
- Remove the "Knowledge → launch course" affordance from `app.knowledge.tsx` (course launch chips) so learners never enter Knowledge to start a course.
- Managers/admins keep **Academy Manager** in the admin group (`/app/admin/academy`) with the extra tabs described in §7.
- Permissions stay: `academy.learn` (employees), `academy.manage` (managers/admins), `academy.assign` (new — see §8).

## 2. My Training dashboard (`/app/academy`)

Rebuild `app.academy.index.tsx` around **modern training cards**, one per enrollment. Data source: `academy_enrollments` joined with `academy_learning_paths`, `academy_chapters`, `academy_lessons`, `academy_lesson_progress`, `academy_certificates`.

Card fields:

| Field | Source |
|---|---|
| Thumbnail / icon | Path icon (fallback: `GraduationCap`) |
| Title | `path.title` |
| Mandatory / Optional badge | `enrollment.mandatory` |
| Progress bar + % | `count(progress.status='completed') / count(lessons)` |
| Lessons completed | same |
| Estimated duration | `sum(lessons.estimated_minutes)` |
| Assigned by | `profiles.display_name(enrollment.assigned_by)` |
| Due date | `enrollment.due_at` |
| Primary CTA | Start / Continue / View Certificate |
| State chips | `Overdue` (due_at < now && not completed) with warning styling; `Completed ✓` |

Layout: three filter chips at top — **Mandatory · Optional · Completed** — plus a **My Training** search input scoped to assigned enrollments only (§11). Grid: `grid gap-4 md:grid-cols-2 xl:grid-cols-3` using existing `Card`, `Badge`, `Progress`, `Button`.

New employee summary widget (top of `app.index.tsx` Dashboard) — reusing the existing dashboard card style:

- Mandatory Training active count → link to `/app/academy?filter=mandatory`
- Certificates count → `/app/academy/certificates`
- Average quiz score (from `academy_quiz_attempts.score`)
- Learning progress % (weighted across active enrollments)
- Upcoming deadlines (enrollments with `due_at < now + 14d`)

## 3. Course view (path detail)

Keep `app.academy.path.$pathId.tsx` structure but add a **stepper** rendering the learning-path sequence and a clear "Next lesson" affordance:

```text
Step 1: Warehouse Safety   ✓
Step 2: Receiving          ● in progress
Step 3: Picking            ○
Step 4: Packing            ○
Final Assessment           ○
Certificate                🎖
```

Reuse existing chapter/lesson list; add a top summary row (progress, est. time, mandatory, due date, assigned-by).

## 4. Lesson view

Reorganize `app.academy.lesson.$lessonId.tsx` sections into the requested order using existing components — no visual redesign:

```
Lesson title
Objectives            (existing bullets)
Progress + Estimated time  (existing header widgets)
AI Teacher            (existing chat)
Lesson summary        (existing)
Quiz                  (existing)
Notes                 (new: personal notes → academy_lesson_progress.notes text; add column)
[ Previous ]  [ Mark complete ]  [ Next lesson ]
```

Prev/Next resolve within the current path via chapter+lesson `order_index`. AI Teacher grounding already scoped to the lesson — unchanged.

## 5. Certificates page

Rebuild `app.academy.certificates.tsx` as a card grid, one card per row in `academy_certificates`:

- Path title, completion date, expiration date (if any), certificate ID (`code`), status (Valid / Expiring / Expired).
- Actions: **View** (existing verify route `/verify/$code`), **Download PDF** (new: `generateCertificatePdf` server fn using `pdf-lib`, streamed as a server-route response at `/api/public/certificates/$code.pdf` — signed by verifying the code exists and belongs to the caller's company via RLS).

## 6. AI Teacher launcher (`/app/academy/teacher`)

Thin new route that lets employees pick any lesson from their **active** enrollments and jump into AI Teacher for that lesson. No new grounding logic — reuses `api/academy-chat.ts`.

## 7. Manager / Admin experience

Extend `app.admin.academy.tsx` (Academy Manager) with per-course analytics — pulled from existing tables, no schema needed:

| Metric | Query |
|---|---|
| Assigned users | count(enrollments) |
| Completed | count where status='completed' |
| In progress | count where status='in_progress' |
| Overdue | count where due_at<now and not completed |
| Avg completion time | avg(completed_at - started_at) |
| Avg quiz score | avg(quiz_attempts.score) |
| Completion % | completed / assigned |
| Certificates issued | count(certificates where path_id=…) |

Also add a **Cohort** table per course listing users with status + progress + last activity, so a manager sees who is behind on mandatory training.

## 8. Assign flow (make the Assign button real)

New dialog component `AssignTrainingDialog` opened from:

- Academy Manager → course row action
- Academy Manager → new bulk **Assign** toolbar
- Admin → user detail page

Capabilities:

- **Targets:** individual employees (multi-select), departments, roles, or Entire Company (checkbox). Resolved server-side to a distinct user set.
- **Content:** one course, multiple courses, or full learning path (courses = paths in current schema; multi-select allowed).
- **Options:** due date, priority (low / normal / high), mandatory toggle, notify checkbox.

Server fn `assignTraining` (createServerFn + `requireSupabaseAuth`, gated by permission `academy.assign` → managers, company_admin, platform admins):

1. Resolve target user ids from targets.
2. Upsert `academy_enrollments` (unique on `path_id,user_id`) with `assigned_by=userId`, `mandatory`, `due_at`, `status='assigned'`.
3. Insert `notifications` rows for each new enrollment (see §9).
4. Return counts (assigned, skipped-already-enrolled).

New role → permission mapping: add `academy.assign` to `role_permissions` for `company_admin`, `manager`. Migration in the same batch.

Assigned courses appear in `/app/academy` on next load — no extra client wiring; the enrollment already flows through the dashboard query.

## 9. Notifications

Reuse the existing `notifications` table. Emit `type` values:

- `academy.course_assigned`
- `academy.course_due_soon` (nightly `pg_cron` @ 07:00 UTC → any enrollment where `due_at between now and now+3d`, unnotified)
- `academy.course_overdue` (same cron: `due_at < now`)
- `academy.quiz_available` (on lesson completion when quiz exists)
- `academy.certificate_earned` (on certificate row insert — trigger)
- `academy.path_completed` (on last lesson completion)

Add a small guard column `notified_stage text[]` on `academy_enrollments` so cron doesn't re-notify.

## 10. Certificates on completion

Trigger `academy_issue_certificate` on `academy_enrollments UPDATE` when status transitions to `completed`: inserts an `academy_certificates` row (code = short random, valid_until = optional based on path setting) and emits the notification above. Idempotent.

## 11. Search scoping

`/app/academy` search hits only enrollments belonging to the current user (already enforced by RLS). Knowledge search remains on `/app/knowledge` — no cross-linking.

## 12. RBAC summary

| Role | Can |
|---|---|
| Employee | See only own enrollments; launch AI Teacher, take quizzes, view own certificates |
| Manager | Everything Employee can + assign training within their company + view cohort analytics |
| Company Admin | Manager + author/edit paths/chapters/lessons + issue/revoke certificates |
| Platform Super Admin | All companies via existing global admin tools |
| Platform Owner | Existing platform surfaces unchanged |

Enforced via existing `has_role` / `has_permission` functions + RLS on academy tables (already scoped by `company_id`). Only new grant: add `academy.assign` permission row and gate `AssignTrainingDialog` + server fn on it.

## Delivery batches

**Batch A — schema & backend**
- Migration: add `academy_lesson_progress.notes text`, `academy_enrollments.priority text default 'normal'`, `academy_enrollments.notified_stages text[] default '{}'`, `role_permissions` rows for `academy.assign`.
- Trigger `academy_issue_certificate` + notification emitters.
- `pg_cron` nightly job → `/api/public/hooks/academy-nudge`.
- Server fns: `listMyTraining`, `getMyTrainingSummary`, `assignTraining`, `listCourseAnalytics`, `listCourseCohort`, `getCertificatePdf` (server route).

**Batch B — learner UX**
- Sidebar split (My Training / Knowledge / AI Teacher / Certificates).
- Rebuild `app.academy.index.tsx` (cards + filters + search).
- Employee summary widget on `app.index.tsx`.
- Path detail stepper.
- Lesson view section reorder + notes.
- Certificates page rebuild + PDF download.
- AI Teacher launcher route.
- Remove course-launch chips from Knowledge.

**Batch C — manager/admin UX**
- Academy Manager analytics tab per course.
- Cohort table.
- `AssignTrainingDialog` (accessible from course row, bulk toolbar, and user detail).
- Notifications wiring end-to-end.

Typecheck after each batch. No visual redesign — every new surface reuses existing `Card`, `Badge`, `Progress`, `Button`, `Dialog`, `Table`, `Tabs`, sidebar, and design tokens.

Reply **continue** and I'll start with Batch A (schema + server functions + cron).
