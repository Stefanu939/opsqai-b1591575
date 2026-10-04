import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listCustomerProfiles, upsertCustomerContract } from "@/lib/mc-admin.functions";
import { createCompany, updateCompany, deleteCompany } from "@/lib/companies.functions";
import { ModulePage } from "@/components/app/module-page";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  COMPANY_PROFILES,
  getCompanyProfile,
  getProduct,
  productsAvailableFor,
  productsRecommendedFor,
} from "@/lib/product-architecture";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Building2,
  CalendarClock,
  PauseCircle,
  LayoutGrid,
  List,
  Truck,
  Landmark,
  Factory,
  MessageCircle,
  Mail,
  Copy,
  ArrowRight,
  Dices,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePassword, mailtoUrl, passwordStrength, whatsappUrl } from "@/lib/mc-outreach";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { confirmAction } from "@/components/ui/confirm";
import { ManageCustomerDialog } from "@/components/app/manage-customer-dialog";
import { OwnerCards, useOwnershipCards, type OwnerSelection } from "@/components/mc/owner-cards";
import { setCompanyOwner } from "@/lib/mc-ownership.functions";


type NewCustomerInput = {
  name: string;
  business_type: string;
  enabled_products: string[];
  subscription_plan: "free" | "starter" | "pro" | "enterprise";
  max_users: number;
  admin_email: string;
  admin_password: string;
  admin_first_name?: string;
  admin_last_name?: string;
};


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
  business_type?: string | null;
  enabled_products?: string[] | null;
  owner_user_id?: string | null;

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
  const { setActiveCompanyId, session, loading: authLoading } = useAuth();
  const list = useServerFn(listCustomerProfiles);
  const save = useServerFn(upsertCustomerContract);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const remove = useServerFn(deleteCompany);

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-customers", session?.user?.id ?? null],
    queryFn: () => list({ data: {} } as never) as Promise<Row[]>,
    // Don't fetch before the session is hydrated or after sign-out — the
    // protected fn would 401 with no bearer token and blank the screen.
    enabled: !authLoading && Boolean(session?.user?.id),
    retry: false,
  });


  const [q, setQ] = useState("");
  const [owner, setOwner] = useState<OwnerSelection>(null);
  const ownership = useOwnershipCards();
  const isSuperAdmin = Boolean(ownership.data?.isSuperAdmin);
  const staff = (ownership.data?.cards ?? []).filter((c) => c.user_id);
  const reassign = useServerFn(setCompanyOwner);
  const reassignMut = useMutation({
    mutationFn: (v: { company_id: string; owner_user_id: string | null }) => reassign({ data: v }),
    onSuccess: () => {
      toast.success("Owner updated");
      qc.invalidateQueries({ queryKey: ["mc-customers"] });
      qc.invalidateQueries({ queryKey: ["mc-ownership-cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [pill, setPill] = useState<"all" | "expiring" | "suspended" | "enterprise">("all");
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["mc-customers"] });

  const saveMut = useMutation({
    mutationFn: (v: { company_id: string; contract_status?: ContractStatus }) => save({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (v: NewCustomerInput) => create({ data: v }),

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
      if (owner) {
        if (owner.unassigned && r.owner_user_id) return false;
        if (!owner.unassigned && owner.userId !== "__all__" && r.owner_user_id !== owner.userId)
          return false;
      }
      if (planFilter !== "all" && r.subscription_plan !== planFilter) return false;
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "suspended" && r.active) return false;
      return true;
    });
  }, [data, q, owner, planFilter, statusFilter]);

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
      key: "company_profile",
      header: "Company profile",
      render: (r) =>
        r.business_type ? (
          <Badge variant="outline">{getCompanyProfile(r.business_type).label}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not set</span>
        ),
    },
    {
      key: "products",
      header: "Products",
      render: (r) => {
        const keys = (r.enabled_products ?? []).filter(Boolean);
        if (!keys.length) return <span className="text-xs text-muted-foreground">Core only</span>;
        return (
          <span className="text-xs text-foreground">
            {keys.map((k) => getProduct(k)?.label ?? k).join(" + ")}
          </span>
        );
      },
    },

    {
      key: "since",
      header: "Customer since",
      render: (r) => <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>,
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
    ...(isSuperAdmin
      ? [
          {
            key: "owner",
            header: "Owner",
            render: (r: Row) => (
              <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Select
                  value={r.owner_user_id ?? "__none__"}
                  onValueChange={(v) =>
                    reassignMut.mutate({
                      company_id: r.id,
                      owner_user_id: v === "__none__" ? null : v,
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {staff.map((c) => (
                      <SelectItem key={c.user_id as string} value={c.user_id as string}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ),
          } as Column<Row>,
        ]
      : []),
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <ManageCustomerDialog companyId={r.id} companyName={r.name} />
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
            onClick={async () => {
              if (
                await confirmAction({
                  title: `Delete ${r.name}?`,
                  description: "All data for this customer will be lost. This cannot be undone.",
                  confirmLabel: "Delete customer",
                })
              )
                removeMut.mutate(r.id);
            }}
            aria-label={`Delete ${r.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const all = data as Row[];
  const expiringSoon = (r: Row) => {
    const d = daysUntil(r.license?.expires_at);
    return d !== null && d <= 30;
  };
  const kpis = {
    active: all.filter((r) => r.active).length,
    seatsUsed: all.reduce((s, r) => s + (r.user_count ?? 0), 0),
    seatsTotal: all.reduce((s, r) => s + (r.license?.seats ?? r.max_users ?? 0), 0),
    expiring: all.filter(expiringSoon).length,
    suspended: all.filter((r) => !r.active).length,
  };
  const shown = rows.filter((r) => {
    if (pill === "expiring") return expiringSoon(r);
    if (pill === "suspended") return !r.active;
    if (pill === "enterprise") return r.subscription_plan === "enterprise";
    return true;
  });

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Customers"
      description="Every OPSQAI customer — subscription, license expiry, contract lifecycle."
      actions={
        <NewCustomerDialog
          onCreate={(v, phone) => createMut.mutate(v, { onSuccess: () => setCredentials({ ...v, phone }) })}
          pending={createMut.isPending}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Building2} label="Clienți activi" value={kpis.active} tone="primary" />
        <Kpi icon={Users} label="Locuri utilizate" value={`${kpis.seatsUsed} / ${kpis.seatsTotal}`} tone="primary" />
        <Kpi icon={CalendarClock} label="Expiră în < 30 zile" value={kpis.expiring} tone="warning" onClick={() => setPill("expiring")} />
        <Kpi icon={PauseCircle} label="Suspendați" value={kpis.suspended} tone="destructive" onClick={() => setPill("suspended")} />
      </div>

      <OwnerCards selection={owner} onSelect={setOwner} />

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
        <div className="flex rounded-md border border-border p-0.5">
          <Button size="sm" variant={view === "grid" ? "secondary" : "ghost"} className="h-8" onClick={() => setView("grid")} aria-label="Cartonașe">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="h-8" onClick={() => setView("table")} aria-label="Tabel">
            <List className="h-4 w-4" />
          </Button>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{shown.length}</span> / {all.length}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Toți clienții"],
            ["expiring", "Expiră curând"],
            ["suspended", "Suspendați"],
            ["enterprise", "Enterprise"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setPill(k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              pill === k ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "grid" ? (
        isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : shown.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((r) => (
              <CustomerCard
                key={r.id}
                row={r}
                onOpen={() => {
                  setActiveCompanyId(r.id);
                  navigate({ to: "/management/companies/$id", params: { id: r.id } });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {all.length ? "Niciun client nu corespunde filtrelor." : "Nu există încă clienți."}
          </div>
        )
      ) : (
        <DataTable<Row>
          columns={columns}
          rows={shown}
          rowKey={(r) => r.id}
          loading={isLoading}
          onRowClick={(r) => {
            setActiveCompanyId(r.id);
            navigate({ to: "/management/companies/$id", params: { id: r.id } });
          }}
          empty={{
            icon: Users,
            title: all.length ? "No matches" : "No customers yet",
            description: all.length
              ? "Adjust filters to see more results."
              : "Create your first customer to get started.",
          }}
        />
      )}

      <CredentialsDialog value={credentials} onClose={() => setCredentials(null)} />
    </ModulePage>
  );
}

const TONES = {
  primary: "bg-primary/15 text-primary",

  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
} as const;

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: keyof typeof TONES;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors enabled:hover:border-primary/40"
    >
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", TONES[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-2xl font-semibold tabular-nums text-foreground">{value}</span>
        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

const PROFILE_STYLE: { match: RegExp; icon: typeof Users; cls: string }[] = [
  { match: /transport|logist/i, icon: Truck, cls: "bg-primary/10 text-primary" },
  { match: /bank|financ|insur/i, icon: Landmark, cls: "bg-primary/15 text-primary" },
  { match: /manufact|product|industr/i, icon: Factory, cls: "bg-warning/15 text-warning" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function CustomerCard({ row: r, onOpen }: { row: Row; onOpen: () => void }) {
  const style = PROFILE_STYLE.find((p) => p.match.test(r.business_type ?? "")) ?? {
    icon: Building2,
    cls: "bg-success/15 text-success",
  };
  const Icon = style.icon;
  const seats = r.license?.seats ?? r.max_users ?? 0;
  const pct = seats ? Math.min(100, Math.round((r.user_count / seats) * 100)) : 0;
  const days = daysUntil(r.license?.expires_at);
  const status = !r.active
    ? { label: "Suspendat", cls: "bg-destructive/15 text-destructive" }
    : days !== null && days < 0
      ? { label: "Licență expirată", cls: "bg-destructive/15 text-destructive" }
      : days !== null && days <= 30
        ? { label: `Expiră în ${days} zile`, cls: "bg-warning/15 text-warning" }
        : { label: "Activ", cls: "bg-success/15 text-success" };
  const products = (r.enabled_products ?? []).filter(Boolean);
  const greeting = `Bună ziua! Vă contactăm din partea echipei OPSQAI referitor la contul ${r.name}.`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group flex cursor-pointer flex-col rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
    >
      <div className="flex items-start gap-3 p-4">
        <span className={cn("relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold", style.cls)}>
          {initials(r.name)}
          <Icon className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md bg-card p-0.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{r.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.business_type ? getCompanyProfile(r.business_type).label : "Profil nesetat"}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", status.cls)}>{status.label}</span>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Locuri utilizate</span>
            <span className="tabular-nums">{r.user_count} / {seats}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", pct >= 90 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">Core</Badge>
          {products.map((k) => (
            <Badge key={k} variant="secondary" className="text-[10px]">{getProduct(k)?.label ?? k}</Badge>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Client din {fmtDate(r.created_at)} · Licență până la {fmtDate(r.license?.expires_at)}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-1 border-t border-border px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
        <Button asChild size="sm" variant="ghost" className="h-8 px-2">
          <a href={whatsappUrl(null, greeting)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
            <MessageCircle className="h-4 w-4" />
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost" className="h-8 px-2">
          <a href={mailtoUrl("", `OPSQAI — Asistență & Licențiere ${r.name}`, greeting)} aria-label="Email">
            <Mail className="h-4 w-4" />
          </a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          aria-label="Copiază date"
          onClick={() => {
            void navigator.clipboard.writeText(
              `${r.name}\nProfil: ${r.business_type ?? "—"}\nLocuri: ${r.user_count}/${seats}\nInstall ID: ${r.install_id ?? "—"}\nLicență până la: ${fmtDate(r.license?.expires_at)}`,
            );
            toast.success("Date copiate");
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <ManageCustomerDialog companyId={r.id} companyName={r.name} />
        <Button size="sm" variant="ghost" className="ml-auto h-8 text-primary" onClick={onOpen}>
          Fișă client <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

type Credentials = NewCustomerInput & { phone: string };

function CredentialsDialog({ value, onClose }: { value: Credentials | null; onClose: () => void }) {
  if (!value) return null;
  const portal = typeof window !== "undefined" ? window.location.origin : "https://opsqai.de";
  const who = value.admin_first_name ? `Bună ziua, ${value.admin_first_name}!` : "Bună ziua!";
  const text = `${who} Contul OPSQAI pentru ${value.name} a fost configurat.\n\nEmail: ${value.admin_email}\nParolă temporară: ${value.admin_password}\nPortal: ${portal}\n\nVă rugăm să schimbați parola la prima autentificare.`;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Client creat — credențiale gata de trimis</DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-3 text-sm text-foreground">{text}</pre>
        <p className="text-xs text-muted-foreground">Parola este afișată doar acum. Trimite-o numai persoanei autorizate.</p>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(text);
              toast.success("Copiat");
            }}
          >
            <Copy className="mr-1.5 h-4 w-4" /> Copiază
          </Button>
          <Button asChild variant="outline">
            <a href={mailtoUrl(value.admin_email, `Contul OPSQAI pentru ${value.name}`, text)}>
              <Mail className="mr-1.5 h-4 w-4" /> Email
            </a>
          </Button>
          <Button asChild>
            <a href={whatsappUrl(value.phone, text)} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCustomerDialog({
  onCreate,
  pending,
}: {
  onCreate: (v: NewCustomerInput, phone: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<string>("");
  const [products, setProducts] = useState<string[]>([]);
  const [plan, setPlan] = useState<"free" | "starter" | "pro" | "enterprise">("free");
  const [maxUsers, setMaxUsers] = useState(10);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const strength = passwordStrength(password);
  const matches = password.length > 0 && password === confirm;


  const selected = profile ? getCompanyProfile(profile) : null;
  const available = selected ? productsAvailableFor(selected.key) : [];
  const recommended = new Set(selected ? productsRecommendedFor(selected.key) : []);

  const onProfileChange = (v: string) => {
    setProfile(v);
    // Changing the profile never auto-enables products; it only narrows the
    // catalogue the administrator may choose from.
    const next = new Set(productsAvailableFor(v) as readonly string[]);
    setProducts((prev) => prev.filter((p) => next.has(p)));
  };

  const toggle = (key: string) =>
    setProducts((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));

  const submit = () => {
    if (!name.trim() || !profile || !email.trim() || password.length < 8) {
      toast.error("Numele clientului, profilul, emailul și parola (min 8) sunt obligatorii.");
      return;
    }
    if (!matches) {
      toast.error("Parolele nu se potrivesc.");
      return;
    }
    onCreate(
      {
        name: name.trim(),
        business_type: profile,
        enabled_products: products,
        subscription_plan: plan,
        max_users: maxUsers,
        admin_email: email.trim(),
        admin_password: password,
        admin_first_name: first.trim() || undefined,
        admin_last_name: last.trim() || undefined,
      },
      phone.trim(),
    );
    setOpen(false);
    setName("");
    setProfile("");
    setProducts([]);
    setEmail("");
    setPassword("");
    setConfirm("");
    setPhone("");
    setShow(false);
    setFirst("");
    setLast("");
  };

  const section = (n: number, title: string, hint?: string) => (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Step {n} — {title}
      </span>
      {hint ? <span className="text-[11px] text-muted-foreground/70">{hint}</span> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            {section(1, "Who is the company?")}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Customer name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Company profile</Label>
                <Select value={profile} onValueChange={onProfileChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select company profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_PROFILES.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            {section(2, "What OPSQAI products does it receive?", "recommendations are not automatic")}
            {!selected ? (
              <p className="text-xs text-muted-foreground">
                Select a company profile to see the products you can enable.
              </p>
            ) : (
              <div className="space-y-2">
                {available.map((key) => {
                  const product = getProduct(key);
                  const isRec = recommended.has(key);
                  const on = products.includes(key);
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card/60 p-3"
                    >
                      <Checkbox checked={on} onCheckedChange={() => toggle(key)} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {product?.label ?? key}
                          </span>
                          {isRec ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Recommended
                            </Badge>
                          ) : null}
                          {product && product.status !== "available" ? (
                            <Badge variant="outline" className="text-[10px]">
                              {product.status}
                            </Badge>
                          ) : null}
                        </span>
                        {product?.description ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {product.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">
                  Core platform capabilities are always included and are never purchased. Only the
                  products enabled here are distributed through the signed license.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            {section(3, "Who administers it?")}
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
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Telefon (pentru WhatsApp, opțional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="07xx xxx xxx" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Parolă (min 8)</Label>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    onClick={() => {
                      const p = generatePassword();
                      setPassword(p);
                      setConfirm(p);
                      setShow(true);
                    }}
                  >
                    <Dices className="h-3.5 w-3.5" /> Generează parolă sigură
                  </button>
                </div>
                <div className="relative mt-1">
                  <Input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Ascunde parola" : "Arată parola"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full",
                        strength.score >= i
                          ? strength.score === 3
                            ? "bg-success"
                            : strength.score === 2
                              ? "bg-warning"
                              : "bg-destructive"
                          : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Putere: {password ? strength.label : "—"}</p>
              </div>
              <div>
                <Label>Confirmă parola</Label>
                <Input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1"
                />
                {confirm ? (
                  <p className={cn("mt-1.5 flex items-center gap-1 text-[11px]", matches ? "text-success" : "text-destructive")}>
                    {matches ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {matches ? "Parolele coincid" : "Parolele nu se potrivesc"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            {section(4, "Commercial settings", "license seats & expiry are issued separately")}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Seats (max users)</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Billing tier (legacy)</Label>
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
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Creating…" : "Create customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

