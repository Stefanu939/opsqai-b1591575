// OPSQAI Transport — authenticated server functions (Self-Hosted product).
//
// Every handler resolves the caller's company from their profile and enforces
// the per-user Transport grants that the company's Admin / SuperAdmin manages.
// Data access lives in `transport/db.server.ts` (local PostgreSQL).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString() } from "@/lib/zod-uuid";
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
  const isAdmin =
    roles.isPlatformOwner ||
    roles.isPlatformAdmin ||
    roles.isCompanyAdmin ||
    roles.roles.includes("superadmin") ||
    roles.roles.includes("workspace_owner");

  const stored = await db.listGrants(context.userId);
  const grants: TransportGrantKey[] = isAdmin
    ? [...TRANSPORT_GRANTS]
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
    canManageGrants: isAdmin,
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
] as const;

const registerEnum = z.enum(REGISTERS);
const values = z.record(z.string(), z.unknown());

// ── Overview ─────────────────────────────────────────────────────────────

export const getTransportOverview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<TransportOverview> => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [settings, c, alerts, incidents, requests, check] = await Promise.all([
      db.getSettings(a.companyId),
      db.counts(a.companyId),
      db.expiryAlerts(a.companyId),
      db.listIncidents(a.companyId),
      db.listRequests(a.companyId),
      db.lastCheck(a.companyId),
    ]);
    return {
      settings,
      counts: c,
      alerts: alerts.slice(0, 25),
      recentIncidents: incidents.slice(0, 6),
      openRequests: requests
        .filter((r) => r.status === "open" || r.status === "in_review")
        .slice(0, 6),
      lastCheck: check,
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
    const [vehicles, drivers, carriers, documents, incidents, requests, settings] =
      await Promise.all([
        db.listVehicles(a.companyId),
        db.listDrivers(a.companyId),
        db.listCarriers(a.companyId),
        db.listDocuments(a.companyId),
        db.listIncidents(a.companyId),
        db.listRequests(a.companyId),
        db.getSettings(a.companyId),
      ]);
    return {
      vehicles,
      drivers,
      carriers,
      documents,
      incidents,
      requests,
      settings,
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
    require(a, "edit");
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
    require(a, "edit");
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
    const results = activeId ? await db.listCheckResults(activeId) : [];
    return { items, checks, activeId, results, grants: a.grants };
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
      .object({ periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    const id = await db.startCheck(a.companyId, a.userId, a.name, data.periodStart);
    return { id };
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
    const [pins, zones, settings, alerts] = await Promise.all([
      db.listMapPins(a.companyId),
      db.listZones(a.companyId),
      db.getSettings(a.companyId),
      db.expiryAlerts(a.companyId),
    ]);
    return { pins, zones, settings, alerts, grants: a.grants };
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
        mapEnabled: z.boolean().optional(),
        mapTileUrl: z.string().max(500).nullish(),
        geocodeUrl: z.string().max(500).nullish(),
        allowExternalLookups: z.boolean().optional(),
        cmrPrefix: z.string().min(1).max(12).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "settings");
    const db = await import("@/lib/transport/db.server");
    return db.saveSettings(a.companyId, {
      ...data,
      mapTileUrl: data.mapTileUrl ?? null,
      geocodeUrl: data.geocodeUrl ?? null,
    });
  });

export const setTransportGrant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: uuidString(),
        grant: z.enum(["view", "edit", "approve", "checklist", "settings", "export", "cmr"]),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    if (!a.canManageGrants) {
      throw new Error("Forbidden: only an Admin or SuperAdmin can change rights.");
    }
    const db = await import("@/lib/transport/db.server");
    await db.setGrant(data.userId, data.grant, data.enabled, a.userId);
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
      }
    })();
    return {
      filename: `transport-${data.dataset}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: csv(rows as Array<Record<string, unknown>>),
    };
  });
