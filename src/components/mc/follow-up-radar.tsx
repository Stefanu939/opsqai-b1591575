import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MessageCircle, Phone, Radar } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listFollowUps, type FollowUp } from "@/lib/sales-tools.functions";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/mc-outreach";

const LABEL: Record<FollowUp["urgency"], string> = {
  overdue: "Întârziat",
  today: "Azi",
  stale: "Rece",
  week: "Săptămâna asta",
};
const VARIANT: Record<FollowUp["urgency"], "destructive" | "default" | "secondary" | "outline"> = {
  overdue: "destructive",
  today: "default",
  stale: "secondary",
  week: "outline",
};

function followUpText(f: FollowUp, sender: string) {
  const hi = f.contact_name ? `Bună ziua, ${f.contact_name}` : "Bună ziua";
  if (f.stage === "offer")
    return `${hi}, revin scurt legat de oferta OPSQAI trimisă pentru ${f.company_name}. Ați apucat să o parcurgeți? Pot clarifica orice întrebare în 10 minute. Mulțumesc, ${sender}`;
  if (f.stage === "demo" || f.stage === "pilot")
    return `${hi}, cum vi s-a părut OPSQAI după demo? Dacă vă ajută, putem porni un pilot scurt pe procedurile unui departament. Când aveți 15 minute? ${sender}`;
  return `${hi}, revin după discuția noastră despre OPSQAI pentru ${f.company_name}. Vă pot trimite o prezentare de o pagină sau putem face un demo de 15 minute săptămâna aceasta? ${sender}`;
}

export function FollowUpRadar({ sender = "Ștefan", limit = 12 }: { sender?: string; limit?: number }) {
  const fetchFn = useServerFn(listFollowUps);
  const q = useQuery({ queryKey: ["mc-follow-ups"], queryFn: () => fetchFn(), staleTime: 60_000 });
  const items = (q.data ?? []).slice(0, limit);
  const counts = (q.data ?? []).reduce<Record<string, number>>((m, f) => ((m[f.urgency] = (m[f.urgency] ?? 0) + 1), m), {});

  return (
    <Panel title="Follow-up Radar">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Radar className="h-4 w-4 text-primary" />
        {q.isLoading ? "Se încarcă…" : (q.data ?? []).length === 0 ? "Nimic de urmărit acum. Bravo!" : (
          <>
            {(["overdue", "today", "stale", "week"] as const).map((u) =>
              counts[u] ? <Badge key={u} variant={VARIANT[u]}>{LABEL[u]}: {counts[u]}</Badge> : null,
            )}
          </>
        )}
      </div>
      <div className="grid gap-2">
        {items.map((f) => {
          const text = followUpText(f, sender);
          return (
            <div key={f.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={VARIANT[f.urgency]}>{LABEL[f.urgency]}</Badge>
                  <Link to="/management/crm/$leadId" params={{ leadId: f.id }} className="truncate font-medium hover:underline">
                    {f.company_name}
                  </Link>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {f.reason}{f.contact_name ? ` · ${f.contact_name}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => window.open(whatsappUrl(f.phone ?? undefined, text), "_blank")}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
                {f.phone && (
                  <Button size="sm" variant="secondary" asChild>
                    <a href={telUrl(f.phone)} aria-label="Sună"><Phone className="h-4 w-4" /></a>
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => window.open(mailtoUrl(f.email ?? undefined, `Revenire OPSQAI – ${f.company_name}`, text), "_blank")}>
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
