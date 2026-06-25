# OPSQAI 1.0 — Release Notes

**Codename:** Enterprise Launch Foundation
**Release date:** 2026-06-25
**Primary domains:** opsqai.eu (marketing) · opsqai.de (alias) · installed PWA → `/app`

OPSQAI 1.0 closes the gap between a working internal tool and a SaaS product
that can be sold, demoed and audited. The focus of this release is **separation
of concerns**: a polished public marketing surface, a hardened authenticated
workspace, a self-contained public demo, and a Trust Center that answers most
security questionnaires without a human in the loop.

---

## What's new for end users

### A real public website
`opsqai.eu` is now a marketing site, not the app. Visitors land on `/` and can
explore the **Product**, **Features**, **Solutions**, **Industries**, **Pricing**
and **Trust Center** pages before signing in. The authenticated workspace lives
at `/app` and is reachable from the top-right "Sign in" link.

### Try OPSQAI without an account
`/demo` runs an unauthenticated chat against a small, fixed sample logistics
knowledge base. The demo:

- only answers from its sample SOPs (returns a localized refusal otherwise),
- is rate-limited per IP and per conversation,
- never touches tenant data.

### Forgot password
A standard reset flow at `/forgot-password` → email link → `/reset-password`.

### Install as an app, land in the app
When OPSQAI is installed as a PWA (Add to Home Screen / Install), launching the
icon goes directly to `/app`, not to the marketing homepage. Service-worker
caching keeps the shell snappy and works through brief network drops.

---

## What's new for admins

### `/app` everywhere
Every internal route is now namespaced under `/app/*`. Bookmarks to `/admin/...`
should be updated to `/app/admin/...`. The sidebar, accept-invite flow, password
reset and post-login redirect all point at `/app`.

### Email + password only
Google / social sign-in has been removed. New users are invited by an admin and
set their password via `/accept-invite`. There is no public sign-up.

### Trust Center expansion
`/trust` is now a full index with 11 detailed sub-pages: GDPR, Security
Architecture, Multi-Tenant Isolation, Encryption, Audit Logs, Responsible AI,
Data Retention, Incident Response, Backup Policy, Availability, and the
ISO 27001 Roadmap. Useful when answering security questionnaires.

---

## Breaking changes

| Area | Before | After | Action |
| --- | --- | --- | --- |
| App URL | `/`, `/chat`, `/admin/*` | `/app`, `/app/chat`, `/app/admin/*` | Update bookmarks and any external links. Redirects from old paths are **not** in scope for this release. |
| Auth providers | Email + Google | Email only | Users who previously signed in with Google must use "Forgot password?" to set a password. |
| Signup | Open signup possible | Invite-only | Admins must send invites from `/app/admin/users`. |
| PWA `start_url` | `/` | `/app` | Already-installed PWAs may need to be reinstalled to pick up the new manifest. |

---

## Security & compliance

- All tenant tables remain scoped to `company_id` via RLS.
- `knowledge-docs` storage bucket is admin-write, RLS-gated for read.
- Privilege escalation on `user_roles` blocked by restrictive INSERT policy.
- New public Trust Center documents the controls in plain language.

---

## Known issues

See [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).

## What's next

See [`ROADMAP.md`](./ROADMAP.md).
