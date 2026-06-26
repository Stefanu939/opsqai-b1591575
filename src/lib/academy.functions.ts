/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  hasPermission,
  requirePermission,
  resolveCompanyForWrite,
} from "@/lib/authorization";

const MODEL = "google/gemini-3-flash-preview";

async function ai() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

async function companyForRead(context: { supabase: any; userId: string }, hint?: string | null) {
  if (hint) return hint;
  return await resolveCompanyForWrite(context, null);
}

/* ----------------------------- Departments ---------------------------- */

export const listAcademyDepartments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, data.company_id ?? null);
    const { data: rows, error } = await (context.supabase as any)
      .from("academy_departments")
      .select("id, name, description, created_at")
      .eq("company_id", companyId)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertAcademyDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      company_id: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await resolveCompanyForWrite(context, data.company_id);
    if (data.id) {
      const { error } = await (context.supabase as any)
        .from("academy_departments")
        .update({ name: data.name, description: data.description ?? null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("academy_departments")
      .insert({ name: data.name, description: data.description ?? null, company_id: companyId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

/* --------------------------- Learning Paths --------------------------- */

const PathInput = z.object({
  id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  language: z.string().default("en"),
  target_role: z.string().optional().nullable(),
  target_position: z.string().optional().nullable(),
  experience_level: z.string().optional().nullable(),
  employment_type: z.string().optional().nullable(),
  mandatory: z.boolean().default(false),
  passing_score: z.number().int().min(0).max(100).default(70),
  difficulty: z.string().default("standard"),
  publish_status: z.enum(["draft", "published", "archived"]).default("draft"),
  company_id: z.string().uuid().optional().nullable(),
});

export const listAcademyPaths = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      company_id: z.string().uuid().optional().nullable(),
      department_id: z.string().uuid().optional().nullable(),
      publish_status: z.string().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, data.company_id ?? null);
    let q = (context.supabase as any)
      .from("academy_learning_paths")
      .select("*, academy_departments(name)")
      .eq("company_id", companyId)
      .order("order_index", { ascending: true });
    if (data.department_id) q = q.eq("department_id", data.department_id);
    if (data.publish_status) q = q.eq("publish_status", data.publish_status as "draft" | "published" | "archived");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PathInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await resolveCompanyForWrite(context, data.company_id);
    const payload: Record<string, unknown> = { ...data, company_id: companyId };
    delete (payload as any).id;
    if (data.id) {
      const { error } = await (context.supabase as any).from("academy_learning_paths").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("academy_learning_paths")
      .insert({ ...payload, created_by: context.userId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { error } = await (context.supabase as any).from("academy_learning_paths").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: path, error } = await (context.supabase as any)
      .from("academy_learning_paths").select("*, academy_departments(name)")
      .eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!path) throw new Error("Path not found");

    const { data: chapters } = await (context.supabase as any)
      .from("academy_chapters").select("*").eq("path_id", data.id).order("order_index");

    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    const { data: lessons } = chapterIds.length
      ? await (context.supabase as any)
        .from("academy_lessons")
        .select("id, chapter_id, title, order_index, estimated_minutes, publish_status, version, language, source_document_id")
        .in("chapter_id", chapterIds)
        .order("order_index")
      : { data: [] as any[] };

    return { path, chapters: chapters ?? [], lessons: lessons ?? [] };
  });

/* ------------------------------ Chapters ----------------------------- */

export const upsertAcademyChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      path_id: z.string().uuid(),
      title: z.string().min(1),
      summary: z.string().optional().nullable(),
      order_index: z.number().int().default(0),
      company_id: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await resolveCompanyForWrite(context, data.company_id);
    if (data.id) {
      const { error } = await (context.supabase as any)
        .from("academy_chapters")
        .update({ title: data.title, summary: data.summary ?? null, order_index: data.order_index })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("academy_chapters")
      .insert({
        path_id: data.path_id, title: data.title, summary: data.summary ?? null,
        order_index: data.order_index, company_id: companyId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAcademyChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { error } = await (context.supabase as any).from("academy_chapters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- Lessons ----------------------------- */

const LessonInput = z.object({
  id: z.string().uuid().optional(),
  chapter_id: z.string().uuid(),
  title: z.string().min(1),
  objectives: z.array(z.string()).default([]),
  explanation: z.string().optional().nullable(),
  examples: z.string().optional().nullable(),
  best_practices: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  language: z.string().default("en"),
  estimated_minutes: z.number().int().min(1).max(240).default(10),
  source_document_id: z.string().uuid().optional().nullable(),
  publish_status: z.enum(["draft", "published", "archived"]).default("draft"),
  order_index: z.number().int().default(0),
  company_id: z.string().uuid().optional().nullable(),
});

export const upsertAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LessonInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await resolveCompanyForWrite(context, data.company_id);
    const payload: Record<string, unknown> = { ...data, company_id: companyId };
    delete (payload as any).id;
    if (data.id) {
      const { error } = await (context.supabase as any).from("academy_lessons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("academy_lessons")
      .insert({ ...payload, created_by: context.userId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { error } = await (context.supabase as any).from("academy_lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lesson, error } = await (context.supabase as any)
      .from("academy_lessons")
      .select("*, academy_chapters(id, title, path_id, academy_learning_paths(id, title, passing_score, language))")
      .eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) throw new Error("Lesson not found");
    return lesson;
  });

export const listAcademyLessonVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lesson_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { data: rows, error } = await (context.supabase as any)
      .from("academy_lesson_versions")
      .select("id, version, snapshot, created_at")
      .eq("lesson_id", data.lesson_id)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const restoreAcademyLessonVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lesson_id: z.string().uuid(), version: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { data: v } = await (context.supabase as any)
      .from("academy_lesson_versions")
      .select("snapshot").eq("lesson_id", data.lesson_id).eq("version", data.version).maybeSingle();
    if (!v) throw new Error("Version not found");
    const s = v.snapshot as any;
    const { error } = await (context.supabase as any)
      .from("academy_lessons")
      .update({
        title: s.title, objectives: s.objectives ?? [],
        explanation: s.explanation, examples: s.examples,
        best_practices: s.best_practices, summary: s.summary,
      })
      .eq("id", data.lesson_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------- AI: Convert SOP → Lesson --------------------- */

const LessonSchema = z.object({
  title: z.string(),
  objectives: z.array(z.string()).min(1).max(8),
  explanation: z.string(),
  examples: z.string(),
  best_practices: z.string(),
  summary: z.string(),
});

export const convertSopToLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      document_id: z.string().uuid(),
      chapter_id: z.string().uuid(),
      language: z.string().default("en"),
      auto_publish: z.boolean().default(false),
      company_id: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await resolveCompanyForWrite(context, data.company_id);

    const { data: doc, error: dErr } = await context.supabase
      .from("knowledge_documents")
      .select("id, title, version")
      .eq("id", data.document_id).maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!doc) throw new Error("Document not found");

    const { data: chunks } = await context.supabase
      .from("document_chunks").select("content")
      .eq("document_id", data.document_id)
      .order("chunk_index").limit(40);
    const body = (chunks ?? []).map((c: any) => c.content).join("\n\n").slice(0, 18000);

    const gateway = await ai();
    const { experimental_output } = await generateText({
      model: gateway(MODEL),
      experimental_output: Output.object({ schema: LessonSchema }),
      messages: [
        { role: "system", content: `You convert SOPs into clear, engaging onboarding lessons. Write everything in ${data.language}. Use Markdown for the body fields. Keep the tone supportive and practical for warehouse / operations staff. Never invent facts not present in the SOP.` },
        { role: "user", content: `SOP TITLE: ${doc.title}\n\nSOP CONTENT:\n${body}\n\nProduce a lesson with title (short), 4-6 learning objectives, explanation (markdown, 200-400 words), examples (markdown, 2-3 short scenarios), best_practices (markdown bullet list), summary (markdown, 3-5 bullets).` },
      ],
    });
    const lesson = experimental_output as z.infer<typeof LessonSchema>;

    const { data: row, error } = await (context.supabase as any)
      .from("academy_lessons")
      .insert({
        company_id: companyId,
        chapter_id: data.chapter_id,
        title: lesson.title,
        objectives: lesson.objectives,
        explanation: lesson.explanation,
        examples: lesson.examples,
        best_practices: lesson.best_practices,
        summary: lesson.summary,
        language: data.language,
        source_document_id: data.document_id,
        source_document_version: doc.version ?? 1,
        publish_status: data.auto_publish ? "published" : "draft",
        created_by: context.userId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, lesson };
  });

/* ----------------------- AI: Generate Course (multi SOPs) ------------- */

const CourseSchema = z.object({
  path_title: z.string(),
  path_description: z.string(),
  chapters: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    lessons: z.array(LessonSchema).min(1).max(6),
  })).min(1).max(8),
});

export const generateAcademyCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      document_ids: z.array(z.string().uuid()).min(1).max(15),
      department_id: z.string().uuid().optional().nullable(),
      language: z.string().default("en"),
      target_role: z.string().optional().nullable(),
      company_id: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await resolveCompanyForWrite(context, data.company_id);

    const { data: docs } = await context.supabase
      .from("knowledge_documents")
      .select("id, title, version")
      .in("id", data.document_ids);
    const { data: chunks } = await context.supabase
      .from("document_chunks").select("document_id, chunk_index, content")
      .in("document_id", data.document_ids)
      .order("chunk_index").limit(400);
    const byDoc: Record<string, string> = {};
    for (const c of (chunks ?? []) as any[]) {
      byDoc[c.document_id] = (byDoc[c.document_id] ?? "") + "\n" + c.content;
    }
    const corpus = (docs ?? []).map((d: any) => `### SOP: ${d.title}\n${(byDoc[d.id] ?? "").slice(0, 6000)}`).join("\n\n");

    const gateway = await ai();
    const { experimental_output } = await generateText({
      model: gateway(MODEL),
      experimental_output: Output.object({ schema: CourseSchema }),
      messages: [
        { role: "system", content: `You design enterprise onboarding learning paths. Write everything in ${data.language}. Group related SOPs into 2-5 chapters, each with 1-4 lessons. Use Markdown in lesson bodies. Never invent facts not present in the SOPs.` },
        { role: "user", content: `Create a coherent learning path${data.target_role ? ` for role: ${data.target_role}` : ""} from these SOPs:\n\n${corpus.slice(0, 24000)}` },
      ],
    });
    const course = experimental_output as z.infer<typeof CourseSchema>;

    // Persist as draft path/chapters/lessons
    const { data: path } = await (context.supabase as any)
      .from("academy_learning_paths")
      .insert({
        company_id: companyId,
        department_id: data.department_id ?? null,
        title: course.path_title,
        description: course.path_description,
        language: data.language,
        target_role: data.target_role ?? null,
        created_by: context.userId,
      })
      .select("id").single();
    const pathId = path!.id as string;

    for (let ci = 0; ci < course.chapters.length; ci++) {
      const ch = course.chapters[ci];
      const { data: chap } = await (context.supabase as any)
        .from("academy_chapters")
        .insert({ company_id: companyId, path_id: pathId, title: ch.title, summary: ch.summary, order_index: ci })
        .select("id").single();
      const chapterId = chap!.id as string;
      for (let li = 0; li < ch.lessons.length; li++) {
        const ls = ch.lessons[li];
        await (context.supabase as any).from("academy_lessons").insert({
          company_id: companyId, chapter_id: chapterId,
          title: ls.title, objectives: ls.objectives,
          explanation: ls.explanation, examples: ls.examples,
          best_practices: ls.best_practices, summary: ls.summary,
          language: data.language, order_index: li,
          created_by: context.userId,
        });
      }
    }

    return { path_id: pathId };
  });

/* -------------------------------- Quiz -------------------------------- */

const QuestionSchema = z.object({
  type: z.enum(["multiple_choice", "true_false", "short_answer"]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct_answer: z.string(),
  explanation: z.string(),
});
const QuizSchema = z.object({ questions: z.array(QuestionSchema).min(2).max(5) });

export const generateAcademyQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      lesson_id: z.string().uuid(),
      language: z.string().default("en"),
      count: z.number().int().min(2).max(5).default(4),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: lesson } = await (context.supabase as any)
      .from("academy_lessons")
      .select("title, objectives, explanation, examples, best_practices, summary")
      .eq("id", data.lesson_id).maybeSingle();
    if (!lesson) throw new Error("Lesson not found");
    const body = [
      `TITLE: ${lesson.title}`,
      `OBJECTIVES: ${(((lesson as any).objectives as string[]) ?? []).join(" | ")}`,
      `EXPLANATION:\n${lesson.explanation ?? ""}`,
      `EXAMPLES:\n${lesson.examples ?? ""}`,
      `BEST PRACTICES:\n${lesson.best_practices ?? ""}`,
      `SUMMARY:\n${lesson.summary ?? ""}`,
    ].join("\n\n").slice(0, 12000);

    const gateway = await ai();
    const { experimental_output } = await generateText({
      model: gateway(MODEL),
      experimental_output: Output.object({ schema: QuizSchema }),
      messages: [
        { role: "system", content: `You generate concise enterprise training quizzes in ${data.language}. Each question must be answerable from the lesson content only. Mix multiple_choice (4 options), true_false, and short_answer. Provide a short explanation referencing the lesson. Never invent facts.` },
        { role: "user", content: `Generate exactly ${data.count} questions from this lesson:\n\n${body}` },
      ],
    });
    return experimental_output;
  });

const SubmitSchema = z.object({
  lesson_id: z.string().uuid(),
  enrollment_id: z.string().uuid().optional().nullable(),
  questions: z.array(QuestionSchema),
  answers: z.array(z.string()),
  duration_seconds: z.number().int().optional(),
  time_spent_seconds: z.number().int().optional(),
});

export const submitAcademyQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.answers.length !== data.questions.length) throw new Error("Answer count mismatch");

    const { data: lesson } = await (context.supabase as any)
      .from("academy_lessons")
      .select("company_id, chapter_id, academy_chapters!inner(path_id, academy_learning_paths!inner(passing_score))")
      .eq("id", data.lesson_id).maybeSingle();
    if (!lesson) throw new Error("Lesson not found");
    const passingScore: number = (lesson as any).academy_chapters?.academy_learning_paths?.passing_score ?? 70;

    // Local grading for objective questions; use AI for short_answer.
    const results: Array<{ correct: boolean; explanation: string; correct_answer: string }> = [];
    const gateway = await ai();
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i]; const a = (data.answers[i] ?? "").trim();
      if (q.type === "multiple_choice" || q.type === "true_false") {
        const correct = a.toLowerCase() === q.correct_answer.trim().toLowerCase();
        results.push({ correct, explanation: q.explanation, correct_answer: q.correct_answer });
      } else {
        const { text } = await generateText({
          model: gateway(MODEL),
          messages: [
            { role: "system", content: "You grade short-answer quiz responses. Reply ONLY with 'YES' or 'NO'." },
            { role: "user", content: `Question: ${q.question}\nExpected: ${q.correct_answer}\nLearner answer: ${a}\nIs the learner answer correct in meaning?` },
          ],
        });
        const correct = /^yes/i.test(text.trim());
        results.push({ correct, explanation: q.explanation, correct_answer: q.correct_answer });
      }
    }
    const correctCount = results.filter((r) => r.correct).length;
    const score = Math.round((correctCount / results.length) * 100);
    const passed = score >= passingScore;

    await (context.supabase as any).from("academy_quiz_attempts").insert({
      company_id: (lesson as any).company_id,
      lesson_id: data.lesson_id,
      user_id: context.userId,
      questions: data.questions,
      answers: data.answers,
      score, passed,
      duration_seconds: data.duration_seconds ?? null,
    });

    // Update progress
    if (data.enrollment_id) {
      const { data: existing } = await (context.supabase as any)
        .from("academy_lesson_progress")
        .select("id, attempts, time_spent_seconds")
        .eq("enrollment_id", data.enrollment_id)
        .eq("lesson_id", data.lesson_id).maybeSingle();
      const baseAttempts = (existing?.attempts ?? 0) + 1;
      const baseTime = (existing?.time_spent_seconds ?? 0) + (data.time_spent_seconds ?? 0);
      if (existing) {
        await (context.supabase as any)
          .from("academy_lesson_progress").update({
            attempts: baseAttempts, last_score: score, time_spent_seconds: baseTime,
            status: passed ? "completed" : "in_progress",
            completed_at: passed ? new Date().toISOString() : null,
            last_activity_at: new Date().toISOString(),
          }).eq("id", existing.id);
      } else {
        await (context.supabase as any).from("academy_lesson_progress").insert({
          company_id: (lesson as any).company_id,
          enrollment_id: data.enrollment_id,
          lesson_id: data.lesson_id,
          user_id: context.userId,
          attempts: 1, last_score: score, time_spent_seconds: data.time_spent_seconds ?? 0,
          status: passed ? "completed" : "in_progress",
          completed_at: passed ? new Date().toISOString() : null,
          last_activity_at: new Date().toISOString(),
        });
      }
    }

    return { score, passed, passingScore, results };
  });

