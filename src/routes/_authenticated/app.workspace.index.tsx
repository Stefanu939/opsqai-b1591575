import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listWorkspaceSessions,
  createWorkspaceSession,
  deleteWorkspaceSession,
  updateCompanyRetention,
} from "@/lib/workspace.functions";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Clock,
  FileText,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/workspace/")({
  component: WorkspaceIndex,
  head: () => ({ meta: [{ title: "AI Workspace · OPSQAI" }] }),
});

function WorkspaceIndex() {
  const navigate = useNavigate();
  const { isAdmin, isPlatformAdmin } = useAuth();
  const list = useServerFn(listWorkspaceSessions);
  const create = useServerFn(createWorkspaceSession);
  const del = useServerFn(deleteWorkspaceSession);
  const setRetention = useServerFn(updateCompanyRetention);

  const [sessions, setSessions] = useState<
    Array<{ id: string; title: string; updated_at: string }>
  >([]);
  const [retention, setRetentionLocal] = useState<string>("immediate");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const data = (await list()) as any[];
      setSessions(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // best-effort fetch current company retention
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("company_id").maybeSingle();
      if (prof?.company_id) {
        const { data } = await supabase
          .from("companies")
          .select("workspace_retention")
          .eq("id", prof.company_id)
          .maybeSingle();
        if (data) setRetentionLocal((data as any).workspace_retention ?? "immediate");
      }
    })();
  }, []);

  const onCreate = async () => {
    const { id } = (await create({ data: {} })) as { id: string };
    navigate({ to: "/app/workspace/$sessionId", params: { sessionId: id } });
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-primary/80 font-medium">
              <Sparkles className="h-4 w-4" /> AI Operations Workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">AI Workspace</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Upload temporary documents and let OPSQAI summarise, compare, extract KPIs, find
              risks, and generate professional presentations, spreadsheets, Word documents and PDFs.
              These files are <strong>never</strong> added to the Knowledge Base and are
              auto-deleted per your retention policy.
            </p>
          </div>
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New workspace
          </Button>
        </div>

        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Isolated session memory</div>
              <p className="text-muted-foreground mt-0.5">
                Files uploaded here are processed in-session only. They are never embedded, indexed,
                searchable or used to train the assistant. Generated artifacts (PPTX, XLSX, DOCX,
                PDF) follow the same retention policy.
              </p>
            </div>
          </div>
        </Card>

        {(isAdmin || isPlatformAdmin) && (
          <Card className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Company retention policy</div>
              <Select
                value={retention}
                onValueChange={async (v) => {
                  setRetentionLocal(v);
                  await setRetention({
                    data: { retention: v as "immediate" | "1h" | "24h" | "7d" | "manual" },
                  });
                }}
              >
                <SelectTrigger className="w-48 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Delete immediately</SelectItem>
                  <SelectItem value="1h">Delete after 1 hour</SelectItem>
                  <SelectItem value="24h">Delete after 24 hours</SelectItem>
                  <SelectItem value="7d">Delete after 7 days</SelectItem>
                  <SelectItem value="manual">Manual deletion only</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Applies to all workspace files and generated artifacts.
              </span>
            </div>
          </Card>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <Presentation className="h-5 w-5 text-primary mb-1.5" />
            <div className="text-sm font-medium">PowerPoint</div>
            <div className="text-xs text-muted-foreground">
              "Create slides for tomorrow's meeting from these reports."
            </div>
          </Card>
          <Card className="p-4">
            <FileSpreadsheet className="h-5 w-5 text-primary mb-1.5" />
            <div className="text-sm font-medium">Excel</div>
            <div className="text-xs text-muted-foreground">
              "Build a CAPA tracker / KPI table from this audit."
            </div>
          </Card>
          <Card className="p-4">
            <FileText className="h-5 w-5 text-primary mb-1.5" />
            <div className="text-sm font-medium">Word & PDF</div>
            <div className="text-xs text-muted-foreground">
              "Generate an executive summary as PDF."
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Your workspaces
          </h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : sessions.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No workspaces yet. Click <strong>New workspace</strong> to get started.
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Card
                  key={s.id}
                  className="p-3 flex items-center justify-between hover:border-primary/40 transition"
                >
                  <Link
                    to="/app/workspace/$sessionId"
                    params={{ sessionId: s.id }}
                    className="flex-1 min-w-0"
                  >
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Updated {new Date(s.updated_at).toLocaleString()}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!confirm("Delete this workspace and all its files?")) return;
                      await del({ data: { id: s.id } });
                      await reload();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
