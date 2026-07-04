/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyTraining, getMyTrainingSummary } from "@/lib/academy-lms.functions";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  GraduationCap, Sparkles, Award, Clock, User as UserIcon, AlertTriangle, CheckCircle2,
  Search, PlayCircle, BookOpen, ArrowRight, Timer, ListChecks, PlusCircle,
} from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";
import { AssignTrainingDialog } from "@/components/academy/assign-training-dialog";

export const Route = createFileRoute("/_authenticated/app/academy/")({
  component: MyTrainingHome,
  head: () => ({ meta: [{ title: "My Training · OPSQAI Academy" }] }),
});

type Enrollment = Awaited<ReturnType<typeof listMyTraining>>[number];
type Filter = "all" | "mandatory" | "optional" | "completed" | "overdue";

function greet(name?: string | null, lang?: string) {
  const h = new Date().getHours();
  const part = lang === "de"
    ? h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend"
    : lang === "ro"
    ? h < 12 ? "Bună dimineața" : h < 18 ? "Bună ziua" : "Bună seara"
    : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

function fmtDue(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function MyTrainingHome() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { lang } = useT();
  const list = useServerFn(listMyTraining);
  const summary = useServerFn(getMyTrainingSummary);
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getMyTrainingSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  const name = (user?.user_metadata as any)?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  useEffect(() => {
    void (async () => {
      try {
        const [enrolls, s] = await Promise.all([list(), summary()]);
        setRows((enrolls as Enrollment[]) ?? []);
        setStats(s as any);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "mandatory") list = list.filter((r) => r.mandatory && r.status !== "completed");
    if (filter === "optional") list = list.filter((r) => !r.mandatory && r.status !== "completed");
    if (filter === "completed") list = list.filter((r) => r.status === "completed");
    if (filter === "overdue") list = list.filter((r) => r.is_overdue);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) => r.path.title.toLowerCase().includes(s) || (r.path.description ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [rows, filter, q]);

  const counts = useMemo(() => ({
    all: rows.length,
    mandatory: rows.filter((r) => r.mandatory && r.status !== "completed").length,
    optional: rows.filter((r) => !r.mandatory && r.status !== "completed").length,
    completed: rows.filter((r) => r.status === "completed").length,
    overdue: rows.filter((r) => r.is_overdue).length,
  }), [rows]);

  const FILTERS: Array<{ id: Filter; label: string; icon: React.ElementType }> = [
    { id: "all", label: "All training", icon: BookOpen },
    { id: "mandatory", label: "Mandatory", icon: AlertTriangle },
    { id: "optional", label: "Optional", icon: Sparkles },
    { id: "overdue", label: "Overdue", icon: Timer },
    { id: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] md:min-h-screen">
      <AcademySubnav />

      <div className="px-4 md:px-6 py-6 md:py-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground">
              <GraduationCap className="h-3 w-3 text-primary" /> My Training
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
              {greet(name, lang)}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              Your assigned learning, in one place. Continue where you left off, complete mandatory training and earn certificates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission("academy.assign") && (
              <Button onClick={() => setAssignOpen(true)} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Assign training
              </Button>
            )}
            <Button asChild variant="outline" className="gap-2">
              <Link to="/app/academy/teacher">
                <Sparkles className="h-4 w-4" /> AI Teacher
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary widget */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryStat icon={AlertTriangle} label="Mandatory active" value={stats?.mandatory_active ?? 0} tone="warning" onClick={() => setFilter("mandatory")} />
          <SummaryStat icon={Award} label="Certificates" value={stats?.certificates ?? 0} onClick={() => navigate({ to: "/app/academy/certificates" })} />
          <SummaryStat icon={ListChecks} label="Avg. quiz score" value={stats?.average_quiz_score != null ? `${stats.average_quiz_score}%` : "—"} />
          <SummaryStat icon={GraduationCap} label="Learning progress" value={`${stats?.learning_progress_percent ?? 0}%`} />
          <SummaryStat icon={Timer} label="Upcoming deadlines" value={stats?.upcoming_deadlines ?? 0} tone={stats && stats.upcoming_deadlines > 0 ? "warning" : "default"} />
        </div>

        {/* Filters + search */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const count = counts[f.id];
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${active ? "bg-primary/10 border-primary/40 text-primary" : "bg-card/60 border-border text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}
              >
                <f.icon className="h-3.5 w-3.5" /> {f.label}
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10.5px] ${active ? "bg-primary/15" : "bg-muted"}`}>{count}</span>
              </button>
            );
          })}
          <div className="relative ml-auto w-full md:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search my training…"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5 h-48 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={rows.length > 0} filter={filter} />
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => (
              <TrainingCard key={e.id} enrollment={e} />
            ))}
          </div>
        )}
      </div>
      <AssignTrainingDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => {
          void (async () => {
            const [enrolls, s] = await Promise.all([list(), summary()]);
            setRows((enrolls as Enrollment[]) ?? []);
            setStats(s as any);
          })();
        }}
      />
    </div>
  );
}

function SummaryStat({
  icon: Icon, label, value, onClick, tone = "default",
}: {
  icon: React.ElementType; label: string; value: string | number; onClick?: () => void; tone?: "default" | "warning";
}) {
  const clickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={`p-4 ${clickable ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone === "warning" ? "text-amber-500" : "text-primary"}`} />
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold ${tone === "warning" ? "text-amber-600 dark:text-amber-400" : ""}`}>
        {value}
      </div>
    </Card>
  );
}

function TrainingCard({ enrollment: e }: { enrollment: Enrollment }) {
  const done = e.status === "completed";
  const overdue = e.is_overdue;
  const started = !!e.started_at;

  const ctaLabel = done ? "View Certificate" : started ? "Continue" : "Start";
  const ctaTo = done
    ? "/app/academy/certificates"
    : (`/app/academy/path/$pathId` as const);

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-primary/10" : overdue ? "bg-amber-500/10" : "bg-muted"}`}>
          <GraduationCap className={`h-5 w-5 ${done ? "text-primary" : overdue ? "text-amber-500" : "text-foreground/70"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {e.mandatory ? (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 h-5 text-[10.5px]">Mandatory</Badge>
            ) : (
              <Badge variant="outline" className="h-5 text-[10.5px]">Optional</Badge>
            )}
            {done && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 h-5 text-[10.5px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
              </Badge>
            )}
            {overdue && !done && (
              <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 h-5 text-[10.5px]">
                <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
              </Badge>
            )}
            {e.priority === "high" && !done && (
              <Badge variant="outline" className="h-5 text-[10.5px] border-red-500/40 text-red-600 dark:text-red-400">High priority</Badge>
            )}
          </div>
          <h3 className="mt-1.5 font-semibold text-[15px] leading-snug line-clamp-2">{e.path.title}</h3>
          {e.path.description && (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground line-clamp-2">{e.path.description}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span>{e.progress.completed_lessons} of {e.progress.total_lessons} lessons</span>
          <span className="font-medium text-foreground">{e.progress.percent}%</span>
        </div>
        <Progress value={e.progress.percent} className="h-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> {e.progress.estimated_minutes} min
        </div>
        {e.assigned_by && (
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <UserIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">by {e.assigned_by.name}</span>
          </div>
        )}
        {e.due_at && (
          <div className={`inline-flex items-center gap-1.5 ${overdue ? "text-amber-600 dark:text-amber-400" : ""}`}>
            <Timer className="h-3 w-3" /> Due {fmtDue(e.due_at)}
          </div>
        )}
        {e.path.department && (
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="truncate">{e.path.department}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-1">
        <Button asChild size="sm" className="w-full gap-1.5">
          <Link to={ctaTo} params={done ? undefined : { pathId: e.path.id }} search={done ? undefined : { enrollmentId: e.id }}>
            {done ? <Award className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function EmptyState({ hasAny, filter }: { hasAny: boolean; filter: Filter }) {
  if (!hasAny) {
    return (
      <Card className="mt-8 p-10 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto" />
        <h3 className="mt-3 font-semibold">No training assigned yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Your manager hasn't assigned any training yet. Browse the course catalog to enrol in optional learning paths.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link to="/app/academy/courses">Browse Course Catalog</Link>
        </Button>
      </Card>
    );
  }
  return (
    <Card className="mt-8 p-10 text-center">
      <ListChecks className="h-8 w-8 text-muted-foreground mx-auto" />
      <h3 className="mt-3 font-semibold">Nothing here for “{filter}”</h3>
      <p className="mt-1 text-sm text-muted-foreground">Try a different filter or clear your search.</p>
    </Card>
  );
}
