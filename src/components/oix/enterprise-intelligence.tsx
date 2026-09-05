// Public-site product visual: a static "operations panel" built from real
// product screenshots (Self-Hosted, Management Center, Customer Portal) with a
// factual signal strip. No motion, no invented metrics.
import { Activity, Cloud, HardDrive, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

import shDashboard from "@/assets/shot-sh-dashboard.png.asset.json";
import shChat from "@/assets/shot-sh-chat.png.asset.json";
import shAudit from "@/assets/shot-sh-audit.png.asset.json";
import shAcademy from "@/assets/shot-sh-academy.png.asset.json";
import shKnowledge from "@/assets/shot-sh-knowledge.png.asset.json";
import mcInstallations from "@/assets/shot-mc-installations.png.asset.json";
import mcCustomers from "@/assets/shot-mc-customers.png.asset.json";
import portalShot from "@/assets/shot-portal.png.asset.json";
import instLicense from "@/assets/shot-inst-license.png.asset.json";

type EnterpriseIntelligenceProps = {
  variant?: "product" | "platform" | "security" | "company" | "contact";
  compact?: boolean;
  className?: string;
};

type VariantConfig = {
  eyebrow: string;
  title: string;
  signal: string;
  main: { src: string; caption: string; alt: string };
  inset: { src: string; caption: string; alt: string };
  facts: Array<{ label: string; value: string }>;
};

const variantCopy: Record<EnterpriseIntelligenceProps["variant"] & string, VariantConfig> = {
  product: {
    eyebrow: "Customer product",
    title: "Windows Self-Hosted",
    signal: "Licensed configuration",
    main: {
      src: shDashboard.url,
      caption: "Self-Hosted · Dashboard",
      alt: "OPSQAI Self-Hosted dashboard with operational overview",
    },
    inset: {
      src: shChat.url,
      caption: "AI assistant",
      alt: "OPSQAI AI assistant answering from company knowledge",
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
      src: shDashboard.url,
      caption: "Self-Hosted · Dashboard",
      alt: "OPSQAI Self-Hosted dashboard with operational overview",
    },
    inset: {
      src: mcInstallations.url,
      caption: "Management Center · Installations",
      alt: "OPSQAI Management Center installation fleet view",
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
      src: shAudit.url,
      caption: "Self-Hosted · Audit",
      alt: "OPSQAI audit and compliance findings screen",
    },
    inset: {
      src: instLicense.url,
      caption: "Signed license",
      alt: "OPSQAI installer license activation step",
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
      src: shAcademy.url,
      caption: "Self-Hosted · Academy",
      alt: "OPSQAI Academy learning paths for employees",
    },
    inset: {
      src: shKnowledge.url,
      caption: "Governed knowledge",
      alt: "OPSQAI knowledge library with governed documents",
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
      caption: "Management Center · Customers",
      alt: "OPSQAI Management Center customer configuration",
    },
    inset: {
      src: portalShot.url,
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
        "relative mx-auto w-full max-w-[36rem] rounded-lg border border-border bg-card p-4 shadow-sm",
        compact && "max-w-[28rem] p-3",
        className,
      )}
    >
      {/* Signal header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {copy.eyebrow}
          </div>
          <div className="mt-1 truncate font-display text-base text-foreground">{copy.title}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 py-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
          <div className="leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
              {copy.signal}
            </div>
            <div className="mt-1 h-0.5 w-20 rounded-full bg-border">
              <i className="block h-0.5 w-14 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Main product screenshot in a restrained window frame */}
      <div className="relative mt-4 overflow-hidden rounded-md border border-border bg-secondary/40">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <HardDrive className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.main.caption}
          </span>
        </div>
        <img
          src={copy.main.src}
          alt={copy.main.alt}
          loading="lazy"
          decoding="async"
          className="block w-full"
        />

        {/* Secondary screenshot, offset like a stacked report */}
        <div
          className={cn(
            "absolute bottom-3 right-3 w-[46%] overflow-hidden rounded-md border border-border bg-card shadow-md",
            compact && "w-[52%]",
          )}
        >
          <div className="flex items-center gap-1.5 border-b border-border px-2 py-1">
            <Cloud className="h-3 w-3 text-muted-foreground" strokeWidth={1.6} />
            <span className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {copy.inset.caption}
            </span>
          </div>
          <img
            src={copy.inset.src}
            alt={copy.inset.alt}
            loading="lazy"
            decoding="async"
            className="block w-full"
          />
        </div>
      </div>

      {/* Factual signal strip */}
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {copy.facts.map((fact) => (
          <div key={fact.label} className="rounded-md border border-border bg-secondary/40 p-2.5">
            <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="mt-1 text-[11px] leading-snug text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <figcaption className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
        Real product screens · Windows Self-Hosted with Cloud support services
      </figcaption>
    </figure>
  );
}
