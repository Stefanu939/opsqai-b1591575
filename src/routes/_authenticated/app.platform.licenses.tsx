import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listLicenses,
  issueLicense,
  revokeLicense,
  issueModuleLicense,
  getLicensePublicKey,
  getModuleToken,
} from "@/lib/licenses.functions";
import { ADDON_MODULES, BASIC_MODULES, type ModuleKey } from "@/lib/license-modules";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { KeyRound, Plus, ShieldOff, Copy, Package, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/platform/licenses")({
  component: LicensesPage,
});

interface ModuleRow {
  id: string;
  module_key: string | null;
  signed_token?: string | null;
  expires_at: string | null;
  revoked: boolean;
  suspended: boolean;
}

interface LicenseRow {
  id: string;
  install_id: string;
  company_name: string;
  seats: number | null;
  max_users: number;
  expires_at: string | null;
  maintenance_expires_at: string | null;
  revoked: boolean;
  suspended: boolean;
  modules: ModuleRow[];
  install: { user_count: number | null; last_heartbeat_at: string | null } | null;
}

function LicensesPage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });
  const qc = useQueryClient();

  const list = useServerFn(listLicenses);
  const issue = useServerFn(issueLicense);
  const revoke = useServerFn(revokeLicense);
  const issueModule = useServerFn(issueModuleLicense);
  const getPubKey = useServerFn(getLicensePublicKey);
  const fetchModuleToken = useServerFn(getModuleToken);

  const { data: rows } = useQuery({ queryKey: ["licenses"], queryFn: () => list({ data: {} } as never) });
  const { data: pubKey } = useQuery({ queryKey: ["license-public-key"], queryFn: () => getPubKey({ data: {} } as never) });

  // Per-module issue dialog state
  const [moduleDialog, setModuleDialog] = useState<{
    install_id: string;
    module_key: ModuleKey;
    expires_at: string;
    maintenance_expires_at: string;
    hard_expiry: boolean;
    unit_price_cents: number;
  } | null>(null);

  const [form, setForm] = useState({
    install_id: "",
    company_name: "",
    contact_email: "",
    seats: 50,
    expires_at: "",
    maintenance_expires_at: "",
    hard_expiry: false,
    notes: "",
  });

  const issueMut = useMutation({
    mutationFn: () =>
      issue({
        data: {
          install_id: form.install_id.trim().toLowerCase(),
          company_name: form.company_name.trim(),
          contact_email: form.contact_email.trim() || undefined,
          tier: "basic",
          seats: form.seats,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          maintenance_expires_at: form.maintenance_expires_at ? new Date(form.maintenance_expires_at).toISOString() : null,
          hard_expiry: form.hard_expiry,
          notes: form.notes || undefined,
        },
      }),
    onSuccess: (res: { token: string }) => {
      toast.success("Installation License issued — token copied");
      navigator.clipboard?.writeText(res.token).catch(() => {});
      qc.invalidateQueries({ queryKey: ["licenses"] });
      setForm({ install_id: "", company_name: "", contact_email: "", seats: 50, expires_at: "", maintenance_expires_at: "", hard_expiry: false, notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (v: { install_id: string; kind: "install" | "module"; module_key?: string }) =>
      revoke({ data: { ...v, reason: "revoked from admin panel" } }),
    onSuccess: () => { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["licenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const issueModuleMut = useMutation({
    mutationFn: (v: {
      install_id: string;
      module_key: string;
      expires_at?: string | null;
      maintenance_expires_at?: string | null;
      hard_expiry?: boolean;
      unit_price_cents?: number;
    }) => issueModule({ data: { unit_price_cents: 0, ...v } }),
    onSuccess: (res: { token: string; module_key: string }) => {
      toast.success(`Module License issued (${res.module_key}) — token copied`);
      if (res.token) navigator.clipboard?.writeText(res.token).catch(() => {});
      qc.invalidateQueries({ queryKey: ["licenses"] });
      setModuleDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function viewModuleToken(install_id: string, module_key: string) {
    try {
      const row = await fetchModuleToken({ data: { install_id, module_key } });
      if (row?.signed_token) {
        await navigator.clipboard?.writeText(row.signed_token);
        toast.success(`Token for ${module_key} copied to clipboard`);
      } else {
        toast.error("Token not available");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const licenses = (rows ?? []) as LicenseRow[];

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <KeyRound className="h-7 w-7" /> Licenses
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Two license kinds: one <strong>Installation License</strong> per install (mandatory, carries seats + maintenance),
          and one <strong>Module License</strong> per paid add-on module. Basic modules are always included.
        </p>
      </header>

      {pubKey && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-1 flex items-center gap-2">
            <Package className="h-4 w-4" /> Signing public key <Badge variant="outline">{pubKey.algorithm} · {pubKey.key_id}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Ship this PEM with every Self-Hosted build so installs can verify license tokens offline.
          </p>
          <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">{pubKey.public_key_pem}</pre>
          <Button
            variant="outline" size="sm" className="mt-2"
            onClick={() => { navigator.clipboard?.writeText(pubKey.public_key_pem); toast.success("Copied"); }}
          >
            <Copy className="h-4 w-4 mr-1" /> Copy PEM
          </Button>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="text-sm font-medium">Issue Installation License</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="install_id (e.g. acme-prod-01)" value={form.install_id}
            onChange={(e) => setForm({ ...form, install_id: e.target.value })} />
          <Input placeholder="Company name" value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <Input type="email" placeholder="Contact email (optional)" value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <Input type="number" min={1} placeholder="Seats" value={form.seats}
            onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value) || 50 })} />
          <Input type="date" placeholder="Expires at (optional)" value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <Input type="date" placeholder="Maintenance expires at (optional)" value={form.maintenance_expires_at}
            onChange={(e) => setForm({ ...form, maintenance_expires_at: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.hard_expiry} onCheckedChange={(v) => setForm({ ...form, hard_expiry: v === true })} />
            Hard expiry (block app after expiration)
          </label>
        </div>
        <Textarea placeholder="Notes (internal)" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div>
          <div className="text-sm font-medium mb-2">Basic modules (always included)</div>
          <div className="flex flex-wrap gap-1">
            {BASIC_MODULES.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}
          </div>
        </div>
        <Button onClick={() => issueMut.mutate()} disabled={!form.install_id || !form.company_name || issueMut.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Issue Installation License & copy token
        </Button>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Install</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Module Licenses</th>
              <th className="px-4 py-3 font-medium">Seats</th>
              <th className="px-4 py-3 font-medium">Last heartbeat</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((l) => {
              const licensedModuleKeys = new Set(l.modules.filter((m) => !m.revoked).map((m) => m.module_key));
              return (
                <tr key={l.id} className="border-t align-top">
                  <td className="px-4 py-3 font-mono text-xs">{l.install_id}</td>
                  <td className="px-4 py-3">{l.company_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 max-w-xs">
                      {l.modules.map((m) => (
                        <div key={m.id} className="flex items-center gap-1 text-[10px]">
                          <Badge variant={m.revoked ? "destructive" : "outline"} className="text-[10px]">
                            {m.module_key}
                            {m.expires_at ? ` · exp ${new Date(m.expires_at).toLocaleDateString()}` : ""}
                            {m.revoked ? " · revoked" : ""}
                          </Badge>
                          {!m.revoked && m.module_key && (
                            <>
                              <button
                                type="button"
                                title="View / copy module token"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => viewModuleToken(l.install_id, m.module_key!)}>
                                <Eye className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                title="Revoke this module"
                                className="text-destructive/70 hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Revoke ${m.module_key} for ${l.install_id}?`))
                                    revokeMut.mutate({ install_id: l.install_id, kind: "module", module_key: m.module_key! });
                                }}>
                                <ShieldOff className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                      {!l.modules.length && <span className="text-xs text-muted-foreground">Basic only</span>}
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Add module licence…</summary>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ADDON_MODULES.filter((m) => !licensedModuleKeys.has(m.key)).map((m) => (
                          <Button key={m.key} size="sm" variant="outline" className="h-6 text-[10px]"
                            onClick={() => setModuleDialog({
                              install_id: l.install_id,
                              module_key: m.key,
                              expires_at: "",
                              maintenance_expires_at: "",
                              hard_expiry: false,
                              unit_price_cents: 0,
                            })}>
                            + {m.label}
                          </Button>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-3">{l.install?.user_count ?? "—"} / {l.seats ?? l.max_users}</td>
                  <td className="px-4 py-3 text-xs">{l.install?.last_heartbeat_at ? new Date(l.install.last_heartbeat_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3">
                    {l.revoked ? <Badge variant="destructive">Revoked</Badge> : l.suspended ? <Badge variant="outline">Suspended</Badge> : <Badge>Active</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {!l.revoked && (
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => { if (confirm(`Revoke Installation License for ${l.install_id}?`)) revokeMut.mutate({ install_id: l.install_id, kind: "install" }); }}>
                        <ShieldOff className="h-4 w-4 mr-1" /> Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!licenses.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No licenses yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!moduleDialog} onOpenChange={(open) => !open && setModuleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Module License</DialogTitle>
            <DialogDescription>
              {moduleDialog && (
                <>Signing a token for <span className="font-mono">{moduleDialog.module_key}</span> on install{" "}
                <span className="font-mono">{moduleDialog.install_id}</span>. Leave dates blank for a perpetual license.</>
              )}
            </DialogDescription>
          </DialogHeader>
          {moduleDialog && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm space-y-1">
                <div>Expires at</div>
                <Input type="date" value={moduleDialog.expires_at}
                  onChange={(e) => setModuleDialog({ ...moduleDialog, expires_at: e.target.value })} />
              </label>
              <label className="text-sm space-y-1">
                <div>Maintenance expires at</div>
                <Input type="date" value={moduleDialog.maintenance_expires_at}
                  onChange={(e) => setModuleDialog({ ...moduleDialog, maintenance_expires_at: e.target.value })} />
              </label>
              <label className="text-sm space-y-1 col-span-2">
                <div>Unit price (cents, informational)</div>
                <Input type="number" min={0} value={moduleDialog.unit_price_cents}
                  onChange={(e) => setModuleDialog({ ...moduleDialog, unit_price_cents: parseInt(e.target.value) || 0 })} />
              </label>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <Checkbox checked={moduleDialog.hard_expiry}
                  onCheckedChange={(v) => setModuleDialog({ ...moduleDialog, hard_expiry: v === true })} />
                Hard expiry (module blocked after expiration)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(null)}>Cancel</Button>
            <Button
              disabled={!moduleDialog || issueModuleMut.isPending}
              onClick={() => {
                if (!moduleDialog) return;
                issueModuleMut.mutate({
                  install_id: moduleDialog.install_id,
                  module_key: moduleDialog.module_key,
                  expires_at: moduleDialog.expires_at ? new Date(moduleDialog.expires_at).toISOString() : null,
                  maintenance_expires_at: moduleDialog.maintenance_expires_at
                    ? new Date(moduleDialog.maintenance_expires_at).toISOString()
                    : null,
                  hard_expiry: moduleDialog.hard_expiry,
                  unit_price_cents: moduleDialog.unit_price_cents,
                });
              }}>
              <Plus className="h-4 w-4 mr-1" /> Issue & copy token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
