// Sidebar provenance line — proves which frontend build is running.
//
// Reads the record from /api/public/health (public, unauthenticated) so the
// value shown in the installed Self-Hosted UI is the one the server actually
// loaded from build-provenance.json, not just the embedded env vars.

import { useQuery } from "@tanstack/react-query";

import { formatBuildLabel, getEmbeddedBuildInfo, type BuildProvenance } from "@/lib/build-info";

async function fetchBuildProvenance(): Promise<BuildProvenance> {
  const res = await fetch("/api/public/health", { headers: { accept: "application/json" } });
  const body = (await res.json()) as { build?: BuildProvenance };
  return body.build ?? { ...getEmbeddedBuildInfo(), buildHash: null };
}

export function BuildProvenanceLine() {
  const { data } = useQuery({
    queryKey: ["build-provenance"],
    queryFn: fetchBuildProvenance,
    staleTime: Infinity,
    retry: false,
  });
  const record: Partial<BuildProvenance> = data ?? getEmbeddedBuildInfo();
  return (
    <div
      className="px-3 py-1 text-[10px] text-sidebar-foreground/50"
      title={`version ${record.version} · commit ${record.commit} · buildHash ${record.buildHash ?? "unrecorded"}`}
    >
      Build: <span className="font-mono">{formatBuildLabel(record)}</span>
    </div>
  );
}
