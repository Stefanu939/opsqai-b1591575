/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  requirePermission,
  resolveCompanyForWrite,
  getProfileCompany,
} from "@/lib/authorization";
import { assertModuleForCompany } from "@/lib/license-enforcement.server";

const ACADEMY_MODULE = "academy" as const;

const MODEL = "google/gemini-3-flash-preview";

async function ai() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

async function companyForRead(context: { supabase: any; userId: string }, hint?: string | null) {
  const companyId = hint ?? (await resolveCompanyForWrite(context, null));
  await assertModuleForCompany(companyId, ACADEMY_MODULE);
  return companyId;
}

async function companyForWrite(
  context: { supabase: any; userId: string },
  hint?: string | null,
) {
  const companyId = await resolveCompanyForWrite(context, hint ?? null);
  await assertModuleForCompany(companyId, ACADEMY_MODULE);
  return companyId;
}

/**
 * User-scoped Academy fns (my enrollments, my certificates, quiz attempts)
 * don't take a company_id argument. Enforce via the caller's profile company.
 */
async function enforceAcademyForCurrentUser(context: { supabase: any; userId: string }) {
  const companyId = await getProfileCompany(context.supabase, context.userId);
  if (!companyId) {
    // No profile company — treat as no install license, hard deny.
    await assertModuleForCompany("00000000-0000-0000-0000-000000000000", ACADEMY_MODULE);
    return;
  }
  await assertModuleForCompany(companyId, ACADEMY_MODULE);
}

/* ----------------------------- Departments ---------------------------- */

export const listAcademyDepartments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
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
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string().optional().nullable(),
        company_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
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
      .select("id")
      .single();
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
    z
      .object({
        company_id: z.string().uuid().optional().nullable(),
        department_id: z.string().uuid().optional().nullable(),
        publish_status: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, data.company_id ?? null);
    let q = (context.supabase as any)
      .from("academy_learning_paths")
      .select("*, academy_departments(name)")
      .eq("company_id", companyId)
      .order("order_index", { ascending: true });
    if (data.department_id) q = q.eq("department_id", data.department_id);
    if (data.publish_status)
      q = q.eq("publish_status", data.publish_status as "draft" | "published" | "archived");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PathInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const payload: Record<string, unknown> = { ...data, company_id: companyId };
    delete (payload as any).id;
    if (data.id) {
      const { error } = await (context.supabase as any)
        .from("academy_learning_paths")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("academy_learning_paths")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { error } = await (context.supabase as any)
      .from("academy_learning_paths")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: path, error } = await (context.supabase as any)
      .from("academy_learning_paths")
      .select("*, academy_departments(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!path) throw new Error("Path not found");

    const { data: chapters } = await (context.supabase as any)
      .from("academy_chapters")
      .select("*")
      .eq("path_id", data.id)
      .order("order_index");

    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    const { data: lessons } = chapterIds.length
      ? await (context.supabase as any)
          .from("academy_lessons")
          .select(
            "id, chapter_id, title, order_index, estimated_minutes, publish_status, version, language, source_document_id",
          )
          .in("chapter_id", chapterIds)
          .order("order_index")
      : { data: [] as any[] };

    return { path, chapters: chapters ?? [], lessons: lessons ?? [] };
  });

/* ------------------------------ Chapters ----------------------------- */

