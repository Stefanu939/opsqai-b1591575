// React hook that gates UI on the active platform capabilities + edition.
//
// Usage:
//   const caps = usePlatformCapabilities();
//   if (caps.has(Capability.SMTP)) { ... }
//   if (caps.atLeast(Edition.Professional)) { ... }
//
// Backed by TanStack Query so a single fetch is shared across the tree.
// Falls back to an empty capability set while loading — feature-gated UI
// stays hidden until we know it's safe to show, never flashing then
// disappearing.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Capability,
  Edition,
  getPlatformCapabilities,
  type PlatformCapabilitiesDTO,
} from "@/lib/platform.functions";

const EDITION_RANK: Record<string, number> = {
  [Edition.Community]: 0,
  [Edition.Professional]: 1,
  [Edition.Enterprise]: 2,
};

export interface PlatformCapabilitiesView {
  loading: boolean;
  data: PlatformCapabilitiesDTO | null;
  has: (cap: Capability) => boolean;
  atLeast: (edition: Edition) => boolean;
  isSelfHosted: boolean;
  isCloud: boolean;
}

export function usePlatformCapabilities(): PlatformCapabilitiesView {
  const fn = useServerFn(getPlatformCapabilities);
  const { data, isLoading } = useQuery({
    queryKey: ["platform-capabilities"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return useMemo<PlatformCapabilitiesView>(() => {
    const caps = new Set(data?.capabilities ?? []);
    const editionRank = EDITION_RANK[data?.edition ?? Edition.Community] ?? 0;
    return {
      loading: isLoading,
      data: data ?? null,
      has: (cap) => caps.has(String(cap)),
      atLeast: (edition) => editionRank >= (EDITION_RANK[edition] ?? 0),
      isSelfHosted: data?.mode === "self-hosted",
      isCloud: data?.mode === "cloud",
    };
  }, [data, isLoading]);
}

/**
 * Renders `children` only when the required capability is active.
 * Use for tab entries, menu items, or CTA buttons that depend on a
 * server-side provider being wired.
 */
export function CapabilityGate({
  capability,
  fallback = null,
  children,
}: {
  capability: Capability;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const caps = usePlatformCapabilities();
  if (caps.loading) return null;
  return caps.has(capability) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders `children` only when the active license is at least the given
 * edition. Community always shows for `Edition.Community`.
 */
export function EditionGate({
  edition,
  fallback = null,
  children,
}: {
  edition: Edition;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const caps = usePlatformCapabilities();
  if (caps.loading) return null;
  return caps.atLeast(edition) ? <>{children}</> : <>{fallback}</>;
}

export { Capability, Edition };
