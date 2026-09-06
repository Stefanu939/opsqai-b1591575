// OPSQAI Transport — authenticated server functions (Self-Hosted product).
//
// Every handler resolves the caller's company from their profile and enforces
// the per-user Transport grants that the company's Admin / SuperAdmin manages.
// Data access lives in `transport/db.server.ts` (local PostgreSQL).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import { getProfileRepository } from "@/lib/providers/registry";
import {
  TRANSPORT_GRANTS,
  type TransportGrantKey,
  type TransportOverview,
} from "@/lib/transport/types";

type Ctx = { supabase: unknown; userId: string; claims?: { email?: string } };

interface Actor {
  userId: string;
  companyId: string;
  name: string;
  grants: TransportGrantKey[];
  canManageGrants: boolean;
}

async function actor(context: Ctx): Promise<Actor> {
  const db = await import("@/lib/transport/db.server");
  const profile = await getProfileRepository(context.supabase).findByUserId(
    context.userId,
  );
  const companyId = profile?.companyId ?? null;
  if (!companyId) {
    throw new Error("No workspace is linked to this account.");
  }
  const { getActorRoles } = await import("@/lib/authorization");
  const roles = await getActorRoles(context.supabase, context.userId);
  const isUnrestricted =
    roles.isPlatformOwner ||
    roles.isPlatformAdmin ||
    roles.roles.includes("superadmin") ||
    roles.roles.includes("workspace_owner");

  const stored = await db.listGrants(context.userId);
  const areaRights = await import("@/lib/providers/registry").then(({ getAreaRightsRepository, hasAreaRightsRepository }) =>
    hasAreaRightsRepository()
      ? getAreaRightsRepository(context.supabase).listForUser(companyId, context.userId)
      : Promise.resolve([]),
  );
  const transportRights = areaRights.filter((right) => right.areaKey === "transport");
  const canonical = transportRights.filter((right) => right.granted).flatMap((right): TransportGrantKey[] => {
    switch (right.action) {
      case "view": return ["view"];
      case "create": return ["create"];
      case "edit": return ["edit", "checklist", "cmr"];
      case "delete": return ["delete"];
      case "approve": return ["approve"];
      case "administer": return ["settings", "export"];
    }
  });
  const grants: TransportGrantKey[] = isUnrestricted
    ? [...TRANSPORT_GRANTS]
    : transportRights.length
      ? Array.from(new Set<TransportGrantKey>(canonical))
      : stored.length
        ? Array.from(new Set<TransportGrantKey>(["view", ...stored]))
      : ["view"];

  return {
    userId: context.userId,
    companyId,
    name:
      (profile as { fullName?: string; email?: string } | null)?.fullName ||
      context.claims?.email ||
      "User",
    grants,
    canManageGrants: isUnrestricted || grants.includes("settings"),
  };
}

function require(a: Actor, grant: TransportGrantKey): void {
  if (!a.grants.includes(grant)) {
    throw new Error(`Forbidden: this account has no Transport "${grant}" right.`);
  }
}

const REGISTERS = [
  "vehicles",
  "drivers",
  "carriers",
  "documents",
  "incidents",
  "requests",
  "zones",
  "fuel",
  "duty",
] as const;

const registerEnum = z.enum(REGISTERS);
const values = z.record(z.string(), z.unknown());

// ── Overview ─────────────────────────────────────────────────────────────

export const getTransportOverview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ periodDays: z.number().int().min(7).max(365).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<TransportOverview> => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const periodDays = data.periodDays ?? 30;
    const [
      settings,
      c,
      alerts,
      incidents,
      requests,
      check,
      vehicles,
      drivers,
      carriers,
      pins,
      trendData,
      auditRuns,
      fuel,
      duty,
    ] = await Promise.all([
      db.getSettings(a.companyId),
      db.counts(a.companyId),
      db.expiryAlerts(a.companyId),
      db.listIncidents(a.companyId),
      db.listRequests(a.companyId),
      db.lastCheck(a.companyId),
      db.listVehicles(a.companyId),
      db.listDrivers(a.companyId),
      db.listCarriers(a.companyId),
      db.listMapPins(a.companyId),
      db.trends(a.companyId, periodDays),
      db.listAuditRuns(a.companyId, 1),
      db.listFuelEntries(a.companyId, periodDays * 2),
      db.listDutyDays(a.companyId, 1, 7),
    ]);
    return {
      settings,
      counts: c,
      alerts: alerts.slice(0, 50),
      recentIncidents: incidents.slice(0, 25),
      openRequests: requests
        .filter((r) => r.status === "open" || r.status === "in_review")
        .slice(0, 25),
      vehicles,
      drivers,
      carriers,
      pins,
      trends: trendData,
      periodDays,
      lastAudit: auditRuns[0] ?? null,
      lastCheck: check,
      fuel,
      duty,
      grants: a.grants,
      canManageGrants: a.canManageGrants,
    };
  });


