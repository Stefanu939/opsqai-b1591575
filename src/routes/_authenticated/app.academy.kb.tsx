/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAcademyDepartments, listAcademyPaths } from "@/lib/academy.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Library, Folder, BookOpen, Sparkles, ShieldCheck } from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/academy/kb")({
  component: AcademyKBPage,
  head: () => ({ meta: [{ title: "Academy Knowledge Base · OPSQAI" }] }),
});

function AcademyKBPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("academy.manage");
  const listDept = useServerFn(listAcademyDepartments);
  const listPaths = useServerFn(listAcademyPaths);
  const [depts, setDepts] = useState<any[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [d, p] = await Promise.all([listDept(), listPaths({ data: {} })]);
        setDepts((d as any[]) ?? []);
        setPaths((p as any[]) ?? []);
      } catch { /* */ }
    })();
  }, []);

  const filtered = paths.filter((p) =>
    (!dept || p.department_id === dept) &&
    (!q || (p.title?.toLowerCase().includes(q.toLowerCase()) || p.description?.toLowerCase().includes(q.toLowerCase())))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <AcademySubnav />
      <div className="p-6 max-w-6xl mx-auto w-full space-y-5">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2"><Library className="h-5 w-5 text-primary" /> Academy Knowledge Base</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Lessons, training articles, safety guides, and procedures used exclusively by Academy. Isolated from the operational AI Assistant — protected by the same multi-tenant RLS as the rest of OPSQAI.
            </p>
          </div>
          {canManage && (
            <Link
              to="/app/admin/academy"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <Sparkles className="h-4 w-4 text-primary" /> Open Manager Console
            </Link>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search lessons, articles, procedures…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <button
            onClick={() => setDept(null)}
            className={`px-2.5 py-1 rounded-full text-xs border ${!dept ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
          >
            All departments
          </button>
          {depts.map((d) => (
            <button
              key={d.id}
              onClick={() => setDept(d.id)}
              className={`px-2.5 py-1 rounded-full text-xs border inline-flex items-center gap-1 ${dept === d.id ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
            >
              <Folder className="h-3 w-3" /> {d.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 mx-auto mb-2 text-muted-foreground/70" />
            No published Academy material yet. {canManage && <Link to="/app/admin/academy" className="text-primary hover:underline">Create your first lesson →</Link>}
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/app/academy/path/$pathId"
                params={{ pathId: p.id }}
                className="block"
              >
                <Card className="p-4 space-y-2 h-full hover:border-primary/40 transition-colors">
                  <div className="font-medium text-sm flex items-start gap-2">
                    <BookOpen className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-3">{p.description}</div>
                  <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                    {p.academy_departments?.name && <Badge variant="secondary">{p.academy_departments.name}</Badge>}
                    {p.target_role && <Badge variant="outline">{p.target_role}</Badge>}
                    {p.publish_status && <Badge variant={p.publish_status === "published" ? "default" : "outline"}>{p.publish_status}</Badge>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
