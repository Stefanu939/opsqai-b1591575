import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  previewActivationToken,
  importActivationToken,
  importActivationBundle,
  importRevocationListFn,
} from "@/lib/license-activation.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, Upload, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/platform/license-activation")({
  component: LicenseActivationPage,
});

type PreviewOk = {
  ok: true;
  kind: "install" | "module";
  install_id: string;
  key_id: string;
  expires_at: number | null;
  maintenance_expires_at: number | null;
  customer?: string;
  seats?: number;
  module?: string;
};

function LicenseActivationPage() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });

  const previewFn = useServerFn(previewActivationToken);
  const importFn = useServerFn(importActivationToken);
  const importBundleFn = useServerFn(importActivationBundle);
  const importCrlFn = useServerFn(importRevocationListFn);

  const [token, setToken] = useState("");
  const [expectedInstallId, setExpectedInstallId] = useState("");
  const [preview, setPreview] = useState<PreviewOk | null>(null);
  const [bundleJson, setBundleJson] = useState("");
  const [crlToken, setCrlToken] = useState("");

  const previewMut = useMutation({
    mutationFn: () =>
      previewFn({
        data: {
          token: token.trim(),
          expected_install_id: expectedInstallId.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        setPreview(res as PreviewOk);
        toast.success("Token is valid — review and import");
      } else {
        setPreview(null);
        toast.error(`Rejected: ${res.reason}`);
      }
    },
    onError: (e: Error) => { setPreview(null); toast.error(e.message); },
  });

  const importMut = useMutation({
    mutationFn: () =>
      importFn({
        data: {
          token: token.trim(),
          expected_install_id: expectedInstallId.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("License activated");
      setToken(""); setPreview(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bundleMut = useMutation({
    mutationFn: () => importBundleFn({ data: { bundle_json: bundleJson.trim() } }),
    onSuccess: (res) => {
      const failed = res.modules.filter((m) => !m.ok);
      toast.success(
        `Bundle imported — install OK, ${res.modules.length - failed.length}/${res.modules.length} modules${failed.length ? ` (failed: ${failed.map((m) => m.module_key).join(", ")})` : ""}`,
      );
      setBundleJson("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const crlMut = useMutation({
    mutationFn: () => importCrlFn({ data: { token: crlToken.trim() } }),
    onSuccess: (res) => {
      toast.success(`CRL applied — ${res.applied}/${res.entries} entries matched local rows`);
      setCrlToken("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-7 w-7" /> Add License
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a signed license token issued by your OPSQAI Management Center. Tokens are verified locally
          with the pinned public key — no network call to the vendor is required.
        </p>
      </header>

      <Card className="p-4 space-y-4">
        <div className="text-sm font-medium flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Single token
        </div>
        <Input
          placeholder="Expected install_id (optional — recommended)"
          value={expectedInstallId}
          onChange={(e) => setExpectedInstallId(e.target.value)}
        />
        <Textarea
          rows={6}
          placeholder="Paste license token (opsqai.v1.…)"
          value={token}
          onChange={(e) => { setToken(e.target.value); setPreview(null); }}
          className="font-mono text-xs"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => previewMut.mutate()} disabled={!token || previewMut.isPending}>
            Verify
          </Button>
          <Button onClick={() => importMut.mutate()} disabled={!token || importMut.isPending}>
            <Upload className="h-4 w-4 mr-1" /> Import & activate
          </Button>
        </div>

        {preview && (
          <div className="rounded border p-3 bg-muted/30 text-sm space-y-1">
            <div><Badge variant="outline">{preview.kind}</Badge> <span className="font-mono text-xs">{preview.install_id}</span></div>
            {preview.customer && <div>Customer: {preview.customer}</div>}
            {typeof preview.seats === "number" && <div>Seats: {preview.seats}</div>}
            {preview.module && <div>Module: <code>{preview.module}</code></div>}
            <div className="text-xs text-muted-foreground">
              Signed by <code>{preview.key_id}</code> · expires{" "}
              {preview.expires_at ? new Date(preview.expires_at * 1000).toLocaleDateString() : "never"}
              {preview.maintenance_expires_at
                ? ` · maintenance until ${new Date(preview.maintenance_expires_at * 1000).toLocaleDateString()}`
                : ""}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Activation bundle (Installation + all modules + revocation list)</div>
        <Textarea
          rows={6}
          placeholder='Paste bundle JSON exported from Management Center (starts with { "bundle_version": 1, … })'
          value={bundleJson}
          onChange={(e) => setBundleJson(e.target.value)}
          className="font-mono text-xs"
        />
        <Button onClick={() => bundleMut.mutate()} disabled={!bundleJson || bundleMut.isPending}>
          <Upload className="h-4 w-4 mr-1" /> Import bundle
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" /> Revocation list
        </div>
        <p className="text-xs text-muted-foreground">
          Apply a signed CRL to mark revoked/suspended licenses on this install. Only rows already present
          locally are updated — the CRL is not a substitute for a signed token.
        </p>
        <Textarea
          rows={4}
          placeholder="Paste CRL token (opsqai-crl.v1.…)"
          value={crlToken}
          onChange={(e) => setCrlToken(e.target.value)}
          className="font-mono text-xs"
        />
        <Button variant="outline" onClick={() => crlMut.mutate()} disabled={!crlToken || crlMut.isPending}>
          Apply CRL
        </Button>
      </Card>
    </div>
  );
}
