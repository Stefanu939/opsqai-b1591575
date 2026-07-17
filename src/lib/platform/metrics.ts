// Minimal in-process metrics registry.
//
// Phase 5. Deliberately dependency-free — the point is to give the
// updater's post-install gate and any external Prometheus scraper a
// stable, cheap set of counters/gauges without pulling `prom-client`
// into a Cloudflare Worker bundle.
//
// The registry is a plain module-level Map. Every counter/gauge has a
// namespaced name (`opsqai_<subsystem>_<verb>`), an optional help
// string, and an optional labelset. Serialization renders a strict
// subset of the Prometheus text exposition format so `curl /metrics`
// works in every scraper.

export type MetricType = "counter" | "gauge";

export interface MetricSample {
  labels: Record<string, string>;
  value: number;
}

interface MetricDef {
  name: string;
  type: MetricType;
  help: string;
  samples: Map<string, MetricSample>;
}

const REGISTRY = new Map<string, MetricDef>();

function labelKey(labels: Record<string, string>): string {
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${labels[k]}`).join(",");
}

function ensure(name: string, type: MetricType, help: string): MetricDef {
  let def = REGISTRY.get(name);
  if (!def) {
    def = { name, type, help, samples: new Map() };
    REGISTRY.set(name, def);
  }
  return def;
}

export function counter(
  name: string,
  help: string,
  labels: Record<string, string> = {},
  delta = 1,
): void {
  const def = ensure(name, "counter", help);
  const k = labelKey(labels);
  const existing = def.samples.get(k);
  def.samples.set(k, { labels, value: (existing?.value ?? 0) + delta });
}

export function gauge(
  name: string,
  help: string,
  value: number,
  labels: Record<string, string> = {},
): void {
  const def = ensure(name, "gauge", help);
  def.samples.set(labelKey(labels), { labels, value });
}

export function snapshot(): MetricDef[] {
  return Array.from(REGISTRY.values());
}

/** Prometheus text exposition (v0.0.4). */
export function renderPrometheus(): string {
  const lines: string[] = [];
  for (const def of REGISTRY.values()) {
    lines.push(`# HELP ${def.name} ${def.help}`);
    lines.push(`# TYPE ${def.name} ${def.type}`);
    for (const s of def.samples.values()) {
      const labelStr = Object.keys(s.labels).length
        ? "{" +
          Object.entries(s.labels)
            .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`)
            .join(",") +
          "}"
        : "";
      lines.push(`${def.name}${labelStr} ${s.value}`);
    }
  }
  return lines.join("\n") + "\n";
}

export function resetMetrics(): void {
  REGISTRY.clear();
}
