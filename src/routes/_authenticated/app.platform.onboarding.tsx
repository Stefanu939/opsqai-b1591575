import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { redirect } from "@tanstack/react-router";
import {
  Building2,
  Mail,
  Users,
  Sparkles,
  Check,
  ChevronRight,
  Loader2,
  Copy,
  Download,
  Send,
  ArrowLeft,
  ShieldCheck,
  Package,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  TIER_PRESETS,
  ADDON_MODULES,
  BASIC_MODULES,
  LICENSE_MODULE_CATALOG,
  type TierKey,
  type ModuleKey,
} from "@/lib/license-modules";
import { onboardCustomer, type OnboardResult } from "@/lib/onboarding.functions";
import { PremiumCard } from "@/components/platform/PremiumCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/platform/onboarding")({
  component: OnboardingWizard,
});

interface FormState {
  install_id: string;
  company_name: string;
  contact_email: string;
  technical_contact_email: string;
  tier: TierKey;
  seats: number;
  monthsValid: number;
  addons: Set<ModuleKey>;
  notes: string;
  send_email: boolean;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "install";
}

const STEPS = ["Client & tier", "Modules", "Emitere", "Livrare"] as const;

function OnboardingWizard() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) throw redirect({ to: "/app" });
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<FormState>({
    install_id: "",
    company_name: "",
    contact_email: "",
    technical_contact_email: "",
    tier: "pro",
    seats: 25,
    monthsValid: 12,
    addons: new Set(),
    notes: "",
    send_email: true,
  });
  const [result, setResult] = useState<OnboardResult | null>(null);

  const tierPreset = useMemo(
    () => TIER_PRESETS.find((t) => t.key === state.tier) ?? TIER_PRESETS[0],
    [state.tier],
  );

  const effectiveModules = useMemo(() => {
    const s = new Set<ModuleKey>();
    for (const m of BASIC_MODULES) s.add(m);
    for (const m of tierPreset.extraModules) s.add(m);
    for (const m of state.addons) s.add(m);
    return s;
  }, [tierPreset.extraModules, state.addons]);

  const totalCents = useMemo(() => {
    let sum = tierPreset.monthlyPriceCents * state.monthsValid;
    for (const key of state.addons) {
      if (tierPreset.extraModules.includes(key)) continue;
      const mod = LICENSE_MODULE_CATALOG.find((m) => m.key === key);
      if (mod) sum += mod.defaultPriceCents;
    }
    return sum;
  }, [tierPreset, state.addons, state.monthsValid]);

  const onboardFn = useServerFn(onboardCustomer);
  const mutation = useMutation({
    mutationFn: async () => {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + state.monthsValid);
      const allModules = Array.from(new Set([...tierPreset.extraModules, ...Array.from(state.addons)]));
      return (
        onboardFn as unknown as (args: { data: unknown }) => Promise<OnboardResult>
      )({
        data: {
          install_id: state.install_id,
          company_name: state.company_name,
          contact_email: state.contact_email,
          technical_contact_email: state.technical_contact_email || null,
          tier: state.tier === "pro" ? "business" : state.tier,
          seats: state.seats,
          expires_at: expires.toISOString(),
          modules: allModules,
          notes: state.notes || undefined,
          send_email: state.send_email,
        },
      });
    },
    onSuccess: (r) => {
      setResult(r);
      setStep(3);
      if (r.package_generated) toast.success("Client onboarded cu succes");
      else toast.warning(`Licență emisă. Pachet: ${r.package_error ?? "eșec"}`);
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const canProceedStep1 =
    state.install_id.trim().length >= 3 &&
    /^[a-z0-9][a-z0-9-]{2,}$/.test(state.install_id) &&
    state.company_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contact_email);

  return (
    <div className="mc-enter p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mc-eyebrow flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[var(--mc-gold)]" /> Mission Control · Onboarding
            </div>
            <h1 className="mc-heading mt-1 text-2xl font-bold tracking-tight">
              <span className="mc-gold-text">Onboard client nou</span>
            </h1>
            <p className="mt-1 text-xs text-[var(--mc-fg-muted)]">
              4 pași · emite licență, generează pachet, livrează email — 90 secunde.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-fg-muted)] hover:text-[var(--mc-gold)]"
          >
            <Link to="/app/platform/overview">
              <ArrowLeft className="h-3.5 w-3.5" /> Overview
            </Link>
          </Button>
        </div>

        {/* Stepper */}
        <Stepper step={step} />

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main card */}
          <div>
            {step === 0 && (
              <Step1
                state={state}
                setState={setState}
                canProceed={canProceedStep1}
                onNext={() => setStep(1)}
              />
            )}
            {step === 1 && (
              <Step2
                state={state}
                setState={setState}
                effectiveModules={effectiveModules}
                onBack={() => setStep(0)}
                onNext={() => {
                  setStep(2);
                  mutation.mutate();
                }}
              />
            )}
            {step === 2 && (
              <Step3
                pending={mutation.isPending}
                error={mutation.error as Error | null}
                onRetry={() => mutation.mutate()}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && result && (
              <Step4
                result={result}
                companyName={state.company_name}
                onDone={() => navigate({ to: "/app/platform/overview" })}
              />
            )}
          </div>

          {/* Summary rail */}
          <SummaryRail
            state={state}
            tierPresetLabel={tierPreset.label}
            moduleCount={effectiveModules.size}
            totalCents={totalCents}
            step={step}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
function Stepper({ step }: { step: number }) {
  return (
    <div className="mc-surface mc-hairline flex items-center gap-1 p-2">
      {STEPS.map((label, idx) => {
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 items-center gap-2 rounded-md px-3 text-[11px] font-medium transition-all",
                active && "bg-gradient-to-b from-[#d4b458] to-[#a48633] text-[#0d0d0d] mc-shadow-gold",
                done && "border border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-2)] text-[var(--mc-gold-glow)]",
                !active && !done && "border border-[var(--mc-gold-line)] bg-transparent text-[var(--mc-fg-muted)]",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                  active ? "bg-[#0d0d0d]/20 text-[#0d0d0d]" : "bg-[var(--mc-surface-3)] text-[var(--mc-gold-glow)]",
                )}
              >
                {done ? <Check className="h-2.5 w-2.5" /> : idx + 1}
              </span>
              <span className="mc-heading tracking-tight uppercase">{label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-[var(--mc-fg-dim)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
function Step1({
  state,
  setState,
  canProceed,
  onNext,
}: {
  state: FormState;
  setState: (fn: (s: FormState) => FormState) => void;
  canProceed: boolean;
  onNext: () => void;
}) {
  return (
    <PremiumCard eyebrow="Step 1 / 4" title="Date client & tier" padding="lg">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nume companie"
          icon={<Building2 className="h-3.5 w-3.5" />}
          hint="Apare pe factură & bundle-ul de activare"
        >
          <Input
            value={state.company_name}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                company_name: e.target.value,
                install_id: s.install_id || slugify(e.target.value),
              }))
            }
            placeholder="ACME Logistics SRL"
            className="mc-input"
          />
        </Field>

        <Field label="Install ID" hint="Slug unic, lowercase (a-z, 0-9, -). Imutabil.">
          <Input
            value={state.install_id}
            onChange={(e) => setState((s) => ({ ...s, install_id: slugify(e.target.value) }))}
            placeholder="acme-logistics"
            className="mc-input font-mono"
          />
        </Field>

        <Field label="Email contact principal" icon={<Mail className="h-3.5 w-3.5" />}>
          <Input
            type="email"
            value={state.contact_email}
            onChange={(e) => setState((s) => ({ ...s, contact_email: e.target.value }))}
            placeholder="ceo@acme.com"
            className="mc-input"
          />
        </Field>

        <Field label="Email contact tehnic (opțional)" hint="Primește notificări la generare pachet">
          <Input
            type="email"
            value={state.technical_contact_email}
            onChange={(e) =>
              setState((s) => ({ ...s, technical_contact_email: e.target.value }))
            }
            placeholder="it@acme.com"
            className="mc-input"
          />
        </Field>
      </div>

      {/* Tier selector */}
      <div className="mt-6">
        <div className="mc-eyebrow mb-2 flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-[var(--mc-gold)]" /> Selectează tier
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {TIER_PRESETS.map((preset) => {
            const isSel = state.tier === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    tier: preset.key,
                    seats: preset.seats,
                    monthsValid: preset.monthsValid,
                  }))
                }
                className={cn(
                  "group relative rounded-lg border p-4 text-left transition-all",
                  isSel
                    ? "border-[var(--mc-gold)] bg-[var(--mc-surface-3)] mc-shadow-gold"
                    : "border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] hover:border-[var(--mc-gold-line-strong)]",
                )}
              >
                {preset.highlight && !isSel && (
                  <span className="absolute -top-2 right-3 rounded-full border border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--mc-gold-glow)]">
                    Popular
                  </span>
                )}
                <div className="flex items-baseline justify-between">
                  <div className="mc-heading text-sm font-bold text-[var(--mc-fg)]">
                    {preset.label}
                  </div>
                  {isSel && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--mc-gold)] text-[#0d0d0d]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <div className="mt-2 mc-num">
                  <span className="mc-gold-text text-xl font-bold">
                    €{(preset.monthlyPriceCents / 100).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-[var(--mc-fg-muted)]">/lună</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--mc-fg-muted)]">
                  {preset.tagline}
                </p>
                <div className="mt-3 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-[var(--mc-fg-muted)]">
                    <Users className="h-3 w-3" /> {preset.seats} seats · {preset.monthsValid} luni
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--mc-fg-muted)]">
                    <Package className="h-3 w-3" />
                    {BASIC_MODULES.length + preset.extraModules.length} module incluse
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seats / months */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Număr seats" hint="Include admini + useri end-client">
          <Input
            type="number"
            min={1}
            value={state.seats}
            onChange={(e) => setState((s) => ({ ...s, seats: Number(e.target.value) || 1 }))}
            className="mc-input mc-num"
          />
        </Field>
        <Field label="Durată validă (luni)">
          <Input
            type="number"
            min={1}
            max={60}
            value={state.monthsValid}
            onChange={(e) => setState((s) => ({ ...s, monthsValid: Number(e.target.value) || 12 }))}
            className="mc-input mc-num"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Note interne (opțional)">
          <Textarea
            value={state.notes}
            onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Notes for audit trail — no secrets…"
            className="mc-input min-h-[60px]"
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          disabled={!canProceed}
          onClick={onNext}
          className="h-10 gap-2 bg-gradient-to-b from-[#d4b458] to-[#a48633] px-6 text-[13px] font-semibold text-[#0d0d0d] mc-shadow-gold hover:brightness-110 disabled:opacity-40 disabled:mc-shadow-premium"
        >
          Continuă la module <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </PremiumCard>
  );
}

