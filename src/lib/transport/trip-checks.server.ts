// OPSQAI Transport — the pre-departure checklist behind every trip plan.
//
// Nothing here is invented: each line comes from a real record in the local
// installation (documents, incidents, duty plan, vehicle data) or from a
// weather forecast that explicitly says where it came from.

import type { ExpiryAlert, TripCheck, TripPlan, Vehicle } from "./types";
import { haversineKm } from "./trip-planner";

export interface CheckLabels {
  docExpired: string;
  docExpiring: string;
  driverOff: string;
  driverNoPhone: string;
  incidentOnRoute: string;
  weather: string;
  parking: string;
  restNeeded: string;
  restNeededDetail: string;
  noRouteOnline: string;
  noRouteOnlineDetail: string;
  vehicleDimensions: string;
  vehicleDimensionsDetail: string;
  adr: string;
  adrDetail: string;
  fuelStop: string;
  allClear: string;
}

export interface CheckInput {
  alerts: ExpiryAlert[];
  vehicle: Vehicle | null;
  driver: { id: string; full_name: string; phone: string | null } | null;
  duty: Array<{ driver_id: string | null; duty_date: string; duty_kind: string }>;
  incidents: Array<{
    id: string;
    title: string;
    latitude: number | null;
    longitude: number | null;
    status: string;
    severity: string | null;
  }>;
  weather: Array<{ label: string; summary: string; severity: "critical" | "warning" | "info" }>;
  offlineRoute: boolean;
  labels: CheckLabels;
}

const DAY = 86_400_000;

/** Build the checklist for a computed plan. */
export function buildTripChecks(plan: TripPlan, input: CheckInput): TripCheck[] {
  const L = input.labels;
  const checks: TripCheck[] = [];
  const departDay = plan.departAt.slice(0, 10);
  const arriveDay = plan.arrivalAt.slice(0, 10);

  // Documents of the vehicle and the driver that expire before the trip ends.
  const relevantOwners = new Set(
    [plan.vehicleId, plan.trailerId, plan.driverId].filter(Boolean) as string[],
  );
  const arrivalTime = new Date(plan.arrivalAt).getTime();
  for (const alert of input.alerts) {
    if (relevantOwners.size && !relevantOwners.has(alert.ownerId)) continue;
    const expires = new Date(`${alert.expiresOn}T23:59:59Z`).getTime();
    if (alert.daysLeft < 0) {
      checks.push({
        area: "documents",
        severity: "critical",
        title: `${L.docExpired}: ${alert.docLabel || alert.docType}`,
        detail: `${alert.ownerLabel} · ${alert.expiresOn}`,
        source: "documents",
      });
    } else if (expires <= arrivalTime + 3 * DAY) {
      checks.push({
        area: "documents",
        severity: "warning",
        title: `${L.docExpiring}: ${alert.docLabel || alert.docType}`,
        detail: `${alert.ownerLabel} · ${alert.expiresOn}`,
        source: "documents",
      });
    }
  }

  // Duty plan: the assigned driver must actually be working on those days.
  if (plan.driverId) {
    for (const day of new Set([departDay, arriveDay])) {
      const entry = input.duty.find(
        (d) => d.driver_id === plan.driverId && String(d.duty_date).slice(0, 10) === day,
      );
      if (entry && entry.duty_kind !== "work" && entry.duty_kind !== "standby") {
        checks.push({
          area: "driver",
          severity: "critical",
          title: L.driverOff,
          detail: `${plan.driverName ?? ""} · ${day} · ${entry.duty_kind}`,
          source: "duty",
        });
      }
    }
    if (!plan.driverPhone) {
      checks.push({
        area: "driver",
        severity: "warning",
        title: L.driverNoPhone,
        detail: plan.driverName,
        source: "drivers",
      });
    }
  }

  // Open incidents close to the planned route.
  const geometry = plan.geometry.length ? plan.geometry : [];
  for (const incident of input.incidents) {
    if (incident.latitude == null || incident.longitude == null) continue;
    const near = geometry.some(
      (p) => haversineKm(p, { lat: incident.latitude!, lng: incident.longitude! }) <= 25,
    );
    if (!near) continue;
    checks.push({
      area: "route",
      severity: incident.severity === "critical" ? "critical" : "warning",
      title: `${L.incidentOnRoute}: ${incident.title}`,
      detail: incident.status,
      source: "incidents",
    });
  }

  // Weather at departure and arrival.
  for (const w of input.weather) {
    if (w.severity === "info") continue;
    checks.push({
      area: "weather",
      severity: w.severity,
      title: `${L.weather}: ${w.label}`,
      detail: w.summary,
      source: "open-meteo",
    });
  }

  // Rest and parking: every planned break needs a place to stop.
  const pauses = plan.legs.filter((l) => l.kind === "break" || l.kind === "rest");
  if (pauses.length) {
    checks.push({
      area: "rest",
      severity: pauses.some((p) => p.kind === "rest") ? "warning" : "info",
      title: L.restNeeded,
      detail: L.restNeededDetail.replace("{n}", String(pauses.length)),
      source: "561/2006",
    });
    checks.push({
      area: "parking",
      severity: "info",
      title: L.parking,
      detail: null,
      source: "561/2006",
    });
  }

  // Vehicle facts that change the route.
  if (plan.vehicleProfile === "truck") {
    const v = input.vehicle;
    if (!v || (!v.gross_weight_kg && !v.height_cm)) {
      checks.push({
        area: "vehicle",
        severity: "warning",
        title: L.vehicleDimensions,
        detail: L.vehicleDimensionsDetail,
        source: "vehicles",
      });
    }
    if (v?.adr) {
      checks.push({
        area: "vehicle",
        severity: "warning",
        title: L.adr,
        detail: L.adrDetail,
        source: "vehicles",
      });
    }
  }

  if (input.offlineRoute) {
    checks.push({
      area: "route",
      severity: "warning",
      title: L.noRouteOnline,
      detail: L.noRouteOnlineDetail,
      source: "offline",
    });
  }

  if (plan.fuelLitres && plan.fuelLitres > 400) {
    checks.push({
      area: "fuel",
      severity: "info",
      title: L.fuelStop,
      detail: `${plan.fuelLitres} l`,
      source: "estimate",
    });
  }

  const order = { critical: 0, warning: 1, info: 2 } as const;
  return checks.sort((a, b) => order[a.severity] - order[b.severity]);
}
