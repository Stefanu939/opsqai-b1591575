import { requireModuleAccess } from "@/lib/module-access.server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { generateAiText } from "@/lib/ai-provider.server";
import {
  requirePermission,
  resolveCompanyForWrite,
  getProfileCompany,
} from "@/lib/authorization";
import { assertModuleForCompany } from "@/lib/license-enforcement.server";
import { uuidString } from "@/lib/zod-uuid";
import {
  getAcademyRepository,
  getKnowledgeRepository,
  getProfileRepository,
  getStorageProvider,
} from "@/lib/providers/registry";
import {
  academyLanguageInstruction,
  hasWrongAcademyScript,
  localizedAcademyQuizFallback,
  normalizeAcademyLanguage,
} from "@/lib/academy-language";

const ACADEMY_MODULE = "academy" as const;

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
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    const companyId = await companyForRead(context, data.company_id ?? null);
    const repo = getAcademyRepository(context);
    const rows = await repo.listDepartments(companyId);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      created_at: r.createdAt,
    }));
  });

export const upsertAcademyDepartment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        name: z.string().min(1),
        description: z.string().optional().nullable(),
        company_id: uuidString().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const repo = getAcademyRepository(context);
    return repo.upsertDepartment({
      id: data.id,
      companyId,
      name: data.name,
      description: data.description ?? null,
    });
  });

/* --------------------------- Learning Paths --------------------------- */

const PathInput = z.object({
  id: uuidString().optional(),
  department_id: uuidString().optional().nullable(),
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
  company_id: uuidString().optional().nullable(),
});

export const listAcademyPaths = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: uuidString().optional().nullable(),
        department_id: uuidString().optional().nullable(),
        publish_status: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    const companyId = await companyForRead(context, data.company_id ?? null);
    const repo = getAcademyRepository(context);
    const rows = await repo.listLearningPaths(companyId, {
      departmentId: data.department_id ?? null,
      publishStatus: data.publish_status ?? null,
    });
    return rows.map((p) => ({
      ...p,
      academy_departments: p.department_name ? { name: p.department_name } : null,
    }));
  });

export const upsertAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => PathInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const repo = getAcademyRepository(context);
    return repo.upsertLearningPath({
      id: data.id,
      companyId,
      departmentId: data.department_id ?? null,
      title: data.title,
      description: data.description ?? null,
      language: data.language,
      targetRole: data.target_role ?? null,
      targetPosition: data.target_position ?? null,
      experienceLevel: data.experience_level ?? null,
      employmentType: data.employment_type ?? null,
      mandatory: data.mandatory,
      passingScore: data.passing_score,
      difficulty: data.difficulty,
      publishStatus: data.publish_status,
      createdBy: context.userId,
    });
  });

export const deleteAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    await repo.deleteLearningPath(data.id);
    return { ok: true };
  });

export const getAcademyPath = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    const repo = getAcademyRepository(context);
    const result = await repo.getLearningPath(data.id);
    if (!result) throw new Error("Path not found");
    const { path, chapters, lessons } = result;
    return {
      path: { ...path, academy_departments: path.department_name ? { name: path.department_name } : null },
      chapters,
      lessons,
    };
  });

/* ------------------------------ Chapters ----------------------------- */

export const upsertAcademyChapter = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        path_id: uuidString(),
        title: z.string().min(1),
        summary: z.string().optional().nullable(),
        order_index: z.number().int().default(0),
        company_id: uuidString().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const repo = getAcademyRepository(context);
    return repo.upsertChapter({
      id: data.id,
      companyId,
      pathId: data.path_id,
      title: data.title,
      summary: data.summary ?? null,
      orderIndex: data.order_index,
    });
  });

export const deleteAcademyChapter = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    await repo.deleteChapter(data.id);
    return { ok: true };
  });

/* ------------------------------- Lessons ----------------------------- */

