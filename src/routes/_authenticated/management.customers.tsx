import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listCustomerProfiles,
  upsertCustomerContract,
} from "@/lib/mc-admin.functions";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/management/customers")({
  head: () => ({ meta: [{ title: "Customers — Management Center" }] }),
  component: CustomersPage,
});

type Row = {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  active: boolean;
  profile: {
    contract_status: string | null;
    renewal_date: string | null;
    onboarding_pct: number | null;
  } | null;
};

const CONTRACT_STATUSES = ["prospect", "trial", "active", "renewal", "churned"] as const;
type ContractStatus = (typeof CONTRACT_STATUSES)[number];

function CustomersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCustomerProfiles);
  const save = useServerFn(upsertCustomerContract);

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-customers"],
    queryFn: () => list({ data: {} } as never) as Promise<Row[]>,
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const saveMut = useMutation({
    mutationFn: (v: { company_id: string; contract_status?: ContractStatus }) =>
      save({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["mc-customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data as Row[]).filter((r) => {
      if (query && !r.name.toLowerCase().includes(query)) return false;
      if (statusFilter !== "all") {
        if ((r.profile?.contract_status ?? "prospect") !== statusFilter) return false;
      }
      return true;
    });
  }, [data, q, statusFilter]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Customer",
      render: (r) => (
        <Link
          to="/management/companies/$id"
          params={{ id: r.id }}
          className="font-medium text-foreground hover:underline"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (r) => <Badge variant="outline">{r.subscription_plan}</Badge>,
    },
    {
      key: "contract",
      header: "Contract",
      render: (r) => (
        <Select
          value={r.profile?.contract_status ?? "prospect"}
          onValueChange={(v) =>
            saveMut.mutate({
              company_id: r.id,
              contract_status: v as ContractStatus,
            })
          }
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "renewal",
      header: "Renewal",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.profile?.renewal_date
            ? new Date(r.profile.renewal_date).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      key: "onboarding",
      header: "Onboarding",
      align: "right",
      render: (r) => (
        <span className="tabular-nums">
          {r.profile?.onboarding_pct != null ? `${r.profile.onboarding_pct}%` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={r.active ? "default" : "outline"}>
          {r.active ? r.subscription_status : "suspended"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Customers"
        description="Contract lifecycle for every OPSQAI customer — prospect through renewal."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contracts</SelectItem>
            {CONTRACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty={{
          icon: Users,
          title: (data as Row[]).length ? "No matches" : "No customers yet",
          description: (data as Row[]).length
            ? "Adjust filters to see more results."
            : "Create a company to add your first customer.",
        }}
      />
    </div>
  );
}
