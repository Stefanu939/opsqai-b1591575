// CRM pipeline — drag & drop board (HTML5 dnd, same approach as the
// Transport coupling board). Everyone sees every column; only the lead
// owner or a SuperAdmin can actually drop a card into another stage.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CRM_STAGES, type CrmLead } from "@/lib/crm.functions";

export const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  demo: "Demo",
  pilot: "Pilot",
  offer: "Offer",
  won: "Won",
  lost: "Lost",
};

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function PipelineBoard({
  leads,
  ownerName,
  canEdit,
  onMove,
}: {
  leads: CrmLead[];
  ownerName: (id: string | null) => string;
  canEdit: (lead: CrmLead) => boolean;
  onMove: (lead: CrmLead, stage: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
      {CRM_STAGES.map((stage) => {
        const items = leads.filter((l) => l.stage === stage);
        const value = items.reduce((s, l) => s + Number(l.value_amount ?? 0), 0);
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage);
            }}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDrop={() => {
              const lead = leads.find((l) => l.id === dragId);
              setDragId(null);
              setOverStage(null);
              if (lead && lead.stage !== stage) onMove(lead, stage);
            }}
            className={cn(
              "flex min-h-[220px] flex-col gap-2 rounded-xl border border-border bg-card p-2.5 transition-colors",
              overStage === stage && "border-primary/50 bg-primary/5",
            )}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {STAGE_LABELS[stage]}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {items.length}
              </Badge>
            </div>
            {value > 0 && (
              <div className="px-1 text-[11px] text-muted-foreground">
                {value.toLocaleString()} EUR
              </div>
            )}

            <div className="flex flex-col gap-2">
              {items.map((lead) => {
                const idle = daysSince(lead.last_activity_at);
                const editable = canEdit(lead);
                return (
                  <Link
                    key={lead.id}
                    to="/management/crm/$leadId"
                    params={{ leadId: lead.id }}
                    draggable={editable}
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "rounded-lg border border-border bg-secondary/50 p-2.5 text-left transition-colors hover:border-primary/40",
                      dragId === lead.id && "opacity-50",
                      editable ? "cursor-grab" : "cursor-pointer",
                    )}
                  >
                    <div className="truncate text-sm font-semibold text-foreground">
                      {lead.company_name}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {lead.contact_name ?? lead.email ?? "—"}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {lead.country && (
                        <Badge variant="outline" className="text-[10px]">
                          {lead.country}
                        </Badge>
                      )}
                      {lead.language && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {lead.language}
                        </Badge>
                      )}
                      {lead.value_amount != null && (
                        <Badge variant="secondary" className="text-[10px]">
                          {Number(lead.value_amount).toLocaleString()} {lead.currency}
                        </Badge>
                      )}
                      {idle >= 14 && !["won", "lost"].includes(lead.stage) && (
                        <Badge variant="destructive" className="text-[10px]">
                          {idle}d
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 truncate text-[10px] text-muted-foreground">
                      {ownerName(lead.owner_user_id)}
                    </div>
                  </Link>
                );
              })}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                  —
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
