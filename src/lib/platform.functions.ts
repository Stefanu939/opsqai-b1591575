// Server function exposing the active platform capabilities and edition
// to the browser. Used by the UI capability-gating hook to decide which
// features to render (SSO tab, SMTP-dependent flows, offline banner...).
//
// The response is derived from the in-process capability registry that
// bootstrap-selfhost.server.ts / bootstrap-cloud.server.ts populated at
// startup; no direct provider access happens here.

import { createServerFn } from "@tanstack/react-start";
import {
  Capability,
  Edition,
  DeploymentType,
  getActiveEdition,
  getDeploymentType,
  getPlatformMode,
  listActiveCapabilities,
} from "@/lib/platform";

export type PlatformCapabilitiesDTO = {
  mode: string;
  deployment: string;
  edition: string;
  capabilities: string[];
};

export const getPlatformCapabilities = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformCapabilitiesDTO> => {
    return {
      mode: getPlatformMode(),
      deployment: getDeploymentType(),
      edition: getActiveEdition(),
      capabilities: listActiveCapabilities().map((c) => String(c)),
    };
  },
);

// Re-exports so callers of the hook get the same enum constants used at
// registration time.
export { Capability, Edition, DeploymentType };
