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
  const profile = await getProfileRepository(context.supabase).findByUserId(context.userId);
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
  const areaRights = await import("@/lib/providers/registry").then(
    ({ getAreaRightsRepository, hasAreaRightsRepository }) =>
      hasAreaRightsRepository()
        ? getAreaRightsRepository(context.supabase).listForUser(companyId, context.userId)
        : Promise.resolve([]),
  );
  const transportRights = areaRights.filter((right) => right.areaKey === "transport");
  const canonical = transportRights
    .filter((right) => right.granted)
    .flatMap((right): TransportGrantKey[] => {
      switch (right.action) {
        case "view":
          return ["view"];
        case "create":
          return ["create"];
        case "edit":
          return ["edit", "checklist", "cmr"];
        case "delete":
          return ["delete"];
        case "approve":
          return ["approve"];
        case "administer":
          return ["settings", "export"];
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
  "trailers",
  "couplings",
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
    z.object({ periodDays: z.number().int().min(7).max(365).optional() }).parse(input ?? {}),
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
      trailers,
      couplings,
      drivers,
      carriers,
      pins,
      trendData,
      auditRuns,
      fuel,
      duty,
      riskActions,
    ] = await Promise.all([
      db.getSettings(a.companyId),
      db.counts(a.companyId),
      db.expiryAlerts(a.companyId),
      db.listIncidents(a.companyId),
      db.listRequests(a.companyId),
      db.lastCheck(a.companyId),
      db.listVehicles(a.companyId),
      db.listTrailers(a.companyId),
      db.listCouplings(a.companyId, 14, 30),
      db.listDrivers(a.companyId),
      db.listCarriers(a.companyId),
      db.listMapPins(a.companyId),
      db.trends(a.companyId, periodDays),
      db.listAuditRuns(a.companyId, 1),
      db.listFuelEntries(a.companyId, periodDays * 2),
      db.listDutyDays(a.companyId, 1, 7),
      db.listRiskActions(a.companyId).catch(() => []),
    ]);
    const overview: TransportOverview = {
      settings,
      counts: c,
      alerts: alerts.slice(0, 200),
      riskActions,
      recentIncidents: incidents.slice(0, 25),
      openRequests: requests
        .filter((r) => r.status === "open" || r.status === "in_review")
        .slice(0, 25),
      vehicles,
      trailers,
      couplings,
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

    await riskDigest(a, { alerts, incidents, requests, check, settings });

    return overview;
  });

/**
 * Daily risk digest into the local inbox: expired / soon-expiring documents,
 * overdue audits, overdue requests and open critical incidents. One entry per
 * kind per day, so it reads like a morning briefing instead of a stream.
 */
/** Current hour in the company's configured timezone, falling back to server time. */
function localHour(timezone?: string): number {
  if (!timezone) return new Date().getHours();
  try {
    return Number(
      new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: timezone }).format(
        new Date(),
      ),
    );
  } catch {
    return new Date().getHours();
  }
}

