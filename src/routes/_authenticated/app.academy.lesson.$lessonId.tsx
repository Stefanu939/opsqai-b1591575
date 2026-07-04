/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useParams, useSearch, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  getAcademyLesson, generateAcademyQuiz, submitAcademyQuiz,
} from "@/lib/academy.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUp, Sparkles, CheckCircle2, XCircle, RotateCw, Award,
  GraduationCap, Target, Clock, ChevronLeft, ListChecks, BookOpenCheck, Lock,
} from "lucide-react";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/app/academy/lesson/$lessonId")({
  component: LessonPage,
  validateSearch: (s: Record<string, unknown>) => ({
    enrollmentId: (s.enrollmentId as string) ?? "",
    q: (s.q as string) ?? "",
  }),
});

type Q = { type: "multiple_choice" | "true_false" | "short_answer"; question: string; options?: string[]; correct_answer: string; explanation: string };

const COMPLETE_MARKER = "[LESSON_COMPLETE]";

const LANG_OPTIONS: { code: string; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "ro", label: "Română", short: "RO" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "es", label: "Español", short: "ES" },
  { code: "it", label: "Italiano", short: "IT" },
  { code: "pt", label: "Português", short: "PT" },
  { code: "pl", label: "Polski", short: "PL" },
  { code: "uk", label: "Українська", short: "UK" },
];
const LANG_LABEL: Record<string, string> = Object.fromEntries(LANG_OPTIONS.map((o) => [o.code, o.label]));

function LessonPage() {
  const { lessonId } = useParams({ from: Route.id });
  const { enrollmentId, q: initialQ } = useSearch({ from: Route.id });
  const get = useServerFn(getAcademyLesson);
  const [lesson, setLesson] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [l, sess] = await Promise.all([
          get({ data: { id: lessonId } }) as Promise<any>,
          supabase.auth.getSession(),
        ]);
        if (!alive) return;
        setLesson(l);
        setToken(sess.data.session?.access_token ?? "");
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Could not load the lesson.");
      }
    })();
    return () => { alive = false; };
  }, [lessonId, get]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm">
        <div className="text-destructive">{error}</div>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!lesson || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 mr-2 animate-pulse text-primary" /> Preparing your AI Teacher…
      </div>
    );
  }

  // Mount the chat only once both lesson + token are ready so useChat captures
  // a transport that has a valid Bearer header. Re-mount per lesson via `key`.
  return (
    <TeacherChat
      key={lessonId}
      lessonId={lessonId}
      lesson={lesson}
      token={token}
      enrollmentId={enrollmentId}
      initialQ={initialQ}
    />
  );
}

