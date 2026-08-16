# Self-Hosted Redesign — "Command Deck" (mixed direction)

Palette stays exactly as today (emerald `#064e3b`, gold `#96762a`, parchment light / deep-navy `#04211a` dark). No token colors change — only structure, density, motion and new components. All work is scoped to `/app/*` (Self-Hosted) plus the Windows installer wizard. Management Center and Portal are untouched.

## Chosen direction

A blend, applied per surface:
- Dashboard & module overviews: bento/command-deck density (mixed-size cards, sparkline KPIs, charts).
- Detail & settings surfaces: layered glass panels with gold edge-light.
- Academy: tiled course/progress hub with progress bars and schedule columns.

## 1. Shared UI layer

- New primitives in `src/components/ui/`: `bento-grid`, `metric-tile` (value + delta + inline sparkline), `panel` (glass card with gold edge-light), `progress-ring`, `segmented-tabs`, `mini-chart` wrappers (area, donut, radial, bar) on the existing recharts dep.
- Extend `stat-card` with trend arrow + sparkline slot; extend `card` with a `glass` variant.
- Add motion utilities to `src/styles.css` (`oq-bento-enter`, `oq-glow`, edge-light gradients) using existing tokens only.
- Sidebar in `app-shell.tsx`: grouped sections, gold glow on the active rail, hover ripple, collapsible to icon-rail on desktop; mobile bottom bar keeps 4 tabs + More.

## 2. Surfaces redesigned

- **Dashboard** (`app.index.tsx`): bento layout — hero greeting card, 6 metric tiles with sparklines, activity area chart, knowledge-health donut, audit radial score, open-gaps list, quick-action tiles. Filters bar restyled as segmented tabs. Skeletons for every tile.
- **Knowledge**: split view — document list + preview panel, ingestion status ring, per-department bar chart, upload/export in a sticky toolbar.
- **FAQ**: card grid with category chips, usage bar chart, AI-import panel.
- **AI Audit**: score radial + trend line, recommendation cards grouped (SOP / FAQ / Course) with severity accents, friction-index table.
- **Academy**: course tiles, lesson schedule column, progress column with bars, certificate strip.
- **Users / Organization / Modules / Updates / Subscription**: panel-based layout, role chips, license/module status tiles, department manager panel.
- **Every remaining `/app/*` surface** gets the same treatment in this pass — nothing is left on the old layout. Academy sub-pages (courses, paths, lessons, teacher, analytics, certificates, KB link, settings), chat index, and any other authenticated Self-Hosted page are included.

### Applies to future modules too

The redesign is codified as a reusable module layout contract, not per-page styling:
- A `ModulePage` shell (page header + optional segmented tabs + toolbar slot + bento/panel content area) that every module surface composes. New modules get the look by using the shell, without redesign work.
- Standard building blocks every module reuses: `metric-tile` row, chart panel, list/detail split panel, empty state, skeletons, sticky action toolbar.
- Documented in `docs/engineering/03-add-a-module.md` as the required pattern for new modules, plus a short conventions section in `docs/engineering/01-conventions.md`.


## 3. AI Chat — full messenger

`app.chat.$threadId.tsx` + `app.chat.tsx`:
- Thread sidebar with avatars, last message, unread badge, search.
- Message bubbles with tails, date separators, delivered/read ticks, grouped consecutive messages, subtle chat wallpaper (emerald texture) in both themes.
- Emoji picker in the composer + emoji reactions on messages (stored per message id), attach button, auto-growing textarea, typing indicator with shimmer.
- Sources/confidence become a collapsible chip under the assistant bubble instead of a large block.
- Grounding rules, refusal behaviour and the Self-Hosted AI contract stay exactly as they are — presentation only.

## 4. Windows installer — visual + flow rework

`opsqai-windows/installer/wizard/renderer/*`:
- New shell: deep-emerald gradient canvas, Sovereign Mark header, animated vertical step rail, progress ring on long tasks, glass cards.
- Flow: Welcome → System check (live disk/RAM gauges, per-check cards with retry) → Configuration (grouped: paths, database, admin, AI) → Review summary card → Install (progress ring + streaming log drawer) → Success screen with launch/health actions.
- Same IPC contract and real NSIS-driven paths/disk values; no installer logic or payload changes.

## Technical notes

- Presentation-only: no schema, server-function, RBAC, licensing or AI-provider changes. Charts read existing dashboard/audit server functions; if a chart needs a series that isn't returned yet, it renders an empty state rather than adding new backend queries.
- Reactions are the only new persisted chat data; if no message-metadata column exists they are kept client-side in localStorage.
- Every color via semantic tokens; both themes checked on each surface.
- Verification: full typecheck + test suite, then browser pass over `/app` dashboard, chat, knowledge, FAQ, audit, academy in light and dark.

## Rollout order

1. Shared primitives + motion + sidebar
2. Dashboard bento
3. Chat messenger
4. Knowledge / FAQ / Audit / Academy
5. Users / Organization / Modules / Updates
6. Installer wizard
