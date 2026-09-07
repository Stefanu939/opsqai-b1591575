// OPSQAI HR — data access for documents, checklists, assets, incidents,
// candidate screening, analytics and alerts (Self-Hosted PostgreSQL, server only).

import { hrQuery as q, hrQueryOne as one } from "./db.server";
import type {
  HrAlert,
  HrAnalytics,
  HrAsset,
  HrCandidate,
  HrChecklistTemplate,
  HrDocument,
  HrDocumentTemplate,
  HrIncident,
  HrJobProfile,
} from "./types-ext";

const n = (v: unknown) => Number(v ?? 0);

// ── Document templates ───────────────────────────────────────────────────

export function listTemplates(companyId: string) {
  return q<HrDocumentTemplate>(
    `SELECT id, name, kind, country, contract_type, body, updated_at
       FROM public.hr_document_templates WHERE company_id = $1 ORDER BY kind, name`,
    [companyId],
  );
}

export async function saveTemplate(
  companyId: string,
  values: {
    id?: string;
    name: string;
    kind: string;
    country?: string | null;
    contract_type?: string | null;
    body: string;
  },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_document_templates
          SET name = $3, kind = $4, country = $5, contract_type = $6, body = $7, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [
        companyId,
        values.id,
        values.name,
        values.kind,
        values.country ?? null,
        values.contract_type ?? null,
        values.body,
      ],
    );
    return;
  }
  await q(
    `INSERT INTO public.hr_document_templates (company_id, name, kind, country, contract_type, body)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      companyId,
      values.name,
      values.kind,
      values.country ?? null,
      values.contract_type ?? null,
      values.body,
    ],
  );
}

export async function deleteTemplate(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_document_templates WHERE company_id = $1 AND id = $2`, [
    companyId,
    id,
  ]);
}

// ── Employee documents ───────────────────────────────────────────────────

const DOC_SELECT = `
  SELECT d.id, d.employee_id, e.employee_no,
         NULLIF(concat_ws(' ', e.first_name, e.last_name), '') AS employee_name,
         d.kind, d.title, d.filename, d.mime, (d.data IS NOT NULL) AS has_file,
         d.body, d.valid_until, d.approved_at, d.approved_by, d.created_at
    FROM public.hr_documents d
    LEFT JOIN public.hr_employees e ON e.id = d.employee_id`;

export function listDocuments(companyId: string, employeeId?: string) {
  const params: unknown[] = [companyId];
  let where = "d.company_id = $1";
  if (employeeId) {
    params.push(employeeId);
    where += ` AND d.employee_id = $${params.length}`;
  }
  return q<HrDocument>(`${DOC_SELECT} WHERE ${where} ORDER BY d.created_at DESC LIMIT 500`, params);
}

export async function createDocument(
  companyId: string,
  values: {
    employee_id?: string | null;
    kind: string;
    title: string;
    filename?: string | null;
    mime?: string | null;
    data?: Uint8Array | null;
    body?: string | null;
    valid_until?: string | null;
  },
  actor: { id: string },
) {
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_documents
       (company_id, employee_id, kind, title, filename, mime, data, body, valid_until, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      companyId,
      values.employee_id ?? null,
      values.kind,
      values.title,
      values.filename ?? null,
      values.mime ?? null,
      values.data ? Buffer.from(values.data) : null,
      values.body ?? null,
      values.valid_until ?? null,
      actor.id,
    ],
  );
  return row!.id;
}

export async function approveDocument(companyId: string, id: string, approvedBy: string) {
  await q(
    `UPDATE public.hr_documents SET approved_at = now(), approved_by = $3
      WHERE company_id = $1 AND id = $2`,
    [companyId, id, approvedBy],
  );
}

