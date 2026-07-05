import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_COMPANY_ID } from "@/lib/demo/session";
import { personaFor } from "@/lib/demo/personas";
import { Activity, FileText, MessageSquare, GraduationCap, ShieldAlert, UserCog } from "lucide-react";

export const Route = createFileRoute("/demo/app/audit")({
  component: DemoAuditPage,
});

type Row = { id: string; user_id: string; module: string | null; action: string | null; resource: string | null; question: string; answer_preview: string | null; severity: string; created_at: string };

const ICONS: Record<string, React.ElementType> = {
  knowledge: FileText, chat: MessageSquare, academy: GraduationCap, audit: ShieldAlert, users: UserCog,
};

function DemoAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_log").select("id,user_id,module,action,resource,question,answer_preview,severity,created_at").eq("company_id", DEMO_COMPANY_ID).order("created_at", { ascending: false }).limit(100);
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
        <Activity className="h-3.5 w-3.5" /> Audit log
      </div>
      <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">60 days of operational activity</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Every mutation, every AI query, every role change — tamper-evident, exportable for audit readiness (ISO, SOC 2, GDPR).
      </p>

      <div className="mt-6 space-y-2">
        {rows.map((r) => {
          const p = personaFor(r.user_id);
          const Icon = ICONS[r.module ?? ""] ?? Activity;
          const isWarn = r.severity === "warning" || r.severity === "critical";
          return (
            <Card key={r.id} className={`p-3 flex items-start gap-3 ${isWarn ? "border-destructive/30" : ""}`}>
              <div className={`h-8 w-8 rounded-md grid place-items-center shrink-0 ${isWarn ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-medium">{p?.name ?? "System"}</span>
                  <span className="text-muted-foreground"> · {r.question}</span>
                </div>
                {r.answer_preview && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.answer_preview}</div>
                )}
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span className="chip !text-[10px] !py-0 !px-1.5">{r.module ?? "system"}</span>
                  {r.resource && <span className="font-mono">{r.resource}</span>}
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
            </Card>
          );
        })}
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Loading audit log…</div>}
      </div>
    </div>
  );
}
