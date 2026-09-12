// OPSQAI Transport — send a finished trip to the driver on WhatsApp.
//
// Two modes, both driven by the Transport settings:
//   * "link"   — zero configuration. We build a wa.me deep link with the route
//                message prefilled; the dispatcher taps send in WhatsApp.
//   * "twilio" — automatic sending through the Twilio WhatsApp API (requires a
//                connected Twilio account and an approved sender number).
// The message itself is identical in both modes.

import { formatMinutes } from "./trip-planner";
import type { TripPlan } from "./types";

export type WhatsAppLang = "en" | "de" | "ro";

const COPY: Record<
  WhatsAppLang,
  {
    title: string;
    from: string;
    to: string;
    depart: string;
    arrive: string;
    distance: string;
    drive: string;
    breaks: string;
    stops: string;
    checks: string;
    dispatcher: string;
  }
> = {
  en: {
    title: "Trip plan",
    from: "From",
    to: "To",
    depart: "Departure",
    arrive: "Estimated arrival",
    distance: "Distance",
    drive: "Driving time",
    breaks: "Breaks / rest",
    stops: "Stops",
    checks: "Check before departure",
    dispatcher: "Dispatcher",
  },
  de: {
    title: "Tourenplan",
    from: "Von",
    to: "Nach",
    depart: "Abfahrt",
    arrive: "Voraussichtliche Ankunft",
    distance: "Entfernung",
    drive: "Lenkzeit",
    breaks: "Pausen / Ruhezeit",
    stops: "Zwischenstopps",
    checks: "Vor der Abfahrt prüfen",
    dispatcher: "Disponent",
  },
  ro: {
    title: "Plan de traseu",
    from: "De la",
    to: "Către",
    depart: "Plecare",
    arrive: "Sosire estimată",
    distance: "Distanță",
    drive: "Timp de condus",
    breaks: "Pauze / repaus",
    stops: "Opriri",
    checks: "Verifică înainte de plecare",
    dispatcher: "Dispecer",
  },
};

function localTime(iso: string, timezone: string, lang: WhatsAppLang): string {
  try {
    return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return iso.replace("T", " ").slice(0, 16);
  }
}

export function composeTripMessage(
  plan: TripPlan,
  options: { lang: WhatsAppLang; timezone: string; dispatcher?: string | null },
): string {
  const c = COPY[options.lang] ?? COPY.en;
  const lines: string[] = [];
  lines.push(`*OPSQAI · ${c.title}*`);
  lines.push(`${c.from}: ${plan.origin.label}`);
  lines.push(`${c.to}: ${plan.destination.label}`);
  const inner = plan.stops.filter(
    (s) => s.label !== plan.origin.label && s.label !== plan.destination.label,
  );
  if (inner.length) lines.push(`${c.stops}: ${inner.map((s) => s.label).join(" → ")}`);
  lines.push(`${c.depart}: ${localTime(plan.departAt, options.timezone, options.lang)}`);
  lines.push(`${c.arrive}: ${localTime(plan.arrivalAt, options.timezone, options.lang)}`);
  lines.push(`${c.distance}: ${plan.distanceKm} km`);
  lines.push(`${c.drive}: ${formatMinutes(plan.driveMinutes)}`);
  const pauses = plan.legs.filter((l) => l.kind === "break" || l.kind === "rest");
  if (pauses.length) {
    lines.push(
      `${c.breaks}: ${pauses
        .map((p) => `${localTime(p.start_at ?? plan.departAt, options.timezone, options.lang).slice(-5)} (${formatMinutes(p.minutes)})`)
        .join(", ")}`,
    );
  }
  const risky = plan.checks.filter((k) => k.severity !== "info");
  if (risky.length) {
    lines.push("");
    lines.push(`${c.checks}:`);
    for (const k of risky.slice(0, 8)) {
      lines.push(`• ${k.title}${k.detail ? ` — ${k.detail}` : ""}`);
    }
  }
  if (options.dispatcher) {
    lines.push("");
    lines.push(`${c.dispatcher}: ${options.dispatcher}`);
  }
  return lines.join("\n");
}

/** E.164 digits only, as wa.me and Twilio both expect. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const cleaned = digits.startsWith("+") ? digits.slice(1) : digits;
  if (cleaned.length < 8 || cleaned.length > 15) return null;
  return cleaned;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export interface SendOutcome {
  mode: "link" | "twilio";
  link?: string;
  sid?: string;
  status: "prepared" | "sent";
}

/**
 * Automatic sending through Twilio's WhatsApp API. Only used when the
 * installation configured the "twilio" channel and the credentials exist.
 */
export async function sendViaTwilio(
  to: string,
  from: string,
  message: string,
): Promise<SendOutcome> {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const twilioKey = process.env['TWILIO_API_KEY'];
  if (!lovableKey || !twilioKey) {
    throw new Error(
      "Automatic WhatsApp sending is not configured. Connect Twilio or switch the WhatsApp channel back to the link mode.",
    );
  }
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:+${to}`,
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from.startsWith("+") ? from : `+${from}`}`,
      Body: message,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`WhatsApp send failed [${res.status}]: ${body}`);
    throw new Error(`WhatsApp send failed [${res.status}]: ${body}`);
  }
  const body = (await res.json()) as { sid?: string };
  return { mode: "twilio", sid: body.sid, status: "sent" };
}
