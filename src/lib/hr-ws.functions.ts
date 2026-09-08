// OPSQAI HR — server functions for lifecycle flows, position changes,
// equipment packages, policies, requests, knowledge, training, compliance
// and the HR intelligence assistant. Company scope + HR rights enforced.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import type { HrCtx } from "@/lib/hr/actor.server";

const who = async (context: unknown) => {
  const { hrActor, hrNeed } = await import("@/lib/hr/actor.server");
  const a = await hrActor(context as HrCtx);
  return { a, need: (g: Parameters<typeof hrNeed>[1]) => hrNeed(a, g) };
};
const ws = () => import("@/lib/hr/db-ws.server");
const core = () => import("@/lib/hr/db.server");
const lib = () => import("@/lib/hr/library");

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const dateish = z.string().trim().min(1).nullable().optional();
const lang = z.enum(["en", "de", "ro"]);

const employeeOptions = async (companyId: string) => {
  const c = await core();
  const rows = await c.listEmployees(companyId, {});
  return rows.map((e) => ({
    id: e.id,
    label: `${e.employee_no} · ${e.first_name} ${e.last_name}`,
    status: e.status,
    start_date: e.start_date,
    end_date: e.end_date,
    position_id: e.position_id,
    position_name: e.position_name,
  }));
};

// ── Lifecycle: country flows + position changes ──────────────────────────

export const getHrLifecycle = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ language: lang.optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const [c, w, l] = await Promise.all([core(), ws(), lib()]);
    const settings = await c.getSettings(a.companyId);
    const L = data.language ?? "en";
    const [employees, tasks, changes, positions] = await Promise.all([
      employeeOptions(a.companyId),
      c.listTasks(a.companyId, {}),
      w.listPositionChanges(a.companyId),
      c.listRefs(a.companyId, "positions"),
    ]);
    return {
      country: settings.country,
      grants: a.grants,
      employees,
      positions,
      flows: l.flowsFor(settings.country).map((f) => ({
        key: f.key,
        kind: f.kind,
        label: f.label[L],
        steps: f.steps.map((s) => ({
          title: s.title[L],
          team: s.team,
          offsetDays: s.offsetDays,
          documentKey: s.documentKey ?? null,
          priority: s.priority ?? "normal",
        })),
      })),
      // Lifecycle tasks (onboarding/offboarding) grouped per employee, incl. done ones for progress.
      tasks: tasks.filter((t) => t.category === "onboarding" || t.category === "offboarding"),
      changes,
      promotionCriteria: l.PROMOTION_CRITERIA.map((c) => c[L]),
      demotionCriteria: l.DEMOTION_CRITERIA.map((c) => c[L]),
    };
  });

/** Start a country flow for one employee: real dated tasks, document-linked where relevant. */
export const startHrFlow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        flowKey: z.string().trim().min(1).max(60),
        employeeId: uuidString(),
        anchorDate: dateish,
        language: lang.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const [c, l] = await Promise.all([core(), lib()]);
    const settings = await c.getSettings(a.companyId);
    const flow = l.flowsFor(settings.country).find((f) => f.key === data.flowKey);
    if (!flow) throw new Error("Flow not found for this country.");
    const employee = await c.getEmployee(a.companyId, data.employeeId);
    if (!employee) throw new Error("Employee not found.");
    const L = data.language ?? (settings.default_language as "en" | "de" | "ro") ?? "en";
    const anchorRaw =
      data.anchorDate ?? (flow.kind === "onboarding" ? employee.start_date : employee.end_date) ?? new Date().toISOString().slice(0, 10);
    const anchor = new Date(anchorRaw);
    if (Number.isNaN(anchor.getTime())) throw new Error("Invalid anchor date.");

    const existing = await c.listTasks(a.companyId, { employeeId: data.employeeId });
    const already = new Set(existing.filter((t) => t.category === flow.kind).map((t) => t.title));
    let created = 0;
    for (const step of flow.steps) {
      const title = step.title[L];
      if (already.has(title)) continue;
      const due = new Date(anchor);
      due.setDate(due.getDate() + step.offsetDays);
      await c.saveTask(a.companyId, {
        employee_id: data.employeeId,
        title,
        category: flow.kind,
        team: step.team,
        due_date: due.toISOString().slice(0, 10),
        priority: step.priority ?? "normal",
        document_key: step.documentKey ?? null,
        status: "pending",
        source: flow.key,
      });
      created += 1;
    }
    const nextStatus =
      flow.kind === "onboarding" && employee.status !== "onboarding" && employee.status !== "active"
        ? "onboarding"
        : flow.kind === "offboarding" && employee.status !== "offboarding" && employee.status !== "terminated"
          ? "offboarding"
          : null;
    if (nextStatus) {
      await c.updateEmployee(a.companyId, employee.id, { ...employee, status: nextStatus }, { id: a.userId, name: a.name });
    }
    await c.addEvent(a.companyId, data.employeeId, flow.kind, `${flow.label[L]} started (${created} tasks)`, a.name);
    await c.audit(a.companyId, data.employeeId, { id: a.userId, name: a.name }, `${flow.kind}.start`, { flow: flow.key, created });
    return { created };
  });

