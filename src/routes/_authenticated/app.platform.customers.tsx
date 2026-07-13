/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  platformStats,
} from "@/lib/companies.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileText,
  LogIn,
  MessageSquare,
  Plus,
  Power,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/platform/KpiCard";
import { PremiumCard } from "@/components/platform/PremiumCard";

export const Route = createFileRoute("/_authenticated/app/platform/customers")({
  component: CustomersMc,
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

function CustomersMc() {
  const { isPlatformAdmin, setActiveCompanyId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const list = useServerFn(listCompanies);
  const stats = useServerFn(platformStats);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const remove = useServerFn(deleteCompany);

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => list({ data: {} } as never),
    enabled: isPlatformAdmin,
  });
  const { data: platStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => stats({ data: {} } as never),
    enabled: isPlatformAdmin,
  });

  const createMut = useMutation({
    mutationFn: (vars: any) => create({ data: vars }),
    onSuccess: () => {
      toast.success("Client creat");
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["platform-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (vars: any) => update({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Salvat");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (vars: { id: string }) => remove({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Șters");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isPlatformAdmin) {
    throw redirect({ to: "/app" });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (companies ?? []).filter((c: Company) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (planFilter !== "all" && c.subscription_plan !== planFilter) return false;
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "suspended" && c.active) return false;
      return true;
    });
  }, [companies, query, planFilter, statusFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mc-eyebrow mb-1 text-[var(--mc-fg-dim)]">Growth · Tenants</div>
          <h1 className="mc-heading text-3xl font-semibold tracking-tight text-[var(--mc-fg)]">
            Clienți
          </h1>
          <p className="mt-1 text-sm text-[var(--mc-fg-muted)]">
            Toți tenants OPSQAI · plan, status, utilizare, acțiuni rapide.
          </p>
        </div>
        <NewCompanyDialog
          onCreate={(v) => createMut.mutate(v)}
          pending={createMut.isPending}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard eyebrow="Clienți" value={String(platStats?.total_companies ?? 0)} icon={Building2} />
        <KpiCard eyebrow="Active" value={String(platStats?.active_companies ?? 0)} icon={Power} />
        <KpiCard eyebrow="Utilizatori" value={String(platStats?.total_users ?? 0)} icon={Users} />
        <KpiCard eyebrow="Documente" value={String(platStats?.total_documents ?? 0)} icon={FileText} />
        <KpiCard
          eyebrow="Întrebări"
          value={String(platStats?.total_questions ?? 0)}
          icon={MessageSquare}
        />
      </div>

      <PremiumCard>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--mc-gold-line)] px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mc-fg-dim)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută după nume…"
              className="h-9 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] pl-8 text-[var(--mc-fg)] placeholder:text-[var(--mc-fg-dim)]"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-9 w-[160px] border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] text-[var(--mc-fg)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate planurile</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px] border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] text-[var(--mc-fg)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspendate</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-[var(--mc-fg-dim)]">
            <span className="mc-num">{filtered.length}</span> / {companies?.length ?? 0}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]">
              <tr className="text-left text-[var(--mc-fg-dim)]">
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">
                  Nume
                </th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">
                  Users
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">
                  Docs
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">
                  FAQs
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">
                  Max
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: Company) => (
                <tr
                  key={c.id}
                  className="border-t border-[var(--mc-gold-line)] transition-colors hover:bg-[var(--mc-surface-2)]/40"
                >
                  <td className="px-4 py-3 font-medium text-[var(--mc-fg)]">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-gold-glow)]"
                    >
                      {c.subscription_plan}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={c.active} status={c.subscription_status} />
                  </td>
                  <td className="mc-num px-4 py-3 text-right text-[var(--mc-fg)]">
                    {c.user_count}
                  </td>
                  <td className="mc-num px-4 py-3 text-right text-[var(--mc-fg)]">
                    {c.document_count}
                  </td>
                  <td className="mc-num px-4 py-3 text-right text-[var(--mc-fg)]">
                    {c.faq_count}
                  </td>
                  <td className="mc-num px-4 py-3 text-right text-[var(--mc-fg-muted)]">
                    {c.max_users}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[var(--mc-fg-muted)] hover:bg-[var(--mc-surface-3)] hover:text-[var(--mc-gold-glow)]"
                        onClick={() => {
                          setActiveCompanyId(c.id);
                          toast.success(`Workspace ${c.name} deschis`);
                          navigate({ to: "/app/admin/users" });
                        }}
                      >
                        <LogIn className="mr-1 h-3.5 w-3.5" />
                        Open
                      </Button>
                      <EditPlanDialog
                        company={c}
                        onSave={(plan, max) =>
                          updateMut.mutate({
                            id: c.id,
                            name: c.name,
                            subscription_plan: plan,
                            max_users: max,
                          })
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[var(--mc-fg-muted)] hover:bg-[var(--mc-surface-3)] hover:text-[var(--mc-fg)]"
                        onClick={() =>
                          updateMut.mutate({
                            id: c.id,
                            name: c.name,
                            active: !c.active,
                            subscription_status: c.active ? "suspended" : "active",
                          })
                        }
                      >
                        {c.active ? "Suspend" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[var(--mc-danger)] hover:bg-[var(--mc-danger)]/10 hover:text-[var(--mc-danger)]"
                        onClick={() => {
                          if (confirm(`Șterg ${c.name}? Toate datele dispar.`))
                            removeMut.mutate({ id: c.id });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-[var(--mc-fg-dim)]"
                  >
                    {companies?.length ? "Niciun rezultat pentru filtre." : "Niciun client încă."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  );
}

function StatusBadge({ active, status }: { active: boolean; status: string }) {
  const color = active
    ? "border-[var(--mc-success)]/40 bg-[var(--mc-success)]/10 text-[var(--mc-success)]"
    : "border-[var(--mc-fg-dim)]/40 bg-[var(--mc-surface-2)] text-[var(--mc-fg-muted)]";
  return (
    <Badge variant="outline" className={color}>
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
          active ? "bg-[var(--mc-success)]" : "bg-[var(--mc-fg-dim)]"
        }`}
      />
      {status}
    </Badge>
  );
}

function NewCompanyDialog({
  onCreate,
  pending,
}: {
  onCreate: (v: any) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [maxUsers, setMaxUsers] = useState(10);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFirst, setAdminFirst] = useState("");
  const [adminLast, setAdminLast] = useState("");

  const submit = () => {
    if (!name.trim() || !adminEmail.trim() || adminPassword.length < 8) {
      toast.error("Nume, email admin și parolă (min 8) sunt obligatorii.");
      return;
    }
    onCreate({
      name: name.trim(),
      subscription_plan: plan,
      max_users: maxUsers,
      admin_email: adminEmail.trim(),
      admin_password: adminPassword,
      admin_first_name: adminFirst.trim() || undefined,
      admin_last_name: adminLast.trim() || undefined,
    });
    setOpen(false);
    setName("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminFirst("");
    setAdminLast("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mc-btn-gold h-9">
          <Plus className="mr-1.5 h-4 w-4" />
          Client nou
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-1)] text-[var(--mc-fg)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="mc-heading">Client nou</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nume companie</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]">
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
              <Label>Utilizatori max</Label>
              <Input
                type="number"
                min={1}
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]"
              />
            </div>
          </div>
          <div className="border-t border-[var(--mc-gold-line)] pt-3">
            <div className="mc-eyebrow mb-2 text-[var(--mc-fg-dim)]">Admin inițial</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prenume</Label>
                <Input
                  value={adminFirst}
                  onChange={(e) => setAdminFirst(e.target.value)}
                  className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]"
                />
              </div>
              <div>
                <Label>Nume</Label>
                <Input
                  value={adminLast}
                  onChange={(e) => setAdminLast(e.target.value)}
                  className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]"
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>Email</Label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]"
              />
            </div>
            <div className="mt-3">
              <Label>Parolă (min 8)</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="mc-btn-gold">
            Creează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({
  company,
  onSave,
}: {
  company: Company;
  onSave: (plan: string, max: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(company.subscription_plan);
  const [max, setMax] = useState(company.max_users);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-[var(--mc-fg-muted)] hover:bg-[var(--mc-surface-3)] hover:text-[var(--mc-gold-glow)]"
        >
          Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-1)] text-[var(--mc-fg)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="mc-heading">Editează plan — {company.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]">
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
            <Label>Utilizatori max</Label>
            <Input
              type="number"
              min={1}
              value={max}
              onChange={(e) => setMax(parseInt(e.target.value) || 1)}
              className="mt-1 border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="mc-btn-gold"
            onClick={() => {
              onSave(plan, max);
              setOpen(false);
            }}
          >
            Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