export const upsertAcademyChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        path_id: z.string().uuid(),
        title: z.string().min(1),
        summary: z.string().optional().nullable(),
        order_index: z.number().int().default(0),
        company_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
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
        path_id: data.path_id,
        title: data.title,
        summary: data.summary ?? null,
        order_index: data.order_index,
        company_id: companyId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAcademyChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { error } = await (context.supabase as any)
      .from("academy_chapters")
      .delete()
      .eq("id", data.id);
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
    const companyId = await companyForWrite(context, data.company_id);
    const payload: Record<string, unknown> = { ...data, company_id: companyId };
    delete (payload as any).id;
    if (data.id) {
      const { error } = await (context.supabase as any)
        .from("academy_lessons")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("academy_lessons")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { error } = await (context.supabase as any)
      .from("academy_lessons")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lesson, error } = await (context.supabase as any)
      .from("academy_lessons")
      .select(
        "*, academy_chapters(id, title, path_id, academy_learning_paths(id, title, passing_score, language))",
      )
      .eq("id", data.id)
      .maybeSingle();
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
  .inputValidator((d: unknown) =>
    z.object({ lesson_id: z.string().uuid(), version: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { data: v } = await (context.supabase as any)
      .from("academy_lesson_versions")
      .select("snapshot")
      .eq("lesson_id", data.lesson_id)
      .eq("version", data.version)
      .maybeSingle();
    if (!v) throw new Error("Version not found");
    const s = v.snapshot as any;
    const { error } = await (context.supabase as any)
      .from("academy_lessons")
      .update({
        title: s.title,
        objectives: s.objectives ?? [],
        explanation: s.explanation,
        examples: s.examples,
        best_practices: s.best_practices,
        summary: s.summary,
      })
      .eq("id", data.lesson_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------- AI: Convert SOP → Lesson --------------------- */

const LessonSchema = z.object({
  title: z.string(),
  objectives: z.array(z.string()),
  explanation: z.string(),
  examples: z.string(),
  best_practices: z.string(),
  summary: z.string(),
});

type AcademyLesson = z.infer<typeof LessonSchema>;

function extractJsonObject(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("AI response did not contain JSON.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  throw new Error("AI JSON response was incomplete.");
}

function coerceString(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim() || fallback;
  if (value == null) return fallback;
  return String(value).trim() || fallback;
}

function coerceStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => coerceString(item)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|;|\|/)
      .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeLesson(value: any, fallbackTitle: string): AcademyLesson {
  const title = coerceString(value?.title, fallbackTitle).slice(0, 180);
  const objectives = coerceStringArray(value?.objectives);
  return LessonSchema.parse({
    title,
    objectives: objectives.length ? objectives : [`Understand ${title}`],
    explanation: coerceString(value?.explanation, `Review the source SOP content for ${title}.`),
    examples: coerceString(
      value?.examples,
      "Apply the procedure exactly as described in the source SOP.",
    ),
    best_practices: coerceString(
      value?.best_practices,
      "- Follow the approved SOP\n- Ask a manager when unsure",
    ),
    summary: coerceString(
      value?.summary,
      `Key points for ${title} are derived from the selected SOP.`,
    ),
  });
}

function parseJsonObject(raw: string) {
  return JSON.parse(extractJsonObject(raw));
}

function fallbackLessonFromSource(title: string, source: string): AcademyLesson {
  const excerpt = source.replace(/\s+/g, " ").trim().slice(0, 1200);
  return normalizeLesson(
    {
      title,
      objectives: [
        `Understand ${title}`,
        "Apply the documented procedure",
        "Identify when escalation is required",
      ],
      explanation: excerpt || `Review the source SOP content for ${title}.`,
      examples: excerpt
        ? `Example from source material:\n\n${excerpt.slice(0, 500)}`
        : "Use the procedure in the operational situation described by the SOP.",
      best_practices:
        "- Follow the SOP step by step\n- Use the required checks before completion\n- Escalate unclear cases to a manager",
      summary: `This lesson is based on the source SOP: ${title}.`,
    },
    title,
  );
}

export const convertSopToLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        document_id: z.string().uuid(),
        chapter_id: z.string().uuid(),
        language: z.string().default("en"),
        auto_publish: z.boolean().default(false),
        company_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);

    const { data: doc, error: dErr } = await context.supabase
      .from("knowledge_documents")
      .select("id, title, version")
      .eq("id", data.document_id)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!doc) throw new Error("Document not found");

    const { data: chunks } = await context.supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", data.document_id)
      .order("chunk_index")
      .limit(40);
    const body = (chunks ?? [])
      .map((c: any) => c.content)
      .join("\n\n")
      .slice(0, 18000);

    const gateway = await ai();
    const { text } = await generateText({
      model: gateway(MODEL),
      messages: [
        {
          role: "system",
          content: `You convert SOPs into clear, engaging onboarding lessons. Write everything in ${data.language}. Use Markdown for the body fields. Keep the tone supportive and practical for warehouse / operations staff. Never invent facts not present in the SOP. Return only valid JSON, without markdown fences or commentary.`,
        },
        {
          role: "user",
          content: `SOP TITLE: ${doc.title}\n\nSOP CONTENT:\n${body}\n\nReturn this exact JSON object shape:\n{"title":"short title","objectives":["objective"],"explanation":"markdown 200-400 words","examples":"markdown with 2-3 short scenarios","best_practices":"markdown bullet list","summary":"markdown 3-5 bullets"}`,
        },
      ],
    });
    let lesson: AcademyLesson;
    try {
      lesson = normalizeLesson(parseJsonObject(text), doc.title as string);
    } catch (error) {
      console.warn("Academy SOP conversion JSON parse failed; using source-based fallback", error);
      lesson = fallbackLessonFromSource(doc.title as string, body);
    }

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
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, lesson };
  });