// ─────────────────────────────────────────────────────────
function Step2({
  state,
  setState,
  effectiveModules,
  onBack,
  onNext,
}: {
  state: FormState;
  setState: (fn: (s: FormState) => FormState) => void;
  effectiveModules: Set<ModuleKey>;
  onBack: () => void;
  onNext: () => void;
}) {
  const tierPreset = TIER_PRESETS.find((t) => t.key === state.tier)!;
  const grouped = useMemo(() => {
    const g = new Map<string, typeof ADDON_MODULES>();
    for (const m of ADDON_MODULES) {
      if (tierPreset.extraModules.includes(m.key)) continue; // already included
      const list = g.get(m.category) ?? [];
      list.push(m);
      g.set(m.category, list);
    }
    return Array.from(g.entries());
  }, [tierPreset.extraModules]);

  return (
    <PremiumCard eyebrow="Step 2 / 4" title="Add-ons opționale" padding="lg">
      <div className="mb-4 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-3)]/50 p-3">
        <div className="mc-eyebrow text-[var(--mc-gold-glow)]">Deja incluse · {effectiveModules.size} module</div>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--mc-fg-muted)]">
          Basic bundle ({BASIC_MODULES.length}) + preset <span className="text-[var(--mc-gold)] font-semibold">{tierPreset.label}</span> ({tierPreset.extraModules.length}).
          Bifează dedesubt orice add-on suplimentar.
        </p>
      </div>

      <div className="space-y-5">
        {grouped.map(([category, modules]) => (
          <div key={category}>
            <div className="mc-eyebrow mb-2">{category}</div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((mod) => {
                const checked = state.addons.has(mod.key);
                return (
                  <HoverCard key={mod.key} openDelay={200}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          setState((s) => {
                            const next = new Set(s.addons);
                            if (next.has(mod.key)) next.delete(mod.key);
                            else next.add(mod.key);
                            return { ...s, addons: next };
                          })
                        }
                        className={cn(
                          "group flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-all",
                          checked
                            ? "border-[var(--mc-gold)] bg-[var(--mc-surface-3)]"
                            : "border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] hover:border-[var(--mc-gold-line-strong)]",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                            checked
                              ? "border-[var(--mc-gold)] bg-[var(--mc-gold)] text-[#0d0d0d]"
                              : "border-[var(--mc-fg-dim)]",
                          )}
                        >
                          {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-[var(--mc-fg)]">{mod.label}</div>
                          <div className="mc-num mt-0.5 text-[10px] text-[var(--mc-fg-muted)]">
                            €{(mod.defaultPriceCents / 100).toFixed(0)} one-off
                          </div>
                        </div>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      side="top"
                      className="w-64 border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)]"
                    >
                      <div className="mc-eyebrow mb-1 text-[var(--mc-gold-glow)]">{mod.label}</div>
                      <p className="text-xs leading-relaxed text-[var(--mc-fg-muted)]">{mod.description}</p>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-fg-muted)] hover:text-[var(--mc-gold)]"
        >
          <ArrowLeft className="h-4 w-4" /> Înapoi
        </Button>
        <Button
          onClick={onNext}
          className="h-10 gap-2 bg-gradient-to-b from-[#d4b458] to-[#a48633] px-6 text-[13px] font-semibold text-[#0d0d0d] mc-shadow-gold hover:brightness-110"
        >
          Emite & generează <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </PremiumCard>
  );
}

// ─────────────────────────────────────────────────────────
function Step3({
  pending,
  error,
  onRetry,
  onBack,
}: {
  pending: boolean;
  error: Error | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <PremiumCard eyebrow="Step 3 / 4" title="Emitere & generare pachet" padding="lg">
      <div className="space-y-3">
        {[
          { label: "Semnare Installation License (ed25519)", icon: ShieldCheck },
          { label: "Emitere Module Licenses", icon: Package },
          { label: "Asamblare ZIP + activation-bundle.json", icon: Package },
          { label: "Upload storage + email transactional", icon: Send },
        ].map(({ label, icon: Icon }, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)]">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--mc-gold)]" />
              ) : error ? (
                <Icon className="h-4 w-4 text-[var(--mc-danger)]" />
              ) : (
                <Check className="h-4 w-4 text-[var(--mc-success)]" />
              )}
            </div>
            <div className="flex-1 text-[12px] text-[var(--mc-fg)]">{label}</div>
          </div>
        ))}

        {pending && (
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--mc-surface-3)]">
            <div className="mc-shimmer h-full w-full" />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-[var(--mc-danger)]/40 bg-[var(--mc-danger)]/10 p-3 text-[12px] text-[var(--mc-danger)]">
            <strong className="font-semibold">Eroare la emitere:</strong> {error.message}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-5 flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-fg-muted)]"
          >
            <ArrowLeft className="h-4 w-4" /> Înapoi
          </Button>
          <Button
            onClick={onRetry}
            className="bg-gradient-to-b from-[#d4b458] to-[#a48633] text-[#0d0d0d] mc-shadow-gold"
          >
            Reîncearcă
          </Button>
        </div>
      )}
    </PremiumCard>
  );
}