/* ----------------------------- Enrollments --------------------------- */

export const enrollSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: path } = await (context.supabase as any)
      .from("academy_learning_paths").select("company_id, mandatory")
      .eq("id", data.path_id).maybeSingle();
    if (!path) throw new Error("Path not found");
    const { data: existing } = await (context.supabase as any)
      .from("academy_enrollments").select("id")
      .eq("path_id", data.path_id).eq("user_id", context.userId).maybeSingle();
    if (existing) return { id: existing.id as string, existing: true };
    const { data: row, error } = await (context.supabase as any)
      .from("academy_enrollments")
      .insert({
        company_id: (path as any).company_id,
        path_id: data.path_id,
        user_id: context.userId,
        status: "assigned",
        mandatory: (path as any).mandatory,
        assigned_by: context.userId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, existing: false };
  });

export const assignEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      path_id: z.string().uuid(),
      user_ids: z.array(z.string().uuid()).min(1),
      due_at: z.string().datetime().optional().nullable(),
      mandatory: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { data: path } = await (context.supabase as any)
      .from("academy_learning_paths").select("company_id").eq("id", data.path_id).maybeSingle();
    if (!path) throw new Error("Path not found");
    const rows = data.user_ids.map((uid) => ({
      company_id: (path as any).company_id,
      path_id: data.path_id,
      user_id: uid,
      status: "assigned" as const,
      mandatory: data.mandatory,
      assigned_by: context.userId,
      due_at: data.due_at ?? null,
    }));
    const { error } = await (context.supabase as any).from("academy_enrollments").upsert(rows, {
      onConflict: "path_id,user_id", ignoreDuplicates: false,
    });
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });

