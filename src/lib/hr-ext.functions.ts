// OPSQAI HR — server functions for documents, checklists, assets, incidents,
// candidate screening, analytics and alerts. Company scope + HR rights enforced.

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
const ext = () => import("@/lib/hr/db-ext.server");

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const dateish = z.string().trim().min(1).nullable().optional();

// ── Documents & templates ────────────────────────────────────────────────

export const getHrDocuments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: uuidString().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const [documents, templates, employees] = await Promise.all([
      db.listDocuments(a.companyId, data.employeeId),
      db.listTemplates(a.companyId),
      core.listEmployees(a.companyId, {}),
    ]);
    return {
      documents,
      templates,
      employees: employees.map((e) => ({
        id: e.id,
        label: `${e.employee_no} · ${e.first_name} ${e.last_name}`,
      })),
      grants: a.grants,
    };
  });

export const saveHrTemplate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        name: z.string().trim().min(1).max(160),
        kind: z.enum(["contract", "letter", "policy", "other"]),
        country: text(8),
        contract_type: text(80),
        body: z.string().max(40_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    await (await ext()).saveTemplate(a.companyId, data);
    return { ok: true };
  });

export const deleteHrTemplate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ext()).deleteTemplate(a.companyId, data.id);
    return { ok: true };
  });

/** Placeholder values for one employee: employee record + company settings. Nothing invented. */
async function placeholderValues(companyId: string, employeeId: string) {
  const core = await import("@/lib/hr/db.server");
  const [employee, settings] = await Promise.all([
    core.getEmployee(companyId, employeeId),
    core.getSettings(companyId),
  ]);
  if (!employee) throw new Error("Employee not found.");
  const values: Record<string, string> = {
    company_name: settings.company_legal_name ?? "",
    company_address: settings.company_address ?? "",
    signatory: settings.company_signatory ?? "",
    employee_no: employee.employee_no,
    first_name: employee.first_name,
    last_name: employee.last_name,
    full_name: `${employee.first_name} ${employee.last_name}`,
    date_of_birth: employee.date_of_birth ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    address: employee.address ?? "",
    department: employee.department_name ?? "",
    position: employee.position_name ?? "",
    location: employee.location_name ?? "",
    start_date: employee.start_date ?? "",
    end_date: employee.end_date ?? "",
    contract_type: employee.contract_type ?? "",
    employment_type: employee.employment_type ?? "",
    weekly_hours: String(settings.weekly_hours ?? ""),
    vacation_days: String(settings.vacation_days ?? ""),
    probation_months: String(settings.probation_months ?? ""),
    notice_weeks: String(settings.notice_weeks ?? ""),
    country: settings.country,
    today: new Date().toISOString().slice(0, 10),
  };
  return { employee, settings, values };
}

/** Built-in document types for the company country + the company's own templates. */
export const getHrDocumentLibrary = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("view");
    const core = await import("@/lib/hr/db.server");
    const { documentLibrary } = await import("@/lib/hr/library");
    const settings = await core.getSettings(a.companyId);
    return {
      country: settings.country,
      builtIn: documentLibrary(settings.country).map((d) => ({
        key: d.key,
        kind: d.kind,
        label: d.label,
        validMonths: d.validMonths,
      })),
    };
  });

/**
 * Generate a document automatically: pick the employee, pick the document type,
 * the country decides the template. The result is an editable draft.
 */