const LessonInput = z.object({
  id: uuidString().optional(),
  chapter_id: uuidString(),
  title: z.string().min(1),
  objectives: z.array(z.string()).default([]),
  explanation: z.string().optional().nullable(),
  examples: z.string().optional().nullable(),
  best_practices: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  language: z.string().default("en"),
  estimated_minutes: z.number().int().min(1).max(240).default(10),
  source_document_id: uuidString().optional().nullable(),
  publish_status: z.enum(["draft", "published", "archived"]).default("draft"),
  order_index: z.number().int().default(0),
  company_id: uuidString().optional().nullable(),
});

export const upsertAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => LessonInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const repo = getAcademyRepository(context);
    return repo.upsertLesson({
      id: data.id,
      companyId,
      chapterId: data.chapter_id,
      title: data.title,
      objectives: data.objectives,
      explanation: data.explanation ?? null,
      examples: data.examples ?? null,
      bestPractices: data.best_practices ?? null,
      summary: data.summary ?? null,
      language: data.language,
      estimatedMinutes: data.estimated_minutes,
      sourceDocumentId: data.source_document_id ?? null,
      publishStatus: data.publish_status,
      orderIndex: data.order_index,
      createdBy: context.userId,
    });
  });

export const deleteAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    await repo.deleteLesson(data.id);
    return { ok: true };
  });

export const getAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    const repo = getAcademyRepository(context);
    const lesson = await repo.getLesson(data.id);
    if (!lesson) throw new Error("Lesson not found");
    return {
      ...lesson,
      academy_chapters: {
        id: lesson.chapter_id,
        title: lesson.chapter_title,
        path_id: lesson.chapter_path_id,
        academy_learning_paths: {
          id: lesson.chapter_path_id,
          title: lesson.path_title,
          passing_score: lesson.path_passing_score,
          language: lesson.path_language,
        },
      },
    };
  });

export const listAcademyLessonVersions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ lesson_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    return repo.listLessonVersions(data.lesson_id);
  });