async function riskDigest(
  a: Actor,
  input: {
    alerts: { level: string; ownerLabel: string; docLabel: string; daysLeft: number }[];
    incidents: { severity: string; status: string }[];
    requests: { due_on: string | null; status: string }[];
    check: { status: string; due_on?: string | null } | null;
    settings?: {
      digestEnabled: boolean;
      digestHour: number;
      digestEmails: string | null;
      digestWebhookUrl: string | null;
      timezone?: string;
    };
  },
): Promise<void> {
  try {
    const mod = await import("@/lib/selfhost-notifications.server");
    if (!mod.localInboxAvailable()) return;
    const today = new Date().toISOString().slice(0, 10);
    const link = "/app/products/transport/overview";
    const expired = input.alerts.filter((x) => x.level === "expired");
    const critical = input.alerts.filter((x) => x.level === "critical");
    const criticalIncidents = input.incidents.filter(
      (i) => i.severity === "critical" && i.status !== "closed" && i.status !== "cancelled",
    );
    const overdue = input.requests.filter(
      (r) =>
        r.due_on != null && r.due_on < today && (r.status === "open" || r.status === "in_review"),
    );

    const emit = (kind: string, title: string, body: string) =>
      mod.emitLocalNotificationOnceToday({
        companyId: a.companyId,
        kind,
        category: "transport",
        title,
        body,
        link,
      });

    if (expired.length) {
      await emit(
        "transport.documents.expired",
        `${expired.length} expired transport document(s)`,
        expired
          .slice(0, 5)
          .map((x) => `${x.ownerLabel} · ${x.docLabel}`)
          .join("; "),
      );
    }
    if (critical.length) {
      await emit(
        "transport.documents.expiring",
        `${critical.length} document(s) expiring within 14 days`,
        critical
          .slice(0, 5)
          .map((x) => `${x.ownerLabel} · ${x.docLabel} · ${x.daysLeft}d`)
          .join("; "),
      );
    }
    if (criticalIncidents.length) {
      await emit(
        "transport.incidents.critical",
        `${criticalIncidents.length} open critical incident(s)`,
        "Agree an action and an owner for each one.",
      );
    }
    if (overdue.length) {
      await emit(
        "transport.requests.overdue",
        `${overdue.length} request(s) past their due date`,
        "Still open after the agreed date.",
      );
    }
    if (input.check && input.check.status !== "completed" && input.check.due_on) {
      if (input.check.due_on < today) {
        await emit(
          "transport.audit.overdue",
          "Transport audit past its due date",
          `Due on ${input.check.due_on}.`,
        );
      }
    }

    // Morning briefing: once per day, from the configured hour onwards.
    const s = input.settings;
    if (s?.digestEnabled && localHour(s.timezone) >= (s.digestHour ?? 7)) {
      const already = await mod
        .listLocalNotifications(a.companyId, a.userId, 5)
        .catch(() => [] as { kind: string; created_at: string }[]);
      const sentToday = already.some(
        (n) =>
          n.kind === "transport.digest.sent" &&
          String(n.created_at).slice(0, 10) === today,
      );
      if (!sentToday) {
        const now = [
          expired.length ? { label: "Expired documents", count: expired.length } : null,
          critical.length ? { label: "Documents expiring soon", count: critical.length } : null,
          criticalIncidents.length
            ? { label: "Open critical incidents", count: criticalIncidents.length }
            : null,
        ].filter((x): x is { label: string; count: number } => x !== null);
        const plan = overdue.length
          ? [{ label: "Requests past their due date", count: overdue.length }]
          : [];
        const { sendTransportDigest } = await import("@/lib/transport/digest.server");
        const res = await sendTransportDigest({
          companyId: a.companyId,
          title: "OPSQAI Transport — morning briefing",
          now,
          plan,
          emails: s.digestEmails,
          webhookUrl: s.digestWebhookUrl,
        });
        if (res.sent) {
          await emit(
            "transport.digest.sent",
            "Morning briefing sent",
            `${res.emailed} recipient(s)${res.posted ? " + webhook" : ""}.`,
          );
        }
      }
    }
  } catch {
    // A digest must never break the overview.
  }
}

// ── Registers ────────────────────────────────────────────────────────────

export const getTransportRegisters = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const [
      vehicles,
      trailers,
      couplings,
      drivers,
      carriers,
      documents,
      incidents,
      requests,
      settings,
      fuel,
      duty,
      alerts,
    ] = await Promise.all([
      db.listVehicles(a.companyId),
      db.listTrailers(a.companyId),
      db.listCouplings(a.companyId, 60, 60),
      db.listDrivers(a.companyId),
      db.listCarriers(a.companyId),
      db.listDocuments(a.companyId),
      db.listIncidents(a.companyId),
      db.listRequests(a.companyId),
      db.getSettings(a.companyId),
      db.listFuelEntries(a.companyId, 180),
      db.listDutyDays(a.companyId, 30, 30),
      db.expiryAlerts(a.companyId),
    ]);
    return {
      vehicles,
      trailers,
      couplings,
      drivers,
      carriers,
      documents,
      incidents,
      requests,
      settings,
      fuel,
      duty,
      alerts,
      grants: a.grants,
      canManageGrants: a.canManageGrants,
    };
  });

/** Fire-and-forget notification for everyone in the caller's company. */
async function notifyCompany(
  a: Actor,
  input: { kind: string; category?: string; title: string; body?: string; link?: string },
): Promise<void> {
  const mod = await import("@/lib/selfhost-notifications.server");
  if (!mod.localInboxAvailable()) return;
  await mod.emitLocalNotification({ companyId: a.companyId, ...input });
}

