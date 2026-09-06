import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { getBrowserAuthProvider } from "@/lib/providers/registry";

/**
 * Self-Hosted session rule: the session never expires while the operator is
 * using the app. Any real interaction (pointer, key, scroll, touch, tab
 * focus) resets the clock and keeps the access token rotating. Sign-out only
 * happens after a genuine idle period, and only after a warning the user can
 * dismiss.
 *
 * Cloud surfaces (Management Center, Customer Portal) keep the provider's own
 * session policy — this guard is mounted only inside `/app/*`.
 */
const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes without activity
const WARN_BEFORE_MS = 2 * 60 * 1000; // warn 2 minutes before sign-out
const KEEPALIVE_MS = 10 * 60 * 1000; // rotate the token while active
const ACTIVITY_KEY = "opsqai.last_activity";

const COPY = {
  en: {
    title: "Still there?",
    body: (s: number) =>
      `You have been inactive for a while. For security you will be signed out in ${s} seconds.`,
    stay: "Stay signed in",
    out: "Sign out now",
  },
  de: {
    title: "Noch da?",
    body: (s: number) =>
      `Sie waren eine Weile inaktiv. Aus Sicherheitsgründen werden Sie in ${s} Sekunden abgemeldet.`,
    stay: "Angemeldet bleiben",
    out: "Jetzt abmelden",
  },
  ro: {
    title: "Mai ești acolo?",
    body: (s: number) =>
      `Nu ai avut activitate o vreme. Din motive de securitate vei fi deconectat în ${s} secunde.`,
    stay: "Rămân conectat",
    out: "Deconectează-mă acum",
  },
} as const;

function readLastActivity(): number {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastActivity(ts: number): void {
  try {
    window.localStorage.setItem(ACTIVITY_KEY, String(ts));
  } catch {
    /* storage unavailable — in-memory tracking still works */
  }
}

export function IdleSessionGuard() {
  const { session, signOut } = useAuth();
  const { lang } = useT();
  const copy = COPY[(lang as keyof typeof COPY) in COPY ? (lang as keyof typeof COPY) : "en"];
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const lastKeepalive = useRef<number>(Date.now());
  const signedOut = useRef(false);

  const isSelfHosted = getClientDeploymentMode() !== "mc";
  const active = isSelfHosted && Boolean(session?.user);

  useEffect(() => {
    if (!active) {
      setRemaining(null);
      return;
    }
    signedOut.current = false;
    const now = Date.now();
    lastActivity.current = Math.max(readLastActivity(), now - IDLE_LIMIT_MS);
    writeLastActivity(now);
    lastActivity.current = now;

    const touch = () => {
      const ts = Date.now();
      lastActivity.current = ts;
      writeLastActivity(ts);
      setRemaining(null);
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
      "focus",
    ];
    for (const e of events) window.addEventListener(e, touch, { passive: true });
    const onVisible = () => {
      if (document.visibilityState === "visible") touch();
    };
    document.addEventListener("visibilitychange", onVisible);
    const onStorage = (e: StorageEvent) => {
      // Activity in another tab counts as activity here too.
      if (e.key !== ACTIVITY_KEY) return;
      const ts = Number(e.newValue);
      if (Number.isFinite(ts) && ts > lastActivity.current) {
        lastActivity.current = ts;
        setRemaining(null);
      }
    };
    window.addEventListener("storage", onStorage);

    const tick = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_LIMIT_MS) {
        if (signedOut.current) return;
        signedOut.current = true;
        setRemaining(null);
        void signOut();
        return;
      }
      if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        setRemaining(Math.max(1, Math.ceil((IDLE_LIMIT_MS - idle) / 1000)));
        return;
      }
      setRemaining(null);
      // Keep the token rotating so an actively used app never hits an
      // expired access token mid-action.
      if (Date.now() - lastKeepalive.current >= KEEPALIVE_MS) {
        lastKeepalive.current = Date.now();
        void getBrowserAuthProvider()
          .refreshSession?.()
          .catch(() => {});
      }
    }, 15_000);

    return () => {
      for (const e of events) window.removeEventListener(e, touch);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(tick);
    };
  }, [active, signOut]);

  if (!active || remaining === null) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-card-foreground">{copy.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body(remaining)}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              signedOut.current = true;
              setRemaining(null);
              void signOut();
            }}
          >
            {copy.out}
          </Button>
          <Button
            onClick={() => {
              const ts = Date.now();
              lastActivity.current = ts;
              writeLastActivity(ts);
              setRemaining(null);
              lastKeepalive.current = ts;
              void getBrowserAuthProvider()
                .refreshSession?.()
                .catch(() => {});
            }}
          >
            {copy.stay}
          </Button>
        </div>
      </div>
    </div>
  );
}
