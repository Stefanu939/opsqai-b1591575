import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "@/lib/companies.functions";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/management/companies")({
  component: CompaniesPage,
});

type Company = {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  active: boolean;
  max_users: number;
  user_count: number;
  document_count: number;
  faq_count: number;
  created_at?: string;
};

function CompaniesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setActiveCompanyId } = useAuth();
  const list = useServerFn(listCompanies);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const remove = useServerFn(deleteCompany);

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["mc-companies"],
    queryFn: () => list({ data: {} } as never),
  });

  type CreateInput = {
    name: string;
    subscription_plan: "free" | "starter" | "pro" | "enterprise";
    max_users: number;
    admin_email: string;
    admin_password: string;
    admin_first_name?: string;
    admin_last_name?: string;
  };
  type UpdateInput = {
    id: string;
    name: string;
    subscription_plan?: "free" | "starter" | "pro" | "enterprise";
    max_users?: number;
    active?: boolean;
    subscription_status?: "active" | "suspended" | "trial" | "cancelled";
  };

  const createMut = useMutation({
    mutationFn: (v: CreateInput) => create({ data: v }),
    onSuccess: () => {
      toast.success("Company created");
      qc.invalidateQueries({ queryKey: ["mc-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (v: UpdateInput) => update({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["mc-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["mc-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (companies as Company[]).filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (planFilter !== "all" && c.subscription_plan !== planFilter) return false;
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "suspended" && c.active) return false;
      return true;
    });
  }, [companies, query, planFilter, statusFilter]);

  const columns: Column<Company>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <Link
          to="/management/companies/$id"
          params={{ id: c.id }}
          className="font-medium text-foreground hover:underline"
        >
          {c.name}
        </Link>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (c) => <Badge variant="outline">{c.subscription_plan}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <Badge variant={c.active ? "default" : "outline"}>
          {c.active ? c.subscription_status : "suspended"}
        </Badge>
      ),
    },
    {
      key: "users",
      header: "Users",
      align: "right",
      render: (c) => (
        <span className="tabular-nums">
          {c.user_count}
          <span className="text-muted-foreground"> / {c.max_users}</span>
        </span>
      ),
    },
    {
      key: "docs",
      header: "Docs",
      align: "right",
      render: (c) => <span className="tabular-nums">{c.document_count}</span>,
    },
    {
      key: "faqs",
      header: "FAQs",
      align: "right",
      render: (c) => <span className="tabular-nums">{c.faq_count}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              updateMut.mutate({
                id: c.id,
                name: c.name,
                active: !c.active,
                subscription_status: c.active ? "suspended" : "active",
              });
            }}
          >
            {c.active ? "Suspend" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete ${c.name}? All data will be lost.`))
                removeMut.mutate(c.id);
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
        title="Companies"
        description="Every customer company that runs OPSQAI."
        actions={
          <NewCompanyDialog
            onCreate={(v) => createMut.mutate(v)}
            pending={createMut.isPending}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
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
          <span className="tabular-nums">{filtered.length}</span> / {companies.length}
        </div>
      </div>

      <DataTable<Company>
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        loading={isLoading}
        empty={{
          icon: Building2,
          title: companies.length ? "No matches" : "No companies yet",
          description: companies.length
            ? "Adjust your filters to see more results."
            : "Create your first customer company to get started.",
        }}
      />
    </div>
  );
}

function NewCompanyDialog({
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
          New company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New company</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company name</Label>
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
