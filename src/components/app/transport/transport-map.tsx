// Transport map — Leaflet, loaded in the browser only.
//
// Tiles default to OpenStreetMap but every installation can point
// `mapTileUrl` at its own tile server, so an offline site keeps working.
import { useEffect, useRef } from "react";
import type { MapPin, MapZone } from "@/lib/transport/types";

const DEFAULT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const COLORS: Record<string, string> = {
  vehicle: "#2563eb",
  driver: "#16a34a",
  carrier: "#a855f7",
  incident: "#dc2626",
};

export interface TransportMapProps {
  pins: MapPin[];
  zones: MapZone[];
  tileUrl?: string | null;
  heat?: boolean;
  onSelect?: (pin: MapPin) => void;
  className?: string;
}

export default function TransportMap({
  pins,
  zones,
  tileUrl,
  heat = false,
  onSelect,
  className,
}: TransportMapProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !holder.current) return;

      const map = L.map(holder.current, { zoomControl: true });
      mapRef.current = map;
      L.tileLayer(tileUrl || DEFAULT_TILES, {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      for (const zone of zones) {
        if (zone.center_lat == null || zone.center_lng == null) continue;
        L.circle([zone.center_lat, zone.center_lng], {
          radius: (zone.radius_km ?? 10) * 1000,
          color: zone.color ?? "#0ea5e9",
          weight: 1,
          fillOpacity: 0.08,
        })
          .bindTooltip(zone.name)
          .addTo(map);
      }

      const bounds: Array<[number, number]> = [];
      for (const pin of pins) {
        bounds.push([pin.lat, pin.lng]);
        const color = COLORS[pin.kind] ?? "#64748b";
        const marker = heat
          ? L.circle([pin.lat, pin.lng], {
              radius: pin.kind === "incident" ? 14000 : 6000,
              color,
              fillColor: color,
              fillOpacity: 0.25,
              weight: 1,
            })
          : L.circleMarker([pin.lat, pin.lng], {
              radius: pin.kind === "incident" ? 9 : 7,
              color,
              fillColor: color,
              fillOpacity: 0.85,
              weight: 2,
            });
        marker
          .bindTooltip(`${pin.label}${pin.sub ? ` — ${pin.sub}` : ""}`)
          .on("click", () => onSelect?.(pin))
          .addTo(map);
      }

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
      else if (bounds.length === 1) map.setView(bounds[0] as [number, number], 9);
      else map.setView([48.5, 15.5], 4);

      cleanup = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      mapRef.current = null;
    };
  }, [pins, zones, tileUrl, heat, onSelect]);

  return (
    <div
      ref={holder}
      className={className ?? "h-[520px] w-full rounded-lg border border-border"}
    />
  );
}
