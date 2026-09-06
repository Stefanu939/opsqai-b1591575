// Transport map — Leaflet, loaded in the browser only.
//
// Global OpenStreetMap base layer, fleet/driver/carrier/incident pins, zones,
// an optional search marker and an optional vehicle track. Clicking the map
// reports the coordinates back so a record can be positioned by hand.
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { MapPin, MapZone } from "@/lib/transport/types";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const COLORS: Record<string, string> = {
  vehicle: "#2563eb",
  driver: "#16a34a",
  carrier: "#a855f7",
  incident: "#dc2626",
};

export interface TransportMapProps {
  pins: MapPin[];
  zones: MapZone[];
  heat?: boolean;
  center?: [number, number] | null;
  zoom?: number;
  focus?: { lat: number; lng: number; label?: string } | null;
  track?: Array<{ lat: number; lng: number }>;
  onSelect?: (pin: MapPin) => void;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

export default function TransportMap({
  pins,
  zones,
  heat = false,
  center,
  zoom = 5,
  focus,
  track,
  onSelect,
  onPick,
  className,
}: TransportMapProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !holder.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(holder.current, { zoomControl: true, worldCopyJump: true });
      map.setView(center ?? [48.5, 15.5], zoom);
      L.tileLayer(TILES, {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        pickRef.current?.(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
      // Leaflet needs a nudge when it mounts inside a freshly laid-out panel.
      setTimeout(() => map.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw the content layers whenever the data changes.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    for (const zone of zones) {
      if (zone.center_lat == null || zone.center_lng == null) continue;
      L.circle([zone.center_lat, zone.center_lng], {
        radius: (zone.radius_km ?? 10) * 1000,
        color: zone.color ?? "#0ea5e9",
        weight: 1,
        fillOpacity: 0.08,
      })
        .bindTooltip(zone.name)
        .addTo(layer);
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
        .addTo(layer);
    }

    if (track && track.length > 1) {
      L.polyline(
        track.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#0ea5e9", weight: 3, opacity: 0.8 },
      ).addTo(layer);
      for (const p of track) bounds.push([p.lat, p.lng]);
    }

    if (focus) {
      L.marker([focus.lat, focus.lng])
        .bindTooltip(focus.label ?? `${focus.lat.toFixed(5)}, ${focus.lng.toFixed(5)}`)
        .addTo(layer);
      map.setView([focus.lat, focus.lng], Math.max(map.getZoom(), 12));
      return;
    }

    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    else if (bounds.length === 1) map.setView(bounds[0] as [number, number], 10);
  }, [pins, zones, heat, track, focus, onSelect]);

  return (
    <div
      ref={holder}
      className={className ?? "h-[560px] w-full rounded-lg border border-border"}
    />
  );
}
