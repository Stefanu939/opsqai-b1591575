// OPSQAI Transport — the trip plan as a one/two page A4 PDF (server only).
// The driver gets the route summary, the break timeline and the pre-departure
// checks. Self-Hosted exports are PDF only.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatMinutes } from "./trip-planner";
import type { TripPlan } from "./types";

function ascii(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T")
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/[–—→]/g, "-")
    .replace(/°/g, " deg ")
    .replace(/[^\x20-\x7E]/g, "");
}

export interface TripPdfLabels {
  title: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  distance: string;
  drive: string;
  total: string;
  fuel: string;
  vehicle: string;
  driver: string;
  stops: string;
  timeline: string;
  checks: string;
  source: string;
  offline: string;
  online: string;
  generated: string;
  breakLabel: string;
  restLabel: string;
  driveLabel: string;
  stopLabel: string;
}

const WIDTH = 595;
const HEIGHT = 842;
const M = 40;

export async function renderTripPdf(
  plan: TripPlan,
  labels: TripPdfLabels,
  meta: { timezone: string; generatedBy?: string | null; name?: string | null },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([WIDTH, HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.1, 0.15);
  const muted = rgb(0.45, 0.48, 0.53);
  let y = HEIGHT - M;

  const time = (iso: string | null) => {
    if (!iso) return "-";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: meta.timezone,
      }).format(new Date(iso));
    } catch {
      return iso.replace("T", " ").slice(0, 16);
    }
  };

  const line = (text: string, size = 9.5, f = font, color = ink) => {
    if (y < M + 40) {
      page = doc.addPage([WIDTH, HEIGHT]);
      y = HEIGHT - M;
    }
    page.drawText(ascii(text), { x: M, y: y - size - 2, size, font: f, color });
    y -= size + 7;
  };

  page.drawText(ascii(meta.name || labels.title), {
    x: M,
    y: y - 18,
    size: 18,
    font: bold,
    color: ink,
  });
  y -= 34;
  page.drawText(
    ascii(
      `${labels.source}: ${plan.routeSource === "offline" ? labels.offline : labels.online} · ${labels.generated} ${time(new Date().toISOString())}${meta.generatedBy ? ` · ${meta.generatedBy}` : ""}`,
    ),
    { x: M, y: y - 8, size: 8.5, font, color: muted },
  );
  y -= 26;

  const rows: Array<[string, string]> = [
    [labels.from, plan.origin.label],
    [labels.to, plan.destination.label],
    [labels.depart, time(plan.departAt)],
    [labels.arrive, time(plan.arrivalAt)],
    [labels.distance, `${plan.distanceKm} km`],
    [labels.drive, formatMinutes(plan.driveMinutes)],
    [labels.total, formatMinutes(plan.totalMinutes)],
  ];
  if (plan.fuelLitres != null) rows.push([labels.fuel, `${plan.fuelLitres} l`]);
  if (plan.vehiclePlate) rows.push([labels.vehicle, plan.vehiclePlate]);
  if (plan.driverName) rows.push([labels.driver, plan.driverName]);
  const inner = plan.stops.filter(
    (s) => s.label !== plan.origin.label && s.label !== plan.destination.label,
  );
  if (inner.length) rows.push([labels.stops, inner.map((s) => s.label).join(" - ")]);

  for (const [k, v] of rows) {
    if (y < M + 40) {
      page = doc.addPage([WIDTH, HEIGHT]);
      y = HEIGHT - M;
    }
    page.drawText(ascii(k), { x: M, y: y - 11, size: 9, font, color: muted });
    page.drawText(ascii(v).slice(0, 90), { x: M + 150, y: y - 11, size: 9.5, font: bold, color: ink });
    y -= 18;
  }

  y -= 10;
  line(labels.timeline, 12, bold);
  const kindLabel = (kind: string) =>
    kind === "break"
      ? labels.breakLabel
      : kind === "rest"
        ? labels.restLabel
        : kind === "stop"
          ? labels.stopLabel
          : labels.driveLabel;
  for (const leg of plan.legs) {
    line(
      `${time(leg.start_at)} - ${time(leg.end_at)}  ${kindLabel(leg.kind)}  ${formatMinutes(leg.minutes)}${leg.distance_km ? `  ${leg.distance_km} km` : ""}`,
      9,
    );
  }

  y -= 10;
  line(labels.checks, 12, bold);
  if (!plan.checks.length) {
    line("-", 9, font, muted);
  } else {
    for (const check of plan.checks) {
      const mark = check.severity === "critical" ? "[!]" : check.severity === "warning" ? "[~]" : "[i]";
      line(
        `${mark} ${check.title}${check.detail ? ` - ${check.detail}` : ""}`,
        9,
        font,
        check.severity === "critical" ? rgb(0.72, 0.11, 0.11) : ink,
      );
    }
  }

  return doc.save();
}
