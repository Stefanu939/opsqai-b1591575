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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2, Save, Sparkles, FileText, Download, Trash2, History, Plus, Wand2, Languages, RefreshCw, FileDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCustomerProfile, upsertCustomerProfile,
  listCustomerFeatures, upsertCustomerFeature,
  listCustomerCompliance, upsertCustomerCompliance,
  listCustomerSecurity, upsertCustomerSecurity,
  customerHealth, listCustomerTimeline,
  listCustomerDocuments, getCustomerDocument, generateCustomerDocument,
  updateCustomerDocument, deleteCustomerDocument, exportCustomerDocument, restoreCustomerDocumentVersion,
} from "@/lib/customers.functions";
import { TEMPLATE_LIST } from "@/lib/customer-templates";

export const Route = createFileRoute("/_authenticated/app/admin/customers")({
  beforeLoad: ({ context }: any) => {
    const a = context?.auth;
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
        <Card><CardContent className="p-6">This module is restricted to Platform Admins.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Workspace Manager</h1>
          <p className="text-muted-foreground">Internal OPSQAI module · Platform Owner & Platform Admin only</p>
        </div>
        <div className="flex items-center gap-2 min-w-[280px]">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select customer workspace" /></SelectTrigger>
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
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="config">AI · SLA · Branding</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><ProfileTab companyId={companyId} /></TabsContent>
          <TabsContent value="features"><FeaturesTab companyId={companyId} /></TabsContent>
          <TabsContent value="compliance"><ComplianceTab companyId={companyId} /></TabsContent>
          <TabsContent value="security"><SecurityTab companyId={companyId} /></TabsContent>
          <TabsContent value="config"><ConfigTab companyId={companyId} /></TabsContent>
          <TabsContent value="health"><HealthTab companyId={companyId} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab companyId={companyId} /></TabsContent>
          <TabsContent value="timeline"><TimelineTab companyId={companyId} /></TabsContent>
        </Tabs>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No customer workspaces yet.</CardContent></Card>
      )}
    </div>
  );
}

// ----------------- Profile Tab -----------------

const GENERAL_FIELDS: Array<[string, string]> = [
  ["legalName", "Legal Name"], ["address", "Address"], ["country", "Country"], ["industry", "Industry"],
  ["website", "Website"], ["employees", "Number of Employees"], ["warehouses", "Number of Warehouses"],
  ["users", "Number of Users"], ["languages", "Languages"], ["timezone", "Timezone"],
  ["primaryContact", "Primary Contact"], ["technicalContact", "Technical Contact"], ["accountManager", "Account Manager"],
];

const COMMERCIAL_FIELDS: Array<[string, string]> = [
  ["subscriptionPlan", "Subscription"], ["seats", "Seats"], ["aiCredits", "Additional AI Credits"],
  ["extraStorage", "Extra Storage"], ["discounts", "Discounts"], ["billingFrequency", "Billing Frequency"],
];

