// The trip planner must never invent time: breaks and daily rest come from the
// driving rules, everything else is arithmetic on real distance/time input.
import { describe, expect, it } from "vitest";
import {
  DRIVE_RULES,
  formatMinutes,
  haversineKm,
  offlineEstimate,
  planTrip,
} from "@/lib/transport/trip-planner";

const DEPART = "2026-03-02T06:00:00.000Z";

describe("trip planner", () => {
  it("does not insert a break under 4h30 of driving", () => {
    const plan = planTrip({ departAt: DEPART, distanceKm: 200, driveMinutes: 180 });
    expect(plan.breakCount).toBe(0);
    expect(plan.totalMinutes).toBe(180);
    expect(plan.arrivalAt).toBe("2026-03-02T09:00:00.000Z");
  });

  it("inserts a 45 minute break after 4h30", () => {
    const plan = planTrip({ departAt: DEPART, distanceKm: 500, driveMinutes: 330 });
    expect(plan.breakCount).toBe(1);
    expect(plan.totalMinutes).toBe(330 + DRIVE_RULES.breakMinutes);
  });

  it("uses the split break when configured", () => {
    const plan = planTrip({
      departAt: DEPART,
      distanceKm: 500,
      driveMinutes: 330,
      splitBreak: true,
    });
    const pauses = plan.legs.filter((l) => l.kind === "break");
    expect(pauses[0]?.minutes).toBe(DRIVE_RULES.splitFirst);
  });

  it("adds the daily rest once the 9h driving limit is used up", () => {
    const plan = planTrip({ departAt: DEPART, distanceKm: 900, driveMinutes: 660 });
    expect(plan.restCount).toBe(1);
    expect(plan.totalMinutes).toBeGreaterThan(660 + DRIVE_RULES.dailyRest);
  });

  it("counts driving already done today", () => {
    const fresh = planTrip({ departAt: DEPART, distanceKm: 700, driveMinutes: 480 });
    const tired = planTrip({
      departAt: DEPART,
      distanceKm: 700,
      driveMinutes: 480,
      alreadyDrivenMinutes: 480,
    });
    expect(tired.restCount).toBeGreaterThan(fresh.restCount);
  });

  it("skips the driving rules for a car", () => {
    const plan = planTrip({
      departAt: DEPART,
      distanceKm: 900,
      driveMinutes: 600,
      applyDrivingRules: false,
    });
    expect(plan.breakCount).toBe(0);
    expect(plan.restCount).toBe(0);
    expect(plan.totalMinutes).toBe(600);
  });

  it("estimates fuel from the distance", () => {
    const plan = planTrip({
      departAt: DEPART,
      distanceKm: 500,
      driveMinutes: 330,
      fuelPer100Km: 30,
    });
    expect(plan.fuelLitres).toBe(150);
  });

  it("keeps an offline estimate plausible", () => {
    const km = haversineKm({ lat: 48.2, lng: 16.37 }, { lat: 52.52, lng: 13.4 });
    expect(Math.round(km)).toBeGreaterThan(500);
    const est = offlineEstimate(
      [
        { lat: 48.2, lng: 16.37 },
        { lat: 52.52, lng: 13.4 },
      ],
      70,
    );
    expect(est.distanceKm).toBeGreaterThan(km);
    expect(est.driveMinutes).toBeGreaterThan(400);
  });

  it("formats durations", () => {
    expect(formatMinutes(75)).toBe("1h 15m");
    expect(formatMinutes(45)).toBe("45m");
  });

  it("rejects an invalid departure time", () => {
    expect(() => planTrip({ departAt: "not-a-date", distanceKm: 10, driveMinutes: 10 })).toThrow();
  });
});
