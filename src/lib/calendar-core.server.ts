// Calendar core (server-only).
//
// The OPSQAI calendar merges two sources:
//
//   * stored events   — user-authored rows in `calendar_events`
//   * derived events  — read-only entries computed from live platform data
//                       (license expiry, maintenance expiry, releases)
//
// Cloud-only: the Management Center and the Customer Portal are the only
// surfaces that expose a calendar. Self-Hosted never reaches this module.

import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";

export type CalendarScope = "platform" | "portal";

export type CalendarEventKind =
  | "meeting"
  | "renewal"
  | "maintenance"
  | "release"
  | "deadline"
  | "training"
  | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  kind: CalendarEventKind;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  source: "stored" | "derived";
  /** Optional deep link used by the UI ("View license", etc.). */
  ref: string | null;
}

const DAY = 24 * 60 * 60 * 1000;

function iso(d: Date | string) {
  return new Date(d).toISOString();
}

/** Read-only events derived from platform data for OPSQAI staff. */
async function derivePlatformEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
  const admin = await getCloudSupabaseAdmin("calendar");
  const out: CalendarEvent[] = [];

  const [licenses, releases] = await Promise.all([
    admin
      .from("licenses")
      .select("id, company_name, kind, module_key, tier, expires_at, maintenance_expires_at, revoked")
      .eq("revoked", false)
      .not("expires_at", "is", null)
      .gte("expires_at", iso(new Date(from.getTime() - 90 * DAY)))
      .lte("expires_at", iso(new Date(to.getTime() + 90 * DAY))),
    admin
      .from("license_releases")
      .select("id, version, channel, published_at")
      .not("published_at", "is", null)
      .gte("published_at", iso(from))
      .lte("published_at", iso(to)),
  ]);

  for (const l of licenses.data ?? []) {
    if (l.expires_at) {
      out.push({
        id: `lic-exp-${l.id}`,
        title: `${l.company_name} — license expires`,
        description: `${l.kind === "module" ? `Module: ${l.module_key}` : `Tier: ${l.tier ?? "—"}`}`,
        kind: "renewal",
        location: null,
        starts_at: l.expires_at,
        ends_at: null,
        all_day: true,
        source: "derived",
        ref: "/management/licenses",
      });
    }
    if (l.maintenance_expires_at) {
      out.push({
        id: `lic-maint-${l.id}`,
        title: `${l.company_name} — maintenance ends`,
        description: "Support & updates entitlement expires",
        kind: "maintenance",
        location: null,
        starts_at: l.maintenance_expires_at,
        ends_at: null,
        all_day: true,
        source: "derived",
        ref: "/management/licenses",
      });
    }
  }

  for (const r of releases.data ?? []) {
    out.push({
      id: `rel-${r.id}`,
      title: `Release ${r.version} (${r.channel})`,
      description: "Published to the fleet",
      kind: "release",
      location: null,
      starts_at: r.published_at as string,
      ends_at: null,
      all_day: true,
      source: "derived",
      ref: "/management/releases",
    });
  }

  return out;
}

/** Read-only events derived from the customer's own licenses. */
async function derivePortalEvents(email: string): Promise<CalendarEvent[]> {
  const admin = await getCloudSupabaseAdmin("calendar");
  const { data } = await admin
    .from("licenses")
    .select("id, company_name, kind, module_key, expires_at, maintenance_expires_at, revoked")
    .eq("contact_email", email)
    .eq("revoked", false);

  const out: CalendarEvent[] = [];
  for (const l of data ?? []) {
    const label = l.kind === "module" ? `${l.module_key} module` : "Platform license";
    if (l.expires_at) {
      out.push({
        id: `lic-exp-${l.id}`,
        title: `${label} renewal`,
        description: `${l.company_name} — renew before this date to avoid interruption.`,
        kind: "renewal",
        location: null,
        starts_at: l.expires_at,
        ends_at: null,
        all_day: true,
        source: "derived",
        ref: "/portal/subscription",
      });
    }
    if (l.maintenance_expires_at) {
      out.push({
        id: `lic-maint-${l.id}`,
        title: `${label} — maintenance ends`,
        description: "Support & updates entitlement expires",
        kind: "maintenance",
        location: null,
        starts_at: l.maintenance_expires_at,
        ends_at: null,
        all_day: true,
        source: "derived",
        ref: "/portal/subscription",
      });
    }
  }
  return out;
}

export async function listStoredEvents(args: {
  scope: CalendarScope;
  email: string | null;
  from: Date;
  to: Date;
}): Promise<CalendarEvent[]> {
  const admin = await getCloudSupabaseAdmin("calendar");
  let q = admin
    .from("calendar_events")
    .select("id, title, description, kind, location, starts_at, ends_at, all_day")
    .eq("scope", args.scope)
    .gte("starts_at", iso(new Date(args.from.getTime() - 400 * DAY)))
    .lte("starts_at", iso(new Date(args.to.getTime() + 400 * DAY)));
  if (args.scope === "portal") q = q.eq("owner_email", args.email ?? "__none__");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    kind: r.kind as CalendarEventKind,
    location: r.location,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    all_day: r.all_day,
    source: "stored" as const,
    ref: null,
  }));
}

