# Product Polish — Phase 1: Installer UX Wireframes & Navigation Flow

> Approval gate. No implementation begins until this document is signed off.
> Reuses Phase 3.5 architecture (providers, bootstrap, doctor). No new refactors.

---

## 1. Design principles

- **Enterprise premium**, reference bar: JetBrains Toolbox, Docker Desktop, GitHub Desktop, MS SQL Server Installer.
- **No jargon**: user never sees "migration", "RLS", "provider registry", "pg_dump".
- **Fail loud, fail early**: license is validated *before* a single file is copied. System checks *before* config.
- **Never a blank progress bar**: every stage names what it is doing + emits log lines.
- **Design tokens**: Space Grotesk headings, Inter body, Gold `#C9A24C` accent on Deep Navy — matches OPSQAI enterprise identity (per project memory). Dark theme first, light theme supported.
- **Accessibility**: full keyboard nav (Tab / Shift+Tab / Enter / Esc), focus rings, ARIA on all inputs, min contrast AA.

---

## 2. Top-level navigation flow

```text
                        ┌────────────────────────────────────┐
                        │  Installer launched (OPSQAI-Setup) │
                        └──────────────┬─────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 1  ─────────►   │  Welcome                    │  [Get Started] ─► Step 2
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 2  ─────────►   │  License Activation         │  invalid ─► stays
                        │  (BEFORE any file copy)     │  valid   ─► Step 3
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 3  ─────────►   │  System Check (auto probe)  │  fail-hard ─► block + fix hints
                        │  green/red indicators       │  pass     ─► Step 4
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 4  ─────────►   │  Installation Options       │  ─► Step 5
                        │  (folders, shortcuts)       │
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 5  ─────────►   │  Database Mode              │  ─► Step 6
                        │  Recommended | Advanced     │     (test conn if advanced)
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 6  ─────────►   │  Administrator Account      │  ─► Step 7
                        │  (create BEFORE install)    │
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 7  ─────────►   │  Review & Install           │  [Install] ─► Step 8
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 8  ─────────►   │  Installation Progress      │  fail ─► error pane + logs
                        │  (7 named stages, live log) │  ok   ─► Step 9
                        └─────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
   Step 9  ─────────►   │  Finish                     │  [Launch OPSQAI]
                        │  ✓ components summary       │  [Open Folder] [View Logs]
                        └──────────────┬──────────────┘
                                       │  launch = true
                        ┌──────────────▼──────────────┐
   First Run  ────────► │  First-Run Wizard (in-app)  │  6 sub-steps ─► Dashboard
                        └─────────────────────────────┘
```

Note: the current wizard has 12 steps and validates the license at step 9 (post-config). The new flow inverts this — license first (step 2), admin before install (step 6), review before commit (step 7). This is the biggest structural change and the reason to approve the flow before touching code.

---

## 3. Screen-by-screen wireframes

Layout envelope: 900×640 fixed, non-resizable (matches current shell). Left rail = step list (240 px). Right pane = content. Footer = `[Cancel]  [Back]  [Next / Install / Finish]`.

### Step 1 — Welcome

```text
┌──────────────────────────────────────────────────────────────┐
│  [OPSQAI mark]                                               │
│                                                              │
│                                                              │
│                    OPSQAI Self-Hosted                        │
│                    ─────────────────                         │
│           The private AI operations platform for             │
│                    your organisation.                        │
│                                                              │
│                    Version 1.0.0                             │
│                                                              │
│                                                              │
│                      [ Get Started ]                         │
│                                                              │
│   By continuing you accept the OPSQAI License Agreement.     │
└──────────────────────────────────────────────────────────────┘
```

- No step rail on this pane (full-bleed hero).
- License agreement is a linked modal, not a scroll trap.

### Step 2 — License Activation (gate)

```text
┌────────────┬─────────────────────────────────────────────────┐
│ ● Welcome  │  Activate your OPSQAI license                   │
│ ● License  │  ─────────────────────────────                  │
│ ○ System   │                                                 │
│ ○ Options  │  License key                                    │
│ ○ Database │  ┌───────────────────────────────────────────┐  │
│ ○ Admin    │  │ OPSQAI-XXXX-XXXX-XXXX-XXXX                │  │
│ ○ Review   │  └───────────────────────────────────────────┘  │
│ ○ Install  │  [ Load from file… ]        [ Validate ]        │
│ ○ Finish   │                                                 │
│            │  ┌─ Status ───────────────────────────────────┐ │
│            │  │  ✓ License valid                           │ │
│            │  │  Company     Acme GmbH                     │ │
│            │  │  Edition     Enterprise                    │ │
│            │  │  Seats       50                            │ │
│            │  │  Expires     31 Dec 2026                   │ │
│            │  │  Modules     KB, Academy, Analytics        │ │
│            │  └────────────────────────────────────────────┘ │
│            │                                                 │
│            │  No license? [ Continue in Community mode ]     │
└────────────┴─────────────────────────────────────────────────┘
```

