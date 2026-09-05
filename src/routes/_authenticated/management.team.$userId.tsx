import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  getColleagueOverview,
  setCompanyOwner,
  type ColleagueCompany,
} from "@/lib/mc-ownership.functions";
import { ModulePage } from "@/components/app/module-page";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Inbox,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/management/team/$userId")({
  head: () => ({ meta: [{ title: "Colleague — Management Center" }] }),
  component: ColleagueDetailPage,
});

function ColleagueDetailPage() {
  const { userId } = Route.useParams();
  const overviewFn = useServerFn(getColleagueOverview);
  const setOwnerFn = useServerFn(setCompanyOwner);
  const qc = useQueryClient();
  const [reassigning, setReassigning] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["mc-colleague", userId],
    queryFn: () => overviewFn({ data: { user_id: userId } }),
    retry: false,
  });

  const reassign = useMutation({
    mutationFn: (v: { company_id: string; owner_user_id: string | null }) =>
      setOwnerFn({ data: v }),
    onSuccess: () => {
      toast.success("Customer reassigned");
      setReassigning(null);
      void qc.invalidateQueries({ queryKey: ["mc-colleague", userId] });
      void qc.invalidateQueries({ queryKey: ["mc-ownership-cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <EmptyState
          icon={ShieldCheck}
          title="Not available"
          description={
            (q.error as Error | undefined)?.message ??
            "Only SuperAdmins can open colleague panels."
          }
          action={
            <Button asChild variant="outline">
              <Link to="/management/team">Back to Team</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { member, kpis, companies, time_off, colleagues, current_version } = q.data;

  return (
    <ModulePage
      eyebrow="Team"
      title={member.name}
      breadcrumbs={[{ label: "Team", to: "/management/team" }, { label: member.name }]}
      actions={
        <div className="flex items-center gap-2">
          {member.is_super_admin ? (
            <Badge variant="default">
              <ShieldCheck className="mr-1 h-3 w-3" /> SuperAdmin
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{member.email}</span>
        </div>
      }
    >
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Customers" value={kpis.customers} icon={Building2} />
        <StatCard label="Open tickets" value={kpis.open_tickets} icon={Inbox} />
        <StatCard label="Silent installs" value={kpis.silent_installs} icon={Radio} />
        <StatCard label="Expiring ≤ 30d" value={kpis.expiring_licenses} icon={AlertTriangle} />
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-base font-semibold text-foreground">Customers</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Owned by {member.name} or shared for holiday cover. Reassign a customer to another
            colleague directly from here.
          </p>
        </div>
        {companies.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Building2}
              title="No customers"
              description="This colleague has no owned or shared customers yet."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {companies.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/management/companies/$id"
                      params={{ id: c.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.shared ? <Badge variant="outline">shared</Badge> : null}
                    {!c.active ? <Badge variant="destructive">suspended</Badge> : null}
                  </div>
                  <CompanySignals company={c} currentVersion={current_version} />
                </div>
                {!c.shared ? (
                  reassigning === c.id ? (
                    <Select
                      onValueChange={(v) =>
                        reassign.mutate({
                          company_id: c.id,
                          owner_user_id: v === "__none__" ? null : v,
                        })
                      }
                      disabled={reassign.isPending}
                    >
                      <SelectTrigger className="h-8 w-56">
                        <SelectValue placeholder="Move to…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {colleagues.map((col) => (
                          <SelectItem key={col.user_id} value={col.user_id}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReassigning(c.id)}
                    >
                      Reassign
                    </Button>
                  )
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground">Fleet health</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Installations of this colleague's customers that are silent or running an outdated
          version{current_version ? ` (current: ${current_version})` : ""}.
        </p>
        <div className="mt-3 space-y-2">
          {companies.filter((c) => c.silent || c.outdated).length === 0 ? (
            <p className="text-sm text-muted-foreground">All installations are healthy.</p>
          ) : (
            companies
              .filter((c) => c.silent || c.outdated)
              .map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <Link
                    to="/management/companies/$id"
                    params={{ id: c.id }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {c.name}
                  </Link>
                  {c.silent ? <Badge variant="destructive">silent</Badge> : null}
                  {c.outdated ? (
                    <Badge variant="outline">outdated · {c.app_version}</Badge>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <CalendarDays className="h-4 w-4" /> Time off
        </h3>
        <div className="mt-3 space-y-2">
          {time_off.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time-off requests.</p>
          ) : (
            time_off.map((t) => (
              <div
                key={t.id as string}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm"
              >
                <span className="font-medium text-foreground">
                  {t.starts_on as string} → {t.ends_on as string}
                </span>
                <Badge
                  variant={
                    t.status === "approved"
                      ? "default"
                      : t.status === "rejected"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {t.status as string}
                </Badge>
                {t.reason ? (
                  <span className="text-muted-foreground">{t.reason as string}</span>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(t.created_at as string), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/management/team">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Team
          </Link>
        </Button>
      </div>
    </ModulePage>
  );
}

function CompanySignals({
  company,
  currentVersion,
}: {
  company: ColleagueCompany;
  currentVersion: string | null;
}) {
  const parts: string[] = [];
  if (company.subscription_status) parts.push(company.subscription_status);
  if (company.app_version) parts.push(`v${company.app_version}`);
  if (company.open_tickets > 0) parts.push(`${company.open_tickets} open tickets`);
  if (company.online) parts.push("online");
  if (company.expires_at)
    parts.push(`expires ${new Date(company.expires_at).toLocaleDateString()}`);
  void currentVersion;
  return <p className="mt-0.5 text-xs text-muted-foreground">{parts.join(" · ") || "—"}</p>;
}