/* ----------------------- AI: Generate Course (multi SOPs) ------------- */

const CourseSchema = z.object({
  path_title: z.string(),
  path_description: z.string(),
  chapters: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      lessons: z.array(LessonSchema),
    }),
  ),
});

export const generateAcademyCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        document_ids: z.array(z.string().uuid()).min(1).max(15),
        department_id: z.string().uuid().optional().nullable(),
        language: z.string().default("en"),
        target_role: z.string().optional().nullable(),
        company_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);

    const { data: docs } = await context.supabase
      .from("knowledge_documents")
      .select("id, title, version")
      .in("id", data.document_ids);
    const { data: chunks } = await context.supabase
      .from("document_chunks")
      .select("document_id, chunk_index, content")
      .in("document_id", data.document_ids)
      .order("chunk_index")
      .limit(400);
    const byDoc: Record<string, string> = {};
    for (const c of (chunks ?? []) as any[]) {
      byDoc[c.document_id] = (byDoc[c.document_id] ?? "") + "\n" + c.content;
    }
    const corpus = (docs ?? [])
      .map((d: any) => `### SOP: ${d.title}\n${(byDoc[d.id] ?? "").slice(0, 6000)}`)
      .join("\n\n");

    if (!docs?.length) throw new Error("No source SOPs were found for course generation.");
    if (!corpus.trim())
      throw new Error("The selected SOPs do not contain readable text for course generation.");

    const gateway = await ai();
    const { text } = await generateText({
      model: gateway(MODEL),
      messages: [
        {
          role: "system",
          content: `You design enterprise onboarding learning paths. Write everything in ${data.language}. Group related SOPs into 2-5 chapters, each with 1-4 lessons. Use Markdown in lesson bodies. Never invent facts not present in the SOPs. Return only valid JSON, without markdown fences or commentary.`,
        },
        {
          role: "user",
          content: `Create a coherent learning path${data.target_role ? ` for role: ${data.target_role}` : ""} from these SOPs:\n\n${corpus.slice(0, 24000)}\n\nReturn this exact JSON object shape:\n{"path_title":"course title","path_description":"short description","chapters":[{"title":"chapter title","summary":"chapter summary","lessons":[{"title":"lesson title","objectives":["objective"],"explanation":"markdown lesson body","examples":"markdown examples","best_practices":"markdown bullet list","summary":"markdown summary"}]}]}`,
        },
      ],
    });
    let course: z.infer<typeof CourseSchema>;
    try {
      const parsed = parseJsonObject(text) as any;
      course = CourseSchema.parse({
        path_title: coerceString(
          parsed.path_title,
          data.target_role ? `${data.target_role} Learning Path` : "Academy Learning Path",
        ).slice(0, 180),
        path_description: coerceString(parsed.path_description, "Generated from selected SOPs."),
        chapters: (Array.isArray(parsed.chapters) ? parsed.chapters : [])
          .map((chapter: any, ci: number) => ({
            title: coerceString(chapter?.title, `Chapter ${ci + 1}`).slice(0, 180),
            summary: coerceString(chapter?.summary, "Source-based training chapter."),
            lessons: (Array.isArray(chapter?.lessons) ? chapter.lessons : []).map(
              (lesson: any, li: number) => normalizeLesson(lesson, `Lesson ${li + 1}`),
            ),
          }))
          .filter((chapter: any) => chapter.lessons.length > 0),
      });
      if (course.chapters.length === 0) throw new Error("Course contained no usable lessons.");
    } catch (error) {
      console.warn("Academy course JSON parse failed; using source-based fallback", error);
      const fallbackChapters = (docs as any[]).slice(0, 5).map((doc: any, index: number) => ({
        title: coerceString(doc.title, `SOP ${index + 1}`).slice(0, 180),
        summary: `Training chapter generated from ${coerceString(doc.title, "selected SOP")}.`,
        lessons: [
          fallbackLessonFromSource(
            coerceString(doc.title, `Lesson ${index + 1}`),
            byDoc[doc.id] ?? "",
          ),
        ],
      }));
      course = CourseSchema.parse({
        path_title: data.target_role
          ? `${data.target_role} Learning Path`
          : "Academy Learning Path",
        path_description: "Draft course generated from the selected SOPs.",
        chapters: fallbackChapters,
      });
    }

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
      .select("id")
      .single();
    const pathId = path!.id as string;

    for (let ci = 0; ci < course.chapters.length; ci++) {
      const ch = course.chapters[ci];
      const { data: chap } = await (context.supabase as any)
        .from("academy_chapters")
        .insert({
          company_id: companyId,
          path_id: pathId,
          title: ch.title,
          summary: ch.summary,
          order_index: ci,
        })
        .select("id")
        .single();
      const chapterId = chap!.id as string;
      for (let li = 0; li < ch.lessons.length; li++) {
        const ls = ch.lessons[li];
        await (context.supabase as any).from("academy_lessons").insert({
          company_id: companyId,
          chapter_id: chapterId,
          title: ls.title,
          objectives: ls.objectives,
          explanation: ls.explanation,
          examples: ls.examples,
          best_practices: ls.best_practices,
          summary: ls.summary,
          language: data.language,
          order_index: li,
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
    z
      .object({
        lesson_id: z.string().uuid(),
        language: z.string().default("en"),
        count: z.number().int().min(2).max(5).default(4),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceAcademyForCurrentUser(context);
    const { data: lesson } = await (context.supabase as any)
      .from("academy_lessons")
      .select("title, objectives, explanation, examples, best_practices, summary")
      .eq("id", data.lesson_id)
      .maybeSingle();
    if (!lesson) throw new Error("Lesson not found");
    const body = [
      `TITLE: ${lesson.title}`,
      `OBJECTIVES: ${(((lesson as any).objectives as string[]) ?? []).join(" | ")}`,
      `EXPLANATION:\n${lesson.explanation ?? ""}`,
      `EXAMPLES:\n${lesson.examples ?? ""}`,
      `BEST PRACTICES:\n${lesson.best_practices ?? ""}`,
      `SUMMARY:\n${lesson.summary ?? ""}`,
    ]
      .join("\n\n")
      .slice(0, 12000);

    const gateway = await ai();
    const { text } = await generateText({
      model: gateway(MODEL),
      messages: [
        {
          role: "system",
          content: `You generate concise enterprise training quizzes. Write the question text, options, correct_answer, and explanation in ${data.language}. Each question must be answerable from the lesson content only — translate the lesson on the fly without changing its meaning, never invent facts, never omit safety information. Keep domain/technical terms (e.g. "Wareneingang", "CMR", product codes, system names) in their original language; you may add a short gloss in parentheses. Numbers, units, codes, and quoted policy text stay verbatim. Mix multiple_choice (4 options), true_false, and short_answer. Provide a short explanation referencing the lesson. Return only valid JSON, without markdown fences or commentary.`,
        },
        {
          role: "user",
          content: `Generate exactly ${data.count} questions from this lesson:\n\n${body}\n\nReturn this exact JSON object shape:\n{"questions":[{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct_answer":"A","explanation":"..."}]}`,
        },
      ],
    });
    try {
      const parsed = parseJsonObject(text) as any;
      const mapped = (Array.isArray(parsed.questions) ? parsed.questions : [])
        .map((q: any) => ({
          type: ["multiple_choice", "true_false", "short_answer"].includes(q?.type)
            ? q.type
            : "short_answer",
          question: coerceString(q?.question, `What is a key point from ${lesson.title}?`),
          options: Array.isArray(q?.options)
            ? q.options
                .map((option: unknown) => coerceString(option))
                .filter(Boolean)
                .slice(0, 4)
            : undefined,
          correct_answer: coerceString(q?.correct_answer, "See lesson content"),
          explanation: coerceString(q?.explanation, "This answer is based on the lesson content."),
        }))
        .slice(0, data.count);
      const questions = QuizSchema.parse({ questions: mapped }).questions;

      // SECURITY: persist the graded questions (including correct_answer)
      // server-side so submission can be graded against a trusted source
      // rather than a client-supplied correct_answer field.
      const { data: attempt, error: attemptErr } = await (context.supabase as any)
        .from("academy_quiz_attempts")
        .insert({
          company_id: (lesson as any).company_id ?? null,
          lesson_id: data.lesson_id,
          user_id: context.userId,
          questions,
          answers: [],
          score: 0,
          passed: false,
        })
        .select("id")
        .single();
      if (attemptErr || !attempt)
        throw new Error(attemptErr?.message ?? "Could not start quiz attempt");

      // Client-safe questions — strip correct_answer so it cannot be replayed.
      const clientQuestions = questions.map(({ correct_answer: _ca, ...rest }) => rest);
      return { attempt_id: attempt.id as string, questions: clientQuestions };
    } catch (error) {
      console.warn("Academy quiz JSON parse failed; using source-based fallback", error);
      const fallback = QuizSchema.parse({
        questions: [
          {
            type: "short_answer" as const,
            question: `What is the main operational purpose of ${lesson.title}?`,
            correct_answer: "The answer should reflect the documented lesson purpose.",
            explanation: "This fallback question is grounded in the lesson title and body.",
          },
          {
            type: "true_false" as const,
            question: "Learners should follow the approved procedure described in the lesson.",
            options: ["True", "False"],
            correct_answer: "True",
            explanation: "The lesson content is based on approved operational knowledge.",
          },
        ].slice(0, Math.max(2, data.count)),
      });
      const { data: attempt, error: attemptErr } = await (context.supabase as any)
        .from("academy_quiz_attempts")
        .insert({
          company_id: (lesson as any).company_id ?? null,
          lesson_id: data.lesson_id,
          user_id: context.userId,
          questions: fallback.questions,
          answers: [],
          score: 0,
          passed: false,
        })
        .select("id")
        .single();
      if (attemptErr || !attempt)
        throw new Error(attemptErr?.message ?? "Could not start quiz attempt");
      const clientQuestions = fallback.questions.map(({ correct_answer: _ca, ...rest }) => rest);
      return { attempt_id: attempt.id as string, questions: clientQuestions };
    }
  });

const SubmitSchema = z.object({
  attempt_id: z.string().uuid(),
  enrollment_id: z.string().uuid().optional().nullable(),
  answers: z.array(z.string()),
  duration_seconds: z.number().int().optional(),
  time_spent_seconds: z.number().int().optional(),
});

type StoredQuestion = z.infer<typeof QuestionSchema>;

export const submitAcademyQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitSchema.parse(d))
  .handler(async ({ data, context }) => {
    await enforceAcademyForCurrentUser(context);
    // SECURITY: load the stored attempt and grade against the trusted
    // server-side questions. The client no longer supplies correct_answer.
    const { data: attempt, error: attemptErr } = await (context.supabase as any)
      .from("academy_quiz_attempts")
      .select("id, user_id, lesson_id, company_id, questions, passed, score")
      .eq("id", data.attempt_id)
      .maybeSingle();
    if (attemptErr) throw new Error(attemptErr.message);
    if (!attempt) throw new Error("Quiz attempt not found");
    if (attempt.user_id !== context.userId) throw new Error("Forbidden");

    const parsedQuestions = z.array(QuestionSchema).parse(attempt.questions ?? []);
    if (data.answers.length !== parsedQuestions.length) {
      throw new Error("Answer count mismatch");
    }

    const { data: lesson } = await (context.supabase as any)
      .from("academy_lessons")
      .select(
        "company_id, chapter_id, academy_chapters!inner(path_id, academy_learning_paths!inner(passing_score))",
      )
      .eq("id", attempt.lesson_id)
      .maybeSingle();
    if (!lesson) throw new Error("Lesson not found");
    const passingScore: number =
      (lesson as any).academy_chapters?.academy_learning_paths?.passing_score ?? 70;

    // Grade using stored, trusted correct_answer values.
    const results: Array<{ correct: boolean; explanation: string; correct_answer: string }> = [];
    const gateway = await ai();
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q: StoredQuestion = parsedQuestions[i];
      const a = (data.answers[i] ?? "").trim();
      if (q.type === "multiple_choice" || q.type === "true_false") {
        const correct = a.toLowerCase() === q.correct_answer.trim().toLowerCase();
        results.push({ correct, explanation: q.explanation, correct_answer: q.correct_answer });
      } else {
        const { text } = await generateText({
          model: gateway(MODEL),
          messages: [
            {
              role: "system",
              content: "You grade short-answer quiz responses. Reply ONLY with 'YES' or 'NO'.",
            },
            {
              role: "user",
              content: `Question: ${q.question}\nExpected: ${q.correct_answer}\nLearner answer: ${a}\nIs the learner answer correct in meaning?`,
            },
          ],
        });
        const correct = /^yes/i.test(text.trim());
        results.push({ correct, explanation: q.explanation, correct_answer: q.correct_answer });
      }
    }
    const correctCount = results.filter((r) => r.correct).length;
    const score = Math.round((correctCount / results.length) * 100);
    const passed = score >= passingScore;

    // Finalize the pending attempt row rather than inserting a new one.
    // SECURITY: score/passed are guarded by a BEFORE UPDATE trigger that
    // rejects non-service-role writes, so we grade with the admin client.
    // The caller was already authorized above (attempt.user_id check).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("academy_quiz_attempts")
      .update({
        answers: data.answers,
        score,
        passed,
        duration_seconds: data.duration_seconds ?? null,
      })
      .eq("id", attempt.id);

    // Update progress. SECURITY: status='completed'/completed_at/last_score
    // are guarded by a BEFORE INSERT/UPDATE trigger that rejects non-service-
    // role writes, so use supabaseAdmin here (caller already authorized above).
    if (data.enrollment_id) {
      const { data: existing } = await (supabaseAdmin as any)
        .from("academy_lesson_progress")
        .select("id, attempts, time_spent_seconds")
        .eq("enrollment_id", data.enrollment_id)
        .eq("lesson_id", attempt.lesson_id)
        .maybeSingle();
      const baseAttempts = (existing?.attempts ?? 0) + 1;
      const baseTime = (existing?.time_spent_seconds ?? 0) + (data.time_spent_seconds ?? 0);
      if (existing) {
        await (supabaseAdmin as any)
          .from("academy_lesson_progress")
          .update({
            attempts: baseAttempts,
            last_score: score,
            time_spent_seconds: baseTime,
            status: passed ? "completed" : "in_progress",
            completed_at: passed ? new Date().toISOString() : null,
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await (supabaseAdmin as any).from("academy_lesson_progress").insert({
          company_id: (lesson as any).company_id,
          enrollment_id: data.enrollment_id,
          lesson_id: attempt.lesson_id,
          user_id: context.userId,
          attempts: 1,
          last_score: score,
          time_spent_seconds: data.time_spent_seconds ?? 0,
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
    await enforceAcademyForCurrentUser(context);
    const { data: path } = await (context.supabase as any)
      .from("academy_learning_paths")
      .select("company_id, mandatory")
      .eq("id", data.path_id)
      .maybeSingle();
    if (!path) throw new Error("Path not found");
    const { data: existing } = await (context.supabase as any)
      .from("academy_enrollments")
      .select("id")
      .eq("path_id", data.path_id)
      .eq("user_id", context.userId)
      .maybeSingle();
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
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, existing: false };
  });

export const assignEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        path_id: z.string().uuid(),
        user_ids: z.array(z.string().uuid()).min(1),
        due_at: z.string().datetime().optional().nullable(),
        mandatory: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { data: path } = await (context.supabase as any)
      .from("academy_learning_paths")
      .select("company_id")
      .eq("id", data.path_id)
      .maybeSingle();
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
      onConflict: "path_id,user_id",
      ignoreDuplicates: false,
    });
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });

/** List all learners already assigned to a path (managers/admins only). */
export const listPathAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { data: rows, error } = await (context.supabase as any)
      .from("academy_enrollments")
      .select(
        "id, user_id, status, mandatory, due_at, started_at, completed_at, created_at, company_id",
      )
      .eq("path_id", data.path_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    if (userIds.length === 0) return [];
    const { data: profiles } = await (context.supabase as any)
      .from("profiles")
      .select("id, full_name, first_name, last_name")
      .in("id", userIds);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r: any) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
  });

/** List profiles for the same company as a path (used by the Assign picker). */
export const listAssignablePathLearners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { data: path } = await (context.supabase as any)
      .from("academy_learning_paths")
      .select("company_id")
      .eq("id", data.path_id)
      .maybeSingle();
    if (!path) throw new Error("Path not found");
    const { data: rows, error } = await (context.supabase as any)
      .from("profiles")
      .select("id, full_name, first_name, last_name, department_id, is_active")
      .eq("company_id", (path as any).company_id)
      .order("full_name");

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const removeEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const { error } = await (context.supabase as any)
      .from("academy_enrollments")
      .delete()
      .eq("id", data.enrollment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyEnrollments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await enforceAcademyForCurrentUser(context);
    } catch (e) {
      if (e instanceof Response) return [];
      throw e;
    }
    const { data, error } = await (context.supabase as any)
      .from("academy_enrollments")
      .select(
        "id, status, mandatory, due_at, started_at, completed_at, created_at, academy_learning_paths(id, title, description, language, passing_score, academy_departments(name))",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const startEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await enforceAcademyForCurrentUser(context);
    await (context.supabase as any)
      .from("academy_enrollments")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("started_at", null);
    return { ok: true };
  });