// ── Registers ────────────────────────────────────────────────────────────

export const getTransportRegisters = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [
      vehicles,
      drivers,
      carriers,
      documents,
      incidents,
      requests,
      settings,
      fuel,
      duty,
    ] = await Promise.all([
      db.listVehicles(a.companyId),
      db.listDrivers(a.companyId),
      db.listCarriers(a.companyId),
      db.listDocuments(a.companyId),
      db.listIncidents(a.companyId),
      db.listRequests(a.companyId),
      db.getSettings(a.companyId),
      db.listFuelEntries(a.companyId, 180),
      db.listDutyDays(a.companyId, 30, 30),
    ]);
    return {
      vehicles,
      drivers,
      carriers,
      documents,
      incidents,
      requests,
      settings,
      fuel,
      duty,
      grants: a.grants,
      canManageGrants: a.canManageGrants,
    };
  });

export const saveTransportRecord = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ register: registerEnum, id: uuidString().optional(), values })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, data.id ? "edit" : "create");
    const db = await import("@/lib/transport/db.server");
    if (data.id) {
      await db.updateRecord(data.register, a.companyId, data.id, data.values);
      return { id: data.id };
    }
    return db.createRecord(data.register, a.companyId, a.userId, data.values);
  });

export const deleteTransportRecord = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ register: registerEnum, id: uuidString() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "delete");
    const db = await import("@/lib/transport/db.server");
    await db.deleteRecord(data.register, a.companyId, data.id);
    return { ok: true };
  });

// ── Approvals ────────────────────────────────────────────────────────────

export const decideTransportRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        decision: z.enum(["approved", "rejected", "closed"]),
        note: z.string().max(2000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "approve");
    const db = await import("@/lib/transport/db.server");
    await db.decideRequest(
      a.companyId,
      data.id,
      data.decision,
      a.userId,
      data.note ?? null,
    );
    return { ok: true };
  });

export const decideTransportIncident = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        status: z.enum(["reported", "in_review", "action_agreed", "closed", "cancelled"]),
        actionAgreed: z.string().max(4000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "approve");
    const db = await import("@/lib/transport/db.server");
    await db.decideIncident(
      a.companyId,
      data.id,
      data.status,
      a.userId,
      data.actionAgreed ?? null,
    );
    return { ok: true };
  });

// ── Notes ────────────────────────────────────────────────────────────────

const ownerKind = z.enum([
  "vehicle",
  "driver",
  "carrier",
  "incident",
  "request",
  "check",
  "cmr",
]);

export const listTransportNotes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ ownerKind, ownerId: uuidString() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    return db.listNotes(a.companyId, data.ownerKind, data.ownerId);
  });

export const addTransportNote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ ownerKind, ownerId: uuidString(), body: z.string().min(1).max(4000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    await db.addNote(
      a.companyId,
      data.ownerKind,
      data.ownerId,
      data.body,
      a.userId,
      a.name,
    );
    return { ok: true };
  });

// ── Weekly audit ─────────────────────────────────────────────────────────

export const getTransportAudit = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ checkId: uuidString().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [items, checks] = await Promise.all([
      db.listChecklistItems(a.companyId),
      db.listChecks(a.companyId),
    ]);
    const activeId = data.checkId ?? checks[0]?.id ?? null;
    const [results, settings] = await Promise.all([
      activeId ? db.listCheckResults(activeId) : Promise.resolve([]),
      db.getSettings(a.companyId),
    ]);
    return {
      items,
      checks,
      activeId,
      results,
      grants: a.grants,
      cadence: settings.auditCadence,
      auditReminder: settings.auditReminder,
      auditOwnerUserId: settings.auditOwnerUserId,
      weekStart: settings.weekStart,
    };
  });

