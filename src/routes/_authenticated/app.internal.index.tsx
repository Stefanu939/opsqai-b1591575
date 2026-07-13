import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getInternalWorkspaceInfo, regenerateSystemKnowledge } from "@/lib/system-docs.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BookOpen, RefreshCw, ShieldCheck, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/internal/")({
  component: InternalOverview,
  head: () => ({ meta: [{ title: "OPSQAI Internal · Overview" }] }),
});

function InternalOverview() {
  const { isPlatformOwner } = useAuth();
  const info = useServerFn(getInternalWorkspaceInfo);
  const regen = useServerFn(regenerateSystemKnowledge);
  const [data, setData] = useState<Awaited<ReturnType<typeof info>> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setData(await info());
    } catch (e) {
      toast.error(String(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const onRegen = async (force = false) => {
    setBusy(true);
    try {
      const r = await regen({ data: { force } });
      toast.success(
        `Regenerated ${r.reembedded} docs (${r.unchanged} unchanged, ${r.total} total).`,
      );
      await load();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary/80 font-medium">
            <Building2 className="h-4 w-4" /> OPSQAI Internal · Platform-only workspace
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Self-documenting platform</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            OPSQAI documents itself using its own features. System Knowledge is auto-generated from
            the implemented platform features and is visible only to Platform Owner and Platform
            Super Admin.
          </p>
        </div>
      </div>

      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-medium">Isolated from customer data</div>
            <p className="text-muted-foreground mt-0.5">
              System Knowledge lives in a dedicated workspace, is read-only, and is never mixed with
              any customer's company knowledge. The OPSQAI Assistant retrieves only from this scope.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">System docs</div>
          <div className="text-2xl font-semibold mt-1">{data?.docCount ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">
            of {data?.catalogTotal ?? "—"} implemented features
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Workspace</div>
          <div className="text-lg font-semibold mt-1 truncate">{data?.name ?? "—"}</div>
          <Badge variant="secondary" className="mt-1.5">
            immutable
          </Badge>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Created</div>
          <div className="text-lg font-semibold mt-1">
            {data ? new Date(data.createdAt).toLocaleDateString() : "—"}
          </div>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/app/internal/assistant">
          <Card className="p-5 hover:border-primary/40 transition cursor-pointer h-full">
            <Sparkles className="h-5 w-5 text-primary mb-2" />
            <div className="font-semibold">OPSQAI Assistant</div>
            <p className="text-sm text-muted-foreground mt-1">
              Ask anything about how to use OPSQAI. Answers are grounded in System Knowledge only.
            </p>
          </Card>
        </Link>
        <Link to="/app/internal/knowledge">
          <Card className="p-5 hover:border-primary/40 transition cursor-pointer h-full">
            <BookOpen className="h-5 w-5 text-primary mb-2" />
            <div className="font-semibold">System Knowledge</div>
            <p className="text-sm text-muted-foreground mt-1">
              Browse the auto-generated platform documentation by category.
            </p>
          </Card>
        </Link>
      </div>

      {isPlatformOwner && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold">Generate System Knowledge</div>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Re-render the platform documentation from the implemented feature catalog and
                refresh semantic embeddings. Only changed documents are re-embedded.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onRegen(false)}
                disabled={busy}
                variant="default"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                {busy ? "Generating…" : "Regenerate (changed only)"}
              </Button>
              <Button
                onClick={() => onRegen(true)}
                disabled={busy}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Force full rebuild
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
