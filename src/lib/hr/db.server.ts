// OPSQAI HR — Self-Hosted PostgreSQL data access (server only).
//
// HR is a Self-Hosted product workspace: it talks to the installation's local
// PostgreSQL instance through DATABASE_URL. On Cloud there is no DATABASE_URL,
// so every entry point fails loudly instead of touching Management Center data.

import { Pool, type QueryResultRow } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";
import type {
  HrPipelineRow,
  EmployeeStatus,
  HrEmployee,
  HrEmployeeEvent,
  HrEmployeeFilters,
  HrRef,
  HrSettings,
  HrTask,
} from "./types";

let pool: Pool | null = null;

function browserSafe<T>(value: T): T {
  if (value instanceof Date) return value.toISOString() as T;
  if (value instanceof Uint8Array) return value as T;
  if (Array.isArray(value)) return value.map(browserSafe) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, browserSafe(item)]),
    ) as T;
  }
  return value;
}

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "OPSQAI HR is available on Self-Hosted installations only (no local database configured).",
    );
  }
  pool = new Pool({ connectionString, types: pgDateTypes, max: 5, idleTimeoutMillis: 30_000 });
  return pool;
}

async function q<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query<T>(sql, params);
  return res.rows.map(browserSafe);
}

async function one<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

/** Shared query helpers for the HR extension modules (same pool, same scope). */
export const hrQuery = q;
export const hrQueryOne = one;

// ── Settings ──────────────────────────────────────────────────────────────

const SETTINGS_COLS = `company_id, country, employee_prefix, blind_screening, retention_months_after_exit,
  default_language, probation_months, notice_weeks, vacation_days, weekly_hours::float8 AS weekly_hours,
  contract_alert_days, document_alert_days, auto_onboarding,
  company_legal_name, company_address, company_signatory`;

const SETTINGS_DEFAULTS: Omit<HrSettings, "company_id"> = {
  country: "generic",
  employee_prefix: "EMP",
  blind_screening: true,
  retention_months_after_exit: 9,
  default_language: "en",
  probation_months: 6,
  notice_weeks: 4,
  vacation_days: 20,
  weekly_hours: 40,
  contract_alert_days: 30,
  document_alert_days: 60,
  auto_onboarding: true,
  company_legal_name: null,
  company_address: null,
  company_signatory: null,
};

export async function getSettings(companyId: string): Promise<HrSettings> {
  const row = await one<HrSettings>(
    `SELECT ${SETTINGS_COLS} FROM public.hr_settings WHERE company_id = $1`,
    [companyId],
  );
  if (row) return row;
  const created = await one<HrSettings>(
    `INSERT INTO public.hr_settings (company_id) VALUES ($1)
     ON CONFLICT (company_id) DO UPDATE SET updated_at = now()
     RETURNING ${SETTINGS_COLS}`,
    [companyId],
  );
  return created ?? { company_id: companyId, ...SETTINGS_DEFAULTS };
}

export async function saveSettings(
  companyId: string,
  values: Partial<Omit<HrSettings, "company_id">>,
): Promise<HrSettings> {
  const current = await getSettings(companyId);
  const next = { ...current, ...stripUndefined(values) };
  const row = await one<HrSettings>(
    `UPDATE public.hr_settings
        SET country = $2, employee_prefix = $3, blind_screening = $4,
            retention_months_after_exit = $5, default_language = $6, probation_months = $7,
            notice_weeks = $8, vacation_days = $9, weekly_hours = $10, contract_alert_days = $11,
            document_alert_days = $12, auto_onboarding = $13, company_legal_name = $14,
            company_address = $15, company_signatory = $16, updated_at = now()
      WHERE company_id = $1
      RETURNING ${SETTINGS_COLS}`,
    [
      companyId,
      next.country,
      next.employee_prefix,
      next.blind_screening,
      next.retention_months_after_exit,
      next.default_language,
      next.probation_months,
      next.notice_weeks,
      next.vacation_days,
      next.weekly_hours,
      next.contract_alert_days,
      next.document_alert_days,
      next.auto_onboarding,
      next.company_legal_name,
      next.company_address,
      next.company_signatory,
    ],
  );
  return row ?? next;
}

