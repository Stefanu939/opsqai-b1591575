# Fix: time-off requests fail in Self-Hosted

## What is wrong

The Self-Hosted database is missing one field that the time-off feature needs.
The Holidays dialog tries to save a request and link it to the calendar, but the
local database table for requests was created without the calendar link column,
so the save is rejected with `column "calendar_event_id" does not exist`.

Verified:
- Cloud database has all 13 fields including `calendar_event_id` — Cloud works.
- Self-Hosted schema file `0028_presence_time_off.sql` creates the table without
  `calendar_event_id` (and without `decision_note` handling parity), while the
  Self-Hosted data layer selects and updates that column.

Nothing else about presence, licensing or Transport is involved.

## Options

Pick one; all three keep Cloud, Portal, Management Center and licensing untouched.

**Option A — Minimal repair (fast)**
New Self-Hosted migration `0031` that adds the missing `calendar_event_id`
column (plus `decision_note` if absent). Requesting time off starts working
immediately; approved periods appear in the calendar as already coded.

**Option B — Repair + approval flow made complete (recommended)**
Option A, plus:
- Approvals inbox for company Admin/SuperAdmin inside Self-Hosted (approve,
  reject with a note, cancel), matching Cloud behaviour.
- Admins/SuperAdmins can approve their own requests (as in Cloud).
- On approval a calendar event is created; on rejection/cancel it is removed.
- Overlap warning when the requested period collides with an existing approved
  period of the same person.

**Option C — Option B + team absence view**
Adds a company-wide absence overview (list + month strip) so the team can see
who is out and when, with CSV export of approved periods.

## Technical notes

- Add `migrations/selfhost/0031_time_off_calendar_link.sql`:
  `ALTER TABLE public.time_off_requests ADD COLUMN IF NOT EXISTS calendar_event_id uuid`,
  `... decision_note text`, plus an index on `(company_id, status, starts_on)`.
- No change needed in `pg-presence-repository.server.ts` for Option A; the code
  already expects the column.
- Options B/C extend the existing presence server functions and reuse the
  Self-Hosted calendar tables from `0026_calendar.sql`; no schema change beyond
  the migration above except an optional status index.
- Verification: run typecheck/build and confirm the migration list stays
  sequential; Self-Hosted only, no Cloud migration.
