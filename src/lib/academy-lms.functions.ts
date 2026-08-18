/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Academy LMS — new enterprise-grade server functions
 * (My Training dashboard, summary widget, multi-target assign, cohort analytics, notes).
 * Legacy functions in academy.functions.ts stay intact for backward compatibility.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import {
  requirePermission,
  resolveCompanyForWrite,
  getProfileCompany,
} from "@/lib/authorization";
import { assertModuleForCompany } from "@/lib/license-enforcement.server";
import { uuidString } from "@/lib/zod-uuid";
import { getAcademyRepository } from "@/lib/providers/registry";

const ACADEMY_MODULE = "academy" as const;

async function enforceAcademy(context: { supabase: any; userId: string }, hint?: string | null) {
  const companyId = hint ?? (await getProfileCompany(context, context.userId));
  if (!companyId) {
    await assertModuleForCompany("00000000-0000-0000-0000-000000000000", ACADEMY_MODULE);
    return null;
  }
  await assertModuleForCompany(companyId, ACADEMY_MODULE);
  return companyId;
}

/* ============================================================
 * LEARNER SIDE
 * ============================================================ */

type EnrichedEnrollment = {
  id: string;
  status: "assigned" | "in_progress" | "completed" | "overdue" | "revoked";
  mandatory: boolean;
  priority: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  path: {
    id: string;
    title: string;
    description: string | null;
    language: string;
    department: string | null;
  };
  progress: {
    total_lessons: number;
    completed_lessons: number;
    percent: number;
    estimated_minutes: number;
  };
  assigned_by: { id: string; name: string } | null;
  certificate: { id: string; code: string } | null;
  is_overdue: boolean;
};

/** Enriched list of the current user's training enrollments (card view). */
export const listMyTraining = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<EnrichedEnrollment[]> => {
    try {
      await enforceAcademy(context, null);
    } catch (e) {
      if (e instanceof Response) return [];
      throw e;
    }
    const repo = getAcademyRepository(context);
    const rows = await repo.listMyTrainingEnrollments(context.userId);
    return rows as EnrichedEnrollment[];
  });

/** Summary widget for the Employee dashboard. */
export const getMyTrainingSummary = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireModuleAccess(context, "academy");
    const emptySummary = {
      mandatory_active: 0,
      certificates: 0,
      average_quiz_score: null as number | null,
      learning_progress_percent: 0,
      upcoming_deadlines: 0,
    };
    try {
      await enforceAcademy(context, null);
    } catch (e) {
      if (e instanceof Response) return emptySummary;
      throw e;
    }
    const repo = getAcademyRepository(context);
    return repo.getMyTrainingSummary(context.userId);
  });

/** Persist personal notes on a lesson for the current learner. */
export const saveLessonNotes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enrollment_id: uuidString(),
        lesson_id: uuidString(),
        notes: z.string().max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    const repo = getAcademyRepository(context);
    // Verify ownership via enrollment
    const enroll = await repo.getEnrollment(data.enrollment_id);
    if (!enroll || enroll.user_id !== context.userId) throw new Error("Forbidden");

    await repo.saveLessonNotes({
      enrollmentId: data.enrollment_id,
      lessonId: data.lesson_id,
      userId: context.userId,
      companyId: enroll.company_id,
      notes: data.notes,
    });
    return { ok: true };
  });

/* ============================================================
 * MANAGER / ADMIN — ASSIGN
 * ============================================================ */

export const assignTraining = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        path_ids: z.array(uuidString()).min(1),
        target_user_ids: z.array(uuidString()).default([]),
        target_department_ids: z.array(uuidString()).default([]),
        target_roles: z.array(z.string()).default([]),
        entire_company: z.boolean().default(false),
        due_at: z.string().datetime().nullable().optional(),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        mandatory: z.boolean().default(false),
        notify: z.boolean().default(true),
        company_id: uuidString().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    await requirePermission(context, "academy.assign");
    const repo = getAcademyRepository(context);
    const companyId = data.company_id ?? (await resolveCompanyForWrite(context, null));

    // Resolve targets → distinct user_ids via repository helper
    const userIds = await repo.resolveTargets({
      companyId,
      userIds: data.target_user_ids,
      departmentIds: data.target_department_ids,
      roles: data.target_roles,
      entireCompany: data.entire_company,
    });
    if (!userIds.length)
      return { assigned: 0, skipped: 0, users: 0, courses: data.path_ids.length };

    // Validate paths belong to same company
    const paths = await repo.listLearningPathsByIds(data.path_ids);
    const validPaths = (paths ?? []).filter((p) => p.company_id === companyId);
    if (!validPaths.length) throw new Error("No valid courses in this company");

    // Existing enrollments (to compute skipped + suppress duplicate notifications)
    const existingRows = await repo.listExistingEnrollmentPairs(
      validPaths.map((p) => p.id),
      userIds,
    );
    const existing = new Set((existingRows ?? []).map((r) => `${r.path_id}:${r.user_id}`));

    const rows: any[] = [];
    const notifications: any[] = [];
    for (const p of validPaths) {
      for (const uid of userIds) {
        const key = `${p.id}:${uid}`;
        const isNew = !existing.has(key);
        rows.push({
          companyId,
          pathId: p.id,
          userId: uid,
          status: "assigned" as const,
          mandatory: data.mandatory,
          priority: data.priority,
          dueAt: data.due_at ?? null,
          assignedBy: context.userId,
        });
        if (isNew && data.notify) {
          notifications.push({
            company_id: companyId,
            user_id: uid,
            kind: "academy.course_assigned",
            title: `New training assigned: ${p.title}`,
            body: data.mandatory
              ? "This training is mandatory. Please complete it by the due date."
              : "A new course is available in your training.",
            link: "/app/academy",
            payload: { path_id: p.id, due_at: data.due_at ?? null, priority: data.priority },
          });
        }
      }
    }

    await repo.assignEnrollments(rows);

    if (notifications.length) {
      try {
        await repo.createNotifications(notifications);
      } catch (e) {
        console.error("[assignTraining] notification insert failed", (e as Error)?.message);
      }
    }


    return {
      assigned: rows.length - Array.from(existing).length,
      skipped: Array.from(existing).length,
      users: userIds.length,
      courses: validPaths.length,
      notified: notifications.length,
    };
  });

/* ============================================================
 * MANAGER / ADMIN — ANALYTICS
 * ============================================================ */

export const listCourseAnalytics = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    const companyId = data.company_id ?? (await resolveCompanyForWrite(context, null));

    return repo.getCourseAnalytics(companyId);
  });

export const listCourseCohort = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ path_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);

    return repo.getCourseCohort(data.path_id);
  });

/** Assignable targets for the manager's company (users, departments, roles, paths). */
export const listAssignTargets = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademy(context, null);
    await requirePermission(context, "academy.assign");
    const repo = getAcademyRepository(context);
    const companyId = await resolveCompanyForWrite(context, null);

    const [assignTargets, paths] = await Promise.all([
      repo.getAssignTargets(companyId),
      repo.listLearningPaths(companyId, { publishStatus: "published" }),
    ]);

    return {
      company_id: companyId,
      users: assignTargets.users,
      departments: assignTargets.departments,
      roles: assignTargets.roles,
      paths: (paths ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        mandatory: p.mandatory,
        publish_status: p.publish_status,
      })),
    };
  });
