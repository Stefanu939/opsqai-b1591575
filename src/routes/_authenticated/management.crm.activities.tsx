import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeCrmActivity, listCrmActivities } from "@/lib/crm.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/management/crm/activities")({
  head: () => ({
    meta: [
      { title: "CRM activities — OPSQAI Management Center" },
      {
        name: "description",
        content: "Calls, emails, meetings and follow-up tasks across the OPSQAI sales pipeline.",
      },
      { property: "og:title", content: "CRM activities — OPSQAI" },
      { property: "og:description", content: "Today, overdue and upcoming CRM follow-ups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivitiesPage,
});

type Row = {
  id: string;
  lead_id: string;
  kind: string;
  subject: string | null;
  body: string | null;
  due_at: string | null;
  done_at: string | null;
  owner_user_id: string | null;
  crm_leads: { id: string; company_name: string; stage: string; owner_user_id: string | null } | null;
};

function ActivitiesPage() {
  const qc = useQueryClient();
  const { session, loading } = useAuth();
  const list = useServerFn(listCrmActivities);
  const complete = useServerFn(completeCrmActivity);
  const [filter, setFilter] = useState("open");

  const { data, isLoading } = useQuery({
    queryKey: ["crm-activities", session?.user?.id ?? null],
    queryFn: () => list({ data: {} } as never),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
  });

  const rows = (data?.rows ?? []) as unknown as Row[];
  const me = data?.me ?? null;
  const now = Date.now();

  const filtered = rows.filter((r) => {
    if (filter === "open") return !r.done_at;
    if (filter === "overdue")
      return !r.done_at && r.due_at != null && new Date(r.due_at).getTime() < now;
    if (filter === "mine") return !r.done_at && r.owner_user_id === me;
    if (filter === "done") return Boolean(r.done_at);
    return true;
  });

  return (
    <ModulePage
      eyebrow="CRM"
      title="Activities"
      description="Follow-ups across the pipeline — overdue first."
      actions={
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/management/crm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Pipeline
            </Link>
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="mine">Mine</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nothing here.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const overdue = !r.done_at && r.due_at && new Date(r.due_at).getTime() < now;
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3"
              >
                <Badge variant="outline" className="text-[10px] uppercase">
                  {r.kind}
                </Badge>
                <Link
                  to="/management/crm/$leadId"
                  params={{ leadId: r.lead_id }}
                  className="text-sm font-semibold text-foreground hover:underline"
                >
                  {r.crm_leads?.company_name ?? "Lead"}
                </Link>
                <span className="text-sm text-muted-foreground">{r.subject ?? "—"}</span>
                {r.due_at && (
                  <Badge variant={overdue ? "destructive" : "secondary"} className="text-[10px]">
                    {new Date(r.due_at).toLocaleDateString()}
                  </Badge>
                )}
                {!r.done_at && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() =>
                      void complete({ data: { id: r.id, done: true } } as never)
                        .then(() => {
                          qc.invalidateQueries({ queryKey: ["crm-activities"] });
                          qc.invalidateQueries({ queryKey: ["crm-leads"] });
                        })
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Done
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
}