export const listMyEnrollments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("academy_enrollments")
      .select("id, status, mandatory, due_at, started_at, completed_at, created_at, academy_learning_paths(id, title, description, language, passing_score, academy_departments(name))")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const startEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await (context.supabase as any).from("academy_enrollments")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", context.userId).is("started_at", null);
    return { ok: true };
  });

export const getEnrollmentProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await (context.supabase as any)
      .from("academy_lesson_progress")
      .select("lesson_id, status, last_score, attempts, time_spent_seconds, completed_at")
      .eq("enrollment_id", data.enrollment_id);
    return rows ?? [];
  });

export const completeEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: enroll } = await (context.supabase as any)
      .from("academy_enrollments").select("id, path_id, user_id, company_id")
      .eq("id", data.enrollment_id).maybeSingle();
    if (!enroll || (enroll as any).user_id !== context.userId) throw new Error("Forbidden");

    const { data: progress } = await (context.supabase as any)
      .from("academy_lesson_progress")
      .select("last_score").eq("enrollment_id", data.enrollment_id);
    const scores = (progress ?? []).map((p: any) => Number(p.last_score ?? 0));
    const finalScore = scores.length ? Math.round(scores.reduce((s: number, n: number) => s + n, 0) / scores.length) : 0;

    await (context.supabase as any).from("academy_enrollments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.enrollment_id);

    // Issue certificate (skip if user lacks academy.certify — fallback no-op, employee still completes)
    const canCertify = await hasPermission(context, "academy.certify");
    if (canCertify) {
      const { issueAcademyCertificate } = await import("@/lib/academy-certificate.server");
      const cert = await issueAcademyCertificate(context.supabase, {
        enrollmentId: (enroll as any).id,
        pathId: (enroll as any).path_id,
        userId: (enroll as any).user_id,
        companyId: (enroll as any).company_id,
        finalScore,
      });
      return { ok: true, certificate_id: cert.id, certificate_code: cert.code };
    }
    return { ok: true };
  });

