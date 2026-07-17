// Project-specific client-side function middleware that attaches the
// Supabase bearer token to every server-fn RPC. Replaces the generated
// `attachSupabaseAuth` because it waits briefly for the session to hydrate
// on cold navigations (avoids "No authorization header provided" 401s that
// blank the screen right after a route transition, before Supabase has
// finished restoring the session from localStorage).
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

async function resolveAccessToken(timeoutMs = 1500): Promise<string | null> {
  const start = Date.now();
  // First attempt — usually resolves immediately from persisted storage.
  let { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;

  // Wait for onAuthStateChange to fire (session being restored async).
  return await new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
      resolve(token);
    };
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) finish(session.access_token);
    });
    const timer = setTimeout(async () => {
      const { data: retry } = await supabase.auth.getSession();
      finish(retry.session?.access_token ?? null);
    }, Math.max(50, timeoutMs - (Date.now() - start)));
  });
}

export const attachBearerToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await resolveAccessToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