function TeacherChat({
  lessonId, lesson, token, enrollmentId, initialQ,
}: {
  lessonId: string; lesson: any; token: string; enrollmentId: string; initialQ: string;
}) {
  const navigate = useNavigate();
  // Note: lesson language is chosen explicitly by the learner (see LANG_OPTIONS)
  // and is intentionally decoupled from the UI language.
  const genQuiz = useServerFn(generateAcademyQuiz);
  const submit = useServerFn(submitAcademyQuiz);

  const [quiz, setQuiz] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [input, setInput] = useState("");
  const start = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const begunRef = useRef(false);
  const initialQRef = useRef(initialQ);

  // Learner-chosen language for BOTH the AI teacher's responses AND the quiz.
  // Starts as null → AI Teacher greets in a trilingual prompt and asks the
  // learner to pick one. The learner can change it any time.
  const [learnLang, setLearnLang] = useState<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/academy-chat",
      headers: { Authorization: `Bearer ${token}` },
      body: { lessonId, language: learnLang ?? "ask" },
    }),
    [token, lessonId, learnLang],
  );
  const { messages, sendMessage, status, error: chatError } = useChat({ transport });

  // Auto-greet
  useEffect(() => {
    if (begunRef.current) return;
    begunRef.current = true;
    void sendMessage({ text: "__BEGIN__" });
    if (initialQRef.current) {
      const q = initialQRef.current;
      initialQRef.current = "";
      setTimeout(() => { void sendMessage({ text: q }); }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, quiz, result]);

  const passing = lesson.academy_chapters?.academy_learning_paths?.passing_score ?? 70;
  const pathId = lesson.academy_chapters?.path_id ?? lesson.academy_chapters?.academy_learning_paths?.id;
  const estimated = lesson.estimated_minutes ?? lesson.duration_minutes ?? 8;
  const elapsedMin = Math.floor((Date.now() - start.current) / 60000);
  const remaining = Math.max(estimated - elapsedMin, 1);

  // Detect lesson-complete marker emitted by the AI Teacher.
  const lessonComplete = useMemo(
    () => messages.some(
      (m) => m.role === "assistant" &&
        m.parts?.some?.((p: any) => p.type === "text" && p.text.includes(COMPLETE_MARKER)),
    ),
    [messages],
  );

  const stripMarker = (text: string) => text.replace(COMPLETE_MARKER, "").trim();

  const progress = Math.min(
    quiz
      ? (result?.passed ? 100 : 90)
      : lessonComplete ? 80
        : (elapsedMin / Math.max(estimated, 1)) * 70,
    100,
  );

  const startQuiz = async () => {
    if (!lessonComplete) return;
    if (!learnLang) {
      alert("Please pick a language first (top-right selector) so the quiz can be generated in that language.");
      return;
    }
    setResult(null);
    try {
      const q = (await genQuiz({ data: { lesson_id: lessonId, language: learnLang } })) as { questions: Q[] };
      setQuiz(q.questions);
      setAnswers(Array(q.questions.length).fill(""));
    } catch (e: any) {
      // surface generation error so users aren't stuck
      alert(e?.message ?? "Could not generate the quiz. Please try again.");
    }
  };

  // When the learner changes language mid-conversation, nudge the AI Teacher
  // to switch on the next reply and (if a quiz is already on screen) regenerate
  // it in the new language.
  const handleLangChange = (next: string) => {
    if (next === learnLang) return;
    setLearnLang(next);
    const label = LANG_LABEL[next] ?? next;
    if (begunRef.current) {
      void sendMessage({ text: `Please continue in ${label} from now on.` });
    }
    if (quiz && lessonComplete) {
      // Regenerate quiz in the new language
      setQuiz(null);
      setAnswers([]);
      setResult(null);
      setTimeout(() => { void startQuizWithLang(next); }, 200);
    }
  };

  const startQuizWithLang = async (lg: string) => {
    try {
      const q = (await genQuiz({ data: { lesson_id: lessonId, language: lg } })) as { questions: Q[] };
      setQuiz(q.questions);
      setAnswers(Array(q.questions.length).fill(""));
    } catch (e: any) {
      alert(e?.message ?? "Could not regenerate the quiz.");
    }
  };

  const finishQuiz = async () => {
    if (!quiz) return;
    try {
      const r = await submit({
        data: {
          lesson_id: lessonId,
          enrollment_id: enrollmentId || null,
          questions: quiz, answers,
          time_spent_seconds: Math.floor((Date.now() - start.current) / 1000),
        },
      });
      setResult(r);
      if ((r as any).passed && enrollmentId) {
        setTimeout(() => navigate({ to: "/app/academy/path/$pathId", params: { pathId } }), 1800);
      }
    } catch (e: any) {
      alert(e?.message ?? "Could not submit the quiz.");
    }
  };

  const visibleMessages = messages
    .filter((m) => !(m.role === "user" && m.parts?.some?.((p: any) => p.type === "text" && p.text === "__BEGIN__")))
    .map((m) => ({
      ...m,
      parts: (m.parts ?? []).map((p: any) =>
        p.type === "text" ? { ...p, text: stripMarker(p.text) } : p,
      ).filter((p: any) => p.type !== "text" || p.text.length > 0),
    }))
    .filter((m) => (m.parts ?? []).length > 0);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border/70 px-4 md:px-6 py-2.5 flex items-center gap-3 bg-background/90 backdrop-blur sticky top-0 z-10">
        <Link to="/app/academy/path/$pathId" params={{ pathId }} className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground truncate">
            {lesson.academy_chapters?.academy_learning_paths?.title} · {lesson.academy_chapters?.title}
          </div>
          <div className="text-sm font-medium truncate flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary shrink-0" />
            {lesson.title}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> ~{remaining} min
        </div>
        {/* Learner-chosen language for AI Teacher + quiz */}
        <select
          value={learnLang ?? ""}
          onChange={(e) => e.target.value && handleLangChange(e.target.value)}
          className="text-[11px] bg-background border border-border rounded-full px-2.5 py-1 hover:border-primary/50 focus:outline-none focus:border-primary cursor-pointer"
          title={learnLang ? `Learning in ${LANG_LABEL[learnLang]}` : "Pick a language for the AI Teacher and quiz"}
        >
          <option value="" disabled>🌐 Language…</option>
          {LANG_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>🌐 {o.label}</option>
          ))}
        </select>
        <button onClick={() => setContextOpen((v) => !v)} className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2.5 py-1">
          {contextOpen ? "Hide context" : "Show context"}
        </button>
      </header>

      <div className="h-1 bg-muted/40">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">
              {visibleMessages.length === 0 && status !== "streaming" && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <Sparkles className="h-5 w-5 text-primary mx-auto mb-2" />
                  Your AI Teacher is preparing the lesson…
                </div>
              )}

              {visibleMessages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                    {m.role !== "user" && (
                      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1">
                        <GraduationCap className="h-3 w-3 text-primary" /> AI Teacher
                      </div>
                    )}
                    {m.parts.map((p: any, i: number) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
                  </div>
                </div>
              ))}

              {status === "streaming" && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl px-4 py-2 text-xs text-muted-foreground inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" /> Thinking…
                  </div>
                </div>
              )}

              {chatError && (
                <div className="flex justify-start">
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl px-4 py-2 text-xs inline-flex items-center gap-2">
                    Connection issue with the AI Teacher.
                    <button className="underline" onClick={() => { begunRef.current = false; void sendMessage({ text: "__BEGIN__" }); }}>
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {lessonComplete && !quiz && (
                <div className="flex justify-start">
                  <Card className="w-full max-w-[92%] p-4 space-y-2 border-primary/30">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> Lesson complete — your quiz is unlocked
                    </div>
                    <p className="text-xs text-muted-foreground">Take a short knowledge check to confirm what you've learned.</p>
                    <Button size="sm" onClick={startQuiz}><BookOpenCheck className="h-3.5 w-3.5 mr-1" /> Start quiz</Button>
                  </Card>
                </div>
              )}

              {quiz && (
                <div className="flex justify-start">
                  <Card className="w-full max-w-[92%] p-4 space-y-4 border-primary/30">
                    <div className="font-medium flex items-center gap-2 text-sm">
                      <ListChecks className="h-4 w-4 text-primary" /> Quick check — let's see what stuck
                    </div>
                    {quiz.map((q, i) => (
                      <div key={i} className="space-y-2 border-b last:border-0 pb-3 last:pb-0">
                        <div className="text-sm font-medium">{i + 1}. {q.question}</div>
                        {q.type === "multiple_choice" && (
                          <div className="space-y-1.5">
                            {(q.options ?? []).map((opt) => (
                              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-accent/60">
                                <input type="radio" name={`q${i}`} value={opt} checked={answers[i] === opt} onChange={(e) => setAnswers((a) => a.map((x, j) => j === i ? e.target.value : x))} />
                                {opt}
                              </label>
                            ))}
                          </div>
                        )}
                        {q.type === "true_false" && (
                          <div className="flex gap-3">
                            {["True", "False"].map((opt) => (
                              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-accent/60">
                                <input type="radio" name={`q${i}`} value={opt} checked={answers[i] === opt} onChange={(e) => setAnswers((a) => a.map((x, j) => j === i ? e.target.value : x))} />
                                {opt}
                              </label>
                            ))}
                          </div>
                        )}
                        {q.type === "short_answer" && (
                          <Textarea rows={2} value={answers[i]} onChange={(e) => setAnswers((a) => a.map((x, j) => j === i ? e.target.value : x))} />
                        )}
                        {result && (
                          <div className={`text-xs flex items-start gap-2 ${result.results[i].correct ? "text-green-600" : "text-red-600"}`}>
                            {result.results[i].correct ? <CheckCircle2 className="h-3 w-3 mt-0.5" /> : <XCircle className="h-3 w-3 mt-0.5" />}
                            <span>{result.results[i].explanation} {!result.results[i].correct && <span className="text-muted-foreground">· Correct: {result.results[i].correct_answer}</span>}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {!result ? (
                      <Button onClick={finishQuiz} disabled={answers.some((a) => !a)} size="sm">Submit answers</Button>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant={result.passed ? "default" : "destructive"} className="text-sm">
                          {result.passed ? <><Award className="h-3 w-3 mr-1" />Passed · </> : <>Try again · </>}
                          {result.score}% / {result.passingScore ?? passing}% needed
                        </Badge>
                        {!result.passed && (
                          <Button variant="outline" size="sm" onClick={startQuiz}><RotateCw className="h-4 w-4 mr-1" /> New questions</Button>
                        )}
                        {result.passed && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-primary" /> Great work — returning to your path…
                          </span>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3">
            <div className="max-w-3xl mx-auto w-full">
              <div className="rounded-2xl border border-border bg-card shadow-sm p-2 flex items-end gap-2 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
                <Textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!input.trim() || status === "streaming") return;
                      void sendMessage({ text: input.trim() });
                      setInput("");
                    }
                  }}
                  placeholder="Reply to your AI Teacher…"
                  className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-40 text-[14.5px]"
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={!input.trim() || status === "streaming"}
                  onClick={() => {
                    if (!input.trim()) return;
                    void sendMessage({ text: input.trim() });
                    setInput("");
                  }}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1">
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Grounded only in this lesson — no outside information.
                </div>
                {!quiz && (
                  lessonComplete ? (
                    <button onClick={startQuiz} className="text-[11.5px] font-medium text-primary hover:underline inline-flex items-center gap-1">
                      <BookOpenCheck className="h-3.5 w-3.5" /> I'm ready for the quiz
                    </button>
                  ) : (
                    <span className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Quiz unlocks after the lesson is complete
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {contextOpen && (
          <aside className="hidden lg:flex w-80 border-l border-border bg-card/40 flex-col overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                  <Target className="h-3 w-3" /> Lesson objectives
                </div>
                <ul className="text-[13px] space-y-1.5">
                  {(lesson.objectives ?? []).map((o: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                      <span>{o}</span>
                    </li>
                  ))}
                  {(!lesson.objectives || lesson.objectives.length === 0) && (
                    <li className="text-xs text-muted-foreground italic">Your AI Teacher will introduce the objectives.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Progress</div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>~{remaining} min remaining</span>
                  <span>Pass {passing}%</span>
                </div>
              </div>

              {lesson.summary && (
                <details className="text-sm group">
                  <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Lesson summary
                  </summary>
                  <div className="mt-2 text-[13px] whitespace-pre-wrap leading-relaxed text-muted-foreground">
                    {lesson.summary}
                  </div>
                </details>
              )}

              <div className="rounded-lg border border-dashed border-border p-3 text-[11.5px] text-muted-foreground">
                <Sparkles className="inline h-3 w-3 text-primary mr-1" />
                Tip: Chat with your AI Teacher just like a real instructor — ask questions, request examples, or say "I don't get it" anytime.
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