export async function getDocumentFile(companyId: string, id: string) {
  return one<{ filename: string | null; mime: string | null; data: Uint8Array | null; body: string | null; title: string }>(
    `SELECT filename, mime, data, body, title FROM public.hr_documents
      WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
}

export async function deleteDocument(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_documents WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

// ── Checklist templates ──────────────────────────────────────────────────

export function listChecklists(companyId: string) {
  return q<HrChecklistTemplate>(
    `SELECT c.id, c.kind, c.name, c.position_id, p.name AS position_name, c.items, c.updated_at
       FROM public.hr_checklist_templates c
       LEFT JOIN public.hr_positions p ON p.id = c.position_id
      WHERE c.company_id = $1 ORDER BY c.kind, c.name`,
    [companyId],
  );
}

export async function saveChecklist(
  companyId: string,
  values: {
    id?: string;
    kind: "onboarding" | "offboarding";
    name: string;
    position_id?: string | null;
    items: Array<{ title: string; team?: string | null; offsetDays?: number | null }>;
  },
) {
  const items = JSON.stringify(values.items);
  if (values.id) {
    await q(
      `UPDATE public.hr_checklist_templates
          SET kind = $3, name = $4, position_id = $5, items = $6::jsonb, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.id, values.kind, values.name, values.position_id ?? null, items],
    );
    return;
  }
  await q(
    `INSERT INTO public.hr_checklist_templates (company_id, kind, name, position_id, items)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [companyId, values.kind, values.name, values.position_id ?? null, items],
  );
}

export async function deleteChecklist(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_checklist_templates WHERE company_id = $1 AND id = $2`, [
    companyId,
    id,
  ]);
}

export async function getChecklist(companyId: string, id: string) {
  return one<HrChecklistTemplate>(
    `SELECT id, kind, name, position_id, NULL::text AS position_name, items, updated_at
       FROM public.hr_checklist_templates WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
}

// ── Assets ───────────────────────────────────────────────────────────────

const ASSET_SELECT = `
  SELECT a.id, a.name, a.category, a.serial, a.status, a.notes,
         act.employee_id AS holder_employee_id,
         NULLIF(concat_ws(' ', e.first_name, e.last_name), '') AS holder_name,
         e.employee_no AS holder_no, act.assigned_on
    FROM public.hr_assets a
    LEFT JOIN LATERAL (
      SELECT employee_id, assigned_on FROM public.hr_asset_assignments
       WHERE asset_id = a.id AND returned_on IS NULL
       ORDER BY assigned_on DESC LIMIT 1
    ) act ON true
    LEFT JOIN public.hr_employees e ON e.id = act.employee_id`;

export function listAssets(companyId: string) {
  return q<HrAsset>(`${ASSET_SELECT} WHERE a.company_id = $1 ORDER BY a.name`, [companyId]);
}

export async function saveAsset(
  companyId: string,
  values: {
    id?: string;
    name: string;
    category?: string | null;
    serial?: string | null;
    status?: HrAsset["status"];
    notes?: string | null;
  },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_assets SET name = $3, category = $4, serial = $5,
              status = COALESCE($6, status), notes = $7, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [
        companyId,
        values.id,
        values.name,
        values.category ?? null,
        values.serial ?? null,
        values.status ?? null,
        values.notes ?? null,
      ],
    );
    return;
  }
  await q(
    `INSERT INTO public.hr_assets (company_id, name, category, serial, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      companyId,
      values.name,
      values.category ?? null,
      values.serial ?? null,
      values.status ?? "available",
      values.notes ?? null,
    ],
  );
}

