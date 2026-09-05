import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, Inbox, Radio, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { listOwnershipCards } from "@/lib/mc-ownership.functions";

export type OwnerSelection = { userId: string | null; unassigned: boolean } | null;

export function useOwnershipCards() {
  const { session, loading } = useAuth();
  const fetchCards = useServerFn(listOwnershipCards);
  return useQuery({
    queryKey: ["mc-ownership-cards", session?.user?.id ?? null],
    queryFn: () => fetchCards(),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Ownership cards. A SuperAdmin sees one card per OPSQAI colleague and drills
 * into that colleague's customers; other staff only ever see their own card.
 */
export function OwnerCards({
  selection,
  onSelect,
}: {
  selection: OwnerSelection;
  onSelect: (next: OwnerSelection) => void;
}) {
  const { data, isLoading } = useOwnershipCards();
  const cards = data?.cards ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }
  if (!data?.isSuperAdmin) return null;

  if (selection) {
    const active = cards.find((c) =>
      selection.unassigned ? c.user_id === null : c.user_id === selection.userId,
    );
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Button size="sm" variant="ghost" onClick={() => onSelect(null)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          All colleagues
        </Button>
        <span className="text-sm font-medium text-foreground">
          {active?.name ?? "Selected colleague"}
        </span>
        {active?.email ? (
          <span className="text-xs text-muted-foreground">{active.email}</span>
        ) : null}
        {active?.is_super_admin ? <Badge variant="outline">SuperAdmin</Badge> : null}
        <span className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{active?.customers ?? 0}</span> customers
        </span>
      </div>
    );
  }

  const total = cards.reduce((sum, c) => sum + c.customers, 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        onClick={() => onSelect({ userId: "__all__", unassigned: false })}
        className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="h-4 w-4 text-primary" />
          Everyone
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{total}</p>
        <p className="text-xs text-muted-foreground">customers across the whole fleet</p>
      </button>

      {cards.map((c) => (
        <div
          key={c.user_id ?? "unassigned"}
          role="button"
          tabIndex={0}
          onClick={() =>
            onSelect(
              c.user_id === null
                ? { userId: null, unassigned: true }
                : { userId: c.user_id, unassigned: false },
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter")
              onSelect(
                c.user_id === null
                  ? { userId: null, unassigned: true }
                  : { userId: c.user_id, unassigned: false },
              );
          }}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span className="truncate">{c.name}</span>
                {c.is_super_admin ? <ShieldCheck className="h-3.5 w-3.5 text-primary" /> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{c.email || "—"}</p>
            </div>
            <span className="shrink-0 text-2xl font-semibold tabular-nums text-foreground">
              {c.customers}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {c.expiring_licenses} expiring
            </span>
            <span className="inline-flex items-center gap-1">
              <Radio className="h-3 w-3" />
              {c.offline_installs} offline
            </span>
            <span className="inline-flex items-center gap-1">
              <Inbox className="h-3 w-3" />
              {c.open_tickets} tickets
            </span>
            {c.user_id ? (
              <Link
                to="/management/team/$userId"
                params={{ userId: c.user_id }}
                onClick={(e) => e.stopPropagation()}
                className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open panel →
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