function stripUndefined<T extends object>(v: T): Partial<T> {
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)) as Partial<T>;
}

// ── Reference data ────────────────────────────────────────────────────────

const REF_TABLES = {
  departments: "hr_departments",
  positions: "hr_positions",
  locations: "hr_locations",
} as const;
export type HrRefKind = keyof typeof REF_TABLES;

export async function listRefs(companyId: string, kind: HrRefKind): Promise<HrRef[]> {
  const extra =
    kind === "positions" ? ", department_id" : kind === "locations" ? ", country" : "";
  return q<HrRef>(
    `SELECT id, name${extra} FROM public.${REF_TABLES[kind]}
      WHERE company_id = $1 ORDER BY name`,
    [companyId],
  );
}

export async function createRef(
  companyId: string,
  kind: HrRefKind,
  name: string,
  extra?: { departmentId?: string | null; country?: string | null },
): Promise<HrRef> {
  if (kind === "positions") {
    const row = await one<HrRef>(
      `INSERT INTO public.hr_positions (company_id, name, department_id) VALUES ($1, $2, $3)
       ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, department_id`,
      [companyId, name, extra?.departmentId ?? null],
    );
    return row!;
  }
  if (kind === "locations") {
    const row = await one<HrRef>(
      `INSERT INTO public.hr_locations (company_id, name, country) VALUES ($1, $2, $3)
       ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, country`,
      [companyId, name, extra?.country ?? null],
    );
    return row!;
  }
  const row = await one<HrRef>(
    `INSERT INTO public.hr_departments (company_id, name) VALUES ($1, $2)
     ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [companyId, name],
  );
  return row!;
}

export async function deleteRef(companyId: string, kind: HrRefKind, id: string): Promise<void> {
  await q(`DELETE FROM public.${REF_TABLES[kind]} WHERE company_id = $1 AND id = $2`, [
    companyId,
    id,
  ]);
}

// ── Employee ID allocation ───────────────────────────────────────────────

async function nextEmployeeNo(companyId: string, prefix: string): Promise<string> {
  const row = await one<{ last_number: number }>(
    `INSERT INTO public.hr_employee_counters (company_id, last_number) VALUES ($1, 1)
     ON CONFLICT (company_id) DO UPDATE SET last_number = public.hr_employee_counters.last_number + 1
     RETURNING last_number`,
    [companyId],
  );
  const n = row?.last_number ?? 1;
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

// ── Employees ────────────────────────────────────────────────────────────

const EMPLOYEE_SELECT = `
  SELECT e.id, e.employee_no, e.first_name, e.last_name, e.date_of_birth, e.address,
         e.email, e.phone, e.department_id, e.position_id, e.location_id,
         d.name AS department_name, p.name AS position_name, l.name AS location_name,
         e.start_date, e.end_date, e.status, e.contract_type, e.employment_type,
         e.notes, e.created_at, e.updated_at
    FROM public.hr_employees e
    LEFT JOIN public.hr_departments d ON d.id = e.department_id
    LEFT JOIN public.hr_positions p ON p.id = e.position_id
    LEFT JOIN public.hr_locations l ON l.id = e.location_id`;

export async function listEmployees(
  companyId: string,
  filters: HrEmployeeFilters = {},
): Promise<HrEmployee[]> {
  const where: string[] = ["e.company_id = $1"];
  const params: unknown[] = [companyId];
  const push = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("$?", `$${params.length}`));
  };
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    const i = `$${params.length}`;
    where.push(
      `(e.employee_no ILIKE ${i} OR e.first_name ILIKE ${i} OR e.last_name ILIKE ${i}
        OR (e.first_name || ' ' || e.last_name) ILIKE ${i} OR e.email ILIKE ${i})`,
    );
  }
  if (filters.departmentId) push("e.department_id = $?", filters.departmentId);
  if (filters.positionId) push("e.position_id = $?", filters.positionId);
  if (filters.locationId) push("e.location_id = $?", filters.locationId);
  if (filters.status) push("e.status = $?", filters.status);
  if (filters.contractType) push("e.contract_type = $?", filters.contractType);

  return q<HrEmployee>(
    `${EMPLOYEE_SELECT} WHERE ${where.join(" AND ")}
      ORDER BY e.employee_no LIMIT 1000`,
    params,
  );
}

export async function getEmployee(companyId: string, id: string): Promise<HrEmployee | null> {
  return one<HrEmployee>(`${EMPLOYEE_SELECT} WHERE e.company_id = $1 AND e.id = $2`, [
    companyId,
    id,
  ]);
}

export interface EmployeeInput {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  department_id?: string | null;
  position_id?: string | null;
  location_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: EmployeeStatus;
  contract_type?: string | null;
  employment_type?: string | null;
  notes?: string | null;
}

export async function createEmployee(
  companyId: string,
  input: EmployeeInput,
  actor: { id: string; name: string },
): Promise<HrEmployee> {
  const settings = await getSettings(companyId);
  const employeeNo = await nextEmployeeNo(companyId, settings.employee_prefix);
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_employees
       (company_id, employee_no, first_name, last_name, date_of_birth, address, email, phone,
        department_id, position_id, location_id, start_date, end_date, status,
        contract_type, employment_type, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING id`,
    [
      companyId,
      employeeNo,
      input.first_name,
      input.last_name,
      input.date_of_birth ?? null,
      input.address ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.department_id ?? null,
      input.position_id ?? null,
      input.location_id ?? null,
      input.start_date ?? null,
      input.end_date ?? null,
      input.status ?? "onboarding",
      input.contract_type ?? null,
      input.employment_type ?? null,
      input.notes ?? null,
      actor.id,
    ],
  );
  const id = row!.id;
  await addEvent(companyId, id, "employee", `Employee ${employeeNo} created`, actor.name);
  await audit(companyId, id, actor, "employee.create", { employee_no: employeeNo });
  return (await getEmployee(companyId, id))!;
}

