// Calendar core for the Self-Hosted install (server-only).
//
// Mirrors the Cloud calendar contract (see calendar-core.server.ts) but reads
// and writes the local PostgreSQL tables through ICalendarRepository, and
// derives renewal / maintenance entries from the local licensing provider
// instead of the Cloud `licenses` table. Nothing here touches Supabase.

import { toIcs, type CalendarEvent, type CalendarEventKind } from "@/lib/calendar-core.server";

const DAY = 24 * 60 * 60 * 1000;

async function repo(dataCtx: unknown) {
  const { getCalendarRepository } = await import("@/lib/providers/registry");
  return getCalendarRepository(dataCtx);
}

/** License renewal + maintenance entries derived from the local entitlements. */
async function deriveLocalEvents(): Promise<CalendarEvent[]> {
  const out: CalendarEvent[] = [];
  try {
    const { getLicensingProvider } = await import("@/lib/providers");
    const ent = await getLicensingProvider().entitlements();
    if (ent?.expiresAt) {
      out.push({
        id: `local-lic-exp-${ent.expiresAt}`,
        title: "OPSQAI license expires",
        description: "Renew before this date to keep licensed modules active.",
        kind: "renewal",
        location: null,
        starts_at: new Date(ent.expiresAt * 1000).toISOString(),
        ends_at: null,
        all_day: true,
        source: "derived",
        ref: "/app/subscription",
      });
    }
    if (ent?.maintenanceExpiresAt) {
      out.push({
        id: `local-lic-maint-${ent.maintenanceExpiresAt}`,
        title: "Maintenance & updates end",
        description: "Support and update entitlement expires.",
        kind: "maintenance",
        location: null,
        starts_at: new Date(ent.maintenanceExpiresAt * 1000).toISOString(),
        ends_at: null,
        all_day: true,
        source: "derived",
        ref: "/app/updates",
      });
    }
  } catch {
    /* no license installed yet — calendar still works */
  }
  return out;
}

export async function buildLocalCalendar(args: {
  dataCtx: unknown;
  userId: string;
  from: Date;
  to: Date;
}): Promise<CalendarEvent[]> {
  const r = await repo(args.dataCtx);
  const [rows, derived] = await Promise.all([
    r
      .listEvents(
        args.userId,
        new Date(args.from.getTime() - 400 * DAY).toISOString(),
        new Date(args.to.getTime() + 400 * DAY).toISOString(),
      )
      .catch(() => []),
    deriveLocalEvents(),
  ]);
  const stored: CalendarEvent[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    kind: e.kind as CalendarEventKind,
    location: e.location,
    starts_at: new Date(e.starts_at).toISOString(),
    ends_at: e.ends_at ? new Date(e.ends_at).toISOString() : null,
    all_day: e.all_day,
    source: "stored",
    ref: null,
  }));
  return [...stored, ...derived].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

export async function upsertLocalEvent(args: {
  dataCtx: unknown;
  userId: string;
  event: {
    id?: string | undefined;
    title: string;
    description: string | null;
    kind: string;
    location: string | null;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
  };
}) {
  const r = await repo(args.dataCtx);
  return r.upsertEvent({ ownerUserId: args.userId, ...args.event });
}

export async function deleteLocalEvent(args: { dataCtx: unknown; userId: string; id: string }) {
  const r = await repo(args.dataCtx);
  await r.deleteEvent(args.userId, args.id);
}

function newToken() {
  return (
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  );
}

export async function getOrCreateLocalFeedToken(args: { dataCtx: unknown; userId: string }) {
  const r = await repo(args.dataCtx);
  const existing = await r.getActiveToken(args.userId);
  if (existing) return existing;
  const token = newToken();
  await r.createToken(args.userId, token);
  return token;
}

export async function rotateLocalFeedToken(args: { dataCtx: unknown; userId: string }) {
  const r = await repo(args.dataCtx);
  await r.revokeTokens(args.userId);
  const token = newToken();
  await r.createToken(args.userId, token);
  return token;
}

/** Resolves an ICS token against the local store. Returns null when invalid. */
export async function renderLocalFeed(rawToken: string): Promise<string | null> {
  const token = rawToken.replace(/\.ics$/i, "");
  if (!/^[a-f0-9]{32,64}$/i.test(token)) return null;
  const r = await repo(null);
  const row = await r.resolveToken(token);
  if (!row) return null;

  const now = new Date();
  const events = await buildLocalCalendar({
    dataCtx: null,
    userId: row.userId,
    from: new Date(now.getTime() - 180 * DAY),
    to: new Date(now.getTime() + 365 * DAY),
  });
  await r.touchToken(row.id).catch(() => {});
  return toIcs(events, "OPSQAI");
}