/* ----------------------------- Certificates -------------------------- */

export const listMyCertificates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("academy_certificates")
      .select("id, certificate_code, final_score, issued_at, pdf_path, academy_learning_paths(title)")
      .eq("user_id", context.userId).order("issued_at", { ascending: false });
    return data ?? [];
  });

export const certificateSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: cert } = await (context.supabase as any)
      .from("academy_certificates").select("pdf_path, user_id, company_id")
      .eq("id", data.id).maybeSingle();
    if (!cert) throw new Error("Not found");
    if ((cert as any).user_id !== context.userId) {
      await requirePermission(context, "academy.manage");
    }
    if (!(cert as any).pdf_path) throw new Error("PDF not generated yet");
    const { data: url, error } = await context.supabase.storage
      .from("academy-certificates").createSignedUrl((cert as any).pdf_path, 600);
    if (error) throw new Error(error.message);
    return { url: (url as any).signedUrl };
  });

/* ----------------------------- Dashboard ----------------------------- */

export const academyDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, data.company_id ?? null);
    const [{ data: kpis }, { data: heatmap }, { data: depts }] = await Promise.all([
      context.supabase.rpc("academy_kpis", { p_company: companyId }),
      context.supabase.rpc("academy_heatmap", { p_company: companyId }),
      context.supabase.rpc("academy_department_performance", { p_company: companyId }),
    ]);
    return {
      kpis: kpis ?? {}, heatmap: heatmap ?? [], departments: depts ?? [],
    };
  });

