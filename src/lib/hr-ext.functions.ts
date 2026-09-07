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

/** Generate a document from a template: placeholders are filled from the record. */
export const generateHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        templateId: uuidString(),
        employeeId: uuidString(),
        title: z.string().trim().max(200).optional(),
        validUntil: dateish,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const db = await ext();
    const core = await import("@/lib/hr/db.server");
    const [templates, employee, settings] = await Promise.all([
      db.listTemplates(a.companyId),
      core.getEmployee(a.companyId, data.employeeId),
      core.getSettings(a.companyId),
    ]);
    const template = templates.find((t) => t.id === data.templateId);
    if (!template) throw new Error("Template not found.");
    if (!employee) throw new Error("Employee not found.");

    const values: Record<string, string> = {
      employee_no: employee.employee_no,
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: `${employee.first_name} ${employee.last_name}`,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      department: employee.department_name ?? "",
      position: employee.position_name ?? "",
      location: employee.location_name ?? "",
      start_date: employee.start_date ?? "",
      end_date: employee.end_date ?? "",
      contract_type: employee.contract_type ?? "",
      country: settings.country,
      today: new Date().toISOString().slice(0, 10),
    };
    const body = template.body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) =>
      values[key.toLowerCase()] ?? "",
    );
    const id = await db.createDocument(
      a.companyId,
      {
        employee_id: data.employeeId,
        kind: template.kind,
        title: data.title?.trim() || `${template.name} — ${values["full_name"]}`,
        body,
        valid_until: data.validUntil ?? null,
      },
      { id: a.userId },
    );
    await core.addEvent(
      a.companyId,
      data.employeeId,
      "document",
      `Document created: ${template.name}`,
      a.name,
    );
    return { id };
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
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("create");
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error("The file is larger than 12 MB.");
    const db = await ext();
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
      },
      { id: a.userId },
    );
    if (data.employeeId) {
      const core = await import("@/lib/hr/db.server");
      await core.addEvent(
        a.companyId,
        data.employeeId,
        "document",
        `Document uploaded: ${data.title}`,
        a.name,
      );
    }
    return { id };
  });

export const approveHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("approve");
    await (await ext()).approveDocument(a.companyId, data.id, a.name);
    return { ok: true };
  });

export const downloadHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const doc = await (await ext()).getDocumentFile(a.companyId, data.id);
    if (!doc) throw new Error("Document not found.");
    if (doc.data) {
      return {
        filename: doc.filename ?? "document",
        mime: doc.mime ?? "application/octet-stream",
        base64: Buffer.from(doc.data).toString("base64"),
      };
    }
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const pdf = await renderTablePdf({
      title: doc.title,
      headers: [""],
      rows: (doc.body ?? "").split(/\n/).map((line) => [line]),
      generatedLabel: `Generated ${new Date().toISOString().slice(0, 10)}`,
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
