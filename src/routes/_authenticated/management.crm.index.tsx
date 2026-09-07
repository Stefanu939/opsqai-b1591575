import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PipelineBoard } from "@/components/mc/crm/pipeline-board";
import { LeadDialog, type LeadFormValues } from "@/components/mc/crm/lead-dialog";
import { listCrmLeads, moveCrmLeadStage, saveCrmLead, type CrmLead } from "@/lib/crm.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/management/crm/")({
  head: () => ({
    meta: [
      { title: "CRM — OPSQAI Management Center" },
      {
        name: "description",
        content:
          "Sales pipeline for OPSQAI: leads from the website, pilot requests and manual entries, with activities, offers and conversion to customer.",
      },
      { property: "og:title", content: "CRM — OPSQAI Management Center" },
      {
        property: "og:description",
        content: "Pipeline, activities and offers for the OPSQAI sales team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrmPipelinePage,
});

function CrmPipelinePage() {
  const qc = useQueryClient();
  const { session, loading } = useAuth();
  const list = useServerFn(listCrmLeads);
  const move = useServerFn(moveCrmLeadStage);
  const save = useServerFn(saveCrmLead);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-leads", session?.user?.id ?? null],
    queryFn: () => list({ data: {} } as never),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
  });

  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const leads = data?.leads ?? [];
  const staff = data?.staff ?? [];
  const me = data?.me ?? null;
  const isSuperAdmin = Boolean(data?.isSuperAdmin);

  const ownerName = (id: string | null) =>
    id ? (staff.find((s) => s.user_id === id)?.name ?? "OPSQAI") : "Unassigned";

  const canEdit = (lead: CrmLead) =>
    isSuperAdmin || !lead.owner_user_id || lead.owner_user_id === me;

  const sources = useMemo(() => [...new Set(leads.map((l) => l.source))], [leads]);

  const filtered = leads.filter((l) => {
    if (ownerFilter === "mine" && l.owner_user_id !== me) return false;
    if (ownerFilter === "unassigned" && l.owner_user_id) return false;
    if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return [l.company_name, l.contact_name, l.email, l.country]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(t));
  });

  const moveMut = useMutation({
    mutationFn: (v: { id: string; stage: string }) => move({ data: v } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: (v: LeadFormValues) =>
      save({
        data: {
          company_name: v.company_name.trim(),
          contact_name: v.contact_name || null,
          email: v.email || null,
          phone: v.phone || null,
          country: v.country || null,
          language: v.language,
          source: "manual",
          stage: v.stage,
          value_amount: v.value_amount ? Number(v.value_amount) : null,
          currency: v.currency || "EUR",
          probability: v.probability ? Number(v.probability) : null,
          products: [],
          notes: v.notes || null,
          next_action_at: v.next_action_at || null,
        },
      } as never),
    onSuccess: () => {
      toast.success("Lead saved");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openTasks = (data?.openActivities ?? []).filter(
    (a) => a.due_at && new Date(a.due_at).getTime() <= Date.now(),
  ).length;

  return (
    <ModulePage
      eyebrow="Management Center"
      title="CRM"
      description="Leads from the website, pilot requests and manual entries — one pipeline for the whole team."
      width="full"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/management/crm/activities">Activities{openTasks ? ` (${openTasks})` : ""}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/management/crm/reports">Reports</Link>
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New lead
          </Button>
        </div>
      }
      toolbar={
        <>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, contact, email…"
              className="pl-8"
            />
          </div>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="mine">My leads</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    >
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Website contact messages and pilot requests land here automatically.
          </p>
        </div>
      ) : (
        <PipelineBoard
          leads={filtered}
          ownerName={ownerName}
          canEdit={canEdit}
          onMove={(lead, stage) => moveMut.mutate({ id: lead.id, stage })}
        />
      )}

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(v) => saveMut.mutate(v)}
        saving={saveMut.isPending}
      />
    </ModulePage>
  );
}
