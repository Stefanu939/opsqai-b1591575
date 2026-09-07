// OPSQAI HR — authenticated server functions (Self-Hosted product).
//
// Every handler resolves the caller's company from their profile and enforces
// the per-user HR rights the company's Admin / SuperAdmin manages. Data access
// lives in `hr/db.server.ts` (local PostgreSQL).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import { getProfileRepository } from "@/lib/providers/registry";
import { HR_GRANTS, type HrEmployee, type HrGrantKey, type HrOverview } from "@/lib/hr/types";

type Ctx = { supabase: unknown; userId: string; claims?: { email?: string } };

interface Actor {
  userId: string;
  companyId: string;
  name: string;
  grants: HrGrantKey[];
}

async function actor(context: Ctx): Promise<Actor> {
  const profile = await getProfileRepository(context.supabase).findByUserId(context.userId);
  const companyId = profile?.companyId ?? null;
  if (!companyId) throw new Error("No workspace is linked to this account.");

  const { getActorRoles } = await import("@/lib/authorization");
  const roles = await getActorRoles(context.supabase, context.userId);
  const unrestricted =
    roles.isPlatformOwner ||
    roles.isPlatformAdmin ||
    roles.roles.includes("superadmin") ||
    roles.roles.includes("workspace_owner") ||
    roles.roles.includes("admin");

  const rights = await import("@/lib/providers/registry").then(
    ({ getAreaRightsRepository, hasAreaRightsRepository }) =>
      hasAreaRightsRepository()
        ? getAreaRightsRepository(context.supabase).listForUser(companyId, context.userId)
        : Promise.resolve([]),
  );
  const hrRights = rights.filter((r) => r.areaKey === "hr" && r.granted);
  const mapped = hrRights.flatMap((r): HrGrantKey[] => {
    switch (r.action) {
      case "view":
        return ["view"];
      case "create":
        return ["create"];
      case "edit":
        return ["edit"];
      case "delete":
        return ["delete"];
      case "approve":
        return ["approve"];
      case "administer":
        return ["settings", "export", "sensitive"];
      default:
        return [];
    }
  });

  const grants: HrGrantKey[] = unrestricted
    ? [...HR_GRANTS]
    : mapped.length
      ? Array.from(new Set<HrGrantKey>(["view", ...mapped]))
      : ["view"];

  return {
    userId: context.userId,
    companyId,
    name:
      (profile as { fullName?: string; email?: string } | null)?.fullName ||
      context.claims?.email ||
      "User",
    grants,
  };
}

function need(a: Actor, grant: HrGrantKey): void {
  if (!a.grants.includes(grant)) {
    throw new Error(`Forbidden: this account has no HR "${grant}" right.`);
  }
}

const statusEnum = z.enum(["onboarding", "active", "leave", "offboarding", "terminated"]);
const dateish = z.string().trim().min(1).nullable().optional();

const employeeSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  date_of_birth: dateish,
  address: z.string().trim().max(300).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional().or(z.literal("").transform(() => null)),
  phone: z.string().trim().max(60).nullable().optional(),
  department_id: uuidString().nullable().optional(),
  position_id: uuidString().nullable().optional(),
  location_id: uuidString().nullable().optional(),
  start_date: dateish,
  end_date: dateish,
  status: statusEnum.optional(),
  contract_type: z.string().trim().max(80).nullable().optional(),
  employment_type: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

// ── Overview ─────────────────────────────────────────────────────────────

export const getHrOverview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<HrOverview> => {
    const a = await actor(context as Ctx);
    const db = await import("@/lib/hr/db.server");
    const [settings, counts, actionRequired, tasks, departments, positions, locations] =
      await Promise.all([
        db.getSettings(a.companyId),
        db.counts(a.companyId),
        db.actionRequired(a.companyId),
        db.listTasks(a.companyId, { openOnly: true }),
        db.listRefs(a.companyId, "departments"),
        db.listRefs(a.companyId, "positions"),
        db.listRefs(a.companyId, "locations"),
      ]);
    return {
      settings,
      grants: a.grants,
      counts,
      actionRequired,
      tasks: tasks.slice(0, 12),
      refs: { departments, positions, locations },
    };
  });

// ── Employees ────────────────────────────────────────────────────────────

export const listHrEmployees = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        departmentId: uuidString().optional(),
        positionId: uuidString().optional(),
        locationId: uuidString().optional(),
        status: statusEnum.optional(),
        contractType: z.string().trim().max(80).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "view");
    const db = await import("@/lib/hr/db.server");
    const [employees, settings, departments, positions, locations] = await Promise.all([
      db.listEmployees(a.companyId, data),
      db.getSettings(a.companyId),
      db.listRefs(a.companyId, "departments"),
      db.listRefs(a.companyId, "positions"),
      db.listRefs(a.companyId, "locations"),
    ]);
    return {
      employees,
      settings,
      grants: a.grants,
      refs: { departments, positions, locations },
    };
  });

export const getHrEmployee = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "view");
    const db = await import("@/lib/hr/db.server");
    const employee = await db.getEmployee(a.companyId, data.id);
    if (!employee) throw new Error("Employee not found.");
    const [events, tasks, settings] = await Promise.all([
      db.listEvents(a.companyId, data.id),
      db.listTasks(a.companyId, { employeeId: data.id }),
      db.getSettings(a.companyId),
    ]);
    return { employee, events, tasks, settings, grants: a.grants };
  });

