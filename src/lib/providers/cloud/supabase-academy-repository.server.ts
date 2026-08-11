// Cloud IAcademyRepository — backed by Supabase academy_* tables/RPCs.
// Mirrors the queries previously inlined in academy.functions.ts /
// academy-lms.functions.ts so Self-Hosted can supply its own pg-backed
// implementation without importing @/integrations/supabase/*.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AcademyDepartmentRow,
  AcademyDepartmentUpsertInput,
  AcademyEnrichedEnrollmentRow,
  AcademyEnrollmentPairRow,
  AcademyEnrollmentWithPathRow,
  AcademyEnrollmentWithProfileRow,
  AcademyPathRefRow,
  AcademyAssignTargets,
  AcademyNotificationInput,
  AcademyTrainingSummary,
  AcademyCertificateRow,
  AcademyCertificateUpsertInput,
  AcademyCertificateVerification,
  AcademyChapterRow,
  AcademyChapterUpsertInput,
  AcademyCohortRow,
  AcademyCourseAnalyticsRow,
  AcademyDepartmentPerformanceRow,
  AcademyEnrollmentRow,
  AcademyEnrollmentUpsertInput,
  AcademyHeatmapRow,
  AcademyKpis,
  AcademyLessonProgressRow,
  AcademyLessonProgressUpsertInput,
  AcademyLessonRow,
  AcademyLessonUpsertInput,
  AcademyLessonVersionRow,
  AcademyPathRow,
  AcademyPathUpsertInput,
  AcademyQuizAttemptCreateInput,
  AcademyQuizAttemptGradeInput,
  AcademyQuizAttemptRow,
  AcademyResolveTargetsInput,
  AcademyRetrainingEventCreateInput,
  AcademyRetrainingEventRow,
  AcademySettingsRow,
  AcademySettingsUpsertInput,
  IAcademyRepository,
} from "@/lib/providers/interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<Database> | any;

