// Anonymous demo session — client-only. No server tokens; the demo tenant's
// data is public via narrow anon SELECT policies filtered on is_demo_tenant,
// so the timer's only job is to bound the UX to ~15 minutes.
import { useEffect, useState, useSyncExternalStore } from "react";

const KEY = "opsqai_demo_session_v1";
const DEFAULT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const DEMO_COMPANY_ID = "00000000-0000-0000-0000-0000000d3110";
export const DEMO_COMPANY_NAME = "Atlas Logistics GmbH";

type Snapshot = { expiresAt: number | null };

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function read(): Snapshot {
  if (typeof window === "undefined") return { expiresAt: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { expiresAt: null };
    const v = JSON.parse(raw) as { expiresAt: number };
    if (!v || typeof v.expiresAt !== "number") return { expiresAt: null };
    return { expiresAt: v.expiresAt };
  } catch { return { expiresAt: null }; }
}

export function startDemoSession(durationMs = DEFAULT_DURATION_MS) {
  const expiresAt = Date.now() + durationMs;
  localStorage.setItem(KEY, JSON.stringify({ expiresAt }));
  emit();
  return expiresAt;
}

export function endDemoSession() {
  localStorage.removeItem(KEY);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

export function useDemoSession() {
  const snap = useSyncExternalStore(subscribe, read, () => ({ expiresAt: null }));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiresAt = snap.expiresAt;
  const msLeft = expiresAt ? Math.max(0, expiresAt - now) : 0;
  const active = !!expiresAt && msLeft > 0;
  const ended = !!expiresAt && msLeft === 0;

  const secondsLeft = Math.floor(msLeft / 1000);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return {
    active,
    ended,
    expiresAt,
    msLeft,
    secondsLeft,
    display: `${mm}:${ss}`,
    start: startDemoSession,
    end: endDemoSession,
  };
}
