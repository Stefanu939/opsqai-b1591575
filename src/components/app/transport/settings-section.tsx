// Transport settings: country/language pack, time and week handling, alert
// windows (global and per document type), audit rules, map defaults, GPS
// polling and the per-user rights an Admin or SuperAdmin grants here.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe2, Map as MapIcon, Settings, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveTransportSettings, setTransportGrant } from "@/lib/transport.functions";
import { COUNTRY_OPTIONS, countryPack } from "@/lib/transport/country-packs";
import { TRANSPORT_GRANTS } from "@/lib/transport/types";
import { useTransportRefresh, useTransportSettings } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";

type Ui = ReturnType<typeof transportUi>;

const TIMEZONES = [
  "Europe/Bucharest",
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/London",
  "UTC",
];

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export function SettingsSection({ t }: { t: Ui }) {
  const query = useTransportSettings();
  const refresh = useTransportRefresh();
  const save = useServerFn(saveTransportSettings);
  const grant = useServerFn(setTransportGrant);

  const [form, setForm] = useState({
    country: "generic",
    language: "en" as "en" | "de" | "ro",
    units: "metric" as "metric" | "imperial",
    alertWindows: "30,60,90",
    docAlertWindows: {} as Record<string, number>,
    mapEnabled: true,
    cmrPrefix: "CMR",
    timezone: "Europe/Berlin",
    weekStart: 1,
    auditDay: 1,
    auditRequired: true,
    mapCenterLat: "",
    mapCenterLng: "",
    mapZoom: 5,
    liveTracking: true,
    gpsPollMinutes: 10,
    searchProvider: "auto" as "auto" | "osm" | "off",
  });

  useEffect(() => {
    const s = query.data?.settings;
    if (!s) return;
    setForm({
      country: s.country,
      language: (s.language as "en" | "de" | "ro") ?? "en",
      units: s.units,
      alertWindows: s.alertWindows.join(","),
      docAlertWindows: s.docAlertWindows ?? {},
      mapEnabled: s.mapEnabled,
      cmrPrefix: s.cmrPrefix,
      timezone: s.timezone,
      weekStart: s.weekStart,
      auditDay: s.auditDay,
      auditRequired: s.auditRequired,
      mapCenterLat: s.mapCenterLat == null ? "" : String(s.mapCenterLat),
      mapCenterLng: s.mapCenterLng == null ? "" : String(s.mapCenterLng),
      mapZoom: s.mapZoom,
      liveTracking: s.liveTracking,
      gpsPollMinutes: s.gpsPollMinutes,
      searchProvider: s.searchProvider,
    });
  }, [query.data?.settings]);

  const canEdit = query.data?.grants.includes("settings") ?? false;
  const canManage = query.data?.canManageGrants ?? false;
  const pack = countryPack(form.country);
  const lang = form.language;

  const submit = () => {
    const lat = Number(form.mapCenterLat);
    const lng = Number(form.mapCenterLng);
    void save({
      data: {
        country: form.country,
        language: form.language,
        units: form.units,
        alertWindows: form.alertWindows
          .split(",")
          .map((n) => Number(n.trim()))
          .filter((n) => Number.isFinite(n) && n > 0),
        docAlertWindows: form.docAlertWindows,
        mapEnabled: form.mapEnabled,
        cmrPrefix: form.cmrPrefix,
        timezone: form.timezone,
        weekStart: form.weekStart,
        auditDay: form.auditDay,
        auditRequired: form.auditRequired,
        mapCenterLat: Number.isFinite(lat) && form.mapCenterLat !== "" ? lat : null,
        mapCenterLng: Number.isFinite(lng) && form.mapCenterLng !== "" ? lng : null,
        mapZoom: form.mapZoom,
        liveTracking: form.liveTracking,
        gpsPollMinutes: form.gpsPollMinutes,
        searchProvider: form.searchProvider,
      },
    })
      .then(() => {
        toast.success(t.save);
        refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="grid gap-4">
      <Panel
        icon={Globe2}
        title={t.settings}
        description={t.settingsBody}
        actions={
          canEdit ? (
            <Button size="sm" onClick={submit}>
              {t.save}
            </Button>
          ) : (
            <Badge variant="outline">{t.noRight}</Badge>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">{t.countryPack}</Label>
            <Select
              value={form.country}
              onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}
              disabled={!canEdit}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t.language}</Label>
            <Select
              value={form.language}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, language: v as "en" | "de" | "ro" }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="ro">Română</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t.units}</Label>
            <Select
              value={form.units}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, units: v as "metric" | "imperial" }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">km / kg</SelectItem>
                <SelectItem value="imperial">mi / lb</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t.timezone}</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              disabled={!canEdit}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t.weekStart}</Label>
            <Select
              value={String(form.weekStart)}
              onValueChange={(v) => setForm((f) => ({ ...f, weekStart: Number(v) }))}
              disabled={!canEdit}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t.cmrPrefix}</Label>
            <Input
              className="mt-1"
              value={form.cmrPrefix}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, cmrPrefix: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">{t.alertWindows}</Label>
            <Input
              className="mt-1"
              value={form.alertWindows}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, alertWindows: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-xs">{t.docAlerts}</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {pack.docTypes.map((d) => (
              <div key={d.key} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {d.label[lang] ?? d.label.en}
                </span>
                <Input
                  className="h-8 w-20"
                  type="number"
                  min={1}
                  max={365}
                  disabled={!canEdit}
                  value={form.docAlertWindows[d.key] ?? ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = { ...f.docAlertWindows };
                      const n = Number(e.target.value);
                      if (!e.target.value || !Number.isFinite(n) || n <= 0) {
                        delete next[d.key];
                      } else {
                        next[d.key] = Math.min(365, Math.round(n));
                      }
                      return { ...f, docAlertWindows: next };
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.auditRequired}
              disabled={!canEdit}
              onCheckedChange={(v) => setForm((f) => ({ ...f, auditRequired: v }))}
            />
            <Label className="text-xs">{t.auditRequired}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">{t.auditDay}</Label>
            <Select
              value={String(form.auditDay)}
              onValueChange={(v) => setForm((f) => ({ ...f, auditDay: Number(v) }))}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      <Panel
        icon={MapIcon}
        title={t.mapDefaults}
        description={t.mapBody}
        actions={
          canEdit ? (
            <Button size="sm" onClick={submit}>
              {t.save}
            </Button>
          ) : null
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">{`${t.mapCenter} · ${t.latitude}`}</Label>
            <Input
              className="mt-1"
              value={form.mapCenterLat}
              disabled={!canEdit}
              placeholder="48.5"
              onChange={(e) => setForm((f) => ({ ...f, mapCenterLat: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">{`${t.mapCenter} · ${t.longitude}`}</Label>
            <Input
              className="mt-1"
              value={form.mapCenterLng}
              disabled={!canEdit}
              placeholder="15.5"
              onChange={(e) => setForm((f) => ({ ...f, mapCenterLng: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">{t.mapZoom}</Label>
            <Input
              className="mt-1"
              type="number"
              min={2}
              max={18}
              value={form.mapZoom}
              disabled={!canEdit}
              onChange={(e) =>
                setForm((f) => ({ ...f, mapZoom: Number(e.target.value) || 5 }))
              }
            />
          </div>
          <div>
            <Label className="text-xs">{t.searchProvider}</Label>
            <Select
              value={form.searchProvider}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, searchProvider: v as "auto" | "osm" | "off" }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="osm">OpenStreetMap</SelectItem>
                <SelectItem value="off">{t.close}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t.pollMinutes}</Label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={120}
              value={form.gpsPollMinutes}
              disabled={!canEdit}
              onChange={(e) =>
                setForm((f) => ({ ...f, gpsPollMinutes: Number(e.target.value) || 10 }))
              }
            />
          </div>
          <div className="flex items-end gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.mapEnabled}
                disabled={!canEdit}
                onCheckedChange={(v) => setForm((f) => ({ ...f, mapEnabled: v }))}
              />
              <Label className="text-xs">{t.mapEnabled}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.liveTracking}
                disabled={!canEdit}
                onCheckedChange={(v) => setForm((f) => ({ ...f, liveTracking: v }))}
              />
              <Label className="text-xs">{t.liveTracking}</Label>
            </div>
          </div>
        </div>
      </Panel>

      <Panel icon={ShieldCheck} title={t.rights} description={t.rightsBody}>
        {!canManage ? (
          <EmptyState title={t.noRight} description={t.rightsBody} />
        ) : !query.data?.members.length ? (
          <EmptyState title={t.none} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2">{t.fullName}</th>
                  {TRANSPORT_GRANTS.map((g) => (
                    <th key={g} className="py-2 text-center capitalize">
                      {g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.members.map((m) => {
                  const own =
                    query.data?.memberGrants.find((x) => x.userId === m.id)?.grants ?? [];
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-2">
                        {m.name}
                        {m.email ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {m.email}
                          </span>
                        ) : null}
                      </td>
                      {TRANSPORT_GRANTS.map((g) => (
                        <td key={g} className="py-2 text-center">
                          <Switch
                            checked={own.includes(g)}
                            onCheckedChange={(enabled) => {
                              void grant({
                                data: { userId: m.id, grant: g, enabled },
                              })
                                .then(() => refresh())
                                .catch((e: Error) => toast.error(e.message));
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