export const generateHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: uuidString(),
        // Either a built-in library key or a company template id.
        documentKey: z.string().trim().max(60).optional(),
        templateId: uuidString().optional(),
        draftName: z.string().trim().max(120).optional(),
        taskId: uuidString().optional(),
      })
      .refine((v) => v.documentKey || v.templateId, "Choose a document type.")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const { findDocDefinition, fillTemplate } = await import("@/lib/hr/library");
    const { employee, settings, values } = await placeholderValues(a.companyId, data.employeeId);

    let source: { name: string; kind: string; body: string; validMonths: number | null; key: string | null } | null = null;
    if (data.templateId) {
      const t = (await db.listTemplates(a.companyId)).find((x) => x.id === data.templateId);
      if (!t) throw new Error("Template not found.");
      source = { name: t.name, kind: t.kind, body: t.body, validMonths: null, key: null };
    } else if (data.documentKey) {
      const def = findDocDefinition(settings.country, data.documentKey);
      if (!def) throw new Error("Document type not available for this country.");
      const lang = (settings.default_language as "en" | "de" | "ro") ?? "en";
      source = { name: def.label[lang] ?? def.label.en, kind: def.kind, body: def.body, validMonths: def.validMonths, key: def.key };
    }
    if (!source) throw new Error("Choose a document type.");

    const body = fillTemplate(source.body, values);
    const validUntil = source.validMonths
      ? new Date(new Date().setMonth(new Date().getMonth() + source.validMonths)).toISOString().slice(0, 10)
      : null;
    const id = await db.createDocument(
      a.companyId,
      {
        employee_id: data.employeeId,
        kind: source.kind,
        title: `${source.name} — ${values["full_name"]}`,
        body,
        valid_until: validUntil,
        status: "draft",
        draft_name: data.draftName?.trim() || `${source.name} · ${values["today"]}`,
        template_key: source.key,
        template_id: data.templateId ?? null,
        country: settings.country,
        language: settings.default_language,
      },
      { id: a.userId },
    );
    if (data.taskId) {
      const task = await core.getTask(a.companyId, data.taskId);
      if (task) {
        await core.saveTask(a.companyId, {
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          team: task.team,
          assigned_to: task.assigned_to,
          due_date: task.due_date,
          priority: task.priority,
          steps: task.steps,
          document_id: id,
          status: task.status === "pending" ? "in_progress" : task.status,
        });
      }
    }
    await core.addEvent(a.companyId, data.employeeId, "document", `Document generated: ${source.name}`, a.name);
    await core.audit(a.companyId, data.employeeId, { id: a.userId, name: a.name }, "document.generate", {
      key: source.key,
      title: source.name,
      employee_no: employee.employee_no,
    });
    return { id, missing: (body.match(/\[___\]/g) ?? []).length };
  });

/** Edit an unapproved draft in the app (body, title, draft name, validity). */
export const updateHrDocumentDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        title: z.string().trim().min(1).max(200).optional(),
        body: z.string().max(200_000).optional(),
        draftName: z.string().trim().max(120).nullable().optional(),
        validUntil: dateish,
        status: z.enum(["draft", "review"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    await (await ext()).updateDraft(a.companyId, data.id, {
      title: data.title,
      body: data.body,
      draft_name: data.draftName,
      valid_until: data.validUntil,
      status: data.status,
    });
    return { ok: true };
  });

export const getHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const doc = await (await ext()).getDocument(a.companyId, data.id);
    if (!doc) throw new Error("Document not found.");
    return doc;
  });

export const uploadHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: uuidString().nullable().optional(),
        kind: z.string().trim().max(40).default("other"),
        title: z.string().trim().min(1).max(200),
        filename: z.string().trim().max(200),
        mime: z.string().trim().max(120),
        base64: z.string().min(1),
        validUntil: dateish,
        /** When set, the file is attached as the signed copy of that generated document. */
        attachToDocumentId: uuidString().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error("The file is larger than 12 MB.");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    if (data.attachToDocumentId) {
      const doc = await db.getDocument(a.companyId, data.attachToDocumentId);
      if (!doc) throw new Error("Document not found.");
      await db.attachSigned(a.companyId, doc.id, { filename: data.filename, mime: data.mime, data: bytes });
      if (doc.employee_id) {
        await core.addEvent(a.companyId, doc.employee_id, "document", `Signed copy filed: ${doc.title}`, a.name);
      }
      await core.audit(a.companyId, doc.employee_id, { id: a.userId, name: a.name }, "document.signed", { title: doc.title });
      return { id: doc.id };
    }
    const id = await db.createDocument(
      a.companyId,
      {
        employee_id: data.employeeId ?? null,
        kind: data.kind,
        title: data.title,
        filename: data.filename,
        mime: data.mime,
        data: bytes,
        valid_until: data.validUntil ?? null,
        status: "file",
      },
      { id: a.userId },
    );
    if (data.employeeId) {
      await core.addEvent(a.companyId, data.employeeId, "document", `Document uploaded: ${data.title}`, a.name);
    }
    return { id };
  });