// ─────────────────────────────────────────────────────────
function Step4({
  result,
  companyName,
  onDone,
}: {
  result: OnboardResult;
  companyName: string;
  onDone: () => void;
}) {
  return (
    <PremiumCard eyebrow="Step 4 / 4" title="Livrare pachet" padding="lg">
      <div className="mb-4 flex items-start gap-3 rounded-md border border-[var(--mc-success)]/40 bg-[var(--mc-success)]/10 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--mc-success)]/20">
          <Check className="h-4 w-4 text-[var(--mc-success)]" />
        </div>
        <div>
          <div className="mc-heading text-[13px] font-semibold text-[var(--mc-fg)]">
            {companyName} este onboarded
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--mc-fg-muted)]">
            Install <span className="mc-num text-[var(--mc-gold-glow)] font-mono">{result.install_id}</span> ·{" "}
            {result.modules_issued.length} module emise
            {result.modules_failed.length > 0 && (
              <> · <span className="text-[var(--mc-danger)]">{result.modules_failed.length} eșec</span></>
            )}
          </div>
        </div>
      </div>

      {result.package_generated && result.signed_url ? (
        <div className="space-y-3">
          <div className="rounded-md border border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)]/50 p-3">
            <div className="mc-eyebrow mb-2 text-[var(--mc-gold-glow)]">Pachet generat</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--mc-fg-muted)]">Versiune installer</span>
              <span className="mc-num font-mono text-[var(--mc-fg)]">
                {result.installer_version}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-[var(--mc-fg-muted)]">URL expiră</span>
              <span className="mc-num text-[var(--mc-fg)]">
                {result.expires_at && new Date(result.expires_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className="gap-2 bg-gradient-to-b from-[#d4b458] to-[#a48633] text-[#0d0d0d] mc-shadow-gold hover:brightness-110"
            >
              <a href={result.signed_url} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" /> Descarcă ZIP
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(result.signed_url ?? "");
                toast.success("Link copiat");
              }}
              className="border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-gold-glow)]"
            >
              <Copy className="h-4 w-4" /> Copiază link
            </Button>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-fg-muted)]"
                >
                  <Send className="h-4 w-4" /> Email status
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)]">
                <div className="mc-eyebrow mb-1 text-[var(--mc-gold-glow)]">Email trimis</div>
                <p className="text-xs leading-relaxed text-[var(--mc-fg-muted)]">
                  Un email „installation-package-ready" a fost trimis automat contactului tehnic (dacă a fost specificat) sau contactului principal.
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-[var(--mc-danger)]/40 bg-[var(--mc-danger)]/10 p-3 text-[12px] text-[var(--mc-danger)]">
          <strong>Licența a fost emisă</strong> dar generarea pachetului a eșuat: {result.package_error}.
          Poți relansa manual din pagina licenței.
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Button
          asChild
          variant="outline"
          className="border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-fg-muted)]"
        >
          <Link
            to="/app/platform/installation-package/$installId"
            params={{ installId: result.install_id }}
          >
            Vezi pagina instalării
          </Link>
        </Button>
        <Button
          onClick={onDone}
          className="bg-gradient-to-b from-[#d4b458] to-[#a48633] text-[#0d0d0d] mc-shadow-gold"
        >
          Înapoi la overview
        </Button>
      </div>
    </PremiumCard>
  );
}

