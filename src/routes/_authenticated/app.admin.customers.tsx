/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2, Save, Sparkles, FileText, Trash2, History, Plus, Wand2, Languages, FileDown, Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCustomerProfile, upsertCustomerProfile,
  listCustomerDocuments, getCustomerDocument,
  generateCustomerDocument, generateCustomerPackage, generateAllStandardDocuments,
  regenerateCustomerDocument, downloadCustomerDocumentsZip,
  updateCustomerDocument, deleteCustomerDocument, deleteAllCustomerDocuments, exportCustomerDocument,
  restoreCustomerDocumentVersion,
} from "@/lib/customers.functions";
import { TEMPLATE_LIST, DOC_CATEGORIES, DOC_STATUSES } from "@/lib/customer-templates";

export const Route = createFileRoute("/_authenticated/app/admin/customers")({
  beforeLoad: ({ context }: any) => {
    const a = context?.auth;
    // Internal OPSQAI tool: Platform Owner + Platform Super Admin only.
    if (a && !(a.isPlatformAdmin || a.isPlatformOwner)) {
      throw redirect({ to: "/app" });
    }
  },
  component: CustomersPage,
});

type CompanyRow = { id: string; name: string };

function CustomersPage() {
  const { isPlatformAdmin, isPlatformOwner } = useAuth();
  const allowed = isPlatformAdmin || isPlatformOwner;
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [companyId, setCompanyId] = useState<string>("");

  useEffect(() => {
    supabase.from("companies").select("id, name").order("name").then(({ data }) => {
      setCompanies(data ?? []);
      setCompanyId((prev) => prev || (data?.[0]?.id ?? ""));
    });
  }, []);

  if (!allowed) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card><CardContent className="p-6">This module is restricted to Platform Owner and Platform Super Admin.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Documents</h1>
          <p className="text-muted-foreground">
            Internal OPSQAI workspace · Platform Owner &amp; Platform Super Admin only · Generate premium customer-facing enterprise deliverables.
          </p>
        </div>
        <div className="flex items-center gap-2 min-w-[280px]">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(companyId) ? (
        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><ProfileTab companyId={companyId} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab companyId={companyId} /></TabsContent>
        </Tabs>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No customers yet.</CardContent></Card>
      )}
    </div>
  );
}

// ----------------- Profile Tab (full enterprise customer record) -----------------

const PLAN_OPTIONS: Array<[string, string]> = [
  ["pilot", "Pilot"], ["standard", "Standard"], ["business", "Business"], ["enterprise", "Enterprise"],
];
const PLAN_CAPACITY: Record<string, string> = {
  pilot: "Up to 25 users",
  standard: "Up to 100 users",
  business: "Up to 500 users",
  enterprise: "Unlimited users",
};
const STATUS_OPTIONS: Array<[string, string]> = [
  ["prospect", "Prospect"], ["pilot", "Pilot"], ["active", "Active"],
  ["at_risk", "At risk"], ["renewing", "Renewing"], ["churned", "Churned"],
];

