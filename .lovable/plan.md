# Management Center — ownership by cards + upgrades for the remaining pages

Two parts: (A) the ownership model you described (each colleague sees only their own customers, SuperAdmin sees everything through cards), and (B) a concrete upgrade per remaining page. Design stays Graphite, licensing / entitlements / roles / Self-Hosted untouched.

## A. Ownership ("cartonașe" / cards)

Today a customer record has no owner: everyone in the Management Center sees every customer. Staff assignment exists only on a secondary customer profile field, and nothing in the interface or the access rules uses it.

New behaviour:

- Every customer gets an **owner** (the colleague who created it; a SuperAdmin can reassign).
- **Regular colleague** opens Customers and sees only their own customers, as cards.
- **SuperAdmin** opens Customers and first sees one card per OPSQAI colleague (name, photo, number of customers, licenses expiring, open tickets, unsigned installs). Clicking a card drills into that colleague's customers; a "Everyone" card shows the whole fleet.
- Colleagues cannot see each other's customers anywhere — list, quick search, licenses, installations, support, exports. Enforced in the database rules, not only hidden in the interface.
- Unassigned legacy customers show in an "Unassigned" card visible to SuperAdmins, who can hand them out.

Three variants for how strict this is — pick one:

1. **Strict** — a colleague sees only their own customers, full stop.
2. **Strict + shared** — same, plus a customer can have extra "collaborators" (e.g. holiday cover) who also see it.
3. **Team-based** — customers belong to a team (e.g. DACH, RO); everyone in the team sees the team's customers, SuperAdmin sees all teams; cards are teams first, then colleagues.

## B. Page-by-page — complex variants

### Overview — control centre
Actionable alert lanes instead of plain numbers: licenses expiring in 30/60/90 days, installations silent >48h, customers with no license, customers with products enabled but no reissued license, open tickets past response target, releases not yet adopted. Each alert has a direct action button (Reissue, Open customer, Open ticket). Scoped to your own customers; SuperAdmin gets a fleet roll-up plus per-colleague breakdown. Optional: "My day" strip (your pending approvals, tickets assigned to you, upcoming renewals).

### Calendar
- Fix: time off approved from the profile corner currently lands in the customer-portal calendar only, so Management Center staff never see it. It will be written into the calendar matching the person (staff → fleet calendar) so approved holidays appear automatically, and disappear when cancelled/rejected.
- Add automatic entries: license expiry / renewal dates, maintenance windows, release publish dates.
- Filters: by customer, by colleague, by type (holiday / license / release / meeting); "only mine" default, SuperAdmin can switch to everything.
- Optional: team absence overview so you see who is out this week.

### Customers
One detail page per customer with tabs: summary (profile, products, health), licenses (with history and reissue), installation & signal, users, tickets, activity, notes. Plus owner shown/assignable, a "needs attention" banner (expiring license, silent install, products changed without reissue), and one-click actions from every tab.

### Installations
Clear status: healthy (signal <12h), late (12–48h), offline (>48h), never reported. Installed version vs. newest release with an "outdated" warning, plus platform/version breakdown and a "chase" action that opens the customer or ticket. Optional: signal timeline chart per install.

### Licenses
Bulk actions (reissue for all customers whose products changed, bulk expiry extension), expiry warnings by band, visible per-customer history (who issued, when, which products, which version), diff between the last issued license and the current entitlements, and a re-download / resend of a bundle.

### Releases
Mark a "current" release, structured release notes (EN/DE/RO), and adoption tracking: how many installs run this version, which customers are behind, with a chase action. Optional: staged rollout flag (internal / early / general).

### Team
Explicit roles (SuperAdmin / Manager / Agent) with clear descriptions, email invitations with expiring links, active/deactivated state, per-colleague customer count and workload, and reassignment of a leaver's customers.

### Support
Filters by state / priority / customer / assignee, assignment to a colleague, first-response and resolution timers with a breach flag, saved views ("mine, open", "unassigned", "breached"), internal notes vs. customer replies, and canned replies. Scoped: you see tickets from your customers; SuperAdmin sees all with the colleague breakdown.

## Suggested order

1. Ownership model + cards (Customers) — everything else depends on the scoping.
2. Calendar fix (holidays visible in Management Center) + automatic license/release entries.
3. Overview control centre.
4. Installations + Licenses + Releases upgrades.
5. Team + Support upgrades.

## Technical notes

- New `owner_user_id` on `public.companies` (nullable, backfilled from `customer_profiles.account_manager_id` where present), plus GRANTs and updated RLS: platform admins/owners keep full access, other staff limited to `owner_user_id = auth.uid()` (variant 2 adds a `company_collaborators` table; variant 3 a `staff_teams` + `team_id`).
- Server functions in `companies.functions.ts`, `licenses.functions.ts`, `mc-admin.functions.ts`, `installations`, `support` gain the same owner filter server-side; quick search reuses it.
- Ownership cards as a new `src/components/mc/owner-cards.tsx`; customer detail extends the existing `management.companies.$id.tsx` route.
- Calendar: `time-off.functions.ts` chooses scope from the actor (staff → `platform`), and derived license/release events are computed read-only in `calendar.functions.ts` rather than stored.
- No change to Self-Hosted, the license format, entitlements, or the product architecture.

## Confirm before build

- Which ownership variant (1, 2 or 3)?
- Should SuperAdmin be able to reassign customers between colleagues?
- Do all upgrades in one go, or start with ownership + calendar?
