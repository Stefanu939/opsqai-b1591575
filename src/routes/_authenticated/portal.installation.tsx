import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ModulePage } from "@/components/app/module-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyInstallStatus } from "@/lib/install-history.functions";
import { downloadMyActivationBundle } from "@/lib/portal.functions";
import { getMyInstallationPackageDownloadUrl } from "@/lib/installation-package.functions";
import {
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  Inbox,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/installation")({
  component: PortalInstallation,
  head: () => ({
    meta: [
      { title: "Installation — OPSQAI Customer Portal" },
      {
        name: "description",
        content:
          "Step-by-step installation guide for OPSQAI Windows Self-Hosted: download the package, apply your activation key and verify the installation.",
      },
      { property: "og:title", content: "Installation — OPSQAI Customer Portal" },
      {
        property: "og:description",
        content:
          "Download the installation package, apply the activation key and verify your OPSQAI installation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Step({
  index,
  title,
  description,
  icon: Icon,
  children,
}: {
  index: number;
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-sm font-semibold tabular-nums">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">{title}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </Card>
  );
}

function PortalInstallation() {
  const status = useServerFn(getMyInstallStatus);
  const downloadPkg = useServerFn(getMyInstallationPackageDownloadUrl);
  const downloadBundle = useServerFn(downloadMyActivationBundle);

  const { data, isLoading } = useQuery({
    queryKey: ["my-install-status"],
    queryFn: () => status({ data: {} } as never),
    retry: false,
  });

  async function onPackage(install_id: string) {
    try {
      const res = await downloadPkg({ data: { install_id } });
      window.open(res.signed_url, "_blank", "noopener");
      toast.success("Download link opened (valid for 24 hours)");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onKey(install_id: string) {
    try {
      const bundle = await downloadBundle({ data: { install_id } });
      const jwt = (bundle as { jwt?: string }).jwt;
      if (!jwt) throw new Error("Activation key missing");
      const url = URL.createObjectURL(new Blob([jwt], { type: "application/jwt" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `opsqai-activation-${install_id}.jwt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Activation key downloaded");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const installs = data?.installs ?? [];

  return (
    <ModulePage
      eyebrow="Customer portal"
      title="Installation"
      description="Everything needed to install and verify OPSQAI Windows Self-Hosted: the package to download, the activation key to apply and how to confirm the installation is healthy."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your installation…</p>
      ) : installs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No installation linked to your account"
          description="Installation details appear once OPSQAI links an installation to your email."
        />
      ) : (
        <div className="space-y-6">
          {installs.map((inst) => (
            <section key={inst.install_id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-sm">{inst.install_id}</div>
                  {inst.company_name ? (
                    <div className="text-xs text-muted-foreground">{inst.company_name}</div>
                  ) : null}
                </div>
                {inst.behind ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Update available: v{inst.latest_version}
                  </Badge>
                ) : inst.current_version ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Up to date (v{inst.current_version})
                  </Badge>
                ) : (
                  <Badge variant="outline">Not reported yet</Badge>
                )}
              </div>

              <Step
                index={1}
                icon={FileArchive}
                title="Download the installation package"
                description="A signed download link valid for 24 hours. Run the installer on the Windows machine that will host OPSQAI."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={() => onPackage(inst.install_id)}>
                    <FileArchive className="mr-1 h-4 w-4" /> Download package
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {inst.last_download_at
                      ? `Last downloaded ${formatDistanceToNow(new Date(inst.last_download_at), { addSuffix: true })}`
                      : "Not downloaded yet"}
                  </span>
                </div>
              </Step>

              <Step
                index={2}
                icon={KeyRound}
                title="Apply your activation key"
                description="The activation key is a signed file (.jwt) issued for this installation only. In the installed app open License, choose Import activation file and select the downloaded key."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => onKey(inst.install_id)}>
                    <KeyRound className="mr-1 h-4 w-4" /> Download activation key
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Install ID: <code className="font-mono">{inst.install_id}</code>
                  </span>
                </div>
              </Step>

              <Step
                index={3}
                icon={ShieldCheck}
                title="Verify the installation"
                description="After activation the installation reports its version and status back to OPSQAI. All three checks below should be green."
              >
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    {inst.current_version ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    Version reported: {inst.current_version ?? "not yet"}
                    {inst.installer_version ? (
                      <span className="text-muted-foreground">
                        (installer {inst.installer_version})
                      </span>
                    ) : null}
                  </li>
                  <li className="flex items-center gap-2">
                    {inst.last_heartbeat_at ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    Connection check:{" "}
                    {inst.last_heartbeat_at
                      ? formatDistanceToNow(new Date(inst.last_heartbeat_at), { addSuffix: true })
                      : "no signal received yet"}
                  </li>
                  <li className="flex items-center gap-2">
                    {inst.license_status && inst.license_status !== "invalid" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    License status: {inst.license_status ?? "not reported"}
                  </li>
                </ul>
                {inst.behind ? (
                  <p className="mt-3 text-sm text-amber-600">
                    Version v{inst.latest_version} is available. Download the package again and run
                    it over the existing installation — your data and license stay in place.
                  </p>
                ) : null}
              </Step>
            </section>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
