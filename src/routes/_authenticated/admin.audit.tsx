import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/admin-stats.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

interface Row {
  id: string; user_id: string; user_name: string | null;
  thread_id: string | null; question: string; answer_preview: string | null;
  sources: Array<{ type: string; title: string; code?: string | null }> | null;
  created_at: string;
}

function AuditPage() {
  const { t } = useT();
  const { isAdmin, isManager } = useAuth();
  const fetchAudit = useServerFn(listAuditLog);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!isAdmin && !isManager) return;
    fetchAudit().then((r) => setRows(r as Row[])).catch(() => {});
  }, [isAdmin, isManager, fetchAudit]);

  if (!isAdmin && !isManager) return <div className="p-8 text-sm text-muted-foreground">Admin only.</div>;

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{t("auditLog")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("auditLogDesc")}</p>
      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">—</Card>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="text-sm font-medium truncate flex-1 min-w-0">{r.question}</div>
                <div className="text-xs text-muted-foreground font-mono shrink-0">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {r.user_name || r.user_id.slice(0, 8)}
              </div>
              {r.answer_preview && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.answer_preview}</p>
              )}
              {r.sources && r.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.sources.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {s.type === "document" ? (s.code ? `${s.code} — ${s.title}` : s.title) : `FAQ: ${s.title}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
