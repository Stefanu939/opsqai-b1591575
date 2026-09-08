// OPSQAI HR — data access for the workspace entities added in 0044:
// position changes, equipment packages, policies, requests, knowledge,
// trainings and compliance. Company scope on every statement.

import { hrQuery as q, hrQueryOne as one } from "./db.server";
import type {
  HrAssetPackage,
  HrComplianceItem,
  HrKnowledgeArticle,
  HrPolicy,
  HrPositionChange,
  HrRequest,
  HrTraining,
  HrTrainingRecord,
} from "./types-ws";

const EMP = `LEFT JOIN public.hr_employees e ON e.id = x.employee_id`;
const EMP_COLS = `e.employee_no, NULLIF(concat_ws(' ', e.first_name, e.last_name), '') AS employee_name`;

// ── Position changes ─────────────────────────────────────────────────────

export function listPositionChanges(companyId: string, employeeId?: string) {
  const params: unknown[] = [companyId];
  let where = "x.company_id = $1";
  if (employeeId) {
    params.push(employeeId);
    where += ` AND x.employee_id = $${params.length}`;
  }
  return q<HrPositionChange>(
    `SELECT x.id, x.employee_id, ${EMP_COLS}, x.kind, x.from_position, x.to_position,
            x.criteria, x.reason, x.effective_on, x.decided_by, x.created_at
       FROM public.hr_position_changes x ${EMP}
      WHERE ${where} ORDER BY x.effective_on DESC, x.created_at DESC LIMIT 300`,
    params,
  );
}