export const approveHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("approve");
    const db = await ext();
    const doc = await db.getDocument(a.companyId, data.id);
    if (!doc) throw new Error("Document not found.");
    if (doc.body && /\[___\]/.test(doc.body)) {
      throw new Error("The draft still contains empty [___] fields. Fill them in before approving.");
    }
    await db.approveDocument(a.companyId, data.id, a.name);
    const core = await import("@/lib/hr/db.server");
    if (doc.employee_id) {
      await core.addEvent(a.companyId, doc.employee_id, "document", `Document approved: ${doc.title}`, a.name);
    }
    await core.audit(a.companyId, doc.employee_id, { id: a.userId, name: a.name }, "document.approve", { title: doc.title });
    return { ok: true };
  });

export const downloadHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuidString(), signed: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const doc = await (await ext()).getDocumentFile(a.companyId, data.id, data.signed ?? false);
    if (!doc) throw new Error("Document not found.");
    if (doc.data) {
      return {
        filename: doc.filename ?? "document",
        mime: doc.mime ?? "application/octet-stream",
        base64: Buffer.from(doc.data).toString("base64"),
      };
    }
    if (data.signed) throw new Error("No signed copy has been uploaded yet.");
    const { renderDocumentPdf } = await import("@/lib/hr/document-pdf.server");
    const approved = doc.status === "approved";
    const pdf = await renderDocumentPdf({
      title: doc.title,
      body: doc.body ?? "",
      meta: [
        [doc.employee_no, doc.employee_name].filter(Boolean).join(" · "),
        approved
          ? `Approved ${String(doc.approved_at ?? "").slice(0, 10)} · ${doc.approved_by ?? ""}`
          : "DRAFT — not yet approved",
      ].filter(Boolean),
      footer: `OPSQAI HR · ${doc.country ?? ""} · generated ${new Date().toISOString().slice(0, 10)} by ${a.name}`,
      watermark: approved ? null : "DRAFT",
    });
    return {
      filename: `${doc.title.replace(/[^\w.-]+/g, "_")}.pdf`,
      mime: "application/pdf",
      base64: Buffer.from(pdf).toString("base64"),
    };
  });

export const deleteHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ext()).deleteDocument(a.companyId, data.id);
    return { ok: true };
  });

// ── Onboarding / offboarding checklists ──────────────────────────────────

export const getHrChecklists = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const [checklists, positions, employees, tasks] = await Promise.all([
      db.listChecklists(a.companyId),
      core.listRefs(a.companyId, "positions"),
      core.listEmployees(a.companyId, {}),
      core.listTasks(a.companyId, { openOnly: true }),
    ]);
    return {
      checklists,
      positions,
      grants: a.grants,
      tasks,
      employees: employees.map((e) => ({
        id: e.id,
        label: `${e.employee_no} · ${e.first_name} ${e.last_name}`,
        status: e.status,
      })),
    };
  });

export const saveHrChecklist = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        kind: z.enum(["onboarding", "offboarding"]),
        name: z.string().trim().min(1).max(160),
        position_id: uuidString().nullable().optional(),
        items: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(200),
              team: text(80),
              offsetDays: z.number().int().min(-365).max(365).nullable().optional(),
            }),
          )
          .max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    await (await ext()).saveChecklist(a.companyId, data);
    return { ok: true };
  });

export const deleteHrChecklist = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ext()).deleteChecklist(a.companyId, data.id);
    return { ok: true };
  });

/** Expand a checklist into real, dated HR tasks for one employee. */
export const runHrChecklist = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        checklistId: uuidString(),
        employeeId: uuidString(),
        anchorDate: z.string().trim().min(1).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const checklist = await db.getChecklist(a.companyId, data.checklistId);
    if (!checklist) throw new Error("Checklist not found.");
    const employee = await core.getEmployee(a.companyId, data.employeeId);
    if (!employee) throw new Error("Employee not found.");

    const anchor = new Date(
      data.anchorDate ??
        (checklist.kind === "onboarding" ? employee.start_date : employee.end_date) ??
        new Date().toISOString().slice(0, 10),
    );
    const items = Array.isArray(checklist.items) ? checklist.items : [];
    for (const item of items) {
      const due = new Date(anchor);
      due.setDate(due.getDate() + (item.offsetDays ?? 0));
      await core.saveTask(a.companyId, {
        employee_id: data.employeeId,
        title: item.title,
        category: checklist.kind,
        team: item.team ?? null,
        due_date: due.toISOString().slice(0, 10),
        status: "pending",
      });
    }
    await core.addEvent(
      a.companyId,
      data.employeeId,
      checklist.kind,
      `${checklist.kind === "onboarding" ? "Onboarding" : "Offboarding"} started: ${checklist.name} (${items.length} tasks)`,
      a.name,
    );
    return { created: items.length };
  });

