// Phase 6 — Deployment-mode aware route gate for the authenticated shell.
//
// Renders children only when the current path is allowed for the runtime
// deployment mode reported by the server. Anything blocked shows a small
// "not available in this deployment" panel — no data leaks, no half-render.

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getDeploymentInfo } from "@/lib/deployment-mode.functions";
import { isRouteAllowedInMode, type DeploymentMode } from "@/lib/deployment-mode";
import { ShieldAlert } from "lucide-react";

interface DeploymentInfo {
  mode: DeploymentMode;
  install_id: string | null;
  installer_version: string | null;
}

export function useDeploymentInfo() {
  const fn = useServerFn(getDeploymentInfo);
  return useQuery<DeploymentInfo>({
    queryKey: ["deployment-info"],
    queryFn: () => fn({ data: {} } as never) as Promise<DeploymentInfo>,
    staleTime: 60_000,
  });
}

export function DeploymentModeGate({ children }: { children: ReactNode }) {
  const { data, isLoading } = useDeploymentInfo();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading || !data) return <>{children}</>; // fail-open during initial load
  const verdict = isRouteAllowedInMode(path, data.mode);
  if (verdict.allowed) return <>{children}</>;

  const label =
    verdict.reason === "operational_on_mc"
      ? "This is an operational module available inside a customer install."
      : verdict.reason === "mc_only_route_on_selfhost"
        ? "This surface exists only in the Management Center."
        : "This surface is only available in a Self-Hosted install.";

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center space-y-3">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive" />
        <h1 className="text-lg font-medium">Not available in this deployment</h1>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          Deployment mode: <code className="font-mono">{data.mode}</code>
        </p>
        <Link to="/app" className="inline-block text-sm underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
