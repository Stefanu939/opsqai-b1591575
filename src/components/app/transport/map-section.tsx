// Transport map section: layer filters, heat view, address lookup and an
// offline-friendly list of records that still have no coordinates.
import { lazy, Suspense, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin as PinIcon, Search } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { geocodeTransportPlace } from "@/lib/transport.functions";
import { useTransportMapData, useTransportRegisters } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";
import type { MapPin } from "@/lib/transport/types";

const TransportMap = lazy(() => import("./transport-map"));

type Ui = ReturnType<typeof transportUi>;

const KINDS: Array<MapPin["kind"]> = ["vehicle", "driver", "carrier", "incident"];

export function MapSection({ t }: { t: Ui }) {
  const map = useTransportMapData();
  const registers = useTransportRegisters();
  const [active, setActive] = useState<Record<string, boolean>>({
    vehicle: true,
    driver: true,
    carrier: true,
    incident: true,
  });
  const [heat, setHeat] = useState(false);
  const [query, setQuery] = useState("");
  const [hit, setHit] = useState<string | null>(null);
  const lookup = useServerFn(geocodeTransportPlace);

  const pins = useMemo(
    () => (map.data?.pins ?? []).filter((p) => active[p.kind]),
    [map.data?.pins, active],
  );

  const missing = useMemo(() => {
    const d = registers.data;
    if (!d) return [] as Array<{ id: string; label: string; kind: string }>;
    return [
      ...d.vehicles
        .filter((v) => v.latitude == null || v.longitude == null)
        .map((v) => ({ id: v.id, label: v.plate, kind: t.vehicle })),
      ...d.drivers
        .filter((v) => v.latitude == null || v.longitude == null)
        .map((v) => ({ id: v.id, label: v.full_name, kind: t.driver })),
      ...d.carriers
        .filter((v) => v.latitude == null || v.longitude == null)
        .map((v) => ({ id: v.id, label: v.name, kind: t.carrier })),
    ];
  }, [registers.data, t]);

  if (map.data && !map.data.settings.mapEnabled) {
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
        {pins.length === 0 ? (
          <EmptyState title={t.noCoordinates} description={t.mapBody} />
        ) : (
            <Suspense fallback={<div className="h-[520px] rounded-lg border border-border" />}>
              <TransportMap
                pins={pins}
                zones={map.data?.zones ?? []}
                tileUrl={map.data?.settings.mapTileUrl ?? null}
                heat={heat}
              />
            </Suspense>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Search} title={t.lookup} description={t.lookupHint}>
          <div className="flex gap-2">
            <Input
              value={query}
              placeholder={t.address}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              size="sm"
              disabled={query.trim().length < 2}
              onClick={() => {
                void lookup({ data: { query: query.trim() } })
                  .then((res) => {
                    if (!res.hit) {
                      setHit(null);
                      toast.info(t.lookupHint);
                      return;
                    }
                    setHit(`${res.hit.lat.toFixed(5)}, ${res.hit.lng.toFixed(5)}`);
                  })
                  .catch((e: Error) => toast.error(e.message));
              }}
            >
              {t.lookup}
            </Button>
          </div>
          {hit ? (
            <p className="mt-3 text-sm">
              {t.latitude} / {t.longitude}: <span className="font-mono">{hit}</span>
            </p>
          ) : null}
        </Panel>

        <Panel icon={PinIcon} title={t.offlineList}>
          {missing.length === 0 ? (
            <EmptyState title={t.none} />
          ) : (
            <ul className="divide-y divide-border">
              {missing.slice(0, 30).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-sm">{m.label}</span>
                  <Badge variant="outline">{m.kind}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