export async function recordPositionChange(
  companyId: string,
  values: {
    employee_id: string;
    kind: "promote" | "demote" | "transfer";
    to_position_id?: string | null;
    to_position?: string | null;
    criteria: Array<{ label: string; met: boolean; note?: string | null }>;
    reason?: string | null;
    effective_on?: string | null;
  },
  decidedBy: string,
) {
  const current = await one<{ position_id: string | null; position: string | null }>(
    `SELECT e.position_id, p.name AS position FROM public.hr_employees e
       LEFT JOIN public.hr_positions p ON p.id = e.position_id
      WHERE e.company_id = $1 AND e.id = $2`,
    [companyId, values.employee_id],
  );
  await q(
    `INSERT INTO public.hr_position_changes
       (company_id, employee_id, kind, from_position_id, to_position_id, from_position, to_position,
        criteria, reason, effective_on, decided_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,COALESCE($10, current_date),$11)`,
    [
      companyId,
      values.employee_id,
      values.kind,
      current?.position_id ?? null,
      values.to_position_id ?? null,
      current?.position ?? null,
      values.to_position ?? null,
      JSON.stringify(values.criteria),
      values.reason ?? null,
      values.effective_on ?? null,
      decidedBy,
    ],
  );
  if (values.to_position_id) {
    await q(
      `UPDATE public.hr_employees SET position_id = $3, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.employee_id, values.to_position_id],
    );
  }
}

// ── Equipment packages ───────────────────────────────────────────────────

export function listAssetPackages(companyId: string) {
  return q<HrAssetPackage>(
    `SELECT id, name, category, items, updated_at FROM public.hr_asset_packages
      WHERE company_id = $1 ORDER BY category, name`,
    [companyId],
  );
}

export async function saveAssetPackage(
  companyId: string,
  values: { id?: string; name: string; category: string; items: Array<{ name: string; category: string }> },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_asset_packages SET name = $3, category = $4, items = $5::jsonb, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.id, values.name, values.category, JSON.stringify(values.items)],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_asset_packages (company_id, name, category, items)
     VALUES ($1,$2,$3,$4::jsonb) RETURNING id`,
    [companyId, values.name, values.category, JSON.stringify(values.items)],
  );
  return row!.id;
}

export async function deleteAssetPackage(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_asset_packages WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

/** Create one asset per package item and assign all of them to the employee. */
export async function issuePackage(
  companyId: string,
  items: Array<{ name: string; category: string }>,
  employeeId: string | null,
) {
  let created = 0;
  for (const it of items) {
    const row = await one<{ id: string }>(
      `INSERT INTO public.hr_assets (company_id, name, category, status)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [companyId, it.name, it.category, employeeId ? "assigned" : "available"],
    );
    if (employeeId && row) {
      await q(
        `INSERT INTO public.hr_asset_assignments (company_id, asset_id, employee_id) VALUES ($1,$2,$3)`,
        [companyId, row.id, employeeId],
      );
    }
    created += 1;
  }
  return created;
}

// ── Policies ─────────────────────────────────────────────────────────────

export function listPolicies(companyId: string) {
  return q<HrPolicy>(
    `SELECT p.id, p.title, p.category, p.body, p.version, p.status, p.requires_ack, p.effective_from,
            p.country, p.updated_at,
            (SELECT count(DISTINCT a.employee_id) FROM public.hr_policy_acks a
              WHERE a.policy_id = p.id AND a.version = p.version)::int AS ack_count,
            (SELECT count(*) FROM public.hr_employees e
              WHERE e.company_id = p.company_id AND e.status IN ('active','onboarding'))::int AS headcount
       FROM public.hr_policies p WHERE p.company_id = $1
      ORDER BY (p.status = 'archived'), p.category, p.title`,
    [companyId],
  );
}

export async function savePolicy(
  companyId: string,
  values: {
    id?: string;
    title: string;
    category: string;
    body: string;
    status?: HrPolicy["status"];
    requires_ack?: boolean;
    effective_from?: string | null;
    country?: string | null;
    bumpVersion?: boolean;
  },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_policies
          SET title = $3, category = $4, body = $5, status = COALESCE($6, status),
              requires_ack = COALESCE($7, requires_ack), effective_from = $8, country = $9,
              version = version + CASE WHEN $10::boolean THEN 1 ELSE 0 END, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [
        companyId,
        values.id,
        values.title,
        values.category,
        values.body,
        values.status ?? null,
        values.requires_ack ?? null,
        values.effective_from ?? null,
        values.country ?? null,
        values.bumpVersion ?? false,
      ],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_policies (company_id, title, category, body, status, requires_ack, effective_from, country)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      companyId,
      values.title,
      values.category,
      values.body,
      values.status ?? "draft",
      values.requires_ack ?? false,
      values.effective_from ?? null,
      values.country ?? null,
    ],
  );
  return row!.id;
}

export async function deletePolicy(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_policies WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

export function listPolicyAcks(companyId: string, policyId: string) {
  return q<{ employee_id: string; employee_no: string; employee_name: string; version: number; acknowledged_at: string }>(
    `SELECT x.employee_id, ${EMP_COLS}, x.version, x.acknowledged_at
       FROM public.hr_policy_acks x ${EMP}
      WHERE x.company_id = $1 AND x.policy_id = $2 ORDER BY x.acknowledged_at DESC`,
    [companyId, policyId],
  );
}

export async function acknowledgePolicy(
  companyId: string,
  policyId: string,
  employeeIds: string[],
  recordedBy: string,
) {
  const p = await one<{ version: number }>(
    `SELECT version FROM public.hr_policies WHERE company_id = $1 AND id = $2`,
    [companyId, policyId],
  );
  if (!p) throw new Error("Policy not found.");
  for (const employeeId of employeeIds) {
    await q(
      `INSERT INTO public.hr_policy_acks (company_id, policy_id, employee_id, version, recorded_by)
       SELECT $1,$2,$3,$4,$5
        WHERE NOT EXISTS (SELECT 1 FROM public.hr_policy_acks
                           WHERE policy_id = $2 AND employee_id = $3 AND version = $4)`,
      [companyId, policyId, employeeId, p.version, recordedBy],
    );
  }
}

// ── Requests ─────────────────────────────────────────────────────────────

export function listRequests(companyId: string, opts: { employeeId?: string; openOnly?: boolean } = {}) {
  const params: unknown[] = [companyId];
  const where = ["x.company_id = $1"];
  if (opts.employeeId) {
    params.push(opts.employeeId);
    where.push(`x.employee_id = $${params.length}`);
  }
  if (opts.openOnly) where.push("x.status IN ('open','in_review')");
  return q<HrRequest>(
    `SELECT x.id, x.employee_id, ${EMP_COLS}, x.kind, x.title, x.details, x.from_date, x.to_date,
            x.status, x.decision_note, x.decided_by, x.decided_at, x.created_at
       FROM public.hr_requests x ${EMP}
      WHERE ${where.join(" AND ")}
      ORDER BY (x.status IN ('open','in_review')) DESC, x.created_at DESC LIMIT 500`,
    params,
  );
}

export async function saveRequest(
  companyId: string,
  values: {
    id?: string;
    employee_id?: string | null;
    kind: string;
    title: string;
    details?: string | null;
    from_date?: string | null;
    to_date?: string | null;
  },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_requests SET employee_id = $3, kind = $4, title = $5, details = $6,
              from_date = $7, to_date = $8, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.id, values.employee_id ?? null, values.kind, values.title, values.details ?? null, values.from_date ?? null, values.to_date ?? null],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_requests (company_id, employee_id, kind, title, details, from_date, to_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [companyId, values.employee_id ?? null, values.kind, values.title, values.details ?? null, values.from_date ?? null, values.to_date ?? null],
  );
  return row!.id;
}

export async function decideRequest(
  companyId: string,
  id: string,
  status: HrRequest["status"],
  note: string | null,
  decidedBy: string,
) {
  await q(
    `UPDATE public.hr_requests
        SET status = $3, decision_note = COALESCE($4, decision_note),
            decided_by = CASE WHEN $3 IN ('approved','rejected','done') THEN $5 ELSE decided_by END,
            decided_at = CASE WHEN $3 IN ('approved','rejected','done') THEN now() ELSE decided_at END,
            updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [companyId, id, status, note, decidedBy],
  );
}

export async function deleteRequest(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_requests WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

// ── Knowledge ────────────────────────────────────────────────────────────

export function listKnowledge(companyId: string, search?: string) {
  const params: unknown[] = [companyId];
  let where = "company_id = $1";
  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    where += ` AND (title ILIKE $2 OR body ILIKE $2 OR array_to_string(tags, ' ') ILIKE $2)`;
  }
  return q<HrKnowledgeArticle>(
    `SELECT id, title, category, body, tags, country, updated_at FROM public.hr_knowledge
      WHERE ${where} ORDER BY category, title LIMIT 500`,
    params,
  );
}

export async function saveKnowledge(
  companyId: string,
  values: { id?: string; title: string; category: string; body: string; tags: string[]; country?: string | null },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_knowledge SET title = $3, category = $4, body = $5, tags = $6, country = $7, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.id, values.title, values.category, values.body, values.tags, values.country ?? null],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_knowledge (company_id, title, category, body, tags, country)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [companyId, values.title, values.category, values.body, values.tags, values.country ?? null],
  );
  return row!.id;
}

export async function deleteKnowledge(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_knowledge WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

// ── Trainings ────────────────────────────────────────────────────────────

export function listTrainings(companyId: string) {
  return q<HrTraining>(
    `SELECT t.id, t.title, t.category, t.mandatory, t.valid_months, t.country, t.description, t.updated_at,
            (SELECT count(*) FROM public.hr_training_records r WHERE r.training_id = t.id AND r.status = 'completed'
                AND (r.valid_until IS NULL OR r.valid_until >= current_date))::int AS valid_count,
            (SELECT count(*) FROM public.hr_training_records r WHERE r.training_id = t.id AND r.status = 'planned')::int AS planned_count,
            (SELECT count(*) FROM public.hr_training_records r WHERE r.training_id = t.id
                AND r.status = 'completed' AND r.valid_until IS NOT NULL AND r.valid_until < current_date)::int AS expired_count
       FROM public.hr_trainings t WHERE t.company_id = $1 ORDER BY t.mandatory DESC, t.category, t.title`,
    [companyId],
  );
}

export async function saveTraining(
  companyId: string,
  values: {
    id?: string;
    title: string;
    category: string;
    mandatory: boolean;
    valid_months?: number | null;
    country?: string | null;
    description?: string | null;
  },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_trainings SET title = $3, category = $4, mandatory = $5, valid_months = $6,
              country = $7, description = $8, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.id, values.title, values.category, values.mandatory, values.valid_months ?? null, values.country ?? null, values.description ?? null],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_trainings (company_id, title, category, mandatory, valid_months, country, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [companyId, values.title, values.category, values.mandatory, values.valid_months ?? null, values.country ?? null, values.description ?? null],
  );
  return row!.id;
}

export async function deleteTraining(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_trainings WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

export function listTrainingRecords(companyId: string, opts: { trainingId?: string; employeeId?: string } = {}) {
  const params: unknown[] = [companyId];
  const where = ["x.company_id = $1"];
  if (opts.trainingId) {
    params.push(opts.trainingId);
    where.push(`x.training_id = $${params.length}`);
  }
  if (opts.employeeId) {
    params.push(opts.employeeId);
    where.push(`x.employee_id = $${params.length}`);
  }
  return q<HrTrainingRecord>(
    `SELECT x.id, x.training_id, t.title AS training_title, t.mandatory, x.employee_id, ${EMP_COLS},
            CASE WHEN x.status = 'completed' AND x.valid_until IS NOT NULL AND x.valid_until < current_date
                 THEN 'expired' ELSE x.status END AS status,
            x.planned_on, x.completed_on, x.valid_until, x.score, x.notes, x.created_at
       FROM public.hr_training_records x ${EMP}
       JOIN public.hr_trainings t ON t.id = x.training_id
      WHERE ${where.join(" AND ")}
      ORDER BY (x.status = 'planned') DESC, x.valid_until NULLS LAST, x.created_at DESC LIMIT 1000`,
    params,
  );
}

export async function saveTrainingRecord(
  companyId: string,
  values: {
    id?: string;
    training_id: string;
    employee_id: string;
    status: "planned" | "completed";
    planned_on?: string | null;
    completed_on?: string | null;
    score?: string | null;
    notes?: string | null;
  },
) {
  const t = await one<{ valid_months: number | null }>(
    `SELECT valid_months FROM public.hr_trainings WHERE company_id = $1 AND id = $2`,
    [companyId, values.training_id],
  );
  if (!t) throw new Error("Training not found.");
  const completedOn = values.status === "completed" ? (values.completed_on ?? new Date().toISOString().slice(0, 10)) : null;
  const validUntil =
    completedOn && t.valid_months
      ? new Date(new Date(completedOn).setMonth(new Date(completedOn).getMonth() + t.valid_months)).toISOString().slice(0, 10)
      : null;
  if (values.id) {
    await q(
      `UPDATE public.hr_training_records SET status = $3, planned_on = $4, completed_on = $5, valid_until = $6,
              score = $7, notes = $8, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.id, values.status, values.planned_on ?? null, completedOn, validUntil, values.score ?? null, values.notes ?? null],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_training_records
       (company_id, training_id, employee_id, status, planned_on, completed_on, valid_until, score, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [companyId, values.training_id, values.employee_id, values.status, values.planned_on ?? null, completedOn, validUntil, values.score ?? null, values.notes ?? null],
  );
  return row!.id;
}

export async function deleteTrainingRecord(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_training_records WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

// ── Compliance ───────────────────────────────────────────────────────────

export function listCompliance(companyId: string, opts: { employeeId?: string; openOnly?: boolean } = {}) {
  const params: unknown[] = [companyId];
  const where = ["x.company_id = $1"];
  if (opts.employeeId) {
    params.push(opts.employeeId);
    where.push(`x.employee_id = $${params.length}`);
  }
  if (opts.openOnly) where.push("x.status = 'open'");
  return q<HrComplianceItem>(
    `SELECT x.id, x.item_key, x.title, x.category, x.country, x.employee_id, ${EMP_COLS},
            x.due_date, x.status, x.notes, x.done_at, x.done_by, x.created_at
       FROM public.hr_compliance_items x ${EMP}
      WHERE ${where.join(" AND ")}
      ORDER BY (x.status = 'open') DESC, x.due_date NULLS LAST, x.title LIMIT 1000`,
    params,
  );
}

export async function saveComplianceItem(
  companyId: string,
  values: {
    id?: string;
    item_key?: string | null;
    title: string;
    category: string;
    country?: string | null;
    employee_id?: string | null;
    due_date?: string | null;
    notes?: string | null;
  },
) {
  if (values.id) {
    await q(
      `UPDATE public.hr_compliance_items SET title = $3, category = $4, country = $5, employee_id = $6,
              due_date = $7, notes = $8, updated_at = now()
        WHERE company_id = $1 AND id = $2`,
      [companyId, values.id, values.title, values.category, values.country ?? null, values.employee_id ?? null, values.due_date ?? null, values.notes ?? null],
    );
    return values.id;
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_compliance_items (company_id, item_key, title, category, country, employee_id, due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [companyId, values.item_key ?? null, values.title, values.category, values.country ?? null, values.employee_id ?? null, values.due_date ?? null, values.notes ?? null],
  );
  return row!.id;
}

export async function setComplianceStatus(
  companyId: string,
  id: string,
  status: HrComplianceItem["status"],
  notes: string | null,
  doneBy: string,
) {
  await q(
    `UPDATE public.hr_compliance_items
        SET status = $3, notes = COALESCE($4, notes),
            done_at = CASE WHEN $3 = 'open' THEN NULL ELSE now() END,
            done_by = CASE WHEN $3 = 'open' THEN NULL ELSE $5 END, updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [companyId, id, status, notes, doneBy],
  );
}

export async function deleteComplianceItem(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_compliance_items WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

/** Seed the country library: company-wide items once, per-employee items for every active employee. */
export async function seedCompliance(
  companyId: string,
  country: string,
  defs: Array<{ key: string; category: string; perEmployee: boolean; title: string; dueOffsetDays: number }>,
) {
  let created = 0;
  const employees = await q<{ id: string; start_date: string | null }>(
    `SELECT id, start_date::text FROM public.hr_employees
      WHERE company_id = $1 AND status IN ('onboarding','active')`,
    [companyId],
  );
  for (const d of defs) {
    if (!d.perEmployee) {
      const r = await one<{ id: string }>(
        `INSERT INTO public.hr_compliance_items (company_id, item_key, title, category, country, due_date)
         SELECT $1,$2,$3,$4,$5, current_date + $6::int
          WHERE NOT EXISTS (SELECT 1 FROM public.hr_compliance_items
                             WHERE company_id = $1 AND item_key = $2 AND employee_id IS NULL)
         RETURNING id`,
        [companyId, d.key, d.title, d.category, country, d.dueOffsetDays],
      );
      if (r) created += 1;
      continue;
    }
    for (const e of employees) {
      const r = await one<{ id: string }>(
        `INSERT INTO public.hr_compliance_items (company_id, item_key, title, category, country, employee_id, due_date)
         SELECT $1,$2,$3,$4,$5,$6, COALESCE($7::date, current_date) + $8::int
          WHERE NOT EXISTS (SELECT 1 FROM public.hr_compliance_items
                             WHERE company_id = $1 AND item_key = $2 AND employee_id = $6)
         RETURNING id`,
        [companyId, d.key, d.title, d.category, country, e.id, e.start_date, d.dueOffsetDays],
      );
      if (r) created += 1;
    }
  }
  return created;
}

/** Counts used by the overview and analytics. */
export async function workspaceSignals(companyId: string) {
  const r = await one<{
    open_requests: string;
    policies_pending_ack: string;
    trainings_expired: string;
    trainings_planned: string;
    compliance_open: string;
    compliance_overdue: string;
    position_changes_90d: string;
  }>(
    `SELECT
       (SELECT count(*) FROM public.hr_requests WHERE company_id = $1 AND status IN ('open','in_review')) AS open_requests,
       (SELECT count(*) FROM public.hr_policies p
         WHERE p.company_id = $1 AND p.status = 'published' AND p.requires_ack
           AND (SELECT count(DISTINCT a.employee_id) FROM public.hr_policy_acks a WHERE a.policy_id = p.id AND a.version = p.version)
             < (SELECT count(*) FROM public.hr_employees e WHERE e.company_id = $1 AND e.status IN ('active','onboarding'))) AS policies_pending_ack,
       (SELECT count(*) FROM public.hr_training_records WHERE company_id = $1 AND status = 'completed'
          AND valid_until IS NOT NULL AND valid_until < current_date) AS trainings_expired,
       (SELECT count(*) FROM public.hr_training_records WHERE company_id = $1 AND status = 'planned') AS trainings_planned,
       (SELECT count(*) FROM public.hr_compliance_items WHERE company_id = $1 AND status = 'open') AS compliance_open,
       (SELECT count(*) FROM public.hr_compliance_items WHERE company_id = $1 AND status = 'open'
          AND due_date IS NOT NULL AND due_date < current_date) AS compliance_overdue,
       (SELECT count(*) FROM public.hr_position_changes WHERE company_id = $1
          AND effective_on >= current_date - 90) AS position_changes_90d`,
    [companyId],
  );
  const n = (v: string | undefined) => Number(v ?? 0);
  return {
    openRequests: n(r?.open_requests),
    policiesPendingAck: n(r?.policies_pending_ack),
    trainingsExpired: n(r?.trainings_expired),
    trainingsPlanned: n(r?.trainings_planned),
    complianceOpen: n(r?.compliance_open),
    complianceOverdue: n(r?.compliance_overdue),
    positionChanges90d: n(r?.position_changes_90d),
  };
}