// ── Assets ───────────────────────────────────────────────────────────────

export const getHrAssets = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const [assets, employees] = await Promise.all([
      db.listAssets(a.companyId),
      core.listEmployees(a.companyId, {}),
    ]);
    return {
      assets,
      grants: a.grants,
      employees: employees.map((e) => ({
        id: e.id,
        label: `${e.employee_no} · ${e.first_name} ${e.last_name}`,
      })),
    };
  });

export const saveHrAsset = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        name: z.string().trim().min(1).max(160),
        category: text(80),
        serial: text(120),
        status: z.enum(["available", "assigned", "retired"]).optional(),
        notes: text(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    await (await ext()).saveAsset(a.companyId, data);
    return { ok: true };
  });

export const deleteHrAsset = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ext()).deleteAsset(a.companyId, data.id);
    return { ok: true };
  });

export const assignHrAsset = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ assetId: uuidString(), employeeId: uuidString().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    if (data.employeeId) {
      await db.returnAsset(a.companyId, data.assetId);
      await db.assignAsset(a.companyId, data.assetId, data.employeeId);
      await core.addEvent(a.companyId, data.employeeId, "asset", "Equipment assigned", a.name);
    } else {
      await db.returnAsset(a.companyId, data.assetId);
    }
    return { ok: true };
  });

// ── Incidents ────────────────────────────────────────────────────────────

export const getHrIncidents = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: uuidString().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const [incidents, employees] = await Promise.all([
      db.listIncidents(a.companyId, data.employeeId),
      core.listEmployees(a.companyId, {}),
    ]);
    return {
      incidents,
      grants: a.grants,
      employees: employees.map((e) => ({
        id: e.id,
        label: `${e.employee_no} · ${e.first_name} ${e.last_name}`,
      })),
    };
  });

export const saveHrIncident = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        employee_id: uuidString().nullable().optional(),
        kind: z.enum(["incident", "warning", "accident"]),
        severity: z.enum(["low", "medium", "high"]),
        title: z.string().trim().min(1).max(200),
        description: text(4000),
        action_taken: text(4000),
        occurred_on: dateish,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    const db = await ext();
    await db.saveIncident(a.companyId, data, { id: a.userId });
    if (data.employee_id && !data.id) {
      const core = await import("@/lib/hr/db.server");
      await core.addEvent(
        a.companyId,
        data.employee_id,
        "incident",
        `${data.kind} recorded: ${data.title}`,
        a.name,
      );
    }
    return { ok: true };
  });

export const deleteHrIncident = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ext()).deleteIncident(a.companyId, data.id);
    return { ok: true };
  });

// ── Candidate screening ──────────────────────────────────────────────────

export const getHrScreening = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ jobProfileId: uuidString().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const [profiles, candidates, departments] = await Promise.all([
      db.listJobProfiles(a.companyId),
      db.listCandidates(a.companyId, data.jobProfileId),
      core.listRefs(a.companyId, "departments"),
    ]);
    return { profiles, candidates, departments, grants: a.grants };
  });

export const saveHrJobProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        title: z.string().trim().min(1).max(160),
        department_id: uuidString().nullable().optional(),
        description: text(4000),
        active: z.boolean().optional(),
        criteria: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(160),
              weight: z.number().min(0.5).max(10),
              required: z.boolean(),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need(data.id ? "edit" : "create");
    await (await ext()).saveJobProfile(a.companyId, data);
    return { ok: true };
  });

export const deleteHrJobProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ext()).deleteJobProfile(a.companyId, data.id);
    return { ok: true };
  });

