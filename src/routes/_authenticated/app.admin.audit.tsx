/**
 * Audit Log – Enterprise Hierarchy.
 * Super Admin → Companies → Users → Audit Entries.
 * Company Admin → Users → Audit Entries.
 * Same OPSQAI design system as before; just deeper navigation.
 */
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listAuditCompanies, listAuditUsers, listAuditEntries,
} from "@/lib/exports.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Building2, ChevronRight, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log — OPSQAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    company: typeof s.company === "string" ? s.company : undefined,
    user: typeof s.user === "string" ? s.user : undefined,
  }),
  component: Page,
});

interface CompanyRow { id: string; name: string; users: number; entries: number; last7d: number; lastActivity: string | null }
interface UserRow { id: string; name: string; department: string | null; position: string | null; entries: number; lastActivity: string | null }
interface Entry {
  id: string; createdAt: string; module: string; action: string;
  resource: string | null;
  oldValue: unknown; newValue: unknown;
  severity: string; success: boolean;
  ip: string | null; userAgent: string | null;
  question: string | null; answerPreview: string | null;
  sources: Array<{ type: string; title: string; code?: string | null }> | null;
}

function Page() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/app/admin/audit" });
  const { isPlatformAdmin, isAdmin, isManager, companyId, activeCompanyId } = useAuth();
  if (!(isAdmin || isManager || isPlatformAdmin))
    return <div className="p-8 text-sm text-muted-foreground">Admin only.</div>;

  // Honor the workspace switcher: a platform admin viewing AdelaCompany jumps
  // directly into AdelaCompany's audit feed. Explicit URL params still win.
  const scopedCompany = isPlatformAdmin ? search.company ?? activeCompanyId ?? null : companyId;
  const scopedUser = search.user ?? null;

  if (isPlatformAdmin && !scopedCompany) return <CompaniesView />;
  if (scopedCompany && !scopedUser)
    return (
      <UsersView
        companyId={scopedCompany}
        back={isPlatformAdmin ? () => navigate({ to: "/app/admin/audit", search: {} as never }) : undefined}
      />
    );
  if (scopedCompany && scopedUser)
    return (
      <EntriesView
        companyId={scopedCompany}
        userId={scopedUser}
        back={() => navigate({ to: "/app/admin/audit", search: (isPlatformAdmin ? { company: scopedCompany } : {}) as never })}
      />
    );
  return null;
}

function CompaniesView() {
  const navigate = useNavigate();
  const list = useServerFn(listAuditCompanies);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { list().then((r) => setRows(r as unknown as CompanyRow[])).finally(() => setLoading(false)); }, [list]);

  return (
    <Shell title="Audit Log" subtitle="Activity recorded across all companies.">
      {loading ? <Loading /> : rows.length === 0 ? <EmptyState text="No companies." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => (
            <button key={c.id} onClick={() => navigate({ to: "/app/admin/audit", search: { company: c.id } as never })} className="text-left">
              <Card className="p-4 hover:border-primary/40 transition h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.users} users</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px]">{c.entries} entries</Badge>
                  <Badge variant="outline" className="text-[10px]">{c.last7d} last 7d</Badge>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

function UsersView({ companyId, back }: { companyId: string; back?: () => void }) {
  const navigate = useNavigate();
  const list = useServerFn(listAuditUsers);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { list({ data: { company_id: companyId } }).then((r) => setRows(r as unknown as UserRow[])).finally(() => setLoading(false)); }, [companyId, list]);

  const filtered = useMemo(
    () => rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  return (
    <Shell title="Audit Log" subtitle="Users with activity in this workspace." back={back}>
      <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />
      {loading ? <Loading /> : filtered.length === 0 ? <EmptyState text="No users." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((u) => (
            <button key={u.id} onClick={() => navigate({ to: "/app/admin/audit", search: { company: companyId, user: u.id } as never })} className="text-left">
              <Card className="p-4 hover:border-primary/40 transition h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary text-sm">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {[u.position, u.department].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{u.entries} entries</Badge>
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

function EntriesView({ companyId, userId, back }: { companyId: string; userId: string; back: () => void }) {
  const list = useServerFn(listAuditEntries);
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModule] = useState("all");
  const [action, setAction] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [from, setFrom] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await list({
        data: {
          company_id: companyId, user_id: userId,
          module: moduleFilter === "all" ? undefined : moduleFilter,
          action: action === "all" ? undefined : action,
          severity: severity === "all" ? undefined : severity,
          from: from ? new Date(from).toISOString() : undefined,
        },
      });
      setRows(r as unknown as Entry[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId, userId, moduleFilter, action, severity, from]);

  const modules = useMemo(() => Array.from(new Set(rows.map((r) => r.module).filter(Boolean))), [rows]);
  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action).filter(Boolean))), [rows]);

  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }), []);

  return (
    <Shell title="Audit Log" subtitle="Detailed activity for this user." back={back}>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Select value={moduleFilter} onValueChange={setModule}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        {(moduleFilter !== "all" || action !== "all" || severity !== "all" || from) && (
          <Button variant="ghost" size="sm" onClick={() => { setModule("all"); setAction("all"); setSeverity("all"); setFrom(""); }}>Clear</Button>
        )}
      </div>

      {loading ? <Loading /> : rows.length === 0 ? <EmptyState text="No entries." /> : (
        <Card className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{r.module}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{r.action}</Badge>
                  {r.severity !== "info" && (
                    <Badge variant={r.severity === "error" ? "destructive" : "outline"} className="text-[10px] capitalize">{r.severity}</Badge>
                  )}
                  {!r.success && <Badge variant="destructive" className="text-[10px]">Failed</Badge>}
                  {r.resource && <span className="text-xs text-muted-foreground font-mono">{r.resource}</span>}
                </div>
                <div className="text-xs text-muted-foreground font-mono">{fmt.format(new Date(r.createdAt))}</div>
              </div>
              {r.question && <p className="text-sm mt-2">{r.question}</p>}
              {r.answerPreview && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.answerPreview}</p>}
              {(r.oldValue != null || r.newValue != null) && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Change details</summary>
                  <div className="grid sm:grid-cols-2 gap-2 mt-2">
                    {r.oldValue !== null && (
                      <pre className="bg-muted rounded p-2 overflow-auto text-[11px]"><span className="text-muted-foreground">Old</span>{"\n"}{JSON.stringify(r.oldValue, null, 2)}</pre>
                    )}
                    {r.newValue !== null && (
                      <pre className="bg-muted rounded p-2 overflow-auto text-[11px]"><span className="text-muted-foreground">New</span>{"\n"}{JSON.stringify(r.newValue, null, 2)}</pre>
                    )}
                  </div>
                </details>
              )}
              {(r.ip || r.userAgent) && (
                <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                  {r.ip ?? "—"} · {r.userAgent?.slice(0, 80) ?? ""}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </Shell>
  );
}

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
function Loading() { return <Card className="p-12 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />Loading…</Card>; }
function EmptyState({ text }: { text: string }) { return <Card className="p-12 text-center text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 mx-auto mb-2" />{text}</Card>; }
