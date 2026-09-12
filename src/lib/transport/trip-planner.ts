// OPSQAI Transport — pure trip maths (client-safe, fully testable).
//
// Everything here works without any external service: distance, driving/rest
// segmentation per Regulation (EC) 561/2006, estimated arrival and fuel. The
// same functions are used online (with a real route) and offline (with a
// straight-line estimate), so a Self-Hosted installation without internet
// still produces a usable plan.

export type VehicleProfile = "truck" | "van" | "car";

/** Driving rules used for the timeline. Minutes throughout. */
export const DRIVE_RULES = {
  /** Continuous driving allowed before a break is due. */
  maxContinuousDrive: 4 * 60 + 30,
  /** Standard break length. */
  breakMinutes: 45,
  /** Split break variant: 15 minutes first, then 30. */
  splitFirst: 15,
  splitSecond: 30,
  /** Daily driving limit. */
  dailyDrive: 9 * 60,
  /** Daily rest after the daily driving limit is used up. */
  dailyRest: 11 * 60,
} as const;

export interface Waypoint {
  label: string;
  lat: number | null;
  lng: number | null;
}

export interface TripLeg {
  position: number;
  kind: "drive" | "break" | "rest" | "stop";
  minutes: number;
  distanceKm: number | null;
  startAt: string;
  endAt: string;
  label: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PlanInput {
  departAt: string;
  distanceKm: number;
  driveMinutes: number;
  /** Minutes already driven by this driver today. */
  alreadyDrivenMinutes?: number;
  /** Extra minutes spent at every intermediate stop. */
  stopMinutes?: number;
  stops?: Waypoint[];
  splitBreak?: boolean;
  /** Litres / 100 km, used for the fuel estimate. */
  fuelPer100Km?: number | null;
  /** Breaks only apply to professional driving. */
  applyDrivingRules?: boolean;
}

export interface PlanResult {
  legs: TripLeg[];
  driveMinutes: number;
  totalMinutes: number;
  arrivalAt: string;
  fuelLitres: number | null;
  breakCount: number;
  restCount: number;
}

const EARTH_KM = 6371;

/** Great-circle distance in km. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Road factor applied to straight-line distance when no router is reachable. */
export const ROAD_FACTOR = 1.25;

export function defaultSpeedKph(profile: VehicleProfile, truck: number, car: number): number {
  return profile === "truck" ? truck : Math.round((truck + car) / 2 + (profile === "car" ? 10 : 0));
}

/** Offline estimate: straight line × road factor at the configured speed. */
export function offlineEstimate(
  points: Array<{ lat: number; lng: number }>,
  speedKph: number,
): { distanceKm: number; driveMinutes: number } {
  let km = 0;
  for (let i = 1; i < points.length; i += 1) {
    km += haversineKm(points[i - 1]!, points[i]!);
  }
  const distanceKm = Math.round(km * ROAD_FACTOR * 10) / 10;
  const speed = Math.max(20, speedKph);
  return { distanceKm, driveMinutes: Math.round((distanceKm / speed) * 60) };
}

function iso(base: number, minutes: number): string {
  return new Date(base + minutes * 60_000).toISOString();
}

/**
 * Split the driving time into legs, inserting the breaks and the daily rest
 * the driving rules require. Distance is spread proportionally to time so each
 * break gets an approximate position along the route.
 */
export function planTrip(input: PlanInput): PlanResult {
  const start = new Date(input.departAt).getTime();
  if (!Number.isFinite(start)) throw new Error("Invalid departure time.");

  const driveTotal = Math.max(0, Math.round(input.driveMinutes));
  const distance = Math.max(0, input.distanceKm);
  const applyRules = input.applyDrivingRules !== false;
  const stopMinutes = Math.max(0, input.stopMinutes ?? 0);
  const stops = input.stops ?? [];

  const legs: TripLeg[] = [];
  let cursor = 0; // minutes since departure
  let driven = 0; // minutes driven on this trip
  let sinceBreak = 0;
  let sinceRest = Math.max(0, Math.min(DRIVE_RULES.dailyDrive, input.alreadyDrivenMinutes ?? 0));
  let splitUsed = false;
  let breakCount = 0;
  let restCount = 0;
  let position = 1;

  const pointAt = (fraction: number): { lat: number | null; lng: number | null } => {
    if (!stops.length) return { lat: null, lng: null };
    const idx = Math.min(stops.length - 1, Math.floor(fraction * stops.length));
    const stop = stops[idx];
    return { lat: stop?.lat ?? null, lng: stop?.lng ?? null };
  };

  const pushDrive = (minutes: number) => {
    if (minutes <= 0) return;
    const km = driveTotal > 0 ? Math.round((distance * minutes) / driveTotal * 10) / 10 : null;
    legs.push({
      position: position++,
      kind: "drive",
      minutes,
      distanceKm: km,
      startAt: iso(start, cursor),
      endAt: iso(start, cursor + minutes),
      label: null,
      lat: null,
      lng: null,
    });
    cursor += minutes;
    driven += minutes;
    sinceBreak += minutes;
    sinceRest += minutes;
  };

  const pushPause = (kind: "break" | "rest", minutes: number) => {
    const where = pointAt(driveTotal > 0 ? driven / driveTotal : 0);
    legs.push({
      position: position++,
      kind,
      minutes,
      distanceKm: null,
      startAt: iso(start, cursor),
      endAt: iso(start, cursor + minutes),
      label: null,
      lat: where.lat,
      lng: where.lng,
    });
    cursor += minutes;
    if (kind === "break") {
      breakCount += 1;
      sinceBreak = 0;
    } else {
      restCount += 1;
      sinceBreak = 0;
      sinceRest = 0;
      splitUsed = false;
    }
  };

  let remaining = driveTotal;
  let guard = 0;
  while (remaining > 0 && guard < 500) {
    guard += 1;
    if (!applyRules) {
      pushDrive(remaining);
      remaining = 0;
      break;
    }
    const untilRest = Math.max(0, DRIVE_RULES.dailyDrive - sinceRest);
    if (untilRest === 0) {
      pushPause("rest", DRIVE_RULES.dailyRest);
      continue;
    }
    const untilBreak = Math.max(0, DRIVE_RULES.maxContinuousDrive - sinceBreak);
    if (untilBreak === 0) {
      if (input.splitBreak && !splitUsed) {
        pushPause("break", DRIVE_RULES.splitFirst);
        splitUsed = true;
        // The remaining 30 minutes are taken at the next break window.
      } else if (input.splitBreak && splitUsed) {
        pushPause("break", DRIVE_RULES.splitSecond);
      } else {
        pushPause("break", DRIVE_RULES.breakMinutes);
      }
      continue;
    }
    const chunk = Math.min(remaining, untilBreak, untilRest);
    pushDrive(chunk);
    remaining -= chunk;
  }

  // Loading / unloading time at intermediate stops.
  if (stopMinutes > 0 && stops.length > 2) {
    const extra = stopMinutes * (stops.length - 2);
    cursor += extra;
    legs.push({
      position: position++,
      kind: "stop",
      minutes: extra,
      distanceKm: null,
      startAt: iso(start, cursor - extra),
      endAt: iso(start, cursor),
      label: null,
      lat: null,
      lng: null,
    });
  }

  const fuel =
    input.fuelPer100Km && input.fuelPer100Km > 0
      ? Math.round((distance * input.fuelPer100Km) / 100 * 10) / 10
      : null;

  return {
    legs,
    driveMinutes: driveTotal,
    totalMinutes: cursor,
    arrivalAt: iso(start, cursor),
    fuelLitres: fuel,
    breakCount,
    restCount,
  };
}

/** "7 h 45 m" style duration, language-neutral. */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h > 0 ? `${h}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}