export const uploadHrCandidateCv = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        jobProfileId: uuidString(),
        filename: z.string().trim().min(1).max(200),
        mime: z.string().trim().max(120),
        base64: z.string().min(1),
        first_name: text(80),
        last_name: text(80),
        email: text(200),
        phone: text(60),
        source: text(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error("The file is larger than 12 MB.");
    const { extractText } = await import("@/lib/doc-processing.server");
    const cvText = (
      await extractText(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, data.filename, data.mime)
    ).trim();
    if (cvText.length < 120) {
      throw new Error("No readable text was found in this CV. Upload a text-based PDF or DOCX.");
    }
    const id = await (await ext()).createCandidate(a.companyId, {
      job_profile_id: data.jobProfileId,
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      source: data.source ?? null,
      cv_filename: data.filename,
      cv_text: cvText.slice(0, 200_000),
    });
    return { id };
  });

export const analyseHrCandidate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        blind: z.boolean().optional(),
        language: z.enum(["en", "de", "ro"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    const db = await ext();
    const cv = await db.getCandidateCv(a.companyId, data.id);
    if (!cv?.cv_text) throw new Error("This candidate has no CV text.");
    if (!cv.job_profile_id) throw new Error("Assign a job profile before screening.");
    const profile = await db.getJobProfile(a.companyId, cv.job_profile_id);
    if (!profile) throw new Error("Job profile not found.");
    const { analyseCv } = await import("@/lib/hr/screening.server");
    const analysis = await analyseCv(cv.cv_text, profile.criteria ?? [], {
      blind: data.blind,
      language: data.language ?? "en",
    });
    await db.saveCandidateAnalysis(a.companyId, data.id, analysis);
    return analysis;
  });

export const setHrCandidateStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        status: z.enum(["new", "screened", "shortlisted", "rejected"]),
        note: text(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    await (await ext()).setCandidateStatus(a.companyId, data.id, data.status, data.note ?? null);
    return { ok: true };
  });

/** HR corrects extracted data or adds interview notes; the correction is kept, the AI never overwrites it. */
export const updateHrCandidate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        first_name: text(80),
        last_name: text(80),
        email: text(200),
        phone: text(60),
        extracted: z.record(z.string(), z.string().max(400)).optional(),
        interview_notes: text(6000),
        job_profile_id: uuidString().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    const db = await ext();
    await db.updateCandidateFields(a.companyId, data.id, data);
    if (data.job_profile_id !== undefined) {
      await db.setCandidateProfile(a.companyId, data.id, data.job_profile_id);
    }
    return { ok: true };
  });

/** Ask a question about one CV. Grounded: quotes the CV or says the CV does not state it. */
export const askHrCandidate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        question: z.string().trim().min(3).max(600),
        blind: z.boolean().optional(),
        language: z.enum(["en", "de", "ro"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const cv = await db.getCandidateCv(a.companyId, data.id);
    if (!cv?.cv_text) throw new Error("This candidate has no CV text.");
    const { askCv } = await import("@/lib/hr/screening.server");
    const r = await askCv(cv.cv_text, data.question, { blind: data.blind, language: data.language ?? "en" });
    const entry = { question: data.question, answer: r.answer, quote: r.quote, asked_at: new Date().toISOString() };
    await db.appendCandidateQa(a.companyId, data.id, entry);
    return { ...entry, grounded: r.grounded };
  });

/** Side-by-side comparison of candidates on the same job profile (facts only, no ranking advice). */
export const compareHrCandidates = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ ids: z.array(uuidString()).min(2).max(6) }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const rows = await Promise.all(data.ids.map((id) => db.getCandidate(a.companyId, id)));
    const candidates = rows.filter((c): c is NonNullable<typeof c> => Boolean(c));
    const profileIds = new Set(candidates.map((c) => c.job_profile_id));
    if (profileIds.size !== 1) throw new Error("Compare candidates from the same job profile.");
    const profile = candidates[0]?.job_profile_id ? await db.getJobProfile(a.companyId, candidates[0].job_profile_id) : null;
    return {
      criteria: profile?.criteria ?? [],
      candidates: candidates.map((c) => ({
        id: c.id,
        reference: c.reference,
        name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.reference || "—",
        score: c.score,
        status: c.status,
        cv_language: c.cv_language,
        extracted: c.extracted,
        evidence: c.evidence,
        strengths: c.strengths,
        risks: c.risks,
      })),
    };
  });

