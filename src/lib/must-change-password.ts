// Forced password change (Self-Hosted).
//
// The installer can mint a random one-time admin password, and admins can
// issue temporary passwords to members. In both cases
// `users.must_change_password` is TRUE and the flag rides along in the access
// token claims (see `local-auth.server.ts`). This helper lets route guards ask
// the question without a round trip.
//
// Cloud sessions never carry the claim, so this is a no-op there.

import { getBrowserAuthProvider } from "@/lib/providers/registry";

function decodeClaims(token: string): Record<string, unknown> | null {
  try {
    const body = token.split(".")[1];
    if (!body) return null;
    const padded = body.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True when the signed-in user must replace their password before continuing. */
export async function mustChangePassword(): Promise<boolean> {
  try {
    const session = await getBrowserAuthProvider().getSession();
    if (!session?.accessToken) return false;
    return decodeClaims(session.accessToken)?.["must_change_password"] === true;
  } catch {
    return false;
  }
}
