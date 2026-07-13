import { Link, useRouterState } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronRight, Search, Bell, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

const PATH_LABELS: Record<string, string> = {
  app: "OPSQAI",
  platform: "Platform",
  overview: "Overview",
  onboarding: "Onboarding",
  licenses: "Licenses",
  doctor: "Doctor",
  recovery: "Recovery",
  setup: "Setup",
  "license-activation": "License Activation",
  "installation-package": "Installation Package",
  admin: "Admin",
  customers: "Customers",
  "platform-admins": "Platform Admins",
};

function labelFor(segment: string) {
  return PATH_LABELS[segment] ?? segment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlatformTopbar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--mc-gold-line)] bg-[#0d0d0d]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[#0d0d0d]/70">
      <SidebarTrigger className="h-8 w-8 shrink-0 rounded-md text-[var(--mc-fg-muted)] hover:bg-[var(--mc-surface-2)] hover:text-[var(--mc-gold)]" />

      <div className="flex min-w-0 items-center gap-1 text-[12px]">
        {segments.slice(0, -1).map((s, idx) => (
          <div key={idx} className="flex items-center gap-1 text-[var(--mc-fg-dim)]">
            <span className="truncate">{labelFor(s)}</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        ))}
        <span className="mc-heading truncate font-semibold text-[var(--mc-fg)]">
          {labelFor(segments[segments.length - 1] ?? "app")}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] px-2.5 py-1 text-[12px] text-[var(--mc-fg-muted)] w-56">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <span className="ml-auto flex items-center gap-0.5 rounded border border-[var(--mc-gold-line)] px-1 py-0 text-[10px] text-[var(--mc-fg-dim)]">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] px-2 py-1 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--mc-success)] shadow-[0_0_6px_var(--mc-success)]" />
          <span className="mc-eyebrow text-[var(--mc-fg-muted)]">prod</span>
        </div>

        <Button
          asChild
          size="sm"
          className="h-8 gap-1.5 bg-gradient-to-b from-[#d4b458] to-[#a48633] text-[#0d0d0d] font-semibold mc-shadow-gold hover:brightness-110"
        >
          <Link to="/app/platform/onboarding">
            <span className="text-[12px]">+ Onboard client</span>
          </Link>
        </Button>

        <button
          type="button"
          className="relative h-8 w-8 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] text-[var(--mc-fg-muted)] hover:text-[var(--mc-gold)]"
          aria-label="Notifications"
        >
          <Bell className="mx-auto h-3.5 w-3.5" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--mc-gold)] shadow-[0_0_6px_var(--mc-gold)]" />
        </button>
      </div>
    </header>
  );
}
