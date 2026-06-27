
# Sprint — Workspace Context & Enterprise Support Center

No redesign. Reuse the existing OPSQAI shell, sidebar, design tokens, cards, dialogs.

## 1. Workspace Context Switcher (extend, don't replace)

The sidebar already has a Platform-Admin-only company picker writing `activeCompanyId` to `auth-context` + localStorage, and most server functions already accept a `companyId` hint via `resolveCompany()`. We promote it to the single source of truth.

- **Persistent context indicator**: a small "Viewing workspace · {name}" pill in the top of every page (rendered inside `AppShell`, above `<Outlet />`). When `activeCompanyId` is null and user is platform-admin, show "All Companies (Global)".
- **`useActiveCompany()` hook**: thin wrapper around auth-context returning `{ companyId, companyName, isGlobal, canSwitch }`. Every page that today fetches data with the user's own company falls back to `activeCompanyId ?? companyId`.
- **Audit on switch**: extend `setActiveCompanyId` in `auth-context.tsx` to call a new server fn `logWorkspaceSwitch({ previous, next })` which inserts into `audit_log` with module=`workspace`, action=`switch`, severity=`info`, payload `{ previous_company_id, new_company_id, platform_role }`.
- **Non-platform users**: unchanged — switcher hidden, `activeCompanyId` always null, server functions resolve via profile.
- **Backend**: no schema change. Server functions already honour the hint; audit the 2–3 modules that don't yet (academy admin, knowledge-gaps drill-down, ai-audit) by passing `activeCompanyId` from the page.

## 2. Enterprise Support Center

A persistent in-app support channel between workspace admins and Platform Admins. Reuses existing UI primitives (Card, Button, Sheet, Dialog, Avatar, Badge).

### Database (one migration)

- `support_conversations` — `id, company_id, opened_by, subject, status (open|pending|resolved|closed), priority (low|normal|high|critical), assigned_to (platform admin user_id, nullable), last_message_at, unread_for_customer, unread_for_platform, context jsonb, created_at, updated_at`.
- `support_messages` — `id, conversation_id, sender_id, sender_kind (customer|platform), body text, internal_note bool, attachments jsonb, context jsonb, created_at`.
- `support_attachments` storage bucket (private) — path `{company_id}/{conversation_id}/{uuid}-{filename}`.
- RLS:
  - Customer side: `SELECT/INSERT` only when `company_id = profile company` AND caller has one of `platform_owner, platform_admin, workspace_owner, admin, manager`. `internal_note = true` rows hidden from customers.
  - Platform side: `platform_owner` / `platform_admin` full access.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations, support_messages`.
- Audit triggers on insert/update writing to `audit_log` (created, replied, assigned, priority changed, closed, reopened, workspace opened, attachment uploaded).

### Server functions (`src/lib/support.functions.ts`)

`listMyConversations`, `listPlatformInbox({ company?, status?, priority?, assigned?, search? })`, `getConversation(id)`, `createConversation({ subject, priority, body, attachments, context })`, `postMessage({ conversation_id, body, internal_note, attachments })`, `assignConversation`, `setPriority`, `setStatus`, `uploadAttachmentUrl` (signed upload URL).

All gated via `requirePermission("support.use")` or `support.manage` (platform). Add both to `role_permissions` for the right roles.

### Frontend

- **Global provider**: `<SupportProvider>` mounted in `_authenticated/route.tsx` above `<AppShell>`. Owns conversation state, realtime channel subscription, unread counts, attach paste/drag.
- **Floating bubble**: `src/components/support/support-widget.tsx` — fixed bottom-right, hidden on `/app/admin/support` (the inbox). Shows unread badge. Click opens a Sheet with conversation list + active thread (Intercom-style). Survives route changes because it lives in the provider, not in route components.
- **Auto-context**: every new message attaches `{ company_id, company_name, viewing_company_id, route, module, role, browser, os, screen, language, app_version, timestamp }` derived from `auth-context` + `window`/`navigator`.
- **Platform inbox**: `src/routes/_authenticated/app.admin.support.tsx` — table grouped by company/priority/status with filters and search. Each conversation page has:
  - Reply box (with internal-note toggle for platform side).
  - "Open Workspace" button → calls `setActiveCompanyId(conversation.company_id)` then `navigate({ to: "/app" })`. Audit row written automatically.
  - Assign / priority / status controls.
- **Permissions in UI**: bubble visible only when `hasAnyPermission("support.use","support.manage")`. Sidebar gets a "Support Inbox" link under Platform group for platform admins.

### Notifications

- DB trigger on `support_messages` insert → insert into existing `notifications` table for the *other* side (customers for platform replies, all company admins/managers for customer messages → for platform delivery we notify all `platform_admin` users).

## Technical Notes

- Reuse `Sheet`, `Dialog`, `Card`, `Badge`, `Avatar`, `Textarea`, `Button`, `DropdownMenu` from `src/components/ui/*` — no new design tokens.
- Realtime via `supabase.channel('support:{conversation_id}')` inside the provider; cleanup on unmount.
- Attachments uploaded directly to storage with signed URL; message stores `{path, name, size, mime}` array.
- Typing indicator + read receipts via realtime presence/broadcast on the per-conversation channel.
- File types: image/*, pdf, doc(x), xls(x). 20 MB max client-side check.

## Out of scope

No changes to design system, layout, sidebar visuals, typography, colors, or existing module UIs.

## Deliverables

1. Migration: support tables, RLS, realtime, audit triggers, two new permissions, grants.
2. `src/lib/support.functions.ts`.
3. `src/components/support/{support-provider,support-widget,conversation-view,message-bubble,attachment-chip}.tsx`.
4. `src/routes/_authenticated/app.admin.support.tsx` + sidebar link.
5. `src/components/app/workspace-context-banner.tsx` rendered inside `AppShell`.
6. `useActiveCompany()` hook + audit-on-switch wiring in `auth-context.tsx` and a `logWorkspaceSwitch` server fn.
7. i18n strings (EN/DE/RO) for new UI labels.

Approve to proceed.
