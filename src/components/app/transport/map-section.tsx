// Transport map section: an always-visible global map with combined search
// (places + fleet), layer filters, heat view, live GPS devices and manual
// positioning for records that have no coordinates yet.
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin as PinIcon, Radio, Search } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteTransportGpsDevice,
  getVehicleTrack,
  recordVehiclePosition,
  saveTransportGpsDevice,
  searchTransportPlaces,
  syncTransportGps,
} from "@/lib/transport.functions";
import { useTransportMapData, useTransportRefresh } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";
import type { MapPin } from "@/lib/transport/types";

const TransportMap = lazy(() => import("./transport-map"));

type Ui = ReturnType<typeof transportUi>;

const KINDS: Array<MapPin["kind"]> = ["vehicle", "driver", "carrier", "incident"];

const PROVIDERS = ["manual", "tcomm", "webfleet", "wialon", "traccar", "other"] as const;

export function MapSection({ t }: { t: Ui }) {
  const map = useTransportMapData();
  const refresh = useTransportRefresh();
  const search = useServerFn(searchTransportPlaces);
  const trackFn = useServerFn(getVehicleTrack);
  const saveDevice = useServerFn(saveTransportGpsDevice);
  const removeDevice = useServerFn(deleteTransportGpsDevice);
  const sync = useServerFn(syncTransportGps);
  const position = useServerFn(recordVehiclePosition);

  const [active, setActive] = useState<Record<string, boolean>>({
    vehicle: true,
    driver: true,
    carrier: true,
    incident: true,
  });
  const [heat, setHeat] = useState(false);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<{ lat: number; lng: number; label?: string } | null>(
    null,
  );
  const [places, setPlaces] = useState<
    Array<{ lat: number; lng: number; label: string }>
  >([]);
  const [track, setTrack] = useState<Array<{ lat: number; lng: number }>>([]);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [target, setTarget] = useState<string>("");
  const [device, setDevice] = useState({
    provider: "manual" as (typeof PROVIDERS)[number],
    deviceId: "",
    vehicleId: "",
    apiBaseUrl: "",
    apiToken: "",
  });

  const settings = map.data?.settings;
  const vehicles = map.data?.vehicles ?? [];
  const devices = map.data?.devices ?? [];

  const pins = useMemo(
    () => (map.data?.pins ?? []).filter((p) => active[p.kind]),
    [map.data?.pins, active],
  );

  const fleetHits = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return (map.data?.pins ?? [])
      .filter(
        (p) =>
          p.label.toLowerCase().includes(term) ||
          (p.sub ?? "").toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [query, map.data?.pins]);

  const missing = useMemo(
    () => vehicles.filter((v) => v.latitude == null || v.longitude == null),
    [vehicles],
  );

  // Live tracking: refetch the map while the installation asks for it.
  useQuery({
    queryKey: ["transport", "gps-tick"],
    enabled: Boolean(settings?.liveTracking),
    refetchInterval: Math.max(1, settings?.gpsPollMinutes ?? 10) * 60_000,
    queryFn: async () => {
      await sync().catch(() => null);
      refresh();
      return Date.now();
    },
  });

  const runSearch = () => {
    void search({ data: { query: query.trim() } })
      .then((res) => {
        setPlaces(res.hits);
        const first = res.hits[0];
        if (first) setFocus({ lat: first.lat, lng: first.lng, label: first.label });
        else if (!fleetHits.length) toast.info(t.none);
      })
      .catch((e: Error) => toast.error(e.message));
  };

  if (settings && !settings.mapEnabled) {
    return (
      <Panel icon={PinIcon} title={t.map} description={t.mapBody}>
        <EmptyState title={t.mapDisabled} description={t.settingsBody} />
      </Panel>
    );
  }

  return (
    <div className="grid gap-4">
      <Panel
        icon={PinIcon}
        title={t.map}
        description={t.mapBody}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {KINDS.map((k) => (
              <Button
                key={k}
                size="sm"
                variant={active[k] ? "default" : "outline"}
                onClick={() => setActive((a) => ({ ...a, [k]: !a[k] }))}
              >
                {k === "vehicle"
                  ? t.vehicles
                  : k === "driver"
                    ? t.drivers
                    : k === "carrier"
                      ? t.carriers
                      : t.openIncidents}
              </Button>
            ))}
            <div className="ml-2 flex items-center gap-2">
              <Switch id="heat" checked={heat} onCheckedChange={setHeat} />
              <Label htmlFor="heat" className="text-xs">
                {t.layers}
              </Label>
            </div>
          </div>
        }
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            placeholder={t.searchAll}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
          <Button size="sm" disabled={query.trim().length < 2} onClick={runSearch}>
            <Search className="mr-1.5 size-3.5" />
            {t.searchPlace}
          </Button>
        </div>

        {fleetHits.length || places.length ? (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {fleetHits.length ? (
              <div className="rounded-lg border border-border p-2">
                <p className="mb-1 text-xs text-muted-foreground">{t.searchFleet}</p>
                <ul className="space-y-1">
                  {fleetHits.map((h) => (
                    <li key={`${h.kind}-${h.id}`}>
                      <button
                        type="button"
                        className="w-full rounded px-1 py-0.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setFocus({ lat: h.lat, lng: h.lng, label: h.label });
                          setTrack([]);
                        }}
                      >
                        {h.label}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {h.sub ?? h.kind}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {places.length ? (
              <div className="rounded-lg border border-border p-2">
                <p className="mb-1 text-xs text-muted-foreground">{t.results}</p>
                <ul className="space-y-1">
                  {places.map((p) => (
                    <li key={`${p.lat}-${p.lng}-${p.label}`}>
                      <button
                        type="button"
                        className="w-full truncate rounded px-1 py-0.5 text-left text-sm hover:bg-muted"
                        onClick={() =>
                          setFocus({ lat: p.lat, lng: p.lng, label: p.label })
                        }
                      >
                        {p.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <Suspense
          fallback={<div className="h-[560px] rounded-lg border border-border" />}
        >
          <TransportMap
            pins={pins}
            zones={map.data?.zones ?? []}
            heat={heat}
            center={
              settings?.mapCenterLat != null && settings?.mapCenterLng != null
                ? [settings.mapCenterLat, settings.mapCenterLng]
                : null
            }
            zoom={settings?.mapZoom ?? 5}
            focus={focus}
            track={track}
            onPick={(lat, lng) => setPicked({ lat, lng })}
          />
        </Suspense>

        {picked ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
            <span className="font-mono text-xs">
              {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
            </span>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 w-56">
                <SelectValue placeholder={t.vehicle} />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!target}
              onClick={() => {
                void position({
                  data: { vehicleId: target, lat: picked.lat, lng: picked.lng },
                })
                  .then(() => {
                    toast.success(t.setPosition);
                    setPicked(null);
                    refresh();
                  })
                  .catch((e: Error) => toast.error(e.message));
              }}
            >
              {t.setPosition}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
              {t.cancel}
            </Button>
          </div>
        ) : null}
      </Panel>

      <Panel
        icon={Radio}
        title={t.gps}
        description={t.gpsBody}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void sync()
                .then((r) => {
                  toast.success(`${t.syncNow}: ${r.updated}/${r.updated + r.failed}`);
                  refresh();
                })
                .catch((e: Error) => toast.error(e.message));
            }}
          >
            {t.syncNow}
          </Button>
        }
      >
        <div className="grid gap-2 sm:grid-cols-5">
          <Select
            value={device.provider}
            onValueChange={(v) =>
              setDevice((d) => ({ ...d, provider: v as (typeof PROVIDERS)[number] }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t.provider} />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === "manual" ? t.setPosition : p.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t.deviceId}
            value={device.deviceId}
            onChange={(e) => setDevice((d) => ({ ...d, deviceId: e.target.value }))}
          />
          <Select
            value={device.vehicleId}
            onValueChange={(v) => setDevice((d) => ({ ...d, vehicleId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.vehicle} />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t.apiBaseUrl}
            value={device.apiBaseUrl}
            onChange={(e) => setDevice((d) => ({ ...d, apiBaseUrl: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              placeholder={t.apiToken}
              type="password"
              value={device.apiToken}
              onChange={(e) => setDevice((d) => ({ ...d, apiToken: e.target.value }))}
            />
            <Button
              size="sm"
              disabled={device.deviceId.trim().length < 1}
              onClick={() => {
                void saveDevice({
                  data: {
                    provider: device.provider,
                    deviceId: device.deviceId.trim(),
                    vehicleId: device.vehicleId || null,
                    apiBaseUrl: device.apiBaseUrl || null,
                    apiToken: device.apiToken || null,
                  },
                })
                  .then(() => {
                    toast.success(t.addDevice);
                    setDevice({
                      provider: "manual",
                      deviceId: "",
                      vehicleId: "",
                      apiBaseUrl: "",
                      apiToken: "",
                    });
                    refresh();
                  })
                  .catch((e: Error) => toast.error(e.message));
              }}
            >
              {t.add}
            </Button>
          </div>
        </div>

        {devices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t.noGps}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="text-sm font-medium">
                  {d.vehicle_plate ?? d.label ?? d.device_id}
                </span>
                <Badge variant="outline">{d.provider}</Badge>
                {d.last_error ? (
                  <Badge variant="destructive">{d.last_error}</Badge>
                ) : d.last_fix_at ? (
                  <span className="text-xs text-muted-foreground">
                    {t.lastFix}: {new Date(d.last_fix_at).toLocaleString()}
                  </span>
                ) : null}
                <div className="ml-auto flex gap-2">
                  {d.vehicle_id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void trackFn({ data: { vehicleId: d.vehicle_id as string } })
                          .then((r) => {
                            setTrack(r.track);
                            const last = r.track[r.track.length - 1];
                            if (last) setFocus({ lat: last.lat, lng: last.lng });
                          })
                          .catch((e: Error) => toast.error(e.message));
                      }}
                    >
                      {t.showTrack}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void removeDevice({ data: { id: d.id } })
                        .then(() => refresh())
                        .catch((e: Error) => toast.error(e.message));
                    }}
                  >
                    {t.remove}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel icon={PinIcon} title={t.offlineList}>
        {missing.length === 0 ? (
          <EmptyState title={t.none} />
        ) : (
          <ul className="divide-y divide-border">
            {missing.slice(0, 30).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm">{v.plate}</span>
                <Badge variant="outline">{t.vehicle}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
