import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, FileText, Headset, KeyRound, Phone, Radio, Server, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCompanyTimeline } from "@/lib/mc-growth.functions";

const STYLE: Record<string, { icon: typeof Phone; cls: string }> = {
  lead: { icon: UserPlus, cls: "bg-primary/15 text-primary" },
  activity: { icon: Phone, cls: "bg-primary/15 text-primary" },
  offer: { icon: FileText, cls: "bg-warning/15 text-warning" },
  customer: { icon: Building2, cls: "bg-success/15 text-success" },
  license: { icon: KeyRound, cls: "bg-success/15 text-success" },
  install: { icon: Server, cls: "bg-success/15 text-success" },
  heartbeat: { icon: Radio, cls: "bg-muted text-muted-foreground" },
  support: { icon: Headset, cls: "bg-destructive/15 text-destructive" },
};

/** Vertical relationship timeline: CRM → contract → licence → install → support. */
export function CompanyTimeline({ companyId, companyName, installIds }: { companyId: string; companyName: string; installIds: string[] }) {
  const fn = useServerFn(getCompanyTimeline);
  const q = useQuery({
    queryKey: ["mc-timeline", companyId],
    queryFn: () => fn({ data: { company_id: companyId, company_name: companyName, install_ids: installIds } }),
    retry: false,
  });
  if (q.isLoading) return <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  const events = q.data ?? [];
  if (!events.length) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nicio activitate încă.</p>;

  return (
    <ol className="relative ml-4 border-l border-border">
      {events.map((e, i) => {
        const s = STYLE[e.kind] ?? STYLE["activity"];
        const Icon = s.icon;
        return (
          <li key={i} className="mb-5 ml-6">
            <span className={cn("absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-background", s.cls)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="rounded-lg border border-border bg-card p-3">
              <time className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {new Date(e.at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
              </time>
              <p className="text-sm font-medium text-foreground">{e.title}</p>
              {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
