/**
 * AI Audit — recommendation & learning-intelligence engine.
 *
 * Pure, deterministic functions: the audit run collects real signals from the
 * local database (Self-Hosted) or Cloud, then this module turns them into
 * actionable recommendations (missing SOP, missing FAQ, a course to build, a
 * course to assign to a specific person with concrete settings).
 *
 * No AI calls, no I/O — so it is fully testable and behaves identically on
 * Self-Hosted (offline) and Cloud.
 */

export interface AuditGapCluster {
  /** Knowledge-gap row id, when the signal came from a tracked gap. */
  id?: string | null;
  question: string;
  occurrences: number;
  status: string;
  departmentName: string | null;
  lastSeen: string;
  confidence: number | null;
}

export interface AuditLearnerSignal {
  userId: string;
  name: string;
  department: string | null;
  /** Questions asked in chat while at least one enrollment was in progress. */
  questionsWhileLearning: number;
  /** Total learning time recorded on lesson progress (seconds). */
  learningSeconds: number;
  /** Assistant answers below the grounding confidence bar for this user. */
  lowConfidenceQuestions: number;
  /** Mean assistant confidence for this user's threads (0..1). */
  avgConfidence: number;
  activeEnrollments: number;
  overdueEnrollments: number;
  completedEnrollments: number;
  avgQuizScore: number | null;
  failedQuizAttempts: number;
}

export interface AuditKnowledgeSignal {
  documents: number;
  readyDocuments: number;
  staleDocuments: number;
  faqs: number;
  courses: number;
  /** Document count per category, used to spot uncovered areas. */
  categories: Record<string, number>;
  outdatedDocuments?: number;
  reviewDueSoonDocuments?: number;
  medianDocumentAgeDays?: number | null;
}

export type RecommendationKind =
  | "sop"
  | "faq"
  | "course"
  | "course_assignment"
  | "quiz"
  | "policy_review";

export type RecommendationPriority = "low" | "medium" | "high" | "critical";

export interface SuggestedCourseSettings {
  format: "microlearning" | "standard" | "workshop";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  passingScore: number;
  dueInDays: number;
  reminderCadenceDays: number;
  mandatory: boolean;
  retakeAfterDays: number;
  language: "auto";
  chapters: string[];
}

export interface AuditRecommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  rationale: string;
  priority: RecommendationPriority;
  /** Expected audit-score improvement if actioned (points). */
  expectedScoreImprovement: number;
  effort: "low" | "medium" | "high";
  department: string | null;
  /** Human-readable data points that produced this recommendation. */
  evidence: string[];
  targetUser?: { id: string; name: string };
  suggestedCourse?: SuggestedCourseSettings;
  /**
   * When present, this recommendation can be executed automatically: the
   * platform generates the artefact (SOP or FAQ), publishes it into the
   * knowledge base and closes the originating knowledge gap.
   */
  autoAction?: {
    type: "generate_sop" | "generate_faq";
    question: string;
    department: string | null;
    gapId: string | null;
  };
}