export const saveChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        label: z.string().min(1).max(300),
        hint: z.string().max(1000).nullish(),
        scope: z.enum(["general", "vehicle", "driver", "carrier"]).optional(),
        position: z.number().int().min(0).optional(),
        required: z.boolean().optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.upsertChecklistItem(a.companyId, a.userId, {
      ...data,
      hint: data.hint ?? null,
    });
    return { ok: true };
  });

export const deleteChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.deleteChecklistItem(a.companyId, data.id);
    return { ok: true };
  });

export const startWeeklyCheck = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    const id = await db.startCheck(
      a.companyId,
      a.userId,
      a.name,
      data.periodStart,
      data.dueOn ?? null,
    );
    return { id };
  });

/** Seed the editable starter checklist when a company has no items yet. */
export const seedTransportChecklist = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    const added = await db.ensureStarterChecklist(a.companyId, a.userId);
    return { added };
  });

/** Raise an incident or a request from a failed checklist line. */
export const escalateCheckResult = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ resultId: uuidString(), kind: z.enum(["incident", "request"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    return db.escalateCheckResult(a.companyId, data.resultId, data.kind, a.userId);
  });

/** Audit run as a base64 PDF, for compliance filing. */
export const renderAuditReportBase64 = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ checkId: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "export");
    const db = await import("@/lib/transport/db.server");
    const bundle = await db.getCheckForReport(a.companyId, data.checkId);
    if (!bundle) throw new Error("Audit run not found.");
    const { renderAuditReportPdf } = await import("@/lib/transport/audit-pdf.server");
    const bytes = await renderAuditReportPdf(bundle);
    const period = String(bundle.check.period_start).slice(0, 10);
    return {
      filename: `transport-audit-${period}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

export const setCheckResult = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resultId: uuidString(),
        outcome: z.enum(["pending", "ok", "issue", "not_applicable"]),
        note: z.string().max(2000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.setCheckResult(
      a.companyId,
      data.resultId,
      data.outcome,
      data.note ?? null,
      a.userId,
    );
    return { ok: true };
  });

export const completeWeeklyCheck = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ checkId: uuidString(), summary: z.string().max(4000).nullish() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.completeCheck(a.companyId, data.checkId, data.summary ?? null);
    return { ok: true };
  });

// ── Map ──────────────────────────────────────────────────────────────────

export const getTransportMap = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [pins, zones, settings, alerts, devices, vehicles] = await Promise.all([
      db.listMapPins(a.companyId),
      db.listZones(a.companyId),
      db.getSettings(a.companyId),
      db.expiryAlerts(a.companyId),
      db.listGpsDevices(a.companyId),
      db.listVehicles(a.companyId),
    ]);
    return { pins, zones, settings, alerts, devices, vehicles, grants: a.grants };
  });

export const searchTransportPlaces = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(2).max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    return { hits: await db.searchPlaces(a.companyId, data.query, 6) };
  });

export const geocodeTransportPlace = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(2).max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    return { hit: await db.geocode(a.companyId, data.query) };
  });


export const saveTransportPlace = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        query: z.string().min(2).max(300),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    await db.savePlace(a.companyId, data.query, data.lat, data.lng);
    return { ok: true };
  });

// ── Settings & grants ────────────────────────────────────────────────────

export const getTransportSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [settings, members, grants] = await Promise.all([
      db.getSettings(a.companyId),
      a.canManageGrants ? db.listCompanyMembers(a.companyId) : Promise.resolve([]),
      a.canManageGrants ? db.listAllGrants() : Promise.resolve([]),
    ]);
    return {
      settings,
      members,
      memberGrants: grants,
      grants: a.grants,
      canManageGrants: a.canManageGrants,
    };
  });

export const saveTransportSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        country: z.string().max(20).optional(),
        language: z.enum(["en", "de", "ro"]).optional(),
        units: z.enum(["metric", "imperial"]).optional(),
        alertWindows: z.array(z.number().int().min(1).max(365)).max(6).optional(),
        docAlertWindows: z.record(z.string(), z.number().int().min(1).max(365)).optional(),
        mapEnabled: z.boolean().optional(),
        cmrPrefix: z.string().min(1).max(12).optional(),
        timezone: z.string().min(1).max(64).optional(),
        weekStart: z.number().int().min(1).max(7).optional(),
        auditDay: z.number().int().min(1).max(7).optional(),
        auditRequired: z.boolean().optional(),
        auditCadence: z.enum(["manual", "weekly", "biweekly", "monthly"]).optional(),
        auditOwnerUserId: uuidString().nullish(),
        auditReminder: z.boolean().optional(),
        mapCenterLat: z.number().min(-90).max(90).nullish(),
        mapCenterLng: z.number().min(-180).max(180).nullish(),
        mapZoom: z.number().int().min(2).max(18).optional(),
        liveTracking: z.boolean().optional(),
        gpsPollMinutes: z.number().int().min(1).max(120).optional(),
        searchProvider: z.enum(["auto", "osm", "off"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "settings");
    const db = await import("@/lib/transport/db.server");
    return db.saveSettings(a.companyId, {
      ...data,
      ...("auditOwnerUserId" in data ? { auditOwnerUserId: data.auditOwnerUserId ?? null } : {}),
      mapCenterLat: data.mapCenterLat ?? null,
      mapCenterLng: data.mapCenterLng ?? null,
    });
  });


export const setTransportGrant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: uuidString(),
        grant: z.enum(["view", "create", "edit", "delete", "approve", "checklist", "settings", "export", "cmr"]),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    if (!a.canManageGrants) {
      throw new Error("Forbidden: only an Admin or SuperAdmin can change rights.");
    }
    const target = await getProfileRepository(context.supabase).findByUserId(data.userId);
    if (!target?.companyId || target.companyId !== a.companyId) {
      throw new Error("Forbidden: target user is outside this workspace");
    }
    const targetRoles = await import("@/lib/authorization").then(({ getActorRoles }) =>
      getActorRoles(context.supabase, data.userId),
    );
    if (targetRoles.isPlatformOwner || targetRoles.isPlatformAdmin || targetRoles.roles.includes("superadmin")) {
      throw new Error("Owner and SuperAdmin rights cannot be restricted");
    }
    const db = await import("@/lib/transport/db.server");
    await db.setGrant(data.userId, data.grant, data.enabled, a.userId);
    const { getAreaRightsRepository, hasAreaRightsRepository } = await import("@/lib/providers/registry");
    if (hasAreaRightsRepository()) {
      const repo = getAreaRightsRepository(context.supabase);
      const existing = await repo.listForUser(a.companyId, data.userId);
      const action = data.grant === "settings" || data.grant === "export" ? "administer"
        : data.grant === "checklist" || data.grant === "cmr" ? "edit" : data.grant;
      const next = existing
        .filter((right) => !(right.areaKey === "transport" && right.action === action))
        .map((right) => ({ area: right.areaKey, action: right.action, granted: right.granted }));
      next.push({ area: "transport", action, granted: data.enabled });
      await repo.replaceForUser(a.companyId, data.userId, next, a.userId);
    }
    return { ok: true };
  });

// ── CMR ──────────────────────────────────────────────────────────────────

export const listCmrNotes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [records, settings, vehicles, drivers, carriers] = await Promise.all([
      db.listCmr(a.companyId),
      db.getSettings(a.companyId),
      db.listVehicles(a.companyId),
      db.listDrivers(a.companyId),
      db.listCarriers(a.companyId),
    ]);
    return { records, settings, vehicles, drivers, carriers, grants: a.grants };
  });

export const saveCmrNote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuidString().optional(), values }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "cmr");
    const db = await import("@/lib/transport/db.server");
    if (data.id) {
      await db.updateCmr(a.companyId, data.id, data.values);
      return { id: data.id };
    }
    return db.createCmr(a.companyId, a.userId, data.values);
  });

export const issueCmrNote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "cmr");
    const db = await import("@/lib/transport/db.server");
    return { number: await db.issueCmr(a.companyId, data.id) };
  });

export const cancelCmrNote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "cmr");
    const db = await import("@/lib/transport/db.server");
    await db.cancelCmr(a.companyId, data.id);
    return { ok: true };
  });

/** Consignment note as a base64 PDF, so the browser can download it directly. */
export const renderCmrPdfBase64 = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "cmr");
    const db = await import("@/lib/transport/db.server");
    const record = await db.getCmr(a.companyId, data.id);
    if (!record) throw new Error("Consignment note not found.");
    const { renderCmrPdf } = await import("@/lib/transport/cmr-pdf.server");
    const bytes = await renderCmrPdf(record);
    return {
      filename: `${record.number ?? "CMR-draft"}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

// ── CSV export ───────────────────────────────────────────────────────────

function csv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] ?? {});
  const cell = (v: unknown) => {
    const s =
      v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => cell(r[h])).join(",")),
  ].join("\n");
}

