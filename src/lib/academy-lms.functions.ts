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

const ACADEMY_MODULE = "academy" as const;

async function enforceAcademy(context: { supabase: any; userId: string }, hint?: string | null) {
  const companyId = hint ?? (await getProfileCompany(context.supabase, context.userId));
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
    const supabase = context.supabase as any;

    const { data: enrollments, error } = await supabase
      .from("academy_enrollments")
      .select(
        `id, status, mandatory, priority, due_at, started_at, completed_at, created_at,
         assigned_by, path_id,
         academy_learning_paths (
           id, title, description, language,
           academy_departments ( name )
         )`,
      )
      .eq("user_id", context.userId)
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
      supabase
        .from("academy_chapters")
        .select("id, path_id, academy_lessons(id, estimated_minutes)")
        .in("path_id", pathIds),
      supabase
        .from("academy_lesson_progress")
        .select("enrollment_id, status")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("academy_certificates")
        .select("id, certificate_code, enrollment_id")
        .in("enrollment_id", enrollmentIds),
      assignedByIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name")
            .in("id", assignedByIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const lessonsByPath = new Map<string, { total: number; minutes: number }>();
    for (const ch of chaptersRes.data ?? []) {
      const bucket = lessonsByPath.get(ch.path_id) ?? { total: 0, minutes: 0 };
      for (const l of ch.academy_lessons ?? []) {
        bucket.total += 1;
        bucket.minutes += Number(l.estimated_minutes ?? 0);
      }
      lessonsByPath.set(ch.path_id, bucket);
    }

    const completedByEnroll = new Map<string, number>();
    for (const p of progressRes.data ?? []) {
      if (p.status === "completed") {
        completedByEnroll.set(p.enrollment_id, (completedByEnroll.get(p.enrollment_id) ?? 0) + 1);
      }
    }

    const certByEnroll = new Map<string, any>();
    for (const c of certsRes.data ?? []) certByEnroll.set(c.enrollment_id, c);

    const profByUser = new Map<string, any>();
    for (const p of profilesRes.data ?? []) profByUser.set(p.id, p);

    const now = Date.now();
    return enrollments.map((e: any): EnrichedEnrollment => {
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
  });

/** Summary widget for the Employee dashboard. */
export const getMyTrainingSummary = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
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
    const supabase = context.supabase as any;

    const [enrollmentsRes, certsRes, quizzesRes] = await Promise.all([
      supabase
        .from("academy_enrollments")
        .select("id, status, mandatory, due_at, path_id")
        .eq("user_id", context.userId),
      supabase.from("academy_certificates").select("id").eq("user_id", context.userId),
      supabase.from("academy_quiz_attempts").select("score").eq("user_id", context.userId),
    ]);

    const enrollments = enrollmentsRes.data ?? [];
    const now = Date.now();
    const in14d = now + 14 * 24 * 60 * 60 * 1000;

    const active = enrollments.filter(
      (e: any) => e.status !== "completed" && e.status !== "revoked",
    );
    const mandatoryActive = active.filter((e: any) => e.mandatory);
    const upcoming = active.filter((e: any) => e.due_at && new Date(e.due_at).getTime() < in14d);

    // Weighted progress across active enrollments
    const enrollmentIds = active.map((e: any) => e.id);
    let learningPct = 0;
    if (enrollmentIds.length) {
      const pathIds = Array.from(new Set(active.map((e: any) => e.path_id)));
      const [{ data: chapters }, { data: progress }] = await Promise.all([
        supabase
          .from("academy_chapters")
          .select("path_id, academy_lessons(id)")
          .in("path_id", pathIds),
        supabase
          .from("academy_lesson_progress")
          .select("enrollment_id, status")
          .in("enrollment_id", enrollmentIds),
      ]);
      const totalByPath = new Map<string, number>();
      for (const ch of chapters ?? []) {
        totalByPath.set(
          ch.path_id,
          (totalByPath.get(ch.path_id) ?? 0) + (ch.academy_lessons?.length ?? 0),
        );
      }
      const doneByEnroll = new Map<string, number>();
      for (const p of progress ?? []) {
        if (p.status === "completed")
          doneByEnroll.set(p.enrollment_id, (doneByEnroll.get(p.enrollment_id) ?? 0) + 1);
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
  });

/** Persist personal notes on a lesson for the current learner. */
export const saveLessonNotes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enrollment_id: z.string().uuid(),
        lesson_id: z.string().uuid(),
        notes: z.string().max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    const supabase = context.supabase as any;
    // Verify ownership via enrollment
    const { data: enroll } = await supabase
      .from("academy_enrollments")
      .select("id, user_id, company_id")
      .eq("id", data.enrollment_id)
      .maybeSingle();
    if (!enroll || enroll.user_id !== context.userId) throw new Error("Forbidden");

    const { error } = await supabase.from("academy_lesson_progress").upsert(
      {
        enrollment_id: data.enrollment_id,
        lesson_id: data.lesson_id,
        user_id: context.userId,
        company_id: enroll.company_id,
        notes: data.notes,
        last_activity_at: new Date().toISOString(),
      },
      { onConflict: "enrollment_id,lesson_id" },
    );
    if (error) throw new Error(error.message);
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
        path_ids: z.array(z.string().uuid()).min(1),
        target_user_ids: z.array(z.string().uuid()).default([]),
        target_department_ids: z.array(z.string().uuid()).default([]),
        target_roles: z.array(z.string()).default([]),
        entire_company: z.boolean().default(false),
        due_at: z.string().datetime().nullable().optional(),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        mandatory: z.boolean().default(false),
        notify: z.boolean().default(true),
        company_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    await requirePermission(context, "academy.assign");
    const supabase = context.supabase as any;
    const companyId = data.company_id ?? (await resolveCompanyForWrite(context, null));

    // Resolve targets → distinct user_ids via helper
    const { data: targets, error: targetErr } = await supabase.rpc("academy_resolve_targets", {
      _company_id: companyId,
      _user_ids: data.target_user_ids,
      _department_ids: data.target_department_ids,
      _roles: data.target_roles,
      _entire_company: data.entire_company,
    });
    if (targetErr) throw new Error(targetErr.message);
    const userIds: string[] = (targets ?? []).map((t: any) => t.user_id);
    if (!userIds.length)
      return { assigned: 0, skipped: 0, users: 0, courses: data.path_ids.length };

    // Validate paths belong to same company
    const { data: paths, error: pathErr } = await supabase
      .from("academy_learning_paths")
      .select("id, company_id, title")
      .in("id", data.path_ids);
    if (pathErr) throw new Error(pathErr.message);
    const validPaths = (paths ?? []).filter((p: any) => p.company_id === companyId);
    if (!validPaths.length) throw new Error("No valid courses in this company");

    // Existing enrollments (to compute skipped + suppress duplicate notifications)
    const { data: existingRows } = await supabase
      .from("academy_enrollments")
      .select("path_id, user_id")
      .in(
        "path_id",
        validPaths.map((p: any) => p.id),
      )
      .in("user_id", userIds);
    const existing = new Set((existingRows ?? []).map((r: any) => `${r.path_id}:${r.user_id}`));

    const rows: any[] = [];
    const notifications: any[] = [];
    for (const p of validPaths) {
      for (const uid of userIds) {
        const key = `${p.id}:${uid}`;
        const isNew = !existing.has(key);
        rows.push({
          company_id: companyId,
          path_id: p.id,
          user_id: uid,
          status: "assigned",
          mandatory: data.mandatory,
          priority: data.priority,
          due_at: data.due_at ?? null,
          assigned_by: context.userId,
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

    const { error: upErr } = await supabase.from("academy_enrollments").upsert(rows, {
      onConflict: "path_id,user_id",
      ignoreDuplicates: false,
    });
    if (upErr) throw new Error(upErr.message);

    if (notifications.length) {
      const { error: nErr } = await supabase.from("notifications").insert(notifications);
      if (nErr) console.error("[assignTraining] notification insert failed", nErr.message);
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
    z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    await requirePermission(context, "academy.manage");
    const supabase = context.supabase as any;
    const companyId = data.company_id ?? (await resolveCompanyForWrite(context, null));

    const { data: paths, error } = await supabase
      .from("academy_learning_paths")
      .select("id, title, mandatory, publish_status")
      .eq("company_id", companyId);
    if (error) throw new Error(error.message);
    if (!paths?.length) return [];

    const pathIds = paths.map((p: any) => p.id);
    const [enrollRes, quizRes, certRes] = await Promise.all([
      supabase
        .from("academy_enrollments")
        .select("path_id, status, due_at, started_at, completed_at")
        .in("path_id", pathIds),
      supabase
        .from("academy_quiz_attempts")
        .select(
          "path_id:academy_enrollments!inner(path_id), score, academy_enrollments!inner(path_id)",
        )
        .in("academy_enrollments.path_id", pathIds),
      supabase.from("academy_certificates").select("path_id").in("path_id", pathIds),
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
  });

export const listCourseCohort = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ path_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await enforceAcademy(context, ((data as any)?.company_id as string | null | undefined) ?? null);
    await requirePermission(context, "academy.manage");
    const supabase = context.supabase as any;

    const { data: enrolls, error } = await supabase
      .from("academy_enrollments")
      .select(
        "id, user_id, status, mandatory, priority, due_at, started_at, completed_at, created_at",
      )
      .eq("path_id", data.path_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!enrolls?.length) return [];

    const userIds = Array.from(new Set(enrolls.map((e: any) => e.user_id)));
    const enrollmentIds = enrolls.map((e: any) => e.id);

    const [{ data: profiles }, { data: progress }, { data: chapters }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, department_id")
        .in("id", userIds),
      supabase
        .from("academy_lesson_progress")
        .select("enrollment_id, status, last_activity_at")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("academy_chapters")
        .select("path_id, academy_lessons(id)")
        .eq("path_id", data.path_id),
    ]);

    const totalLessons =
      (chapters ?? []).reduce(
        (sum: number, ch: any) => sum + (ch.academy_lessons?.length ?? 0),
        0,
      ) || 0;

    const doneByEnroll = new Map<string, number>();
    const lastActByEnroll = new Map<string, string | null>();
    for (const p of progress ?? []) {
      if (p.status === "completed")
        doneByEnroll.set(p.enrollment_id, (doneByEnroll.get(p.enrollment_id) ?? 0) + 1);
      if (p.last_activity_at) {
        const cur = lastActByEnroll.get(p.enrollment_id);
        if (!cur || cur < p.last_activity_at)
          lastActByEnroll.set(p.enrollment_id, p.last_activity_at);
      }
    }

    const profById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const now = Date.now();

    return enrolls.map((e: any) => {
      const done = doneByEnroll.get(e.id) ?? 0;
      const pct =
        e.status === "completed"
          ? 100
          : totalLessons === 0
            ? 0
            : Math.round((done / totalLessons) * 100);
      const prof = profById.get(e.user_id) as any;
      return {
        enrollment_id: e.id,
        user_id: e.user_id,
        name:
          prof?.full_name ??
          [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") ??
          "Learner",
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
  });

/** Assignable targets for the manager's company (users, departments, roles, paths). */
export const listAssignTargets = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await enforceAcademy(context, null);
    await requirePermission(context, "academy.assign");
    const supabase = context.supabase as any;
    const companyId = await resolveCompanyForWrite(context, null);

    const [usersRes, deptsRes, pathsRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, department_id")
        .eq("company_id", companyId)
        .order("full_name", { ascending: true, nullsFirst: false })
        .limit(500),
      supabase.from("departments").select("id, name").eq("company_id", companyId).order("name"),
      supabase
        .from("academy_learning_paths")
        .select("id, title, mandatory, publish_status")
        .eq("company_id", companyId)
        .eq("publish_status", "published")
        .order("title"),
      supabase.from("user_roles").select("role").eq("company_id", companyId),
    ]);

    const roles: string[] = Array.from(
      new Set(
        ((rolesRes.data ?? []) as Array<{ role: string }>).map((r) => r.role).filter(Boolean),
      ),
    );

    return {
      company_id: companyId,
      users: (usersRes.data ?? []).map((u: any) => ({
        id: u.id,
        name: u.full_name ?? [u.first_name, u.last_name].filter(Boolean).join(" ") ?? "User",
        department_id: u.department_id,
      })),
      departments: deptsRes.data ?? [],
      roles,
      paths: pathsRes.data ?? [],
    };
  });
