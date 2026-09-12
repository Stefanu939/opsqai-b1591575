/**
 * OPSQAI Value Engine — the three-level operational value calculator used by
 * the Management Center. All maths lives in `@/lib/value-engine` (pure), so the
 * live figures here are identical to the exported PDF report.
 */
import { useMemo, useState } from "react";
import { Download, Save, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VALUE_DRIVERS,
  computeValue,
  formatMoney,
  scenarios,
  type EffortLevel,
  type ValueDriverKey,
  type ValueInputs,
} from "@/lib/value-engine";

export const DRIVER_LABELS: Record<ValueDriverKey, string> = {
  search: "Information search",
  training: "Training & retraining",
  errors: "Errors & rework",
  downtime: "Downtime",
  escalations: "Escalations",
  onboarding: "Onboarding",
  deviations: "Process deviations",
  knowledge_loss: "Knowledge loss",
  management: "Management intervention",
};

const EXTRA_DRIVERS = VALUE_DRIVERS.filter((k) => k !== "search");

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ValueCalculator({
  companyName,
  onCompanyNameChange,
  inputs,
  onInputsChange,
  assumptions,
  onAssumptionsChange,
  onSave,
  onExport,
  onDelete,
  saving,
  exporting,
  readOnly,
}: {
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  inputs: ValueInputs;
  onInputsChange: (v: ValueInputs) => void;
  assumptions: string;
  onAssumptionsChange: (v: string) => void;
  onSave: () => void;
  onExport: (lang: "en" | "de" | "ro") => void;
  onDelete?: () => void;
  saving?: boolean;
  exporting?: boolean;
  readOnly?: boolean;
}) {
  const [reportLang, setReportLang] = useState<"en" | "de" | "ro">("en");
  const result = useMemo(() => computeValue(inputs), [inputs]);
  const three = useMemo(() => scenarios(inputs), [inputs]);
  const money = (n: number) => formatMoney(n, inputs.currency);

  const patch = (p: Partial<ValueInputs>) => onInputsChange({ ...inputs, ...p });
  const patchQuick = (p: Partial<ValueInputs["quick"]>) =>
    onInputsChange({ ...inputs, quick: { ...inputs.quick, ...p } });

  const driverValue = (key: ValueDriverKey) =>
    inputs.drivers.find((d) => d.key === key) ?? { key, currentCost: 0, impactPct: 30 };

  const setDriver = (key: ValueDriverKey, p: { currentCost?: number; impactPct?: number }) => {
    const existing = inputs.drivers.find((d) => d.key === key);
    const next = existing
      ? inputs.drivers.map((d) => (d.key === key ? { ...d, ...p } : d))
      : [...inputs.drivers, { ...driverValue(key), ...p }];
    patch({ drivers: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-64 flex-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Customer</Label>
          <Input
            className="mt-1"
            value={companyName}
            disabled={readOnly}
            placeholder="Customer name"
            onChange={(e) => onCompanyNameChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(inputs.level)}
            onValueChange={(v) => patch({ level: Number(v) as 1 | 2 | 3 })}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Level 1 — Quick estimate</SelectItem>
              <SelectItem value="2">Level 2 — Operational value</SelectItem>
              <SelectItem value="3">Level 3 — Value score</SelectItem>
            </SelectContent>
          </Select>
          <Select value={inputs.currency} onValueChange={(v) => patch({ currency: v })}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["EUR", "RON", "USD", "GBP", "CHF"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reportLang} onValueChange={(v) => setReportLang(v as "en" | "de" | "ro")}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="ro">Română</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => onExport(reportLang)} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Preparing…" : "Value report"}
          </Button>
          {!readOnly && (
            <Button onClick={onSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
          {onDelete && !readOnly && (
            <Button variant="outline" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Operational profile" icon={Sparkles}>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Employees affected"
              value={inputs.quick.employees}
              onChange={(n) => patchQuick({ employees: n })}
            />
            <NumberField
              label={`Average cost per hour (${inputs.currency})`}
              value={inputs.quick.hourlyCost}
              onChange={(n) => patchQuick({ hourlyCost: n })}
            />
            <NumberField
              label="Minutes lost per day"
              value={inputs.quick.minutesPerDay}
              onChange={(n) => patchQuick({ minutesPerDay: n })}
              step={5}
            />
            <NumberField
              label="Working days per year"
              value={inputs.quick.workingDays}
              onChange={(n) => patchQuick({ workingDays: n })}
            />
            <NumberField
              label={`OPSQAI annual investment (${inputs.currency})`}
              value={inputs.investment}
              onChange={(n) => patch({ investment: n })}
              step={500}
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Estimated OPSQAI impact
              </Label>
              <span className="text-sm font-semibold">{inputs.quick.improvementPct}%</span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={80}
              step={5}
              value={[inputs.quick.improvementPct]}
              onValueChange={([v]) => patchQuick({ improvementPct: v ?? 0 })}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Move the slider during the meeting — every figure recalculates live. Nothing here is a
              promised saving; it is the customer's own arithmetic.
            </p>
          </div>

          {inputs.level === 3 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Likelihood
                  </Label>
                  <span className="text-sm font-semibold">{inputs.likelihoodPct}%</span>
                </div>
                <Slider
                  className="mt-3"
                  min={0}
                  max={100}
                  step={5}
                  value={[inputs.likelihoodPct]}
                  onValueChange={([v]) => patch({ likelihoodPct: v ?? 0 })}
                />
              </div>
              <NumberField
                label="Time to value (months)"
                value={inputs.timeToValueMonths}
                onChange={(n) => patch({ timeToValueMonths: n })}
              />
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Implementation effort
                </Label>
                <Select
                  value={inputs.effort}
                  onValueChange={(v) => patch({ effort: v as EffortLevel })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="Current annual loss" value={money(result.currentTotal)} />
            <Kpi label="Potential annual value" value={money(result.potentialValue)} />
            <Kpi
              label="Expected annual value"
              value={money(result.expectedValue)}
              hint={`${result.likelihoodPct}% likelihood`}
            />
            <Kpi
              label="Value multiple"
              value={`${result.valueMultiple.toFixed(2)}×`}
              hint={`ROI ${result.roiPct.toFixed(0)}%`}
            />
          </div>

          <Panel title="Value score">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={result.score.label === "low" ? "outline" : "secondary"}>
                {result.score.label.replace("-", " ")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Net {money(result.netValue)} · Operational improvement{" "}
                {result.operationalImprovementPct.toFixed(1)}% ·{" "}
                {result.paybackMonths == null
                  ? "no payback"
                  : `payback ${result.paybackMonths.toFixed(1)} months`}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Scenario</th>
                    <th className="py-2">Impact</th>
                    <th className="py-2">Potential</th>
                    <th className="py-2">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {three.map((s) => (
                    <tr key={s.label} className="border-t border-border/60">
                      <td className="py-2 capitalize">{s.label}</td>
                      <td className="py-2">{s.impactPct}%</td>
                      <td className="py-2">{money(s.result.potentialValue)}</td>
                      <td className="py-2">{money(s.result.expectedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {inputs.level >= 2 && (
        <Panel title="Value drivers">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Driver</th>
                  <th className="py-2">Current annual cost</th>
                  <th className="py-2">Impact %</th>
                  <th className="py-2 text-right">Estimated value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60">
                  <td className="py-2">{DRIVER_LABELS.search}</td>
                  <td className="py-2">{money(result.searchLoss)}</td>
                  <td className="py-2">{inputs.quick.improvementPct}%</td>
                  <td className="py-2 text-right font-medium">
                    {money(result.drivers[0]?.value ?? 0)}
                  </td>
                </tr>
                {EXTRA_DRIVERS.map((key) => {
                  const d = driverValue(key);
                  const value = (d.currentCost * d.impactPct) / 100;
                  return (
                    <tr key={key} className="border-t border-border/60">
                      <td className="py-2">{DRIVER_LABELS[key]}</td>
                      <td className="py-2">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          className="h-9 w-36"
                          value={d.currentCost}
                          onChange={(e) =>
                            setDriver(key, {
                              currentCost: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-9 w-24"
                          value={d.impactPct}
                          onChange={(e) =>
                            setDriver(key, {
                              impactPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                            })
                          }
                        />
                      </td>
                      <td className="py-2 text-right font-medium">{money(value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="Assumptions & notes">
        <Textarea
          rows={4}
          value={assumptions}
          disabled={readOnly}
          placeholder="Where the figures come from, who provided them, what is still to be confirmed."
          onChange={(e) => onAssumptionsChange(e.target.value)}
        />
      </Panel>
    </div>
  );
}
