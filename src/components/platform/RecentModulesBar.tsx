import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";

const KEY = "mc-recent-modules";
const MAX = 6;

type Entry = { path: string; label: string };

const LABELS: Record<string, string> = {
  "/app/platform/overview": "Overview",
  "/app/admin/companies": "Companies",
  "/app/admin/billing": "Billing",
  "/app/admin/support": "Support Inbox",
  "/app/admin/ai-audit": "Audit AI",
  "/app/admin/maintenance": "Recovery & Maintenance",
  "/app/admin/platform": "Platform Administration",
};

function labelFor(path: string) {
  if (LABELS[path]) return LABELS[path];
  const last = path.split("/").filter(Boolean).pop() ?? "";
  return last.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RecentModulesBar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [items, setItems] = useState<Entry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const list: Entry[] = raw ? JSON.parse(raw) : [];
      if (pathname.startsWith("/app/")) {
        const filtered = list.filter((e) => e.path !== pathname);
        filtered.unshift({ path: pathname, label: labelFor(pathname) });
        const trimmed = filtered.slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(trimmed));
        setItems(trimmed);
      } else {
        setItems(list);
      }
    } catch {
      setItems([]);
    }
  }, [pathname]);

  if (items.length <= 1) return null;

  return (
    <div className="sticky bottom-0 z-30 flex h-10 shrink-0 items-center gap-2 border-t border-[var(--mc-gold-line)] bg-[#0a0a1a]/90 px-4 backdrop-blur">
      <div className="mc-eyebrow flex shrink-0 items-center gap-1.5 text-[var(--mc-fg-dim)]">
        <Clock className="h-3 w-3" /> Recent
      </div>
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {items.map((e) => {
          const active = e.path === pathname;
          return (
            <Link
              key={e.path}
              to={e.path as "/app"}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-2)] text-[var(--mc-gold-glow)]"
                  : "border-[var(--mc-gold-line)] bg-[var(--mc-surface-1)] text-[var(--mc-fg-muted)] hover:text-[var(--mc-gold-glow)]"
              }`}
            >
              {e.label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem(KEY);
          setItems([]);
        }}
        className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--mc-fg-dim)] hover:bg-[var(--mc-surface-2)] hover:text-[var(--mc-fg)]"
        aria-label="Clear recent"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