export async function deleteAsset(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_assets WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

export async function assignAsset(companyId: string, assetId: string, employeeId: string) {
  await q(
    `INSERT INTO public.hr_asset_assignments (company_id, asset_id, employee_id)
     VALUES ($1,$2,$3)`,
    [companyId, assetId, employeeId],
  );
  await q(`UPDATE public.hr_assets SET status = 'assigned', updated_at = now()
            WHERE company_id = $1 AND id = $2`, [companyId, assetId]);
}

export async function returnAsset(companyId: string, assetId: string) {
  await q(
    `UPDATE public.hr_asset_assignments SET returned_on = current_date
      WHERE company_id = $1 AND asset_id = $2 AND returned_on IS NULL`,
    [companyId, assetId],
  );
  await q(`UPDATE public.hr_assets SET status = 'available', updated_at = now()
            WHERE company_id = $1 AND id = $2`, [companyId, assetId]);
}

export function listEmployeeAssets(companyId: string, employeeId: string) {
  return q<{ id: string; name: string; assigned_on: string; returned_on: string | null }>(
    `SELECT a.id, a.name, x.assigned_on, x.returned_on
       FROM public.hr_asset_assignments x
       JOIN public.hr_assets a ON a.id = x.asset_id
      WHERE x.company_id = $1 AND x.employee_id = $2
      ORDER BY x.assigned_on DESC LIMIT 200`,
    [companyId, employeeId],
  );
}

// ── Incidents ────────────────────────────────────────────────────────────

export function listIncidents(companyId: string, employeeId?: string) {
  const params: unknown[] = [companyId];
  let where = "i.company_id = $1";
  if (employeeId) {
    params.push(employeeId);
    where += ` AND i.employee_id = $${params.length}`;
  }
  return q<HrIncident>(
    `SELECT i.id, i.employee_id, e.employee_no,
            NULLIF(concat_ws(' ', e.first_name, e.last_name), '') AS employee_name,
            i.kind, i.severity, i.title, i.description, i.action_taken,
            i.occurred_on, i.created_at
       FROM public.hr_incidents i
       LEFT JOIN public.hr_employees e ON e.id = i.employee_id
      WHERE ${where} ORDER BY i.occurred_on DESC, i.created_at DESC LIMIT 500`,
    params,
  );
}

export async function saveIncident(
  companyId: string,
  values: {
    id?: string;
    employee_id?: string | null;
    kind: HrIncident["kind"];
    severity: HrIncident["severity"];
    title: string;
    description?: string | null;
    action_taken?: string | null;
    occurred_on?: string | null;
  },
  actor: { id: string },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_incidents SET employee_id = $3, kind = $4, severity = $5, title = $6,
              description = $7, action_taken = $8, occurred_on = COALESCE($9, occurred_on)
        WHERE company_id = $1 AND id = $2`,
      [
        companyId,
        values.id,
        values.employee_id ?? null,
        values.kind,
        values.severity,
        values.title,
        values.description ?? null,
        values.action_taken ?? null,
        values.occurred_on ?? null,
      ],
    );
    return;
  }
  await q(
    `INSERT INTO public.hr_incidents
       (company_id, employee_id, kind, severity, title, description, action_taken, occurred_on, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, current_date),$9)`,
    [
      companyId,
      values.employee_id ?? null,
      values.kind,
      values.severity,
      values.title,
      values.description ?? null,
      values.action_taken ?? null,
      values.occurred_on ?? null,
      actor.id,
    ],
  );
}

export async function deleteIncident(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_incidents WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

// ── Job profiles ─────────────────────────────────────────────────────────

export function listJobProfiles(companyId: string) {
  return q<HrJobProfile>(
    `SELECT j.id, j.title, j.department_id, d.name AS department_name, j.description,
            j.criteria, j.active, j.updated_at,
            (SELECT count(*) FROM public.hr_candidates c WHERE c.job_profile_id = j.id)::int
              AS candidate_count
       FROM public.hr_job_profiles j
       LEFT JOIN public.hr_departments d ON d.id = j.department_id
      WHERE j.company_id = $1 ORDER BY j.active DESC, j.title`,
    [companyId],
  );
}

export async function saveJobProfile(
  companyId: string,
  values: {
    id?: string;
    title: string;
    department_id?: string | null;
    description?: string | null;
    criteria: Array<{ label: string; weight: number; required: boolean }>;
    active?: boolean;
  },
) {
  const criteria = JSON.stringify(values.criteria);
  if (values.id) {
    await q(
      `UPDATE public.hr_job_profiles
          SET title = $3, department_id = $4, description = $5, criteria = $6::jsonb,
              active = COALESCE($7, active), updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [
        companyId,
        values.id,
        values.title,
        values.department_id ?? null,
        values.description ?? null,
        criteria,
        values.active ?? null,
      ],
    );
    return;
  }
  await q(
    `INSERT INTO public.hr_job_profiles (company_id, title, department_id, description, criteria)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [companyId, values.title, values.department_id ?? null, values.description ?? null, criteria],
  );
}

export async function deleteJobProfile(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_job_profiles WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

export async function getJobProfile(companyId: string, id: string) {
  return one<HrJobProfile>(
    `SELECT id, title, department_id, NULL::text AS department_name, description, criteria,
            active, 0 AS candidate_count, updated_at
       FROM public.hr_job_profiles WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
}