export const restoreAcademyLessonVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ lesson_id: uuidString(), version: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    await repo.restoreLessonVersion(data.lesson_id, data.version);
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        document_id: uuidString(),
        chapter_id: uuidString(),
        language: z.string().default("en"),
        auto_publish: z.boolean().default(false),
        company_id: uuidString().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const knowledgeRepo = getKnowledgeRepository(context);
    const academyRepo = getAcademyRepository(context);

    const [doc] = await knowledgeRepo.getDocumentsByIds([data.document_id]);
    if (!doc) throw new Error("Document not found");

    const chunkContents = await knowledgeRepo.getChunksContent(data.document_id, 40);
    const body = chunkContents.join("\n\n").slice(0, 18000);

    const text = await generateAiText({
      role: "chat",
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

    const row = await academyRepo.upsertLesson({
      companyId,
      chapterId: data.chapter_id,
      title: lesson.title,
      objectives: lesson.objectives,
      explanation: lesson.explanation,
      examples: lesson.examples,
      bestPractices: lesson.best_practices,
      summary: lesson.summary,
      language: data.language,
      estimatedMinutes: 10,
      sourceDocumentId: data.document_id,
      sourceDocumentVersion: doc.version ?? 1,
      publishStatus: data.auto_publish ? "published" : "draft",
      orderIndex: 0,
      createdBy: context.userId,
    });
    return { id: row.id, lesson };
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        document_ids: z.array(uuidString()).min(1).max(15),
        department_id: uuidString().optional().nullable(),
        language: z.string().default("en"),
        target_role: z.string().optional().nullable(),
        company_id: uuidString().optional().nullable(),
        // Passing score is configurable per course; when omitted it falls back
        // to the company's Academy settings, never to a hardcoded value.
        passing_score: z.number().int().min(0).max(100).optional().nullable(),
        mandatory: z.boolean().optional().default(false),
        difficulty: z.string().optional().default("standard"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const knowledgeRepo = getKnowledgeRepository(context);
    const academyRepo = getAcademyRepository(context);

    const docs = await knowledgeRepo.getDocumentsByIds(data.document_ids);
    const chunks = await knowledgeRepo.getChunksForDocuments(data.document_ids, 400);
    const byDoc: Record<string, string> = {};
    for (const c of chunks) {
      byDoc[c.document_id] = (byDoc[c.document_id] ?? "") + "\n" + c.content;
    }
    const corpus = (docs ?? [])
      .map((d) => `### SOP: ${d.title}\n${(byDoc[d.id] ?? "").slice(0, 6000)}`)
      .join("\n\n");

    if (!docs?.length) throw new Error("No source SOPs were found for course generation.");
    if (!corpus.trim())
      throw new Error("The selected SOPs do not contain readable text for course generation.");

    const text = await generateAiText({
      role: "chat",
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
    const path = await academyRepo.upsertLearningPath({
      companyId,
      departmentId: data.department_id ?? null,
      title: course.path_title,
      description: course.path_description,
      language: data.language,
      targetRole: data.target_role ?? null,
      mandatory: data.mandatory ?? false,
      passingScore:
        data.passing_score ?? (await academyRepo.getSettings(companyId))?.passing_score ?? 70,
      difficulty: data.difficulty ?? "standard",
      publishStatus: "draft",
      createdBy: context.userId,
    });
    const pathId = path.id;

    for (let ci = 0; ci < course.chapters.length; ci++) {
      const ch = course.chapters[ci];
      const chap = await academyRepo.upsertChapter({
        companyId,
        pathId,
        title: ch.title,
        summary: ch.summary,
        orderIndex: ci,
      });
      const chapterId = chap.id;
      for (let li = 0; li < ch.lessons.length; li++) {
        const ls = ch.lessons[li];
        await academyRepo.upsertLesson({
          companyId,
          chapterId,
          title: ls.title,
          objectives: ls.objectives,
          explanation: ls.explanation,
          examples: ls.examples,
          bestPractices: ls.best_practices,
          summary: ls.summary,
          language: data.language,
          estimatedMinutes: 10,
          publishStatus: "draft",
          orderIndex: li,
          createdBy: context.userId,
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lesson_id: uuidString(),
        language: z.string().default("en"),
        count: z.number().int().min(2).max(5).default(4),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    const lesson = await repo.getLesson(data.lesson_id);
    if (!lesson) throw new Error("Lesson not found");
    const language = normalizeAcademyLanguage(data.language);
    const languageInstruction = academyLanguageInstruction(language);
    const body = [
      `TITLE: ${lesson.title}`,
      `OBJECTIVES: ${(lesson.objectives ?? []).join(" | ")}`,
      `EXPLANATION:\n${lesson.explanation ?? ""}`,
      `EXAMPLES:\n${lesson.examples ?? ""}`,
      `BEST PRACTICES:\n${lesson.best_practices ?? ""}`,
      `SUMMARY:\n${lesson.summary ?? ""}`,
    ]
      .join("\n\n")
      .slice(0, 8000);

    const generate = (correction?: string) => generateAiText({
      role: "chat-fast",
      messages: [
        {
          role: "system",
          content: `You generate concise enterprise training quizzes.
TARGET LANGUAGE: ${languageInstruction}
LANGUAGE CONTRACT:
- Every natural-language word in question, options, correct_answer, and explanation MUST be idiomatic, grammatically correct TARGET LANGUAGE.
- The target language overrides the source lesson language and all languages visible in the source.
- Never infer the output language from the lesson. Never mix languages.
- Keep only immutable codes, product names, system names, abbreviations, numbers, units, and legal quotations verbatim.
- Mentally proofread grammar and language consistency before returning.
CONTENT CONTRACT: Every answer must come only from the lesson. Translate faithfully; never invent facts or omit safety information.
Mix multiple_choice (4 options), true_false, and short_answer. Return only valid JSON without markdown fences.${correction ? `\nCORRECTION REQUIRED: ${correction}` : ""}`,
        },
        {
          role: "user",
          content: `Generate exactly ${data.count} questions from this lesson:\n\n${body}\n\nReturn this exact JSON object shape:\n{"questions":[{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct_answer":"A","explanation":"..."}]}`,
        },
      ],
    });

    let text = await generate();
    if (hasWrongAcademyScript(text, language)) {
      text = await generate("The previous result used the wrong script/language. Regenerate from scratch exclusively in the TARGET LANGUAGE.");
    }

    const startAttempt = async (questions: z.infer<typeof QuestionSchema>[]) => {
      const attempt = await repo.createQuizAttempt({
        companyId: lesson.company_id ?? null,
        lessonId: data.lesson_id,
        userId: context.userId,
        questions,
      });
      const clientQuestions = questions.map(({ correct_answer: _ca, ...rest }) => rest);
      return { attempt_id: attempt.id, questions: clientQuestions };
    };

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
      const combinedText = questions
        .flatMap((question) => [question.question, ...(question.options ?? []), question.correct_answer, question.explanation])
        .join(" ");
      if (hasWrongAcademyScript(combinedText, language)) {
        throw new Error("Generated quiz did not satisfy the selected language");
      }

      // SECURITY: persist the graded questions (including correct_answer)
      // server-side so submission can be graded against a trusted source
      // rather than a client-supplied correct_answer field.
      return await startAttempt(questions);
    } catch (error) {
      console.warn("Academy quiz JSON parse failed; using source-based fallback", error);
      const fallback = QuizSchema.parse({
        questions: localizedAcademyQuizFallback(language, lesson.title),
      });
      return await startAttempt(fallback.questions);
    }
  });

const SubmitSchema = z.object({
  attempt_id: uuidString(),
  enrollment_id: uuidString().optional().nullable(),
  answers: z.array(z.string()),
  duration_seconds: z.number().int().optional(),
  time_spent_seconds: z.number().int().optional(),
});

type StoredQuestion = z.infer<typeof QuestionSchema>;

export const submitAcademyQuiz = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SubmitSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    // SECURITY: load the stored attempt and grade against the trusted
    // server-side questions. The client no longer supplies correct_answer.
    const attempt = await repo.getQuizAttempt(data.attempt_id);
    if (!attempt) throw new Error("Quiz attempt not found");
    if (attempt.user_id !== context.userId) throw new Error("Forbidden");

    const parsedQuestions = z.array(QuestionSchema).parse(attempt.questions ?? []);
    if (data.answers.length !== parsedQuestions.length) {
      throw new Error("Answer count mismatch");
    }

    const lesson = await repo.getLesson(attempt.lesson_id);
    if (!lesson) throw new Error("Lesson not found");
    // Course setting wins; otherwise the company Academy setting; 70 only as
    // the last resort when neither is configured.
    const passingScore: number =
      lesson.path_passing_score ??
      (lesson.company_id ? (await repo.getSettings(lesson.company_id))?.passing_score : null) ??
      70;


    // Grade using stored, trusted correct_answer values.
    const results: Array<{ correct: boolean; explanation: string; correct_answer: string }> = [];

    for (let i = 0; i < parsedQuestions.length; i++) {
      const q: StoredQuestion = parsedQuestions[i];
      const a = (data.answers[i] ?? "").trim();
      if (q.type === "multiple_choice" || q.type === "true_false") {
        const correct = a.toLowerCase() === q.correct_answer.trim().toLowerCase();
        results.push({ correct, explanation: q.explanation, correct_answer: q.correct_answer });
      } else {
        const text = await generateAiText({
          role: "chat",
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
    await repo.gradeQuizAttempt(attempt.id, {
      answers: data.answers,
      score,
      passed,
      durationSeconds: data.duration_seconds ?? null,
    });

    // Update progress.
    if (data.enrollment_id) {
      const existingProgress = (await repo.listLessonProgress(data.enrollment_id)).find(
        (p) => p.lesson_id === attempt.lesson_id,
      );
      await repo.upsertLessonProgress({
        companyId: lesson.company_id,
        enrollmentId: data.enrollment_id,
        lessonId: attempt.lesson_id,
        userId: context.userId,
        attempts: (existingProgress?.attempts ?? 0) + 1,
        lastScore: score,
        timeSpentSeconds: (existingProgress?.time_spent_seconds ?? 0) + (data.time_spent_seconds ?? 0),
        status: passed ? "completed" : "in_progress",
        completedAt: passed ? new Date().toISOString() : null,
      });
    }

    return { score, passed, passingScore, results };
  });

/* ----------------------------- Enrollments --------------------------- */

export const enrollSelf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ path_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    const pathResult = await repo.getLearningPath(data.path_id);
    if (!pathResult) throw new Error("Path not found");
    return repo.enroll({
      companyId: pathResult.path.company_id,
      pathId: data.path_id,
      userId: context.userId,
      status: "assigned",
      mandatory: pathResult.path.mandatory,
      assignedBy: context.userId,
    });
  });

export const assignEnrollment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        path_id: uuidString(),
        user_ids: z.array(uuidString()).min(1),
        due_at: z.string().datetime().optional().nullable(),
        mandatory: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    const pathResult = await repo.getLearningPath(data.path_id);
    if (!pathResult) throw new Error("Path not found");
    const rows = data.user_ids.map((uid) => ({
      companyId: pathResult.path.company_id,
      pathId: data.path_id,
      userId: uid,
      status: "assigned" as const,
      mandatory: data.mandatory,
      assignedBy: context.userId,
      dueAt: data.due_at ?? null,
    }));
    const result = await repo.assignEnrollments(rows);
    return { count: result.count };
  });

/** List all learners already assigned to a path (managers/admins only). */
export const listPathAssignments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ path_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    const rows = await repo.listEnrollmentsByPathWithProfile(data.path_id);
    return rows.map((r) => ({ ...r, profile: r.profile }));
  });

/** List profiles for the same company as a path (used by the Assign picker). */
export const listAssignablePathLearners = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ path_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const academyRepo = getAcademyRepository(context);
    const pathResult = await academyRepo.getLearningPath(data.path_id);
    if (!pathResult) throw new Error("Path not found");
    const profileRepo = getProfileRepository(context);
    const profiles = await profileRepo.listByCompany(pathResult.path.company_id);
    return profiles
      .map((p) => ({
        id: p.userId,
        full_name: p.fullName,
        first_name: p.firstName,
        last_name: p.lastName,
        department_id: p.departmentId,
        is_active: p.isActive,
      }))
      .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  });

