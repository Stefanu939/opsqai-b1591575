import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AuditGapClusterRow,
  AuditKnowledgeSignalRow,
  AuditLearnerSignalRow,
  IAiAuditRepository,
  JsonLike,
} from "@/lib/providers/interfaces";

const LOW_CONFIDENCE = 0.55;

export function createSupabaseAiAuditRepository(
  client: SupabaseClient<Database>,
): IAiAuditRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;

  return {
    async list(companyId, limit) {
      const { data, error } = await client
        .from("ai_audits")
        .select("id,score,maturity,passed,warnings,critical,summary,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        score: r.score,
        maturity: r.maturity,
        passed: r.passed,
        warnings: r.warnings,
        critical: r.critical,
        summary: JSON.parse(JSON.stringify(r.summary)) as JsonLike,
        createdAt: r.created_at,
      }));
    },

    async create(input) {
      const { data, error } = await client
        .from("ai_audits")
        .insert({
          company_id: input.companyId,
          requested_by: input.requestedBy,
          score: input.score,
          maturity: input.maturity,
          summary: input.summary,
          passed: input.passed,
          warnings: input.warnings,
          critical: input.critical,
        } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async gapClusters(companyId, limit): Promise<AuditGapClusterRow[]> {
      const { data, error } = await sb
        .from("knowledge_gaps")
        .select("id,question_sample,occurrences,status,last_seen,confidence,departments(name)")
        .eq("company_id", companyId)
        .order("occurrences", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        id: r.id ?? null,
        question: r.question_sample ?? "",
        occurrences: Number(r.occurrences ?? 0),
        status: r.status ?? "open",
        departmentName: r.departments?.name ?? null,
        lastSeen: r.last_seen ?? new Date().toISOString(),
        confidence: r.confidence == null ? null : Number(r.confidence),
      }));
    },

    async learnerSignals(companyId, limit): Promise<AuditLearnerSignalRow[]> {
      const [profiles, progress, enrollments, messages, assistant, quizzes] = await Promise.all([
        sb.from("profiles").select("user_id,first_name,last_name,full_name,department").eq("company_id", companyId),
        sb.from("academy_lesson_progress").select("user_id,time_spent_seconds").eq("company_id", companyId),
        sb.from("academy_enrollments").select("user_id,status,started_at,completed_at,due_at").eq("company_id", companyId),
        sb.from("messages").select("user_id,created_at,role").eq("company_id", companyId).eq("role", "user"),
        sb.from("messages").select("user_id,confidence,role").eq("company_id", companyId).eq("role", "assistant"),
        sb.from("academy_quiz_attempts").select("user_id,score,passed").eq("company_id", companyId),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (profiles.data ?? []) as any[];
      const now = Date.now();
      const out: AuditLearnerSignalRow[] = [];

      for (const p of rows) {
        const uid = p.user_id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const myEnrol = ((enrollments.data ?? []) as any[]).filter((e) => e.user_id === uid);
        const windows = myEnrol
          .filter((e) => e.started_at)
          .map((e) => ({
            from: new Date(e.started_at).getTime(),
            to: e.completed_at ? new Date(e.completed_at).getTime() : now,
          }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const asked = ((messages.data ?? []) as any[]).filter((m) => {
          if (m.user_id !== uid) return false;
          const t = new Date(m.created_at).getTime();
          return windows.some((w) => t >= w.from && t <= w.to);
        }).length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mine = ((assistant.data ?? []) as any[]).filter(
          (m) => m.user_id === uid && m.confidence != null,
        );
        const avgConfidence = mine.length
          ? mine.reduce((s, m) => s + Number(m.confidence), 0) / mine.length
          : 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const myQuiz = ((quizzes.data ?? []) as any[]).filter((q) => q.user_id === uid);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seconds = ((progress.data ?? []) as any[])
          .filter((r) => r.user_id === uid)
          .reduce((s, r) => s + Number(r.time_spent_seconds ?? 0), 0);

        const overdue = myEnrol.filter(
          (e) => e.status !== "completed" && e.due_at && new Date(e.due_at).getTime() < now,
        ).length;
        const active = myEnrol.filter((e) => e.status === "assigned" || e.status === "in_progress").length;

        if (asked === 0 && active === 0 && overdue === 0 && myQuiz.length === 0) continue;

        out.push({
          userId: uid,
          name:
            (p.full_name as string) ||
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            "Unknown",
          department: p.department ?? null,
          questionsWhileLearning: asked,
          learningSeconds: seconds,
          lowConfidenceQuestions: mine.filter((m) => Number(m.confidence) < LOW_CONFIDENCE).length,
          avgConfidence,
          activeEnrollments: active,
          overdueEnrollments: overdue,
          completedEnrollments: myEnrol.filter((e) => e.status === "completed").length,
          avgQuizScore: myQuiz.length
            ? Math.round(myQuiz.reduce((s, q) => s + Number(q.score ?? 0), 0) / myQuiz.length)
            : null,
          failedQuizAttempts: myQuiz.filter((q) => q.passed === false).length,
        });
      }

      return out
        .sort((a, b) => b.questionsWhileLearning - a.questionsWhileLearning)
        .slice(0, limit);
    },

    async knowledgeSignal(companyId): Promise<AuditKnowledgeSignalRow> {
      const [docs, faqs, courses] = await Promise.all([
        sb
          .from("knowledge_documents")
          .select(
            "status,category,created_at,updated_at,information_updated_at,last_reviewed_at,review_interval_days",
          )
          .eq("company_id", companyId)
          .eq("is_active", true),
        sb.from("faqs").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        sb.from("academy_learning_paths").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (docs.data ?? []) as any[];
      const categories: Record<string, number> = {};
      for (const r of rows) {
        const key = String(r.category ?? "general");
        categories[key] = (categories[key] ?? 0) + 1;
      }
      return {
        documents: rows.length,
        readyDocuments: rows.filter((r) => r.status === "ready").length,
        staleDocuments: rows.filter((r) => r.status !== "ready").length,
        faqs: faqs.count ?? 0,
        courses: courses.count ?? 0,
        categories,
      };
    },
  };
}