// ── Candidates ───────────────────────────────────────────────────────────

const CAND_SELECT = `
  SELECT c.id, c.job_profile_id, j.title AS job_title, c.reference, c.first_name, c.last_name,
         c.email, c.phone, c.source, c.cv_filename, (c.cv_text IS NOT NULL) AS has_cv,
         c.extracted, c.evidence, c.score, c.status, c.decision_note, c.hired_employee_id,
         c.created_at
    FROM public.hr_candidates c
    LEFT JOIN public.hr_job_profiles j ON j.id = c.job_profile_id`;

export function listCandidates(companyId: string, jobProfileId?: string) {
  const params: unknown[] = [companyId];
  let where = "c.company_id = $1";
  if (jobProfileId) {
    params.push(jobProfileId);
    where += ` AND c.job_profile_id = $${params.length}`;
  }
  return q<HrCandidate>(
    `${CAND_SELECT} WHERE ${where}
      ORDER BY (c.score IS NULL), c.score DESC, c.created_at DESC LIMIT 500`,
    params,
  );
}

export function getCandidate(companyId: string, id: string) {
  return one<HrCandidate>(`${CAND_SELECT} WHERE c.company_id = $1 AND c.id = $2`, [companyId, id]);
}

export async function getCandidateCv(companyId: string, id: string) {
  return one<{ cv_text: string | null; job_profile_id: string | null }>(
    `SELECT cv_text, job_profile_id FROM public.hr_candidates
      WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
}

export async function createCandidate(
  companyId: string,
  values: {
    job_profile_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    cv_filename?: string | null;
    cv_text?: string | null;
  },
) {
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_candidates
       (company_id, job_profile_id, reference, first_name, last_name, email, phone, source,
        cv_filename, cv_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      companyId,
      values.job_profile_id ?? null,
      `CAND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      values.first_name ?? null,
      values.last_name ?? null,
      values.email ?? null,
      values.phone ?? null,
      values.source ?? null,
      values.cv_filename ?? null,
      values.cv_text ?? null,
    ],
  );
  return row!.id;
}

export async function saveCandidateAnalysis(
  companyId: string,
  id: string,
  analysis: { extracted: Record<string, string>; evidence: unknown[]; score: number },
) {
  await q(
    `UPDATE public.hr_candidates
        SET extracted = $3::jsonb, evidence = $4::jsonb, score = $5,
            status = CASE WHEN status = 'new' THEN 'screened' ELSE status END,
            updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [
      companyId,
      id,
      JSON.stringify(analysis.extracted),
      JSON.stringify(analysis.evidence),
      analysis.score,
    ],
  );
}

export async function setCandidateStatus(
  companyId: string,
  id: string,
  status: HrCandidate["status"],
  note?: string | null,
) {
  await q(
    `UPDATE public.hr_candidates SET status = $3, decision_note = COALESCE($4, decision_note),
            updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [companyId, id, status, note ?? null],
  );
}