function mapPath(row: any): AcademyPathRow {
  return {
    id: row.id,
    company_id: row.company_id,
    department_id: row.department_id ?? null,
    department_name: row.academy_departments?.name ?? null,
    title: row.title,
    description: row.description ?? null,
    language: row.language,
    target_role: row.target_role ?? null,
    target_position: row.target_position ?? null,
    experience_level: row.experience_level ?? null,
    employment_type: row.employment_type ?? null,
    mandatory: row.mandatory,
    passing_score: row.passing_score,
    difficulty: row.difficulty,
    publish_status: row.publish_status,
    order_index: row.order_index ?? 0,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function createSupabaseAcademyRepository(client: AnyClient): IAcademyRepository {
  return {
    async listLearningPaths(companyId, filter) {
      let q = client
        .from("academy_learning_paths")
        .select("*, academy_departments(name)")
        .eq("company_id", companyId)
        .order("order_index", { ascending: true });
      if (filter?.departmentId) q = q.eq("department_id", filter.departmentId);
      if (filter?.publishStatus) q = q.eq("publish_status", filter.publishStatus);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapPath);
    },

    async getLearningPath(id) {
      const { data: path, error } = await client
        .from("academy_learning_paths")
        .select("*, academy_departments(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!path) return null;
      const { data: chapters } = await client
        .from("academy_chapters")
        .select("*")
        .eq("path_id", id)
        .order("order_index");
      const chapterIds = (chapters ?? []).map((c: any) => c.id);
      const { data: lessons } = chapterIds.length
        ? await client
            .from("academy_lessons")
            .select("*")
            .in("chapter_id", chapterIds)
            .order("order_index")
        : { data: [] as any[] };
      return {
        path: mapPath(path),
        chapters: (chapters ?? []) as AcademyChapterRow[],
        lessons: (lessons ?? []) as AcademyLessonRow[],
      };
    },

    async upsertLearningPath(input: AcademyPathUpsertInput) {
      const payload = {
        company_id: input.companyId,
        department_id: input.departmentId ?? null,
        title: input.title,
        description: input.description ?? null,
        language: input.language,
        target_role: input.targetRole ?? null,
        target_position: input.targetPosition ?? null,
        experience_level: input.experienceLevel ?? null,
        employment_type: input.employmentType ?? null,
        mandatory: input.mandatory,
        passing_score: input.passingScore,
        difficulty: input.difficulty,
        publish_status: input.publishStatus,
      };
      if (input.id) {
        const { error } = await client
          .from("academy_learning_paths")
          .update(payload)
          .eq("id", input.id);
        if (error) throw new Error(error.message);
        return { id: input.id };
      }
      const { data, error } = await client
        .from("academy_learning_paths")
        .insert({ ...payload, created_by: input.createdBy })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    async deleteLearningPath(id) {
      const { error } = await client.from("academy_learning_paths").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async upsertChapter(input: AcademyChapterUpsertInput) {
      if (input.id) {
        const { error } = await client
          .from("academy_chapters")
          .update({ title: input.title, summary: input.summary ?? null, order_index: input.orderIndex })
          .eq("id", input.id);
        if (error) throw new Error(error.message);
        return { id: input.id };
      }
      const { data, error } = await client
        .from("academy_chapters")
        .insert({
          path_id: input.pathId,
          title: input.title,
          summary: input.summary ?? null,
          order_index: input.orderIndex,
          company_id: input.companyId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    async deleteChapter(id) {
      const { error } = await client.from("academy_chapters").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async getLesson(id) {
      const { data, error } = await client
        .from("academy_lessons")
        .select(
          "*, academy_chapters(id, title, path_id, academy_learning_paths(id, title, passing_score, language))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const chapter = (data as any).academy_chapters;
      const path = chapter?.academy_learning_paths;
      return {
        ...(data as any),
        chapter_path_id: chapter?.path_id,
        chapter_title: chapter?.title,
        path_title: path?.title,
        path_passing_score: path?.passing_score,
        path_language: path?.language,
      } as AcademyLessonRow;
    },

    async upsertLesson(input: AcademyLessonUpsertInput) {
      const payload = {
        company_id: input.companyId,
        chapter_id: input.chapterId,
        title: input.title,
        objectives: input.objectives,
        explanation: input.explanation ?? null,
        examples: input.examples ?? null,
        best_practices: input.bestPractices ?? null,
        summary: input.summary ?? null,
        language: input.language,
        estimated_minutes: input.estimatedMinutes,
        source_document_id: input.sourceDocumentId ?? null,
        source_document_version: input.sourceDocumentVersion ?? null,
        publish_status: input.publishStatus,
        order_index: input.orderIndex,
      };
      if (input.id) {
        const { error } = await client.from("academy_lessons").update(payload).eq("id", input.id);
        if (error) throw new Error(error.message);
        return { id: input.id };
      }
      const { data, error } = await client
        .from("academy_lessons")
        .insert({ ...payload, created_by: input.createdBy })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    async deleteLesson(id) {
      const { error } = await client.from("academy_lessons").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listLessonVersions(lessonId) {
      const { data, error } = await client
        .from("academy_lesson_versions")
        .select("id, lesson_id, version, snapshot, created_at")
        .eq("lesson_id", lessonId)
        .order("version", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyLessonVersionRow[];
    },

    async restoreLessonVersion(lessonId, version) {
      const { data: v } = await client
        .from("academy_lesson_versions")
        .select("snapshot")
        .eq("lesson_id", lessonId)
        .eq("version", version)
        .maybeSingle();
      if (!v) throw new Error("Version not found");
      const s = v.snapshot as any;
      const { error } = await client
        .from("academy_lessons")
        .update({
          title: s.title,
          objectives: s.objectives ?? [],
          explanation: s.explanation,
          examples: s.examples,
          best_practices: s.best_practices,
          summary: s.summary,
        })
        .eq("id", lessonId);
      if (error) throw new Error(error.message);
    },

    async createQuizAttempt(input: AcademyQuizAttemptCreateInput) {
      const { data, error } = await client
        .from("academy_quiz_attempts")
        .insert({
          company_id: input.companyId,
          lesson_id: input.lessonId,
          user_id: input.userId,
          questions: input.questions,
          answers: [],
          score: 0,
          passed: false,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not start quiz attempt");
      return { id: data.id as string };
    },

    async getQuizAttempt(id) {
      const { data, error } = await client
        .from("academy_quiz_attempts")
        .select("id, company_id, lesson_id, user_id, questions, answers, score, passed, duration_seconds, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as AcademyQuizAttemptRow | null;
    },

    async gradeQuizAttempt(id, patch: AcademyQuizAttemptGradeInput) {
      const { error } = await client
        .from("academy_quiz_attempts")
        .update({
          answers: patch.answers,
          score: patch.score,
          passed: patch.passed,
          duration_seconds: patch.durationSeconds ?? null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async enroll(input: AcademyEnrollmentUpsertInput) {
      const { data: existing } = await client
        .from("academy_enrollments")
        .select("id")
        .eq("path_id", input.pathId)
        .eq("user_id", input.userId)
        .maybeSingle();
      if (existing) return { id: existing.id as string, existing: true };
      const { data, error } = await client
        .from("academy_enrollments")
        .insert({
          company_id: input.companyId,
          path_id: input.pathId,
          user_id: input.userId,
          status: input.status ?? "assigned",
          mandatory: input.mandatory,
          priority: input.priority ?? "normal",
          due_at: input.dueAt ?? null,
          assigned_by: input.assignedBy,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string, existing: false };
    },

    async assignEnrollments(rows: AcademyEnrollmentUpsertInput[]) {
      const payload = rows.map((r) => ({
        company_id: r.companyId,
        path_id: r.pathId,
        user_id: r.userId,
        status: r.status ?? "assigned",
        mandatory: r.mandatory,
        priority: r.priority ?? "normal",
        due_at: r.dueAt ?? null,
        assigned_by: r.assignedBy,
      }));
      const { error } = await client
        .from("academy_enrollments")
        .upsert(payload, { onConflict: "path_id,user_id", ignoreDuplicates: false });
      if (error) throw new Error(error.message);
      return { count: payload.length };
    },

    async getEnrollment(id) {
      const { data, error } = await client
        .from("academy_enrollments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as AcademyEnrollmentRow | null;
    },

    async listEnrollmentsByUser(userId) {
      const { data, error } = await client
        .from("academy_enrollments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyEnrollmentRow[];
    },

    async listEnrollmentsByPath(pathId) {
      const { data, error } = await client
        .from("academy_enrollments")
        .select("*")
        .eq("path_id", pathId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyEnrollmentRow[];
    },

    async startEnrollment(id, userId) {
      await client
        .from("academy_enrollments")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .is("started_at", null);
    },

    async completeEnrollment(id) {
      const { error } = await client
        .from("academy_enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async removeEnrollment(id) {
      const { error } = await client.from("academy_enrollments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listLessonProgress(enrollmentId) {
      const { data, error } = await client
        .from("academy_lesson_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId);
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyLessonProgressRow[];
    },

    async upsertLessonProgress(input: AcademyLessonProgressUpsertInput) {
      const { data: existing } = await client
        .from("academy_lesson_progress")
        .select("id, attempts, time_spent_seconds")
        .eq("enrollment_id", input.enrollmentId)
        .eq("lesson_id", input.lessonId)
        .maybeSingle();
      if (existing) {
        const { error } = await client
          .from("academy_lesson_progress")
          .update({
            attempts: input.attempts ?? existing.attempts,
            last_score: input.lastScore ?? null,
            time_spent_seconds: input.timeSpentSeconds ?? existing.time_spent_seconds,
            status: input.status ?? "in_progress",
            notes: input.notes ?? undefined,
            completed_at: input.completedAt ?? null,
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await client.from("academy_lesson_progress").insert({
        company_id: input.companyId,
        enrollment_id: input.enrollmentId,
        lesson_id: input.lessonId,
        user_id: input.userId,
        attempts: input.attempts ?? 1,
        last_score: input.lastScore ?? null,
        time_spent_seconds: input.timeSpentSeconds ?? 0,
        status: input.status ?? "in_progress",
        notes: input.notes ?? null,
        completed_at: input.completedAt ?? null,
        last_activity_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    },

    async saveLessonNotes(input) {
      const { error } = await client.from("academy_lesson_progress").upsert(
        {
          enrollment_id: input.enrollmentId,
          lesson_id: input.lessonId,
          user_id: input.userId,
          company_id: input.companyId,
          notes: input.notes,
          last_activity_at: new Date().toISOString(),
        },
        { onConflict: "enrollment_id,lesson_id" },
      );
      if (error) throw new Error(error.message);
    },

    async listCertificatesByUser(userId) {
      const { data, error } = await client
        .from("academy_certificates")
        .select("*, academy_learning_paths(title)")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((c: any) => ({ ...c, path_title: c.academy_learning_paths?.title }));
    },

    async getCertificate(id) {
      const { data, error } = await client
        .from("academy_certificates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as AcademyCertificateRow | null;
    },

    async upsertCertificate(input: AcademyCertificateUpsertInput) {
      const { data: existing } = await client
        .from("academy_certificates")
        .select("*")
        .eq("enrollment_id", input.enrollmentId)
        .maybeSingle();
      if (existing) {
        const { error } = await client
          .from("academy_certificates")
          .update({ final_score: input.finalScore })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        return { ...(existing as any), final_score: input.finalScore } as AcademyCertificateRow;
      }
      const { data, error } = await client
        .from("academy_certificates")
        .insert({
          company_id: input.companyId,
          enrollment_id: input.enrollmentId,
          path_id: input.pathId,
          user_id: input.userId,
          final_score: input.finalScore,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as AcademyCertificateRow;
    },

    async markCertificatePdf(id, pdfPath, qrPayload) {
      const { error } = await client
        .from("academy_certificates")
        .update({ pdf_path: pdfPath, qr_payload: qrPayload })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async verifyCertificate(code) {
      const { data, error } = await client.rpc("academy_verify_certificate", { _code: code });
      if (error) throw new Error(error.message);
      return (data ?? null) as AcademyCertificateVerification | null;
    },

    async listRetrainingEvents(companyId) {
      const { data, error } = await client
        .from("academy_retraining_events")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyRetrainingEventRow[];
    },

    async createRetrainingEvent(input: AcademyRetrainingEventCreateInput) {
      const { data, error } = await client
        .from("academy_retraining_events")
        .insert({
          company_id: input.companyId,
          path_id: input.pathId,
          user_id: input.userId,
          reason: input.reason,
          triggered_by: input.triggeredBy ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    async getSettings(companyId) {
      const { data, error } = await client
        .from("academy_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as AcademySettingsRow | null;
    },

    async saveSettings(input: AcademySettingsUpsertInput) {
      const { error } = await client.from("academy_settings").upsert(
        {
          company_id: input.companyId,
          passing_score: input.passingScore,
          quiz_min: input.quizMin,
          quiz_max: input.quizMax,
          default_difficulty: input.defaultDifficulty,
          languages: input.languages,
        },
        { onConflict: "company_id" },
      );
      if (error) throw new Error(error.message);
    },

    async resolveTargets(input: AcademyResolveTargetsInput) {
      const { data, error } = await client.rpc("academy_resolve_targets", {
        _company_id: input.companyId,
        _user_ids: input.userIds,
        _department_ids: input.departmentIds,
        _roles: input.roles,
        _entire_company: input.entireCompany,
      });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ user_id: string }>).map((t) => t.user_id);
    },

    async getKpis(companyId) {
      const { data, error } = await client.rpc("academy_kpis", { p_company: companyId });
      if (error) throw new Error(error.message);
      return (data ?? {}) as AcademyKpis;
    },

    async getHeatmap(companyId) {
      const { data, error } = await client.rpc("academy_heatmap", { p_company: companyId });
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyHeatmapRow[];
    },

    async getDepartmentPerformance(companyId) {
      const { data, error } = await client.rpc("academy_department_performance", { p_company: companyId });
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyDepartmentPerformanceRow[];
    },

    async getCourseAnalytics(companyId): Promise<AcademyCourseAnalyticsRow[]> {
      const { data: paths, error } = await client
        .from("academy_learning_paths")
        .select("id, title, mandatory, publish_status")
        .eq("company_id", companyId);
      if (error) throw new Error(error.message);
      if (!paths?.length) return [];
      const pathIds = paths.map((p: any) => p.id);
      const [enrollRes, quizRes, certRes] = await Promise.all([
        client
          .from("academy_enrollments")
          .select("path_id, status, due_at, started_at, completed_at")
          .in("path_id", pathIds),
        client
          .from("academy_quiz_attempts")
          .select("score, academy_enrollments!inner(path_id)")
          .in("academy_enrollments.path_id", pathIds),
        client.from("academy_certificates").select("path_id").in("path_id", pathIds),
      ]);
      const now = Date.now();
      return paths.map((p: any) => {
        const es = (enrollRes.data ?? []).filter((e: any) => e.path_id === p.id);
        const total = es.length;
        const completed = es.filter((e: any) => e.status === "completed").length;
        const inProgress = es.filter((e: any) => e.status === "in_progress").length;
        const overdue = es.filter(
          (e: any) => e.status !== "completed" && e.due_at && new Date(e.due_at).getTime() < now,
        ).length;
        const durations = es
          .filter((e: any) => e.completed_at && e.started_at)
          .map(
            (e: any) =>
              (new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / (60 * 1000),
          );
        const avgMin = durations.length
          ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
          : null;
        const quizScores = (quizRes.data ?? [])
          .filter((q: any) => q.academy_enrollments?.path_id === p.id)
          .map((q: any) => Number(q.score))
          .filter((n: number) => !Number.isNaN(n));
        const avgQuiz = quizScores.length
          ? Math.round(quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length)
          : null;
        const certs = (certRes.data ?? []).filter((c: any) => c.path_id === p.id).length;
        return {
          id: p.id,
          title: p.title,
          mandatory: p.mandatory,
          publish_status: p.publish_status,
          assigned_users: total,
          completed,
          in_progress: inProgress,
          overdue,
          avg_completion_minutes: avgMin,
          avg_quiz_score: avgQuiz,
          completion_percent: total ? Math.round((completed / total) * 100) : 0,
          certificates_issued: certs,
        };
      });
    },

    async getCourseCohort(pathId): Promise<AcademyCohortRow[]> {
      const { data: enrolls, error } = await client
        .from("academy_enrollments")
        .select("id, user_id, status, mandatory, priority, due_at, started_at, completed_at, created_at")
        .eq("path_id", pathId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      if (!enrolls?.length) return [];
      const userIds = Array.from(new Set(enrolls.map((e: any) => e.user_id)));
      const enrollmentIds = enrolls.map((e: any) => e.id);
      const [{ data: profiles }, { data: progress }, { data: chapters }] = await Promise.all([
        client
          .from("profiles")
          .select("id, full_name, first_name, last_name, department_id")
          .in("id", userIds),
        client
          .from("academy_lesson_progress")
          .select("enrollment_id, status, last_activity_at")
          .in("enrollment_id", enrollmentIds),
        client.from("academy_chapters").select("path_id, academy_lessons(id)").eq("path_id", pathId),
      ]);
      const totalLessons =
        (chapters ?? []).reduce((sum: number, ch: any) => sum + (ch.academy_lessons?.length ?? 0), 0) || 0;
      const doneByEnroll = new Map<string, number>();
      const lastActByEnroll = new Map<string, string | null>();
      for (const p of progress ?? []) {
        if (p.status === "completed")
          doneByEnroll.set(p.enrollment_id, (doneByEnroll.get(p.enrollment_id) ?? 0) + 1);
        if (p.last_activity_at) {
          const cur = lastActByEnroll.get(p.enrollment_id);
          if (!cur || cur < p.last_activity_at) lastActByEnroll.set(p.enrollment_id, p.last_activity_at);
        }
      }
      const profById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const now = Date.now();
      return enrolls.map((e: any) => {
        const done = doneByEnroll.get(e.id) ?? 0;
        const pct = e.status === "completed" ? 100 : totalLessons === 0 ? 0 : Math.round((done / totalLessons) * 100);
        const prof = profById.get(e.user_id) as any;
        return {
          enrollment_id: e.id,
          user_id: e.user_id,
          name: prof?.full_name ?? [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") ?? "Learner",
          department_id: prof?.department_id ?? null,
          status: e.status,
          mandatory: e.mandatory,
          priority: e.priority ?? "normal",
          due_at: e.due_at,
          started_at: e.started_at,
          completed_at: e.completed_at,
          progress_percent: pct,
          last_activity_at: lastActByEnroll.get(e.id) ?? null,
          is_overdue: e.status !== "completed" && !!e.due_at && new Date(e.due_at).getTime() < now,
        };
      });
    },

    async listDepartments(companyId): Promise<AcademyDepartmentRow[]> {
      const { data, error } = await client
        .from("academy_departments")
        .select("id, name, description, created_at, company_id")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        companyId: r.company_id,
        name: r.name,
        description: r.description ?? null,
        createdAt: r.created_at,
      }));
    },

    async upsertDepartment(input: AcademyDepartmentUpsertInput) {
      if (input.id) {
        const { error } = await client
          .from("academy_departments")
          .update({ name: input.name, description: input.description ?? null })
          .eq("id", input.id);
        if (error) throw new Error(error.message);
        return { id: input.id };
      }
      const { data, error } = await client
        .from("academy_departments")
        .insert({ name: input.name, description: input.description ?? null, company_id: input.companyId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    async listMyTrainingEnrollments(userId): Promise<AcademyEnrichedEnrollmentRow[]> {
      const { data: enrollments, error } = await client
        .from("academy_enrollments")
        .select(
          `id, status, mandatory, priority, due_at, started_at, completed_at, created_at,
           assigned_by, path_id,
           academy_learning_paths (
             id, title, description, language,
             academy_departments ( name )
           )`,
        )
        .eq("user_id", userId)
        .neq("status", "revoked")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      if (!enrollments?.length) return [];

      const pathIds = Array.from(new Set(enrollments.map((e: any) => e.path_id)));
      const enrollmentIds = enrollments.map((e: any) => e.id);
      const assignedByIds = Array.from(
        new Set(enrollments.map((e: any) => e.assigned_by).filter(Boolean)),
      );

      const [chaptersRes, progressRes, certsRes, profilesRes] = await Promise.all([
        client
          .from("academy_chapters")
          .select("id, path_id, academy_lessons(id, estimated_minutes)")
          .in("path_id", pathIds),
        client
          .from("academy_lesson_progress")
          .select("enrollment_id, status")
          .in("enrollment_id", enrollmentIds),
        client
          .from("academy_certificates")
          .select("id, certificate_code, enrollment_id")
          .in("enrollment_id", enrollmentIds),
        assignedByIds.length
          ? client.from("profiles").select("id, full_name, first_name, last_name").in("id", assignedByIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const lessonsByPath = new Map<string, { total: number; minutes: number }>();
      for (const ch of chaptersRes.data ?? []) {
        const bucket = lessonsByPath.get((ch as any).path_id) ?? { total: 0, minutes: 0 };
        for (const l of (ch as any).academy_lessons ?? []) {
          bucket.total += 1;
          bucket.minutes += Number(l.estimated_minutes ?? 0);
        }
        lessonsByPath.set((ch as any).path_id, bucket);
      }

      const completedByEnroll = new Map<string, number>();
      for (const p of progressRes.data ?? []) {
        if ((p as any).status === "completed") {
          completedByEnroll.set(
            (p as any).enrollment_id,
            (completedByEnroll.get((p as any).enrollment_id) ?? 0) + 1,
          );
        }
      }

      const certByEnroll = new Map<string, any>();
      for (const c of certsRes.data ?? []) certByEnroll.set((c as any).enrollment_id, c);

      const profByUser = new Map<string, any>();
      for (const p of profilesRes.data ?? []) profByUser.set((p as any).id, p);

      const now = Date.now();
      return enrollments.map((e: any): AcademyEnrichedEnrollmentRow => {
        const path = e.academy_learning_paths;
        const total = lessonsByPath.get(e.path_id)?.total ?? 0;
        const completed = completedByEnroll.get(e.id) ?? 0;
        const minutes = lessonsByPath.get(e.path_id)?.minutes ?? 0;
        const percent =
          e.status === "completed" ? 100 : total === 0 ? 0 : Math.round((completed / total) * 100);
        const assignedBy = e.assigned_by ? profByUser.get(e.assigned_by) : null;
        const cert = certByEnroll.get(e.id) ?? null;
        const overdue = e.status !== "completed" && !!e.due_at && new Date(e.due_at).getTime() < now;
        return {
          id: e.id,
          status: e.status,
          mandatory: e.mandatory,
          priority: e.priority ?? "normal",
          due_at: e.due_at,
          started_at: e.started_at,
          completed_at: e.completed_at,
          created_at: e.created_at,
          path: {
            id: path?.id,
            title: path?.title ?? "Untitled course",
            description: path?.description ?? null,
            language: path?.language ?? "en",
            department: path?.academy_departments?.name ?? null,
          },
          progress: {
            total_lessons: total,
            completed_lessons: completed,
            percent,
            estimated_minutes: minutes,
          },
          assigned_by: assignedBy
            ? {
                id: assignedBy.id,
                name:
                  assignedBy.full_name ??
                  [assignedBy.first_name, assignedBy.last_name].filter(Boolean).join(" ") ??
                  "Manager",
              }
            : null,
          certificate: cert ? { id: cert.id, code: cert.certificate_code } : null,
          is_overdue: overdue,
        };
      });
    },

    async getMyTrainingSummary(userId): Promise<AcademyTrainingSummary> {
      const [enrollmentsRes, certsRes, quizzesRes] = await Promise.all([
        client
          .from("academy_enrollments")
          .select("id, status, mandatory, due_at, path_id")
          .eq("user_id", userId),
        client.from("academy_certificates").select("id").eq("user_id", userId),
        client.from("academy_quiz_attempts").select("score").eq("user_id", userId),
      ]);

      const enrollments = enrollmentsRes.data ?? [];
      const now = Date.now();
      const in14d = now + 14 * 24 * 60 * 60 * 1000;

      const active = enrollments.filter(
        (e: any) => e.status !== "completed" && e.status !== "revoked",
      );
      const mandatoryActive = active.filter((e: any) => e.mandatory);
      const upcoming = active.filter((e: any) => e.due_at && new Date(e.due_at).getTime() < in14d);

      const enrollmentIds = active.map((e: any) => e.id);
      let learningPct = 0;
      if (enrollmentIds.length) {
        const pathIds = Array.from(new Set(active.map((e: any) => e.path_id)));
        const [{ data: chapters }, { data: progress }] = await Promise.all([
          client
            .from("academy_chapters")
            .select("path_id, academy_lessons(id)")
            .in("path_id", pathIds),
          client
            .from("academy_lesson_progress")
            .select("enrollment_id, status")
            .in("enrollment_id", enrollmentIds),
        ]);
        const totalByPath = new Map<string, number>();
        for (const ch of chapters ?? []) {
          totalByPath.set(
            (ch as any).path_id,
            (totalByPath.get((ch as any).path_id) ?? 0) + ((ch as any).academy_lessons?.length ?? 0),
          );
        }
        const doneByEnroll = new Map<string, number>();
        for (const p of progress ?? []) {
          if ((p as any).status === "completed")
            doneByEnroll.set(
              (p as any).enrollment_id,
              (doneByEnroll.get((p as any).enrollment_id) ?? 0) + 1,
            );
        }
        let tot = 0,
          done = 0;
        for (const e of active) {
          const t = totalByPath.get(e.path_id) ?? 0;
          tot += t;
          done += Math.min(doneByEnroll.get(e.id) ?? 0, t);
        }
        learningPct = tot === 0 ? 0 : Math.round((done / tot) * 100);
      }

      const scores = (quizzesRes.data ?? [])
        .map((r: any) => Number(r.score))
        .filter((n: number) => !Number.isNaN(n));
      const avgQuiz = scores.length
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : null;

      return {
        mandatory_active: mandatoryActive.length,
        certificates: (certsRes.data ?? []).length,
        average_quiz_score: avgQuiz,
        learning_progress_percent: learningPct,
        upcoming_deadlines: upcoming.length,
      };
    },

    async listEnrollmentsByUserWithPath(userId): Promise<AcademyEnrollmentWithPathRow[]> {
      const { data, error } = await client
        .from("academy_enrollments")
        .select(
          "*, academy_learning_paths(id, title, description, language, passing_score, academy_departments(name))",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({
        ...r,
        academy_learning_paths: r.academy_learning_paths
          ? {
              id: r.academy_learning_paths.id,
              title: r.academy_learning_paths.title,
              description: r.academy_learning_paths.description ?? null,
              language: r.academy_learning_paths.language,
              passing_score: r.academy_learning_paths.passing_score,
              department_name: r.academy_learning_paths.academy_departments?.name ?? null,
            }
          : null,
      }));
    },

    async listEnrollmentsByPathWithProfile(pathId): Promise<AcademyEnrollmentWithProfileRow[]> {
      const { data: rows, error } = await client
        .from("academy_enrollments")
        .select(
          "id, user_id, status, mandatory, priority, due_at, started_at, completed_at, created_at, company_id, path_id, assigned_by",
        )
        .eq("path_id", pathId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
      if (userIds.length === 0) return [];
      const { data: profiles } = await client
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", userIds);
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (rows ?? []).map((r: any) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
    },

    async listLearningPathsByIds(ids): Promise<AcademyPathRefRow[]> {
      if (!ids.length) return [];
      const { data, error } = await client
        .from("academy_learning_paths")
        .select("id, company_id, title")
        .in("id", ids);
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyPathRefRow[];
    },

    async listExistingEnrollmentPairs(pathIds, userIds): Promise<AcademyEnrollmentPairRow[]> {
      if (!pathIds.length || !userIds.length) return [];
      const { data, error } = await client
        .from("academy_enrollments")
        .select("path_id, user_id")
        .in("path_id", pathIds)
        .in("user_id", userIds);
      if (error) throw new Error(error.message);
      return (data ?? []) as AcademyEnrollmentPairRow[];
    },

    async getAssignTargets(companyId): Promise<AcademyAssignTargets> {
      const [usersRes, deptsRes, rolesRes] = await Promise.all([
        client
          .from("profiles")
          .select("id, full_name, first_name, last_name, department_id")
          .eq("company_id", companyId)
          .order("full_name", { ascending: true, nullsFirst: false })
          .limit(500),
        client.from("departments").select("id, name").eq("company_id", companyId).order("name"),
        client.from("user_roles").select("role").eq("company_id", companyId),
      ]);
      const roles: string[] = Array.from(
        new Set(((rolesRes.data ?? []) as Array<{ role: string }>).map((r) => r.role).filter(Boolean)),
      );
      return {
        users: (usersRes.data ?? []).map((u: any) => ({
          id: u.id,
          name: u.full_name ?? [u.first_name, u.last_name].filter(Boolean).join(" ") ?? "User",
          department_id: u.department_id,
        })),
        departments: (deptsRes.data ?? []) as { id: string; name: string }[],
        roles,
      };
    },

    async createNotifications(rows: AcademyNotificationInput[]): Promise<void> {
      if (!rows.length) return;
      const { error } = await client.from("notifications").insert(
        rows.map((n) => ({
          company_id: n.companyId,
          user_id: n.userId,
          kind: n.kind,
          title: n.title,
          body: n.body,
          link: n.link,
          payload: n.payload,
        })),
      );
      if (error) console.error("[academy] notification insert failed", error.message);
    },
  };
}

export const supabaseAcademyRepositoryFactory =
  () => (dataCtx: unknown) => createSupabaseAcademyRepository(dataCtx as AnyClient);
