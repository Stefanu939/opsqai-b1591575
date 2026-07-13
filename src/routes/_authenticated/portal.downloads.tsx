import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPortalOverview, downloadMyActivationBundle } from "@/lib/portal.functions";
import { getMyInstallationPackageDownloadUrl } from "@/lib/installation-package.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Package, FileArchive } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/downloads")({
  component: PortalDownloads,
});

function PortalDownloads() {
  const overview = useServerFn(getMyPortalOverview);
  const download = useServerFn(downloadMyActivationBundle);
  const downloadZip = useServerFn(getMyInstallationPackageDownloadUrl);
  const { data } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => overview({ data: {} } as never),
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

  async function downloadPackage(install_id: string) {
    try {
      const res = await downloadZip({ data: { install_id } });
      window.open(res.signed_url, "_blank", "noopener");
      toast.success("Download link opened (valid for 24 hours)");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Download className="h-7 w-7" /> Downloads
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Installation packages and offline activation bundles for the installations tied to your
          account. Package downloads issue a signed URL valid for 24 hours; every download is logged
          for audit.
        </p>
      </header>

      <div className="space-y-3">
        {(data?.installs ?? []).map((inst) => (
          <Card key={inst.install_id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-sm">{inst.install_id}</div>
              <div className="text-xs text-muted-foreground">{inst.company_name}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => downloadPackage(inst.install_id)}
                disabled={!inst.install_license || inst.install_license.revoked}
              >
                <FileArchive className="h-4 w-4 mr-1" /> Installation package
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadBundle(inst.install_id)}
                disabled={!inst.install_license || inst.install_license.revoked}
              >
                <Package className="h-4 w-4 mr-1" /> Activation bundle
              </Button>
            </div>
          </Card>
        ))}
        {!data?.installs.length ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">No installations tied to your account.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