export const saveTransportRecord = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ register: registerEnum, id: uuidString().optional(), values }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, data.id ? "edit" : "create");
    const db = await import("@/lib/transport/db.server");
    if (data.id) {
      await db.updateRecord(data.register, a.companyId, data.id, data.values);
      return { id: data.id };
    }
    const created = await db.createRecord(data.register, a.companyId, a.userId, data.values);
    if (data.register === "incidents" && !data.id) {
      await notifyCompany(a, {
        kind: "transport.incident.opened",
        category: "transport",
        title: "New transport incident reported",
        body: `Reported by ${a.name}.`,
        link: "/app/products/transport/incidents",
      });
    }
    if (data.register === "requests" && !data.id) {
      await notifyCompany(a, {
        kind: "transport.request.opened",
        category: "transport",
        title: "New transport request submitted",
        body: `Submitted by ${a.name}.`,
        link: "/app/products/transport/requests",
      });
    }
    return created;
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
    await db.decideRequest(a.companyId, data.id, data.decision, a.userId, data.note ?? null);
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
    await db.decideIncident(a.companyId, data.id, data.status, a.userId, data.actionAgreed ?? null);
    return { ok: true };
  });

// ── Notes ────────────────────────────────────────────────────────────────

const ownerKind = z.enum(["vehicle", "driver", "carrier", "incident", "request", "check", "cmr"]);

export const listTransportNotes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ ownerKind, ownerId: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    return db.listNotes(a.companyId, data.ownerKind, data.ownerId);
  });

export const addTransportNote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ ownerKind, ownerId: uuidString(), body: z.string().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    await db.addNote(a.companyId, data.ownerKind, data.ownerId, data.body, a.userId, a.name);
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
    const [results, settings, trends] = await Promise.all([
      activeId ? db.listCheckResults(activeId) : Promise.resolve([]),
      db.getSettings(a.companyId),
      db.auditTrends(a.companyId),
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
      trends,
      templates: db.CHECKLIST_TEMPLATES.map((t) => ({ key: t.key, label: t.label })),
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
        valueKind: z.enum(["none", "number", "text"]).optional(),
        valueUnit: z.string().max(40).nullish(),
        valueMin: z.number().nullish(),
        valueMax: z.number().nullish(),
        perAsset: z.boolean().optional(),
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
      valueUnit: data.valueUnit ?? null,
      valueMin: data.valueMin ?? null,
      valueMax: data.valueMax ?? null,
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
        dueOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullish(),
        vehicleIds: z.array(uuidString()).max(200).optional(),
        driverIds: z.array(uuidString()).max(200).optional(),
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
      {
        vehicleIds: data.vehicleIds ?? null,
        driverIds: data.driverIds ?? null,
      },
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

/** Add a reusable audit template (roadworthiness, cargo safety, tachograph). */
export const applyChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ key: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    const added = await db.applyChecklistTemplate(a.companyId, a.userId, data.key);
    return { added };
  });

/** Attach a photo or document to a checklist line (max 8 MB per file). */
export const uploadCheckEvidence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resultId: uuidString(),
        filename: z.string().min(1).max(200),
        mime: z.string().min(1).max(120),
        base64: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength === 0) throw new Error("The file is empty.");
    if (bytes.byteLength > 8 * 1024 * 1024) {
      throw new Error("Evidence files are limited to 8 MB.");
    }
    const db = await import("@/lib/transport/db.server");
    return db.addCheckEvidence(
      a.companyId,
      data.resultId,
      { filename: data.filename, mime: data.mime, bytes },
      a.userId,
      a.name,
    );
  });

export const deleteCheckEvidence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.deleteCheckEvidence(a.companyId, data.id);
    return { ok: true };
  });

/** Download one evidence file as base64. */
export const downloadCheckEvidence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    const file = await db.getCheckEvidenceFile(a.companyId, data.id);
    if (!file) throw new Error("Evidence file not found.");
    return {
      filename: file.filename,
      mime: file.mime,
      base64: file.bytes.toString("base64"),
    };
  });

/** Auditor signature; recorded with the signed-in user's name. */
export const signWeeklyCheck = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ checkId: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.signCheck(a.companyId, data.checkId, a.userId, a.name);
    return { ok: true };
  });

