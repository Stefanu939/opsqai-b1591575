## What I'll build

### 1. Audience selector on `/auth` (dropdown, EN + DE)

Add a **dropdown at the top of the sign-in form** where the visitor picks their audience before entering credentials. Three options:

- **Customer Portal** / **Kundenportal** — for designated customer contacts (installer, activation bundle, release notes, support).
- **Management Center** / **Verwaltungszentrum** — OPSQAI staff only.
- **Company user (Self-Hosted)** / **Firmenbenutzer (Self-Hosted)** — disabled option that reveals an inline info card: "OPSQAI runs on your company's Windows Server. Sign in there, not here." with a link to `/windows-only`.

Behavior:
- Default = Customer Portal (matches the most common case).
- Selection persists via `?audience=portal|mc` in the URL so the form is deep-linkable.
- The submit button label switches: "Sign in to Portal" / "Sign in to Management Center".
- After a successful login, backend validates the choice against roles:
  - `audience=mc` but user is not `platform_admin`/`platform_owner` → sign out + toast "This sign-in is reserved for the OPSQAI team."
  - `audience=portal` for anyone else → land on `/portal`.
- Existing `?next=` deep-link parameter still wins over audience default (used by invite emails).

### 2. Copy — EN + DE everywhere

All new strings go through the existing `useT()` / `i18n` layer so they're switched with the top-right language toggle. The three affected surfaces:

- `/auth` — audience selector labels, description under each option, submit button, error toasts.
- `/windows-only` — hero, three-column architecture cards, CTAs.
- Marketing header signed-in CTA — "Customer Portal" / "Kundenportal".

### 3. Windows installer build

I don't push to git directly (Lovable manages that), but every edit in this turn auto-syncs to the connected GitHub repo. The existing workflow `.github/workflows/build-windows-installer.yml` triggers on push and produces the signed `.exe`. Nothing to change there — the sync-on-save is enough.

I'll verify the workflow file exists and its trigger matches the branch we're on. If the trigger is `workflow_dispatch` only, I'll adjust it to also run on push to the default branch so a new `.exe` is produced automatically from this change.

## Technical details

**Files changed**
- `src/routes/auth.tsx` — add audience dropdown, read/write `?audience=` search param, gate post-login target by both audience and role.
- `src/i18n/index.tsx` — add EN + DE keys: `audienceLabel`, `audiencePortal`, `audiencePortalHint`, `audienceMc`, `audienceMcHint`, `audienceCompanyUser`, `audienceCompanyUserHint`, `signInToPortal`, `signInToMc`, `mcAccessDenied`.
- `src/routes/windows-only.tsx` — wire strings through `useT()` so DE works.
- `src/components/marketing/layout.tsx` — translate the "Customer Portal" CTA.
- `.github/workflows/build-windows-installer.yml` — verify/adjust trigger only if it's not already `push` to main.

**Data model** — no schema changes. The audience dropdown is UI-only; authorization stays server-side (`platform_admin`/`platform_owner` role → MC access; everyone else → Portal). Company users have no cloud account at all, so the third option is intentionally non-functional and educational.

**Search param contract**
```
/auth                       → default = portal
/auth?audience=mc           → MC form
/auth?audience=portal       → Portal form
/auth?next=/portal/downloads → next wins, audience inferred from prefix
```

## Out of scope for this turn

- No new roles or DB migration.
- No changes to `/management/*` or `/portal/*` gating — that was done last turn.
- No marketing hero rewrite on `/`, `/product`, `/pricing` (I'll do the copy sweep there in a follow-up unless you say otherwise).