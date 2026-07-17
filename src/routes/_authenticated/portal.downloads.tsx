import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPortalOverview, downloadMyActivationBundle, downloadMyModuleLicense } from "@/lib/portal.functions";
import { getMyInstallationPackageDownloadUrl } from "@/lib/installation-package.functions";
import {
  listDownloadModulesPublic,
  signPortalStoragePath,
} from "@/lib/portal-admin.functions";

import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, FileArchive, Inbox, Download as DownloadIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/downloads")({
  component: PortalDownloads,
});

function PortalDownloads() {
  const overview = useServerFn(getMyPortalOverview);
  const download = useServerFn(downloadMyActivationBundle);
  const downloadModule = useServerFn(downloadMyModuleLicense);
  const downloadZip = useServerFn(getMyInstallationPackageDownloadUrl);
  const listModules = useServerFn(listDownloadModulesPublic);
  const signUrl = useServerFn(signPortalStoragePath);
  const { data } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => overview({ data: {} } as never),
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["portal-modules-public"],
    queryFn: () => listModules({ data: {} } as never),
  });

  async function downloadBundle(install_id: string) {
    try {
      const bundle = await download({ data: { install_id } });
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

  async function downloadModuleLic(install_id: string, module_key: string) {
    try {
      const bundle = await downloadModule({ data: { install_id, module_key } });
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `opsqai-module-${module_key}-${install_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`License for "${module_key}" downloaded`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function downloadPackage(install_id: string) {
    try {
      const res = await downloadZip({ data: { install_id } });
      window.open(res.signed_url, "_blank", "noopener");
      toast.success("Download link opened (valid for 24 hours)");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const installs = data?.installs ?? [];

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
          Customer portal
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
          Downloads
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Installation packages and offline activation bundles for the installations tied to your
          account. Package downloads issue a signed URL valid for 24 hours; every download is logged.
        </p>
      </div>

      {installs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No installations tied to your account"
          description="Downloads become available once an OPSQAI installation is linked to your email."
        />
      ) : (
        <div className="space-y-3">
          {installs.map((inst) => {
            const disabled = !inst.install_license || inst.install_license.revoked;
            return (
              <Card
                key={inst.install_id}
                className="p-4 flex items-center justify-between gap-4 flex-wrap hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-[var(--gold-soft)] border border-[var(--gold-line)] flex items-center justify-center shrink-0">
                    <FileArchive className="h-5 w-5 text-[color:var(--gold)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-sm truncate">{inst.install_id}</div>
                    <div className="text-xs text-muted-foreground">{inst.company_name}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => downloadPackage(inst.install_id)} disabled={disabled}>
                    <FileArchive className="h-4 w-4 mr-1" /> Installation package
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadBundle(inst.install_id)}
                    disabled={disabled}
                  >
                    <Package className="h-4 w-4 mr-1" /> Activation bundle
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modules.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span aria-hidden className="block w-1 h-6 rounded-full bg-[color:var(--gold)]" />
            <h2 className="text-lg font-display font-semibold">Extra modules</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {modules.map((m) => (
              <Card key={m.id} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{m.title}</span>
                    <Badge variant="outline">{m.category}</Badge>
                    {m.version && <Badge variant="outline">v{m.version}</Badge>}
                  </div>
                  {m.description && (
                    <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                  )}
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      try {
                        if (m.file_url.startsWith("portal-download-modules/")) {
                          const path = m.file_url.slice("portal-download-modules/".length);
                          const { url } = await signUrl({
                            data: { bucket: "portal-download-modules", path, expiresIn: 3600 },
                          });
                          window.open(url, "_blank", "noopener");
                        } else {
                          window.open(m.file_url, "_blank", "noopener");
                        }
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <DownloadIcon className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