- `Next` disabled until either (a) validation ok or (b) user explicitly chose Community.
- Validation calls existing `wizard:validateLicense` IPC → structural check now, full Ed25519 verify runs in Step 8.

### Step 3 — System Check

```text
Running preflight checks…

  ✓ Windows 10 / 11 or Server 2019+          Windows 11 Pro 23H2
  ✓ CPU architecture                          x64
  ✓ Memory (min 8 GB)                         16 GB
  ✓ Disk space (min 20 GB free)               412 GB free on C:
  ✓ .NET 8 runtime                            8.0.4
  ✗ PostgreSQL 16 available                   Not found
    └─ [ Install bundled PostgreSQL 16 ]  (recommended)
  ✓ Ports 443, 5432, 55432 free               ok
  ✓ Administrator privileges                  granted

           [ Re-run checks ]    [ Next ]  (enabled when all green)
```

- Each probe is an existing OPSQAI Doctor check (`src/lib/platform/doctor.ts`) surfaced early.
- Missing Postgres offers inline fix; other failures show a "How to fix" popover with copyable command.

### Step 4 — Installation Options

```text
  Installation folder
  ┌────────────────────────────────────────────┐ [ Browse… ]
  │ C:\Program Files\OPSQAI                    │
  └────────────────────────────────────────────┘

  Data folder (databases, backups, uploads)
  ┌────────────────────────────────────────────┐ [ Browse… ]
  │ C:\ProgramData\OPSQAI                      │
  └────────────────────────────────────────────┘
      Space required: 4.8 GB     Available: 412 GB

  [x] Create Desktop shortcut
  [ ] Start OPSQAI when Windows starts
  [x] Add OPSQAI to Start Menu
```

- No port pickers, no service names, no advanced toggles. Anything else lives behind "Advanced settings" (collapsed, off by default).

### Step 5 — Database

```text
  How should OPSQAI store your data?

  ◉  Recommended — bundled PostgreSQL 16
     Installed and managed by OPSQAI. Zero configuration.
     Best for most customers.

  ○  Advanced — connect to my own PostgreSQL server
     For customers with a database team.

  ┌─ appears when Advanced is selected ─────────────────────┐
  │  Host       [ db.internal.acme          ]  Port [5432]  │
  │  Database   [ opsqai                    ]               │
  │  Username   [ opsqai_app                ]               │
  │  Password   [ ••••••••••••             ] [👁]           │
  │                                                         │
  │  [ Test connection ]     ✓ Connected (PostgreSQL 16.3)  │
  └─────────────────────────────────────────────────────────┘
```

- `Next` blocked in Advanced mode until Test connection passes.

### Step 6 — Administrator

```text
  Create the first administrator account
  ─────────────────────────────────────

  Full name        [ Anna Weber                       ]
  Email            [ anna@acme.de                     ]
  Password         [ ••••••••••••••••                 ] [👁]
                   ▓▓▓▓▓▓▓▓▓▓░░░░  Strong
                   • 12+ characters      ✓
                   • Upper + lower case  ✓
                   • Number              ✓
                   • Symbol              ✓
  Confirm password [ ••••••••••••••••                 ]
```

- Uses existing `admin-seed.mjs` at install time. No email sent — this is a local install.

### Step 7 — Review

```text
  You're ready to install
  ───────────────────────

  License        Acme GmbH · Enterprise · 50 seats
  Install to     C:\Program Files\OPSQAI
  Data folder    C:\ProgramData\OPSQAI
  Database       Bundled PostgreSQL 16
  Administrator  anna@acme.de

  Installation will take about 3–5 minutes.

                              [ Back ]  [ Install ]
```

### Step 8 — Installation Progress

```text
  Installing OPSQAI…
  ──────────────────

  ●  Preparing installation                        done
  ●  Installing bundled PostgreSQL                  done
  ●  Installing OPSQAI services                     done
  ◉  Creating database and applying migrations      running
  ○  Initializing AI engine
  ○  Creating knowledge storage
  ○  Finalizing installation

  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  57%   ~2 min remaining

  ▸ Show detailed log
```

- The 7 stages are a fixed script; log tail is collapsible. On failure the pane becomes the error screen with `[Copy log]`, `[Retry]`, `[Contact support]`.
- Progress advances on log-line markers already emitted by `init.js` (extend as needed).

### Step 9 — Finish

```text
                    ✓ OPSQAI is ready

     ✓ License activated       ✓ Database created
     ✓ Services installed      ✓ AI engine online
     ✓ Knowledge base ready    ✓ Administrator created

     [x] Launch OPSQAI now

     [ Launch OPSQAI ]  [ Open installation folder ]  [ View logs ]
```

---