export const removeEnrollment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const repo = getAcademyRepository(context);
    await repo.removeEnrollment(data.enrollment_id);
    return { ok: true };
  });

export const listMyEnrollments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireModuleAccess(context, "academy");
    try {
      await enforceAcademyForCurrentUser(context);
    } catch (e) {
      if (e instanceof Response) return [];
      throw e;
    }
    const repo = getAcademyRepository(context);
    const rows = await repo.listEnrollmentsByUserWithPath(context.userId);
    return rows.map((r) => ({
      ...r,
      academy_learning_paths: r.academy_learning_paths
        ? {
            ...r.academy_learning_paths,
            academy_departments: r.academy_learning_paths.department_name
              ? { name: r.academy_learning_paths.department_name }
              : null,
          }
        : null,
    }));
  });

export const startEnrollment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    await repo.startEnrollment(data.id, context.userId);
    return { ok: true };
  });

export const getEnrollmentProgress = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    return repo.listLessonProgress(data.enrollment_id);
  });

export const completeEnrollment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    const enroll = await repo.getEnrollment(data.enrollment_id);
    if (!enroll || enroll.user_id !== context.userId) throw new Error("Forbidden");

    const progress = await repo.listLessonProgress(data.enrollment_id);
    const scores = progress.map((p) => Number(p.last_score ?? 0));
    const finalScore = scores.length
      ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      : 0;

    await repo.completeEnrollment(data.enrollment_id);

    // Always issue a certificate for the learner who completed the path.
    const { issueAcademyCertificate } = await import("@/lib/academy-certificate.server");
    const cert = await issueAcademyCertificate(context, {
      enrollmentId: enroll.id,
      pathId: enroll.path_id,
      userId: enroll.user_id,
      companyId: enroll.company_id,
      finalScore,
    });

    try {
      const profileRepo = getProfileRepository(context);
      const learnerProfile = await profileRepo.findByUserId(enroll.user_id);
      const learnerEmail = learnerProfile?.email;
      const pathResult = await repo.getLearningPath(enroll.path_id);
      if (learnerEmail) {
        const { dispatchTransactionalEmail } = await import("@/lib/email/dispatch.server");
        await dispatchTransactionalEmail({
          templateName: "certificate-ready",
          recipientEmail: learnerEmail,
          templateData: {
            learnerName: learnerProfile?.firstName ?? learnerProfile?.fullName,
            pathTitle: pathResult?.path.title,
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
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    const rows = await repo.listCertificatesByUser(context.userId);
    return rows.map((r) => ({
      id: r.id,
      certificate_code: r.certificate_code,
      final_score: r.final_score,
      issued_at: r.issued_at,
      pdf_path: r.pdf_path,
      academy_learning_paths: r.path_title ? { title: r.path_title } : null,
    }));
  });

export const certificateSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await enforceAcademyForCurrentUser(context);
    const repo = getAcademyRepository(context);
    const cert = await repo.getCertificate(data.id);
    if (!cert) throw new Error("Not found");
    if (cert.user_id !== context.userId) {
      await requirePermission(context, "academy.manage");
    }
    if (!cert.pdf_path) throw new Error("PDF not generated yet");
    const bytes = await getStorageProvider().get("academy-certificates", cert.pdf_path);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const filename = `opsqai-certificate-${cert.pdf_path.split("/").pop()}`;
    return { url: `data:application/pdf;base64,${btoa(binary)}#${filename}` };
  });

/* ----------------------------- Dashboard ----------------------------- */

export const academyDashboard = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    const companyId = await companyForRead(context, data.company_id ?? null);
    const repo = getAcademyRepository(context);
    const [kpis, heatmap, depts] = await Promise.all([
      repo.getKpis(companyId),
      repo.getHeatmap(companyId),
      repo.getDepartmentPerformance(companyId),
    ]);
    return {
      kpis: kpis ?? {},
      heatmap: heatmap ?? [],
      departments: depts ?? [],
    };
  });