/** Approver signature on a completed run (second pair of eyes). */
export const approveWeeklyCheck = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ checkId: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "approve");
    const db = await import("@/lib/transport/db.server");
    await db.approveCheck(a.companyId, data.checkId, a.userId, a.name);
    return { ok: true };
  });

/** Raise an incident or a request from a failed checklist line. */
export const escalateCheckResult = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ resultId: uuidString(), kind: z.enum(["incident", "request"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    const res = await db.escalateCheckResult(a.companyId, data.resultId, data.kind, a.userId);
    await notifyCompany(a, {
      kind: data.kind === "incident" ? "transport.incident.raised" : "transport.request.raised",
      category: "transport",
      title:
        data.kind === "incident"
          ? "Audit issue escalated to an incident"
          : "Audit issue escalated to a request",
      body: `Raised by ${a.name}.`,
      link:
        data.kind === "incident"
          ? "/app/products/transport/incidents"
          : "/app/products/transport/requests",
    });
    return res;
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
        valueText: z.string().max(500).nullish(),
        valueNumber: z.number().finite().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.setCheckResult(a.companyId, data.resultId, data.outcome, data.note ?? null, a.userId, {
      text: data.valueText ?? null,
      number: data.valueNumber ?? null,
    });
    return { ok: true };
  });

/** Record only the measured value of a checklist line during a run. */
export const setCheckResultValue = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resultId: uuidString(),
        valueText: z.string().max(500).nullish(),
        valueNumber: z.number().finite().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.setCheckResultValue(
      a.companyId,
      data.resultId,
      { text: data.valueText ?? null, number: data.valueNumber ?? null },
      a.userId,
    );
    return { ok: true };
  });

/** Stop the run for the current period without completing it. */
export const cancelWeeklyCheck = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ checkId: uuidString(), reason: z.string().max(2000).nullish() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "checklist");
    const db = await import("@/lib/transport/db.server");
    await db.cancelCheck(a.companyId, data.checkId, data.reason ?? null);
    return { ok: true };
  });

export const completeWeeklyCheck = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ checkId: uuidString(), summary: z.string().max(4000).nullish() }).parse(input),
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
  .inputValidator((input: unknown) => z.object({ query: z.string().min(2).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/transport/db.server");
    return { hits: await db.searchPlaces(a.companyId, data.query, 6) };
  });

export const geocodeTransportPlace = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().min(2).max(300) }).parse(input))
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
        digestEnabled: z.boolean().optional(),
        digestHour: z.number().int().min(0).max(23).optional(),
        digestEmails: z.string().max(500).nullish(),
        digestWebhookUrl: z.string().max(500).nullish(),
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
        grant: z.enum([
          "view",
          "create",
          "edit",
          "delete",
          "approve",
          "checklist",
          "settings",
          "export",
          "cmr",
        ]),
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
    if (
      targetRoles.isPlatformOwner ||
      targetRoles.isPlatformAdmin ||
      targetRoles.roles.includes("superadmin")
    ) {
      throw new Error("Owner and SuperAdmin rights cannot be restricted");
    }
    const db = await import("@/lib/transport/db.server");
    await db.setGrant(data.userId, data.grant, data.enabled, a.userId);
    const { getAreaRightsRepository, hasAreaRightsRepository } =
      await import("@/lib/providers/registry");
    if (hasAreaRightsRepository()) {
      const repo = getAreaRightsRepository(context.supabase);
      const existing = await repo.listForUser(a.companyId, data.userId);
      const action =
        data.grant === "settings" || data.grant === "export"
          ? "administer"
          : data.grant === "checklist" || data.grant === "cmr"
            ? "edit"
            : data.grant;
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

export const duplicateCmrNote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuidString(), draftName: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "cmr");
    const db = await import("@/lib/transport/db.server");
    return db.duplicateCmr(a.companyId, a.userId, data.id, data.draftName.trim());
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

// ── Register PDF export ──────────────────────────────────────────────────

/** Columns worth printing: skip identifiers and internal bookkeeping. */
const HIDDEN_COLUMNS =
  /(^id$|_id$|^company_id$|^created_at$|^updated_at$|^archived_at$|^raw$|^evidence$)/;