export const recordHrPositionChange = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: uuidString(),
        kind: z.enum(["promote", "demote", "transfer"]),
        toPositionId: uuidString().nullable().optional(),
        toPosition: text(160),
        criteria: z
          .array(z.object({ label: z.string().trim().min(1).max(200), met: z.boolean(), note: text(400) }))
          .max(20),
        reason: text(2000),
        effectiveOn: dateish,
        generateLetter: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    const [c, w] = await Promise.all([core(), ws()]);
    if (data.kind !== "transfer") {
      const met = data.criteria.filter((x) => x.met).length;
      if (data.criteria.length > 0 && met < Math.ceil(data.criteria.length / 2)) {
        throw new Error("Fewer than half of the criteria are met. Document the reasons before recording this change.");
      }
    }
    await w.recordPositionChange(
      a.companyId,
      {
        employee_id: data.employeeId,
        kind: data.kind,
        to_position_id: data.toPositionId ?? null,
        to_position: data.toPosition ?? null,
        criteria: data.criteria,
        reason: data.reason ?? null,
        effective_on: data.effectiveOn ?? null,
      },
      a.name,
    );
    const verb = data.kind === "promote" ? "Promotion" : data.kind === "demote" ? "Demotion" : "Transfer";
    await c.addEvent(a.companyId, data.employeeId, "position", `${verb}: ${data.toPosition ?? "—"}`, a.name);
    await c.audit(a.companyId, data.employeeId, { id: a.userId, name: a.name }, `position.${data.kind}`, {
      to: data.toPosition,
      criteria: data.criteria,
    });
    if (data.generateLetter && data.kind === "promote") {
      await c.saveTask(a.companyId, {
        employee_id: data.employeeId,
        title: `Promotion letter — ${data.toPosition ?? ""}`.trim(),
        category: "document",
        team: "HR",
        priority: "normal",
        document_key: "promotion_letter",
        due_date: data.effectiveOn ?? new Date().toISOString().slice(0, 10),
        source: "position_change",
      });
    }
    return { ok: true };
  });

// ── Equipment packages ───────────────────────────────────────────────────

export const getHrAssetPackages = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ language: lang.optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const [w, l] = await Promise.all([ws(), lib()]);
    const L = data.language ?? "en";
    return {
      packages: await w.listAssetPackages(a.companyId),
      builtIn: l.ASSET_PACKAGES.map((p) => ({ key: p.key, category: p.category, label: p.label[L], items: p.items })),
      categories: [...l.ASSET_CATEGORIES],
    };
  });

export const saveHrAssetPackage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        name: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1).max(40),
        items: z.array(z.object({ name: z.string().trim().min(1).max(120), category: z.string().trim().max(40) })).min(1).max(60),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    const id = await (await ws()).saveAssetPackage(a.companyId, data);
    return { id };
  });

export const deleteHrAssetPackage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ws()).deleteAssetPackage(a.companyId, data.id);
    return { ok: true };
  });

/** Issue a package (saved or built-in): creates the assets and assigns them. */
export const issueHrAssetPackage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        packageId: uuidString().optional(),
        builtInKey: z.string().trim().max(40).optional(),
        employeeId: uuidString().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const [w, l, c] = await Promise.all([ws(), lib(), core()]);
    let items: Array<{ name: string; category: string }> = [];
    let name = "";
    if (data.packageId) {
      const p = (await w.listAssetPackages(a.companyId)).find((x) => x.id === data.packageId);
      if (!p) throw new Error("Package not found.");
      items = p.items;
      name = p.name;
    } else if (data.builtInKey) {
      const p = l.ASSET_PACKAGES.find((x) => x.key === data.builtInKey);
      if (!p) throw new Error("Package not found.");
      items = p.items;
      name = p.label.en;
    }
    if (!items.length) throw new Error("The package is empty.");
    const created = await w.issuePackage(a.companyId, items, data.employeeId ?? null);
    if (data.employeeId) {
      await c.addEvent(a.companyId, data.employeeId, "asset", `Equipment package issued: ${name} (${created} items)`, a.name);
    }
    return { created };
  });

// ── Policies & procedures ────────────────────────────────────────────────

