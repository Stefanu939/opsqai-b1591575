/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyEnrollments, getAcademyPath } from "@/lib/academy.functions";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, GraduationCap, Sparkles, PlayCircle, RotateCw, BookOpen } from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/academy/teacher")({
  component: AcademyHome,
  head: () => ({ meta: [{ title: "AI Teacher · OPSQAI Academy" }] }),
});

function greet(name?: string | null, lang?: string) {
  const h = new Date().getHours();
  const part =
    lang === "de"
      ? h < 12
        ? "Guten Morgen"
        : h < 18
          ? "Guten Tag"
          : "Guten Abend"
      : lang === "ro"
        ? h < 12
          ? "Bună dimineața"
          : h < 18
            ? "Bună ziua"
            : "Bună seara"
        : h < 12
          ? "Good morning"
          : h < 18
            ? "Good afternoon"
            : "Good evening";
  return name ? `${part}, ${name}` : part;
}

type Enrollment = any;

function AcademyHome() {
  const navigate = useNavigate();
  const myEnroll = useServerFn(listMyEnrollments);
  const getPath = useServerFn(getAcademyPath);
  const { user } = useAuth();
  const { lang } = useT();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const name = (user?.user_metadata as any)?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  useEffect(() => {
    ref.current?.focus();
  }, []);
  useEffect(() => {
    void (async () => {
      try {
        setEnrollments(((await myEnroll()) as any[]) ?? []);
      } catch {
        /* */
      }
    })();
  }, []);

  const findNextLesson = async (
    mode: "next" | "previous",
  ): Promise<{ pathId: string; lessonId: string; enrollmentId: string } | null> => {
    const active = enrollments
      .filter((e) => e.status !== "completed")
      .sort(
        (a, b) =>
          new Date(b.last_activity_at ?? b.started_at ?? b.created_at).getTime() -
          new Date(a.last_activity_at ?? a.started_at ?? a.created_at).getTime(),
      );
    const target = active[0] ?? enrollments[0];
    if (!target) return null;
    try {
      const data = (await getPath({
        data: { id: target.path_id ?? target.academy_learning_paths?.id },
      })) as any;
      const lessons: any[] = data.lessons ?? [];
      if (lessons.length === 0) return null;
      const ordered = [...lessons].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const lesson = mode === "previous" ? ordered[ordered.length - 1] : ordered[0];
      return {
        pathId: target.path_id ?? target.academy_learning_paths?.id,
        lessonId: lesson.id,
        enrollmentId: target.id,
      };
    } catch {
      return null;
    }
  };

  const goNext = async (mode: "next" | "previous" = "next") => {
    setBusy(true);
    try {
      const t = await findNextLesson(mode);
      if (!t) {
        toast.info("You don't have an active course yet. Pick one to start.");
        navigate({ to: "/app/academy/courses" });
        return;
      }
      navigate({
        to: "/app/academy/lesson/$lessonId",
        params: { lessonId: t.lessonId },
        search: { enrollmentId: t.enrollmentId },
      });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const t = await findNextLesson("next");
      if (!t) {
        navigate({ to: "/app/academy/courses" });
        return;
      }
      navigate({
        to: "/app/academy/lesson/$lessonId",
        params: { lessonId: t.lessonId },
        search: { enrollmentId: t.enrollmentId, q },
      });
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const chips: Array<{ label: string; mode: "next" | "previous" | "courses" }> = [
    {
      label:
        lang === "de"
          ? "Training fortsetzen"
          : lang === "ro"
            ? "Continuă instruirea"
            : "Continue my training",
      mode: "next",
    },
    {
      label:
        lang === "de"
          ? "Heutige Lektion starten"
          : lang === "ro"
            ? "Începe lecția de azi"
            : "Start today's lesson",
      mode: "next",
    },
    {
      label:
        lang === "de"
          ? "Letztes Kapitel fortsetzen"
          : lang === "ro"
            ? "Reia ultimul capitol"
            : "Resume last chapter",
      mode: "next",
    },
    {
      label:
        lang === "de"
          ? "Vorherige Lektion ansehen"
          : lang === "ro"
            ? "Revizuiește lecția anterioară"
            : "Review previous lesson",
      mode: "previous",
    },
    {
      label:
        lang === "de"
          ? "Zum heutigen Thema fragen"
          : lang === "ro"
            ? "Întreabă despre subiectul de azi"
            : "Ask about today's topic",
      mode: "next",
    },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] md:min-h-screen">
      <AcademySubnav />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground">
            <GraduationCap className="h-3 w-3 text-primary" /> OPSQAI Academy
          </div>
          <h1 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight">
            {greet(name, lang)} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            {lang === "de"
              ? "Ich bin dein KI-Trainingsassistent. Ich begleite dich Schritt für Schritt durch dein Onboarding und deine Weiterbildung."
              : lang === "ro"
                ? "Sunt asistentul tău AI de instruire. Te ghidez pas cu pas în onboarding și în călătoria ta de învățare."
                : "I'm your AI Training Assistant. I'll guide you through your onboarding and training journey step by step."}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {lang === "de"
              ? "Was möchtest du heute lernen?"
              : lang === "ro"
                ? "Ce vrei să înveți astăzi?"
                : "What would you like to learn today?"}
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card shadow-lg p-2 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow text-left">
            <Textarea
              ref={ref}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder={
                lang === "de"
                  ? "Frag den KI-Trainer…"
                  : lang === "ro"
                    ? "Întreabă-l pe trainerul AI…"
                    : "Ask your AI teacher anything…"
              }
              rows={2}
              className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] min-h-[60px]"
            />
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                <Sparkles className="h-3 w-3 text-primary" />
                {lang === "de"
                  ? "Geerdet in deinem Academy-Lehrplan"
                  : lang === "ro"
                    ? "Bazat pe materialele Academy"
                    : "Grounded in your Academy curriculum"}
              </div>
              <Button onClick={submit} disabled={busy} size="icon" className="h-8 w-8 rounded-full">
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {chips.map((c) => (
              <button
                key={c.label}
                onClick={() =>
                  c.mode === "courses"
                    ? navigate({ to: "/app/academy/courses" })
                    : void goNext(c.mode)
                }
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[12.5px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/60 transition-colors disabled:opacity-50"
              >
                {c.mode === "previous" ? (
                  <RotateCw className="h-3 w-3" />
                ) : (
                  <PlayCircle className="h-3 w-3" />
                )}
                {c.label}
              </button>
            ))}
          </div>

          {enrollments.length === 0 && (
            <div className="mt-8">
              <Link
                to="/app/academy/courses"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <BookOpen className="h-4 w-4" /> Browse available learning paths
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