export const exportTransportPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dataset: z.enum([
          "vehicles",
          "trailers",
          "couplings",
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
        title: z.string().max(120).optional(),
        generatedLabel: z.string().max(80).optional(),
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
        case "trailers":
          return db.listTrailers(a.companyId);
        case "couplings":
          return db.listCouplings(a.companyId, 365, 365);
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

    const list = rows as unknown as Array<Record<string, unknown>>;
    const keys = Object.keys(list[0] ?? {})
      .filter((k) => !HIDDEN_COLUMNS.test(k))
      .slice(0, 9);
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const bytes = await renderTablePdf({
      title: data.title ?? data.dataset,
      subtitle: `${list.length}`,
      headers: keys.map((k) => k.replace(/_/g, " ")),
      rows: list.map((row) => keys.map((k) => row[k])),
      generatedLabel: data.generatedLabel ?? "Generated",
    });
    return {
      filename: `transport-${data.dataset}-${new Date().toISOString().slice(0, 10)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
      count: list.length,
    };
  });

export const exportTransportFindingsPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().max(120),
        generatedLabel: z.string().max(80).optional(),
        findings: z
          .array(
            z.object({
              severity: z.string().max(40),
              area: z.string().max(80),
              title: z.string().max(200),
              count: z.number().finite(),
              detail: z.string().max(500),
            }),
          )
          .max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "export");
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const bytes = await renderTablePdf({
      title: data.title,
      headers: ["severity", "area", "finding", "count", "detail"],
      rows: data.findings.map((f) => [f.severity, f.area, f.title, f.count, f.detail]),
      generatedLabel: data.generatedLabel ?? "Generated",
    });
    return {
      filename: `transport-audit-findings-${new Date().toISOString().slice(0, 10)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

// ── Coupling sheet export (PDF) ──────────────────────────────────────────

export const exportCouplingSheet = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        labels: z.object({
          title: z.string(),
          date: z.string(),
          vehicle: z.string(),
          trailer: z.string(),
          driver: z.string(),
          route: z.string(),
          status: z.string(),
          notes: z.string(),
          generated: z.string(),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "export");
    const db = await import("@/lib/transport/db.server");
    const all = await db.listCouplings(a.companyId, 3650, 3650);
    const from = data.from ?? null;
    const to = data.to ?? null;
    const rows = all.filter(
      (c) => (!from || c.coupling_date >= from) && (!to || c.coupling_date <= to),
    );
    const mod = await import("@/lib/transport/coupling-export.server");
    const bytes = await mod.renderCouplingPdf(rows, data.labels);
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      filename: `transport-sets-${stamp}.pdf`,
      mime: "application/pdf",
      base64: Buffer.from(bytes).toString("base64"),
      count: rows.length,
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
  .inputValidator((input: unknown) => z.object({ vehicleId: uuidString() }).parse(input))
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

// ── Risk ownership (owner + due date + history) ───────────────────────────

export const getTransportRiskActions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    require(a, "view");
    const db = await import("@/lib/transport/db.server");
    const [actions, events] = await Promise.all([
      db.listRiskActions(a.companyId),
      db.listRiskActionEvents(a.companyId, 80),
    ]);
    return { actions, events, grants: a.grants };
  });

export const saveTransportRiskAction = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().nullish(),
        riskKey: z.string().min(1).max(80),
        subject: z.string().max(200).nullish(),
        ownerName: z.string().max(120).nullish(),
        dueOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullish(),
        note: z.string().max(1000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    const action = await db.saveRiskAction(a.companyId, a.name, {
      id: data.id ?? null,
      riskKey: data.riskKey,
      subject: data.subject ?? null,
      ownerName: data.ownerName ?? null,
      dueOn: data.dueOn ?? null,
      note: data.note ?? null,
    });
    return { action };
  });

export const closeTransportRiskAction = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    await db.closeRiskAction(a.companyId, a.name, data.id);
    return { ok: true };
  });

// ── Fleet status (one page) ───────────────────────────────────────────────

