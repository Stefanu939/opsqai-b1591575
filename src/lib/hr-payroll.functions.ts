// OPSQAI HR — payroll and document signing server functions (Self-Hosted).
//
// Payroll is gated by a dedicated right ("payroll" to see, "payroll_edit" to
// record). Without it no salary value, payslip or export is returned at all.
// No tax or contribution is computed: additions and deductions are the values
// HR entered, and every generated document says so.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import type { HrCtx } from "@/lib/hr/actor.server";
import type { HrPayrollView } from "@/lib/hr/types";

const who = async (context: unknown) => {
  const { hrActor, hrNeed } = await import("@/lib/hr/actor.server");
  const a = await hrActor(context as HrCtx);
  return { a, need: (g: Parameters<typeof hrNeed>[1]) => hrNeed(a, g) };
};
const payrollDb = () => import("@/lib/hr/payroll.server");
const signDb = () => import("@/lib/hr/signing.server");

const monthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, "Use the YYYY-MM format.");
const money = z.number().finite().min(-1_000_000).max(10_000_000);

const thisMonth = () => new Date().toISOString().slice(0, 7);
const currencyFor = (country: string) => (country === "ro" ? "RON" : "EUR");
const round = (v: number) => Math.round(v * 100) / 100;

// ── Payroll ──────────────────────────────────────────────────────────────

export const getHrPayroll = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: uuidString(), period: monthSchema.optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<HrPayrollView> => {
    const { a, need } = await who(context);
    need("view");
    need("payroll");
    const db = await payrollDb();
    const core = await import("@/lib/hr/db.server");
    const period = data.period ?? thisMonth();
    const monthStart = `${period}-01`;
    const [history, entries, payslips, settings] = await Promise.all([
      db.listSalaries(a.companyId, data.employeeId),
      db.listEntries(a.companyId, data.employeeId, monthStart),
      db.listPayslips(a.companyId, data.employeeId),
      core.getSettings(a.companyId),
    ]);
    const current = db.salaryAt(history, monthStart);
    const gross = db.monthlyGross(current, settings.weekly_hours);
    const additions = round(entries.filter((e) => e.kind === "addition").reduce((s, e) => s + e.amount, 0));
    const deductions = round(entries.filter((e) => e.kind === "deduction").reduce((s, e) => s + e.amount, 0));
    return {
      currency: current?.currency ?? currencyFor(settings.country),
      current,
      history,
      period,
      entries,
      payslips,
      totals: { gross, additions, deductions, payable: round(gross + additions - deductions) },
      canEdit: a.grants.includes("payroll_edit"),
      canExport: a.grants.includes("export"),
    };
  });

export const saveHrSalary = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: uuidString(),
        valid_from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
        gross_amount: money,
        currency: z.string().trim().min(3).max(3),
        period: z.enum(["month", "hour", "year"]),
        hours_per_week: z.number().min(0).max(80).nullable().optional(),
        reason: z.string().trim().max(200).nullable().optional(),
        note: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll_edit");
    const db = await payrollDb();
    const core = await import("@/lib/hr/db.server");
    const id = await db.addSalary(a.companyId, data.employeeId, data, { id: a.userId, name: a.name });
    await core.addEvent(
      a.companyId,
      data.employeeId,
      "payroll",
      `Salary recorded from ${data.valid_from}${data.reason ? ` — ${data.reason}` : ""}`,
      a.name,
    );
    await core.audit(a.companyId, data.employeeId, { id: a.userId, name: a.name }, "payroll.salary.add", {
      valid_from: data.valid_from,
      period: data.period,
    });
    return { ok: true, id };
  });

export const deleteHrSalary = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll_edit");
    await (await payrollDb()).deleteSalary(a.companyId, data.id);
    return { ok: true };
  });

export const saveHrPayrollEntry = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: uuidString(),
        period: monthSchema,
        kind: z.enum(["addition", "deduction"]),
        label: z.string().trim().min(1).max(160),
        amount: money,
        note: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll_edit");
    const id = await (await payrollDb()).addEntry(
      a.companyId,
      data.employeeId,
      { ...data, period_month: `${data.period}-01` },
      { id: a.userId, name: a.name },
    );
    return { ok: true, id };
  });

export const deleteHrPayrollEntry = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll_edit");
    await (await payrollDb()).deleteEntry(a.companyId, data.id);
    return { ok: true };
  });

