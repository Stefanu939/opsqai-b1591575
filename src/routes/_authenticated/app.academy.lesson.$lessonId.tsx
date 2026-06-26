/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useParams, useSearch, useNavigate } from "@tanstack/react-router";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, CheckCircle2, XCircle, RotateCw, BookOpen, MessageSquare, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/academy/lesson/$lessonId")({
  component: LessonPage,
  validateSearch: (s: Record<string, unknown>) => ({ enrollmentId: (s.enrollmentId as string) ?? "" }),
});

type Q = { type: "multiple_choice" | "true_false" | "short_answer"; question: string; options?: string[]; correct_answer: string; explanation: string };

function LessonPage() {
  const { lessonId } = useParams({ from: Route.id });
  const { enrollmentId } = useSearch({ from: Route.id });
  const navigate = useNavigate();
  const get = useServerFn(getAcademyLesson);
  const genQuiz = useServerFn(generateAcademyQuiz);
  const submit = useServerFn(submitAcademyQuiz);

  const [lesson, setLesson] = useState<any>(null);
  const [quiz, setQuiz] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const start = useRef(Date.now());

  useEffect(() => {
    void (async () => {
      const l = (await get({ data: { id: lessonId } })) as any;
      setLesson(l);
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token ?? "");
    })();
    start.current = Date.now();
  }, [lessonId]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/academy-chat",
      headers: { Authorization: `Bearer ${token}` },
      body: { lessonId, language: lesson?.language ?? "en" },
    }),
    [token, lessonId, lesson?.language],
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");

  if (!lesson) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const startQuiz = async () => {
    setResult(null);
    const q = (await genQuiz({ data: { lesson_id: lessonId, language: lesson.language ?? "en" } })) as { questions: Q[] };
    setQuiz(q.questions);
    setAnswers(Array(q.questions.length).fill(""));
  };

  const finishQuiz = async () => {
    if (!quiz) return;
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
      setTimeout(() => navigate({ to: "/app/academy/path/$pathId", params: { pathId: lesson.academy_chapters.path_id } }), 1200);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <header className="space-y-1">
          <div className="text-xs text-muted-foreground">{lesson.academy_chapters?.academy_learning_paths?.title} · {lesson.academy_chapters?.title}</div>
          <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        </header>

        <Card className="p-5 space-y-4">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Objectives</div>
            <ul className="text-sm list-disc pl-5 space-y-0.5">
              {(lesson.objectives ?? []).map((o: string, i: number) => <li key={i}>{o}</li>)}
            </ul>
          </div>
          <Section title="Explanation" md={lesson.explanation} />
          <Section title="Examples" md={lesson.examples} />
          <Section title="Best practices" md={lesson.best_practices} />
          <Section title="Summary" md={lesson.summary} />
        </Card>

        {!quiz && (
          <Card className="p-5 flex items-center justify-between">
            <div>
              <div className="font-medium">Ready to test what you've learned?</div>
              <div className="text-xs text-muted-foreground">Pass {lesson.academy_chapters?.academy_learning_paths?.passing_score ?? 70}% to complete this lesson.</div>
            </div>
            <Button onClick={startQuiz}><Sparkles className="h-4 w-4 mr-1" /> Generate quiz</Button>
          </Card>
        )}

        {quiz && (
          <Card className="p-5 space-y-4">
            <div className="font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" /> Quiz</div>
            {quiz.map((q, i) => (
              <div key={i} className="space-y-2 border-b last:border-0 pb-3 last:pb-0">
                <div className="text-sm font-medium">{i + 1}. {q.question}</div>
                {q.type === "multiple_choice" && (
                  <div className="space-y-1">
                    {(q.options ?? []).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name={`q${i}`} value={opt} checked={answers[i] === opt}
                          onChange={(e) => setAnswers((a) => a.map((x, j) => j === i ? e.target.value : x))} />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "true_false" && (
                  <div className="flex gap-3">
                    {["True", "False"].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name={`q${i}`} value={opt} checked={answers[i] === opt}
                          onChange={(e) => setAnswers((a) => a.map((x, j) => j === i ? e.target.value : x))} />
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
              <Button onClick={finishQuiz} disabled={answers.some((a) => !a)}>Submit</Button>
            ) : (
              <div className="flex items-center justify-between">
                <Badge variant={result.passed ? "default" : "destructive"} className="text-sm">
                  {result.passed ? <><Award className="h-3 w-3 mr-1" />Passed · </> : <>Try again · </>}
                  {result.score}% / {result.passingScore}% needed
                </Badge>
                {!result.passed && (
                  <Button variant="outline" onClick={startQuiz}><RotateCw className="h-4 w-4 mr-1" /> New questions</Button>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      <aside className="space-y-3">
        <Card className="p-3">
          <div className="font-medium text-sm flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4" /> AI Tutor</div>
          <div className="h-[420px] overflow-y-auto text-sm space-y-2 mb-2 pr-1">
            {messages.length === 0 && <div className="text-xs text-muted-foreground italic">Ask anything about this lesson — I'll only answer from its content.</div>}
            {messages.map((m) => (
              <div key={m.id} className={`p-2 rounded ${m.role === "user" ? "bg-primary/10" : "bg-muted/50"}`}>
                <div className="text-[10px] uppercase text-muted-foreground mb-0.5">{m.role}</div>
                <div className="whitespace-pre-wrap break-words">
                  {m.parts.map((p: any, i: number) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (!input.trim() || !token) return; void sendMessage({ text: input }); setInput(""); }}
            className="flex gap-1"
          >
            <Input placeholder="Ask the tutor…" value={input} onChange={(e) => setInput(e.target.value)} />
            <Button type="submit" size="icon" disabled={status === "streaming" || !token}><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </aside>
    </div>
  );
}

function Section({ title, md }: { title: string; md?: string | null }) {
  if (!md) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{title}</div>
      <div className="text-sm whitespace-pre-wrap leading-relaxed">{md}</div>
    </div>
  );
}