export async function updateEmployee(
  companyId: string,
  id: string,
  input: EmployeeInput,
  actor: { id: string; name: string },
): Promise<HrEmployee> {
  const before = await getEmployee(companyId, id);
  if (!before) throw new Error("Employee not found.");
  await q(
    `UPDATE public.hr_employees SET
       first_name = $3, last_name = $4, date_of_birth = $5, address = $6, email = $7, phone = $8,
       department_id = $9, position_id = $10, location_id = $11, start_date = $12, end_date = $13,
       status = $14, contract_type = $15, employment_type = $16, notes = $17, updated_at = now()
     WHERE company_id = $1 AND id = $2`,
    [
      companyId,
      id,
      input.first_name,
      input.last_name,
      input.date_of_birth ?? null,
      input.address ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.department_id ?? null,
      input.position_id ?? null,
      input.location_id ?? null,
      input.start_date ?? null,
      input.end_date ?? null,
      input.status ?? before.status,
      input.contract_type ?? null,
      input.employment_type ?? null,
      input.notes ?? null,
    ],
  );
  if (input.status && input.status !== before.status) {
    await addEvent(
      companyId,
      id,
      "employee",
      `Status changed: ${before.status} → ${input.status}`,
      actor.name,
    );
  }
  await audit(companyId, id, actor, "employee.update", { employee_no: before.employee_no });
  return (await getEmployee(companyId, id))!;
}