export const getHrPolicies = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ language: lang.optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const [w, l] = await Promise.all([ws(), lib()]);
    const L = data.language ?? "en";
    return {
      policies: await w.listPolicies(a.companyId),
      employees: await employeeOptions(a.companyId),
      starters: l.POLICY_LIBRARY.map((p) => ({
        key: p.key,
        category: p.category,
        requiresAck: p.requiresAck,
        title: p.title[L],
        body: p.body[L],
      })),
      grants: a.grants,
    };
  });

export const saveHrPolicy = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        title: z.string().trim().min(1).max(200),
        category: z.enum(["policy", "procedure", "safety", "code_of_conduct"]),
        body: z.string().max(100_000),
        status: z.enum(["draft", "published", "archived"]).optional(),
        requires_ack: z.boolean().optional(),
        effective_from: dateish,
        country: text(8),
        bumpVersion: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    const id = await (await ws()).savePolicy(a.companyId, data);
    return { id };
  });

export const deleteHrPolicy = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ws()).deletePolicy(a.companyId, data.id);
    return { ok: true };
  });

export const getHrPolicyAcks = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ policyId: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    return (await ws()).listPolicyAcks(a.companyId, data.policyId);
  });

export const acknowledgeHrPolicy = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ policyId: uuidString(), employeeIds: z.array(uuidString()).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    await (await ws()).acknowledgePolicy(a.companyId, data.policyId, data.employeeIds, a.name);
    return { ok: true };
  });

// ── Employee requests ────────────────────────────────────────────────────

export const getHrRequests = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("view");
    const w = await ws();
    return {
      requests: await w.listRequests(a.companyId),
      employees: await employeeOptions(a.companyId),
      grants: a.grants,
    };
  });

export const saveHrRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        employee_id: uuidString().nullable().optional(),
        kind: z.enum(["leave", "certificate", "equipment", "data_change", "training", "other"]),
        title: z.string().trim().min(1).max(200),
        details: text(4000),
        from_date: dateish,
        to_date: dateish,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    const [w, c] = await Promise.all([ws(), core()]);
    const id = await w.saveRequest(a.companyId, data);
    if (!data.id && data.employee_id) {
      await c.addEvent(a.companyId, data.employee_id, "request", `Request opened: ${data.title}`, a.name);
    }
    return { id };
  });

export const decideHrRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        status: z.enum(["open", "in_review", "approved", "rejected", "done"]),
        note: text(2000),
        createTask: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("approve");
    const [w, c] = await Promise.all([ws(), core()]);
    const req = (await w.listRequests(a.companyId)).find((r) => r.id === data.id);
    if (!req) throw new Error("Request not found.");
    await w.decideRequest(a.companyId, data.id, data.status, data.note ?? null, a.name);
    if (req.employee_id) {
      await c.addEvent(a.companyId, req.employee_id, "request", `Request ${data.status}: ${req.title}`, a.name);
    }
    if (data.status === "approved" && data.createTask) {
      // Approved certificate requests become a document task; others a generic follow-up.
      const docKey = req.kind === "certificate" ? "employment_certificate" : null;
      await c.saveTask(a.companyId, {
        employee_id: req.employee_id,
        title: req.title,
        description: req.details,
        category: req.kind === "certificate" ? "document" : "request",
        team: "HR",
        priority: "normal",
        document_key: docKey,
        due_date: req.from_date ?? new Date().toISOString().slice(0, 10),
        source: "request",
      });
    }
    await c.audit(a.companyId, req.employee_id, { id: a.userId, name: a.name }, `request.${data.status}`, { title: req.title });
    return { ok: true };
  });

export const deleteHrRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ws()).deleteRequest(a.companyId, data.id);
    return { ok: true };
  });

// ── HR knowledge ─────────────────────────────────────────────────────────

export const getHrKnowledge = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ search: z.string().trim().max(120).optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    return { articles: await (await ws()).listKnowledge(a.companyId, data.search), grants: a.grants };
  });

export const saveHrKnowledge = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        title: z.string().trim().min(1).max(200),
        category: z.string().trim().min(1).max(60),
        body: z.string().max(100_000),
        tags: z.array(z.string().trim().min(1).max(40)).max(20),
        country: text(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    return { id: await (await ws()).saveKnowledge(a.companyId, data) };
  });

export const deleteHrKnowledge = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ws()).deleteKnowledge(a.companyId, data.id);
    return { ok: true };
  });

// ── Training ─────────────────────────────────────────────────────────────

