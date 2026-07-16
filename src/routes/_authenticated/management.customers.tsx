import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listCustomerProfiles, upsertCustomerContract } from "@/lib/mc-admin.functions";
import {
  createCompany,
  updateCompany,
  deleteCompany,
} from "@/lib/companies.functions";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

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
  max_users: number;
  user_count: number;
  created_at?: string | null;
  install_id: string | null;
  profile: {
    contract_status: string | null;
    renewal_date: string | null;
    onboarding_pct: number | null;
  } | null;
  license: {
    seats: number | null;
    expires_at: string | null;
    maintenance_expires_at: string | null;
    issued_at: string | null;
    revoked: boolean | null;
    suspended: boolean | null;
  } | null;
};

const CONTRACT_STATUSES = ["prospect", "trial", "active", "renewal", "churned"] as const;
type ContractStatus = (typeof CONTRACT_STATUSES)[number];

function fmtDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

function CustomersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setActiveCompanyId } = useAuth();
  const list = useServerFn(listCustomerProfiles);
  const save = useServerFn(upsertCustomerContract);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const remove = useServerFn(deleteCompany);

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-customers"],
    queryFn: () => list({ data: {} } as never) as Promise<Row[]>,
  });

  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["mc-customers"] });

  const saveMut = useMutation({
    mutationFn: (v: { company_id: string; contract_status?: ContractStatus }) =>
      save({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (v: {
      name: string;
      subscription_plan: "free" | "starter" | "pro" | "enterprise";
      max_users: number;
      admin_email: string;
      admin_password: string;
      admin_first_name?: string;
      admin_last_name?: string;
    }) => create({ data: v }),
    onSuccess: () => {
      toast.success("Customer created");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (v: {
      id: string;
      name: string;
      active?: boolean;
      subscription_status?: "active" | "suspended" | "trial" | "cancelled";
    }) => update({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data as Row[]).filter((r) => {
      if (query && !r.name.toLowerCase().includes(query)) return false;
      if (planFilter !== "all" && r.subscription_plan !== planFilter) return false;
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "suspended" && r.active) return false;
      return true;
    });
  }, [data, q, planFilter, statusFilter]);

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
      key: "since",
      header: "Customer since",
      render: (r) => (
        <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
      ),
    },
    {
      key: "expires",
      header: "License expires",
      render: (r) => {
        const d = r.license?.expires_at ?? null;
        const days = daysUntil(d);
        const soon = days !== null && days <= 30;
        const expired = days !== null && days < 0;
        return (
          <span
            className={
              expired
                ? "text-xs font-medium text-destructive"
                : soon
                  ? "text-xs font-medium text-amber-500"
                  : "text-xs text-muted-foreground"
            }
          >
            {fmtDate(d)}
            {days !== null && !expired ? (
              <span className="ml-1 text-muted-foreground">({days}d)</span>
            ) : null}
            {expired ? <span className="ml-1">(expired)</span> : null}
          </span>
        );
      },
    },
    {
      key: "maint",
      header: "Maintenance",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {fmtDate(r.license?.maintenance_expires_at)}
        </span>
      ),
    },
    {
      key: "users",
      header: "Users",
      align: "right",
      render: (r) => (
        <span className="tabular-nums">
          {r.user_count}
          <span className="text-muted-foreground"> / {r.license?.seats ?? r.max_users}</span>
        </span>
      ),
    },
    {
      key: "contract",
      header: "Contract",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={r.profile?.contract_status ?? "prospect"}
            onValueChange={(v) =>
              saveMut.mutate({
                company_id: r.id,
                contract_status: v as ContractStatus,
              })
            }
          >
            <SelectTrigger className="h-8 w-[130px]">
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
        </div>
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
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              updateMut.mutate({
                id: r.id,
                name: r.name,
                active: !r.active,
                subscription_status: r.active ? "suspended" : "active",
              })
            }
          >
            {r.active ? "Suspend" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete ${r.name}? All data will be lost.`)) removeMut.mutate(r.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Customers"
        description="Every OPSQAI customer — subscription, license expiry, contract lifecycle."
        actions={
          <NewCustomerDialog
            onCreate={(v) => createMut.mutate(v)}
            pending={createMut.isPending}
          />
        }
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
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{rows.length}</span> / {(data as Row[]).length}
        </div>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        onRowClick={(r) => {
          setActiveCompanyId(r.id);
          navigate({ to: "/management/companies/$id", params: { id: r.id } });
        }}
        empty={{
          icon: Users,
          title: (data as Row[]).length ? "No matches" : "No customers yet",
          description: (data as Row[]).length
            ? "Adjust filters to see more results."
            : "Create your first customer to get started.",
        }}
      />
    </div>
  );
}

function NewCustomerDialog({
  onCreate,
  pending,
}: {
  onCreate: (v: {
    name: string;
    subscription_plan: "free" | "starter" | "pro" | "enterprise";
    max_users: number;
    admin_email: string;
    admin_password: string;
    admin_first_name?: string;
    admin_last_name?: string;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<"free" | "starter" | "pro" | "enterprise">("free");
  const [maxUsers, setMaxUsers] = useState(10);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  const submit = () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      toast.error("Name, admin email and password (min 8 chars) are required.");
      return;
    }
    onCreate({
      name: name.trim(),
      subscription_plan: plan,
      max_users: maxUsers,
      admin_email: email.trim(),
      admin_password: password,
      admin_first_name: first.trim() || undefined,
      admin_last_name: last.trim() || undefined,
    });
    setOpen(false);
    setName("");
    setEmail("");
    setPassword("");
    setFirst("");
    setLast("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max users</Label>
              <Input
                type="number"
                min={1}
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Initial admin
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input value={first} onChange={(e) => setFirst(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={last} onChange={(e) => setLast(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="mt-3">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="mt-3">
              <Label>Password (min 8)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
