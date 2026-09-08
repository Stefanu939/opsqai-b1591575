// OPSQAI HR — jurisdiction, employee numbering and reference data.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Plus, Settings, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteHrRef, saveHrRef, saveHrSettings } from "@/lib/hr.functions";
import type { HrCountry, HrRef, HrSettings } from "@/lib/hr/types";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import type { HrUi } from "@/i18n/pages/hr";
import { useT } from "@/i18n";
import { useHrOverview, useHrRefresh } from "./use-hr";
import { HrFailure, HrLoading, HrWarnings } from "./query-state";
import { hrRetryLabel, hrWarningsTitle } from "./state-labels";

const COUNTRIES: Array<{ value: HrCountry; label: string }> = [
  { value: "de", label: "Deutschland (DE)" },
  { value: "ro", label: "România (RO)" },
  { value: "generic", label: "Generic / EU" },
];

export function HrSettingsSection({ t, w }: { t: HrUi; w?: HrWsUi }) {
  const { lang } = useT();
  const query = useHrOverview();
  const refresh = useHrRefresh();
  const saveSettings = useServerFn(saveHrSettings);
  const [prefix, setPrefix] = useState("EMP");

  useEffect(() => {
    if (query.data?.settings.employee_prefix) setPrefix(query.data.settings.employee_prefix);
  }, [query.data?.settings.employee_prefix]);

  if (query.isPending) return <HrLoading label={`${t.referenceData}…`} />;
  if (query.error) {
    return (
      <HrFailure
        title={t.referenceData}
        message={(query.error as Error).message}
        retryLabel={hrRetryLabel(lang)}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const data = query.data;
  if (!data) return <EmptyState title={t.referenceData} />;

  const canEdit = data.grants.includes("settings");

  return (
    <div className="grid gap-4">
      <Panel icon={Settings} title={t.referenceData} description={t.jurisdiction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>{t.jurisdiction}</Label>
            <Select
              value={data.settings.country}
              disabled={!canEdit}
              onValueChange={(v) =>
                void saveSettings({ data: { country: v as HrCountry } })
                  .then(() => {
                    toast.success(t.saved);
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hr-prefix">{t.employeeId}</Label>
            <div className="flex gap-2">
              <Input
                id="hr-prefix"
                value={prefix}
                disabled={!canEdit}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              />
              <Button
                variant="outline"
                disabled={!canEdit}
                onClick={() =>
                  void saveSettings({ data: { employee_prefix: prefix.trim() } })
                    .then(() => {
                      toast.success(t.saved);
                      void refresh();
                    })
                    .catch((e: Error) => toast.error(e.message))
                }
              >
                {t.save}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {w ? <ExtendedSettings s={data.settings} w={w} t={t} canEdit={canEdit} onChanged={refresh} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <RefPanel
          t={t}
          title={t.department}
          addLabel={t.addDepartment}
          kind="departments"
          items={data.refs.departments}
          canEdit={canEdit}
          onChanged={refresh}
        />
        <RefPanel
          t={t}
          title={t.position}
          addLabel={t.addPosition}
          kind="positions"
          items={data.refs.positions}
          canEdit={canEdit}
          onChanged={refresh}
        />
        <RefPanel
          t={t}
          title={t.location}
          addLabel={t.addLocation}
          kind="locations"
          items={data.refs.locations}
          canEdit={canEdit}
          onChanged={refresh}
        />
      </div>
    </div>
  );
}

function RefPanel({
  t,
  title,
  addLabel,
  kind,
  items,
  canEdit,
  onChanged,
}: {
  t: HrUi;
  title: string;
  addLabel: string;
  kind: "departments" | "positions" | "locations";
  items: HrRef[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const save = useServerFn(saveHrRef);
  const remove = useServerFn(deleteHrRef);
  const [name, setName] = useState("");

  return (
    <Panel icon={Building2} title={title}>
      {canEdit ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void save({ data: { kind, name: name.trim() } })
              .then(() => {
                setName("");
                toast.success(t.saved);
                onChanged();
              })
              .catch((err: Error) => toast.error(err.message));
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={addLabel} />
          <Button type="submit" size="icon" variant="outline" aria-label={addLabel}>
            <Plus className="size-4" />
          </Button>
        </form>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 text-sm"
            >
              <span className="truncate text-foreground">{item.name}</span>
              {canEdit ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t.remove}
                  onClick={() =>
                    void remove({ data: { kind, id: item.id } })
                      .then(() => onChanged())
                      .catch((err: Error) => toast.error(err.message))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}


function ExtendedSettings({
  s,
  w,
  t,
  canEdit,
  onChanged,
}: {
  s: HrSettings;
  w: HrWsUi;
  t: HrUi;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const saveSettings = useServerFn(saveHrSettings);
  const [f, setF] = useState({
    default_language: s.default_language as "en" | "de" | "ro",
    probation_months: String(s.probation_months),
    notice_weeks: String(s.notice_weeks),
    vacation_days: String(s.vacation_days),
    weekly_hours: String(s.weekly_hours),
    contract_alert_days: String(s.contract_alert_days),
    document_alert_days: String(s.document_alert_days),
    auto_onboarding: s.auto_onboarding,
    blind_screening: s.blind_screening,
    retention_months_after_exit: String(s.retention_months_after_exit),
    company_legal_name: s.company_legal_name ?? "",
    company_address: s.company_address ?? "",
    company_signatory: s.company_signatory ?? "",
  });
  const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && v.trim() !== "" ? Number(v) : fallback);
  const save = () =>
    void saveSettings({
      data: {
        default_language: f.default_language,
        probation_months: Math.round(num(f.probation_months, s.probation_months)),
        notice_weeks: Math.round(num(f.notice_weeks, s.notice_weeks)),
        vacation_days: Math.round(num(f.vacation_days, s.vacation_days)),
        weekly_hours: num(f.weekly_hours, s.weekly_hours),
        contract_alert_days: Math.round(num(f.contract_alert_days, s.contract_alert_days)),
        document_alert_days: Math.round(num(f.document_alert_days, s.document_alert_days)),
        auto_onboarding: f.auto_onboarding,
        blind_screening: f.blind_screening,
        retention_months_after_exit: Math.round(num(f.retention_months_after_exit, s.retention_months_after_exit)),
        company_legal_name: f.company_legal_name.trim() || null,
        company_address: f.company_address.trim() || null,
        company_signatory: f.company_signatory.trim() || null,
      },
    })
      .then(() => {
        toast.success(t.saved);
        onChanged();
      })
      .catch((e: Error) => toast.error(e.message));
  const N = (key: keyof typeof f, label: string, step = "1") => (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input type="number" step={step} value={String(f[key])} disabled={!canEdit} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </div>
  );
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Settings} title={w.contractDefaults}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{w.defaultLanguage}</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={f.default_language}
                disabled={!canEdit}
                onChange={(e) => setF({ ...f, default_language: e.target.value as "en" | "de" | "ro" })}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ro">Română</option>
              </select>
            </div>
            {N("probation_months", w.probationMonths)}
            {N("notice_weeks", w.noticeWeeks)}
            {N("vacation_days", w.vacationDays)}
            {N("weekly_hours", w.weeklyHours, "0.5")}
          </div>
        </Panel>
        <Panel icon={Settings} title={w.alertsThresholds}>
          <div className="grid gap-3 sm:grid-cols-2">
            {N("contract_alert_days", w.contractAlertDays)}
            {N("document_alert_days", w.documentAlertDays)}
            {N("retention_months_after_exit", "Retention (months after exit)")}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.auto_onboarding} disabled={!canEdit} onChange={(e) => setF({ ...f, auto_onboarding: e.target.checked })} />
            {w.autoOnboarding}
          </label>
          <p className="ml-6 text-xs text-muted-foreground">{w.autoOnboardingHint}</p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.blind_screening} disabled={!canEdit} onChange={(e) => setF({ ...f, blind_screening: e.target.checked })} />
            Blind screening
          </label>
        </Panel>
      </div>
      <Panel
        icon={Building2}
        title={w.companyIdentity}
        actions={canEdit ? <Button size="sm" onClick={save}>{t.save}</Button> : null}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>{w.companyLegalName}</Label>
            <Input value={f.company_legal_name} disabled={!canEdit} onChange={(e) => setF({ ...f, company_legal_name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>{w.companyAddress}</Label>
            <Input value={f.company_address} disabled={!canEdit} onChange={(e) => setF({ ...f, company_address: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>{w.companySignatory}</Label>
            <Input value={f.company_signatory} disabled={!canEdit} onChange={(e) => setF({ ...f, company_signatory: e.target.value })} />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{w.identityHint}</p>
      </Panel>
    </>
  );
}
