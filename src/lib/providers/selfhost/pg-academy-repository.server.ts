// Self-Hosted IAcademyRepository — backed by public.academy_* tables via
// the local pg pool. Analytics aggregates that Cloud computes with RPCs
// (academy_kpis, academy_heatmap, academy_department_performance,
// academy_resolve_targets, academy_verify_certificate) are computed here
// with plain SQL against vanilla Postgres.

import type { Pool } from "pg";
import type {
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

export interface PgAcademyRepositoryDeps {
  pool: Pool;
}

function mapPath(row: any): AcademyPathRow {
  return {
    id: row.id,
    company_id: row.company_id,
    department_id: row.department_id ?? null,
    department_name: row.department_name ?? null,
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

export function createPgAcademyRepository(deps: PgAcademyRepositoryDeps): IAcademyRepository {
  const { pool } = deps;

  const repo: IAcademyRepository = {
    async listLearningPaths(companyId, filter) {
      const clauses = ["p.company_id = $1"];
      const params: unknown[] = [companyId];
      if (filter?.departmentId) {
        params.push(filter.departmentId);
        clauses.push(`p.department_id = $${params.length}`);
      }
      if (filter?.publishStatus) {
        params.push(filter.publishStatus);
        clauses.push(`p.publish_status = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT p.*, d.name AS department_name
           FROM public.academy_learning_paths p
           LEFT JOIN public.departments d ON d.id = p.department_id
          WHERE ${clauses.join(" AND ")}
          ORDER BY p.order_index ASC`,
        params,
      );
      return rows.map(mapPath);
    },

    async getLearningPath(id) {
      const { rows: pathRows } = await pool.query(
        `SELECT p.*, d.name AS department_name
           FROM public.academy_learning_paths p
           LEFT JOIN public.departments d ON d.id = p.department_id
          WHERE p.id = $1`,
        [id],
      );
      if (!pathRows[0]) return null;
      const { rows: chapters } = await pool.query<AcademyChapterRow>(
        `SELECT * FROM public.academy_chapters WHERE path_id = $1 ORDER BY order_index`,
        [id],
      );
      const chapterIds = chapters.map((c) => c.id);
      const { rows: lessons } = chapterIds.length
        ? await pool.query<AcademyLessonRow>(
            `SELECT * FROM public.academy_lessons WHERE chapter_id = ANY($1::uuid[]) ORDER BY order_index`,
            [chapterIds],
          )
        : { rows: [] as AcademyLessonRow[] };
      return { path: mapPath(pathRows[0]), chapters, lessons };
    },

    async upsertLearningPath(input: AcademyPathUpsertInput) {
      if (input.id) {
        await pool.query(
          `UPDATE public.academy_learning_paths SET
             department_id = $2, title = $3, description = $4, language = $5,
             target_role = $6, target_position = $7, experience_level = $8,
             employment_type = $9, mandatory = $10, passing_score = $11,
             difficulty = $12, publish_status = $13
           WHERE id = $1`,
          [
            input.id,
            input.departmentId ?? null,
            input.title,
            input.description ?? null,
            input.language,
            input.targetRole ?? null,
            input.targetPosition ?? null,
            input.experienceLevel ?? null,
            input.employmentType ?? null,
            input.mandatory,
            input.passingScore,
            input.difficulty,
            input.publishStatus,
          ],
        );
        return { id: input.id };
      }
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.academy_learning_paths
           (company_id, department_id, title, description, language, target_role,
            target_position, experience_level, employment_type, mandatory,
            passing_score, difficulty, publish_status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          input.companyId,
          input.departmentId ?? null,
          input.title,
          input.description ?? null,
          input.language,
          input.targetRole ?? null,
          input.targetPosition ?? null,
          input.experienceLevel ?? null,
          input.employmentType ?? null,
          input.mandatory,
          input.passingScore,
          input.difficulty,
          input.publishStatus,
          input.createdBy,
        ],
      );
      return { id: rows[0].id };
    },

    async deleteLearningPath(id) {
      await pool.query(`DELETE FROM public.academy_learning_paths WHERE id = $1`, [id]);
    },

    async upsertChapter(input: AcademyChapterUpsertInput) {
      if (input.id) {
        await pool.query(
          `UPDATE public.academy_chapters SET title = $2, summary = $3, order_index = $4 WHERE id = $1`,
          [input.id, input.title, input.summary ?? null, input.orderIndex],
        );
        return { id: input.id };
      }
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.academy_chapters (path_id, title, summary, order_index, company_id)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [input.pathId, input.title, input.summary ?? null, input.orderIndex, input.companyId],
      );
      return { id: rows[0].id };
    },

    async deleteChapter(id) {
      await pool.query(`DELETE FROM public.academy_chapters WHERE id = $1`, [id]);
    },

    async getLesson(id) {
      const { rows } = await pool.query(
        `SELECT l.*, c.path_id AS chapter_path_id, c.title AS chapter_title,
                p.title AS path_title, p.passing_score AS path_passing_score, p.language AS path_language
           FROM public.academy_lessons l
           JOIN public.academy_chapters c ON c.id = l.chapter_id
           JOIN public.academy_learning_paths p ON p.id = c.path_id
          WHERE l.id = $1`,
        [id],
      );
      if (!rows[0]) return null;
      const row = rows[0];
      return { ...row, objectives: row.objectives ?? [] } as AcademyLessonRow;
    },

    async upsertLesson(input: AcademyLessonUpsertInput) {
      if (input.id) {
        await pool.query(
          `UPDATE public.academy_lessons SET
             chapter_id = $2, title = $3, objectives = $4::jsonb, explanation = $5,
             examples = $6, best_practices = $7, summary = $8, language = $9,
             estimated_minutes = $10, source_document_id = $11, source_document_version = $12,
             publish_status = $13, order_index = $14
           WHERE id = $1`,
          [
            input.id,
            input.chapterId,
            input.title,
            JSON.stringify(input.objectives),
            input.explanation ?? null,
            input.examples ?? null,
            input.bestPractices ?? null,
            input.summary ?? null,
            input.language,
            input.estimatedMinutes,
            input.sourceDocumentId ?? null,
            input.sourceDocumentVersion ?? null,
            input.publishStatus,
            input.orderIndex,
          ],
        );
        return { id: input.id };
      }
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.academy_lessons
           (company_id, chapter_id, title, objectives, explanation, examples, best_practices,
            summary, language, estimated_minutes, source_document_id, source_document_version,
            publish_status, order_index, created_by)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [
          input.companyId,
          input.chapterId,
          input.title,
          JSON.stringify(input.objectives),
          input.explanation ?? null,
          input.examples ?? null,
          input.bestPractices ?? null,
          input.summary ?? null,
          input.language,
          input.estimatedMinutes,
          input.sourceDocumentId ?? null,
          input.sourceDocumentVersion ?? null,
          input.publishStatus,
          input.orderIndex,
          input.createdBy,
        ],
      );
      return { id: rows[0].id };
    },

    async deleteLesson(id) {
      await pool.query(`DELETE FROM public.academy_lessons WHERE id = $1`, [id]);
    },

    async listLessonVersions(lessonId) {
      const { rows } = await pool.query<AcademyLessonVersionRow>(
        `SELECT id, lesson_id, version, snapshot, created_at
           FROM public.academy_lesson_versions
          WHERE lesson_id = $1
          ORDER BY version DESC`,
        [lessonId],
      );
      return rows;
    },

    async restoreLessonVersion(lessonId, version) {
      const { rows } = await pool.query<{ snapshot: any }>(
        `SELECT snapshot FROM public.academy_lesson_versions WHERE lesson_id = $1 AND version = $2`,
        [lessonId, version],
      );
      const v = rows[0];
      if (!v) throw new Error("Version not found");
      const s = v.snapshot;
      await pool.query(
        `UPDATE public.academy_lessons SET
           title = $2, objectives = $3::jsonb, explanation = $4, examples = $5,
           best_practices = $6, summary = $7
         WHERE id = $1`,
        [
          lessonId,
          s.title,
          JSON.stringify(s.objectives ?? []),
          s.explanation ?? null,
          s.examples ?? null,
          s.best_practices ?? null,
          s.summary ?? null,
        ],
      );
    },

    async createQuizAttempt(input: AcademyQuizAttemptCreateInput) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.academy_quiz_attempts
           (company_id, lesson_id, user_id, questions, answers, score, passed)
         VALUES ($1,$2,$3,$4::jsonb,'[]'::jsonb,0,false)
         RETURNING id`,
        [input.companyId, input.lessonId, input.userId, JSON.stringify(input.questions)],
      );
      return { id: rows[0].id };
    },

    async getQuizAttempt(id) {
      const { rows } = await pool.query<AcademyQuizAttemptRow>(
        `SELECT id, company_id, lesson_id, user_id, questions, answers, score, passed,
                duration_seconds, created_at
           FROM public.academy_quiz_attempts WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async gradeQuizAttempt(id, patch: AcademyQuizAttemptGradeInput) {
      await pool.query(
        `UPDATE public.academy_quiz_attempts
            SET answers = $2::jsonb, score = $3, passed = $4, duration_seconds = $5
          WHERE id = $1`,
        [id, JSON.stringify(patch.answers), patch.score, patch.passed, patch.durationSeconds ?? null],
      );
    },

    async enroll(input: AcademyEnrollmentUpsertInput) {
      const { rows: existing } = await pool.query<{ id: string }>(
        `SELECT id FROM public.academy_enrollments WHERE path_id = $1 AND user_id = $2`,
        [input.pathId, input.userId],
      );
      if (existing[0]) return { id: existing[0].id, existing: true };
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.academy_enrollments
           (company_id, path_id, user_id, status, mandatory, priority, due_at, assigned_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [
          input.companyId,
          input.pathId,
          input.userId,
          input.status ?? "assigned",
          input.mandatory,
          input.priority ?? "normal",
          input.dueAt ?? null,
          input.assignedBy,
        ],
      );
      return { id: rows[0].id, existing: false };
    },

    async assignEnrollments(rows: AcademyEnrollmentUpsertInput[]) {
      let count = 0;
      for (const r of rows) {
        await pool.query(
          `INSERT INTO public.academy_enrollments
             (company_id, path_id, user_id, status, mandatory, priority, due_at, assigned_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (path_id, user_id) DO UPDATE SET
             status = EXCLUDED.status, mandatory = EXCLUDED.mandatory,
             priority = EXCLUDED.priority, due_at = EXCLUDED.due_at, assigned_by = EXCLUDED.assigned_by`,
          [
            r.companyId,
            r.pathId,
            r.userId,
            r.status ?? "assigned",
            r.mandatory,
            r.priority ?? "normal",
            r.dueAt ?? null,
            r.assignedBy,
          ],
        );
        count += 1;
      }
      return { count };
    },

    async getEnrollment(id) {
      const { rows } = await pool.query<AcademyEnrollmentRow>(
        `SELECT * FROM public.academy_enrollments WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async listEnrollmentsByUser(userId) {
      const { rows } = await pool.query<AcademyEnrollmentRow>(
        `SELECT * FROM public.academy_enrollments WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      );
      return rows;
    },

    async listEnrollmentsByPath(pathId) {
      const { rows } = await pool.query<AcademyEnrollmentRow>(
        `SELECT * FROM public.academy_enrollments WHERE path_id = $1 ORDER BY created_at DESC`,
        [pathId],
      );
      return rows;
    },

    async startEnrollment(id, userId) {
      await pool.query(
        `UPDATE public.academy_enrollments
            SET status = 'in_progress', started_at = now()
          WHERE id = $1 AND user_id = $2 AND started_at IS NULL`,
        [id, userId],
      );
    },

    async completeEnrollment(id) {
      await pool.query(
        `UPDATE public.academy_enrollments SET status = 'completed', completed_at = now() WHERE id = $1`,
        [id],
      );
    },

    async removeEnrollment(id) {
      await pool.query(`DELETE FROM public.academy_enrollments WHERE id = $1`, [id]);
    },

    async listLessonProgress(enrollmentId) {
      const { rows } = await pool.query<AcademyLessonProgressRow>(
        `SELECT * FROM public.academy_lesson_progress WHERE enrollment_id = $1`,
        [enrollmentId],
      );
      return rows;
    },

    async upsertLessonProgress(input: AcademyLessonProgressUpsertInput) {
      const { rows: existing } = await pool.query<{ id: string; attempts: number; time_spent_seconds: number }>(
        `SELECT id, attempts, time_spent_seconds FROM public.academy_lesson_progress
          WHERE enrollment_id = $1 AND lesson_id = $2`,
        [input.enrollmentId, input.lessonId],
      );
      if (existing[0]) {
        await pool.query(
          `UPDATE public.academy_lesson_progress SET
             attempts = $2, last_score = $3, time_spent_seconds = $4, status = $5,
             notes = COALESCE($6, notes), completed_at = $7, last_activity_at = now()
           WHERE id = $1`,
          [
            existing[0].id,
            input.attempts ?? existing[0].attempts,
            input.lastScore ?? null,
            input.timeSpentSeconds ?? existing[0].time_spent_seconds,
            input.status ?? "in_progress",
            input.notes ?? null,
            input.completedAt ?? null,
          ],
        );
        return;
      }
      await pool.query(
        `INSERT INTO public.academy_lesson_progress
           (company_id, enrollment_id, lesson_id, user_id, attempts, last_score,
            time_spent_seconds, status, notes, completed_at, last_activity_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())`,
        [
          input.companyId,
          input.enrollmentId,
          input.lessonId,
          input.userId,
          input.attempts ?? 1,
          input.lastScore ?? null,
          input.timeSpentSeconds ?? 0,
          input.status ?? "in_progress",
          input.notes ?? null,
          input.completedAt ?? null,
        ],
      );
    },

    async saveLessonNotes(input) {
      await pool.query(
        `INSERT INTO public.academy_lesson_progress
           (company_id, enrollment_id, lesson_id, user_id, notes, last_activity_at)
         VALUES ($1,$2,$3,$4,$5, now())
         ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET
           notes = EXCLUDED.notes, last_activity_at = now()`,
        [input.companyId, input.enrollmentId, input.lessonId, input.userId, input.notes],
      );
    },

    async listCertificatesByUser(userId) {
      const { rows } = await pool.query(
        `SELECT c.*, p.title AS path_title
           FROM public.academy_certificates c
           JOIN public.academy_learning_paths p ON p.id = c.path_id
          WHERE c.user_id = $1
          ORDER BY c.issued_at DESC`,
        [userId],
      );
      return rows as AcademyCertificateRow[];
    },

    async getCertificate(id) {
      const { rows } = await pool.query<AcademyCertificateRow>(
        `SELECT * FROM public.academy_certificates WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async upsertCertificate(input: AcademyCertificateUpsertInput) {
      const { rows: existing } = await pool.query(
        `SELECT * FROM public.academy_certificates WHERE enrollment_id = $1`,
        [input.enrollmentId],
      );
      if (existing[0]) {
        const { rows } = await pool.query(
          `UPDATE public.academy_certificates SET final_score = $2 WHERE id = $1 RETURNING *`,
          [existing[0].id, input.finalScore],
        );
        return rows[0] as AcademyCertificateRow;
      }
      const { rows } = await pool.query(
        `INSERT INTO public.academy_certificates (company_id, enrollment_id, path_id, user_id, final_score)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [input.companyId, input.enrollmentId, input.pathId, input.userId, input.finalScore],
      );
      return rows[0] as AcademyCertificateRow;
    },

    async markCertificatePdf(id, pdfPath, qrPayload) {
      await pool.query(
        `UPDATE public.academy_certificates SET pdf_path = $2, qr_payload = $3 WHERE id = $1`,
        [id, pdfPath, qrPayload],
      );
    },

    async verifyCertificate(code): Promise<AcademyCertificateVerification | null> {
      const { rows } = await pool.query(
        `SELECT c.issued_at, c.final_score, c.certificate_code, c.revoked_at,
                p.title AS path_title, u.full_name, u.email
           FROM public.academy_certificates c
           JOIN public.academy_learning_paths p ON p.id = c.path_id
           JOIN public.users u ON u.id = c.user_id
          WHERE c.certificate_code = $1`,
        [code],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        valid: !row.revoked_at,
        issuedAt: row.issued_at,
        score: row.final_score,
        pathTitle: row.path_title,
        company: "OPSQAI",
        recipient: row.full_name ?? row.email ?? "Learner",
        certificateCode: row.certificate_code,
      };
    },

    async listRetrainingEvents(companyId) {
      const { rows } = await pool.query<AcademyRetrainingEventRow>(
        `SELECT * FROM public.academy_retraining_events WHERE company_id = $1 ORDER BY created_at DESC`,
        [companyId],
      );
      return rows;
    },

    async createRetrainingEvent(input: AcademyRetrainingEventCreateInput) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.academy_retraining_events (company_id, path_id, user_id, reason, triggered_by)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [input.companyId, input.pathId, input.userId, input.reason, input.triggeredBy ?? null],
      );
      return { id: rows[0].id };
    },

    async getSettings(companyId) {
      const { rows } = await pool.query(
        `SELECT * FROM public.academy_settings WHERE company_id = $1`,
        [companyId],
      );
      if (!rows[0]) return null;
      return { ...rows[0], languages: rows[0].languages ?? ["en"] } as AcademySettingsRow;
    },

    async saveSettings(input: AcademySettingsUpsertInput) {
      await pool.query(
        `INSERT INTO public.academy_settings
           (company_id, passing_score, quiz_min, quiz_max, default_difficulty, languages)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (company_id) DO UPDATE SET
           passing_score = EXCLUDED.passing_score, quiz_min = EXCLUDED.quiz_min,
           quiz_max = EXCLUDED.quiz_max, default_difficulty = EXCLUDED.default_difficulty,
           languages = EXCLUDED.languages`,
        [
          input.companyId,
          input.passingScore,
          input.quizMin,
          input.quizMax,
          input.defaultDifficulty,
          JSON.stringify(input.languages),
        ],
      );
    },

    async resolveTargets(input: AcademyResolveTargetsInput) {
      if (input.entireCompany) {
        const { rows } = await pool.query<{ id: string }>(
          `SELECT id FROM public.users WHERE company_id = $1 AND disabled = FALSE`,
          [input.companyId],
        );
        return rows.map((r) => r.id);
      }
      const ids = new Set<string>(input.userIds);
      if (input.departmentIds.length) {
        const { rows } = await pool.query<{ id: string }>(
          `SELECT id FROM public.users WHERE company_id = $1 AND department_id = ANY($2::uuid[])`,
          [input.companyId, input.departmentIds],
        );
        for (const r of rows) ids.add(r.id);
      }
      if (input.roles.length) {
        const { rows } = await pool.query<{ user_id: string }>(
          `SELECT ur.user_id FROM public.user_roles ur
             JOIN public.users u ON u.id = ur.user_id
            WHERE u.company_id = $1 AND ur.role = ANY($2::text[])`,
          [input.companyId, input.roles],
        );
        for (const r of rows) ids.add(r.user_id);
      }
      return Array.from(ids);
    },

    async getKpis(companyId): Promise<AcademyKpis> {
      const { rows } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE e.status = 'completed') AS completed,
           COUNT(*) FILTER (WHERE e.status = 'in_progress') AS in_progress,
           COUNT(*) FILTER (WHERE e.status != 'completed' AND e.due_at IS NOT NULL AND e.due_at < now()) AS overdue,
           COUNT(*) AS total,
           COALESCE(AVG(qa.score) FILTER (WHERE qa.score IS NOT NULL), 0) AS avg_quiz_score,
           (SELECT COUNT(*) FROM public.academy_certificates c WHERE c.company_id = $1) AS certificates_issued
         FROM public.academy_enrollments e
         LEFT JOIN public.academy_quiz_attempts qa ON qa.user_id = e.user_id
         WHERE e.company_id = $1`,
        [companyId],
      );
      const r = rows[0] ?? {};
      return {
        completed: Number(r.completed ?? 0),
        in_progress: Number(r.in_progress ?? 0),
        overdue: Number(r.overdue ?? 0),
        total: Number(r.total ?? 0),
        avg_quiz_score: Math.round(Number(r.avg_quiz_score ?? 0)),
        certificates_issued: Number(r.certificates_issued ?? 0),
      };
    },

    async getHeatmap(companyId): Promise<AcademyHeatmapRow[]> {
      const { rows } = await pool.query(
        `SELECT p.department_id, d.name AS department_name, p.id AS path_id, p.title AS path_title,
                COUNT(*) FILTER (WHERE e.status = 'completed') AS completed,
                COUNT(*) AS total
           FROM public.academy_enrollments e
           JOIN public.academy_learning_paths p ON p.id = e.path_id
           LEFT JOIN public.departments d ON d.id = p.department_id
          WHERE e.company_id = $1
          GROUP BY p.department_id, d.name, p.id, p.title`,
        [companyId],
      );
      return rows.map((r) => ({
        department_id: r.department_id,
        department_name: r.department_name,
        path_id: r.path_id,
        path_title: r.path_title,
        completed: Number(r.completed),
        total: Number(r.total),
        completion_percent: Number(r.total) ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
      })) as AcademyHeatmapRow[];
    },

    async getDepartmentPerformance(companyId): Promise<AcademyDepartmentPerformanceRow[]> {
      const { rows } = await pool.query(
        `SELECT d.id AS department_id, d.name AS department_name,
                COUNT(*) FILTER (WHERE e.status = 'completed') AS completed,
                COUNT(*) AS total,
                COALESCE(AVG(qa.score) FILTER (WHERE qa.score IS NOT NULL), 0) AS avg_quiz_score
           FROM public.academy_enrollments e
           JOIN public.users u ON u.id = e.user_id
           LEFT JOIN public.departments d ON d.id = u.department_id
           LEFT JOIN public.academy_quiz_attempts qa ON qa.user_id = e.user_id
          WHERE e.company_id = $1
          GROUP BY d.id, d.name`,
        [companyId],
      );
      return rows.map((r) => ({
        department_id: r.department_id,
        department_name: r.department_name ?? "Unassigned",
        completed: Number(r.completed),
        total: Number(r.total),
        completion_percent: Number(r.total) ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
        avg_quiz_score: Math.round(Number(r.avg_quiz_score ?? 0)),
      })) as AcademyDepartmentPerformanceRow[];
    },

    async getCourseAnalytics(companyId): Promise<AcademyCourseAnalyticsRow[]> {
      const { rows: paths } = await pool.query(
        `SELECT id, title, mandatory, publish_status FROM public.academy_learning_paths WHERE company_id = $1`,
        [companyId],
      );
      if (!paths.length) return [];
      const pathIds = paths.map((p) => p.id);
      const [{ rows: enrolls }, { rows: quizzes }, { rows: certs }] = await Promise.all([
        pool.query(
          `SELECT path_id, status, due_at, started_at, completed_at
             FROM public.academy_enrollments WHERE path_id = ANY($1::uuid[])`,
          [pathIds],
        ),
        pool.query(
          `SELECT e.path_id, qa.score
             FROM public.academy_quiz_attempts qa
             JOIN public.academy_enrollments e ON e.user_id = qa.user_id
            WHERE e.path_id = ANY($1::uuid[])`,
          [pathIds],
        ),
        pool.query(
          `SELECT path_id FROM public.academy_certificates WHERE path_id = ANY($1::uuid[])`,
          [pathIds],
        ),
      ]);
      const now = Date.now();
      return paths.map((p) => {
        const es = enrolls.filter((e) => e.path_id === p.id);
        const total = es.length;
        const completed = es.filter((e) => e.status === "completed").length;
        const inProgress = es.filter((e) => e.status === "in_progress").length;
        const overdue = es.filter(
          (e) => e.status !== "completed" && e.due_at && new Date(e.due_at).getTime() < now,
        ).length;
        const durations = es
          .filter((e) => e.completed_at && e.started_at)
          .map((e) => (new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / (60 * 1000));
        const avgMin = durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null;
        const quizScores = quizzes
          .filter((q) => q.path_id === p.id)
          .map((q) => Number(q.score))
          .filter((n) => !Number.isNaN(n));
        const avgQuiz = quizScores.length
          ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
          : null;
        const certCount = certs.filter((c) => c.path_id === p.id).length;
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
          certificates_issued: certCount,
        };
      });
    },

    async getCourseCohort(pathId): Promise<AcademyCohortRow[]> {
      const { rows: enrolls } = await pool.query(
        `SELECT id, user_id, status, mandatory, priority, due_at, started_at, completed_at, created_at
           FROM public.academy_enrollments WHERE path_id = $1 ORDER BY created_at DESC`,
        [pathId],
      );
      if (!enrolls.length) return [];
      const userIds = Array.from(new Set(enrolls.map((e) => e.user_id)));
      const enrollmentIds = enrolls.map((e) => e.id);
      const [{ rows: users }, { rows: progress }, { rows: chapters }] = await Promise.all([
        pool.query(
          `SELECT id, full_name, first_name, last_name, department_id FROM public.users WHERE id = ANY($1::uuid[])`,
          [userIds],
        ),
        pool.query(
          `SELECT enrollment_id, status, last_activity_at
             FROM public.academy_lesson_progress WHERE enrollment_id = ANY($1::uuid[])`,
          [enrollmentIds],
        ),
        pool.query(
          `SELECT COUNT(l.id)::int AS total_lessons
             FROM public.academy_chapters c
             LEFT JOIN public.academy_lessons l ON l.chapter_id = c.id
            WHERE c.path_id = $1`,
          [pathId],
        ),
      ]);
      const totalLessons = chapters[0]?.total_lessons ?? 0;
      const doneByEnroll = new Map<string, number>();
      const lastActByEnroll = new Map<string, string | null>();
      for (const p of progress) {
        if (p.status === "completed") doneByEnroll.set(p.enrollment_id, (doneByEnroll.get(p.enrollment_id) ?? 0) + 1);
        if (p.last_activity_at) {
          const cur = lastActByEnroll.get(p.enrollment_id);
          if (!cur || cur < p.last_activity_at) lastActByEnroll.set(p.enrollment_id, p.last_activity_at);
        }
      }
      const userById = new Map(users.map((u) => [u.id, u]));
      const now = Date.now();
      return enrolls.map((e) => {
        const done = doneByEnroll.get(e.id) ?? 0;
        const pct = e.status === "completed" ? 100 : totalLessons === 0 ? 0 : Math.round((done / totalLessons) * 100);
        const u = userById.get(e.user_id);
        return {
          enrollment_id: e.id,
          user_id: e.user_id,
          name: u?.full_name ?? ([u?.first_name, u?.last_name].filter(Boolean).join(" ") || "Learner"),
          department_id: u?.department_id ?? null,
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
  };

  return repo;
}

export const pgAcademyRepositoryFactory =
  (deps: PgAcademyRepositoryDeps) => (_dataCtx: unknown) => createPgAcademyRepository(deps);