export async function linkCandidateToEmployee(companyId: string, id: string, employeeId: string) {
  await q(
    `UPDATE public.hr_candidates SET status = 'hired', hired_employee_id = $3, updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [companyId, id, employeeId],
  );
}

export async function deleteCandidate(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_candidates WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

// ── Analytics ────────────────────────────────────────────────────────────

export async function analytics(companyId: string): Promise<HrAnalytics> {
  const [byDept, byStatus, byContract, hires, exits, tenure, misc] = await Promise.all([
    q<{ label: string; value: string }>(
      `SELECT COALESCE(d.name, '—') AS label, count(*)::text AS value
         FROM public.hr_employees e
         LEFT JOIN public.hr_departments d ON d.id = e.department_id
        WHERE e.company_id = $1 AND e.status <> 'terminated'
        GROUP BY 1 ORDER BY count(*) DESC LIMIT 20`,
      [companyId],
    ),
    q<{ label: string; value: string }>(
      `SELECT status AS label, count(*)::text AS value FROM public.hr_employees
        WHERE company_id = $1 GROUP BY 1 ORDER BY 1`,
      [companyId],
    ),
    q<{ label: string; value: string }>(
      `SELECT COALESCE(contract_type, '—') AS label, count(*)::text AS value
         FROM public.hr_employees WHERE company_id = $1 AND status <> 'terminated'
        GROUP BY 1 ORDER BY count(*) DESC LIMIT 20`,
      [companyId],
    ),
    q<{ label: string; value: string }>(
      `SELECT to_char(date_trunc('month', start_date), 'YYYY-MM') AS label, count(*)::text AS value
         FROM public.hr_employees
        WHERE company_id = $1 AND start_date >= current_date - INTERVAL '12 months'
        GROUP BY 1 ORDER BY 1`,
      [companyId],
    ),
    q<{ label: string; value: string }>(
      `SELECT to_char(date_trunc('month', end_date), 'YYYY-MM') AS label, count(*)::text AS value
         FROM public.hr_employees
        WHERE company_id = $1 AND end_date >= current_date - INTERVAL '12 months'
          AND end_date <= current_date
        GROUP BY 1 ORDER BY 1`,
      [companyId],
    ),
    one<{ months: string | null; headcount: string; exits: string }>(
      `SELECT avg(EXTRACT(EPOCH FROM (COALESCE(end_date, current_date) - start_date)) / 2629800)
                AS months,
              count(*) FILTER (WHERE status <> 'terminated') AS headcount,
              count(*) FILTER (WHERE end_date IS NOT NULL
                               AND end_date >= current_date - INTERVAL '12 months'
                               AND end_date <= current_date) AS exits
         FROM public.hr_employees WHERE company_id = $1 AND start_date IS NOT NULL`,
      [companyId],
    ),
    one<{ incidents: string; assigned: string; available: string }>(
      `SELECT (SELECT count(*) FROM public.hr_incidents
                WHERE company_id = $1 AND occurred_on >= current_date - INTERVAL '12 months')
                AS incidents,
              (SELECT count(*) FROM public.hr_assets WHERE company_id = $1 AND status = 'assigned')
                AS assigned,
              (SELECT count(*) FROM public.hr_assets WHERE company_id = $1 AND status = 'available')
                AS available`,
      [companyId],
    ),
  ]);

  const headcount = n(tenure?.headcount);
  const exitCount = n(tenure?.exits);
  const map = (rows: Array<{ label: string; value: string }>) =>
    rows.map((r) => ({ label: r.label, value: n(r.value) }));

  return {
    headcountByDepartment: map(byDept),
    headcountByStatus: map(byStatus),
    contractsByType: map(byContract),
    hiresByMonth: map(hires),
    exitsByMonth: map(exits),
    averageTenureMonths: Math.round(n(tenure?.months) * 10) / 10,
    turnover12m: headcount > 0 ? Math.round((exitCount / headcount) * 1000) / 10 : 0,
    incidents12m: n(misc?.incidents),
    assetsAssigned: n(misc?.assigned),
    assetsAvailable: n(misc?.available),
  };
}

// ── Alerts (derived, never invented) ─────────────────────────────────────

export async function alerts(companyId: string): Promise<HrAlert[]> {
  const [contracts, docs, tasks, missing, onboarding] = await Promise.all([
    q<{ id: string; employee_no: string; name: string; end_date: string; days: string }>(
      `SELECT id, employee_no, concat_ws(' ', first_name, last_name) AS name, end_date::text,
              (end_date - current_date)::text AS days
         FROM public.hr_employees
        WHERE company_id = $1 AND end_date IS NOT NULL
          AND end_date BETWEEN current_date - 7 AND current_date + 60
        ORDER BY end_date LIMIT 50`,
      [companyId],
    ),
    q<{ id: string; title: string; valid_until: string; employee_no: string | null }>(
      `SELECT d.id, d.title, d.valid_until::text, e.employee_no
         FROM public.hr_documents d
         LEFT JOIN public.hr_employees e ON e.id = d.employee_id
        WHERE d.company_id = $1 AND d.valid_until IS NOT NULL
          AND d.valid_until <= current_date + 60
        ORDER BY d.valid_until LIMIT 50`,
      [companyId],
    ),
    q<{ id: string; title: string; due_date: string; employee_no: string | null }>(
      `SELECT t.id, t.title, t.due_date::text, e.employee_no
         FROM public.hr_tasks t
         LEFT JOIN public.hr_employees e ON e.id = t.employee_id
        WHERE t.company_id = $1 AND t.status IN ('pending','in_progress')
          AND t.due_date IS NOT NULL AND t.due_date < current_date
        ORDER BY t.due_date LIMIT 50`,
      [companyId],
    ),
    q<{ id: string; employee_no: string; name: string }>(
      `SELECT id, employee_no, concat_ws(' ', first_name, last_name) AS name
         FROM public.hr_employees
        WHERE company_id = $1 AND status <> 'terminated'
          AND (start_date IS NULL OR position_id IS NULL OR contract_type IS NULL)
        ORDER BY employee_no LIMIT 50`,
      [companyId],
    ),
    q<{ id: string; employee_no: string; name: string; start_date: string | null }>(
      `SELECT id, employee_no, concat_ws(' ', first_name, last_name) AS name, start_date::text
         FROM public.hr_employees
        WHERE company_id = $1 AND status = 'onboarding'
          AND (start_date IS NULL OR start_date <= current_date)
        ORDER BY employee_no LIMIT 50`,
      [companyId],
    ),
  ]);

  const out: HrAlert[] = [];
  for (const c of contracts) {
    const days = Number(c.days);
    out.push({
      id: `contract-${c.id}`,
      level: days <= 14 ? "critical" : "warning",
      title: `${c.employee_no} · ${c.name}`,
      detail: `contract end ${c.end_date} (${days} days)`,
      employeeId: c.id,
    });
  }
  for (const d of docs) {
    out.push({
      id: `doc-${d.id}`,
      level: new Date(d.valid_until) <= new Date() ? "critical" : "warning",
      title: `${d.employee_no ?? "—"} · ${d.title}`,
      detail: `document valid until ${d.valid_until}`,
    });
  }
  for (const t of tasks) {
    out.push({
      id: `task-${t.id}`,
      level: "critical",
      title: `${t.employee_no ?? "—"} · ${t.title}`,
      detail: `task overdue since ${t.due_date}`,
    });
  }
  for (const m of missing) {
    out.push({
      id: `missing-${m.id}`,
      level: "info",
      title: `${m.employee_no} · ${m.name}`,
      detail: "incomplete employee record",
      employeeId: m.id,
    });
  }
  for (const o of onboarding) {
    out.push({
      id: `onb-${o.id}`,
      level: "warning",
      title: `${o.employee_no} · ${o.name}`,
      detail: `still in onboarding${o.start_date ? ` since ${o.start_date}` : ""}`,
      employeeId: o.id,
    });
  }
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]).slice(0, 120);
}
