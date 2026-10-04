import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import { Cpu, Laptop, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCompanyTopology, type TopologyStation } from "@/lib/mc-growth.functions";

function health(at: string | null, okMin: number, warnMin: number) {
  if (!at) return "off" as const;
  const m = (Date.now() - new Date(at).getTime()) / 60_000;
  return m <= okMin ? ("ok" as const) : m <= warnMin ? ("warn" as const) : ("off" as const);
}

const DOT = { ok: "bg-success", warn: "bg-warning", off: "bg-destructive" };
const RING = { ok: "border-success/40", warn: "border-warning/50", off: "border-destructive/50" };
const ago = (at: string | null) => (at ? formatDistanceToNow(new Date(at), { addSuffix: true, locale: ro }) : "niciun semnal");

/** Visual map of a customer: main computer and the workstations paired to it. */
export function CompanyTopology({ installIds }: { installIds: string[] }) {
  const fn = useServerFn(getCompanyTopology);
  const q = useQuery({
    queryKey: ["mc-topology", installIds.join(",")],
    queryFn: () => fn({ data: { install_ids: installIds } }),
    enabled: installIds.length > 0,
    retry: false,
  });

  if (!installIds.length)
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Clientul nu are încă o instalare.</p>;
  if (q.isLoading) return <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />;

  const servers = q.data ?? [];
  if (!servers.length)
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Calculatorul principal nu a trimis încă niciun semnal.</p>;

  return (
    <div className="space-y-4">
      {servers.map((s) => {
        const h = health(s.last_heartbeat_at, 15, 24 * 60);
        const stations = s.stations ?? [];
        return (
          <div key={s.install_id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col items-center">
              <div className={cn("flex w-full max-w-md items-center gap-4 rounded-xl border-2 bg-secondary/40 p-4", RING[h])}>
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary"><Server className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">Calculator principal (server)</p>
                  <p className="truncate text-xs text-muted-foreground">Versiune {s.app_version ?? "—"} · {s.reported_status ?? "—"}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Cpu className="h-3 w-3" />AI: {s.ai_engine ?? "local (necunoscut)"}</p>
                </div>
                <span className="flex flex-col items-end text-[11px] text-muted-foreground">
                  <span className={cn("mb-1 h-2.5 w-2.5 rounded-full", DOT[h])} />
                  {ago(s.last_heartbeat_at)}
                </span>
              </div>

              {s.stations === null ? (
                <p className="mt-4 text-xs text-muted-foreground">Lista stațiilor apare după ce clientul instalează ultima versiune.</p>
              ) : stations.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">Nicio stație de lucru conectată.</p>
              ) : (
                <>
                  <div className="h-6 w-px bg-border" />
                  <div className="h-px w-full max-w-3xl bg-border" />
                  <div className="mt-0 grid w-full gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stations.map((st, i) => <StationNode key={i} st={st} index={i + 2} />)}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StationNode({ st, index }: { st: TopologyStation; index: number }) {
  const h = st.active ? health(st.last_seen_at, 15, 24 * 60) : ("off" as const);
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border-2 bg-secondary/30 p-3", RING[h], !st.active && "opacity-60")}>
      <Laptop className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">PC {index} — {st.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {st.active ? (st.location ? st.location : "rețea locală") : "revocat"} · {ago(st.last_seen_at)}
        </p>
      </div>
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[h])} />
    </div>
  );
}
