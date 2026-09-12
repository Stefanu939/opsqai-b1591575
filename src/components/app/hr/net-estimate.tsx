// OPSQAI HR — gross → net estimate inside the employee file.
// Runs entirely in the browser on the recorded gross salary, with the country
// details HR can adjust. Clearly marked as an estimate.
import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { estimateNet, netInputsFor, type NetCountry, type NetOptions } from "@/lib/hr/payroll-net";
import type { HrPayrollUi } from "@/i18n/pages/hr-payroll";
import { Field, StatCell, selectCls } from "./shared";

export function NetEstimateCard({
  gross,
  currency,
  country,
  t,
}: {
  gross: number;
  currency: string;
  country: NetCountry;
  t: HrPayrollUi;
}) {
  const [grossInput, setGrossInput] = useState(gross ? String(gross) : "");
  const [opts, setOpts] = useState<NetOptions>({
    taxClass: 1,
    healthExtraRate: 1.7,
    churchTaxRate: 0,
    childless: false,
    children: 0,
    personalDeduction: 0,
    itExempt: false,
    taxRate: country === "ro" ? 10 : 0,
    contributionRate: 0,
    extraFixedDeduction: 0,
  });

  const value = Number(grossInput) || gross || 0;
  const result = useMemo(() => estimateNet(value, { ...opts, country }), [value, opts, country]);
  const fields = netInputsFor(country);
  const money = (v: number) => `${v.toFixed(2)} ${currency}`;
  const set = (patch: Partial<NetOptions>) => setOpts((o) => ({ ...o, ...patch }));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <Panel icon={Calculator} title={t.netTitle} description={t.netHint}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t.gross}>
          <Input type="number" step="0.01" value={grossInput} onChange={(e) => setGrossInput(e.target.value)} />
        </Field>
        <div className="sm:col-span-2 grid grid-cols-2 gap-3">
          <StatCell label={t.netNet} value={money(result.net)} />
          <StatCell label={t.netEmployerCost} value={money(result.employerCost)} />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium">{t.netSettings}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {fields.includes("taxClass") ? (
            <Field label={t.netFields["taxClass"] ?? "Tax class"}>
              <select
                className={selectCls}
                value={String(opts.taxClass ?? 1)}
                onChange={(e) => set({ taxClass: Number(e.target.value) as NonNullable<NetOptions["taxClass"]> })}
              >
                {[1, 2, 3, 4, 5, 6].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.includes("healthExtraRate") ? (
            <Field label={t.netFields["healthExtraRate"] ?? ""}>
              <Input type="number" step="0.1" value={String(opts.healthExtraRate ?? 0)} onChange={(e) => set({ healthExtraRate: num(e.target.value) })} />
            </Field>
          ) : null}
          {fields.includes("churchTaxRate") ? (
            <Field label={t.netFields["churchTaxRate"] ?? ""}>
              <select className={selectCls} value={String(opts.churchTaxRate ?? 0)} onChange={(e) => set({ churchTaxRate: num(e.target.value) })}>
                {[0, 8, 9].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.includes("children") ? (
            <Field label={t.netFields["children"] ?? ""}>
              <Input type="number" min="0" step="1" value={String(opts.children ?? 0)} onChange={(e) => set({ children: num(e.target.value) })} />
            </Field>
          ) : null}
          {fields.includes("personalDeduction") ? (
            <Field label={t.netFields["personalDeduction"] ?? ""}>
              <Input type="number" step="1" value={String(opts.personalDeduction ?? 0)} onChange={(e) => set({ personalDeduction: num(e.target.value) })} />
            </Field>
          ) : null}
          {fields.includes("taxRate") ? (
            <Field label={t.netFields["taxRate"] ?? ""}>
              <Input type="number" step="0.5" value={String(opts.taxRate ?? 0)} onChange={(e) => set({ taxRate: num(e.target.value) })} />
            </Field>
          ) : null}
          {fields.includes("contributionRate") ? (
            <Field label={t.netFields["contributionRate"] ?? ""}>
              <Input type="number" step="0.5" value={String(opts.contributionRate ?? 0)} onChange={(e) => set({ contributionRate: num(e.target.value) })} />
            </Field>
          ) : null}
          {fields.includes("extraFixedDeduction") ? (
            <Field label={t.netFields["extraFixedDeduction"] ?? ""}>
              <Input type="number" step="0.01" value={String(opts.extraFixedDeduction ?? 0)} onChange={(e) => set({ extraFixedDeduction: num(e.target.value) })} />
            </Field>
          ) : null}
          {fields.includes("childless") ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(opts.childless)} onChange={(e) => set({ childless: e.target.checked })} />
              {t.netFields["childless"]}
            </label>
          ) : null}
          {fields.includes("itExempt") ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(opts.itExempt)} onChange={(e) => set({ itExempt: e.target.checked })} />
              {t.netFields["itExempt"]}
            </label>
          ) : null}
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border/60 text-sm">
        {result.lines.map((l) => (
          <li key={`${l.code}-${l.kind}`} className="flex items-center gap-3 py-1.5">
            <span className="flex-1 truncate">
              {t.netLabels[l.code] ?? l.code}
              {l.rate ? <span className="ml-1 text-xs text-muted-foreground">{l.rate}%</span> : null}
            </span>
            <span className="tabular-nums">{l.kind === "info" ? `− ${money(l.amount)}` : money(l.amount)}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 py-1.5 font-medium">
          <span className="flex-1">{t.netContributions}</span>
          <span className="tabular-nums">{money(result.contributions)}</span>
        </li>
        <li className="flex items-center gap-3 py-1.5 font-medium">
          <span className="flex-1">{t.netTaxes}</span>
          <span className="tabular-nums">{money(result.taxes)}</span>
        </li>
        <li className="flex items-center gap-3 py-1.5 font-semibold">
          <span className="flex-1">{t.netNet}</span>
          <span className="tabular-nums">{money(result.net)}</span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t.netNotBinding}</p>
    </Panel>
  );
}
