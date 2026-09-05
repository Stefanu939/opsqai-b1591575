// Public-site product visual: "precision layered architecture" — two real
// product windows stacked with depth, a divided stats grid and a factual
// caption. Static, no motion, no invented metrics. All screenshots are fresh
// captures of the current product design (cloud surfaces only — the Windows
// Self-Hosted app authenticates locally and cannot be screenshotted here).
import { Cloud, HardDrive, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Fresh captures of the current Graphite enterprise design, taken from the
// live Management Center and Customer Portal (September 2026).
import mcOverview from "@/assets/shot-mc-overview.png.asset.json";
import mcInstallations from "@/assets/shot-mc-installations-v2.png.asset.json";
import mcCustomers from "@/assets/shot-mc-customers-v2.png.asset.json";
import mcLicenses from "@/assets/shot-mc-licenses.png.asset.json";
import portalOverview from "@/assets/shot-portal-overview.png.asset.json";
import portalDownloads from "@/assets/shot-portal-downloads.png.asset.json";

type EnterpriseIntelligenceProps = {
  variant?: "product" | "platform" | "security" | "company" | "contact";
  compact?: boolean;
  className?: string;
};

type VariantConfig = {
  eyebrow: string;
  title: string;
  signal: string;
  main: { src: string; caption: string; badge: string; alt: string };
  inset: { src: string; caption: string; alt: string };
  facts: Array<{ label: string; value: string }>;
};

const variantCopy: Record<EnterpriseIntelligenceProps["variant"] & string, VariantConfig> = {
  product: {
    eyebrow: "Customer product",
    title: "Windows Self-Hosted",
    signal: "Licensed configuration",
    main: {
      src: portalDownloads.url,
      caption: "Customer Portal — installer & licenses",
      badge: "Guided setup",
      alt: "OPSQAI Customer Portal downloads with Windows installer, activation bundle and module license",
    },
    inset: {
      src: mcLicenses.url,
      caption: "Signed license issuance",
      alt: "OPSQAI Management Center license issuance for a customer",
    },
    facts: [
      { label: "Runs on", value: "Windows Server / Pro" },
      { label: "AI", value: "Local Ollama" },
      { label: "Scope", value: "Core + licensed products" },
    ],
  },
  platform: {
    eyebrow: "Effective configuration",
    title: "Core + licensed products",
    signal: "Entitlements verified",
    main: {
      src: mcOverview.url,
      caption: "Management Center — Control Center",
      badge: "Live fleet",
      alt: "OPSQAI Management Center control center with licenses, revenue and installations",
    },
    inset: {
      src: portalOverview.url,
      caption: "Customer Portal",
      alt: "OPSQAI Customer Portal overview with subscription and downloads",
    },
    facts: [
      { label: "Core", value: "Always on" },
      { label: "Products", value: "Operations · Quality · Logistics" },
      { label: "Also", value: "HR · Finance · Inventory" },
    ],
  },
  security: {
    eyebrow: "Customer boundary",
    title: "Knowledge stays local",
    signal: "Signed & governed",
    main: {
      src: mcLicenses.url,
      caption: "Management Center — signed licenses",
      badge: "Ed25519 signed",
      alt: "OPSQAI Management Center signed license management",
    },
    inset: {
      src: mcInstallations.url,
      caption: "Installation fleet",
      alt: "OPSQAI Management Center installation fleet with heartbeat status",
    },
    facts: [
      { label: "Licenses", value: "Ed25519 signed" },
      { label: "Access", value: "Roles · ACL · Audit" },
      { label: "Data", value: "Stays on customer hardware" },
    ],
  },
  company: {
    eyebrow: "Operational intelligence",
    title: "Built for real work",
    signal: "People in control",
    main: {
      src: mcCustomers.url,
      caption: "Management Center — customers",
      badge: "Ownership",
      alt: "OPSQAI Management Center customer list with ownership",
    },
    inset: {
      src: portalOverview.url,
      caption: "Customer Portal",
      alt: "OPSQAI Customer Portal overview for customers",
    },
    facts: [
      { label: "Knowledge", value: "Reviewed & versioned" },
      { label: "Learning", value: "Paths · Certificates" },
      { label: "Compliance", value: "Findings & remediation" },
    ],
  },
  contact: {
    eyebrow: "Reference installation",
    title: "Your Windows environment",
    signal: "Architecture aligned",
    main: {
      src: mcCustomers.url,
      caption: "Management Center — customer configuration",
      badge: "Entitlements",
      alt: "OPSQAI Management Center customer configuration",
    },
    inset: {
      src: portalOverview.url,
      caption: "Customer Portal",
      alt: "OPSQAI Customer Portal overview for customers",
    },
    facts: [
      { label: "Setup", value: "Guided installer" },
      { label: "Support", value: "Customer Portal" },
      { label: "Operations", value: "Management Center" },
    ],
  },
};

export function EnterpriseIntelligence({
  variant = "product",
  compact = false,
  className,
}: EnterpriseIntelligenceProps) {
  const copy = variantCopy[variant];

  return (
    <figure
      className={cn(
        "relative mx-auto flex w-full max-w-xl flex-col gap-6 overflow-hidden rounded-xl border border-border bg-card p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)]",
        compact && "max-w-[28rem] gap-5 p-5",
        className,
      )}
    >
      {/* Header: eyebrow, serif title, verified pill */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {copy.eyebrow}
          </div>
          <div className="mt-1 font-display text-2xl font-medium leading-tight text-foreground">
            {copy.title}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-secondary/70 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {copy.signal}
          </span>
        </div>
      </div>

      {/* Layered product windows */}
      <div className={cn("relative w-full", compact ? "h-56" : "h-64")}>
        {/* Background window: cloud surface, top-right */}
        <div className="absolute right-0 top-0 h-[72%] w-4/5 overflow-hidden rounded-lg border border-border bg-secondary/40 shadow-xl">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/70 px-3 py-2">
            <span className="flex gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-border" />
              <i className="h-1.5 w-1.5 rounded-full bg-border" />
            </span>
            <Cloud className="h-3 w-3 text-muted-foreground" strokeWidth={1.6} />
            <span className="truncate font-mono text-[9px] uppercase tracking-tighter text-muted-foreground">
              {copy.inset.caption}
            </span>
          </div>
          <img
            src={copy.inset.src}
            alt={copy.inset.alt}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover object-top"
          />
        </div>

        {/* Foreground window: Self-Hosted dashboard, bottom-left */}
        <div className="absolute bottom-0 left-0 h-[80%] w-[92%] overflow-hidden rounded-lg border border-border bg-card shadow-2xl ring-4 ring-card">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/70 px-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <HardDrive className="h-3 w-3 shrink-0 text-primary" strokeWidth={1.6} />
              <span className="truncate text-[10px] font-medium tracking-tight text-foreground">
                {copy.main.caption}
              </span>
            </div>
            <span className="shrink-0 rounded border border-primary/25 bg-primary/10 px-2 py-0.5 text-[8px] font-bold uppercase text-primary">
              {copy.main.badge}
            </span>
          </div>
          <img
            src={copy.main.src}
            alt={copy.main.alt}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover object-top"
          />
        </div>
      </div>

      {/* Stats grid with hairline dividers */}
      <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-border">
        {copy.facts.map((fact, i) => (
          <div
            key={fact.label}
            className={cn("bg-secondary/30 p-4", i > 0 && "border-l border-border")}
          >
            <dt
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest",
                i === 0 ? "text-primary" : i === 1 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {fact.label}
            </dt>
            <dd className="mt-2 text-xs leading-tight text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/* Caption footer */}
      <figcaption className="flex items-center gap-3 pt-1">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary/60" strokeWidth={1.5} />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Real product screens · Management Center · Customer Portal
        </span>
      </figcaption>
    </figure>
  );
}