export async function deleteEmployee(
  companyId: string,
  id: string,
  actor: { id: string; name: string },
): Promise<void> {
  const before = await getEmployee(companyId, id);
  await q(`DELETE FROM public.hr_employees WHERE company_id = $1 AND id = $2`, [companyId, id]);
  await audit(companyId, id, actor, "employee.delete", {
    employee_no: before?.employee_no ?? null,
  });
}

// ── Tasks ────────────────────────────────────────────────────────────────

const TASK_COLS = `t.id, t.employee_id, e.employee_no,
            NULLIF(concat_ws(' ', e.first_name, e.last_name), '') AS employee_name,
            t.title, t.description, t.category, t.team, t.assigned_to,
            t.due_date, t.priority, t.steps, t.document_id, t.document_key,
            d.title AS document_title, d.status AS document_status,
            t.resolution, t.completed_at, t.completed_by, t.status, t.created_at`;
const TASK_JOINS = `FROM public.hr_tasks t
       LEFT JOIN public.hr_employees e ON e.id = t.employee_id
       LEFT JOIN public.hr_documents d ON d.id = t.document_id`;

export async function listTasks(
  companyId: string,
  opts: { employeeId?: string; openOnly?: boolean } = {},
): Promise<HrTask[]> {
  const where = ["t.company_id = $1"];
  const params: unknown[] = [companyId];
  if (opts.employeeId) {
    params.push(opts.employeeId);
    where.push(`t.employee_id = $${params.length}`);
  }
  if (opts.openOnly) where.push("t.status IN ('pending','in_progress')");
  return q<HrTask>(
    `SELECT ${TASK_COLS} ${TASK_JOINS}
      WHERE ${where.join(" AND ")}
      ORDER BY (t.status = 'done' OR t.status = 'cancelled'), (t.due_date IS NULL), t.due_date,
               CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.created_at DESC
      LIMIT 500`,
    params,
  );
}

export async function getTask(companyId: string, id: string): Promise<HrTask | null> {
  return one<HrTask>(`SELECT ${TASK_COLS} ${TASK_JOINS} WHERE t.company_id = $1 AND t.id = $2`, [
    companyId,
    id,
  ]);
}

export interface SaveTaskInput {
  id?: string;
  employee_id?: string | null;
  title: string;
  description?: string | null;
  category?: string;
  team?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: HrTask["priority"];
  steps?: HrTask["steps"];
  document_id?: string | null;
  document_key?: string | null;
  resolution?: string | null;
  status?: HrTask["status"];
  source?: string | null;
  completed_by?: string | null;
}

