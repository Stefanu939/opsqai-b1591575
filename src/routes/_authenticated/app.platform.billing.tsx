import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, CreditCard, Search, Sparkles } from "lucide-react";
import { PremiumCard } from "@/components/platform/PremiumCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/platform/billing")({
  head: () => ({ meta: [{ title: "Billing wizard — Mission Control" }] }),
  component: BillingWizard,
});

const MOCK_COMPANIES = [
  { id: "c1", name: "Contabil Expert SRL", cui: "RO12345678", city: "București" },
  { id: "c2", name: "Fiscal Pro Consulting", cui: "RO23456789", city: "Cluj-Napoca" },
  { id: "c3", name: "Audit & Balance SRL", cui: "RO34567890", city: "Timișoara" },
  { id: "c4", name: "Tax Advisory Group", cui: "RO45678901", city: "Iași" },
  { id: "c5", name: "Bilanț Complet SA", cui: "RO56789012", city: "Constanța" },
];

const MODULES = [
  { id: "m1", name: "Modul Salarizare", min: 500, max: 2000, default: 800 },
  { id: "m2", name: "Modul Facturare", min: 500, max: 2000, default: 700 },
  { id: "m3", name: "Modul Contabilitate", min: 500, max: 2000, default: 1200 },
  { id: "m4", name: "Modul Raportări ANAF", min: 500, max: 2000, default: 900 },
  { id: "m5", name: "Modul Stocuri", min: 500, max: 2000, default: 600 },
  { id: "m6", name: "Modul CRM", min: 500, max: 2000, default: 500 },
];

const STEPS = ["Firmă", "Pachet de bază", "Mentenanță", "Module", "Rezumat"];

