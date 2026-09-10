// OPSQAI Core — Operational Intelligence data access (Self-Hosted, server only).
//
// Talks to the installation's local PostgreSQL through DATABASE_URL. On Cloud
// there is no DATABASE_URL, so every entry point fails loudly instead of
// touching Management Center data.

import { Pool, type QueryResultRow } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";
import type {
  CoreAction,
  CoreAnalytics,
  CoreAttachment,
  CoreIncident,
  CoreIncidentDetail,
  CoreIncidentLink,
  CoreOpsFilters,
  CoreRootCause,
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
      "OPSQAI Core Operations is available on Self-Hosted installations only (no local database configured).",
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

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

function normaliseIncident(row: Record<string, unknown>): CoreIncident {
  return {
    ...(row as unknown as CoreIncident),
    cost_amount: num(row["cost_amount"]),
    lost_minutes: num(row["lost_minutes"]),
    frequency_per_month: num(row["frequency_per_month"]),
    link_count: num(row["link_count"]),
    attachment_count: num(row["attachment_count"]),
    open_actions: num(row["open_actions"]),
    has_analysis: Boolean(row["has_analysis"]),
  };
}

// ── Incidents ─────────────────────────────────────────────────────────────

export interface IncidentScope {
  companyId: string;
  /** null = full visibility (manager / admin), otherwise restrict rows. */
  departmentId: string | null;
}

export async function listIncidents(
  scope: IncidentScope,
  filters: CoreOpsFilters = {},
): Promise<CoreIncident[]> {
  const params: unknown[] = [scope.companyId];
  const where: string[] = ["i.company_id = $1"];

  if (scope.departmentId) {
    params.push(scope.departmentId);
    where.push(`(i.department_id IS NULL OR i.department_id = $${params.length})`);
  }
  if (filters.departmentId) {
    params.push(filters.departmentId);
    where.push(`i.department_id = $${params.length}`);
  }
  if (filters.kind) {
    params.push(filters.kind);
    where.push(`i.kind = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`i.status = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`i.occurred_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`i.occurred_at <= $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(
      `(i.title ILIKE $${params.length} OR i.description ILIKE $${params.length} OR i.ref ILIKE $${params.length})`,
    );
  }

  const rows = await q<Record<string, unknown> & QueryResultRow>(
    `SELECT i.*, d.name AS department_name,
            (SELECT count(*) FROM public.core_incident_links l WHERE l.incident_id = i.id) AS link_count,
            (SELECT count(*) FROM public.core_incident_attachments a WHERE a.incident_id = i.id) AS attachment_count,
            (SELECT count(*) FROM public.core_actions ac WHERE ac.incident_id = i.id AND ac.status IN ('open','in_progress')) AS open_actions,
            EXISTS (SELECT 1 FROM public.core_root_causes rc WHERE rc.incident_id = i.id) AS has_analysis
       FROM public.core_incidents i
       LEFT JOIN public.departments d ON d.id = i.department_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.occurred_at DESC
      LIMIT 400`,
    params,
  );
  return rows.map(normaliseIncident);
}

export interface IncidentInput {
  id?: string | null;
  kind: string;
  title: string;
  description?: string | null;
  occurred_at: string;
  department_id?: string | null;
  location?: string | null;
  cost_amount?: number;
  currency?: string;
  lost_minutes?: number;
  frequency_per_month?: number;
  status?: string;
  involved_person?: string | null;
  involved_role?: string | null;
  immediate_cause?: string | null;
}

export async function saveIncident(
  scope: IncidentScope,
  userId: string,
  input: IncidentInput,
): Promise<{ id: string }> {
  const values = [
    input.kind,
    input.title,
    input.description ?? null,
    input.occurred_at,
    input.department_id ?? null,
    input.location ?? null,
    input.cost_amount ?? 0,
    input.currency ?? "EUR",
    input.lost_minutes ?? 0,
    input.frequency_per_month ?? 1,
    input.status ?? "open",
    input.involved_person ?? null,
    input.involved_role ?? null,
    input.immediate_cause ?? null,
  ];

  if (input.id) {
    const row = await one<{ id: string }>(
      `UPDATE public.core_incidents
          SET kind = $3, title = $4, description = $5, occurred_at = $6, department_id = $7,
              location = $8, cost_amount = $9, currency = $10, lost_minutes = $11,
              frequency_per_month = $12, status = $13, involved_person = $14,
              involved_role = $15, immediate_cause = $16, updated_at = now()
        WHERE id = $1 AND company_id = $2
        RETURNING id`,
      [input.id, scope.companyId, ...values],
    );
    if (!row) throw new Error("incident_not_found");
    return row;
  }

  const seq = await one<{ n: string }>(
    `SELECT count(*) + 1 AS n FROM public.core_incidents WHERE company_id = $1`,
    [scope.companyId],
  );
  const ref = `INC-${new Date().getFullYear()}-${String(Number(seq?.n ?? 1)).padStart(4, "0")}`;

  const row = await one<{ id: string }>(
    `INSERT INTO public.core_incidents
       (company_id, ref, kind, title, description, occurred_at, department_id, location,
        cost_amount, currency, lost_minutes, frequency_per_month, status,
        involved_person, involved_role, immediate_cause, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [scope.companyId, ref, ...values, userId],
  );
  return row!;
}

export async function deleteIncident(scope: IncidentScope, id: string): Promise<void> {
  await q(`DELETE FROM public.core_incidents WHERE id = $1 AND company_id = $2`, [
    id,
    scope.companyId,
  ]);
}

export async function getIncidentDetail(
  scope: IncidentScope,
  id: string,
): Promise<CoreIncidentDetail> {
  const params: unknown[] = [id, scope.companyId];
  let deptClause = "";
  if (scope.departmentId) {
    params.push(scope.departmentId);
    deptClause = ` AND (i.department_id IS NULL OR i.department_id = $3)`;
  }
  const row = await one<Record<string, unknown> & QueryResultRow>(
    `SELECT i.*, d.name AS department_name
       FROM public.core_incidents i
       LEFT JOIN public.departments d ON d.id = i.department_id
      WHERE i.id = $1 AND i.company_id = $2${deptClause}`,
    params,
  );
  if (!row) throw new Error("incident_not_found");

  const [links, attachments, rootCause, actions] = await Promise.all([
    q<CoreIncidentLink & QueryResultRow>(
      `SELECT * FROM public.core_incident_links WHERE incident_id = $1 ORDER BY link_type, created_at`,
      [id],
    ),
    q<CoreAttachment & QueryResultRow>(
      `SELECT id, incident_id, filename, mime_type, bytes, created_at
         FROM public.core_incident_attachments WHERE incident_id = $1 ORDER BY created_at`,
      [id],
    ),
    one<Record<string, unknown> & QueryResultRow>(
      `SELECT * FROM public.core_root_causes WHERE incident_id = $1`,
      [id],
    ),
    q<CoreAction & QueryResultRow>(
      `SELECT * FROM public.core_actions WHERE incident_id = $1 ORDER BY kind, due_date NULLS LAST, created_at`,
      [id],
    ),
  ]);

  return {
    incident: normaliseIncident(row),
    links,
    attachments,
    rootCause: rootCause
      ? ({
          ...(rootCause as unknown as CoreRootCause),
          financial_impact: num(rootCause["financial_impact"]),
          frequency: num(rootCause["frequency"]),
        } as CoreRootCause)
      : null,
    actions,
  };
}

// ── Links ─────────────────────────────────────────────────────────────────

export async function addLink(
  incidentId: string,
  link: { link_type: string; target_id?: string | null; target_title?: string | null; note?: string | null },
): Promise<void> {
  await q(
    `INSERT INTO public.core_incident_links (incident_id, link_type, target_id, target_title, note)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (incident_id, link_type, target_id)
     DO UPDATE SET target_title = EXCLUDED.target_title, note = EXCLUDED.note`,
    [incidentId, link.link_type, link.target_id ?? null, link.target_title ?? null, link.note ?? null],
  );
}

export async function removeLink(incidentId: string, linkId: string): Promise<void> {
  await q(`DELETE FROM public.core_incident_links WHERE id = $1 AND incident_id = $2`, [
    linkId,
    incidentId,
  ]);
}

/** Candidate SOPs / FAQs for linking — plain text search inside the company. */
export async function searchLinkTargets(
  companyId: string,
  term: string,
): Promise<Array<{ type: "document" | "faq"; id: string; title: string; subtitle: string | null }>> {
  const like = `%${term}%`;
  const [docs, faqs] = await Promise.all([
    q<{ id: string; title: string; category: string | null } & QueryResultRow>(
      `SELECT id, title, category FROM public.knowledge_documents
        WHERE company_id = $1 AND (title ILIKE $2 OR coalesce(doc_code,'') ILIKE $2)
        ORDER BY title LIMIT 12`,
      [companyId, like],
    ),
    q<{ id: string; question_en: string | null; question_de: string | null; category: string | null } & QueryResultRow>(
      `SELECT id, question_en, question_de, category FROM public.faqs
        WHERE company_id = $1 AND (coalesce(question_en,'') ILIKE $2 OR coalesce(question_de,'') ILIKE $2)
        ORDER BY coalesce(question_en, question_de) LIMIT 12`,
      [companyId, like],
    ),
  ]);
  return [
    ...docs.map((d) => ({ type: "document" as const, id: d.id, title: d.title, subtitle: d.category })),
    ...faqs.map((f) => ({
      type: "faq" as const,
      id: f.id,
      title: f.question_en ?? f.question_de ?? "FAQ",
      subtitle: f.category,
    })),
  ];
}

// ── Attachments ───────────────────────────────────────────────────────────

export async function addAttachment(
  incidentId: string,
  userId: string,
  file: { filename: string; mime_type: string; data: Uint8Array },
): Promise<{ id: string }> {
  const row = await one<{ id: string }>(
    `INSERT INTO public.core_incident_attachments (incident_id, filename, mime_type, bytes, data, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [incidentId, file.filename, file.mime_type, file.data.byteLength, Buffer.from(file.data), userId],
  );
  return row!;
}

export async function getAttachment(
  companyId: string,
  id: string,
): Promise<{ filename: string; mime_type: string; data: Buffer } | null> {
  const row = await one<{ filename: string; mime_type: string; data: Buffer } & QueryResultRow>(
    `SELECT a.filename, a.mime_type, a.data
       FROM public.core_incident_attachments a
       JOIN public.core_incidents i ON i.id = a.incident_id
      WHERE a.id = $1 AND i.company_id = $2`,
    [id, companyId],
  );
  return row ?? null;
}

export async function removeAttachment(companyId: string, id: string): Promise<void> {
  await q(
    `DELETE FROM public.core_incident_attachments a
      USING public.core_incidents i
      WHERE a.id = $1 AND a.incident_id = i.id AND i.company_id = $2`,
    [id, companyId],
  );
}

// ── Root cause ────────────────────────────────────────────────────────────

export async function saveRootCause(
  incidentId: string,
  userId: string,
  patch: Partial<CoreRootCause> & { generated?: boolean },
): Promise<void> {
  await q(
    `INSERT INTO public.core_root_causes
       (incident_id, problem, immediate_cause, root_cause, sop_violation, process_failure,
        related_processes, financial_impact, frequency, why_steps, lean_class, corrective,
        preventive, sources, unsupported, generated_at, generated_by, edited_at, edited_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14::jsonb,$15::jsonb,
             CASE WHEN $16 THEN now() ELSE NULL END, CASE WHEN $16 THEN $17::uuid ELSE NULL END,
             CASE WHEN $16 THEN NULL ELSE now() END, CASE WHEN $16 THEN NULL ELSE $17::uuid END)
     ON CONFLICT (incident_id) DO UPDATE SET
       problem = EXCLUDED.problem,
       immediate_cause = EXCLUDED.immediate_cause,
       root_cause = EXCLUDED.root_cause,
       sop_violation = EXCLUDED.sop_violation,
       process_failure = EXCLUDED.process_failure,
       related_processes = EXCLUDED.related_processes,
       financial_impact = EXCLUDED.financial_impact,
       frequency = EXCLUDED.frequency,
       why_steps = EXCLUDED.why_steps,
       lean_class = EXCLUDED.lean_class,
       corrective = EXCLUDED.corrective,
       preventive = EXCLUDED.preventive,
       sources = EXCLUDED.sources,
       unsupported = EXCLUDED.unsupported,
       generated_at = COALESCE(EXCLUDED.generated_at, public.core_root_causes.generated_at),
       generated_by = COALESCE(EXCLUDED.generated_by, public.core_root_causes.generated_by),
       edited_at = COALESCE(EXCLUDED.edited_at, public.core_root_causes.edited_at),
       edited_by = COALESCE(EXCLUDED.edited_by, public.core_root_causes.edited_by),
       updated_at = now()`,
    [
      incidentId,
      patch.problem ?? null,
      patch.immediate_cause ?? null,
      patch.root_cause ?? null,
      patch.sop_violation ?? null,
      patch.process_failure ?? null,
      patch.related_processes ?? null,
      patch.financial_impact ?? 0,
      patch.frequency ?? 0,
      JSON.stringify(patch.why_steps ?? []),
      patch.lean_class ?? null,
      patch.corrective ?? null,
      patch.preventive ?? null,
      JSON.stringify(patch.sources ?? []),
      JSON.stringify(patch.unsupported ?? []),
      Boolean(patch.generated),
      userId,
    ],
  );
  await q(
    `UPDATE public.core_incidents SET status = CASE WHEN status = 'open' THEN 'analysed' ELSE status END,
            updated_at = now() WHERE id = $1`,
    [incidentId],
  );
}

// ── Actions ───────────────────────────────────────────────────────────────

export async function saveAction(
  incidentId: string,
  userId: string,
  input: {
    id?: string | null;
    kind: string;
    title: string;
    detail?: string | null;
    owner_name?: string | null;
    due_date?: string | null;
    status?: string;
    sources?: unknown[];
  },
): Promise<void> {
  if (input.id) {
    await q(
      `UPDATE public.core_actions
          SET kind = $3, title = $4, detail = $5, owner_name = $6, due_date = $7,
              status = $8, updated_at = now()
        WHERE id = $1 AND incident_id = $2`,
      [
        input.id,
        incidentId,
        input.kind,
        input.title,
        input.detail ?? null,
        input.owner_name ?? null,
        input.due_date ?? null,
        input.status ?? "open",
      ],
    );
    return;
  }
  await q(
    `INSERT INTO public.core_actions
       (incident_id, kind, title, detail, owner_name, due_date, status, sources, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
    [
      incidentId,
      input.kind,
      input.title,
      input.detail ?? null,
      input.owner_name ?? null,
      input.due_date ?? null,
      input.status ?? "open",
      JSON.stringify(input.sources ?? []),
      userId,
    ],
  );
  await q(
    `UPDATE public.core_incidents SET status = CASE WHEN status IN ('open','analysed') THEN 'action' ELSE status END,
            updated_at = now() WHERE id = $1`,
    [incidentId],
  );
}

export async function deleteAction(incidentId: string, id: string): Promise<void> {
  await q(`DELETE FROM public.core_actions WHERE id = $1 AND incident_id = $2`, [id, incidentId]);
}

export async function listOpenActions(
  scope: IncidentScope,
): Promise<Array<CoreAction & { incident_title: string; incident_ref: string | null }>> {
  const params: unknown[] = [scope.companyId];
  let dept = "";
  if (scope.departmentId) {
    params.push(scope.departmentId);
    dept = ` AND (i.department_id IS NULL OR i.department_id = $2)`;
  }
  return q<CoreAction & { incident_title: string; incident_ref: string | null } & QueryResultRow>(
    `SELECT a.*, i.title AS incident_title, i.ref AS incident_ref
       FROM public.core_actions a
       JOIN public.core_incidents i ON i.id = a.incident_id
      WHERE i.company_id = $1${dept} AND a.status IN ('open','in_progress')
      ORDER BY a.due_date NULLS LAST, a.created_at
      LIMIT 300`,
    params,
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────

export async function analytics(scope: IncidentScope): Promise<CoreAnalytics> {
  const params: unknown[] = [scope.companyId];
  let dept = "";
  if (scope.departmentId) {
    params.push(scope.departmentId);
    dept = ` AND (i.department_id IS NULL OR i.department_id = $2)`;
  }
  const base = `FROM public.core_incidents i WHERE i.company_id = $1${dept}`;

  const [totals, byDepartment, byKind, topRoot, topSop, trend, actions, gaps, quality] =
    await Promise.all([
      one<Record<string, unknown> & QueryResultRow>(
        `SELECT count(*) AS incidents, coalesce(sum(i.cost_amount),0) AS cost,
                coalesce(sum(i.lost_minutes),0) AS lost,
                coalesce(sum(i.cost_amount * greatest(i.frequency_per_month,0) * 12),0) AS annual,
                min(i.currency) AS currency
           ${base}`,
        params,
      ),
      q<Record<string, unknown> & QueryResultRow>(
        `SELECT coalesce(d.name,'—') AS label, count(*) AS incidents, coalesce(sum(i.cost_amount),0) AS cost
           FROM public.core_incidents i LEFT JOIN public.departments d ON d.id = i.department_id
          WHERE i.company_id = $1${dept}
          GROUP BY 1 ORDER BY 3 DESC LIMIT 12`,
        params,
      ),
      q<Record<string, unknown> & QueryResultRow>(
        `SELECT i.kind AS label, count(*) AS incidents, coalesce(sum(i.cost_amount),0) AS cost
           ${base} GROUP BY 1 ORDER BY 3 DESC`,
        params,
      ),
      q<Record<string, unknown> & QueryResultRow>(
        `SELECT rc.root_cause AS label, count(*) AS incidents, coalesce(sum(i.cost_amount),0) AS cost
           FROM public.core_root_causes rc JOIN public.core_incidents i ON i.id = rc.incident_id
          WHERE i.company_id = $1${dept} AND coalesce(rc.root_cause,'') <> ''
          GROUP BY 1 ORDER BY 2 DESC, 3 DESC LIMIT 10`,
        params,
      ),
      q<Record<string, unknown> & QueryResultRow>(
        `SELECT coalesce(l.target_title,'—') AS label, count(*) AS incidents
           FROM public.core_incident_links l JOIN public.core_incidents i ON i.id = l.incident_id
          WHERE i.company_id = $1${dept} AND l.link_type = 'violated_sop'
          GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        params,
      ),
      q<Record<string, unknown> & QueryResultRow>(
        `SELECT to_char(date_trunc('month', i.occurred_at), 'YYYY-MM') AS month,
                count(*) AS incidents, coalesce(sum(i.cost_amount),0) AS cost
           ${base} AND i.occurred_at > now() - interval '12 months'
          GROUP BY 1 ORDER BY 1`,
        params,
      ),
      one<Record<string, unknown> & QueryResultRow>(
        `SELECT count(*) FILTER (WHERE a.status IN ('open','in_progress')) AS open,
                count(*) FILTER (WHERE a.status IN ('open','in_progress') AND a.due_date < current_date) AS overdue
           FROM public.core_actions a JOIN public.core_incidents i ON i.id = a.incident_id
          WHERE i.company_id = $1${dept}`,
        params,
      ),
      one<{ n: string } & QueryResultRow>(
        `SELECT count(*) AS n FROM public.knowledge_gaps WHERE company_id = $1 AND status = 'open'`,
        [scope.companyId],
      ),
      one<Record<string, unknown> & QueryResultRow>(
        `SELECT count(*) FILTER (WHERE rating = 1) AS up, count(*) AS total
           FROM public.message_feedback WHERE company_id = $1`,
        [scope.companyId],
      ),
    ]);

  const totalFeedback = num(quality?.["total"]);
  const map = (rows: Array<Record<string, unknown>>) =>
    rows.map((r) => ({
      label: String(r["label"] ?? "—"),
      incidents: num(r["incidents"]),
      cost: num(r["cost"]),
    }));

  return {
    totals: {
      incidents: num(totals?.["incidents"]),
      cost: num(totals?.["cost"]),
      lostMinutes: num(totals?.["lost"]),
      annualImpact: num(totals?.["annual"]),
      openActions: num(actions?.["open"]),
      overdueActions: num(actions?.["overdue"]),
      openGaps: num(gaps?.n),
      answerQuality:
        totalFeedback > 0 ? Math.round((num(quality?.["up"]) / totalFeedback) * 100) : null,
    },
    byDepartment: map(byDepartment),
    byKind: map(byKind),
    topRootCauses: map(topRoot),
    topViolatedSops: map(topSop).map(({ label, incidents }) => ({ label, incidents })),
    trend: trend.map((r) => ({
      month: String(r["month"]),
      incidents: num(r["incidents"]),
      cost: num(r["cost"]),
    })),
    currency: String(totals?.["currency"] ?? "EUR"),
  };
}

export async function listDepartments(
  companyId: string,
): Promise<Array<{ id: string; name: string }>> {
  return q<{ id: string; name: string } & QueryResultRow>(
    `SELECT id, name FROM public.departments WHERE company_id = $1 ORDER BY name`,
    [companyId],
  );
}