export const saveHrEmployee = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuidString().optional(), values: employeeSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<HrEmployee> => {
    const a = await actor(context as Ctx);
    need(a, data.id ? "edit" : "create");
    const db = await import("@/lib/hr/db.server");
    const values = data.values;
    return data.id
      ? db.updateEmployee(a.companyId, data.id, values, { id: a.userId, name: a.name })
      : db.createEmployee(a.companyId, values, { id: a.userId, name: a.name });
  });

export const deleteHrEmployee = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "delete");
    const db = await import("@/lib/hr/db.server");
    await db.deleteEmployee(a.companyId, data.id, { id: a.userId, name: a.name });
    return { ok: true };
  });

// ── Reference data ───────────────────────────────────────────────────────

const refKind = z.enum(["departments", "positions", "locations"]);

export const saveHrRef = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: refKind,
        name: z.string().trim().min(1).max(120),
        departmentId: uuidString().nullable().optional(),
        country: z.string().trim().max(40).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "create");
    const db = await import("@/lib/hr/db.server");
    return db.createRef(a.companyId, data.kind, data.name, {
      departmentId: data.departmentId ?? null,
      country: data.country ?? null,
    });
  });

export const deleteHrRef = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ kind: refKind, id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "delete");
    const db = await import("@/lib/hr/db.server");
    await db.deleteRef(a.companyId, data.kind, data.id);
    return { ok: true };
  });

// ── Tasks (one engine for onboarding, offboarding, expiries, approvals) ──

export const listHrTasks = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ employeeId: uuidString().optional(), openOnly: z.boolean().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "view");
    const db = await import("@/lib/hr/db.server");
    const tasks = await db.listTasks(a.companyId, data);
    return { tasks, grants: a.grants };
  });

export const saveHrTask = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        employee_id: uuidString().nullable().optional(),
        title: z.string().trim().min(1).max(200),
        category: z.string().trim().max(60).optional(),
        team: z.string().trim().max(60).nullable().optional(),
        assigned_to: z.string().trim().max(120).nullable().optional(),
        due_date: dateish,
        status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, data.id ? "edit" : "create");
    const db = await import("@/lib/hr/db.server");
    await db.saveTask(a.companyId, data);
    if (data.employee_id && !data.id) {
      await db.addEvent(a.companyId, data.employee_id, "task", `Task created: ${data.title}`, a.name);
    }
    await db.audit(a.companyId, data.employee_id ?? null, { id: a.userId, name: a.name }, "task.save", {
      title: data.title,
    });
    return { ok: true };
  });

export const deleteHrTask = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "delete");
    const db = await import("@/lib/hr/db.server");
    await db.deleteTask(a.companyId, data.id);
    return { ok: true };
  });

// ── Settings ─────────────────────────────────────────────────────────────

export const saveHrSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        country: z.enum(["de", "ro", "generic"]).optional(),
        employee_prefix: z.string().trim().min(2).max(6).optional(),
        blind_screening: z.boolean().optional(),
        retention_months_after_exit: z.number().int().min(0).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "settings");
    const db = await import("@/lib/hr/db.server");
    return db.saveSettings(a.companyId, data);
  });

// ── Exports ──────────────────────────────────────────────────────────────

export const exportHrEmployeesCsv = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const a = await actor(context as Ctx);
    need(a, "export");
    const db = await import("@/lib/hr/db.server");
    const rows = await db.listEmployees(a.companyId, {});
    const head = [
      "Employee ID",
      "First name",
      "Last name",
      "Position",
      "Department",
      "Location",
      "Status",
      "Contract",
      "Start date",
      "End date",
      "Email",
      "Phone",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      head.map(esc).join(","),
      ...rows.map((r) =>
        [
          r.employee_no,
          r.first_name,
          r.last_name,
          r.position_name,
          r.department_name,
          r.location_name,
          r.status,
          r.contract_type,
          r.start_date,
          r.end_date,
          r.email,
          r.phone,
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\r\n");
    // Excel opens UTF-8 CSV correctly only with a BOM.
    const base64 = Buffer.from(`\uFEFF${csv}`, "utf8").toString("base64");
    return { filename: `opsqai-employees-${new Date().toISOString().slice(0, 10)}.csv`, base64 };
  });

export const exportHrEmployeePdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "view");
    const db = await import("@/lib/hr/db.server");
    const employee = await db.getEmployee(a.companyId, data.id);
    if (!employee) throw new Error("Employee not found.");
    const events = await db.listEvents(a.companyId, data.id);
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const bytes = await renderTablePdf({
      title: `${employee.employee_no} — ${employee.first_name} ${employee.last_name}`,
      subtitle: [employee.position_name, employee.department_name, employee.location_name]
        .filter(Boolean)
        .join(" · "),
      headers: ["Field", "Value"],
      rows: [
        ["Employee ID", employee.employee_no],
        ["Status", employee.status],
        ["Contract", employee.contract_type],
        ["Start date", employee.start_date],
        ["End date", employee.end_date],
        ["Email", employee.email],
        ["Phone", employee.phone],
        ["Address", employee.address],
        ...events
          .slice(0, 40)
          .map((e) => [new Date(e.occurred_at).toISOString().slice(0, 10), e.message]),
      ],
      generatedLabel: `Generated ${new Date().toLocaleString()}`,
    });
    return {
      filename: `${employee.employee_no}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });
