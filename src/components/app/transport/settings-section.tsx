// Transport settings: country/language pack, alert windows, map behaviour and
// the per-user rights an Admin or SuperAdmin grants inside this installation.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Settings, ShieldCheck } from "lucide-react";
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
import { COUNTRY_OPTIONS } from "@/lib/transport/country-packs";
import { TRANSPORT_GRANTS } from "@/lib/transport/types";
import { useTransportRefresh, useTransportSettings } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";

type Ui = ReturnType<typeof transportUi>;

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
    mapEnabled: true,
    mapTileUrl: "",
    geocodeUrl: "",
    allowExternalLookups: false,
    cmrPrefix: "CMR",
  });

  useEffect(() => {
    const s = query.data?.settings;
    if (!s) return;
    setForm({
      country: s.country,
      language: (s.language as "en" | "de" | "ro") ?? "en",
      units: s.units,
      alertWindows: s.alertWindows.join(","),
      mapEnabled: s.mapEnabled,
      mapTileUrl: s.mapTileUrl ?? "",
      geocodeUrl: s.geocodeUrl ?? "",
      allowExternalLookups: s.allowExternalLookups,
      cmrPrefix: s.cmrPrefix,
    });
  }, [query.data?.settings]);

  const canEdit = query.data?.grants.includes("settings") ?? false;
  const canManage = query.data?.canManageGrants ?? false;

  const submit = () => {
    void save({
      data: {
        country: form.country,
        language: form.language,
        units: form.units,
        alertWindows: form.alertWindows
          .split(",")
          .map((n) => Number(n.trim()))
          .filter((n) => Number.isFinite(n) && n > 0),
        mapEnabled: form.mapEnabled,
        mapTileUrl: form.mapTileUrl || null,
        geocodeUrl: form.geocodeUrl || null,
        allowExternalLookups: form.allowExternalLookups,
        cmrPrefix: form.cmrPrefix,
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
        icon={Settings}
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
        <div className="grid gap-3 sm:grid-cols-2">
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
            <Label className="text-xs">{t.alertWindows}</Label>
            <Input
              className="mt-1"
              value={form.alertWindows}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, alertWindows: e.target.value }))}
            />
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
          <div>
            <Label className="text-xs">{t.mapTileUrl}</Label>
            <Input
              className="mt-1"
              value={form.mapTileUrl}
              disabled={!canEdit}
              placeholder="https://tiles.example/{z}/{x}/{y}.png"
              onChange={(e) => setForm((f) => ({ ...f, mapTileUrl: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">{t.geocodeUrl}</Label>
            <Input
              className="mt-1"
              value={form.geocodeUrl}
              disabled={!canEdit}
              placeholder="https://nominatim.example/search?q={q}&format=json&limit=1"
              onChange={(e) => setForm((f) => ({ ...f, geocodeUrl: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-6 sm:col-span-2">
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
                checked={form.allowExternalLookups}
                disabled={!canEdit}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, allowExternalLookups: v }))
                }
              />
              <Label className="text-xs">{t.allowExternal}</Label>
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