/** Generate (or regenerate) the payslip PDF for one employee and one month. */
export const generateHrPayslip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: uuidString(), period: monthSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll_edit");
    const db = await payrollDb();
    const core = await import("@/lib/hr/db.server");
    const monthStart = `${data.period}-01`;
    const [employee, settings, history, entries] = await Promise.all([
      core.getEmployee(a.companyId, data.employeeId),
      core.getSettings(a.companyId),
      db.listSalaries(a.companyId, data.employeeId),
      db.listEntries(a.companyId, data.employeeId, monthStart),
    ]);
    if (!employee) throw new Error("Employee not found.");
    const salary = db.salaryAt(history, monthStart);
    const gross = db.monthlyGross(salary, settings.weekly_hours);
    const additions = round(entries.filter((e) => e.kind === "addition").reduce((s, e) => s + e.amount, 0));
    const deductions = round(entries.filter((e) => e.kind === "deduction").reduce((s, e) => s + e.amount, 0));
    const payable = round(gross + additions - deductions);
    const currency = salary?.currency ?? currencyFor(settings.country);
    const amt = (v: number) => `${v.toFixed(2)} ${currency}`;

    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const rows: unknown[][] = [
      ["Employee", `${employee.employee_no} · ${employee.first_name} ${employee.last_name}`],
      ["Period", data.period],
      ["Position / department", [employee.position_name, employee.department_name].filter(Boolean).join(" · ") || "—"],
      ["Contract", employee.contract_type ?? "—"],
      [
        "Recorded salary",
        salary ? `${amt(salary.gross_amount)} / ${salary.period}${salary.hours_per_week ? ` · ${salary.hours_per_week} h/week` : ""}` : "—",
      ],
      ["Gross for the month", amt(gross)],
      ...entries.filter((e) => e.kind === "addition").map((e) => [`+ ${e.label}`, amt(e.amount)]),
      ...entries.filter((e) => e.kind === "deduction").map((e) => [`- ${e.label}`, amt(e.amount)]),
      ["Additions total", amt(additions)],
      ["Deductions total", amt(deductions)],
      ["Amount payable", amt(payable)],
      [
        "Note",
        "Values recorded manually by HR. This document is not a statutory tax or social contribution calculation.",
      ],
    ];
    const pdf = await renderTablePdf({
      title: `Payslip ${data.period} — ${employee.first_name} ${employee.last_name}`,
      headers: ["Item", "Value"],
      rows,
      generatedLabel: `Generated ${new Date().toISOString().slice(0, 10)} · ${a.name} · ${settings.company_legal_name ?? ""}`,
    });
    const filename = `payslip-${employee.employee_no}-${data.period}.pdf`;
    await db.savePayslip(
      a.companyId,
      data.employeeId,
      { period_month: monthStart, gross, additions, deductions, payable, currency, filename, data: pdf },
      { id: a.userId, name: a.name },
    );
    await core.audit(a.companyId, data.employeeId, { id: a.userId, name: a.name }, "payroll.payslip.generate", {
      period: data.period,
    });
    return { filename, mime: "application/pdf", base64: Buffer.from(pdf).toString("base64") };
  });

export const downloadHrPayslip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll");
    const file = await (await payrollDb()).getPayslipFile(a.companyId, data.id);
    if (!file?.data) throw new Error("Payslip file not found.");
    return {
      filename: file.filename,
      mime: file.mime || "application/pdf",
      base64: Buffer.from(file.data).toString("base64"),
    };
  });

export const deleteHrPayslip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll_edit");
    await (await payrollDb()).deletePayslip(a.companyId, data.id);
    return { ok: true };
  });

/** Accounting export: one row per employee for the chosen month. */
export const exportHrPayrollPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ period: monthSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("payroll");
    need("export");
    const db = await payrollDb();
    const core = await import("@/lib/hr/db.server");
    const monthStart = `${data.period}-01`;
    const [employees, settings] = await Promise.all([
      core.listEmployees(a.companyId, {}),
      core.getSettings(a.companyId),
    ]);
    const rows: unknown[][] = [];
    let totalGross = 0;
    let totalPayable = 0;
    for (const e of employees) {
      const [history, entries] = await Promise.all([
        db.listSalaries(a.companyId, e.id),
        db.listEntries(a.companyId, e.id, monthStart),
      ]);
      const salary = db.salaryAt(history, monthStart);
      if (!salary && entries.length === 0) continue;
      const gross = db.monthlyGross(salary, settings.weekly_hours);
      const additions = round(entries.filter((x) => x.kind === "addition").reduce((s, x) => s + x.amount, 0));
      const deductions = round(entries.filter((x) => x.kind === "deduction").reduce((s, x) => s + x.amount, 0));
      const payable = round(gross + additions - deductions);
      totalGross = round(totalGross + gross);
      totalPayable = round(totalPayable + payable);
      rows.push([
        e.employee_no,
        `${e.first_name} ${e.last_name}`,
        e.department_name ?? "—",
        gross.toFixed(2),
        additions.toFixed(2),
        deductions.toFixed(2),
        payable.toFixed(2),
        salary?.currency ?? currencyFor(settings.country),
      ]);
    }
    rows.push(["", "TOTAL", "", totalGross.toFixed(2), "", "", totalPayable.toFixed(2), ""]);
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const pdf = await renderTablePdf({
      title: `Payroll ${data.period} — accounting export`,
      headers: ["No", "Employee", "Department", "Gross", "Additions", "Deductions", "Payable", "Cur."],
      rows,
      generatedLabel: `Generated ${new Date().toISOString().slice(0, 10)} · ${a.name} · values recorded manually, no statutory tax calculation`,
    });
    return {
      filename: `payroll-${data.period}.pdf`,
      mime: "application/pdf",
      base64: Buffer.from(pdf).toString("base64"),
    };
  });

// ── Document signing ─────────────────────────────────────────────────────