// ─────────────────────────────────────────────────────────
function SummaryRail({
  state,
  tierPresetLabel,
  moduleCount,
  totalCents,
  step,
}: {
  state: FormState;
  tierPresetLabel: string;
  moduleCount: number;
  totalCents: number;
  step: number;
}) {
  return (
    <div className="space-y-3 lg:sticky lg:top-16 h-fit">
      <PremiumCard eyebrow="Rezumat live" title="Comandă">
        <dl className="space-y-2 text-[12px]">
          <Row label="Client">
            <span className="text-[var(--mc-fg)]">{state.company_name || "—"}</span>
          </Row>
          <Row label="Install ID">
            <span className="mc-num font-mono text-[10px] text-[var(--mc-gold-glow)]">
              {state.install_id || "—"}
            </span>
          </Row>
          <Row label="Tier">
            <span className="rounded-md border border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--mc-gold-glow)]">
              {tierPresetLabel}
            </span>
          </Row>
          <Row label="Seats">
            <span className="mc-num text-[var(--mc-fg)]">{state.seats}</span>
          </Row>
          <Row label="Durată">
            <span className="mc-num text-[var(--mc-fg)]">{state.monthsValid} luni</span>
          </Row>
          <Row label="Module active">
            <span className="mc-num text-[var(--mc-fg)]">{moduleCount}</span>
          </Row>
        </dl>

        <div className="mt-4 border-t border-[var(--mc-gold-line)] pt-3">
          <div className="flex items-baseline justify-between">
            <span className="mc-eyebrow">Total estimat</span>
            <span className="mc-gold-text mc-num text-2xl font-bold">
              €{(totalCents / 100).toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-right text-[10px] text-[var(--mc-fg-dim)]">
            pentru {state.monthsValid} luni · fără TVA
          </div>
        </div>
      </PremiumCard>

      <PremiumCard eyebrow="Următorul pas" hairline={false}>
        <div className="space-y-2 text-[11px] text-[var(--mc-fg-muted)]">
          {step === 0 && (
            <>
              <p>Completează datele companiei și alege un tier. Install ID se generează automat din numele companiei.</p>
              <p className="text-[var(--mc-fg-dim)]">Toate câmpurile fără „(opțional)" sunt obligatorii.</p>
            </>
          )}
          {step === 1 && (
            <p>Bifează orice add-on suplimentar peste ce include tier-ul. Poți emite module noi și mai târziu.</p>
          )}
          {step === 2 && (
            <p>Se emite licența, se semnează ed25519, se generează ZIP-ul și se trimite email către contact tehnic.</p>
          )}
          {step === 3 && (
            <p>Descarcă ZIP-ul sau trimite link-ul clientului. Link-ul expiră în 24h — poți re-genera oricând.</p>
          )}
        </div>
      </PremiumCard>
    </div>
  );
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mc-eyebrow mb-1 flex items-center gap-1.5 text-[var(--mc-fg-muted)]">
        {icon}
        {label}
      </div>
      {children}
      {hint && <div className="mt-1 text-[10px] text-[var(--mc-fg-dim)]">{hint}</div>}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--mc-fg-muted)]">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
