# OPSQAI Self-Hosted — Gap Audit (read-only)

No files were modified. Findings only, plus a recommended fix order.

## AUDIT 1 — Academy → local repository

**Verdict: FAIL** (not "leaking to Cloud" — it hard-fails).

Every Academy server function fetches data through `getCloudSupabase(context, "academy")`:
- `src/lib/academy.functions.ts:1` + ~33 server fns (departments L55, paths L150-199, chapters, lessons L294, quiz/course generation L492/587/743/878, enrollments L1001-1256, certificates L1256-1298, dashboard/settings L1299-1405).
- `src/lib/academy-lms.functions.ts:1` (`listMyTraining` L72, `getMyTrainingSummary` L205, `saveLessonNotes` L293, `assignTraining` L342 — which also calls `.rpc("academy_resolve_targets")` at L346 — `listCourseAnalytics` L442).
- `src/lib/providers/not-available.ts:39-45`: `getCloudSupabase` throws `FeatureNotAvailableError` whenever mode ≠ Cloud. So on Self-Hosted *every* Academy action fails.

The local implementation already exists and is complete:
- `src/lib/providers/selfhost/pg-academy-repository.server.ts:75` implements all 48 methods of `IAcademyRepository` (`src/lib/providers/interfaces.ts:1468-1559`), including analytics aggregates and `resolveTargets` (the local equivalent of the Cloud RPC).
- Registered at `src/lib/providers/selfhost/bootstrap-selfhost.server.ts:305`.
- Tables match `migrations/selfhost/0015_academy.sql`; departments come from `public.departments` (+ `0016_academy_gaps.sql`).
- **But `getAcademyRepository()` (`src/lib/providers/registry.ts:316`) has zero call sites.** The repository layer was built and never wired to the functions.

Not the blocker (proven):
- Licensing: `academy` is a licensed module (`src/lib/license-modules.ts:20,51`), enforced server-side via `assertModuleForCompany` (`src/lib/license-enforcement.server.ts:137-153`). It fails *after* / independently of the provider bug, and it queries the central Cloud licence ledger in both editions by design. Not the cause of Academy being dead.
- AI generation is already correct: `generateAiText` → `src/lib/ai-provider.server.ts:120` → `ai-adapters/registry` (Ollama-capable). No cloud AI path.
- Permissions mostly fine, one real gap: UI + server use `academy.assign` (`app.academy.index.tsx:153`, `app.academy.analytics.tsx:59`, `academy-lms.functions.ts:341`) but `migrations/selfhost/0012_rbac_messages_ai_audit.sql:57-59` seeds only `academy.learn`, `academy.manage`, `academy.publish` — verified by grep: `academy.assign` appears in no Self-Hosted migration. Assign UI/action is therefore unavailable even after the provider fix.

| Academy surface/action | Current provider | Local repo exists? | License gate? | Permission gate? | Root cause | Required fix |
|---|---|---|---|---|---|---|
| Departments list/upsert | getCloudSupabase | yes | yes | academy.manage | fn bypasses repo | route through `getAcademyRepository()` |
| Paths CRUD | getCloudSupabase | yes | yes | academy.manage | same | same |
| Chapters/Lessons CRUD + versions | getCloudSupabase | yes | yes | academy.manage | same | same |
| SOP→lesson / course / quiz generation | AI ok, persistence via getCloudSupabase | yes | yes | academy.manage | persistence bypasses repo | swap only DB writes |
| Enroll / assign / progress | getCloudSupabase | yes | yes | academy.assign **unseeded** | repo bypass + missing permission row | repo swap + seed `academy.assign` |
| Quiz attempts / grading | getCloudSupabase | yes | yes | academy.learn/manage | repo bypass | repo swap |
| Certificates | getCloudSupabase | yes | yes | academy.learn | repo bypass | repo swap |
| Settings | getCloudSupabase | yes | yes | academy.manage | repo bypass | repo swap |
| Analytics / heatmap / cohort | getCloudSupabase + Cloud RPC | yes (`resolveTargets`, `getKpis`, …) | yes | academy.manage | repo bypass + RPC | repo swap incl. `resolveTargets` |
| My Training / summary | getCloudSupabase | yes | yes | academy.learn | repo bypass | repo swap |

Risk to Cloud mode: low — the Cloud repository (`cloud/supabase-academy-repository.server.ts:74`) is already registered in `bootstrap-cloud.server.ts:276`, so routing through the registry keeps Cloud behaviour, provided per-method SQL parity is checked while migrating.

Acceptance test: in a Self-Hosted install, `/app/academy` lists paths, a manager can create a path + generate a lesson, an employee can enroll, take a quiz and receive a certificate — with zero `FEATURE_NOT_AVAILABLE_SELFHOST` errors and all rows landing in embedded Postgres `academy_*` tables.