export interface AuditIntelligence {
  recommendations: AuditRecommendation[];
  /** 0-100: how much friction users hit while learning / self-serving. */
  frictionIndex: number;
  /** 0-100: share of questions answered with solid grounding. */
  selfServiceRate: number;
  topFrictionDepartments: { department: string; score: number }[];
  learnerCoaching: {
    userId: string;
    name: string;
    department: string | null;
    frictionScore: number;
    questionsPerLearningHour: number;
    reason: string;
  }[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";

const shorten = (s: string, max = 70) =>
  s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;

/** Questions asked per hour of learning time — the core friction signal. */
export function questionsPerLearningHour(l: AuditLearnerSignal): number {
  const hours = l.learningSeconds / 3600;
  if (hours < 0.05) return l.questionsWhileLearning > 0 ? l.questionsWhileLearning : 0;
  return round(l.questionsWhileLearning / hours, 1);
}

/** 0-100 friction score for one learner (higher = needs help sooner). */
export function learnerFrictionScore(l: AuditLearnerSignal): number {
  const velocity = Math.min(40, questionsPerLearningHour(l) * 8);
  const lowConf = Math.min(25, l.lowConfidenceQuestions * 5);
  const confPenalty = l.avgConfidence > 0 ? Math.min(15, (1 - l.avgConfidence) * 30) : 0;
  const quizPenalty =
    l.avgQuizScore == null ? 0 : Math.min(15, Math.max(0, (80 - l.avgQuizScore) / 2));
  const overdue = Math.min(10, l.overdueEnrollments * 5);
  return Math.round(clamp(velocity + lowConf + confPenalty + quizPenalty + overdue));
}

function courseSettingsFor(l: AuditLearnerSignal): SuggestedCourseSettings {
  const friction = learnerFrictionScore(l);
  const perHour = questionsPerLearningHour(l);
  const weakQuiz = l.avgQuizScore != null && l.avgQuizScore < 70;
  return {
    // Lots of questions in a short window → short, repeated units beat one long course.
    format: perHour >= 6 ? "microlearning" : friction >= 55 ? "standard" : "microlearning",
    difficulty: weakQuiz || friction >= 60 ? "beginner" : "intermediate",
    estimatedMinutes: perHour >= 6 ? 10 : friction >= 55 ? 25 : 15,
    passingScore: weakQuiz ? 85 : 80,
    dueInDays: friction >= 70 ? 3 : friction >= 50 ? 7 : 14,
    reminderCadenceDays: friction >= 70 ? 1 : friction >= 50 ? 2 : 4,
    mandatory: friction >= 55 || l.overdueEnrollments > 0,
    retakeAfterDays: weakQuiz ? 3 : 7,
    language: "auto",
    chapters:
      weakQuiz
        ? ["Fundamentals refresher", "Guided walkthrough", "Practice scenarios", "Assessment"]
        : ["Context & why", "Step-by-step procedure", "Common mistakes", "Assessment"],
  };
}

export function buildAuditRecommendations(input: {
  gaps: AuditGapCluster[];
  learners: AuditLearnerSignal[];
  knowledge: AuditKnowledgeSignal;
}): AuditIntelligence {
  const { gaps, learners, knowledge } = input;
  const recs: AuditRecommendation[] = [];

  const openGaps = gaps.filter((g) => g.status !== "resolved" && g.status !== "ignored");

  // 1) Recurring unanswered questions → a missing SOP.
  for (const g of openGaps.filter((g) => g.occurrences >= 3).slice(0, 8)) {
    recs.push({
      id: `sop-${slug(g.question)}`,
      kind: "sop",
      title: `Create SOP: ${shorten(g.question)}`,
      rationale:
        `This question was asked ${g.occurrences} times and the knowledge base still has no ` +
        `grounded answer. A documented procedure removes the repeat traffic and the compliance risk.`,
      priority: g.occurrences >= 8 ? "critical" : g.occurrences >= 5 ? "high" : "medium",
      expectedScoreImprovement: Math.min(6, 2 + Math.floor(g.occurrences / 3)),
      effort: "medium",
      department: g.departmentName,
      evidence: [
        `${g.occurrences} occurrences`,
        `last asked ${g.lastSeen.slice(0, 10)}`,
        g.confidence != null ? `answer confidence ${Math.round(g.confidence * 100)}%` : "no grounded answer",
      ],
      autoAction: {
        type: "generate_sop",
        question: g.question,
        department: g.departmentName,
        gapId: g.id ?? null,
      },
    });
  }

  // 2) One-off / low-frequency gaps → a FAQ entry is enough.
  for (const g of openGaps.filter((g) => g.occurrences > 0 && g.occurrences < 3).slice(0, 8)) {
    recs.push({
      id: `faq-${slug(g.question)}`,
      kind: "faq",
      title: `Add FAQ: ${shorten(g.question)}`,
      rationale:
        "Low-frequency question with no grounded source. A short FAQ entry closes it without writing a full procedure.",
      priority: "low",
      expectedScoreImprovement: 1,
      effort: "low",
      department: g.departmentName,
      evidence: [`${g.occurrences} occurrence(s)`, `last asked ${g.lastSeen.slice(0, 10)}`],
      autoAction: {
        type: "generate_faq",
        question: g.question,
        department: g.departmentName,
        gapId: g.id ?? null,
      },
    });
  }

  // 3) Department with several open gaps → build a course, not just documents.
  const byDept = new Map<string, AuditGapCluster[]>();
  for (const g of openGaps) {
    const key = g.departmentName ?? "Company-wide";
    byDept.set(key, [...(byDept.get(key) ?? []), g]);
  }
  for (const [dept, list] of [...byDept.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (list.length < 3) continue;
    recs.push({
      id: `course-${slug(dept)}`,
      kind: "course",
      title: `Build course: ${dept} operational essentials`,
      rationale:
        `${list.length} distinct open knowledge gaps cluster in ${dept}. Documentation alone will not ` +
        `change behaviour — a short course with an assessment closes the capability gap.`,
      priority: list.length >= 6 ? "high" : "medium",
      expectedScoreImprovement: Math.min(8, 3 + list.length),
      effort: "high",
      department: dept === "Company-wide" ? null : dept,
      evidence: list.slice(0, 4).map((g) => `${shorten(g.question, 48)} (${g.occurrences}×)`),
      suggestedCourse: {
        format: "standard",
        difficulty: "beginner",
        estimatedMinutes: Math.min(60, 15 + list.length * 5),
        passingScore: 80,
        dueInDays: 14,
        reminderCadenceDays: 3,
        mandatory: list.length >= 6,
        retakeAfterDays: 7,
        language: "auto",
        chapters: list.slice(0, 5).map((g) => shorten(g.question, 48)),
      },
    });
  }

  // 4) Per-person coaching: how fast / how often they had to ask while learning.
  const coaching: AuditIntelligence["learnerCoaching"] = [];
  for (const l of learners) {
    const friction = learnerFrictionScore(l);
    const perHour = questionsPerLearningHour(l);
    const weakQuiz = l.avgQuizScore != null && l.avgQuizScore < 70;
    if (friction < 35 && !weakQuiz && l.overdueEnrollments === 0) continue;

    const reason = weakQuiz
      ? `Quiz average ${l.avgQuizScore}% with ${l.failedQuizAttempts} failed attempt(s)`
      : perHour >= 4
        ? `${perHour} questions per learning hour — the material is not self-sufficient`
        : l.overdueEnrollments > 0
          ? `${l.overdueEnrollments} overdue enrollment(s)`
          : `${l.lowConfidenceQuestions} low-confidence answers`;

    coaching.push({
      userId: l.userId,
      name: l.name,
      department: l.department,
      frictionScore: friction,
      questionsPerLearningHour: perHour,
      reason,
    });

    recs.push({
      id: `assign-${l.userId}`,
      kind: "course_assignment",
      title: weakQuiz
        ? `Assign remedial course to ${l.name}`
        : `Assign targeted course to ${l.name}`,
      rationale:
        `${reason}. Assign a ${perHour >= 6 ? "microlearning" : "focused"} course with the settings ` +
        `below so the answers arrive before the questions.`,
      priority: friction >= 70 ? "critical" : friction >= 50 ? "high" : "medium",
      expectedScoreImprovement: 2,
      effort: "low",
      department: l.department,
      evidence: [
        `${l.questionsWhileLearning} questions while learning`,
        `${Math.round(l.learningSeconds / 60)} min learning time`,
        l.avgQuizScore != null ? `quiz avg ${l.avgQuizScore}%` : "no quiz attempts",
        `friction ${friction}/100`,
      ],
      targetUser: { id: l.userId, name: l.name },
      suggestedCourse: courseSettingsFor(l),
    });
  }

  // 5) Structural knowledge-base recommendations.
  if (knowledge.staleDocuments > 0) {
    recs.push({
      id: "policy-review-stale",
      kind: "policy_review",
      title: `Review ${knowledge.staleDocuments} document(s) that are not ready`,
      rationale:
        "Documents that failed processing or were never indexed cannot ground a single answer, yet they read as coverage.",
      priority: knowledge.staleDocuments >= 5 ? "high" : "medium",
      expectedScoreImprovement: Math.min(6, knowledge.staleDocuments),
      effort: "low",
      department: null,
      evidence: [`${knowledge.staleDocuments} of ${knowledge.documents} documents not ready`],
    });
  }
  const outdated = knowledge.outdatedDocuments ?? 0;
  if (outdated > 0) {
    recs.push({
      id: "policy-review-outdated",
      kind: "policy_review",
      title: `Refresh ${outdated} document(s) past their review date`,
      rationale:
        "Documents older than their review cadence still ground AI answers, so outdated instructions keep circulating as if they were current policy.",
      priority: outdated >= 5 ? "high" : "medium",
      expectedScoreImprovement: Math.min(8, outdated * 2),
      effort: "medium",
      department: null,
      evidence: [
        `${outdated} active document(s) past their review cadence`,
        knowledge.medianDocumentAgeDays != null
          ? `Median document age: ${knowledge.medianDocumentAgeDays} days`
          : "Median document age unavailable",
      ],
    });
  }
  if (knowledge.readyDocuments > 0 && knowledge.faqs < Math.ceil(knowledge.readyDocuments / 4)) {
    recs.push({
      id: "faq-coverage",
      kind: "faq",
      title: "Expand FAQ coverage for existing procedures",
      rationale:
        "FAQ entries answer the short questions instantly and keep the retrieval pipeline precise. Current ratio is below one FAQ per four procedures.",
      priority: "medium",
      expectedScoreImprovement: 3,
      effort: "low",
      department: null,
      evidence: [`${knowledge.faqs} FAQ vs ${knowledge.readyDocuments} ready documents`],
    });
  }
  if (knowledge.courses === 0 && knowledge.readyDocuments >= 3) {
    recs.push({
      id: "course-first",
      kind: "course",
      title: "Turn your core procedures into a first course",
      rationale:
        "Procedures exist but nobody is trained on them. A first course with an assessment converts documentation into verified competence.",
      priority: "high",
      expectedScoreImprovement: 6,
      effort: "medium",
      department: null,
      evidence: [`${knowledge.readyDocuments} ready documents`, "0 courses published"],
      suggestedCourse: {
        format: "standard",
        difficulty: "beginner",
        estimatedMinutes: 30,
        passingScore: 80,
        dueInDays: 21,
        reminderCadenceDays: 5,
        mandatory: true,
        retakeAfterDays: 7,
        language: "auto",
        chapters: ["Company context", "Core procedures", "Safety & compliance", "Assessment"],
      },
    });
  }
  if (knowledge.readyDocuments >= 3 && knowledge.courses > 0) {
    recs.push({
      id: "quiz-verify",
      kind: "quiz",
      title: "Add assessments to verify procedure knowledge",
      rationale:
        "Completion without an assessment does not prove competence; quizzes generate the evidence auditors ask for.",
      priority: "low",
      expectedScoreImprovement: 2,
      effort: "low",
      department: null,
      evidence: [`${knowledge.courses} course(s)`, `${knowledge.readyDocuments} ready documents`],
    });
  }

  // Aggregates.
  const totalQuestions = learners.reduce((s, l) => s + l.questionsWhileLearning, 0);
  const lowConf = learners.reduce((s, l) => s + l.lowConfidenceQuestions, 0);
  const selfServiceRate =
    totalQuestions + lowConf === 0
      ? 100
      : Math.round(clamp(((totalQuestions - lowConf) / Math.max(1, totalQuestions)) * 100));

  const frictionIndex = learners.length
    ? Math.round(learners.reduce((s, l) => s + learnerFrictionScore(l), 0) / learners.length)
    : 0;

  const deptScores = new Map<string, { sum: number; n: number }>();
  for (const l of learners) {
    const key = l.department ?? "Unassigned";
    const cur = deptScores.get(key) ?? { sum: 0, n: 0 };
    deptScores.set(key, { sum: cur.sum + learnerFrictionScore(l), n: cur.n + 1 });
  }

  const order: Record<RecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  recs.sort(
    (a, b) =>
      order[a.priority] - order[b.priority] ||
      b.expectedScoreImprovement - a.expectedScoreImprovement ||
      a.title.localeCompare(b.title),
  );

  return {
    recommendations: recs,
    frictionIndex,
    selfServiceRate,
    topFrictionDepartments: [...deptScores.entries()]
      .map(([department, v]) => ({ department, score: Math.round(v.sum / v.n) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    learnerCoaching: coaching.sort((a, b) => b.frictionScore - a.frictionScore).slice(0, 20),
  };
}
