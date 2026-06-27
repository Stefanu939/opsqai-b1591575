/**
 * Knowledge Gaps – Enterprise Hierarchy.
 * Super Admin → Companies → Users → Questions (drill-down)
 * Company Admin → Users → Questions (skips the companies layer).
 * Preserves the existing OPSQAI design system — only the navigation depth is new.
 *
 * URL search params drive the drill-down so it's bookmark-able and back-button friendly.
 */
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listGapCompanies, listGapUsers, listGapUserQuestions, getKnowledgeHealth,
} from "@/lib/exports.functions";
import { updateKnowledgeGap, deleteKnowledgeGap } from "@/lib/knowledge-gaps.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight, Building2, Users, AlertCircle, Loader2, ArrowLeft,
  Check, X, PlayCircle, Trash2, FileText, BookOpen, Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/admin/knowledge-gaps")({
  head: () => ({ meta: [{ title: "Knowledge Gaps — OPSQAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    company: typeof s.company === "string" ? s.company : undefined,
    user: typeof s.user === "string" ? s.user : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  component: Page,
});

interface Company {
  id: string; name: string;
  users: number; openGaps: number; totalGaps: number; resolvedGaps: number;
  lastActivity: string | null;
  documents: number; lastUpdate: string | null;
}
interface UserRow {
  id: string; name: string; role: string | null;
  department: string | null; position: string | null;
  openGaps: number; totalGaps: number; lastActivity: string | null;
}
interface Question {
  id: string; question: string; status: string;
  occurrences: number; confidence: number | null;
  firstSeen: string; lastSeen: string;
  department: string | null; assignee: string | null;
  resolvedAt: string | null;
  aiAnswer: string | null;
  suggestedDoc: { id: string; title: string; code: string | null } | null;
  suggestedFaq: { id: string; question: string } | null;
}
interface Health {
  score: number; openGaps: number; resolvedGaps: number;
  repeatedQuestions: number; totalGaps: number;
  avgResolutionHours: number; documents: number;
  lastKnowledgeUpdate: string | null;
}

function Page() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/app/admin/knowledge-gaps" });
  const { isPlatformAdmin, companyId } = useAuth();

  // Company-scoped users skip the companies layer.
  const scopedCompanyId = isPlatformAdmin ? search.company ?? null : companyId;
  const scopedUserId = search.user ?? null;

  if (isPlatformAdmin && !scopedCompanyId) return <CompaniesView />;
  if (scopedCompanyId && !scopedUserId)
    return (
      <UsersView
        companyId={scopedCompanyId}
        backToCompanies={isPlatformAdmin ? () => navigate({ to: "/app/admin/knowledge-gaps", search: {} as never }) : undefined}
      />
    );
  if (scopedCompanyId && scopedUserId)
    return (
      <QuestionsView
        companyId={scopedCompanyId}
        userId={scopedUserId}
        status={search.status}
        from={search.from}
        to={search.to}
        backToUsers={() =>
          navigate({
            to: "/app/admin/knowledge-gaps",
            search: (isPlatformAdmin ? { company: scopedCompanyId } : {}) as never,
          })
        }
      />
    );
  return null;
}

/* ----------------------------- Companies ----------------------------- */
function CompaniesView() {
  const navigate = useNavigate();
  const list = useServerFn(listGapCompanies);
  const [rows, setRows] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    list().then((r) => setRows(r as Company[])).finally(() => setLoading(false));
  }, [list]);

  return (
    <Shell title="Knowledge Gaps" subtitle="Browse open knowledge gaps across all companies.">
      {loading ? <Loading /> : rows.length === 0 ? <EmptyState text="No companies yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ to: "/app/admin/knowledge-gaps", search: { company: c.id } as never })}
              className="text-left"
            >
              <Card className="p-4 hover:border-primary/40 transition h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.users} users · {c.documents} docs</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={c.openGaps > 0 ? "destructive" : "secondary"} className="text-[10px]">
                    {c.openGaps} open
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{c.totalGaps} total</Badge>
                  {c.lastActivity && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      · last {new Date(c.lastActivity).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ------------------------------- Users ------------------------------- */
function UsersView({ companyId, backToCompanies }: { companyId: string; backToCompanies?: () => void }) {
  const navigate = useNavigate();
  const list = useServerFn(listGapUsers);
  const healthFn = useServerFn(getKnowledgeHealth);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([
      list({ data: { company_id: companyId } }).then((r) => setRows(r as UserRow[])),
      healthFn({ data: { company_id: companyId } }).then((r) => setHealth(r as Health)),
    ]).finally(() => setLoading(false));
  }, [companyId, list, healthFn]);

  const filtered = useMemo(
    () => rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  return (
    <Shell
      title="Knowledge Gaps"
      subtitle="Users with unanswered questions in this workspace."
      back={backToCompanies}
    >
      {health && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Knowledge Health</span>
            <Badge variant={health.score >= 70 ? "secondary" : "destructive"} className="text-[10px]">
              Score {health.score}/100
            </Badge>
            <span className="text-xs text-muted-foreground">
              {health.openGaps} open · {health.resolvedGaps} resolved · {health.repeatedQuestions} repeated · avg {health.avgResolutionHours}h to resolve · {health.documents} docs
            </span>
          </div>
        </Card>
      )}
      <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />
      {loading ? <Loading /> : filtered.length === 0 ? <EmptyState text="No users to show." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => navigate({ to: "/app/admin/knowledge-gaps", search: { company: companyId, user: u.id } as never })}
              className="text-left"
            >
              <Card className="p-4 hover:border-primary/40 transition h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary text-sm">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {[u.role, u.position, u.department].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.openGaps > 0 ? "destructive" : "secondary"} className="text-[10px]">
                    {u.openGaps} open
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{u.totalGaps} total</Badge>
                  {u.lastActivity && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(u.lastActivity).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ----------------------------- Questions ----------------------------- */
function QuestionsView({
  companyId, userId, status, from, to, backToUsers,
}: {
  companyId: string; userId: string;
  status?: string; from?: string; to?: string;
  backToUsers: () => void;
}) {
  const list = useServerFn(listGapUserQuestions);
  const update = useServerFn(updateKnowledgeGap);
  const remove = useServerFn(deleteKnowledgeGap);
  const [rows, setRows] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(status ?? "all");

  const load = async () => {
    setLoading(true);
    try {
      const r = await list({
        data: { company_id: companyId, user_id: userId, status: filter === "all" ? undefined : filter, from, to },
      });
      setRows(r as Question[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId, userId, filter, from, to]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id); try { await fn(); await load(); } finally { setBusyId(null); }
  };

  return (
    <Shell title="Knowledge Gaps" subtitle="Questions this user could not get answered." back={backToUsers}>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{rows.length} questions</span>
      </div>

      {loading ? <Loading /> : rows.length === 0 ? <EmptyState text="No questions match these filters." /> : (
        <div className="grid gap-3">
          {rows.map((g) => {
            const isOpen = g.status === "open" || g.status === "in_progress";
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={g.status === "open" ? "destructive" : g.status === "resolved" ? "secondary" : "outline"} className="text-[10px] capitalize">
                    {g.status.replace("_", " ")}
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">×{g.occurrences}</Badge>
                  {g.confidence != null && (
                    <span className="text-[10px] text-muted-foreground">conf {Math.round(g.confidence * 100)}%</span>
                  )}
                  {g.department && <Badge variant="outline" className="text-[10px]">{g.department}</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(g.firstSeen).toLocaleDateString()} → {new Date(g.lastSeen).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{g.question}</p>
                {g.aiAnswer && (
                  <details className="text-xs text-muted-foreground mt-2">
                    <summary className="cursor-pointer">AI response</summary>
                    <p className="mt-1 whitespace-pre-wrap line-clamp-6">{g.aiAnswer}</p>
                  </details>
                )}
                {(g.suggestedDoc || g.suggestedFaq) && (
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    {g.suggestedDoc && <div>Suggested SOP: <span className="font-mono">{g.suggestedDoc.code ?? ""} {g.suggestedDoc.title}</span></div>}
                    {g.suggestedFaq && <div>Suggested FAQ: {g.suggestedFaq.question}</div>}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {isOpen && (
                    <>
                      {g.status === "open" && (
                        <Button size="sm" variant="ghost" disabled={busyId === g.id}
                          onClick={() => run(g.id, () => update({ data: { id: g.id, status: "in_progress" } }))}>
                          <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> In Progress
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busyId === g.id}
                        onClick={() => run(g.id, () => update({ data: { id: g.id, status: "resolved", resolution: "dismissed" } }))}>
                        <Check className="h-3.5 w-3.5 mr-1.5" /> Resolve
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === g.id}
                        onClick={() => run(g.id, () => update({ data: { id: g.id, status: "ignored", resolution: "dismissed" } }))}>
                        <X className="h-3.5 w-3.5 mr-1.5" /> Ignore
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive ml-auto"
                    disabled={busyId === g.id}
                    onClick={() => { if (confirm("Delete this gap?")) run(g.id, () => remove({ data: { id: g.id } })); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

/* ----------------------------- Shell helpers ----------------------------- */
function Shell({ title, subtitle, back, children }: { title: string; subtitle?: string; back?: () => void; children: React.ReactNode }) {
  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <div className="mb-6">
        {back && (
          <Button variant="ghost" size="sm" onClick={back} className="mb-2 -ml-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
          </Button>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
function Loading() {
  return <Card className="p-12 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />Loading…</Card>;
}
function EmptyState({ text }: { text: string }) {
  return <Card className="p-12 text-center text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 mx-auto mb-2" />{text}</Card>;
}
/* eslint-disable @typescript-eslint/no-unused-vars */
const _icons = [Users, FileText, BookOpen];