## AUDIT 2 — Cloud-only Support & Tickets

**Verdict: PARTIAL** (routes safe; the CTA is dead and the widget is ungated dead code).

| Surface | Visible in SH nav? | Direct URL in SH? | Cloud call reachable? | Current fallback | Required fix |
|---|---|---|---|---|---|
| `/management/support` | no (staff console) | no — `management.tsx:12-14` beforeLoad redirects selfhost → `/app` | blocked pre-render | silent redirect | none |
| `/portal/support` | no | no — `portal.tsx:15-19` beforeLoad redirect | blocked pre-render | silent redirect | none |
| "Support & Tickets" sidebar button `app-shell.tsx:239-250` | **yes, ungated** | n/a | no | **nothing happens** — dispatches `opsqai:open-support`, and `SupportWidget` is never mounted anywhere (grep: only comments at `app-shell.tsx:43,354`; `__root.tsx:177` mounts `ChatGlider` only) | hide in selfhost (mirror the existing `show: mode !== "selfhost"` pattern at `app-shell.tsx:113`) or point it at an honest unavailable state |
| `SupportWidget` `src/components/support/support-widget.tsx:100` | not rendered | n/a | would be: static `import { supabase } from "@/integrations/supabase/client"` at L33 + `support.functions.ts` calls | n/a (dead) | if ever mounted, gate with `cloudFeaturesEnabled()`/`getCloudBrowserDb()` (`src/lib/cloud-client.ts:14-25`) as `notifications-bell.tsx:4,29` already does, and drop the static import |
| `support.functions.ts` (all handlers L26-260) | — | — | throws `FeatureNotAvailableError` on SH | typed error | none |
| `ChatGlider` | yes, by design | overlay | no — uses provider registry | n/a | none |
| `app.subscription.tsx` | yes | yes | no cloud DB call, branches on deployment mode | correct SH copy | none |

Also verified: no `support.*` permission rows exist in any Self-Hosted migration, so `hasPermission("support.use")` is false there — a second reason nothing renders.

Mechanism to reuse: `FeatureNotAvailableError` / `notAvailable()` (`not-available.ts:16-24`) server-side, `cloudFeaturesEnabled()` / `getCloudBrowserDb()` (`cloud-client.ts`) client-side.

Acceptance test: in Self-Hosted, no navigation entry leads to Support, or the entry opens a panel stating support is handled through the vendor portal; a browser console session shows no request to `support.functions` and no `Cloud provider was reached` error.

## AUDIT 3 — UI/UX polish

**Verdict: PARTIAL.** The token system (`src/styles.css:73-154`) and shared primitives (`page-header.tsx:69`, `empty-state.tsx:29-44`, `section-card.tsx:35`, `badge.tsx`, `skeleton.tsx`) are solid, but adoption is thin: only `app.audit.tsx:67`, `app.organization.tsx:172`, `app.modules.tsx:65` use `PageHeader`; `SectionCard` has no consumers; `Skeleton` has no consumers in `_authenticated`.

| Page/component | Polished? | Evidence | Remaining gap | Recommended change | Prio |
|---|---|---|---|---|---|
| Support & Tickets CTA | no | `app-shell.tsx:239-250` | button does nothing | gate/replace | **P0** |
| Academy (all pages) | no | fails at provider layer | pages error out | Audit 1 fix | **P0** |
| `app.knowledge.tsx` | partial | no shared primitives in 866 lines; `text-3xl` L352 vs `text-2xl` L834; spinners L437,707,787; `min-w-[220px]` L487 | header/empty/loading all bespoke | `PageHeader`, `SectionCard`, `Skeleton` rows | P1 |
| `app.index.tsx` dashboard | partial | hand-rolled `h1` L146 `text-3xl md:text-4xl`; ad-hoc all-done card L161-175 | scale diverges, duplicate empty state | `PageHeader` + `EmptyState` | P1 |
| `app.faq.tsx` | partial | hand-rolled `h1` L136; no `EmptyState` | duplicated header, no zero-result state | adopt primitives | P1 |
| `app.chat.$threadId.tsx` | partial | `emerald-*` literals L86,608,722; `max-w-[85%]` L264 | status colours off-token | `Badge` + `--success` | P1 |
| `app.academy.index.tsx` | partial | **local `EmptyState` shadowing the shared one at L414**; `emerald-*`/`red-*` L329,337,345 | naming trap + off-token colours | delete local copy, use tokens | P1 |
| `app.academy.analytics.tsx` | partial | `green/blue/red-*` L153,255,260,265,307; duplicate `min-h-dvh` wrappers L90,192 | charts off-token, dark mode wrong | map to `--chart-1..5` | P1 |
| `app.academy.lesson.$lessonId.tsx` | partial | `green-500` L436, `green-600`/`red-600` L518 | quiz feedback off-token | `text-success` / `text-destructive` | P1 |
| `app.subscription.tsx` | partial | `emerald-600` L45,65; hand-rolled `h1` L27 | off-token, no `PageHeader` | tokens + `PageHeader` | P1 |
| `chat-glider.tsx` | partial | fixed `md:w-[400px] md:h-[640px]` L145 | clips on short viewports | clamp `max-h-[min(640px,80vh)]` | P1 |
| Loading states, app-wide | no | zero `Skeleton` usages in `_authenticated` | spinner-or-nothing | skeletons on table/list pages | P1 |
| `app.audit.tsx`, `app.organization.tsx`, `app.modules.tsx`, `app.tsx` shell | yes | `PageHeader`/`EmptyState`/`RouteErrorState` (`app.tsx:35`) | sub-heading scale only | `SectionCard` for sub-sections | P2 |
| `app.academy.{path,certificates,kb,teacher,courses}.tsx` | mostly | heading scale drifts `text-xl`/`text-3xl`; `green-500` in `path.$pathId:131` | scale + one literal | normalize via `PageHeader` | P2 |

