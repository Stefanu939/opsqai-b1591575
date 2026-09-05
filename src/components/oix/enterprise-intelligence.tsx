import { Activity, Cloud, HardDrive, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type EnterpriseIntelligenceProps = {
  variant?: "product" | "platform" | "security" | "company" | "contact";
  compact?: boolean;
  className?: string;
};

const variantCopy = {
  product: {
    eyebrow: "Customer product",
    title: "Windows Self-Hosted",
    signal: "Licensed configuration",
    detail: "Core · Products · Add-ons",
  },
  platform: {
    eyebrow: "Effective configuration",
    title: "Core + licensed products",
    signal: "Entitlements verified",
    detail: "Operations · Quality · Logistics · HR · Finance · Inventory",
  },
  security: {
    eyebrow: "Customer boundary",
    title: "Knowledge stays local",
    signal: "Signed & governed",
    detail: "Identity · ACL · Audit · Ed25519",
  },
  company: {
    eyebrow: "Operational intelligence",
    title: "Built for real work",
    signal: "People in control",
    detail: "Knowledge · Learning · Compliance · Operations",
  },
  contact: {
    eyebrow: "Reference installation",
    title: "Your Windows environment",
    signal: "Architecture aligned",
    detail: "Scope · Products · Security · Deployment",
  },
} as const;

export function EnterpriseIntelligence({
  variant = "product",
  compact = false,
  className,
}: EnterpriseIntelligenceProps) {
  const copy = variantCopy[variant];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "enterprise-intelligence relative mx-auto flex aspect-square w-full max-w-[32rem] items-center justify-center",
        compact && "max-w-[25rem]",
        className,
      )}
    >
      <div className="enterprise-ring enterprise-ring-outer" />
      <div className="enterprise-ring enterprise-ring-middle" />
      <div className="enterprise-ring enterprise-ring-inner" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 500">
        <path className="enterprise-path" d="M250 250 L405 100" />
        <path className="enterprise-path enterprise-path-secondary" d="M250 250 L92 392" />
        <path className="enterprise-path enterprise-path-ember" d="M250 250 L425 330" />
        <circle className="enterprise-node" cx="405" cy="100" r="4" />
        <circle className="enterprise-node" cx="92" cy="392" r="4" />
        <circle className="enterprise-node enterprise-node-ember" cx="425" cy="330" r="4" />
      </svg>

      <div className="enterprise-core oix-brackets">
        <HardDrive className="h-7 w-7 text-[var(--oix-gold)]" strokeWidth={1.4} />
        <span className="mt-4 text-[9px] uppercase tracking-[0.24em] text-[var(--oix-gold)]">
          {copy.eyebrow}
        </span>
        <strong className="mt-2 text-center text-sm text-[var(--oix-cream)]">{copy.title}</strong>
      </div>

      <div className="enterprise-signal enterprise-signal-top">
        <Activity className="h-4 w-4 text-[var(--oix-gold)]" />
        <div>
          <span>{copy.signal}</span>
          <div className="enterprise-meter"><i /></div>
        </div>
      </div>

      <div className="enterprise-signal enterprise-signal-bottom">
        <ShieldCheck className="h-4 w-4 text-[var(--oix-ember)]" />
        <div>
          <span>Operational boundary</span>
          <small>{copy.detail}</small>
        </div>
      </div>

      <div className="enterprise-support enterprise-support-mc">
        <Cloud className="h-3.5 w-3.5" />
        <span>Management Center</span>
        <small>OPSQAI staff</small>
      </div>
      <div className="enterprise-support enterprise-support-portal">
        <Cloud className="h-3.5 w-3.5" />
        <span>Customer Portal</span>
        <small>Support service</small>
      </div>
    </div>
  );
}