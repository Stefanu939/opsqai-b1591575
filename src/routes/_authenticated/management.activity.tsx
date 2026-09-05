import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleCheck,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { ModulePage } from "@/components/app/module-page";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getCloudBrowserDb } from "@/lib/cloud-client";
import { listTeamMembers } from "@/lib/team.functions";
import {
  ACTIVITY_SELECT,
  CATEGORY_LABELS,
  MC_CATEGORIES,
  SEVERITIES,
  categoryLabel,
  isMcActivity,
  severityLabel,
  severityRank,
  type ActivityRow,
} from "@/lib/activity-center";

export const Route = createFileRoute("/_authenticated/management/activity")({
  head: () => ({
    meta: [
      { title: "Activity Center — OPSQAI Management Center" },
      {
        name: "description",
        content:
          "Triage OPSQAI operational alerts: customers, licenses, time off, releases and installation health, with assignment and resolution.",
      },
      { property: "og:title", content: "Activity Center — OPSQAI Management Center" },
      {
        property: "og:description",
        content:
          "Assign, resolve and track operational alerts across customers, licenses, time off, releases and installation health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityCenterPage,
});

type Member = { id: string; full_name: string | null; email: string; is_platform_admin: boolean };

function severityTone(severity: string) {
  if (severity === "critical") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (severity === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-600";
  return "border-border bg-secondary text-muted-foreground";
}

function ActivityCenterPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const authed = Boolean(session?.user?.id);
  const myId = session?.user?.id ?? null;

  const [tab, setTab] = useState<"open" | "mine" | "resolved">("open");
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");

  const activity = useQuery({
    queryKey: ["mc-activity"],
    enabled: authed,
    retry: false,
    refetchInterval: 60_000,
    queryFn: async (): Promise<ActivityRow[]> => {
      const db = await getCloudBrowserDb();
      if (!db) return [];
      const { data, error } = await db
        .from("notifications")
        .select(ACTIVITY_SELECT)
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });

  const teamFn = useServerFn(listTeamMembers);
  const team = useQuery({
    queryKey: ["mc-activity-team"],
    enabled: authed,
    retry: false,
    queryFn: async () => (await teamFn({ data: {} } as never)) as unknown as Member[],
  });

  const staff = useMemo(
    () => (team.data ?? []).filter((m) => m.is_platform_admin),
    [team.data],
  );
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const m = (team.data ?? []).find((x) => x.id === id);
    return m?.full_name || m?.email || "colleague";
  };

  const update = useMutation({
    mutationFn: async (input: { ids: string[]; patch: Record<string, unknown> }) => {
      const db = await getCloudBrowserDb();
      if (!db) throw new Error("Backend unavailable");
      const { error } = await db
        .from("notifications")
        .update(input.patch as never)
        .in("id", input.ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mc-activity"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const rows = activity.data ?? [];
  const openRows = rows.filter((r) => !r.resolved_at);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (tab === "open" && r.resolved_at) return false;
        if (tab === "resolved" && !r.resolved_at) return false;
        if (tab === "mine" && (r.resolved_at || r.assigned_to !== myId)) return false;
        if (category !== "all" && r.category !== category) return false;
        if (severity !== "all" && r.severity !== severity) return false;
        if (
          q &&
          !`${r.title} ${r.body ?? ""} ${r.entity_label ?? ""}`.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          severityRank(a.severity) - severityRank(b.severity) ||
          +new Date(b.created_at) - +new Date(a.created_at),
      );
  }, [rows, tab, category, severity, search, myId]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const r of filtered) {
      const key = r.entity_label ? `${r.category}::${r.entity_label}` : `${r.category}::—`;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].map(([key, items]) => {
      const [cat, label] = key.split("::");
      return { cat, label, items };
    });
  }, [filtered]);

  const resolve = (row: ActivityRow) =>
    update.mutate({
      ids: [row.id],
      patch: {
        resolved_at: new Date().toISOString(),
        resolved_by: myId,
        read_at: row.read_at ?? new Date().toISOString(),
      },
    });
  const reopen = (row: ActivityRow) =>
    update.mutate({ ids: [row.id], patch: { resolved_at: null, resolved_by: null } });
  const assign = (row: ActivityRow, userId: string) =>
    update.mutate({ ids: [row.id], patch: { assigned_to: userId === "none" ? null : userId } });

  const resolveGroup = (items: ActivityRow[]) => {
    const ids = items.filter((i) => !i.resolved_at).map((i) => i.id);
    if (!ids.length) return;
    update.mutate({
      ids,
      patch: { resolved_at: new Date().toISOString(), resolved_by: myId },
    });
  };

  return (
    <ModulePage
      eyebrow="Operations"
      title="Activity Center"
      description="Every operational alert in one place — grouped by customer or record, assignable to a colleague and closed when handled."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            update.mutate({
              ids: openRows.filter((r) => !r.read_at).map((r) => r.id),
              patch: { read_at: new Date().toISOString() },
            })
          }
          disabled={!openRows.some((r) => !r.read_at)}
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      }
      tabs={
        <>
          {(
            [
              ["open", `Open (${openRows.length})`],
              ["mine", `Assigned to me (${openRows.filter((r) => r.assigned_to === myId).length})`],
              ["resolved", "Resolved"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={tab === value ? "default" : "outline"}
              onClick={() => setTab(value)}
            >
              {label}
            </Button>
          ))}
        </>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts, customers, records…"
            className="h-9 w-full max-w-xs"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {ACTIVITY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {severityLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open alerts" value={String(openRows.length)} icon={Bell} />
        <StatCard
          label="Critical"
          value={String(openRows.filter((r) => r.severity === "critical").length)}
          icon={AlertTriangle}
        />
        <StatCard
          label="Assigned to me"
          value={String(openRows.filter((r) => r.assigned_to === myId).length)}
          icon={UserPlus}
        />
        <StatCard
          label="Unassigned"
          value={String(openRows.filter((r) => !r.assigned_to).length)}
          icon={CircleCheck}
        />
      </div>

      <div className="mt-6 space-y-4">
        {activity.isLoading && (
          <div className="oq-soft-card p-6 text-sm text-muted-foreground">Loading activity…</div>
        )}
        {activity.isError && (
          <div className="oq-soft-card p-6 text-sm text-destructive">
            Activity could not be loaded.
          </div>
        )}
        {!activity.isLoading && grouped.length === 0 && (
          <div className="oq-soft-card p-10 text-center text-sm text-muted-foreground">
            Nothing here — you are all caught up.
          </div>
        )}

        {grouped.map((group) => (
          <section key={`${group.cat}-${group.label}`} className="oq-soft-card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {group.label === "—" ? categoryLabel(group.cat) : group.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {categoryLabel(group.cat)} · {group.items.length} alert
                  {group.items.length === 1 ? "" : "s"}
                </div>
              </div>
              {group.items.some((i) => !i.resolved_at) && (
                <Button variant="ghost" size="sm" onClick={() => resolveGroup(group.items)}>
                  Resolve all
                </Button>
              )}
            </header>
            <ul className="divide-y divide-border">
              {group.items.map((row) => (
                <li key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <Badge variant="outline" className={severityTone(row.severity)}>
                    {severityLabel(row.severity)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {row.link ? (
                        <Link to={row.link} className="hover:underline">
                          {row.title}
                        </Link>
                      ) : (
                        row.title
                      )}
                      {!row.read_at && !row.resolved_at && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                      )}
                    </div>
                    {row.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.body}</p>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                      {row.assigned_to ? ` · assigned to ${nameOf(row.assigned_to)}` : ""}
                      {row.resolved_at
                        ? ` · resolved ${new Date(row.resolved_at).toLocaleDateString()}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.assigned_to ?? "none"}
                      onValueChange={(v) => assign(row, v)}
                    >
                      <SelectTrigger className="h-8 w-[170px] text-xs">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {staff.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {row.resolved_at ? (
                      <Button variant="outline" size="sm" onClick={() => reopen(row)}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => resolve(row)}>
                        <CircleCheck className="mr-1 h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ModulePage>
  );
}