export const getEnrollmentProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await enforceAcademyForCurrentUser(context);
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
    await enforceAcademyForCurrentUser(context);
    const { data: enroll } = await (context.supabase as any)
      .from("academy_enrollments")
      .select("id, path_id, user_id, company_id")
      .eq("id", data.enrollment_id)
      .maybeSingle();
    if (!enroll || (enroll as any).user_id !== context.userId) throw new Error("Forbidden");

    const { data: progress } = await (context.supabase as any)
      .from("academy_lesson_progress")
      .select("last_score")
      .eq("enrollment_id", data.enrollment_id);
    const scores = (progress ?? []).map((p: any) => Number(p.last_score ?? 0));
    const finalScore = scores.length
      ? Math.round(scores.reduce((s: number, n: number) => s + n, 0) / scores.length)
      : 0;

    await (context.supabase as any)
      .from("academy_enrollments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.enrollment_id);

    // Always issue a certificate for the learner who completed the path.
    // Uses the admin (service-role) client internally, so permissions like
    // `academy.certify` are not required for self-completion.
    const { issueAcademyCertificate } = await import("@/lib/academy-certificate.server");
    const cert = await issueAcademyCertificate(context.supabase, {
      enrollmentId: (enroll as any).id,
      pathId: (enroll as any).path_id,
      userId: (enroll as any).user_id,
      companyId: (enroll as any).company_id,
      finalScore,
    });

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: learnerAuth } = await supabaseAdmin.auth.admin.getUserById(
        (enroll as any).user_id,
      );
      const learnerEmail = learnerAuth?.user?.email;
      const { data: learnerProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, first_name")
        .eq("id", (enroll as any).user_id)
        .maybeSingle();
      const { data: path } = await supabaseAdmin
        .from("academy_learning_paths")
        .select("title")
        .eq("id", (enroll as any).path_id)
        .maybeSingle();
      if (learnerEmail) {
        const { dispatchTransactionalEmail } = await import("@/lib/email/dispatch.server");
        await dispatchTransactionalEmail({
          templateName: "certificate-ready",
          recipientEmail: learnerEmail,
          templateData: {
            learnerName:
              (learnerProfile as { first_name?: string; full_name?: string } | null)?.first_name ??
              (learnerProfile as { full_name?: string } | null)?.full_name,
            pathTitle: (path as { title?: string } | null)?.title,
            score: finalScore,
            certificateUrl: "https://opsqai.de/app/academy",
            verifyUrl: `https://opsqai.de/verify/${cert.code}`,
          },
        });
      }
    } catch (e) {
      console.error("[academy.completePath] certificate email failed", (e as Error).message);
    }

    return { ok: true, certificate_id: cert.id, certificate_code: cert.code };
  });

