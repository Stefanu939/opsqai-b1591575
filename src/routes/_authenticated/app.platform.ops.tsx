import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wrench, ShieldCheck, Calendar, KeyRound, Download, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { PremiumCard } from "@/components/platform/PremiumCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/platform/ops")({
  head: () => ({ meta: [{ title: "Recovery & Maintenance — Mission Control" }] }),
  component: OpsPage,
});

const MAINT_WINDOWS = [
  { id: "w1", company: "Contabil Expert SRL", start: "2026-07-16 22:00", duration: "2h", type: "Update v4.2.1", status: "scheduled" },
  { id: "w2", company: "Fiscal Pro Consulting", start: "2026-07-17 23:00", duration: "1h", type: "Security patch", status: "scheduled" },
  { id: "w3", company: "Audit & Balance", start: "2026-07-14 21:00", duration: "3h", type: "Migrare DB", status: "in-progress" },
  { id: "w4", company: "Tax Advisory", start: "2026-07-12 22:00", duration: "1.5h", type: "Update v4.2.0", status: "done" },
];

const LICENSES = [
  { id: "l1", company: "Bilanț Complet SA", expires: "2026-07-28", days: 14, plan: "Enterprise" },
  { id: "l2", company: "Contab Plus", expires: "2026-08-04", days: 21, plan: "Growth" },
  { id: "l3", company: "Fiscal Pro", expires: "2026-08-19", days: 36, plan: "Growth" },
];

const DR_TOKENS = [
  { id: "t1", company: "Contabil Expert SRL", generated: "2026-07-01", used: false, kind: "bootstrap" },
  { id: "t2", company: "Audit & Balance", generated: "2026-06-24", used: true, kind: "bootstrap" },
  { id: "t3", company: "Tax Advisory", generated: "2026-05-15", used: false, kind: "recovery-key" },
];

const RESTORES = [
  { id: "r1", company: "Contab Plus", ts: "2026-07-13 03:42", size: "8.2 GB", status: "verified" },
  { id: "r2", company: "Bilanț Complet SA", ts: "2026-07-12 03:15", size: "12.4 GB", status: "verified" },
  { id: "r3", company: "Fiscal Pro", ts: "2026-07-11 03:22", size: "5.7 GB", status: "warning" },
];

function OpsPage() {
  const [tab, setTab] = useState<"maintenance" | "recovery">("maintenance");

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="mc-eyebrow flex items-center gap-1.5"><Wrench className="h-3 w-3 text-[var(--mc-gold)]" /> Operations</div>
        <h1 className="mc-heading text-2xl font-semibold text-[var(--mc-fg)] mt-1">Recovery & Maintenance</h1>
        <p className="text-sm text-[var(--mc-fg-muted)] mt-1">Ferestre de mentenanță, expirări licențe, DR tokens și restore verification.</p>
      </header>

      <div className="inline-flex rounded-lg border border-white/5 bg-[var(--mc-surface-2)] p-1">
        {(["maintenance", "recovery"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-sm rounded-md transition-colors",
              tab === t
                ? "bg-[var(--mc-gold)]/15 text-[var(--mc-gold-glow)]"
                : "text-[var(--mc-fg-muted)] hover:text-[var(--mc-fg)]",
            )}
          >
            {t === "maintenance" ? <Wrench className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {t === "maintenance" ? "Maintenance" : "Recovery"}
          </button>
        ))}
      </div>

      {tab === "maintenance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PremiumCard eyebrow="Ferestre programate" title="Maintenance calendar" action={<Button size="sm" variant="outline" className="border-white/5"><Calendar className="h-3.5 w-3.5 mr-1" /> Adaugă</Button>}>
            <div className="space-y-2">
              {MAINT_WINDOWS.map(w => (
                <div key={w.id} className="rounded-lg border border-white/5 bg-[var(--mc-surface-2)] p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm text-[var(--mc-fg)]">{w.company}</div>
                      <div className="text-[11px] text-[var(--mc-fg-muted)] mt-0.5">{w.type} · {w.duration}</div>
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border",
                      w.status === "scheduled" && "border-[var(--mc-gold)]/30 bg-[var(--mc-gold)]/10 text-[var(--mc-gold-glow)]",
                      w.status === "in-progress" && "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]",
                      w.status === "done" && "border-[var(--mc-success)]/30 bg-[var(--mc-success)]/10 text-[var(--mc-success)]",
                    )}>
                      {w.status}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--mc-fg-dim)] flex items-center gap-1"><Clock className="h-3 w-3" /> {w.start}</div>
                </div>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard eyebrow="Renewal calendar" title="Licențe care expiră">
            <div className="space-y-2">
              {LICENSES.map(l => (
                <div key={l.id} className="rounded-lg border border-white/5 bg-[var(--mc-surface-2)] p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-[var(--mc-fg)]">{l.company}</div>
                    <div className="text-[11px] text-[var(--mc-fg-muted)]">{l.plan} · expiră {l.expires}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn("mc-num text-lg font-semibold", l.days <= 15 ? "text-[var(--mc-danger)]" : "text-[var(--mc-fg)]")}>
                      {l.days}
                    </div>
                    <div className="text-[10px] text-[var(--mc-fg-dim)]">zile</div>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>
        </div>
      )}

      {tab === "recovery" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PremiumCard eyebrow="Disaster Recovery" title="Bootstrap tokens & DR keys" action={<Button size="sm" variant="outline" className="border-white/5"><KeyRound className="h-3.5 w-3.5 mr-1" /> Nou</Button>}>
            <div className="space-y-2">
              {DR_TOKENS.map(t => (
                <div key={t.id} className="rounded-lg border border-white/5 bg-[var(--mc-surface-2)] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-[var(--mc-fg)]">{t.company}</div>
                      <div className="text-[11px] text-[var(--mc-fg-muted)] mt-0.5">
                        {t.kind} · generat {t.generated}
                      </div>
                    </div>
                    {t.used ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[var(--mc-fg-muted)]">used</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--mc-success)]/30 bg-[var(--mc-success)]/10 text-[var(--mc-success)]">active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard eyebrow="Restore verification" title="Backup restores 24h" action={<Button size="sm" variant="outline" className="border-white/5"><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>}>
            <div className="space-y-2">
              {RESTORES.map(r => (
                <div key={r.id} className="rounded-lg border border-white/5 bg-[var(--mc-surface-2)] p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-[var(--mc-fg)]">{r.company}</div>
                    <div className="text-[11px] text-[var(--mc-fg-muted)]">{r.ts} · {r.size}</div>
                  </div>
                  {r.status === "verified" ? (
                    <span className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--mc-success)]/30 bg-[var(--mc-success)]/10 text-[var(--mc-success)]">
                      <CheckCircle2 className="h-3 w-3" /> verified
                    </span>
                  ) : (
                    <span className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]">
                      <AlertTriangle className="h-3 w-3" /> warning
                    </span>
                  )}
                </div>
              ))}
            </div>
          </PremiumCard>
        </div>
      )}
    </div>
  );
}
