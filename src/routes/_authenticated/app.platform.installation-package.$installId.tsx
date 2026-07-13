import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  generateInstallationPackage,
  getInstallationPackageDownloadUrl,
  getInstallationPackageStatus,
  setInstallerPin,
  setTechnicalContactEmail,
} from "@/lib/installation-package.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, AlertTriangle, Download, Package, RefreshCw, Rocket, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authenticated/app/platform/installation-package/$installId",
)({
  component: InstallationPackagePage,
});

function InstallationPackagePage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });

  const { installId } = Route.useParams();
  const qc = useQueryClient();

  const statusFn = useServerFn(getInstallationPackageStatus);
  const generateFn = useServerFn(generateInstallationPackage);
  const downloadUrlFn = useServerFn(getInstallationPackageDownloadUrl);
  const pinFn = useServerFn(setInstallerPin);
  const contactFn = useServerFn(setTechnicalContactEmail);

  const { data, isLoading } = useQuery({
    queryKey: ["installation-package", installId],
    queryFn: () => statusFn({ data: { install_id: installId } }),
  });

  const [pinValue, setPinValue] = useState<string>("");
  const [techEmail, setTechEmail] = useState<string>("");
  const [keepPrevious, setKeepPrevious] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const install = data?.install ?? null;
  const license = data?.license ?? null;
  const isRegeneration = (install?.package_generation_count ?? 0) > 0;

  // Prefill inputs once data lands
  if (license && pinValue === "" && license.pinned_installer_version) {
    setPinValue(license.pinned_installer_version);
  }
  if (license && techEmail === "" && (license.technical_contact_email || license.contact_email)) {
    setTechEmail(license.technical_contact_email ?? license.contact_email ?? "");
  }

  const generateMut = useMutation({
    mutationFn: () =>
      generateFn({
        data: {
          install_id: installId,
          installer_version: pinValue.trim() || undefined,
          keep_previous_bundle_valid: keepPrevious,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        isRegeneration
          ? `Package regenerated (v${res.installer_version}, gen ${res.generation_count})`
          : `Package generated (v${res.installer_version})`,
      );
      // Auto-open download
      window.open(res.signed_url, "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["installation-package", installId] });
      setConfirmOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadMut = useMutation({
    mutationFn: () => downloadUrlFn({ data: { install_id: installId } }),
    onSuccess: (res) => {
      window.open(res.signed_url, "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["installation-package", installId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pinMut = useMutation({
    mutationFn: () =>
      pinFn({
        data: {
          install_id: installId,
          pinned_installer_version: pinValue.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(pinValue.trim() ? `Pinned installer to ${pinValue.trim()}` : "Pin cleared");
      qc.invalidateQueries({ queryKey: ["installation-package", installId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contactMut = useMutation({
    mutationFn: () =>
      contactFn({
        data: {
          install_id: installId,
          technical_contact_email: techEmail.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Technical contact updated");
      qc.invalidateQueries({ queryKey: ["installation-package", installId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }
  if (!license) {
    return (
      <div className="p-6 space-y-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/platform/licenses">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to licenses
          </Link>
        </Button>
        <Card className="p-6 text-sm text-muted-foreground">
          No install-kind license found for <code className="font-mono">{installId}</code>.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-5xl">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/platform/licenses">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to licenses
          </Link>
        </Button>
      </div>

      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7" />
            Installation Package
          </h1>
          {install?.package_generated_at ? (
            <Badge variant="secondary">Generated · gen {install.package_generation_count}</Badge>
          ) : (
            <Badge variant="outline">Not generated yet</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {license.company_name} · <code className="font-mono">{installId}</code>
        </p>
      </header>

      {/* Identity */}
      <Card className="p-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Identity
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Install ID (deterministic)</div>
            <div className="font-mono flex items-center gap-2">
              {installId}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(installId);
                  toast.success("Copied");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Regeneration always produces the same Install ID for this order.
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Last generated</div>
            <div>
              {install?.package_generated_at
                ? new Date(install.package_generated_at).toLocaleString()
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {install?.package_installer_version
                ? `Installer version: ${install.package_installer_version} · SHA-256 ${install.package_checksum_sha256?.slice(0, 12) ?? "—"}…`
                : "Never generated."}
            </div>
          </div>
        </div>
      </Card>

      {/* Installer version pin */}
      <Card className="p-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Installer version
        </div>
        <p className="text-sm text-muted-foreground">
          Leave empty to always use the latest Stable channel release. Pin only when a customer has
          validated a specific installer topology (air-gap, custom Compose, etc.).
        </p>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="e.g. 1.0.0 (empty = latest Stable)"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            className="max-w-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => pinMut.mutate()}
            disabled={pinMut.isPending}
          >
            Save pin
          </Button>
        </div>
      </Card>

      {/* Technical contact */}
      <Card className="p-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Technical contact
        </div>
        <p className="text-sm text-muted-foreground">
          The technical contact receives an email with a 24-hour download link every time a package
          is generated or regenerated. Defaults to the license contact when unset.
        </p>
        <div className="flex gap-2 items-center">
          <Input
            type="email"
            placeholder="tech@customer.example"
            value={techEmail}
            onChange={(e) => setTechEmail(e.target.value)}
            className="max-w-md"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => contactMut.mutate()}
            disabled={contactMut.isPending}
          >
            Save contact
          </Button>
        </div>
      </Card>

      {/* Regeneration collision warning */}
      {isRegeneration && !keepPrevious && (
        <Alert
          variant="default"
          className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Regeneration will revoke the previous bundle</AlertTitle>
          <AlertDescription className="text-sm">
            If the customer is already running a restored installation using the previous license
            (e.g. from their own backup), it will lose access to paid modules on next reconnect.
            Check <em>Keep previous bundle valid</em> if you're unsure whether an older bundle might
            still be in active use.
          </AlertDescription>
        </Alert>
      )}

      {/* Generate + download actions */}
      <Card className="p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Actions
        </div>
        {isRegeneration && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={keepPrevious} onCheckedChange={(v) => setKeepPrevious(v === true)} />
            Keep previous bundle valid on regenerate (skip CRL revocation)
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {install?.package_generated_at ? (
            <Button onClick={() => setConfirmOpen(true)} disabled={generateMut.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {generateMut.isPending ? "Regenerating…" : "Regenerate package"}
            </Button>
          ) : (
            <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
              <Rocket className="h-4 w-4 mr-1" />
              {generateMut.isPending ? "Generating…" : "Generate package"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => downloadMut.mutate()}
            disabled={!install?.package_generated_at || downloadMut.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            Download (24h link)
          </Button>
        </div>
        {install?.previous_bundle_revoked_at && (
          <div className="text-xs text-muted-foreground">
            Previous bundle revoked at{" "}
            {new Date(install.previous_bundle_revoked_at).toLocaleString()}.
          </div>
        )}
      </Card>

      {/* Recent downloads */}
      <Card className="p-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recent downloads (last 10)
        </div>
        {(data?.recent_downloads ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">No downloads recorded yet.</div>
        ) : (
          <div className="text-sm divide-y">
            {(data?.recent_downloads ?? []).map((d) => (
              <div key={d.id} className="py-2 flex items-center justify-between gap-4">
                <div>
                  <div>{d.actor_email ?? "platform admin"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()} · {d.actor_role}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  link exp.{" "}
                  {d.signed_url_expires_at
                    ? new Date(d.signed_url_expires_at).toLocaleString()
                    : "—"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Regenerate confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate installation package?</DialogTitle>
            <DialogDescription>
              {keepPrevious
                ? "The new package will be issued and the previous bundle will REMAIN valid until its own expiry."
                : "This will revoke the previous bundle. If the customer is already running a restored installation using the previous license, it will lose access to paid modules on next reconnect."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
              {generateMut.isPending ? "Regenerating…" : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