export const exportHrCandidatePdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("export");
    const c = await (await ext()).getCandidate(a.companyId, data.id);
    if (!c) throw new Error("Candidate not found.");
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.reference || c.id;
    const rows: unknown[][] = [
      ["Job profile", c.job_title ?? "—", ""],
      ["Score", c.score == null ? "—" : `${c.score}%`, "computed from weighted criteria"],
      ["Status", c.status, c.decision_note ?? ""],
      ["CV language", c.cv_language ?? "—", ""],
      ...Object.entries(c.extracted).map(([k, v]) => [k.replace(/_/g, " "), v, ""]),
      ...c.evidence.map((e) => [e.criterion, e.verdict, e.quote]),
      ...c.strengths.map((s) => ["Strength", s, ""]),
      ...c.risks.map((r) => ["Risk / gap", r, ""]),
      ...c.qa.map((q) => [`Q: ${q.question}`, q.answer, q.quote]),
    ];
    const pdf = await renderTablePdf({
      title: `Candidate — ${name}`,
      subtitle: "Evidence-based screening. The decision is human.",
      headers: ["Item", "Value", "Evidence (CV quote)"],
      rows,
      generatedLabel: `Generated ${new Date().toISOString().slice(0, 10)} · ${a.name}`,
    });
    return { filename: `candidate-${(c.reference ?? c.id).replace(/[^\w-]+/g, "_")}.pdf`, mime: "application/pdf", base64: Buffer.from(pdf).toString("base64") };
  });

export const deleteHrCandidate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("delete");
    await (await ext()).deleteCandidate(a.companyId, data.id);
    return { ok: true };
  });

/** Human decision: turn a candidate into an employee with a new EMP number. */
export const hireHrCandidate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        start_date: z.string().trim().min(1),
        department_id: uuidString().nullable().optional(),
        position_id: uuidString().nullable().optional(),
        location_id: uuidString().nullable().optional(),
        contract_type: text(80),
        first_name: z.string().trim().min(1).max(80),
        last_name: z.string().trim().min(1).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const candidate = await db.getCandidate(a.companyId, data.id);
    if (!candidate) throw new Error("Candidate not found.");
    if (candidate.hired_employee_id) throw new Error("This candidate is already hired.");
    const employee = await core.createEmployee(
      a.companyId,
      {
        first_name: data.first_name,
        last_name: data.last_name,
        email: candidate.email,
        phone: candidate.phone,
        department_id: data.department_id ?? null,
        position_id: data.position_id ?? null,
        location_id: data.location_id ?? null,
        start_date: data.start_date,
        status: "onboarding",
        contract_type: data.contract_type ?? null,
        notes: `Hired from candidate ${candidate.reference ?? candidate.id}`,
      },
      { id: a.userId, name: a.name },
    );
    await db.linkCandidateToEmployee(a.companyId, data.id, employee.id);
    return { employeeId: employee.id, employeeNo: employee.employee_no };
  });

// ── Analytics & alerts ───────────────────────────────────────────────────

export const getHrAnalytics = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("view");
    const db = await ext();
    const [analytics, alerts] = await Promise.all([db.analytics(a.companyId), db.alerts(a.companyId)]);
    return { analytics, alerts, grants: a.grants };
  });

export const exportHrAnalyticsPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("export");
    const db = await ext();
    const [an, al] = await Promise.all([db.analytics(a.companyId), db.alerts(a.companyId)]);
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const rows: unknown[][] = [
      ["Average tenure (months)", String(an.averageTenureMonths)],
      ["Turnover 12m (%)", String(an.turnover12m)],
      ["Incidents 12m", String(an.incidents12m)],
      ["Equipment assigned", String(an.assetsAssigned)],
      ["Equipment available", String(an.assetsAvailable)],
      ...an.headcountByDepartment.map((d) => [`Headcount - ${d.label}`, String(d.value)]),
      ...al.slice(0, 30).map((x) => [`${x.level.toUpperCase()} - ${x.title}`, x.detail]),
    ];
    const pdf = await renderTablePdf({
      title: "HR report",
      subtitle: new Date().toISOString().slice(0, 10),
      headers: ["Indicator", "Value"],
      rows,
      generatedLabel: `Generated ${new Date().toISOString().slice(0, 10)}`,
    });
    return {
      filename: `hr-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      mime: "application/pdf",
      base64: Buffer.from(pdf).toString("base64"),
    };
  });
