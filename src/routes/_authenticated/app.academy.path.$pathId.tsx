/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getAcademyPath, enrollSelf, startEnrollment, completeEnrollment,
  getEnrollmentProgress, listMyEnrollments,
} from "@/lib/academy.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, PlayCircle, GraduationCap, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/academy/path/$pathId")({
  component: PathPage,
});

function PathPage() {
  const { pathId } = useParams({ from: Route.id });
  const getPath = useServerFn(getAcademyPath);
  const enroll = useServerFn(enrollSelf);
  const start = useServerFn(startEnrollment);
  const complete = useServerFn(completeEnrollment);
  const progress = useServerFn(getEnrollmentProgress);
  const mine = useServerFn(listMyEnrollments);

  const [data, setData] = useState<any>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, any>>({});

  const load = async () => {
    const d = (await getPath({ data: { id: pathId } })) as any;
    setData(d);
    const list = (await mine()) as any[];
    const mineEnr = list.find((e) => e.academy_learning_paths?.id === pathId);
    if (mineEnr) {
      setEnrollmentId(mineEnr.id);
      const p = (await progress({ data: { enrollment_id: mineEnr.id } })) as any[];
      setDone(Object.fromEntries(p.map((r) => [r.lesson_id, r])));
    }
  };
  useEffect(() => { void load(); }, [pathId]);

  const handleEnroll = async () => {
    const r = (await enroll({ data: { path_id: pathId } })) as any;
    await start({ data: { id: r.id } });
    await load();
  };
  const finish = async () => {
    if (!enrollmentId) return;
    await complete({ data: { enrollment_id: enrollmentId } });
    await load();
  };

  if (!data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const { path, chapters, lessons } = data;
  const totalLessons = lessons.length;
  const completed = Object.values(done).filter((d: any) => d.status === "completed").length;
  const pct = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;
  const allDone = totalLessons > 0 && completed === totalLessons;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">{path.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{path.description}</p>
        <div className="flex gap-2 text-xs">
          {path.academy_departments?.name && <Badge variant="secondary">{path.academy_departments.name}</Badge>}
          {path.target_role && <Badge variant="outline">{path.target_role}</Badge>}
          {path.mandatory && <Badge>Mandatory</Badge>}
          <Badge variant="outline">Passing {path.passing_score}%</Badge>
        </div>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Progress</div>
          <div className="text-xs text-muted-foreground">{completed} / {totalLessons} lessons · {pct}%</div>
          <div className="w-64 h-2 bg-muted rounded mt-2 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {!enrollmentId ? (
          <Button onClick={handleEnroll}><PlayCircle className="h-4 w-4 mr-1" /> Enroll & start</Button>
        ) : allDone ? (
          <Button onClick={finish} variant="default"><Award className="h-4 w-4 mr-1" /> Finish & get certificate</Button>
        ) : (
          <Badge variant="secondary">In progress</Badge>
        )}
      </Card>

      {chapters.map((ch: any) => {
        const chLessons = lessons.filter((l: any) => l.chapter_id === ch.id);
        return (
          <Card key={ch.id} className="p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold">{ch.title}</div>
              {ch.summary && <div className="text-xs text-muted-foreground">{ch.summary}</div>}
            </div>
            <div className="space-y-1.5">
              {chLessons.map((l: any) => {
                const status = done[l.id]?.status;
                const isDone = status === "completed";
                return (
                  <Link
                    key={l.id}
                    to="/app/academy/lesson/$lessonId"
                    params={{ lessonId: l.id }}
                    search={{ enrollmentId: enrollmentId ?? "" }}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent text-sm"
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span className="flex-1">{l.title}</span>
                    <span className="text-[11px] text-muted-foreground">{l.estimated_minutes}m</span>
                  </Link>
                );
              })}
              {chLessons.length === 0 && <div className="text-xs text-muted-foreground italic">No lessons in this chapter yet.</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