/* ----------------------------- Certificates -------------------------- */

export const listMyCertificates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await enforceAcademyForCurrentUser(context);
    const { data } = await (context.supabase as any)
      .from("academy_certificates")
      .select(
        "id, certificate_code, final_score, issued_at, pdf_path, academy_learning_paths(title)",
      )
      .eq("user_id", context.userId)
      .order("issued_at", { ascending: false });
    return data ?? [];
  });

export const certificateSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await enforceAcademyForCurrentUser(context);
    const { data: cert } = await (context.supabase as any)
      .from("academy_certificates")
      .select("pdf_path, user_id, company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!cert) throw new Error("Not found");
    if ((cert as any).user_id !== context.userId) {
      await requirePermission(context, "academy.manage");
    }
    if (!(cert as any).pdf_path) throw new Error("PDF not generated yet");
    // Use the admin client for signed URL generation so it works regardless of
    // RLS storage-read scoping (the row-level cert check above is the gate).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: url, error } = await supabaseAdmin.storage
      .from("academy-certificates")
      .createSignedUrl((cert as any).pdf_path, 600, {
        download: `opsqai-certificate-${(cert as any).pdf_path.split("/").pop()}`,
      });
    if (error) throw new Error(error.message);
    return { url: (url as any).signedUrl };
  });

