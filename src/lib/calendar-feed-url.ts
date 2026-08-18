// Builds the public ICS subscription URL for a calendar feed token.
//
// Google Calendar and Outlook.com fetch the feed from their own servers, so the
// URL must point at a publicly reachable host. Preview/sandbox hosts sit behind
// the Lovable auth gate (they answer 302 to /auth for anonymous fetches), which
// makes "Cannot add calendar / URL invalid" errors in both providers. When the
// app is opened on a non-public host we therefore fall back to the published
// production domain, which serves the same /api/public/calendar route.

const PUBLIC_FALLBACK = "https://opsqai.de";

const NON_PUBLIC_HOST = /(^localhost$|^127\.|^0\.0\.0\.0$|\.local$|id-preview--|lovableproject\.com$|sandbox)/i;

export function calendarPublicOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_FALLBACK;
  const { hostname, origin, protocol } = window.location;
  if (protocol !== "https:" || NON_PUBLIC_HOST.test(hostname)) return PUBLIC_FALLBACK;
  return origin;
}

export function calendarFeedUrl(token: string | undefined | null): string {
  if (!token) return "";
  return `${calendarPublicOrigin()}/api/public/calendar/${token}.ics`;
}

/** webcal:// deep link — Outlook desktop, Apple Calendar, most native clients. */
export function calendarWebcalUrl(feedUrl: string): string {
  return feedUrl ? feedUrl.replace(/^https?:/i, "webcal:") : "";
}

/** Google Calendar "add by URL" flow. */
export function calendarGoogleUrl(feedUrl: string): string {
  return feedUrl
    ? `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(feedUrl)}`
    : "";
}

/** Outlook on the web (personal + Microsoft 365) "add from web" flow. */
export function calendarOutlookWebUrl(feedUrl: string, work = false): string {
  if (!feedUrl) return "";
  const base = work
    ? "https://outlook.office.com/calendar/0/addfromweb"
    : "https://outlook.live.com/calendar/0/addfromweb";
  return `${base}?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent("OPSQAI")}`;
}
