// Server-only perf utilities: tiny TTL cache + timing helpers.
// Module-level state survives across requests within the same Worker isolate,
// so this works as a warm cache for repeated lookups.

type Entry<T> = { value: T; expiresAt: number };
const stores = new Map<string, Map<string, Entry<unknown>>>();

export function cacheGet<T>(ns: string, key: string): T | undefined {
  const m = stores.get(ns);
  if (!m) return undefined;
  const e = m.get(key);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    m.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(ns: string, key: string, value: T, ttlMs: number): void {
  let m = stores.get(ns);
  if (!m) {
    m = new Map();
    stores.set(ns, m);
  }
  m.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cached<T>(
  ns: string,
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(ns, key);
  if (hit !== undefined) return hit;
  const v = await fn();
  cacheSet(ns, key, v, ttlMs);
  return v;
}

// Lightweight stage timer. Logs each stage and a summary at the end.
export function createTimer(label: string) {
  const start = performance.now();
  let last = start;
  const stages: Array<{ name: string; ms: number; cumulativeMs: number }> = [];
  return {
    mark(name: string, extra?: Record<string, unknown>) {
      const now = performance.now();
      const ms = +(now - last).toFixed(1);
      const cum = +(now - start).toFixed(1);
      stages.push({ name, ms, cumulativeMs: cum });
      last = now;
      console.log(`[perf:${label}:${name}]`, { ms, t: cum, ...(extra ?? {}) });
    },
    summary(extra?: Record<string, unknown>) {
      const totalMs = +(performance.now() - start).toFixed(1);
      console.log(`[perf:${label}:summary]`, { totalMs, stages, ...(extra ?? {}) });
      return { totalMs, stages };
    },
  };
}

// Fire and forget: run side-effect work in the background without awaiting it.
// In Workers without ctx.waitUntil we still get best-effort execution while the
// response stream stays open.
export function background(promise: Promise<unknown>, label = "bg") {
  promise.catch((e) => console.error(`[bg:${label}]`, e));
}