export const exportFleetStatusPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().max(120),
        subtitle: z.string().max(200),
        footer: z.string().max(80),
        kpis: z.array(z.object({ label: z.string().max(60), value: z.string().max(40) })).max(12),
        lanes: z
          .array(
            z.object({
              title: z.string().max(80),
              tone: z.enum(["critical", "plan"]),
              items: z
                .array(z.object({ label: z.string().max(160), value: z.string().max(40) }))
                .max(40),
            }),
          )
          .max(4),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "export");
    const { renderFleetStatusPdf } = await import("@/lib/transport/fleet-status-pdf.server");
    const bytes = await renderFleetStatusPdf(data);
    return {
      filename: `fleet-status-${new Date().toISOString().slice(0, 10)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
      count: data.lanes.reduce((s, l) => s + l.items.length, 0) + data.kpis.length,
    };
  });

// ── Morning briefing ─────────────────────────────────────────────────────

export const sendTransportDigestNow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().max(120),
        now: z.array(z.object({ label: z.string().max(160), count: z.number().finite() })).max(40),
        plan: z.array(z.object({ label: z.string().max(160), count: z.number().finite() })).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "settings");
    const db = await import("@/lib/transport/db.server");
    const settings = await db.getSettings(a.companyId);
    const { sendTransportDigest } = await import("@/lib/transport/digest.server");
    return sendTransportDigest({
      companyId: a.companyId,
      title: data.title,
      now: data.now,
      plan: data.plan,
      emails: settings.digestEmails,
      webhookUrl: settings.digestWebhookUrl,
    });
  });

// ── Trip planner ──────────────────────────────────────────────────────────

const tripPointSchema = z.object({
  label: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

const tripPlanSchema = z.object({
  lang: z.enum(["en", "de", "ro"]).default("en"),
  origin: tripPointSchema,
  destination: tripPointSchema,
  stops: z.array(tripPointSchema).max(8).optional(),
  departAt: z.string().min(10).max(40),
  vehicleId: uuidString().nullable().optional(),
  trailerId: uuidString().nullable().optional(),
  driverId: uuidString().nullable().optional(),
  vehicleProfile: z.enum(["truck", "van", "car"]).default("truck"),
  routePreference: z.enum(["fast", "short", "no_tolls"]).default("fast"),
  alreadyDrivenMinutes: z.number().int().min(0).max(540).default(0),
  stopMinutes: z.number().int().min(0).max(240).default(30),
});

/** Compute a trip plan. Nothing is stored until the user saves it. */
export const planTransportTrip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => tripPlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "view");
    const db = await import("@/lib/transport/db.server");
    const { fetchRoute, fetchWeather } = await import("@/lib/transport/routing.server");
    const { planTrip } = await import("@/lib/transport/trip-planner");
    const { buildTripChecks } = await import("@/lib/transport/trip-checks.server");
    const { transportUi } = await import("@/i18n/pages/transport");
    const t = transportUi(data.lang);

    const settings = await db.getSettings(a.companyId);
    const [vehicles, drivers, alerts, duty, incidents] = await Promise.all([
      db.listVehicles(a.companyId),
      db.listDrivers(a.companyId),
      db.expiryAlerts(a.companyId),
      db.listDutyDays(a.companyId, 0, 14),
      db.listIncidents(a.companyId),
    ]);
    const vehicle = data.vehicleId ? vehicles.find((v) => v.id === data.vehicleId) ?? null : null;
    const driver = data.driverId ? drivers.find((d) => d.id === data.driverId) ?? null : null;

    // Resolve any point that arrived without coordinates.
    const resolve = async (point: { label: string; lat?: number | null; lng?: number | null }) => {
      if (point.lat != null && point.lng != null) {
        return { label: point.label, lat: point.lat, lng: point.lng };
      }
      const hit = settings.tripExternalLookups
        ? await db.geocode(a.companyId, point.label)
        : null;
      return {
        label: hit?.label ?? point.label,
        lat: hit?.lat ?? null,
        lng: hit?.lng ?? null,
      };
    };

    const origin = await resolve(data.origin);
    const destination = await resolve(data.destination);
    const middle = [];
    for (const stop of data.stops ?? []) middle.push(await resolve(stop));

    const ordered = [origin, ...middle, destination];
    const withCoords = ordered.filter(
      (p): p is { label: string; lat: number; lng: number } => p.lat != null && p.lng != null,
    );
    if (withCoords.length < 2) {
      throw new Error(t.tripNeedCoordinates);
    }

    const route = await fetchRoute(
      withCoords.map((p) => ({ lat: p.lat, lng: p.lng })),
      {
        profile: data.vehicleProfile,
        preference: data.routePreference,
        speedTruck: settings.tripSpeedTruck,
        speedCar: settings.tripSpeedCar,
        allowExternal: settings.tripExternalLookups,
        cache: {
          read: (key) => db.readRouteCache(key),
          write: (key, value) => db.writeRouteCache(a.companyId, key, value),
        },
      },
    );

    const timeline = planTrip({
      departAt: new Date(data.departAt).toISOString(),
      distanceKm: route.distanceKm,
      driveMinutes: route.driveMinutes,
      alreadyDrivenMinutes: data.alreadyDrivenMinutes,
      stopMinutes: data.stopMinutes,
      stops: withCoords,
      splitBreak: settings.tripBreakSplit,
      fuelPer100Km: vehicle?.fuel_per_100km ?? settings.tripFuelPer100Km,
      applyDrivingRules: data.vehicleProfile === "truck",
    });

    const plan: import("@/lib/transport/types").TripPlan = {
      origin,
      destination,
      stops: ordered.map((p, i) => ({
        position: i + 1,
        label: p.label,
        latitude: p.lat,
        longitude: p.lng,
      })),
      departAt: new Date(data.departAt).toISOString(),
      arrivalAt: timeline.arrivalAt,
      distanceKm: route.distanceKm,
      driveMinutes: timeline.driveMinutes,
      totalMinutes: timeline.totalMinutes,
      fuelLitres: timeline.fuelLitres,
      tollAmount: null,
      tollCurrency: null,
      routeSource: route.source,
      geometry: route.geometry,
      legs: timeline.legs.map((l) => ({
        position: l.position,
        kind: l.kind,
        minutes: l.minutes,
        distance_km: l.distanceKm,
        start_at: l.startAt,
        end_at: l.endAt,
        label: l.label,
        latitude: l.lat,
        longitude: l.lng,
      })),
      checks: [],
      vehicleProfile: data.vehicleProfile,
      routePreference: data.routePreference,
      vehicleId: vehicle?.id ?? null,
      vehiclePlate: vehicle?.plate ?? null,
      trailerId: data.trailerId ?? null,
      driverId: driver?.id ?? null,
      driverName: driver?.full_name ?? null,
      driverPhone: driver?.phone ?? null,
      alternatives: route.alternatives.map((alt) => ({ ...alt, tollAmount: null })),
    };

    const weather = [];
    if (settings.tripExternalLookups) {
      const first = withCoords[0]!;
      const last = withCoords[withCoords.length - 1]!;
      const [start, end] = await Promise.all([
        fetchWeather(first, plan.departAt, first.label, true),
        fetchWeather(last, plan.arrivalAt, last.label, true),
      ]);
      for (const w of [start, end]) if (w) weather.push(w);
    }

    plan.checks = buildTripChecks(plan, {
      alerts,
      vehicle,
      driver,
      duty,
      incidents: incidents.map((i) => ({
        id: i.id,
        title: i.title,
        latitude: i.latitude,
        longitude: i.longitude,
        status: i.status,
        severity: (i as { severity?: string | null }).severity ?? null,
      })),
      weather,
      offlineRoute: route.source === "offline",
      labels: {
        docExpired: t.tripCheckDocExpired,
        docExpiring: t.tripCheckDocExpiring,
        driverOff: t.tripCheckDriverOff,
        driverNoPhone: t.tripCheckDriverNoPhone,
        incidentOnRoute: t.tripCheckIncident,
        weather: t.tripCheckWeather,
        parking: t.tripCheckParking,
        restNeeded: t.tripCheckRest,
        restNeededDetail: t.tripCheckRestDetail,
        noRouteOnline: t.tripCheckOffline,
        noRouteOnlineDetail: t.tripCheckOfflineDetail,
        vehicleDimensions: t.tripCheckDimensions,
        vehicleDimensionsDetail: t.tripCheckDimensionsDetail,
        adr: t.tripCheckAdr,
        adrDetail: t.tripCheckAdrDetail,
        fuelStop: t.tripCheckFuel,
        allClear: t.tripChecksClear,
      },
    });

    return { plan, weather, settings: { timezone: settings.timezone } };
  });

const tripPlanPayload = z.object({
  // The plan is produced by planTransportTrip and echoed back by the client.
  plan: z
    .custom<import("@/lib/transport/types").TripPlan>((v) => !!v && typeof v === "object")
    .transform((v) => v as import("@/lib/transport/types").TripPlan),
});

export const listTransportTrips = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    require(a, "view");
    const db = await import("@/lib/transport/db.server");
    return { trips: await db.listTrips(a.companyId), grants: a.grants };
  });

export const getTransportTrip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "view");
    const db = await import("@/lib/transport/db.server");
    return { trip: await db.getTrip(a.companyId, data.id) };
  });

export const saveTransportTrip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    tripPlanPayload
      .extend({
        id: uuidString().nullable().optional(),
        name: z.string().max(120).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, data.id ? "edit" : "create");
    const db = await import("@/lib/transport/db.server");
    const saved = await db.saveTrip(a.companyId, a.name, data.plan, {
      id: data.id ?? null,
      name: data.name ?? null,
      notes: data.notes ?? null,
    });
    return { id: saved.id, trip: await db.getTrip(a.companyId, saved.id) };
  });

export const deleteTransportTrip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "delete");
    const db = await import("@/lib/transport/db.server");
    await db.deleteTrip(a.companyId, data.id);
    return { ok: true };
  });

/** The trip plan as an A4 PDF (Self-Hosted exports are PDF only). */
export const exportTransportTripPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    tripPlanPayload
      .extend({
        lang: z.enum(["en", "de", "ro"]).default("en"),
        name: z.string().max(120).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "export");
    const db = await import("@/lib/transport/db.server");
    const settings = await db.getSettings(a.companyId);
    const { renderTripPdf } = await import("@/lib/transport/trip-pdf.server");
    const { transportUi } = await import("@/i18n/pages/transport");
    const t = transportUi(data.lang);
    const bytes = await renderTripPdf(
      data.plan,
      {
        title: t.tripPlan,
        from: t.tripFrom,
        to: t.tripTo,
        depart: t.tripDepart,
        arrive: t.tripArrive,
        distance: t.tripDistance,
        drive: t.tripDrive,
        total: t.tripTotal,
        fuel: t.tripFuel,
        vehicle: t.vehicle ?? "Vehicle",
        driver: t.driver ?? "Driver",
        stops: t.tripStops,
        timeline: t.tripTimeline,
        checks: t.tripChecks,
        source: t.tripSource,
        offline: t.tripOffline,
        online: t.tripOnline,
        generated: t.generatedOn,
        breakLabel: t.tripBreak,
        restLabel: t.tripRest,
        driveLabel: t.tripDriveLeg,
        stopLabel: t.tripStop,
      },
      { timezone: settings.timezone, generatedBy: a.name, name: data.name ?? null },
    );
    return {
      filename: `trip-${new Date(data.plan.departAt).toISOString().slice(0, 10)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

/**
 * Send the plan to the driver on WhatsApp. Default mode returns a wa.me link
 * the dispatcher opens; with Twilio connected the message is sent directly.
 */
export const sendTransportTripToDriver = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    tripPlanPayload
      .extend({
        lang: z.enum(["en", "de", "ro"]).default("en"),
        phone: z.string().min(6).max(24),
        tripId: uuidString().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    require(a, "edit");
    const db = await import("@/lib/transport/db.server");
    const settings = await db.getSettings(a.companyId);
    const wa = await import("@/lib/transport/whatsapp.server");
    const phone = wa.normalizePhone(data.phone);
    if (!phone) throw new Error("The driver's phone number is not a valid international number.");
    const message = wa.composeTripMessage(data.plan, {
      lang: data.lang,
      timezone: settings.timezone,
      dispatcher: settings.whatsappDispatcher ?? a.name,
    });

    if (settings.whatsappChannel === "twilio" && settings.whatsappFrom) {
      const outcome = await wa.sendViaTwilio(phone, settings.whatsappFrom, message);
      if (data.tripId) {
        await db.recordTripSend(a.companyId, data.tripId, "twilio", phone, outcome.status);
      }
      return { mode: "twilio" as const, status: outcome.status, link: null, message };
    }

    if (data.tripId) {
      await db.recordTripSend(a.companyId, data.tripId, "link", phone, "prepared");
    }
    return {
      mode: "link" as const,
      status: "prepared" as const,
      link: wa.whatsappLink(phone, message),
      message,
    };
  });