/* ----------------------------- Dashboard ----------------------------- */

export const academyDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, data.company_id ?? null);
    const [{ data: kpis }, { data: heatmap }, { data: depts }] = await Promise.all([
      context.supabase.rpc("academy_kpis", { p_company: companyId }),
      context.supabase.rpc("academy_heatmap", { p_company: companyId }),
      context.supabase.rpc("academy_department_performance", { p_company: companyId }),
    ]);
    return {
      kpis: kpis ?? {},
      heatmap: heatmap ?? [],
      departments: depts ?? [],
    };
  });

/* ---------------------------- AI welcome ----------------------------- */

export const academySuggestPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        department: z.string().optional().nullable(),
        role: z.string().optional().nullable(),
        experience: z.string().optional().nullable(),
        language: z.string().default("en"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, null);
    let q = (context.supabase as any)
      .from("academy_learning_paths")
      .select(
        "id, title, description, target_role, experience_level, mandatory, academy_departments(name)",
      )
      .eq("company_id", companyId)
      .eq("publish_status", "published");
    if (data.department) q = q.ilike("academy_departments.name", `%${data.department}%`);
    if (data.role) q = q.ilike("target_role", `%${data.role}%`);
    if (data.experience) q = q.ilike("experience_level", `%${data.experience}%`);
    const { data: paths } = await q.limit(10);
    return paths ?? [];
  });

/* ----------------------- Settings (per company) ---------------------- */

export const getAcademySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const companyId = await companyForRead(context, data.company_id ?? null);
    const { data: row } = await (context.supabase as any)
      .from("academy_settings")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    return (
      row ?? {
        company_id: companyId,
        passing_score: 70,
        quiz_min: 3,
        quiz_max: 5,
        default_difficulty: "standard",
        certificate_template: {},
        languages: ["en", "de", "ro"],
      }
    );
  });

export const saveAcademySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        passing_score: z.number().int().min(0).max(100),
        quiz_min: z.number().int().min(1).max(20),
        quiz_max: z.number().int().min(1).max(20),
        default_difficulty: z.string(),
        languages: z.array(z.string()).min(1),
        company_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const { error } = await (context.supabase as any).from("academy_settings").upsert(
      {
        company_id: companyId,
        passing_score: data.passing_score,
        quiz_min: data.quiz_min,
        quiz_max: data.quiz_max,
        default_difficulty: data.default_difficulty,
        languages: data.languages,
      },
      { onConflict: "company_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
