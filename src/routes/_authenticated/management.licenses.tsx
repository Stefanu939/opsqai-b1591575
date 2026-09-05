import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listLicenses,
  issueLicense,
  issueModuleLicense,
  revokeLicense,
  deleteLicense,
} from "@/lib/licenses.functions";
import { ModulePage } from "@/components/app/module-page";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, KeyRound, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { listCompanies } from "@/lib/companies.functions";
import { setCompanyProduct } from "@/lib/company-products.functions";
import {
  getCompanyProfile,
  getProduct,
  productsAvailableFor,
  productsRecommendedFor,
} from "@/lib/product-architecture";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import { LICENSE_MODULE_CATALOG, BASIC_MODULES } from "@/lib/license-modules";
import { confirmAction } from "@/components/ui/confirm";


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
  const [issueOpen, setIssueOpen] = useState(false);
  const [prefill, setPrefill] = useState<IssuePrefill | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());


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

  const bulkDeleteMut = useMutation({
    mutationFn: async (installIds: string[]) => {
      const failed: string[] = [];
      for (const install_id of installIds) {
        try {
          await remove({ data: { install_id } });
        } catch {
          failed.push(install_id);
        }
      }
      return { failed, total: installIds.length };
    },
    onSuccess: ({ failed, total }) => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["mc-licenses"] });
      if (failed.length)
        toast.error(`${total - failed.length}/${total} deleted. Failed: ${failed.join(", ")}`);
      else toast.success(`${total} license${total === 1 ? "" : "s"} deleted`);
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

  const allInstallIds = useMemo(() => [...new Set(rows.map((l) => l.install_id))], [rows]);
  const allSelected = allInstallIds.length > 0 && allInstallIds.every((i) => selected.has(i));

  const columns: Column<License>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={allSelected}
          aria-label="Select all licenses"
          onCheckedChange={(v) =>
            setSelected(v ? new Set(allInstallIds) : new Set<string>())
          }
        />
      ),
      render: (l) => (
        <Checkbox
          checked={selected.has(l.install_id)}
          aria-label={`Select license ${l.install_id}`}
          onCheckedChange={(v) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (v) next.add(l.install_id);
              else next.delete(l.install_id);
              return next;
            })
          }
        />
      ),
    },
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
              onClick={async () => {
                if (
                  await confirmAction({
                    title: `Revoke license for ${l.company_name}?`,
                    description: "The install stops validating at its next license check.",
                    confirmLabel: "Revoke license",
                  })
                )
                  revokeMut.mutate({ install_id: l.install_id, kind: "install" });
              }}
            >
              Revoke
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            title="Delete license"
            onClick={async () => {
              if (
                await confirmAction({
                  title: `Delete license for ${l.company_name}?`,
                  description: `Install ${l.install_id} loses its license and all module entitlements. This cannot be undone.`,
                  confirmLabel: "Delete license",
                })
              )
                deleteMut.mutate(l.install_id);
            }}
            aria-label={`Delete license for ${l.company_name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Licenses"
      description="Installation licenses and per-install module activations. Modules are activated exclusively here."
      actions={
        <IssueLicenseDialog
          onIssue={(v) => issueMut.mutate(v)}
          pending={issueMut.isPending}
          open={issueOpen}
          onOpenChange={setIssueOpen}
          prefill={prefill}
        />
      }
    >
      <CustomerEntitlementsPanel
        licenses={data as License[]}
        onIssueFor={(p) => {
          setPrefill(p);
          setIssueOpen(true);
        }}
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

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto"
            disabled={bulkDeleteMut.isPending}
            onClick={async () => {
              const ids = [...selected];
              if (
                await confirmAction({
                  title: `Delete ${ids.length} license${ids.length === 1 ? "" : "s"}?`,
                  description:
                    "These installs lose their licenses and all module entitlements. This cannot be undone.",
                  confirmLabel: "Delete licenses",
                })
              )
                bulkDeleteMut.mutate(ids);
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {bulkDeleteMut.isPending ? "Deleting…" : "Delete selected"}
          </Button>
        </div>
      )}



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
    </ModulePage>
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export type IssuePrefill = {
  company_name: string;
  install_id: string;
  seats?: number | null;
};

function IssueLicenseDialog({
  onIssue,
  pending,
  open: openProp,
  onOpenChange,
  prefill,
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
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  prefill?: IssuePrefill | null;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const [installId, setInstallId] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"basic" | "standard" | "business" | "enterprise">("basic");
  const [seats, setSeats] = useState(50);
  const [expires, setExpires] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [installIdDirty, setInstallIdDirty] = useState(false);

  // Seed from a customer row when the dialog is opened from the customers panel.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !prefill) return;
    const stamp = `${prefill.company_name}|${prefill.install_id}`;
    if (seededFor.current === stamp) return;
    seededFor.current = stamp;
    setCompany(prefill.company_name);
    setInstallId(prefill.install_id);
    setInstallIdDirty(true);
    if (typeof prefill.seats === "number" && prefill.seats > 0) setSeats(prefill.seats);
  }, [open, prefill]);
  useEffect(() => {
    if (!open) seededFor.current = null;
  }, [open]);

  const listCompaniesFn = useServerFn(listCompanies);
  const { data: companies = [] } = useQuery({
    queryKey: ["mc-companies-for-license"],
    queryFn: () => listCompaniesFn({ data: {} } as never),
    enabled: open,
  });


  const pickCompany = (c: {
    id: string;
    name: string;
    max_users?: number | null;
    install_id?: string | null;
  }) => {
    setCompany(c.name);
    if (!installIdDirty) {
      setInstallId((c.install_id && c.install_id.trim()) || slugify(c.name));
    }
    if (typeof c.max_users === "number" && c.max_users > 0) setSeats(c.max_users);
    setPickerOpen(false);
  };

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
    setInstallIdDirty(false);
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
            <Label>Company</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="mt-1 w-full justify-between font-normal"
                >
                  <span className={cn(!company && "text-muted-foreground")}>
                    {company || "Select existing company or type a new one…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search companies…"
                    value={company}
                    onValueChange={(v) => {
                      setCompany(v);
                      if (!installIdDirty) setInstallId(slugify(v));
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      No match. Press Enter to use "{company}" as a new company.
                    </CommandEmpty>
                    <CommandGroup heading="Existing companies">
                      {companies.map((c) => (
                        <CommandItem key={c.id} value={c.name} onSelect={() => pickCompany(c)}>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              company === c.name ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{c.name}</span>
                            {c.install_id ? (
                              <span className="text-xs text-muted-foreground font-mono">
                                {c.install_id}
                              </span>
                            ) : null}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick an existing company to auto-fill, or type a new name.
            </p>
          </div>
          <div>
            <Label>Install ID</Label>
            <Input
              value={installId}
              onChange={(e) => {
                setInstallId(e.target.value.toLowerCase());
                setInstallIdDirty(true);
              }}
              placeholder="acme-prod"
              className="mt-1 font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Lowercase, digits, dashes. Must match the customer install.
            </p>
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

  const availableModules = useMemo(
    () =>
      LICENSE_MODULE_CATALOG.filter(
        (m) => !(BASIC_MODULES as readonly string[]).includes(m.key) && !existing.includes(m.key),
      ),
    [existing],
  );

  const handleModuleChange = (key: string) => {
    setModuleKey(key);
    const m = LICENSE_MODULE_CATALOG.find((x) => x.key === key);
    if (m) setPrice(m.defaultPriceCents / 100);
  };

  const submit = () => {
    if (!moduleKey.trim()) {
      toast.error("Select a module to activate.");
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
            <Label>Module</Label>
            <Select value={moduleKey} onValueChange={handleModuleChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a module…" />
              </SelectTrigger>
              <SelectContent>
                {availableModules.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    All add-on modules are already active for this install.
                  </div>
                ) : (
                  availableModules.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label} <span className="text-muted-foreground">({m.key})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
          <Button onClick={submit} disabled={pending || !moduleKey}>
            {pending ? "Activating…" : "Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customers & entitlements ───────────────────────────────────────────
// Management Center is the authority: the company profile decides which
// OPSQAI products are available, the administrator explicitly enables them,
// and the (re)issued installation license distributes those entitlements.

type CompanyRow = {
  id: string;
  name: string;
  max_users: number | null;
  install_id: string | null;
  business_type: string | null;
  enabled_products: string[] | null;
};

function CustomerEntitlementsPanel({
  licenses,
  onIssueFor,
}: {
  licenses: License[];
  onIssueFor: (p: IssuePrefill) => void;
}) {
  const qc = useQueryClient();
  const listCompaniesFn = useServerFn(listCompanies);
  const setProduct = useServerFn(setCompanyProduct);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["mc-companies-entitlements"],
    queryFn: () => listCompaniesFn({ data: {} } as never) as Promise<CompanyRow[]>,
  });

  const productMut = useMutation({
    mutationFn: (v: { company_id: string; product_key: string; enabled: boolean }) =>
      setProduct({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(
        v.enabled ? "Product enabled — reissue the license to distribute it." : "Product disabled",
      );
      qc.invalidateQueries({ queryKey: ["mc-companies-entitlements"] });
      qc.invalidateQueries({ queryKey: ["mc-customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const licenseFor = (c: CompanyRow) => {
    const wanted = (c.install_id ?? slugify(c.name)).toLowerCase();
    return (
      licenses.find((l) => l.install_id.toLowerCase() === wanted) ??
      licenses.find((l) => l.company_name.trim().toLowerCase() === c.name.trim().toLowerCase()) ??
      null
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Loading customers…
      </div>
    );
  }
  if (companies.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">Customers &amp; entitlements</h2>
        <p className="text-xs text-muted-foreground">
          Company profile decides what is available. Enable products explicitly, then issue or
          reissue the license so the customer install receives them.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {companies.map((c) => {
          const profile = getCompanyProfile(c.business_type);
          const available = productsAvailableFor(c.business_type);
          const recommended = new Set<string>(productsRecommendedFor(c.business_type));
          const enabled = new Set<string>(c.enabled_products ?? []);
          const lic = licenseFor(c);
          return (
            <li key={c.id} className="space-y-3 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <Badge variant="outline">{profile.label}</Badge>
                    {lic ? (
                      lic.revoked ? (
                        <Badge variant="destructive">License revoked</Badge>
                      ) : (
                        <Badge>License active</Badge>
                      )
                    ) : (
                      <Badge variant="secondary">No license</Badge>
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.install_id ?? slugify(c.name)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={lic ? "outline" : "default"}
                  onClick={() =>
                    onIssueFor({
                      company_name: c.name,
                      install_id: (c.install_id ?? slugify(c.name)).toLowerCase(),
                      seats: c.max_users,
                    })
                  }
                >
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                  {lic ? "Reissue license" : "Issue license"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {available.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No products available for this profile.
                  </span>
                ) : (
                  available.map((key) => {
                    const p = getProduct(key);
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                      >
                        <Switch
                          checked={enabled.has(key)}
                          disabled={productMut.isPending}
                          onCheckedChange={(v) =>
                            productMut.mutate({
                              company_id: c.id,
                              product_key: key,
                              enabled: v,
                            })
                          }
                          aria-label={`${p?.label ?? key} for ${c.name}`}
                        />
                        <span className="text-foreground">{p?.label ?? key}</span>
                        {recommended.has(key) && (
                          <Badge variant="secondary" className="text-[10px]">
                            Recommended
                          </Badge>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