export const getHrTraining = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ language: lang.optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const [w, l, c] = await Promise.all([ws(), lib(), core()]);
    const settings = await c.getSettings(a.companyId);
    const L = data.language ?? "en";
    return {
      trainings: await w.listTrainings(a.companyId),
      records: await w.listTrainingRecords(a.companyId),
      employees: await employeeOptions(a.companyId),
      catalogue: (l.TRAINING_LIBRARY[settings.country] ?? l.TRAINING_LIBRARY.generic).map((t) => ({
        key: t.key,
        category: t.category,
        mandatory: t.mandatory,
        validMonths: t.validMonths,
        title: t.title[L],
      })),
      grants: a.grants,
    };
  });

export const saveHrTraining = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        title: z.string().trim().min(1).max(200),
        category: z.enum(["safety", "compliance", "skills", "onboarding", "general"]),
        mandatory: z.boolean(),
        valid_months: z.number().int().min(1).max(120).nullable().optional(),
        country: text(8),
        description: text(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    return { id: await (await ws()).saveTraining(a.companyId, data) };
  });

export const deleteHrTraining = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ws()).deleteTraining(a.companyId, data.id);
    return { ok: true };
  });

export const saveHrTrainingRecord = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        training_id: uuidString(),
        employee_ids: z.array(uuidString()).min(1).max(500),
        status: z.enum(["planned", "completed"]),
        planned_on: dateish,
        completed_on: dateish,
        score: text(40),
        notes: text(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    const [w, c] = await Promise.all([ws(), core()]);
    for (const employeeId of data.employee_ids) {
      await w.saveTrainingRecord(a.companyId, { ...data, id: data.employee_ids.length === 1 ? data.id : undefined, employee_id: employeeId });
      if (data.status === "completed") {
        await c.addEvent(a.companyId, employeeId, "training", "Training completed", a.name);
      }
    }
    return { ok: true };
  });

export const deleteHrTrainingRecord = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ws()).deleteTrainingRecord(a.companyId, data.id);
    return { ok: true };
  });

// ── Compliance ───────────────────────────────────────────────────────────

export const getHrCompliance = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ language: lang.optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const [w, l, c] = await Promise.all([ws(), lib(), core()]);
    const settings = await c.getSettings(a.companyId);
    const L = data.language ?? "en";
    return {
      country: settings.country,
      items: await w.listCompliance(a.companyId),
      employees: await employeeOptions(a.companyId),
      library: (l.COMPLIANCE_LIBRARY[settings.country] ?? l.COMPLIANCE_LIBRARY.generic).map((d) => ({
        key: d.key,
        category: d.category,
        perEmployee: d.perEmployee,
        title: d.title[L],
      })),
      grants: a.grants,
    };
  });

export const seedHrCompliance = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ language: lang.optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const [w, l, c] = await Promise.all([ws(), lib(), core()]);
    const settings = await c.getSettings(a.companyId);
    const L = data.language ?? (settings.default_language as "en" | "de" | "ro") ?? "en";
    const defs = (l.COMPLIANCE_LIBRARY[settings.country] ?? l.COMPLIANCE_LIBRARY.generic).map((d) => ({
      key: d.key,
      category: d.category,
      perEmployee: d.perEmployee,
      title: d.title[L],
      dueOffsetDays: d.dueOffsetDays,
    }));
    const created = await w.seedCompliance(a.companyId, settings.country, defs);
    return { created };
  });

export const saveHrComplianceItem = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        title: z.string().trim().min(1).max(200),
        category: z.enum(["legal", "safety", "data_protection", "payroll", "medical"]),
        country: text(8),
        employee_id: uuidString().nullable().optional(),
        due_date: dateish,
        notes: text(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    return { id: await (await ws()).saveComplianceItem(a.companyId, data) };
  });

export const setHrComplianceStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuidString(), status: z.enum(["open", "done", "not_applicable"]), notes: text(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    await (await ws()).setComplianceStatus(a.companyId, data.id, data.status, data.notes ?? null, a.name);
    return { ok: true };
  });

export const deleteHrComplianceItem = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ws()).deleteComplianceItem(a.companyId, data.id);
    return { ok: true };
  });

// ── HR Intelligence: grounded assistant over the company's own HR data ───

export const askHrAssistant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ question: z.string().trim().min(3).max(1000), language: lang.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const { answerHrQuestion } = await import("@/lib/hr/assistant.server");
    return answerHrQuestion(a.companyId, data.question, data.language ?? "en");
  });

export const getHrIntelligence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("view");
    const { employeeIntelligence } = await import("@/lib/hr/assistant.server");
    const w = await ws();
    const [signals, insights] = await Promise.all([w.workspaceSignals(a.companyId), employeeIntelligence(a.companyId)]);
    return { signals, insights, grants: a.grants };
  });
