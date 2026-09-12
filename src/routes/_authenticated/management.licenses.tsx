import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listLicenses,
  issueLicense,
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
import { Check, ChevronsUpDown, KeyRound, Plus, Search, Trash2, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { listCompanies } from "@/lib/companies.functions";
import {
  getCompanyArchitecture,
  setCompanyCoreCapabilities,
  setCompanyProduct,
} from "@/lib/company-products.functions";
import {
  CORE_CAPABILITIES,
  INCLUDED_CAPABILITY_PARENT,
  ADDON_CATALOG,
  getCompanyProfile,
  getProduct,
  productsAvailableFor,
  productsRecommendedFor,
} from "@/lib/product-architecture";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
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
      description="Configure company Core functions and Products, then issue signed JWT licenses."
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
  const getArchitecture = useServerFn(getCompanyArchitecture);
  const saveCore = useServerFn(setCompanyCoreCapabilities);
  const setProduct = useServerFn(setCompanyProduct);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coreDraft, setCoreDraft] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["mc-companies-entitlements"],
    queryFn: () => listCompaniesFn({ data: {} } as never) as Promise<CompanyRow[]>,
  });
  const activeId = selectedId ?? companies[0]?.id ?? null;
  const { data: architecture, isLoading: architectureLoading } = useQuery({
    queryKey: ["mc-company-architecture", activeId],
    enabled: Boolean(activeId),
    queryFn: () => getArchitecture({ data: { company_id: activeId as string } }),
  });
  useEffect(() => {
    if (!architecture) return;
    setCoreDraft(new Set(architecture.enabled_core_capabilities));
    setDirty(false);
  }, [architecture]);

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
  const coreMut = useMutation({
    mutationFn: () => saveCore({ data: { company_id: activeId as string, capability_keys: [...coreDraft] } }),
    onSuccess: () => {
      setDirty(false);
      toast.success("Core configuration saved — reissue the JWT license to distribute it.");
      qc.invalidateQueries({ queryKey: ["mc-company-architecture", activeId] });
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

  const selectedCompany = companies.find((c) => c.id === activeId) ?? companies[0];
  if (!selectedCompany) return null;
  const lic = licenseFor(selectedCompany);
  const available = productsAvailableFor(selectedCompany.business_type);
  const recommended = new Set(productsRecommendedFor(selectedCompany.business_type));
  const enabledProducts = new Set(selectedCompany.enabled_products ?? []);
  const areas = [...new Set(CORE_CAPABILITIES.map((capability) => capability.area))];

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Customer license configuration</h2>
        <p className="text-xs text-muted-foreground">Core functions are enabled by default. Included functions follow their parent automatically.</p>
      </div>
      <div className="grid min-h-[520px] md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/20 p-2 md:border-b-0 md:border-r">
          {companies.map((company) => {
            const companyLicense = licenseFor(company);
            return (
              <button
                key={company.id}
                type="button"
                onClick={() => setSelectedId(company.id)}
                className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors", activeId === company.id ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{company.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{company.install_id ?? slugify(company.name)}</span>
                </span>
                <span className={cn("h-2 w-2 rounded-full", companyLicense && !companyLicense.revoked ? "bg-success" : "bg-muted-foreground/40")} />
              </button>
            );
          })}
        </aside>
        <div className="min-w-0 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{selectedCompany.name}</h3>
                <Badge variant="outline">{getCompanyProfile(selectedCompany.business_type).label}</Badge>
                <Badge variant={lic?.revoked ? "destructive" : lic ? "default" : "secondary"}>{lic?.revoked ? "License revoked" : lic ? "License active" : "No license"}</Badge>
                {dirty && <Badge variant="secondary">Pending license reissue</Badge>}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedCompany.install_id ?? slugify(selectedCompany.name)}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={coreMut.isPending} onClick={async () => { if (dirty) await coreMut.mutateAsync(); onIssueFor({ company_name: selectedCompany.name, install_id: (selectedCompany.install_id ?? slugify(selectedCompany.name)).toLowerCase(), seats: selectedCompany.max_users }); }}>
                <KeyRound className="mr-1.5 h-3.5 w-3.5" />{coreMut.isPending ? "Saving…" : lic ? "Save & reissue JWT" : "Save & issue JWT"}
              </Button>
            </div>
          </div>

          {architectureLoading ? <p className="py-8 text-sm text-muted-foreground">Loading configuration…</p> : (
            <div className="space-y-6 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h4 className="text-sm font-semibold">Core functions</h4><p className="text-xs text-muted-foreground">Company-wide availability; personal rights still apply.</p></div>
                <Button size="sm" variant="ghost" onClick={() => { setCoreDraft(new Set(CORE_CAPABILITIES.map((item) => item.key))); setDirty(true); }}>Enable all Core</Button>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {areas.map((area) => (
                  <div key={area} className="rounded-md border border-border p-3">
                    <h5 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{area}</h5>
                    <div className="divide-y divide-border">
                      {CORE_CAPABILITIES.filter((item) => item.area === area).map((item) => (
                        <label key={item.key} className="flex items-start gap-3 py-2.5">
                          <Switch checked={coreDraft.has(item.key)} onCheckedChange={(value) => { setCoreDraft((current) => { const next = new Set(current); value ? next.add(item.key) : next.delete(item.key); return next; }); setDirty(true); }} aria-label={`${item.label} for ${selectedCompany.name}`} />
                          <span className="min-w-0"><span className="block text-sm font-medium text-foreground">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-semibold">OPSQAI Products</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {available.map((key) => {
                    const product = getProduct(key);
                    return <label key={key} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"><Switch checked={enabledProducts.has(key)} disabled={productMut.isPending} onCheckedChange={(value) => productMut.mutate({ company_id: selectedCompany.id, product_key: key, enabled: value })} /><span>{product?.label ?? key}</span>{recommended.has(key) && <Badge variant="secondary">Recommended</Badge>}</label>;
                  })}
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold">Included automatically</h4></div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ADDON_CATALOG.filter((item) => coreDraft.has(INCLUDED_CAPABILITY_PARENT[item.key])).map((item) => <Badge key={item.key} variant="secondary">{item.label} · included</Badge>)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">No separate activation or license is required for these functions.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
