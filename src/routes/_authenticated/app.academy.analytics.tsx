/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listCourseAnalytics, listCourseCohort } from "@/lib/academy-lms.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AcademySubnav } from "@/components/app/academy-subnav";
import { AssignTrainingDialog } from "@/components/academy/assign-training-dialog";
import {
  BarChart3, Users, CheckCircle2, Clock, AlertTriangle, Award, PlusCircle, ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/academy/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Academy Analytics" }] }),
});

type Course = {
  id: string; title: string; mandatory: boolean; publish_status: string;
  assigned_users: number; completed: number; in_progress: number; overdue: number;
  avg_completion_minutes: number | null; avg_quiz_score: number | null;
  completion_percent: number; certificates_issued: number;
};

type CohortRow = {
  enrollment_id: string; user_id: string; name: string; status: string;
  mandatory: boolean; priority: string; due_at: string | null;
  progress_percent: number; last_activity_at: string | null; is_overdue: boolean;
};

function AnalyticsPage() {
  const { hasPermission } = useAuth();
  const canAssign = hasPermission("academy.assign");
  const loadCourses = useServerFn(listCourseAnalytics);
  const loadCohort = useServerFn(listCourseCohort);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [selected, setSelected] = useState<Course | null>(null);
  const [cohort, setCohort] = useState<CohortRow[] | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPathId, setAssignPathId] = useState<string | null>(null);

  const refresh = async () => {
    setCourses(((await loadCourses({ data: {} })) as Course[]) ?? []);
  };
  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!selected) return;
    void (async () => {
      setCohort(null);
      setCohort(((await loadCohort({ data: { path_id: selected.id } })) as CohortRow[]) ?? []);
    })();
  }, [selected, loadCohort]);

  const openAssign = (pathId?: string) => {
    setAssignPathId(pathId ?? null);
    setAssignOpen(true);
  };

  if (selected) {
    return (
      <div className="min-h-screen flex flex-col">
        <AcademySubnav />
        <div className="p-6 max-w-6xl mx-auto w-full space-y-4">
          <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Back to courses
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">{selected.title}</h1>
              <div className="text-xs text-muted-foreground mt-1">
                {selected.assigned_users} learners · {selected.completion_percent}% completed · {selected.certificates_issued} certificates
              </div>
            </div>
            {canAssign && (
              <Button size="sm" onClick={() => openAssign(selected.id)}>
                <PlusCircle className="h-4 w-4 mr-1" /> Assign more learners
              </Button>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wide text-muted-foreground px-4 py-2 border-b bg-muted/30">
              <div className="col-span-4">Learner</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Progress</div>
              <div className="col-span-2">Due</div>
              <div className="col-span-1 text-right">Last activity</div>
            </div>
            {cohort === null ? (
              <div className="p-6 text-sm text-muted-foreground">Loading cohort…</div>
            ) : cohort.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No learners assigned yet.</div>
            ) : cohort.map((r) => (
              <div key={r.enrollment_id} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 border-b last:border-0 text-sm hover:bg-accent/30">
                <div className="col-span-4 truncate flex items-center gap-2">
                  {r.name}
                  {r.mandatory && <Badge variant="outline" className="text-[10px]">Mandatory</Badge>}
                  {r.priority === "high" && <Badge className="text-[10px] bg-orange-500/15 text-orange-600 border-orange-500/30">High</Badge>}
                </div>
                <div className="col-span-2">
                  {r.is_overdue ? (
                    <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                  ) : r.status === "completed" ? (
                    <Badge className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15">Completed</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] capitalize">{r.status.replace(/_/g, " ")}</Badge>
                  )}
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <Progress value={r.progress_percent} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground w-8 text-right">{r.progress_percent}%</span>
                  </div>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {r.due_at ? new Date(r.due_at).toLocaleDateString() : "—"}
                </div>
                <div className="col-span-1 text-[11px] text-muted-foreground text-right">
                  {r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
          </Card>
        </div>
        <AssignTrainingDialog open={assignOpen} onOpenChange={setAssignOpen} defaultPathId={assignPathId} onAssigned={refresh} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AcademySubnav />
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Course analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Completion, overdue and quiz performance per course. Click a row to open the learner cohort.
            </p>
          </div>
          {canAssign && (
            <Button size="sm" onClick={() => openAssign()}>
              <PlusCircle className="h-4 w-4 mr-1" /> Assign training
            </Button>
          )}
        </div>

        {courses === null ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Loading analytics…</Card>
        ) : courses.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No published courses yet — publish a learning path to start collecting analytics.
          </Card>
        ) : (
          <div className="grid gap-3">
            {courses.map((c) => (
              <Card
                key={c.id}
                onClick={() => setSelected(c)}
                className="p-4 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {c.title}
                      {c.mandatory && <Badge variant="outline" className="text-[10px]">Mandatory</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{c.publish_status}</div>
                  </div>
                  <Badge variant={c.completion_percent >= 80 ? "default" : "secondary"} className="text-[11px]">
                    {c.completion_percent}% completed
                  </Badge>
                </div>
                <Progress value={c.completion_percent} className="h-1.5 mt-3" />
                <div className="grid grid-cols-5 gap-3 mt-3 text-[12px]">
                  <Stat icon={<Users className="h-3.5 w-3.5" />} label="Assigned" value={c.assigned_users} />
                  <Stat icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />} label="Completed" value={c.completed} />
                  <Stat icon={<Clock className="h-3.5 w-3.5 text-blue-500" />} label="In progress" value={c.in_progress} />
                  <Stat icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />} label="Overdue" value={c.overdue} highlight={c.overdue > 0} />
                  <Stat icon={<Award className="h-3.5 w-3.5 text-amber-500" />} label="Avg quiz" value={c.avg_quiz_score !== null ? `${c.avg_quiz_score}%` : "—"} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <AssignTrainingDialog open={assignOpen} onOpenChange={setAssignOpen} defaultPathId={assignPathId} onAssigned={refresh} />
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`text-sm font-semibold ${highlight ? "text-red-600" : ""}`}>{value}</div>
    </div>
  );
}