export async function saveTask(companyId: string, values: SaveTaskInput): Promise<string> {
  const status = values.status ?? "pending";
  const closing = status === "done" || status === "cancelled";
  if (values.id) {
    const before = await getTask(companyId, values.id);
    await q(
      `UPDATE public.hr_tasks SET title = $3, category = $4, team = $5, assigned_to = $6,
              due_date = $7, status = $8, description = $9, priority = $10, steps = $11,
              document_id = $12, document_key = $13, resolution = $14,
              completed_at = CASE WHEN $15::boolean THEN COALESCE(completed_at, now()) ELSE NULL END,
              completed_by = CASE WHEN $15::boolean THEN COALESCE(completed_by, $16) ELSE NULL END,
              updated_at = now()
         WHERE company_id = $1 AND id = $2`,
      [
        companyId,
        values.id,
        values.title,
        values.category ?? before?.category ?? "general",
        values.team ?? null,
        values.assigned_to ?? null,
        values.due_date ?? null,
        status,
        values.description ?? null,
        values.priority ?? before?.priority ?? "normal",
        JSON.stringify(values.steps ?? before?.steps ?? []),
        values.document_id === undefined ? (before?.document_id ?? null) : values.document_id,
        values.document_key === undefined ? (before?.document_key ?? null) : values.document_key,
        values.resolution ?? null,
        closing,
        values.completed_by ?? null,
      ],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_tasks
       (company_id, employee_id, title, category, team, assigned_to, due_date, status,
        description, priority, steps, document_id, document_key, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [
      companyId,
      values.employee_id ?? null,
      values.title,
      values.category ?? "general",
      values.team ?? null,
      values.assigned_to ?? null,
      values.due_date ?? null,
      status,
      values.description ?? null,
      values.priority ?? "normal",
      JSON.stringify(values.steps ?? []),
      values.document_id ?? null,
      values.document_key ?? null,
      values.source ?? null,
    ],
  );
  return row?.id ?? "";
}

export async function deleteTask(companyId: string, id: string): Promise<void> {
  await q(`DELETE FROM public.hr_tasks WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

// ── Timeline + audit ─────────────────────────────────────────────────────

export async function addEvent(
  companyId: string,
  employeeId: string,
  kind: string,
  message: string,
  actor?: string | null,
): Promise<void> {
  await q(
    `INSERT INTO public.hr_employee_events (company_id, employee_id, kind, message, actor)
     VALUES ($1,$2,$3,$4,$5)`,
    [companyId, employeeId, kind, message, actor ?? null],
  );
}

export async function listEvents(
  companyId: string,
  employeeId: string,
): Promise<HrEmployeeEvent[]> {
  return q<HrEmployeeEvent>(
    `SELECT id, kind, message, actor, occurred_at
       FROM public.hr_employee_events
      WHERE company_id = $1 AND employee_id = $2
      ORDER BY occurred_at DESC LIMIT 200`,
    [companyId, employeeId],
  );
}

export async function audit(
  companyId: string,
  employeeId: string | null,
  actor: { id: string; name: string },
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await q(
    `INSERT INTO public.hr_employee_audit_log
       (company_id, employee_id, actor_id, actor_name, action, details)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [companyId, employeeId, actor.id, actor.name, action, JSON.stringify(details)],
  );
}

// ── Overview counters ────────────────────────────────────────────────────

export async function counts(companyId: string) {
  const row = await one<{
    total: string;
    active: string;
    onboarding: string;
    offboarding: string;
    leave: string;
    new_hires: string;
    leaving: string;
  }>(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE status = 'active') AS active,
            count(*) FILTER (WHERE status = 'onboarding') AS onboarding,
            count(*) FILTER (WHERE status = 'offboarding') AS offboarding,
            count(*) FILTER (WHERE status = 'leave') AS leave,
            count(*) FILTER (WHERE start_date >= current_date - INTERVAL '30 days') AS new_hires,
            count(*) FILTER (WHERE end_date IS NOT NULL AND end_date >= current_date) AS leaving
       FROM public.hr_employees WHERE company_id = $1`,
    [companyId],
  );
  const n = (v: string | undefined) => Number(v ?? 0);
  return {
    total: n(row?.total),
    active: n(row?.active),
    onboarding: n(row?.onboarding),
    offboarding: n(row?.offboarding),
    leave: n(row?.leave),
    newHires30d: n(row?.new_hires),
    leaving: n(row?.leaving),
  };
}

export async function actionRequired(companyId: string) {
  const row = await one<{
    contracts: string;
    open_tasks: string;
    overdue_tasks: string;
    missing: string;
  }>(
    `SELECT
       (SELECT count(*) FROM public.hr_employees
          WHERE company_id = $1 AND end_date IS NOT NULL
            AND end_date BETWEEN current_date AND current_date + INTERVAL '30 days') AS contracts,
       (SELECT count(*) FROM public.hr_tasks
          WHERE company_id = $1 AND status IN ('pending','in_progress')) AS open_tasks,
       (SELECT count(*) FROM public.hr_tasks
          WHERE company_id = $1 AND status IN ('pending','in_progress')
            AND due_date IS NOT NULL AND due_date < current_date) AS overdue_tasks,
       (SELECT count(*) FROM public.hr_employees
          WHERE company_id = $1 AND status <> 'terminated'
            AND (start_date IS NULL OR contract_type IS NULL OR department_id IS NULL)) AS missing`,
    [companyId],
  );
  const n = (v: string | undefined) => Number(v ?? 0);
  return {
    contractsExpiring: n(row?.contracts),
    openTasks: n(row?.open_tasks),
    overdueTasks: n(row?.overdue_tasks),
    missingData: n(row?.missing),
  };
}


// ── Overview extras ──────────────────────────────────────────────────────

export function pipeline(companyId: string): Promise<HrPipelineRow[]> {
  return q<HrPipelineRow>(
    `SELECT e.id AS employee_id, e.employee_no, concat_ws(' ', e.first_name, e.last_name) AS name,
            t.category AS kind,
            CASE WHEN t.category = 'onboarding' THEN e.start_date ELSE e.end_date END AS anchor_date,
            count(t.id)::int AS total,
            count(t.id) FILTER (WHERE t.status = 'done')::int AS done,
            count(t.id) FILTER (WHERE t.status IN ('pending','in_progress') AND t.due_date < current_date)::int AS overdue,
            (SELECT x.title FROM public.hr_tasks x WHERE x.employee_id = e.id AND x.category = t.category
               AND x.status IN ('pending','in_progress') ORDER BY x.due_date NULLS LAST LIMIT 1) AS next_task,
            (SELECT x.due_date FROM public.hr_tasks x WHERE x.employee_id = e.id AND x.category = t.category
               AND x.status IN ('pending','in_progress') ORDER BY x.due_date NULLS LAST LIMIT 1) AS next_due
       FROM public.hr_tasks t JOIN public.hr_employees e ON e.id = t.employee_id
      WHERE t.company_id = $1 AND t.category IN ('onboarding','offboarding')
        AND e.status IN ('onboarding','offboarding','active')
      GROUP BY e.id, t.category
     HAVING count(t.id) FILTER (WHERE t.status IN ('pending','in_progress')) > 0
      ORDER BY overdue DESC, anchor_date NULLS LAST LIMIT 60`,
    [companyId],
  );
}

export async function overviewSignals(companyId: string) {
  const r = await one<Record<string, string>>(
    `SELECT
       (SELECT count(*) FROM public.hr_candidates WHERE company_id = $1 AND status = 'new') AS candidates_new,
       (SELECT count(*) FROM public.hr_candidates WHERE company_id = $1 AND status = 'shortlisted') AS candidates_shortlisted,
       (SELECT count(*) FROM public.hr_documents WHERE company_id = $1 AND status = 'draft') AS documents_draft,
       (SELECT count(*) FROM public.hr_documents WHERE company_id = $1 AND status = 'review') AS documents_review,
       (SELECT count(*) FROM public.hr_documents WHERE company_id = $1 AND valid_until IS NOT NULL
          AND valid_until <= current_date + 60) AS documents_expiring,
       (SELECT count(*) FROM public.hr_incidents WHERE company_id = $1 AND occurred_on >= current_date - 30) AS incidents_30d`,
    [companyId],
  );
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    candidatesNew: n("candidates_new"),
    candidatesShortlisted: n("candidates_shortlisted"),
    documentsDraft: n("documents_draft"),
    documentsReview: n("documents_review"),
    documentsExpiring: n("documents_expiring"),
    incidents30d: n("incidents_30d"),
  };
}

export function recentEvents(companyId: string) {
  return q<{ id: string; employee_no: string; kind: string; message: string; actor: string | null; created_at: string }>(
    `SELECT ev.id, e.employee_no, ev.kind, ev.message, ev.actor, ev.created_at
       FROM public.hr_employee_events ev JOIN public.hr_employees e ON e.id = ev.employee_id
      WHERE ev.company_id = $1 ORDER BY ev.created_at DESC LIMIT 15`,
    [companyId],
  );
}