## 4. First-Run Wizard (in-app, after launch)

Runs the first time an administrator signs in. Six lightweight steps, each skippable except step 1.

```text
   1. Welcome, Anna          → single screen, "Let's set up Acme"
   2. Company                → name (prefilled from license), logo upload
   3. Localization           → language (de/en/ro) + time zone
   4. Departments (optional) → add up to 5, "Skip for now"
   5. Knowledge Base (opt.)  → drop first document, "Skip for now"
   6. Done                   → confetti-free success, → Dashboard
```

- Reuses existing `/first-run` route as the mount point. Redesigned with the enterprise shell (Deep Navy / Gold), not the current utilitarian form.
- Progress: dots at top, no step rail (this is inside the app, not the installer).

---

## 5. Dashboard empty state

When `documents = 0 AND users = 1 AND departments = 0` after first-run:

```text
   Welcome to OPSQAI, Anna
   ───────────────────────

   ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
   │  📄                 │  │  📚                 │  │  👥                 │
   │  Upload your first  │  │  Import your SOPs   │  │  Invite your team   │
   │  document           │  │                     │  │                     │
   │  [ Upload ]         │  │  [ Import ]         │  │  [ Invite ]         │
   └─────────────────────┘  └─────────────────────┘  └─────────────────────┘

   ┌─────────────────────┐  ┌─────────────────────┐
   │  🏢                 │  │  💬                 │
   │  Set up departments │  │  Chat with AI       │
   │  [ Configure ]      │  │  [ Open chat ]      │
   └─────────────────────┘  └─────────────────────┘
```

- Cards dismiss individually; a persistent "Get started" chip in the top bar reopens them until all are done.
- No fake charts, no placeholder "42 documents" numbers.

---

## 6. Visual system (locked)

| Token          | Value                                                    |
|----------------|----------------------------------------------------------|
| Bg (dark)      | `#0F172A` Deep Navy                                       |
| Bg elevated    | `#111C33`                                                 |
| Text primary   | `#F5F7FA` Soft White                                      |
| Text muted     | `#8A94A6`                                                 |
| Accent gold    | `#C9A24C`                                                 |
| Success        | `#3FB98A`                                                 |
| Danger         | `#E5484D`                                                 |
| Border         | `rgba(255,255,255,0.08)`                                  |
| Radius         | 10 px cards, 8 px inputs, 6 px buttons                    |
| Heading font   | Space Grotesk 600/700                                     |
| Body font      | Inter 400/500                                             |
| Motion         | 180 ms ease-out on step transitions, no bouncy easing     |

Icons: Lucide, 1.5 px stroke, size 18 for inline, 24 for step rail, 40 for hero.

---

## 7. Reuse map (no architectural changes)

| UX element                        | Existing code reused                                              |
|-----------------------------------|-------------------------------------------------------------------|
| License validation                | `wizard:validateLicense` IPC (`main.cjs`)                          |
| Ed25519 verify at install         | `src/lib/providers/selfhost/local-licensing.server.ts`             |
| System checks                     | `src/lib/platform/doctor.ts` (surface probes early)                |
| DB test connection                | new IPC `wizard:testDatabase` wrapping `pg` (thin)                 |
| Bundled Postgres install          | existing `services/database/` scripts                              |
| Progress log parsing              | `services/bootstrap/init.js` markers                                |
| Admin creation                    | `services/bootstrap/admin-seed.mjs`                                 |
| First-run in-app                  | existing `/first-run` route, restyled                              |
| Dashboard empty state             | new component, gated by existing `usePlatformCapabilities`         |

Only two new IPC handlers required: `wizard:testDatabase`, `wizard:runSystemChecks`. Both are thin wrappers over code that already exists — no new provider, repo, or service.

---

## 8. Deliverable phases (post-approval)

1. **Phase A** — Installer shell restyle + new step order (Welcome → License → System → Options → DB → Admin → Review → Progress → Finish). Renderer only; IPC contract stays.
2. **Phase B** — New IPC handlers (`testDatabase`, `runSystemChecks`) + progress marker wiring in `init.js`.
3. **Phase C** — First-Run Wizard restyle to enterprise shell, 6-step flow.
4. **Phase D** — Dashboard empty state cards + dismissal state.
5. **Phase E** — Polish pass: motion, focus rings, keyboard nav audit, dark/light parity, error copy.

Each phase ships independently and is reviewable in isolation.

---

## 9. Open questions for approval

1. **Community mode fallback in Step 2** — keep it (users without a key can still install), or hard-gate (no key = no install)?
2. **Advanced database mode** — ship in v1 of the polish, or defer to v1.1? Recommended mode covers ~90 % of installs.
3. **Start with Windows** in Step 4 — default off (recommended) or on?
4. **First-Run language list** — de / en / ro only, or also fr / es?

Answer these four and Phase A begins.
