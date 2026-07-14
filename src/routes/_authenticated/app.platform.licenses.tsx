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
  transferOwnership,
} from "@/lib/licenses.functions";
import { exportActivationBundle, exportRevocationList } from "@/lib/license-activation.functions";
import { issueBootstrapToken } from "@/lib/dr.functions";
import { ADDON_MODULES, BASIC_MODULES, type ModuleKey } from "@/lib/license-modules";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  KeyRound,
  Plus,
  ShieldOff,
  Copy,
  Package,
  Eye,
  ArrowLeftRight,
  LifeBuoy,
  Download,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingPanel } from "@/components/platform/BillingPanel";

export const Route = createFileRoute("/_authenticated/app/platform/licenses")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab === "billing" || s.tab === "bundle" ? s.tab : "licenses") as
      | "licenses"
      | "bundle"
      | "billing",
    companyId: typeof s.companyId === "string" ? s.companyId : undefined,
    companyName: typeof s.companyName === "string" ? s.companyName : undefined,
  }),
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
  owner_type: "opsqai" | "customer";
  handed_over_at: string | null;
  modules: ModuleRow[];
  install: {
    user_count: number | null;
    last_heartbeat_at: string | null;
    app_version: string | null;
    installer_version: string | null;
  } | null;
}

function LicensesPage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });
  const qc = useQueryClient();
  const { tab, companyId, companyName } = Route.useSearch();
  const navigate = Route.useNavigate();

  const list = useServerFn(listLicenses);
  const issue = useServerFn(issueLicense);
  const revoke = useServerFn(revokeLicense);
  const issueModule = useServerFn(issueModuleLicense);
  const getPubKey = useServerFn(getLicensePublicKey);
  const fetchModuleToken = useServerFn(getModuleToken);
  const exportBundle = useServerFn(exportActivationBundle);
  const exportCrl = useServerFn(exportRevocationList);
  const transfer = useServerFn(transferOwnership);
  const issueDr = useServerFn(issueBootstrapToken);

  async function issueDrToken(install_id: string) {
    const reasonRaw = prompt(
      `Issue Bootstrap Recovery Token for ${install_id}. Reason (audit, no secrets):`,
      "",
    );
    if (reasonRaw === null) return;
    const ttlStr = prompt("TTL in hours (1–168, default 24):", "24");
    const ttl_hours = Math.max(1, Math.min(168, Number(ttlStr) || 24));
    try {
      const { token } = await issueDr({
        data: { install_id, ttl_hours, reason: reasonRaw || undefined },
      });
      await navigator.clipboard.writeText(token).catch(() => {});
      const blob = new Blob([token], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `opsqai-dr-token-${install_id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("DR token issued (copied + downloaded)");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const transferMut = useMutation({
    mutationFn: (v: { install_id: string; to: "opsqai" | "customer"; notes?: string }) =>
      transfer({ data: v }),
    onSuccess: (res: { install_id: string; owner_type: string; unchanged?: boolean }) => {
      toast.success(
        res.unchanged
          ? `Ownership unchanged (${res.owner_type})`
          : `Ownership → ${res.owner_type} for ${res.install_id}`,
      );
      qc.invalidateQueries({ queryKey: ["licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleTransfer(l: LicenseRow) {
    const to: "opsqai" | "customer" = l.owner_type === "customer" ? "opsqai" : "customer";
    const verb = to === "customer" ? "Hand over to customer" : "Revert ownership to OPSQAI";
    const notes =
      prompt(`${verb} for ${l.install_id}. Optional notes (no secrets):`, "") ?? undefined;
    if (!confirm(`${verb} for ${l.install_id}?`)) return;
    transferMut.mutate({ install_id: l.install_id, to, notes: notes || undefined });
  }

  async function downloadBundle(install_id: string) {
    try {
      const bundle = await exportBundle({ data: { install_id } });
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `opsqai-activation-${install_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Activation bundle downloaded");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function downloadCrl() {
    try {
      const res = await exportCrl({ data: {} } as never);
      await navigator.clipboard?.writeText(res.token);
      toast.success(`CRL copied — ${res.entries} entries, key ${res.key_id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const { data: rows } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => list({ data: {} } as never),
  });
  const { data: pubKey } = useQuery({
    queryKey: ["license-public-key"],
    queryFn: () => getPubKey({ data: {} } as never),
  });

  // Per-module issue dialog state
  const [moduleDialog, setModuleDialog] = useState<{
    install_id: string;
    module_key: ModuleKey;
    expires_at: string;
    maintenance_expires_at: string;
    unit_price_cents: number;
  } | null>(null);

  const [form, setForm] = useState({
    install_id: "",
    company_name: "",
    contact_email: "",
    seats: 50,
    expires_at: "",
    maintenance_expires_at: "",
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
          maintenance_expires_at: form.maintenance_expires_at
            ? new Date(form.maintenance_expires_at).toISOString()
            : null,
          notes: form.notes || undefined,
        },
      }),
    onSuccess: (res: { token: string }) => {
      toast.success("Installation License issued — token copied");
      navigator.clipboard?.writeText(res.token).catch(() => {});
      qc.invalidateQueries({ queryKey: ["licenses"] });
      setForm({
        install_id: "",
        company_name: "",
        contact_email: "",
        seats: 50,
        expires_at: "",
        maintenance_expires_at: "",
        notes: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (v: { install_id: string; kind: "install" | "module"; module_key?: string }) =>
      revoke({ data: { ...v, reason: "revoked from admin panel" } }),
    onSuccess: () => {
      toast.success("Revoked");
      qc.invalidateQueries({ queryKey: ["licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issueModuleMut = useMutation({
    mutationFn: (v: {
      install_id: string;
      module_key: string;
      expires_at?: string | null;
      maintenance_expires_at?: string | null;
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
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mc-eyebrow text-[var(--mc-fg-dim)]">Operations</p>
          <h1 className="mc-heading text-3xl font-semibold tracking-tight flex items-center gap-2 text-[var(--mc-fg)]">
            <KeyRound className="h-7 w-7 text-[var(--mc-gold)]" /> Licențe &amp; Billing
          </h1>
          <p className="text-sm text-[var(--mc-fg-muted)] mt-1">
            Emiterea licențelor, module add-on, bundle de activare — plus lifecycle-ul de subscription (trial, grace, suspend).
          </p>
        </div>
        <Button asChild className="shrink-0 gap-1.5 bg-gradient-to-b from-[#7c5cff] to-[#5b3fd9] text-[#0a0a1a] font-semibold shadow-[0_8px_24px_-8px_rgba(124,92,255,0.45)] hover:brightness-110">
          <Link to="/app/platform/onboarding">
            <Plus className="h-4 w-4" /> Onboard client nou
          </Link>
        </Button>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v as "licenses" | "billing" }, replace: true })}
      >
        <TabsList>
          <TabsTrigger value="licenses">Licențe</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="mt-6">
          <BillingPanel />
        </TabsContent>

        <TabsContent value="licenses" className="mt-6 space-y-6">



      {pubKey && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-1 flex items-center gap-2">
            <Package className="h-4 w-4" /> Signing public key{" "}
            <Badge variant="outline">
              {pubKey.algorithm} · {pubKey.key_id}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Ship this PEM with every Self-Hosted build so installs can verify license tokens
            offline.
          </p>
          <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
            {pubKey.public_key_pem}
          </pre>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(pubKey.public_key_pem);
                toast.success("Copied");
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copy PEM
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCrl}>
              <ShieldOff className="h-4 w-4 mr-1" /> Export revocation list
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="text-sm font-medium">Issue Installation License</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="install_id (e.g. acme-prod-01)"
            value={form.install_id}
            onChange={(e) => setForm({ ...form, install_id: e.target.value })}
          />
          <Input
            placeholder="Company name"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />
          <Input
            type="email"
            placeholder="Contact email (optional)"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
          <Input
            type="number"
            min={1}
            placeholder="Seats"
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value) || 50 })}
          />
          <Input
            type="date"
            placeholder="Expires at (optional)"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
          <Input
            type="date"
            placeholder="Maintenance expires at (optional)"
            value={form.maintenance_expires_at}
            onChange={(e) => setForm({ ...form, maintenance_expires_at: e.target.value })}
          />
          <p className="text-xs text-muted-foreground md:col-span-2">
            <strong>expires_at</strong> controls module availability (add-ons stop working after
            this date).
            <strong className="ml-2">maintenance_expires_at</strong> controls the updates &amp;
            support window.
          </p>
        </div>
        <Textarea
          placeholder="Notes (internal)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div>
          <div className="text-sm font-medium mb-2">Basic modules (always included)</div>
          <div className="flex flex-wrap gap-1">
            {BASIC_MODULES.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          onClick={() => issueMut.mutate()}
          disabled={!form.install_id || !form.company_name || issueMut.isPending}
        >
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
              <th className="px-4 py-3 font-medium">Versions</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((l) => {
              const licensedModuleKeys = new Set(
                l.modules.filter((m) => !m.revoked).map((m) => m.module_key),
              );
              return (
                <tr key={l.id} className="border-t align-top">
                  <td className="px-4 py-3 font-mono text-xs">{l.install_id}</td>
                  <td className="px-4 py-3">{l.company_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 max-w-xs">
                      {l.modules.map((m) => (
                        <div key={m.id} className="flex items-center gap-1 text-[10px]">
                          <Badge
                            variant={m.revoked ? "destructive" : "outline"}
                            className="text-[10px]"
                          >
                            {m.module_key}
                            {m.expires_at
                              ? ` · exp ${new Date(m.expires_at).toLocaleDateString()}`
                              : ""}
                            {m.revoked ? " · revoked" : ""}
                          </Badge>
                          {!m.revoked && m.module_key && (
                            <>
                              <button
                                type="button"
                                title="View / copy module token"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => viewModuleToken(l.install_id, m.module_key!)}
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                title="Revoke this module"
                                className="text-destructive/70 hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Revoke ${m.module_key} for ${l.install_id}?`))
                                    revokeMut.mutate({
                                      install_id: l.install_id,
                                      kind: "module",
                                      module_key: m.module_key!,
                                    });
                                }}
                              >
                                <ShieldOff className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                      {!l.modules.length && (
                        <span className="text-xs text-muted-foreground">Basic only</span>
                      )}
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        Add module licence…
                      </summary>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ADDON_MODULES.filter((m) => !licensedModuleKeys.has(m.key)).map((m) => (
                          <Button
                            key={m.key}
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px]"
                            onClick={() =>
                              setModuleDialog({
                                install_id: l.install_id,
                                module_key: m.key,
                                expires_at: "",
                                maintenance_expires_at: "",
                                unit_price_cents: 0,
                              })
                            }
                          >
                            + {m.label}
                          </Button>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-3">
                    {l.install?.user_count ?? "—"} / {l.seats ?? l.max_users}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <div>
                      Installer:{" "}
                      <span className="font-mono">{l.install?.installer_version ?? "—"}</span>
                    </div>
                    <div>
                      App: <span className="font-mono">{l.install?.app_version ?? "—"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {l.install?.last_heartbeat_at
                        ? new Date(l.install.last_heartbeat_at).toLocaleString()
                        : "no heartbeat"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <Badge variant={l.owner_type === "customer" ? "default" : "outline"}>
                      {l.owner_type === "customer" ? "Customer" : "OPSQAI"}
                    </Badge>
                    {l.handed_over_at && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        handed over {new Date(l.handed_over_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.revoked ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : l.suspended ? (
                      <Badge variant="outline">Suspended</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadBundle(l.install_id)}
                      title="Download offline activation bundle (JSON)"
                    >
                      <Package className="h-4 w-4 mr-1" /> Bundle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      title="Manage installation package (ZIP + Docker + activation bundle)"
                    >
                      <Link
                        to="/app/platform/installation-package/$installId"
                        params={{ installId: l.install_id }}
                      >
                        <Download className="h-4 w-4 mr-1" /> Package
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => issueDrToken(l.install_id)}
                      title="Issue Bootstrap Recovery Token (DR)"
                    >
                      <LifeBuoy className="h-4 w-4 mr-1" /> DR Token
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTransfer(l)}
                      title={
                        l.owner_type === "customer"
                          ? "Revert to OPSQAI ownership"
                          : "Hand over to customer"
                      }
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-1" />
                      {l.owner_type === "customer" ? "Revert" : "Hand over"}
                    </Button>
                    {!l.revoked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Revoke Installation License for ${l.install_id}?`))
                            revokeMut.mutate({ install_id: l.install_id, kind: "install" });
                        }}
                      >
                        <ShieldOff className="h-4 w-4 mr-1" /> Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!licenses.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No licenses yet.
                </td>
              </tr>
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
                <>
                  Signing a token for <span className="font-mono">{moduleDialog.module_key}</span>{" "}
                  on install <span className="font-mono">{moduleDialog.install_id}</span>. Leave
                  dates blank for a perpetual license.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {moduleDialog && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm space-y-1">
                <div>Expires at</div>
                <Input
                  type="date"
                  value={moduleDialog.expires_at}
                  onChange={(e) => setModuleDialog({ ...moduleDialog, expires_at: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <div>Maintenance expires at</div>
                <Input
                  type="date"
                  value={moduleDialog.maintenance_expires_at}
                  onChange={(e) =>
                    setModuleDialog({ ...moduleDialog, maintenance_expires_at: e.target.value })
                  }
                />
              </label>
              <label className="text-sm space-y-1 col-span-2">
                <div>Unit price (cents, informational)</div>
                <Input
                  type="number"
                  min={0}
                  value={moduleDialog.unit_price_cents}
                  onChange={(e) =>
                    setModuleDialog({
                      ...moduleDialog,
                      unit_price_cents: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={!moduleDialog || issueModuleMut.isPending}
              onClick={() => {
                if (!moduleDialog) return;
                issueModuleMut.mutate({
                  install_id: moduleDialog.install_id,
                  module_key: moduleDialog.module_key,
                  expires_at: moduleDialog.expires_at
                    ? new Date(moduleDialog.expires_at).toISOString()
                    : null,
                  maintenance_expires_at: moduleDialog.maintenance_expires_at
                    ? new Date(moduleDialog.maintenance_expires_at).toISOString()
                    : null,
                  unit_price_cents: moduleDialog.unit_price_cents,
                });
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Issue & copy token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

