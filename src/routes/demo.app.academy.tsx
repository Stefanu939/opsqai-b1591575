import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_COMPANY_ID } from "@/lib/demo/session";
import { useDemoReadOnly } from "@/components/demo/read-only-dialog";
import { GraduationCap, BookOpen, Clock, Target } from "lucide-react";

export const Route = createFileRoute("/demo/app/academy")({
  component: DemoAcademyPage,
});

type Path = { id: string; title: string; description: string | null; target_role: string | null; mandatory: boolean; passing_score: number };
type Chapter = { id: string; title: string; summary: string | null; order_index: number; path_id: string };
type Lesson = { id: string; chapter_id: string; title: string; objectives: string[] | unknown; estimated_minutes: number; summary: string | null; order_index: number };

function DemoAcademyPage() {
  const { show } = useDemoReadOnly();
  const [paths, setPaths] = useState<Path[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    (async () => {
      const [p, c, l] = await Promise.all([
        supabase.from("academy_learning_paths").select("id,title,description,target_role,mandatory,passing_score").eq("company_id", DEMO_COMPANY_ID),
        supabase.from("academy_chapters").select("id,title,summary,order_index,path_id").eq("company_id", DEMO_COMPANY_ID).order("order_index"),
        supabase.from("academy_lessons").select("id,chapter_id,title,objectives,estimated_minutes,summary,order_index").eq("company_id", DEMO_COMPANY_ID).order("order_index"),
      ]);
      setPaths((p.data ?? []) as Path[]);
      setChapters((c.data ?? []) as Chapter[]);
      setLessons((l.data ?? []) as Lesson[]);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
        <GraduationCap className="h-3.5 w-3.5" /> Academy
      </div>
      <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">Onboarding & learning paths</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Turn SOPs into structured onboarding with chapters, lessons and pass-required quizzes.</p>

      <div className="mt-6 space-y-6">
        {paths.map((p) => {
          const pc = chapters.filter((c) => c.path_id === p.id);
          return (
            <Card key={p.id} className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold">{p.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{p.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {p.mandatory && <span className="chip !text-[11px] !border-primary/30 !bg-primary/5 !text-primary">Mandatory</span>}
                    {p.target_role && <span className="chip !text-[11px]">Target: {p.target_role}</span>}
                    <span className="chip !text-[11px]"><Target className="h-3 w-3 mr-1" />Pass ≥ {p.passing_score}%</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => show("Assign this path")}>Assign to department</Button>
              </div>

              <div className="mt-5 space-y-3">
                {pc.map((c) => {
                  const cl = lessons.filter((l) => l.chapter_id === c.id);
                  return (
                    <div key={c.id} className="rounded-md border border-border/60 p-4">
                      <div className="text-sm font-semibold">{c.title}</div>
                      {c.summary && <div className="text-xs text-muted-foreground mt-0.5">{c.summary}</div>}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {cl.map((l) => (
                          <button key={l.id} onClick={() => setSelectedLesson(l)} className="text-left rounded-md border border-border/50 hover:border-primary/40 hover:bg-muted/30 p-3 transition">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <BookOpen className="h-3.5 w-3.5 text-primary" />
                              {l.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              <Clock className="h-3 w-3" /> {l.estimated_minutes} min
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedLesson && (
        <Card className="mt-6 p-6 border-primary/30">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium mb-2">
            <BookOpen className="h-3.5 w-3.5" /> Lesson
          </div>
          <h3 className="text-lg font-semibold">{selectedLesson.title}</h3>
          {Array.isArray(selectedLesson.objectives) && selectedLesson.objectives.length > 0 && (
            <ul className="mt-3 text-sm space-y-1 list-disc pl-5 text-muted-foreground">
              {(selectedLesson.objectives as string[]).map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          )}
          {selectedLesson.summary && <p className="mt-4 text-sm leading-relaxed">{selectedLesson.summary}</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => show("Mark lesson complete")}>Mark complete</Button>
            <Button variant="outline" size="sm" onClick={() => show("Take quiz")}>Take quiz</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
