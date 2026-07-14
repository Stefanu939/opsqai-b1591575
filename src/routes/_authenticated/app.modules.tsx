import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LICENSE_MODULE_CATALOG, BASIC_MODULES } from "@/lib/license-modules";
import { useLicense } from "@/lib/license";
import { createInternalRequest } from "@/lib/internal-requests.functions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Lock, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/modules")({
  head: () => ({ meta: [{ title: "Modules — OPSQAI" }] }),
  component: ModulesPage,
});

function ModulesPage() {
  const license = useLicense();
  const active = new Set<string>([...BASIC_MODULES, ...(license.modules ?? [])]);
  const createReq = useServerFn(createInternalRequest);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const target = LICENSE_MODULE_CATALOG.find((m) => m.key === openKey) ?? null;

  async function submit() {
    if (!target) return;
    setBusy(true);
    try {
      await createReq({
        data: {
          title: `Module request: ${target.label}`,
          description: note || `Request to activate module: ${target.label}`,
          category: "billing",
          priority: "normal",
        },
      });
      toast.success("Request sent. OPSQAI will follow up.");
      setOpenKey(null);
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const categories = Array.from(new Set(LICENSE_MODULE_CATALOG.map((m) => m.category)));

  return (
    <div className="p-6 md:p-10 max-w-5xl w-full mx-auto">
      <PageHeader
        eyebrow="Self-hosted"
        title="Modules"
        description="Every module available for OPSQAI. Modules are activated exclusively by OPSQAI — request activation and we will issue the license."
      />

      <Card className="p-4 mb-6 flex items-start gap-3 bg-surface-1">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="text-sm text-muted-foreground">
          The Basic bundle is always included. Premium modules unlock when OPSQAI issues a signed
          module license for your installation.
        </div>
      </Card>

      {categories.map((cat) => {
        const items = LICENSE_MODULE_CATALOG.filter((m) => m.category === cat);
        return (
          <section key={cat} className="mb-8">
            <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
              {cat}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((m) => {
                const on = active.has(m.key);
                return (
                  <Card key={m.key} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-display font-semibold text-sm">{m.label}</div>
                          {on ? (
                            <Badge variant="default" className="text-[10px]">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : m.inBasic ? (
                            <Badge variant="outline" className="text-[10px]">Basic</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {m.inBasic
                          ? "Included"
                          : `€${(m.defaultPriceCents / 100).toLocaleString("de-DE")}`}
                      </div>
                    </div>
                    {!on && !m.inBasic && (
                      <div className="pt-2 border-t border-border">
                        <Button size="sm" variant="outline" onClick={() => setOpenKey(m.key)}>
                          Request activation
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      <Dialog open={!!openKey} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {target?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We will forward this to your OPSQAI account manager and issue the module license
              once approved.
            </p>
            <div>
              <Label>Additional context (optional)</Label>
              <Textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Seats, timeline, business reason…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenKey(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