export const requestHrSignature = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        due: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    const ext = await import("@/lib/hr/db-ext.server");
    const doc = await ext.getDocument(a.companyId, data.id);
    if (!doc) throw new Error("Document not found.");
    await (await signDb()).requestSignature(a.companyId, data.id, { due: data.due ?? null, by: a.name });
    if (doc.employee_id) {
      const core = await import("@/lib/hr/db.server");
      await core.addEvent(
        a.companyId,
        doc.employee_id,
        "document",
        `Signature requested: ${doc.draft_name ?? doc.title}${data.due ? ` (due ${data.due})` : ""}`,
        a.name,
      );
    }
    return { ok: true };
  });

export const cancelHrSignature = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    await (await signDb()).cancelSignature(a.companyId, data.id);
    return { ok: true };
  });

/** File an uploaded signed copy, or a signature drawn on screen. */
export const signHrDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString(),
        signerName: z.string().trim().min(1).max(160),
        // Uploaded signed file (any PDF / image, max 20 MB).
        upload: z
          .object({
            filename: z.string().trim().min(1).max(200),
            mime: z.string().trim().min(3).max(120),
            base64: z.string().min(1).max(28_000_000),
          })
          .optional(),
        // Signature drawn on screen (PNG data, without the data: prefix).
        drawnPngBase64: z.string().min(1).max(4_000_000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("edit");
    const ext = await import("@/lib/hr/db-ext.server");
    const sign = await signDb();
    const doc = await ext.getDocument(a.companyId, data.id);
    if (!doc) throw new Error("Document not found.");

    if (data.upload) {
      const bytes = Buffer.from(data.upload.base64, "base64");
      if (bytes.byteLength > 20 * 1024 * 1024) throw new Error("The signed file is larger than 20 MB.");
      await sign.applySignature(
        a.companyId,
        data.id,
        { filename: data.upload.filename, mime: data.upload.mime, data: bytes },
        { name: data.signerName, kind: "upload", actor: a.name },
      );
    } else if (data.drawnPngBase64) {
      if (!doc.body) throw new Error("This document has no text to sign. Upload the signed file instead.");
      const pdf = await sign.renderDrawnSignaturePdf({
        title: doc.draft_name ?? doc.title,
        body: doc.body,
        meta: [
          [doc.employee_no, doc.employee_name].filter(Boolean).join(" · ") || "",
          doc.approved_at ? `Approved ${doc.approved_at.slice(0, 10)} · ${doc.approved_by ?? ""}` : "",
        ].filter(Boolean),
        footer: "OPSQAI HR — signed document",
        signaturePngBase64: data.drawnPngBase64,
        signerName: data.signerName,
        signedLabel: "Signature",
      });
      await sign.applySignature(
        a.companyId,
        data.id,
        {
          filename: `${(doc.draft_name ?? doc.title).slice(0, 60).replace(/[^\w.-]+/g, "-")}-signed.pdf`,
          mime: "application/pdf",
          data: pdf,
        },
        { name: data.signerName, kind: "drawn", actor: a.name },
      );
    } else {
      throw new Error("Provide a signed file or a drawn signature.");
    }

    const core = await import("@/lib/hr/db.server");
    if (doc.employee_id) {
      await core.addEvent(
        a.companyId,
        doc.employee_id,
        "document",
        `Signed: ${doc.draft_name ?? doc.title} — ${data.signerName}`,
        a.name,
      );
    }
    await core.audit(a.companyId, doc.employee_id ?? null, { id: a.userId, name: a.name }, "document.sign", {
      id: data.id,
      kind: data.upload ? "upload" : "drawn",
    });
    return { ok: true };
  });

export const listHrDocumentVersions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    return { versions: await (await signDb()).listVersions(a.companyId, data.id) };
  });

export const downloadHrDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const { a, need } = await who(context);
    need("view");
    const file = await (await signDb()).getVersionFile(a.companyId, data.id);
    if (!file?.data) throw new Error("Version file not found.");
    return {
      filename: file.filename ?? "document.pdf",
      mime: file.mime ?? "application/pdf",
      base64: Buffer.from(file.data).toString("base64"),
    };
  });

/** Signature requests still open, with due dates and overdue flags. */
export const listHrPendingSignatures = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("view");
    return { pending: await (await signDb()).pendingSignatures(a.companyId) };
  });

/** Create an HR task per open signature request that is due or overdue. */
export const remindHrSignatures = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { a, need } = await who(context);
    need("edit");
    const sign = await signDb();
    const core = await import("@/lib/hr/db.server");
    const pending = await sign.pendingSignatures(a.companyId);
    const due = pending.filter((p) => p.days_left !== null && p.days_left <= 7);
    for (const p of due) {
      await core.saveTask(a.companyId, {
        employee_id: p.employee_id,
        title: `Signature ${p.overdue ? "overdue" : "due"}: ${p.title}`,
        category: "document",
        due_date: p.signature_due,
        priority: p.overdue ? "high" : "normal",
        document_id: p.id,
        completed_by: null,
      });
    }
    await sign.markReminded(
      a.companyId,
      due.map((p) => p.id),
    );
    return { reminded: due.length };
  });