/* ---------------------------- AI welcome ----------------------------- */

export const academySuggestPath = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    await requireModuleAccess(context, "academy");
    const companyId = await companyForRead(context, null);
    const repo = getAcademyRepository(context);
    let paths = await repo.listLearningPaths(companyId, { publishStatus: "published" });
    if (data.department)
      paths = paths.filter((p) =>
        (p.department_name ?? "").toLowerCase().includes((data.department ?? "").toLowerCase()),
      );
    if (data.role)
      paths = paths.filter((p) =>
        (p.target_role ?? "").toLowerCase().includes((data.role ?? "").toLowerCase()),
      );
    if (data.experience)
      paths = paths.filter((p) =>
        (p.experience_level ?? "").toLowerCase().includes((data.experience ?? "").toLowerCase()),
      );
    return paths.slice(0, 10).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      target_role: p.target_role,
      experience_level: p.experience_level,
      mandatory: p.mandatory,
      academy_departments: p.department_name ? { name: p.department_name } : null,
    }));
  });

/* ----------------------- Settings (per company) ---------------------- */

export const getAcademySettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    const companyId = await companyForRead(context, data.company_id ?? null);
    const repo = getAcademyRepository(context);
    const row = await repo.getSettings(companyId);
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        passing_score: z.number().int().min(0).max(100),
        quiz_min: z.number().int().min(1).max(20),
        quiz_max: z.number().int().min(1).max(20),
        default_difficulty: z.string(),
        languages: z.array(z.string()).min(1),
        company_id: uuidString().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "academy");
    await requirePermission(context, "academy.manage");
    const companyId = await companyForWrite(context, data.company_id);
    const repo = getAcademyRepository(context);
    await repo.saveSettings({
      companyId,
      passingScore: data.passing_score,
      quizMin: data.quiz_min,
      quizMax: data.quiz_max,
      defaultDifficulty: data.default_difficulty,
      languages: data.languages,
    });
    return { ok: true };
  });