const IMPLEMENTATION_FIELDS: Array<[string, string]> = [
  ["pilot", "Pilot"], ["production", "Production"], ["goLive", "Go-Live"], ["hypercare", "Hypercare"],
  ["trainingStatus", "Training Status"], ["onboardingStatus", "Onboarding Status"],
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
  const [implementation, setImplementation] = useState<Record<string, string>>({});
  const [contractStatus, setContractStatus] = useState("prospect");
  const [renewalDate, setRenewalDate] = useState("");
  const [onboardingPct, setOnboardingPct] = useState(0);
  const [commercialNotes, setCommercialNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (data && !hydrated) {
    const p: any = data.profile ?? {};
    setGeneral(p.general ?? {});
    setCommercial({ ...(p.commercial ?? {}) });
    setCommercialNotes(p.commercial?.notes ?? "");
    setImplementation(p.implementation ?? {});
    setContractStatus(p.contract_status ?? "prospect");
    setRenewalDate(p.renewal_date ?? "");
    setOnboardingPct(p.onboarding_pct ?? 0);
    setHydrated(true);
  }

  const mut = useMutation({
    mutationFn: (vars: any) => save({ data: vars }),
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["customer-profile", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground p-4">Loading profile…</p>;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle>General Information</CardTitle><CardDescription>Customer master data — reused across all generated documents.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GENERAL_FIELDS.map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input value={general[k] ?? ""} onChange={(e) => setGeneral({ ...general, [k]: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commercial</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMMERCIAL_FIELDS.map(([k, label]) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input value={commercial[k] ?? ""} onChange={(e) => setCommercial({ ...commercial, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <Label>Contract Status</Label>
              <Select value={contractStatus} onValueChange={setContractStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["prospect","pilot","active","renewal","paused","churned"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Renewal Date</Label>
              <Input type="date" value={renewalDate ?? ""} onChange={(e) => setRenewalDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Commercial Notes</Label>
            <Textarea rows={3} value={commercialNotes} onChange={(e) => setCommercialNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Implementation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {IMPLEMENTATION_FIELDS.map(([k, label]) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input value={implementation[k] ?? ""} onChange={(e) => setImplementation({ ...implementation, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <Label>Completion %</Label>
              <Input type="number" min={0} max={100} value={onboardingPct} onChange={(e) => setOnboardingPct(Number(e.target.value || 0))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate({
          company_id: companyId,
          contract_status: contractStatus,
          renewal_date: renewalDate || null,
          onboarding_pct: onboardingPct,
          general,
          commercial: { ...commercial, notes: commercialNotes },
          implementation,
        })} disabled={mut.isPending}>
          <Save className="h-4 w-4 mr-2" />Save Profile
        </Button>
      </div>
    </div>
  );
}

// ----------------- Features Tab -----------------

function FeaturesTab({ companyId }: { companyId: string }) {
  const list = useServerFn(listCustomerFeatures);
  const save = useServerFn(upsertCustomerFeature);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["customer-features", companyId],
    queryFn: () => list({ data: { company_id: companyId } }),
  });
  const mut = useMutation({
    mutationFn: (vars: any) => save({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-features", companyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const m: Record<string, typeof data> = {} as any;
    for (const f of data ?? []) (m[f.category] ||= [] as any).push(f);
    return m;
  }, [data]);

  return (
    <div className="space-y-4 mt-4">
      {Object.entries(grouped).map(([cat, rows]) => (
        <Card key={cat}>
          <CardHeader><CardTitle>{cat}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(rows ?? []).map((f: any) => (
              <div key={f.feature_key} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.feature_key}</div>
                </div>
                <Select
                  value={f.state}
                  onValueChange={(state) => mut.mutate({ company_id: companyId, feature_key: f.feature_key, state, notes: f.notes ?? null })}
                >
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["enabled","disabled","beta","enterprise","coming_soon"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ----------------- Compliance Tab -----------------

function ComplianceTab({ companyId }: { companyId: string }) {
  const list = useServerFn(listCustomerCompliance);
  const save = useServerFn(upsertCustomerCompliance);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["customer-compliance", companyId],
    queryFn: () => list({ data: { company_id: companyId } }),
  });
  const mut = useMutation({
    mutationFn: (vars: any) => save({ data: vars }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["customer-compliance", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {(data ?? []).map((row: any) => (
        <Card key={row.area}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              {row.area}
              <Badge variant={row.status === "met" || row.status === "exceeded" ? "default" : "secondary"}>{row.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={row.status} onValueChange={(v) => mut.mutate({ ...row, status: v, company_id: companyId })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["not_applicable","pending","in_progress","met","exceeded"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Evidence / link"
              defaultValue={row.evidence ?? ""}
              onBlur={(e) => e.target.value !== (row.evidence ?? "") && mut.mutate({ ...row, evidence: e.target.value, company_id: companyId })}
              rows={2}
            />
            <Input
              placeholder="Owner"
              defaultValue={row.owner ?? ""}
              onBlur={(e) => e.target.value !== (row.owner ?? "") && mut.mutate({ ...row, owner: e.target.value, company_id: companyId })}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ----------------- Security Tab -----------------

function SecurityTab({ companyId }: { companyId: string }) {
  const list = useServerFn(listCustomerSecurity);
  const save = useServerFn(upsertCustomerSecurity);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["customer-security", companyId],
    queryFn: () => list({ data: { company_id: companyId } }),
  });
  const mut = useMutation({
    mutationFn: (vars: any) => save({ data: vars }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["customer-security", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {(data ?? []).map((row: any) => (
        <Card key={row.area}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{row.area}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              placeholder="Summary"
              defaultValue={row.summary ?? ""}
              onBlur={(e) => e.target.value !== (row.summary ?? "") && mut.mutate({ company_id: companyId, area: row.area, summary: e.target.value, notes: row.notes })}
              rows={2}
            />
            <Textarea
              placeholder="Notes"
              defaultValue={row.notes ?? ""}
              onBlur={(e) => e.target.value !== (row.notes ?? "") && mut.mutate({ company_id: companyId, area: row.area, summary: row.summary, notes: e.target.value })}
              rows={2}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ----------------- Config Tab (AI / SLA / Branding) -----------------

const AI_FIELDS: Array<[string, string]> = [
  ["embeddingModel", "Embedding Model"], ["languageModel", "Language Model"],
  ["semanticSearch", "Semantic Search"], ["rag", "RAG"], ["citationEngine", "Citation Engine"],
  ["supportedLanguages", "Supported Languages"], ["chunkSize", "Chunk Size"],
  ["contextWindow", "Context Window"], ["aiCapabilities", "AI Capabilities"],
];
const SLA_FIELDS: Array<[string, string]> = [
  ["responseTime", "Response Time"], ["availability", "Availability"], ["supportHours", "Support Hours"],
  ["escalationLevels", "Escalation Levels"], ["maintenanceWindows", "Maintenance Windows"],
  ["rpo", "RPO"], ["rto", "RTO"], ["supportContacts", "Support Contacts"],
];
const BRAND_FIELDS: Array<[string, string]> = [
  ["logo", "Company Logo URL"], ["primaryColor", "Primary Brand Color"], ["accentColor", "Accent Color"],
  ["banner", "Banner URL"], ["workspaceBranding", "Workspace Branding"], ["emailBranding", "Email Branding"], ["domain", "Domain"],
];

function ConfigTab({ companyId }: { companyId: string }) {
  const get = useServerFn(getCustomerProfile);
  const save = useServerFn(upsertCustomerProfile);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-profile", companyId],
    queryFn: () => get({ data: { company_id: companyId } }),
  });

  const [ai, setAi] = useState<Record<string, string>>({});
  const [sla, setSla] = useState<Record<string, string>>({});
  const [brand, setBrand] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  if (data && !hydrated) {
    const p: any = data.profile ?? {};
    setAi(p.ai_config ?? {});
    setSla(p.sla ?? {});
    setBrand(p.branding ?? {});
    setHydrated(true);
  }

  const mut = useMutation({
    mutationFn: (vars: any) => save({ data: vars }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["customer-profile", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-4 text-muted-foreground">Loading…</p>;

  const FieldBlock = ({ title, fields, state, setState }: { title: string; fields: [string,string][]; state: Record<string,string>; setState: (s: Record<string,string>) => void }) => (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Input value={state[k] ?? ""} onChange={(e) => setState({ ...state, [k]: e.target.value })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 mt-4">
      <FieldBlock title="AI Configuration" fields={AI_FIELDS} state={ai} setState={setAi} />
      <FieldBlock title="SLA" fields={SLA_FIELDS} state={sla} setState={setSla} />
      <FieldBlock title="Branding" fields={BRAND_FIELDS} state={brand} setState={setBrand} />
      <div className="flex justify-end">
        <Button onClick={() => mut.mutate({ company_id: companyId, ai_config: ai, sla, branding: brand })} disabled={mut.isPending}>
          <Save className="h-4 w-4 mr-2" />Save Configuration
        </Button>
      </div>
    </div>
  );
}

// ----------------- Health Tab -----------------

function HealthTab({ companyId }: { companyId: string }) {
  const get = useServerFn(customerHealth);
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["customer-health", companyId],
    queryFn: () => get({ data: { company_id: companyId } }),
  });
  const h: any = data ?? {};
  const metric = (label: string, value: unknown, suffix = "") => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-3xl font-bold">{value !== undefined && value !== null ? String(value) : "—"}{suffix}</div></CardContent>
    </Card>
  );
  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metric("Workspace Health", h.workspaceHealth, "/100")}
        {metric("Knowledge Docs", h.knowledgeDocs)}
        {metric("Critical Docs", h.criticalDocs)}
        {metric("FAQs", h.faqs ?? h.faqUsage)}
        {metric("Monthly Active Users", h.mau ?? h.monthlyActiveUsers)}
        {metric("AI Adoption", h.aiAdoption, "%")}
        {metric("Search Success", h.searchSuccess, "%")}
        {metric("Training Progress", h.trainingProgress, "%")}
        {metric("Knowledge Gaps (open)", h.openGaps ?? h.knowledgeGapTrend)}
        {metric("Support Activity", h.supportActivity)}
      </div>
    </div>
  );
}

// ----------------- Documents Tab -----------------

function DocumentsTab({ companyId }: { companyId: string }) {
  const list = useServerFn(listCustomerDocuments);
  const generate = useServerFn(generateCustomerDocument);
  const remove = useServerFn(deleteCustomerDocument);
  const exporter = useServerFn(exportCustomerDocument);
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tpl, setTpl] = useState<string>(TEMPLATE_LIST[0].key);

  const { data: docs } = useQuery({
    queryKey: ["customer-docs", companyId],
    queryFn: () => list({ data: { company_id: companyId } }),
  });
  const gen = useMutation({
    mutationFn: () => generate({ data: { company_id: companyId, template: tpl } }),
    onSuccess: (r) => { toast.success("Document generated"); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); setOpenId(r.id); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const exportMut = useMutation({
    mutationFn: (vars: { id: string; format: "docx"|"pdf"|"md"|"html" }) => exporter({ data: vars }),
    onSuccess: (r) => { window.open(r.url, "_blank"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Generate New Document</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px]">
            <Label>Template</Label>
            <Select value={tpl} onValueChange={setTpl}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_LIST.map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.label} <span className="text-xs text-muted-foreground">· {t.category}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
            <Plus className="h-4 w-4 mr-2" />Generate from Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer Documents</CardTitle></CardHeader>
        <CardContent>
          {!docs?.length ? (
            <p className="text-muted-foreground text-sm">No documents yet.</p>
          ) : (
            <div className="space-y-2">
              {docs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/30">
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />{d.title}
                    </div>
                    <div className="text-xs text-muted-foreground">v{d.version} · {d.status} · {new Date(d.updated_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setOpenId(d.id)}>Edit</Button>
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
  const [hydrated, setHydrated] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  if (data?.doc && !hydrated) {
    setTitle(data.doc.title);
    setMarkdown(data.doc.markdown);
    setStatus(data.doc.status);
    setHydrated(true);
  }

  const save = useMutation({
    mutationFn: () => update({ data: { id: docId, title, markdown, status: status as any } }),
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
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","review","approved","sent","archived"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
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

// ----------------- Timeline Tab -----------------

function TimelineTab({ companyId }: { companyId: string }) {
  const list = useServerFn(listCustomerTimeline);
  const { data } = useQuery({
    queryKey: ["customer-timeline", companyId],
    queryFn: () => list({ data: { company_id: companyId } }),
  });
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Customer Timeline</CardTitle></CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-muted-foreground text-sm">No events yet.</p>
        ) : (
          <ol className="relative border-l ml-2 space-y-4">
            {data.map((e: any) => (
              <li key={e.id} className="pl-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                <div className="text-sm font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.event_type} · {new Date(e.occurred_at).toLocaleString()}</div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