function fmt(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function BillingWizard() {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState<typeof MOCK_COMPANIES[0] | null>(null);
  const [basePkg, setBasePkg] = useState(true);
  const [maintenance, setMaintenance] = useState(250);
  const [selectedModules, setSelectedModules] = useState<Record<string, number>>({});

  const filtered = MOCK_COMPANIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) || c.cui.includes(query),
  );

  const modulesMonthly = useMemo(
    () => Object.values(selectedModules).reduce((a, b) => a + b, 0),
    [selectedModules],
  );
  const monthly = maintenance + modulesMonthly;
  const yearTotal = (basePkg ? 15000 : 0) + monthly * 12;

  const canNext = [
    () => !!company,
    () => true,
    () => true,
    () => true,
    () => true,
  ][step]();

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mc-eyebrow flex items-center gap-1.5">
            <CreditCard className="h-3 w-3 text-[var(--mc-gold)]" /> Commercial · Billing
          </div>
          <h1 className="mc-heading text-2xl font-semibold text-[var(--mc-fg)] mt-1">
            Emitere abonament firmă
          </h1>
        </div>
        <div className="text-right">
          <div className="mc-eyebrow">Total anual estimat</div>
          <div className="mc-num mc-gold-text text-2xl font-bold">{fmt(yearTotal)}</div>
        </div>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                i === step
                  ? "bg-[var(--mc-gold)]/15 border-[var(--mc-gold)]/50 text-[var(--mc-gold-glow)]"
                  : i < step
                    ? "border-[var(--mc-gold)]/30 text-[var(--mc-fg-muted)] hover:text-[var(--mc-fg)]"
                    : "border-white/5 text-[var(--mc-fg-dim)]",
              )}
            >
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                i < step ? "bg-[var(--mc-gold)]/30" : i === step ? "bg-[var(--mc-gold)]/25" : "bg-white/5",
              )}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-white/5" />}
          </div>
        ))}
      </div>

      {/* Step body */}
      <PremiumCard padding="lg" className="min-h-[420px]">
        {step === 0 && (
          <div className="space-y-4">
            <div className="mc-eyebrow">Pas 1 · Selectează firma</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--mc-fg-dim)]" />
              <Input
                placeholder="Caută după nume sau CUI…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 bg-[var(--mc-surface-2)] border-white/5"
              />
            </div>
            <div className="space-y-1.5">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCompany(c)}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 transition-colors",
                    company?.id === c.id
                      ? "border-[var(--mc-gold)]/50 bg-[var(--mc-gold)]/10"
                      : "border-white/5 bg-[var(--mc-surface-2)] hover:border-white/10",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[var(--mc-fg)]">{c.name}</div>
                      <div className="text-xs text-[var(--mc-fg-muted)] mt-0.5">{c.cui} · {c.city}</div>
                    </div>
                    {company?.id === c.id && <Check className="h-4 w-4 text-[var(--mc-gold)]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="mc-eyebrow">Pas 2 · Pachet de bază</div>
            <div className={cn(
              "rounded-xl border p-6 transition-colors",
              basePkg ? "border-[var(--mc-gold)]/50 bg-[var(--mc-gold)]/10" : "border-white/5 bg-[var(--mc-surface-2)]",
            )}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mc-eyebrow flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[var(--mc-gold)]" /> Base package
                  </div>
                  <h3 className="mc-heading text-xl font-semibold text-[var(--mc-fg)] mt-1">
                    OPSQAI Cloud Platform
                  </h3>
                  <p className="text-sm text-[var(--mc-fg-muted)] mt-2 max-w-md">
                    Setup complet, licențe, integrări ANAF, suport premium, onboarding.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-xs text-[var(--mc-fg-muted)]">
                    {["Instalare + configurare", "Migrare date existente", "Training echipă (8h)", "Suport 24/7 primele 3 luni"].map(x => (
                      <li key={x} className="flex items-center gap-2"><Check className="h-3 w-3 text-[var(--mc-gold)]" /> {x}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-right space-y-2">
                  <div className="mc-num mc-gold-text text-3xl font-bold">{fmt(15000)}</div>
                  <div className="text-[11px] text-[var(--mc-fg-muted)]">one-time</div>
                  <Switch checked={basePkg} onCheckedChange={setBasePkg} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="mc-eyebrow">Pas 3 · Mentenanță lunară</div>
            <div className="rounded-xl border border-white/5 bg-[var(--mc-surface-2)] p-6">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <div className="text-sm text-[var(--mc-fg-muted)]">Contract mentenanță</div>
                  <div className="text-xs text-[var(--mc-fg-dim)] mt-1">Update-uri, monitorizare, backups</div>
                </div>
                <div className="text-right">
                  <div className="mc-num mc-gold-text text-3xl font-bold">{fmt(maintenance)}</div>
                  <div className="text-[11px] text-[var(--mc-fg-muted)]">/ lună</div>
                </div>
              </div>
              <Slider value={[maintenance]} min={0} max={500} step={50} onValueChange={v => setMaintenance(v[0])} />
              <div className="mt-3 flex justify-between text-[11px] text-[var(--mc-fg-dim)]">
                <span>€0</span><span>€250</span><span>€500</span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="mc-eyebrow">Pas 4 · Module suplimentare</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODULES.map(m => {
                const active = selectedModules[m.id] !== undefined;
                const value = selectedModules[m.id] ?? m.default;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      active ? "border-[var(--mc-gold)]/40 bg-[var(--mc-gold)]/8" : "border-white/5 bg-[var(--mc-surface-2)]",
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-[var(--mc-fg)]">{m.name}</div>
                      <Switch
                        checked={active}
                        onCheckedChange={c => {
                          setSelectedModules(prev => {
                            const n = { ...prev };
                            if (c) n[m.id] = m.default;
                            else delete n[m.id];
                            return n;
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[11px] text-[var(--mc-fg-dim)]">{fmt(m.min)} – {fmt(m.max)} /lună</span>
                      <span className="mc-num mc-gold-text text-lg font-semibold">{fmt(value)}</span>
                    </div>
                    <Slider
                      disabled={!active}
                      value={[value]}
                      min={m.min}
                      max={m.max}
                      step={100}
                      onValueChange={v => setSelectedModules(prev => ({ ...prev, [m.id]: v[0] }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="mc-eyebrow">Pas 5 · Rezumat</div>
            <div className="rounded-xl border border-white/5 bg-[var(--mc-surface-2)] p-6 space-y-4">
              <div className="pb-4 border-b border-white/5">
                <div className="mc-eyebrow">Firmă</div>
                <div className="text-lg font-semibold text-[var(--mc-fg)] mt-1">{company?.name}</div>
                <div className="text-xs text-[var(--mc-fg-muted)]">{company?.cui} · {company?.city}</div>
              </div>
              <div className="space-y-2">
                {basePkg && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--mc-fg-muted)]">Base package (one-time)</span>
                    <span className="mc-num font-medium text-[var(--mc-fg)]">{fmt(15000)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--mc-fg-muted)]">Mentenanță</span>
                  <span className="mc-num font-medium text-[var(--mc-fg)]">{fmt(maintenance)} / lună</span>
                </div>
                {Object.entries(selectedModules).map(([id, v]) => {
                  const m = MODULES.find(x => x.id === id)!;
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span className="text-[var(--mc-fg-muted)]">{m.name}</span>
                      <span className="mc-num font-medium text-[var(--mc-fg)]">{fmt(v)} / lună</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-white/5 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--mc-fg-muted)]">Total lunar</span>
                  <span className="mc-num font-semibold text-[var(--mc-fg)]">{fmt(monthly)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-[var(--mc-fg-muted)]">Total 12 luni</span>
                  <span className="mc-num mc-gold-text text-2xl font-bold">{fmt(yearTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </PremiumCard>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep(s => s - 1)}
        >
          Înapoi
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext} onClick={() => setStep(s => s + 1)}>
            Continuă <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="bg-[var(--mc-gold)] hover:bg-[var(--mc-gold-glow)] text-black">
            Emite contract
          </Button>
        )}
      </div>
    </div>
  );
}