/* ---------------------------- AI welcome ----------------------------- */

export const academySuggestPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      department: z.string().optional().nullable(),
      role: z.string().optional().nullable(),
      experience: z.string().optional().nullable(),
      language: z.string().default("en"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, null);
    let q = (context.supabase as any)
      .from("academy_learning_paths")
      .select("id, title, description, target_role, experience_level, mandatory, academy_departments(name)")
      .eq("company_id", companyId).eq("publish_status", "published");
    if (data.department) q = q.ilike("academy_departments.name", `%${data.department}%`);
    if (data.role) q = q.ilike("target_role", `%${data.role}%`);
    if (data.experience) q = q.ilike("experience_level", `%${data.experience}%`);
    const { data: paths } = await q.limit(10);
    return paths ?? [];
  });

/* ----------------------- Settings (per company) ---------------------- */

export const getAcademySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, data.company_id ?? null);
    const { data: row } = await (context.supabase as any)
      .from("academy_settings").select("*").eq("company_id", companyId).maybeSingle();
    return row ?? {
      company_id: companyId, passing_score: 70, quiz_min: 3, quiz_max: 5,
      default_difficulty: "standard", certificate_template: {}, languages: ["en", "de", "ro"],
    };
  });

export const saveAcademySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      passing_score: z.number().int().min(0).max(100),
      quiz_min: z.number().int().min(1).max(20),
      quiz_max: z.number().int().min(1).max(20),
      default_difficulty: z.string(),
      languages: z.array(z.string()).min(1),
      company_id: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await resolveCompanyForWrite(context, data.company_id);
    const { error } = await (context.supabase as any).from("academy_settings").upsert({
      company_id: companyId,
      passing_score: data.passing_score,
      quiz_min: data.quiz_min, quiz_max: data.quiz_max,
      default_difficulty: data.default_difficulty,
      languages: data.languages,
    }, { onConflict: "company_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