Note: no `app.settings.tsx` / `app.profile.tsx` route exists — settings live in `app.organization.tsx` and the shell user menu; `h-screen` is already gone (all `min-h-dvh`), so mobile viewport handling is fine.

## CROSS-CHECK vs Master Patch claims

1. "Academy → academy-lms.functions.ts → pg-academy-repository (never getCloudSupabase)" — **FAIL**. Both function files use `getCloudSupabase` exclusively; `getAcademyRepository()` is uncalled (`registry.ts:316`).
2. "Cloud-only surfaces hidden or honest unavailable state" — **PARTIAL**. `/portal/*` and `/management/*` are correctly gated; the sidebar Support CTA is ungated and dead, and `SupportWidget` keeps a static Cloud import while being mounted nowhere.
3. "Enterprise UI/UX polish across the shell and major pages" — **PARTIAL**. Tokens/primitives exist, three pages adopt them, the highest-traffic pages (knowledge, dashboard, FAQ, academy, chat) do not.

# AUDIT SUMMARY

1. **Academy: FAIL** — root cause: server functions never migrated onto the already-complete `pg-academy-repository`; `getCloudSupabase` throws on Self-Hosted. Files: `src/lib/academy.functions.ts`, `src/lib/academy-lms.functions.ts`, `src/lib/providers/registry.ts:316`, `selfhost/pg-academy-repository.server.ts`, `migrations/selfhost/0012` (missing `academy.assign`). Minimal fix: replace every `getCloudSupabase(...)` data call with `getAcademyRepository(context)` methods (incl. `resolveTargets` for the RPC) and seed `academy.assign`.
2. **Cloud-only Support: PARTIAL** — root cause: dead sidebar CTA + never-mounted widget with a static Cloud import. Files: `src/components/app/app-shell.tsx:239-250`, `src/components/support/support-widget.tsx:33,100`. Minimal fix: hide the CTA in selfhost using the existing `mode !== "selfhost"` pattern (or show an honest unavailable panel), and gate/lazy-import Cloud access in the widget via `cloud-client.ts`.
3. **UI/UX: PARTIAL** — root cause: shared primitives shipped but not adopted; palette literals bypass tokens. Files: `app.knowledge.tsx`, `app.index.tsx`, `app.faq.tsx`, `app.chat.$threadId.tsx`, `app.academy.{index,analytics,lesson.$lessonId}.tsx`, `app.subscription.tsx`, `chat-glider.tsx`. Minimal fix: adopt `PageHeader`/`EmptyState`/`SectionCard`/`Skeleton`, replace literal colours with tokens/`Badge`.
4. **Other gaps tied to the Master Patch**: `academy.assign` permission unseeded; `academy_resolve_targets` RPC called directly; duplicate `EmptyState` component in `app.academy.index.tsx:414`; no `Skeleton` adoption anywhere in the app shell.
5. **Recommended order** (safest first, nothing working is touched):
   1. Seed `academy.assign` (additive migration).
   2. Migrate Academy read paths to `getAcademyRepository()`, then write paths, then analytics/`resolveTargets` — verifying Cloud parity per method.
   3. Gate the Support CTA + widget in Self-Hosted.
   4. P1 UI consistency pass (colour tokens → shared primitives → skeleton loading), page by page.
   5. P2 heading/scale normalization.

Nothing in the Windows bootstrap/installer/updater path needs to change for any of the above.
