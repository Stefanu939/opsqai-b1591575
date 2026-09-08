// OPSQAI HR Intelligence — grounded assistant + employee intelligence.
//
// The assistant answers questions about the company's OWN HR data. It first
// computes deterministic facts in SQL (counts, lists, expiries) and then lets
// the model phrase an answer strictly from those facts. Nothing outside the
// fact sheet may be used; if the facts do not cover the question, it says so.

import { resolveChatModel } from "@/lib/ai-provider.server";
import { hrQuery as q, hrQueryOne as one } from "./db.server";

type Lang = "en" | "de" | "ro";

async function factSheet(companyId: string) {
  const [counts, expiring, overdue, onboarding, offboarding, docs, requests, training, compliance, incidents, depts, changes] =
    await Promise.all([
      one<Record<string, string>>(
        `SELECT count(*) FILTER (WHERE status = 'active') AS active,
                count(*) FILTER (WHERE status = 'onboarding') AS onboarding,
                count(*) FILTER (WHERE status = 'offboarding') AS offboarding,
                count(*) FILTER (WHERE status = 'leave') AS on_leave,
                count(*) FILTER (WHERE status = 'terminated') AS terminated,
                count(*) FILTER (WHERE start_date >= current_date - 30 AND status <> 'terminated') AS new_30d
           FROM public.hr_employees WHERE company_id = $1`,
        [companyId],
      ),
      q<{ employee_no: string; name: string; end_date: string }>(
        `SELECT employee_no, concat_ws(' ', first_name, last_name) AS name, end_date::text
           FROM public.hr_employees WHERE company_id = $1 AND status <> 'terminated'
            AND end_date BETWEEN current_date AND current_date + 60 ORDER BY end_date LIMIT 20`,
        [companyId],
      ),
      q<{ title: string; employee_no: string | null; due_date: string }>(
        `SELECT t.title, e.employee_no, t.due_date::text FROM public.hr_tasks t
           LEFT JOIN public.hr_employees e ON e.id = t.employee_id
          WHERE t.company_id = $1 AND t.status IN ('pending','in_progress') AND t.due_date < current_date
          ORDER BY t.due_date LIMIT 20`,
        [companyId],
      ),
      q<{ employee_no: string; name: string; start_date: string | null; open: string; done: string }>(
        `SELECT e.employee_no, concat_ws(' ', e.first_name, e.last_name) AS name, e.start_date::text,
                count(t.id) FILTER (WHERE t.status IN ('pending','in_progress'))::text AS open,
                count(t.id) FILTER (WHERE t.status = 'done')::text AS done
           FROM public.hr_employees e LEFT JOIN public.hr_tasks t ON t.employee_id = e.id AND t.category = 'onboarding'
          WHERE e.company_id = $1 AND e.status = 'onboarding' GROUP BY e.id ORDER BY e.start_date LIMIT 20`,
        [companyId],
      ),
      q<{ employee_no: string; name: string; end_date: string | null; open: string }>(
        `SELECT e.employee_no, concat_ws(' ', e.first_name, e.last_name) AS name, e.end_date::text,
                count(t.id) FILTER (WHERE t.status IN ('pending','in_progress'))::text AS open
           FROM public.hr_employees e LEFT JOIN public.hr_tasks t ON t.employee_id = e.id AND t.category = 'offboarding'
          WHERE e.company_id = $1 AND e.status = 'offboarding' GROUP BY e.id ORDER BY e.end_date LIMIT 20`,
        [companyId],
      ),
      q<{ title: string; employee_no: string | null; valid_until: string; status: string }>(
        `SELECT d.title, e.employee_no, d.valid_until::text, d.status FROM public.hr_documents d
           LEFT JOIN public.hr_employees e ON e.id = d.employee_id
          WHERE d.company_id = $1 AND d.valid_until IS NOT NULL AND d.valid_until <= current_date + 60
          ORDER BY d.valid_until LIMIT 20`,
        [companyId],
      ),
      q<{ title: string; kind: string; employee_no: string | null; status: string }>(
        `SELECT r.title, r.kind, e.employee_no, r.status FROM public.hr_requests r
           LEFT JOIN public.hr_employees e ON e.id = r.employee_id
          WHERE r.company_id = $1 AND r.status IN ('open','in_review') ORDER BY r.created_at LIMIT 20`,
        [companyId],
      ),
      q<{ title: string; employee_no: string; valid_until: string | null; status: string }>(
        `SELECT t.title, e.employee_no, r.valid_until::text, r.status FROM public.hr_training_records r
           JOIN public.hr_trainings t ON t.id = r.training_id JOIN public.hr_employees e ON e.id = r.employee_id
          WHERE r.company_id = $1 AND (r.status = 'planned' OR (r.valid_until IS NOT NULL AND r.valid_until < current_date + 30))
          ORDER BY r.valid_until NULLS LAST LIMIT 20`,
        [companyId],
      ),
      q<{ title: string; employee_no: string | null; due_date: string | null }>(
        `SELECT c.title, e.employee_no, c.due_date::text FROM public.hr_compliance_items c
           LEFT JOIN public.hr_employees e ON e.id = c.employee_id
          WHERE c.company_id = $1 AND c.status = 'open' ORDER BY c.due_date NULLS LAST LIMIT 20`,
        [companyId],
      ),
      q<{ kind: string; severity: string; title: string; employee_no: string | null; occurred_on: string }>(
        `SELECT i.kind, i.severity, i.title, e.employee_no, i.occurred_on::text FROM public.hr_incidents i
           LEFT JOIN public.hr_employees e ON e.id = i.employee_id
          WHERE i.company_id = $1 AND i.occurred_on >= current_date - 90 ORDER BY i.occurred_on DESC LIMIT 20`,
        [companyId],
      ),
      q<{ department: string; headcount: string }>(
        `SELECT COALESCE(d.name, '—') AS department, count(*)::text AS headcount FROM public.hr_employees e
           LEFT JOIN public.hr_departments d ON d.id = e.department_id
          WHERE e.company_id = $1 AND e.status <> 'terminated' GROUP BY 1 ORDER BY 2 DESC`,
        [companyId],
      ),
      q<{ kind: string; employee_no: string; to_position: string | null; effective_on: string }>(
        `SELECT p.kind, e.employee_no, p.to_position, p.effective_on::text FROM public.hr_position_changes p
           JOIN public.hr_employees e ON e.id = p.employee_id
          WHERE p.company_id = $1 AND p.effective_on >= current_date - 180 ORDER BY p.effective_on DESC LIMIT 20`,
        [companyId],
      ),
    ]);
  return { counts, expiring, overdue, onboarding, offboarding, docs, requests, training, compliance, incidents, depts, changes };
}

