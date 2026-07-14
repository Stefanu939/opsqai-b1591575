import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Package, ExternalLink, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/updates")({
  head: () => ({ meta: [{ title: "Updates — OPSQAI" }] }),
  component: UpdatesPage,
});

interface Release {
  id: string;
  version: string;
  tag_name: string;
  zip_url: string;
  zip_size_bytes: number | null;
  exe_sha256: string | null;
  exe_size_bytes: number | null;
  is_active: boolean;
  published_at: string;
}

function fmtBytes(n: number | null | undefined) {
  if (!n) return "—";
  const mb = n / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}

function UpdatesPage() {
  const releases = useQuery({
    queryKey: ["installer-releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installer_releases")
        .select(
          "id, version, tag_name, zip_url, zip_size_bytes, exe_sha256, exe_size_bytes, is_active, published_at",
        )
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Release[];
    },
  });

  const rows = releases.data ?? [];
  const current = rows.find((r) => r.is_active) ?? rows[0];
  const installed = current?.version ?? "—";
  const available = current?.version ?? "—";

  return (
    <div className="p-6 md:p-10 max-w-5xl w-full mx-auto">
      <PageHeader
        eyebrow="Self-hosted"
        title="Updates"
        description="Installer releases published for your OPSQAI installation. Signed ZIP + SHA-256 for every version."
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard label="Installed version" value={installed} icon={Package} />
        <StatCard label="Latest available" value={available} icon={Download} />
        <StatCard label="Releases published" value={rows.length} icon={History} />
      </div>

      {releases.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Package} title="No releases yet" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold">v{r.version}</span>
                    {r.is_active && <Badge>current</Badge>}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {r.tag_name}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Published {new Date(r.published_at).toLocaleString()} · ZIP {fmtBytes(r.zip_size_bytes)} · EXE {fmtBytes(r.exe_size_bytes)}
                  </div>
                  {r.exe_sha256 && (
                    <div className="text-[11px] font-mono text-muted-foreground mt-1 break-all">
                      sha256: {r.exe_sha256}
                    </div>
                  )}
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={r.zip_url} target="_blank" rel="noopener noreferrer">
                    Download <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-6">
        Updates are applied by the on-premise installer. Rollback is handled locally through the
        installer's built-in version manager. Contact OPSQAI support if you need help.
      </p>
    </div>
  );
}