/** Merged, chronologically sorted calendar for one scope. */
export async function buildCalendar(args: {
  scope: CalendarScope;
  email: string | null;
  from: Date;
  to: Date;
}): Promise<CalendarEvent[]> {
  const [stored, derived] = await Promise.all([
    listStoredEvents(args),
    args.scope === "platform"
      ? derivePlatformEvents(args.from, args.to)
      : derivePortalEvents(args.email ?? "__none__"),
  ]);
  return [...stored, ...derived].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/* ------------------------------- ICS output ------------------------------ */

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsStamp(d: Date, allDay: boolean) {
  const p = (n: number) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const mo = p(d.getUTCMonth() + 1);
  const da = p(d.getUTCDate());
  if (allDay) return `${y}${mo}${da}`;
  return `${y}${mo}${da}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

function fold(line: string) {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return parts.join("\r\n");
}

export function toIcs(events: CalendarEvent[], calendarName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OPSQAI//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const e of events) {
    const start = new Date(e.starts_at);
    const end = e.ends_at
      ? new Date(e.ends_at)
      : new Date(start.getTime() + (e.all_day ? DAY : 60 * 60 * 1000));
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@opsqai`);
    lines.push(`DTSTAMP:${icsStamp(new Date(), false)}`);
    if (e.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${icsStamp(start, true)}`);
      lines.push(`DTEND;VALUE=DATE:${icsStamp(end, true)}`);
    } else {
      lines.push(`DTSTART:${icsStamp(start, false)}`);
      lines.push(`DTEND:${icsStamp(end, false)}`);
    }
    lines.push(fold(`SUMMARY:${icsEscape(e.title)}`));
    if (e.description) lines.push(fold(`DESCRIPTION:${icsEscape(e.description)}`));
    if (e.location) lines.push(fold(`LOCATION:${icsEscape(e.location)}`));
    lines.push(`CATEGORIES:${e.kind.toUpperCase()}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/* ------------------------------ feed tokens ------------------------------ */

export async function getOrCreateFeedToken(args: {
  userId: string;
  scope: CalendarScope;
  email: string | null;
}) {
  const admin = await getCloudSupabaseAdmin("calendar");
  const { data: existing } = await admin
    .from("calendar_feed_tokens")
    .select("token")
    .eq("user_id", args.userId)
    .eq("scope", args.scope)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const { error } = await admin.from("calendar_feed_tokens").insert({
    token,
    user_id: args.userId,
    scope: args.scope,
    owner_email: args.email,
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function rotateFeedToken(args: {
  userId: string;
  scope: CalendarScope;
  email: string | null;
}) {
  const admin = await getCloudSupabaseAdmin("calendar");
  await admin
    .from("calendar_feed_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", args.userId)
    .eq("scope", args.scope)
    .is("revoked_at", null);
  return getOrCreateFeedToken(args);
}

/** Resolves an ICS feed token to a rendered calendar. Returns null when invalid. */
export async function renderFeed(rawToken: string): Promise<string | null> {
  const token = rawToken.replace(/\.ics$/i, "");
  if (!/^[a-f0-9]{32,64}$/i.test(token)) return null;
  const admin = await getCloudSupabaseAdmin("calendar");
  const { data: row } = await admin
    .from("calendar_feed_tokens")
    .select("id, scope, owner_email")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (!row) return null;

  const now = new Date();
  const events = await buildCalendar({
    scope: row.scope as CalendarScope,
    email: row.owner_email,
    from: new Date(now.getTime() - 180 * DAY),
    to: new Date(now.getTime() + 365 * DAY),
  });

  await admin
    .from("calendar_feed_tokens")
    .update({ last_accessed_at: now.toISOString() })
    .eq("id", row.id);

  return toIcs(
    events,
    row.scope === "platform" ? "OPSQAI Management Center" : "OPSQAI Customer Portal",
  );
}

/* ------------------------------ scope helper ----------------------------- */

/**
 * A platform admin gets the fleet-wide staff calendar; everyone else gets
 * their personal Customer Portal calendar.
 */
export async function resolveScope(context: {
  supabase: unknown;
  userId: string;
  claims?: { email?: string } | undefined;
}): Promise<{ scope: CalendarScope; email: string | null }> {
  const { getActorRoles } = await import("@/lib/authorization");
  const email = context.claims?.email ?? null;
  const actor = await getActorRoles(context.supabase, context.userId);
  return { scope: actor.isPlatformAdmin ? "platform" : "portal", email };
}