export async function answerHrQuestion(companyId: string, question: string, language: Lang) {
  const facts = await factSheet(companyId);
  const L = language.toUpperCase();
  const notCovered = { EN: "The HR data does not contain this information.", DE: "Die HR-Daten enthalten diese Information nicht.", RO: "Datele HR nu conțin această informație." }[L] ?? "";
  const { generateText } = await import("ai");
  const { text } = await generateText({
    model: resolveChatModel("chat"),
    temperature: 0,
    system: `You are the HR assistant of one company. Answer ONLY from the FACT SHEET (JSON). It is the complete
truth for today. Never invent people, numbers or dates. If the fact sheet does not cover the question, answer exactly:
"${notCovered}". Answer in ${L}, concise, with employee numbers where relevant. Do not give legal advice;
you may point to the Compliance or Policies workspace. Never recommend hiring, firing or disciplining anyone.`,
    prompt: `FACT SHEET:\n${JSON.stringify(facts)}\n\nQUESTION: ${question}`,
  });
  return { answer: text.trim().slice(0, 4000), facts };
}

/** Deterministic employee-level signals (no AI): who needs attention and why. */
export async function employeeIntelligence(companyId: string) {
  const rows = await q<{
    id: string;
    employee_no: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    overdue_tasks: string;
    open_tasks: string;
    incidents_12m: string;
    warnings_12m: string;
    expired_trainings: string;
    missing_docs: string;
    open_compliance: string;
    tenure_months: string | null;
  }>(
    `SELECT e.id, e.employee_no, concat_ws(' ', e.first_name, e.last_name) AS name, e.status,
            e.start_date::text, e.end_date::text,
            (SELECT count(*) FROM public.hr_tasks t WHERE t.employee_id = e.id AND t.status IN ('pending','in_progress') AND t.due_date < current_date)::text AS overdue_tasks,
            (SELECT count(*) FROM public.hr_tasks t WHERE t.employee_id = e.id AND t.status IN ('pending','in_progress'))::text AS open_tasks,
            (SELECT count(*) FROM public.hr_incidents i WHERE i.employee_id = e.id AND i.occurred_on >= current_date - 365)::text AS incidents_12m,
            (SELECT count(*) FROM public.hr_incidents i WHERE i.employee_id = e.id AND i.kind = 'warning' AND i.occurred_on >= current_date - 365)::text AS warnings_12m,
            (SELECT count(*) FROM public.hr_training_records r WHERE r.employee_id = e.id AND r.status = 'completed' AND r.valid_until < current_date)::text AS expired_trainings,
            (CASE WHEN NOT EXISTS (SELECT 1 FROM public.hr_documents d WHERE d.employee_id = e.id AND d.kind = 'contract' AND d.status IN ('approved','file')) THEN 1 ELSE 0 END)::text AS missing_docs,
            (SELECT count(*) FROM public.hr_compliance_items c WHERE c.employee_id = e.id AND c.status = 'open')::text AS open_compliance,
            CASE WHEN e.start_date IS NULL THEN NULL ELSE ((COALESCE(e.end_date, current_date) - e.start_date) / 30.44)::numeric(8,1)::text END AS tenure_months
       FROM public.hr_employees e
      WHERE e.company_id = $1 AND e.status <> 'terminated'
      ORDER BY e.employee_no LIMIT 1000`,
    [companyId],
  );
  const n = (v: string | null) => Number(v ?? 0);
  return rows
    .map((r) => {
      const signals: Array<{ key: string; level: "critical" | "warning" | "info"; value: number }> = [];
      if (n(r.overdue_tasks) > 0) signals.push({ key: "overdueTasks", level: "critical", value: n(r.overdue_tasks) });
      if (n(r.warnings_12m) > 0) signals.push({ key: "warnings", level: n(r.warnings_12m) > 1 ? "critical" : "warning", value: n(r.warnings_12m) });
      if (n(r.expired_trainings) > 0) signals.push({ key: "expiredTrainings", level: "warning", value: n(r.expired_trainings) });
      if (n(r.missing_docs) > 0) signals.push({ key: "missingContract", level: "warning", value: 1 });
      if (n(r.open_compliance) > 0) signals.push({ key: "openCompliance", level: "info", value: n(r.open_compliance) });
      if (r.end_date && new Date(r.end_date).getTime() - Date.now() < 60 * 86_400_000) signals.push({ key: "contractEnding", level: "critical", value: 1 });
      if (r.status === "onboarding" && r.start_date && Date.now() - new Date(r.start_date).getTime() > 90 * 86_400_000)
        signals.push({ key: "onboardingStalled", level: "warning", value: 1 });
      if (r.tenure_months && Number(r.tenure_months) >= 5 && Number(r.tenure_months) <= 6 && r.status === "active")
        signals.push({ key: "probationEnding", level: "info", value: 1 });
      const attention = signals.reduce((s, x) => s + (x.level === "critical" ? 3 : x.level === "warning" ? 2 : 1), 0);
      return {
        id: r.id,
        employee_no: r.employee_no,
        name: r.name,
        status: r.status,
        tenureMonths: r.tenure_months ? Number(r.tenure_months) : null,
        openTasks: n(r.open_tasks),
        incidents12m: n(r.incidents_12m),
        signals,
        attention,
      };
    })
    .sort((a, b) => b.attention - a.attention);
}