export const exportTransportCsv = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dataset: z.enum([
          "vehicles",
          "drivers",
          "carriers",
          "documents",
          "incidents",
          "requests",
          "cmr",
          "alerts",
          "fuel",
          "duty",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "export");
    const db = await import("@/lib/transport/db.server");
    const rows = await (async () => {
      switch (data.dataset) {
        case "vehicles":
          return db.listVehicles(a.companyId);
        case "drivers":
          return db.listDrivers(a.companyId);
        case "carriers":
          return db.listCarriers(a.companyId);
        case "documents":
          return db.listDocuments(a.companyId);
        case "incidents":
          return db.listIncidents(a.companyId);
        case "requests":
          return db.listRequests(a.companyId);
        case "cmr":
          return db.listCmr(a.companyId);
        case "alerts":
          return db.expiryAlerts(a.companyId);
        case "fuel":
          return db.listFuelEntries(a.companyId, 365);
        case "duty":
          return db.listDutyDays(a.companyId, 365, 30);
      }
    })();
    return {
      filename: `transport-${data.dataset}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: csv(rows as unknown as Array<Record<string, unknown>>),
    };
  });

// ── GPS / telematics ─────────────────────────────────────────────────────

export const listTransportGpsDevices = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [devices, vehicles] = await Promise.all([
      db.listGpsDevices(a.companyId),
      db.listVehicles(a.companyId),
    ]);
    return { devices, vehicles, grants: a.grants };
  });

export const saveTransportGpsDevice = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        vehicleId: uuidString().nullish(),
        provider: z.enum(["manual", "tcomm", "webfleet", "wialon", "traccar", "other"]),
        deviceId: z.string().min(1).max(120),
        label: z.string().max(160).nullish(),
        apiBaseUrl: z.string().max(400).nullish(),
        apiToken: z.string().max(400).nullish(),
        pollMinutes: z.number().int().min(1).max(120).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    return db.saveGpsDevice(a.companyId, a.userId, {
      ...data,
      vehicleId: data.vehicleId ?? null,
      label: data.label ?? null,
      apiBaseUrl: data.apiBaseUrl ?? null,
      apiToken: data.apiToken ?? null,
    });
  });

export const deleteTransportGpsDevice = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    await db.deleteGpsDevice(a.companyId, data.id);
    return { ok: true };
  });

export const syncTransportGps = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    return db.syncGpsDevices(a.companyId);
  });

export const recordVehiclePosition = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        vehicleId: uuidString(),
        deviceId: uuidString().nullish(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        speedKph: z.number().min(0).max(300).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    await db.recordPosition(a.companyId, {
      vehicleId: data.vehicleId,
      deviceId: data.deviceId ?? null,
      lat: data.lat,
      lng: data.lng,
      speedKph: data.speedKph ?? null,
      source: "manual",
    });
    return { ok: true };
  });

export const getVehicleTrack = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ vehicleId: uuidString() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    return { track: await db.listTrack(a.companyId, data.vehicleId, 200) };
  });

// ── Transport audit (Intelligence) ───────────────────────────────────────

export const getTransportAuditRuns = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const runs = await db.listAuditRuns(a.companyId, 20);
    return { runs, grants: a.grants };
  });

export const runTransportAudit = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    return db.runAudit(a.companyId, a.userId, a.name);
  });
