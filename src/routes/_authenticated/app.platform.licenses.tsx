import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listLicenses,
  issueLicense,
  revokeLicense,
  addModuleToLicense,
  getLicensePublicKey,
} from "@/lib/licenses.functions";
import { ADDON_MODULES, BASIC_MODULES } from "@/lib/license-modules";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Plus, ShieldOff, Copy, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/platform/licenses")({
  component: LicensesPage,
});

function LicensesPage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });
  const qc = useQueryClient();

  const list = useServerFn(listLicenses);
  const issue = useServerFn(issueLicense);
  const revoke = useServerFn(revokeLicense);
  const addModule = useServerFn(addModuleToLicense);
  const getPubKey = useServerFn(getLicensePublicKey);

  const { data: rows } = useQuery({ queryKey: ["licenses"], queryFn: () => list({ data: {} } as never) });
  const { data: pubKey } = useQuery({ queryKey: ["license-public-key"], queryFn: () => getPubKey({ data: {} } as never) });

  const [form, setForm] = useState({
    install_id: "",
    company_name: "",
    contact_email: "",
    max_users: 50,
    expires_at: "",
    hard_expiry: false,
    notes: "",
    addons: [] as string[],
  });

  const issueMut = useMutation({
    mutationFn: () => issue({
      data: {
        install_id: form.install_id.trim().toLowerCase(),
        company_name: form.company_name.trim(),
        contact_email: form.contact_email.trim() || undefined,
        tier: "basic",
        add_on_modules: form.addons,
        max_users: form.max_users,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        hard_expiry: form.hard_expiry,
        notes: form.notes || undefined,
      },
    }),
    onSuccess: (res: { token: string; install_id: string }) => {
      toast.success("License issued");
      navigator.clipboard?.writeText(res.token).catch(() => {});
      qc.invalidateQueries({ queryKey: ["licenses"] });
      setForm({ install_id: "", company_name: "", contact_email: "", max_users: 50, expires_at: "", hard_expiry: false, notes: "", addons: [] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (install_id: string) => revoke({ data: { install_id, reason: "revoked from admin panel" } }),
    onSuccess: () => { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["licenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addModuleMut = useMutation({
    mutationFn: ({ install_id, module_key }: { install_id: string; module_key: string }) =>
      addModule({ data: { install_id, module_key, unit_price_cents: 0 } }),
    onSuccess: (res: { token: string | null; already_included: boolean }) => {
      if (res.already_included) toast.info("Module already included");
      else {
        toast.success("Module added — new token copied to clipboard");
        if (res.token) navigator.clipboard?.writeText(res.token).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ["licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAddon = (key: string) =>
    setForm((f) => f.addons.includes(key) ? { ...f, addons: f.addons.filter((k) => k !== key) } : { ...f, addons: [...f.addons, key] });

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <KeyRound className="h-7 w-7" /> Licenses
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Issue and manage OPSQAI self-hosted licenses. Basic modules (Chat, KB, FAQ) are always included; add-on modules are sold per install.
        </p>
      </header>

      {pubKey && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-1 flex items-center gap-2">
            <Package className="h-4 w-4" /> Signing public key <Badge variant="outline">{pubKey.algorithm} · {pubKey.key_id}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Ship this PEM with every self-hosted build so clients can verify license tokens offline.
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
        <div className="text-sm font-medium">Issue new license</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="install_id (e.g. acme-prod-01)" value={form.install_id}
            onChange={(e) => setForm({ ...form, install_id: e.target.value })} />
          <Input placeholder="Company name" value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <Input type="email" placeholder="Contact email (optional)" value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <Input type="number" min={1} placeholder="Max users" value={form.max_users}
            onChange={(e) => setForm({ ...form, max_users: parseInt(e.target.value) || 50 })} />
          <Input type="date" placeholder="Expires at (optional)" value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.hard_expiry} onCheckedChange={(v) => setForm({ ...form, hard_expiry: v === true })} />
            Hard expiry (block app after expiration)
          </label>
        </div>
        <Textarea placeholder="Notes (internal)" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div>
          <div className="text-sm font-medium mb-2">Basic modules (included)</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {BASIC_MODULES.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}
          </div>
          <div className="text-sm font-medium mb-2">Add-on modules</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ADDON_MODULES.map((m) => (
              <label key={m.key} className="flex items-start gap-2 text-sm border rounded p-2 cursor-pointer">
                <Checkbox checked={form.addons.includes(m.key)} onCheckedChange={() => toggleAddon(m.key)} />
                <div className="flex-1">
                  <div className="font-medium">{m.label} <span className="text-xs text-muted-foreground">· {m.category}</span></div>
                  <div className="text-xs text-muted-foreground">{m.description}</div>
                  <div className="text-xs mt-1">Default price: €{(m.defaultPriceCents / 100).toFixed(0)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <Button onClick={() => issueMut.mutate()} disabled={!form.install_id || !form.company_name || issueMut.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Issue license & copy token
        </Button>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Install</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Modules</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Last heartbeat</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="px-4 py-3 font-mono text-xs">{l.install_id}</td>
                <td className="px-4 py-3">{l.company_name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(l.modules as string[]).map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Add module…</summary>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ADDON_MODULES.filter((m) => !(l.modules as string[]).includes(m.key)).map((m) => (
                        <Button key={m.key} size="sm" variant="outline" className="h-6 text-[10px]"
                          disabled={addModuleMut.isPending}
                          onClick={() => addModuleMut.mutate({ install_id: l.install_id, module_key: m.key })}>
                          + {m.label}
                        </Button>
                      ))}
                    </div>
                  </details>
                </td>
                <td className="px-4 py-3">{l.install?.user_count ?? "—"} / {l.max_users}</td>
                <td className="px-4 py-3 text-xs">{l.install?.last_heartbeat_at ? new Date(l.install.last_heartbeat_at).toLocaleString() : "—"}</td>
                <td className="px-4 py-3">
                  {l.revoked ? <Badge variant="destructive">Revoked</Badge> : <Badge>Active</Badge>}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  {!l.revoked && (
                    <Button size="sm" variant="ghost" className="text-destructive"
                      onClick={() => { if (confirm(`Revoke ${l.install_id}?`)) revokeMut.mutate(l.install_id); }}>
                      <ShieldOff className="h-4 w-4 mr-1" /> Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows?.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No licenses yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