const COMPANY_FIELDS: Array<[string, string, string?]> = [
  ["legalName", "Legal Name"],
  ["registrationNumber", "Registration Number"],
  ["vatNumber", "VAT Number"],
  ["industry", "Industry", "e.g. Logistics, Retail, Manufacturing"],
  ["warehouseType", "Warehouse Type", "e.g. Distribution, Fulfilment, Cold-chain"],
  ["employees", "Number of Employees"],
  ["purchasedLicenses", "Purchased Licenses"],
  ["website", "Website"],
  ["logoUrl", "Logo URL"],
  ["address", "Address"],
  ["country", "Country"],
  ["countries", "Operating Countries"],
  ["languages", "Languages"],
];
const CONTACT_FIELDS: Array<[string, string]> = [
  ["primaryContact", "Primary Contact"],
  ["technicalContact", "Technical Contact"],
  ["billingContact", "Billing Contact"],
  ["supportContact", "Support Contact"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["accountManager", "OPSQAI Account Manager"],
];

function ProfileTab({ companyId }: { companyId: string }) {
  const get = useServerFn(getCustomerProfile);
  const save = useServerFn(upsertCustomerProfile);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-profile", companyId],
    queryFn: () => get({ data: { company_id: companyId } }),
  });

  const [general, setGeneral] = useState<Record<string, string>>({});
  const [commercial, setCommercial] = useState<Record<string, string>>({});
  const [branding, setBranding] = useState<Record<string, string>>({});
  const [implementation, setImplementation] = useState<Record<string, string>>({});
  const [contractStatus, setContractStatus] = useState("prospect");
  const [renewalDate, setRenewalDate] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (data && !hydrated) {
    const p: any = data.profile ?? {};
    setGeneral(p.general ?? {});
    setCommercial(p.commercial ?? {});
    setBranding(p.branding ?? {});
    setImplementation(p.implementation ?? {});
    setContractStatus(p.contract_status ?? "prospect");
    setRenewalDate(p.renewal_date ?? "");
    setHydrated(true);
  }

  const mut = useMutation({
    mutationFn: (vars: any) => save({ data: vars }),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["customer-profile", companyId] });
      qc.invalidateQueries({ queryKey: ["customer-docs", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground p-4">Loading profile…</p>;

  const subscriptionPlan = (commercial.subscriptionPlan ?? "standard").toLowerCase();
  const capacity = PLAN_CAPACITY[subscriptionPlan] ?? PLAN_CAPACITY.standard;

  const TextField = ({ k, label, placeholder, store, setStore }: {
    k: string; label: string; placeholder?: string;
    store: Record<string, string>; setStore: (v: Record<string, string>) => void;
  }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        placeholder={placeholder}
        value={store[k] ?? ""}
        onChange={(e) => setStore({ ...store, [k]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
          <CardDescription>Core customer identity. Used in every generated document.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMPANY_FIELDS.map(([k, label, ph]) =>
            <TextField key={k} k={k} label={label} placeholder={ph} store={general} setStore={setGeneral} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Stakeholders involved in the engagement.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTACT_FIELDS.map(([k, label]) =>
            <TextField key={k} k={k} label={label} store={general} setStore={setGeneral} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription &amp; Commercial</CardTitle>
          <CardDescription>Subscription drives customer size; commercial fields feed proposals, SOW and quotation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Subscription Plan</Label>
              <Select
                value={subscriptionPlan}
                onValueChange={(v) => setCommercial({ ...commercial, subscriptionPlan: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estimated User Capacity</Label>
              <div className="rounded-md border px-3 py-2 text-sm font-medium">{capacity}</div>
            </div>
            <TextField k="aiCredits" label="Additional AI Credits" store={commercial} setStore={setCommercial} />
            <TextField k="extraStorage" label="Extra Storage" store={commercial} setStore={setCommercial} />
            <TextField k="billingFrequency" label="Billing Frequency" store={commercial} setStore={setCommercial} />
            <TextField k="billingInfo" label="Billing Information" store={commercial} setStore={setCommercial} />
            <TextField k="discounts" label="Discounts" store={commercial} setStore={setCommercial} />
            <TextField k="contractStartDate" label="Contract Start Date" store={commercial} setStore={setCommercial} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Renewal Date</Label>
              <Input type="date" value={renewalDate ?? ""} onChange={(e) => setRenewalDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Customer Status</Label>
              <Select value={contractStatus} onValueChange={setContractStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Customer branding used in generated marketing-style documents.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField k="primaryColor" label="Brand Primary Color" placeholder="#0F172A" store={branding} setStore={setBranding} />
          <TextField k="accentColor" label="Brand Accent Color" placeholder="#2563EB" store={branding} setStore={setBranding} />
          <TextField k="preferredLanguage" label="Preferred Language" placeholder="DE / EN / RO" store={general} setStore={setGeneral} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Customer Notes</Label>
            <Textarea rows={4} value={general.customerNotes ?? ""}
              onChange={(e) => setGeneral({ ...general, customerNotes: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Implementation Notes</Label>
            <Textarea rows={4} value={implementation.notes ?? ""}
              onChange={(e) => setImplementation({ ...implementation, notes: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate({
          company_id: companyId,
          general,
          commercial,
          branding,
          implementation,
          contract_status: contractStatus,
          renewal_date: renewalDate || null,
        })} disabled={mut.isPending}>
          <Save className="h-4 w-4 mr-2" />Save Profile
        </Button>
      </div>
    </div>
  );
}

// ----------------- Documents Tab (Enterprise Delivery Center) -----------------

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  ready: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  sent: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  archived: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function DocumentsTab({ companyId }: { companyId: string }) {
  const list = useServerFn(listCustomerDocuments);
  const generate = useServerFn(generateCustomerDocument);
  const generatePkg = useServerFn(generateCustomerPackage);
  const generateAll = useServerFn(generateAllStandardDocuments);
  const regenerate = useServerFn(regenerateCustomerDocument);
  const downloadZip = useServerFn(downloadCustomerDocumentsZip);
  const remove = useServerFn(deleteCustomerDocument);
  const removeAll = useServerFn(deleteAllCustomerDocuments);
  const exporter = useServerFn(exportCustomerDocument);
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tpl, setTpl] = useState<string>(TEMPLATE_LIST[0].key);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: docs } = useQuery({
    queryKey: ["customer-docs", companyId],
    queryFn: () => list({ data: { company_id: companyId } }),
  });

  const gen = useMutation({
    mutationFn: () => generate({ data: { company_id: companyId, template: tpl } }),
    onSuccess: (r) => {
      toast.success("Document generated");
      qc.invalidateQueries({ queryKey: ["customer-docs", companyId] });
      setOpenId(r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const genPkg = useMutation({
    mutationFn: () => generatePkg({ data: { company_id: companyId } }),
    onSuccess: (r: any) => {
      toast.success(`Customer package generated · ${r.count} documents`);
      qc.invalidateQueries({ queryKey: ["customer-docs", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const genStd = useMutation({
    mutationFn: () => generateAll({ data: { company_id: companyId } }),
    onSuccess: (r: any) => {
      toast.success(`Generated ${r.count} plan documents (${r.plan})`);
      qc.invalidateQueries({ queryKey: ["customer-docs", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const regen = useMutation({
    mutationFn: (id: string) => regenerate({ data: { id } }),
    onSuccess: () => { toast.success("Regenerated"); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delAll = useMutation({
    mutationFn: () => removeAll({ data: { company_id: companyId } }),
    onSuccess: (r: any) => { toast.success(`Deleted ${r.deleted ?? 0} documents`); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const exportMut = useMutation({
    mutationFn: (vars: { id: string; format: "docx"|"pdf"|"md"|"html" }) => exporter({ data: vars }),
    onSuccess: (r: any) => {
      try {
        const bin = atob(r.base64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: r.mime });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href; a.download = r.filename || "document";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 5_000);
      } catch { window.open(r.url, "_blank"); }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const zipMut = useMutation({
    mutationFn: (vars: { category?: string }) => downloadZip({ data: { company_id: companyId, ...(vars.category ? { category: vars.category } : {}) } }),
    onSuccess: (r: any) => {
      try {
        const bin = atob(r.base64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: r.mime });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href; a.download = r.filename || "documents.zip";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 5_000);
        toast.success(`Downloaded ${r.count} documents`);
      } catch (e) { toast.error((e as Error).message); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Filter + group by category.
  const filtered = (docs ?? []).filter((d: any) =>
    (catFilter === "all" || (d.category ?? "Generated") === catFilter) &&
    (statusFilter === "all" || d.status === statusFilter),
  );
  const grouped = useMemo(() => filtered.reduce<Record<string, any[]>>((acc, d: any) => {
    const cat = d.category ?? "Generated";
    (acc[cat] ||= []).push(d);
    return acc;
  }, {}), [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of (docs ?? []) as any[]) {
      const k = d.category ?? "Generated";
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [docs]);

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Generate</CardTitle>
          <CardDescription>
            "Generate Customer Package" runs the full enterprise document set for this customer. Individual templates can be added one at a time.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Button onClick={() => genPkg.mutate()} disabled={genPkg.isPending} size="lg">
            <Package className="h-4 w-4 mr-2" />
            {genPkg.isPending ? "Generating customer package…" : "Generate Customer Package"}
          </Button>
          <Button variant="secondary" onClick={() => genStd.mutate()} disabled={genStd.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />Generate Plan-Standard Set
          </Button>
          <div className="h-8 w-px bg-border mx-1" />
          <div className="min-w-[260px]">
            <Label className="text-xs">Single template</Label>
            <Select value={tpl} onValueChange={setTpl}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_LIST.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label} <span className="text-xs text-muted-foreground">· {t.category}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending} variant="outline">
            <Plus className="h-4 w-4 mr-2" />Generate
          </Button>
          <Button variant="ghost" onClick={() => zipMut.mutate({})} disabled={zipMut.isPending || !docs?.length}>
            <FileDown className="h-4 w-4 mr-2" />Download All (.zip)
          </Button>
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => {
              const n = docs?.length ?? 0;
              if (!n) return;
              if (confirm(`Delete ALL ${n} generated documents for this customer? This cannot be undone.`)) {
                delAll.mutate();
              }
            }}
            disabled={delAll.isPending || !docs?.length}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {delAll.isPending ? "Deleting…" : "Delete All"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Delivery Library</CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c} {counts[c] ? `(${counts[c]})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {DOC_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filtered.length ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No documents match the current filters.</p>
          ) : (
            <div className="space-y-6">
              {Object.keys(grouped).sort().map((cat) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {cat}
                      <Badge variant="outline" className="text-[10px]">{grouped[cat].length}</Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => zipMut.mutate({ category: cat })} disabled={zipMut.isPending}>
                      <FileDown className="h-3.5 w-3.5 mr-1" />Download Folder
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {grouped[cat].map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/30">
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />{d.title}
                            <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${STATUS_BADGE[d.status] ?? STATUS_BADGE.draft}`}>{d.status}</span>
                            {d.needs_update && <span className="text-[10px] uppercase tracking-wide rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5">Needs Update</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">v{d.version} · {new Date(d.updated_at).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => setOpenId(d.id)}>Edit</Button>
                          {d.needs_update && (
                            <Button size="sm" variant="secondary" onClick={() => regen.mutate(d.id)} disabled={regen.isPending}>
                              <Sparkles className="h-3.5 w-3.5 mr-1" />Regenerate
                            </Button>
                          )}
                          {(["docx","pdf","md","html"] as const).map((fmt) => (
                            <Button key={fmt} size="sm" variant="ghost" onClick={() => exportMut.mutate({ id: d.id, format: fmt })} disabled={exportMut.isPending}>
                              <FileDown className="h-3.5 w-3.5 mr-1" />{fmt.toUpperCase()}
                            </Button>
                          ))}
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete document?")) del.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {openId && <DocumentEditor docId={openId} companyId={companyId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ----------------- Document Editor + AI Writing Assistant -----------------

function DocumentEditor({ docId, companyId, onClose }: { docId: string; companyId: string; onClose: () => void }) {
  const get = useServerFn(getCustomerDocument);
  const update = useServerFn(updateCustomerDocument);
  const restore = useServerFn(restoreCustomerDocumentVersion);
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["customer-doc", docId],
    queryFn: () => get({ data: { id: docId } }),
  });
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState("draft");
  const [category, setCategory] = useState("Generated");
  const [hydrated, setHydrated] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  if (data?.doc && !hydrated) {
    setTitle(data.doc.title);
    setMarkdown(data.doc.markdown);
    setStatus(data.doc.status);
    setCategory((data.doc as any).category ?? "Generated");
    setHydrated(true);
  }

  const save = useMutation({
    mutationFn: () => update({ data: { id: docId, title, markdown, status: status as any, category: category as any } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function runAi(action: string, opts: { useFull?: boolean; targetLanguage?: string; brief?: string } = {}) {
    setAiBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("No session");
      const ta = document.getElementById("doc-editor-textarea") as HTMLTextAreaElement | null;
      const selStart = ta?.selectionStart ?? 0;
      const selEnd = ta?.selectionEnd ?? 0;
      const selected = !opts.useFull && ta && selEnd > selStart ? markdown.slice(selStart, selEnd) : markdown;
      const res = await fetch("/api/customer-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action, company_id: companyId,
          text: selected, brief: opts.brief,
          target_language: opts.targetLanguage,
        }),
      });
      if (!res.ok) throw new Error(`Writer failed (${res.status})`);
      const json = await res.json() as { markdown?: string };
      const out = json.markdown ?? "";
      if (action === "generate") {
        setMarkdown(markdown + (markdown.endsWith("\n") ? "" : "\n\n") + out);
      } else if (selected !== markdown && ta) {
        setMarkdown(markdown.slice(0, selStart) + out + markdown.slice(selEnd));
      } else {
        setMarkdown(out);
      }
      toast.success("AI updated the document");
    } catch (e) { toast.error((e as Error).message); }
    finally { setAiBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>v{data?.doc?.version ?? "—"} · Auto-versioned on save</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px] gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              id="doc-editor-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={28}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wand2 className="h-4 w-4" />AI Writing Assistant</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">Select text to transform; otherwise the whole document is used.</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    ["generate", "Generate"],
                    ["rewrite", "Rewrite"],
                    ["simplify", "Simplify"],
                    ["technical", "More Technical"],
                    ["executive", "Executive"],
                    ["automotive", "Automotive"],
                    ["healthcare", "Healthcare"],
                    ["manufacturing", "Manufacturing"],
                    ["retail", "Retail"],
                    ["format", "Improve Format"],
                  ].map(([a, label]) => (
                    <Button key={a} size="sm" variant="outline" disabled={aiBusy}
                      onClick={() => {
                        if (a === "generate") {
                          const brief = prompt("Brief for the AI:");
                          if (brief) runAi("generate", { brief });
                        } else runAi(a);
                      }}>{label}</Button>
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <Label className="text-xs flex items-center gap-1"><Languages className="h-3 w-3" />Translate to</Label>
                  <div className="flex gap-1 mt-1">
                    <Input id="lang-input" placeholder="e.g. German" className="h-8" />
                    <Button size="sm" disabled={aiBusy} onClick={() => {
                      const v = (document.getElementById("lang-input") as HTMLInputElement)?.value;
                      if (v) runAi("translate", { targetLanguage: v });
                    }}>Go</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" />Versions</CardTitle></CardHeader>
              <CardContent>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShowVersions(!showVersions)}>
                  {showVersions ? "Hide" : "Show"} version history
                </Button>
                {showVersions && (
                  <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                    {(data?.versions ?? []).map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between text-xs gap-2 border rounded px-2 py-1">
                        <span>v{v.version} · {new Date(v.created_at).toLocaleString()}</span>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!confirm(`Restore v${v.version}?`)) return;
                          await restore({ data: { document_id: docId, version_id: v.id } });
                          refetch(); setHydrated(false); toast.success("Restored");
                        }}>Restore</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4 mr-2" />Save Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
