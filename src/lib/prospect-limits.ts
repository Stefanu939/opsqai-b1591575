// Prospect Mode chat limits (shared by browser and server).
export const PROSPECT_ANON_MESSAGES = 2; // the 3rd question requires sign-in
export const PROSPECT_SESSION_MESSAGES = 30; // per session, signed in
export const PROSPECT_ANON_SESSIONS_PER_IP_DAY = 10;

export type ProspectGate = "ok" | "login_required" | "limit_reached";

/** Decide whether the visitor may send their next message. */
export function prospectGate(sentUserMessages: number, signedIn: boolean): ProspectGate {
  if (sentUserMessages >= PROSPECT_SESSION_MESSAGES) return "limit_reached";
  if (!signedIn && sentUserMessages >= PROSPECT_ANON_MESSAGES) return "login_required";
  return "ok";
}

export function prospectRemaining(sentUserMessages: number): number {
  return Math.max(0, PROSPECT_SESSION_MESSAGES - sentUserMessages);
}
