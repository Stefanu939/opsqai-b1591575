import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listLicenses,
  issueLicense,
  issueModuleLicense,
  revokeLicense,
  deleteLicense,
} from "@/lib/licenses.functions";
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
import { KeyRound, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ install: z.string().optional() });

export const Route = createFileRoute("/_authenticated/management/licenses")({
  head: () => ({ meta: [{ title: "Licenses — Management Center" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: LicensesPage,
});

type License = {
  id: string;
  install_id: string;
  kind: string;
  module_key: string | null;
  company_name: string;
  tier: string | null;
  seats: number | null;
  expires_at: string | null;
  revoked: boolean;
  suspended: boolean;
  created_at: string;
  install: { last_heartbeat_at: string | null; app_version: string | null } | null;
  modules: Array<{ module_key: string | null; revoked: boolean; expires_at: string | null }>;
};

function LicensesPage() {
  const qc = useQueryClient();
  const { install: installFilter } = Route.useSearch();
  const list = useServerFn(listLicenses);
  const issue = useServerFn(issueLicense);
  const issueModule = useServerFn(issueModuleLicense);
  const revoke = useServerFn(revokeLicense);
  const remove = useServerFn(deleteLicense);


  const [q, setQ] = useState(installFilter ?? "");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-licenses"],
    queryFn: () => list({ data: {} } as never) as Promise<License[]>,
  });

  const issueMut = useMutation({
    mutationFn: (v: {
      install_id: string;
      company_name: string;
      contact_email?: string;
      tier: "basic" | "standard" | "business" | "enterprise";
      seats: number;
      expires_at?: string | null;
    }) => issue({ data: v }),
    onSuccess: () => {
      toast.success("License issued");
      qc.invalidateQueries({ queryKey: ["mc-licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issueModuleMut = useMutation({
    mutationFn: (v: {
      install_id: string;
      module_key: string;
      unit_price_cents: number;
      expires_at?: string | null;
    }) => issueModule({ data: v }),
    onSuccess: () => {
      toast.success("Module activated");
      qc.invalidateQueries({ queryKey: ["mc-licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (v: { install_id: string; kind: "install" | "module"; module_key?: string }) =>
      revoke({ data: v }),
    onSuccess: () => {
      toast.success("Revoked");
      qc.invalidateQueries({ queryKey: ["mc-licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (install_id: string) => remove({ data: { install_id } }),
    onSuccess: () => {
      toast.success("License deleted");
      qc.invalidateQueries({ queryKey: ["mc-licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data as License[]).filter((l) => {
      if (query) {
        const hay = `${l.install_id} ${l.company_name}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (tierFilter !== "all" && l.tier !== tierFilter) return false;
      if (statusFilter === "active" && (l.revoked || l.suspended)) return false;
      if (statusFilter === "revoked" && !l.revoked) return false;
      if (statusFilter === "expiring") {
        if (!l.expires_at) return false;
        const days = (new Date(l.expires_at).getTime() - Date.now()) / (24 * 3600 * 1000);
        if (days > 30 || days < 0) return false;
      }
      return true;
    });
  }, [data, q, tierFilter, statusFilter]);

  const columns: Column<License>[] = [
    {
      key: "company",
      header: "Company / Install",
      render: (l) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{l.company_name}</span>
          <span className="font-mono text-xs text-muted-foreground">{l.install_id}</span>
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      render: (l) => <Badge variant="outline">{l.tier ?? "—"}</Badge>,
    },
    {
      key: "seats",
      header: "Seats",
      align: "right",
      render: (l) => <span className="tabular-nums">{l.seats ?? "—"}</span>,
    },
    {
      key: "modules",
      header: "Modules",
      render: (l) => (
        <div className="flex flex-wrap gap-1">
          {l.modules.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            l.modules.map((m) => (
              <Badge
                key={m.module_key}
                variant={m.revoked ? "outline" : "secondary"}
                className="text-[10px]"
              >
                {m.module_key}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (l) => {
        if (l.revoked) return <Badge variant="destructive">Revoked</Badge>;
        if (l.suspended) return <Badge variant="outline">Suspended</Badge>;
        return <Badge>Active</Badge>;
      },
    },
    {
      key: "expires",
      header: "Expires",
      render: (l) => (
        <span className="text-xs text-muted-foreground">
          {l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (l) => (
        <div className="flex justify-end gap-1">
          <ActivateModuleDialog
            installId={l.install_id}
            existing={l.modules.map((m) => m.module_key).filter(Boolean) as string[]}
            onIssue={(v) => issueModuleMut.mutate(v)}
            pending={issueModuleMut.isPending}
          />
          {!l.revoked && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Revoke license for ${l.company_name}?`))
                  revokeMut.mutate({ install_id: l.install_id, kind: "install" });
              }}
            >
              Revoke
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Licenses"
        description="Installation licenses and per-install module activations. Modules are activated exclusively here."
        actions={
          <IssueLicenseDialog
            onIssue={(v) => issueMut.mutate(v)}
            pending={issueMut.isPending}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by install_id or company…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring">Expiring ≤30 days</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{rows.length}</span> / {(data as License[]).length}
        </div>
      </div>

      <DataTable<License>
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        loading={isLoading}
        empty={{
          icon: KeyRound,
          title: (data as License[]).length ? "No matches" : "No licenses issued yet",
          description: (data as License[]).length
            ? "Adjust filters to see more results."
            : "Issue an installation license to onboard a customer.",
        }}
      />
    </div>
  );
}

function IssueLicenseDialog({
  onIssue,
  pending,
}: {
  onIssue: (v: {
    install_id: string;
    company_name: string;
    contact_email?: string;
    tier: "basic" | "standard" | "business" | "enterprise";
    seats: number;
    expires_at?: string | null;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [installId, setInstallId] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"basic" | "standard" | "business" | "enterprise">("basic");
  const [seats, setSeats] = useState(50);
  const [expires, setExpires] = useState("");

  const submit = () => {
    if (!installId.trim() || !company.trim()) {
      toast.error("Install ID and company name are required.");
      return;
    }
    onIssue({
      install_id: installId.trim(),
      company_name: company.trim(),
      contact_email: email.trim() || undefined,
      tier,
      seats,
      expires_at: expires ? new Date(expires).toISOString() : null,
    });
    setOpen(false);
    setInstallId("");
    setCompany("");
    setEmail("");
    setExpires("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Issue license
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue installation license</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Install ID</Label>
            <Input
              value={installId}
              onChange={(e) => setInstallId(e.target.value.toLowerCase())}
              placeholder="acme-prod"
              className="mt-1 font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Lowercase, digits, dashes. Must match the customer install.
            </p>
          </div>
          <div>
            <Label>Company name</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Seats</Label>
              <Input
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Expires (optional)</Label>
            <Input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Issuing…" : "Issue license"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivateModuleDialog({
  installId,
  existing,
  onIssue,
  pending,
}: {
  installId: string;
  existing: string[];
  onIssue: (v: {
    install_id: string;
    module_key: string;
    unit_price_cents: number;
    expires_at?: string | null;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [moduleKey, setModuleKey] = useState("");
  const [price, setPrice] = useState(0);
  const [expires, setExpires] = useState("");

  const submit = () => {
    if (!moduleKey.trim()) {
      toast.error("Module key is required.");
      return;
    }
    onIssue({
      install_id: installId,
      module_key: moduleKey.trim(),
      unit_price_cents: Math.round(price * 100),
      expires_at: expires ? new Date(expires).toISOString() : null,
    });
    setOpen(false);
    setModuleKey("");
    setPrice(0);
    setExpires("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Activate module
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate module for {installId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Module key</Label>
            <Input
              value={moduleKey}
              onChange={(e) => setModuleKey(e.target.value)}
              placeholder="e.g. academy, sop-generator"
              className="mt-1 font-mono"
            />
            {existing.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Already active: {existing.join(", ")}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit price (EUR)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Expires (optional)</Label>
              <Input
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
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
            {pending ? "Activating…" : "Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
