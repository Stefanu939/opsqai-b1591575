// OPSQAI Transport — route + weather lookups for the trip planner (server only).
//
// Self-Hosted installations may run without internet, so every lookup has an
// offline fallback and the result always says where the numbers came from:
//   * route: public OSRM routing service, cached in the local database
//   * weather: Open-Meteo forecast for the departure and arrival points
// No API key is required for either service, and both can be switched off in
// the Transport settings (trip_external_lookups).

import type { VehicleProfile } from "./trip-planner";
import { offlineEstimate } from "./trip-planner";

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  driveMinutes: number;
  geometry: RoutePoint[];
  source: "osrm" | "offline";
  alternatives: Array<{ label: string; distanceKm: number; driveMinutes: number }>;
}

const OSRM = "https://router.project-osrm.org/route/v1/driving";

function cacheKey(points: RoutePoint[], profile: VehicleProfile, preference: string): string {
  const path = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(";");
  return `${profile}:${preference}:${path}`;
}

/**
 * Ask the public router for the road distance and driving time. Truck profiles
 * get a speed correction because the public service only knows car speeds.
 */
export async function fetchRoute(
  points: RoutePoint[],
  options: {
    profile: VehicleProfile;
    preference: "fast" | "short" | "no_tolls";
    speedTruck: number;
    speedCar: number;
    allowExternal: boolean;
    cache?: {
      read: (key: string) => Promise<RouteResult | null>;
      write: (key: string, value: RouteResult) => Promise<void>;
    };
  },
): Promise<RouteResult> {
  const fallback = (): RouteResult => {
    const speed = options.profile === "truck" ? options.speedTruck : options.speedCar;
    const est = offlineEstimate(points, speed);
    return { ...est, geometry: points, source: "offline", alternatives: [] };
  };

  if (points.length < 2) return fallback();
  const key = cacheKey(points, options.profile, options.preference);

  if (options.cache) {
    const cached = await options.cache.read(key).catch(() => null);
    if (cached) return cached;
  }
  if (!options.allowExternal) return fallback();

  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `${OSRM}/${coords}?overview=simplified&geometries=geojson&alternatives=true`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "OPSQAI-Transport" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return fallback();
    const body = (await res.json()) as {
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };
    const routes = Array.isArray(body.routes) ? body.routes : [];
    const primary = routes[0];
    if (!primary || typeof primary.distance !== "number") return fallback();

    // The public router returns car timings. Scale to the vehicle profile.
    const scale =
      options.profile === "truck"
        ? Math.max(1, options.speedCar / Math.max(30, options.speedTruck))
        : 1;

    const toResult = (r: (typeof routes)[number]) => ({
      distanceKm: Math.round(((r.distance ?? 0) / 1000) * 10) / 10,
      driveMinutes: Math.round(((r.duration ?? 0) / 60) * scale),
    });

    const main = toResult(primary);
    const geometry: RoutePoint[] = (primary.geometry?.coordinates ?? []).map(([lng, lat]) => ({
      lat,
      lng,
    }));

    // "short" / "no_tolls" pick the shortest alternative the router returned.
    const scored = routes.map((r, i) => ({ index: i, ...toResult(r) }));
    let chosen = scored[0]!;
    if (options.preference !== "fast" && scored.length > 1) {
      chosen = scored.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a), scored[0]!);
    }
    const chosenRoute = routes[chosen.index]!;
    const chosenGeometry: RoutePoint[] =
      chosen.index === 0
        ? geometry
        : (chosenRoute.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }));

    const result: RouteResult = {
      distanceKm: chosen.distanceKm || main.distanceKm,
      driveMinutes: chosen.driveMinutes || main.driveMinutes,
      geometry: chosenGeometry.length ? chosenGeometry : points,
      source: "osrm",
      alternatives: scored
        .filter((s) => s.index !== chosen.index)
        .slice(0, 2)
        .map((s, i) => ({
          label: `#${i + 2}`,
          distanceKm: s.distanceKm,
          driveMinutes: s.driveMinutes,
        })),
    };
    if (options.cache) await options.cache.write(key, result).catch(() => undefined);
    return result;
  } catch {
    return fallback();
  }
}

export interface WeatherLook {
  label: string;
  summary: string;
  severity: "critical" | "warning" | "info";
}

const WEATHER = "https://api.open-meteo.com/v1/forecast";

/** Weather for one point at (roughly) one moment; only reports real risks. */
export async function fetchWeather(
  point: RoutePoint,
  atIso: string,
  label: string,
  allowExternal: boolean,
): Promise<WeatherLook | null> {
  if (!allowExternal) return null;
  try {
    const url =
      `${WEATHER}?latitude=${point.lat.toFixed(3)}&longitude=${point.lng.toFixed(3)}` +
      `&hourly=temperature_2m,precipitation,wind_speed_10m,snowfall&forecast_days=3`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        precipitation?: number[];
        wind_speed_10m?: number[];
        snowfall?: number[];
      };
    };
    const times = body.hourly?.time ?? [];
    if (!times.length) return null;
    const target = new Date(atIso).getTime();
    let best = 0;
    let bestDelta = Number.POSITIVE_INFINITY;
    times.forEach((t, i) => {
      const delta = Math.abs(new Date(`${t}Z`).getTime() - target);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    });
    const temp = body.hourly?.temperature_2m?.[best];
    const rain = body.hourly?.precipitation?.[best] ?? 0;
    const wind = body.hourly?.wind_speed_10m?.[best] ?? 0;
    const snow = body.hourly?.snowfall?.[best] ?? 0;

    const parts: string[] = [];
    if (typeof temp === "number") parts.push(`${Math.round(temp)}°C`);
    if (rain > 0) parts.push(`${rain} mm`);
    if (snow > 0) parts.push(`${snow} cm`);
    if (wind > 0) parts.push(`${Math.round(wind)} km/h`);

    let severity: WeatherLook["severity"] = "info";
    if (snow > 1 || wind >= 70 || (typeof temp === "number" && temp <= -5)) severity = "critical";
    else if (rain >= 4 || wind >= 45 || (typeof temp === "number" && temp <= 1)) severity = "warning";

    return { label, summary: parts.join(" · ") || "—", severity };
  } catch {
    return null;
  }
}
