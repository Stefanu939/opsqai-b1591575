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
  listCustomerDocuments, getCustomerDocument, generateCustomerDocument,
  generateAllStandardDocuments, regenerateCustomerDocument, downloadCustomerDocumentsZip,
  updateCustomerDocument, deleteCustomerDocument, exportCustomerDocument, restoreCustomerDocumentVersion,
} from "@/lib/customers.functions";
import { TEMPLATE_LIST } from "@/lib/customer-templates";

export const Route = createFileRoute("/_authenticated/app/admin/customers")({
  beforeLoad: ({ context }: any) => {
    const a = context?.auth;
    if (a && !(a.isPlatformAdmin || a.isPlatformOwner || a.isWorkspaceOwner)) {
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
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><ProfileTab companyId={companyId} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab companyId={companyId} /></TabsContent>
        </Tabs>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No customer workspaces yet.</CardContent></Card>
      )}
    </div>
  );
}

// ----------------- Profile Tab (simplified) -----------------

const COMPANY_FIELDS: Array<[string, string]> = [
  ["legalName", "Legal Name"],
  ["registrationNumber", "Registration Number"],
  ["vatNumber", "VAT Number"],
  ["address", "Address"],
  ["country", "Country"],
];
const CONTACT_FIELDS: Array<[string, string]> = [
  ["contactPerson", "Contact Person"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["website", "Website"],
];
const WORKSPACE_FIELDS: Array<[string, string]> = [
  ["workspaceName", "Workspace Name"],
  ["language", "Language"],
  ["timezone", "Timezone"],
];

const PLAN_OPTIONS: Array<[string, string]> = [
  ["pilot", "Pilot"], ["standard", "Standard"], ["business", "Business"], ["enterprise", "Enterprise"],
];

// Plan -> estimated user capacity (only customer-size hint; everything else is internal).
const PLAN_CAPACITY: Record<string, string> = {
  pilot: "Up to 25 users",
  standard: "Up to 100 users",
  business: "Up to 500 users",
  enterprise: "Unlimited users",
};

function ProfileTab({ companyId }: { companyId: string }) {
  const get = useServerFn(getCustomerProfile);
  const save = useServerFn(upsertCustomerProfile);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-profile", companyId],
    queryFn: () => get({ data: { company_id: companyId } }),
  });

  const [general, setGeneral] = useState<Record<string, string>>({});
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("standard");
  const [hydrated, setHydrated] = useState(false);

  if (data && !hydrated) {
    const p: any = data.profile ?? {};
    setGeneral(p.general ?? {});
    setSubscriptionPlan((p.commercial?.subscriptionPlan ?? "standard").toLowerCase());
    setHydrated(true);
  }

  const mut = useMutation({
    mutationFn: (vars: any) => save({ data: vars }),
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["customer-profile", companyId] }); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground p-4">Loading profile…</p>;

  const capacity = PLAN_CAPACITY[subscriptionPlan] ?? PLAN_CAPACITY.standard;

  const Field = ({ k, label }: { k: string; label: string }) => (
    <div>
      <Label>{label}</Label>
      <Input value={general[k] ?? ""} onChange={(e) => setGeneral({ ...general, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle>Company</CardTitle><CardDescription>Minimum information required for customer management and document generation.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMPANY_FIELDS.map(([k, label]) => <Field key={k} k={k} label={label} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTACT_FIELDS.map(([k, label]) => <Field key={k} k={k} label={label} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WORKSPACE_FIELDS.map(([k, label]) => <Field key={k} k={k} label={label} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Defines customer size and personalizes generated documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Subscription Plan</Label>
              <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated User Capacity</Label>
              <div className="rounded-md border px-3 py-2 text-sm font-medium">{capacity}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate({
          company_id: companyId,
          general,
          commercial: { subscriptionPlan },
        })} disabled={mut.isPending}>
          <Save className="h-4 w-4 mr-2" />Save Profile
        </Button>
      </div>
    </div>
  );
}



// ----------------- Documents Tab -----------------

function DocumentsTab({ companyId }: { companyId: string }) {
  const list = useServerFn(listCustomerDocuments);
  const generate = useServerFn(generateCustomerDocument);
  const generateAll = useServerFn(generateAllStandardDocuments);
  const regenerate = useServerFn(regenerateCustomerDocument);
  const downloadZip = useServerFn(downloadCustomerDocumentsZip);
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
  const genAll = useMutation({
    mutationFn: () => generateAll({ data: { company_id: companyId } }),
    onSuccess: (r: any) => { toast.success(`Generated ${r.count} documents for ${r.plan}`); qc.invalidateQueries({ queryKey: ["customer-docs", companyId] }); },
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
        a.href = href;
        a.download = r.filename || "document";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 5_000);
      } catch {
        window.open(r.url, "_blank");
      }
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
        a.href = href;
        a.download = r.filename || "documents.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 5_000);
        toast.success(`Downloaded ${r.count} documents`);
      } catch (e) { toast.error((e as Error).message); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Group documents into folders by category.
  const grouped = (docs ?? []).reduce<Record<string, any[]>>((acc, d: any) => {
    const cat = d.metadata?.category ?? "Custom Documents";
    (acc[cat] ||= []).push(d);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();

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
          <Button variant="secondary" onClick={() => genAll.mutate()} disabled={genAll.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />Generate All Standard Documents
          </Button>
          <Button variant="outline" onClick={() => zipMut.mutate({})} disabled={zipMut.isPending || !docs?.length}>
            <FileDown className="h-4 w-4 mr-2" />Download All (.zip)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer Documents</CardTitle></CardHeader>
        <CardContent>
          {!docs?.length ? (
            <p className="text-muted-foreground text-sm">No documents yet.</p>
          ) : (
            <div className="space-y-5">
              {categories.map((cat) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-muted-foreground">📁 {cat} <span className="text-xs font-normal">({grouped[cat].length})</span></div>
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
                            {d.needs_update && <span className="text-[10px] uppercase tracking-wide rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5">Needs Update</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">v{d.version} · {d.status} · {new Date(d.updated_at).toLocaleString()}</div>
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

