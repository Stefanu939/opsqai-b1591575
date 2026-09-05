// Public-site product visual: "precision layered architecture" — two real
// product windows stacked with depth, a divided stats grid and a factual
// caption. Static, no motion, no invented metrics. All screenshots are fresh
// captures of the current product design (cloud surfaces only — the Windows
// Self-Hosted app authenticates locally and cannot be screenshotted here).
import { Cloud, HardDrive, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

// Fresh captures of the current Graphite enterprise design, taken from the
// live Management Center and Customer Portal (September 2026).
import mcOverview from "@/assets/shot-mc-overview.png.asset.json";
import mcInstallations from "@/assets/shot-mc-installations-v2.png.asset.json";
import mcCustomers from "@/assets/shot-mc-customers-v2.png.asset.json";
import mcLicenses from "@/assets/shot-mc-licenses.png.asset.json";
import portalOverview from "@/assets/shot-portal-overview.png.asset.json";
import portalDownloads from "@/assets/shot-portal-downloads.png.asset.json";

type Variant = "product" | "platform" | "security" | "company" | "contact";

type EnterpriseIntelligenceProps = {
  variant?: Variant;
  compact?: boolean;
  className?: string;
};

type VariantAssets = {
  main: { src: string; alt: string };
  inset: { src: string; alt: string };
};

const variantAssets: Record<Variant, VariantAssets> = {
  product: {
    main: {
      src: portalDownloads.url,
      alt: "OPSQAI Customer Portal downloads with Windows installer, activation bundle and module license",
    },
    inset: { src: mcLicenses.url, alt: "OPSQAI Management Center license issuance for a customer" },
  },
  platform: {
    main: {
      src: mcOverview.url,
      alt: "OPSQAI Management Center control center with licenses, revenue and installations",
    },
    inset: {
      src: portalOverview.url,
      alt: "OPSQAI Customer Portal overview with subscription and downloads",
    },
  },
  security: {
    main: { src: mcLicenses.url, alt: "OPSQAI Management Center signed license management" },
    inset: {
      src: mcInstallations.url,
      alt: "OPSQAI Management Center installation fleet with heartbeat status",
    },
  },
  company: {
    main: { src: mcCustomers.url, alt: "OPSQAI Management Center customer list with ownership" },
    inset: { src: portalOverview.url, alt: "OPSQAI Customer Portal overview for customers" },
  },
  contact: {
    main: { src: mcCustomers.url, alt: "OPSQAI Management Center customer configuration" },
    inset: { src: portalOverview.url, alt: "OPSQAI Customer Portal overview for customers" },
  },
};

type VariantText = {
  eyebrow: string;
  title: string;
  signal: string;
  mainCaption: string;
  badge: string;
  insetCaption: string;
  facts: Array<{ label: string; value: string }>;
};

type VisualCopy = {
  footer: string;
  variants: Record<Variant, VariantText>;
};

const en: VisualCopy = {
  footer: "Real product screens · Management Center · Customer Portal",
  variants: {
    product: {
      eyebrow: "Customer product",
      title: "Windows Self-Hosted",
      signal: "Licensed configuration",
      mainCaption: "Customer Portal — installer & licenses",
      badge: "Guided setup",
      insetCaption: "Signed license issuance",
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
      mainCaption: "Management Center — Control Center",
      badge: "Live fleet",
      insetCaption: "Customer Portal",
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
      mainCaption: "Management Center — signed licenses",
      badge: "Ed25519 signed",
      insetCaption: "Installation fleet",
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
      mainCaption: "Management Center — customers",
      badge: "Ownership",
      insetCaption: "Customer Portal",
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
      mainCaption: "Management Center — customer configuration",
      badge: "Entitlements",
      insetCaption: "Customer Portal",
      facts: [
        { label: "Setup", value: "Guided installer" },
        { label: "Support", value: "Customer Portal" },
        { label: "Operations", value: "Management Center" },
      ],
    },
  },
};

const de: VisualCopy = {
  footer: "Echte Produktansichten · Management Center · Kundenportal",
  variants: {
    product: {
      eyebrow: "Kundenprodukt",
      title: "Windows Self-Hosted",
      signal: "Lizenzierte Konfiguration",
      mainCaption: "Kundenportal — Installer & Lizenzen",
      badge: "Geführte Einrichtung",
      insetCaption: "Signierte Lizenzausgabe",
      facts: [
        { label: "Läuft auf", value: "Windows Server / Pro" },
        { label: "KI", value: "Lokales Ollama" },
        { label: "Umfang", value: "Core + lizenzierte Produkte" },
      ],
    },
    platform: {
      eyebrow: "Effektive Konfiguration",
      title: "Core + lizenzierte Produkte",
      signal: "Berechtigungen geprüft",
      mainCaption: "Management Center — Control Center",
      badge: "Aktive Flotte",
      insetCaption: "Kundenportal",
      facts: [
        { label: "Core", value: "Immer aktiv" },
        { label: "Produkte", value: "Operations · Qualität · Logistik" },
        { label: "Außerdem", value: "HR · Finanzen · Bestand" },
      ],
    },
    security: {
      eyebrow: "Kundengrenze",
      title: "Wissen bleibt lokal",
      signal: "Signiert & kontrolliert",
      mainCaption: "Management Center — signierte Lizenzen",
      badge: "Ed25519 signiert",
      insetCaption: "Installationsflotte",
      facts: [
        { label: "Lizenzen", value: "Ed25519 signiert" },
        { label: "Zugriff", value: "Rollen · ACL · Audit" },
        { label: "Daten", value: "Bleiben auf Kundenhardware" },
      ],
    },
    company: {
      eyebrow: "Operative Intelligenz",
      title: "Für echte Arbeit gebaut",
      signal: "Menschen behalten die Kontrolle",
      mainCaption: "Management Center — Kunden",
      badge: "Zuständigkeit",
      insetCaption: "Kundenportal",
      facts: [
        { label: "Wissen", value: "Geprüft & versioniert" },
        { label: "Lernen", value: "Lernpfade · Zertifikate" },
        { label: "Compliance", value: "Feststellungen & Behebung" },
      ],
    },
    contact: {
      eyebrow: "Referenzinstallation",
      title: "Ihre Windows-Umgebung",
      signal: "Architektonisch abgestimmt",
      mainCaption: "Management Center — Kundenkonfiguration",
      badge: "Berechtigungen",
      insetCaption: "Kundenportal",
      facts: [
        { label: "Einrichtung", value: "Geführter Installer" },
        { label: "Support", value: "Kundenportal" },
        { label: "Betrieb", value: "Management Center" },
      ],
    },
  },
};

const ro: VisualCopy = {
  footer: "Ecrane reale din produs · Management Center · Portal Client",
  variants: {
    product: {
      eyebrow: "Produsul clientului",
      title: "Windows Self-Hosted",
      signal: "Configurație licențiată",
      mainCaption: "Portal Client — installer și licențe",
      badge: "Instalare ghidată",
      insetCaption: "Emitere licență semnată",
      facts: [
        { label: "Rulează pe", value: "Windows Server / Pro" },
        { label: "AI", value: "Ollama local" },
        { label: "Acoperire", value: "Core + produse licențiate" },
      ],
    },
    platform: {
      eyebrow: "Configurație efectivă",
      title: "Core + produse licențiate",
      signal: "Drepturi verificate",
      mainCaption: "Management Center — Control Center",
      badge: "Flotă activă",
      insetCaption: "Portal Client",
      facts: [
        { label: "Core", value: "Mereu activ" },
        { label: "Produse", value: "Operations · Calitate · Logistică" },
        { label: "De asemenea", value: "HR · Finanțe · Stocuri" },
      ],
    },
    security: {
      eyebrow: "Granița clientului",
      title: "Cunoștințele rămân local",
      signal: "Semnat și guvernat",
      mainCaption: "Management Center — licențe semnate",
      badge: "Semnat Ed25519",
      insetCaption: "Flota de instalări",
      facts: [
        { label: "Licențe", value: "Semnate Ed25519" },
        { label: "Acces", value: "Roluri · ACL · Audit" },
        { label: "Date", value: "Rămân pe hardware-ul clientului" },
      ],
    },
    company: {
      eyebrow: "Inteligență operațională",
      title: "Construit pentru munca reală",
      signal: "Oamenii dețin controlul",
      mainCaption: "Management Center — clienți",
      badge: "Responsabilitate",
      insetCaption: "Portal Client",
      facts: [
        { label: "Cunoștințe", value: "Revizuite și versionate" },
        { label: "Învățare", value: "Trasee · Certificate" },
        { label: "Conformitate", value: "Constatări și remediere" },
      ],
    },
    contact: {
      eyebrow: "Instalare de referință",
      title: "Mediul tău Windows",
      signal: "Aliniat la arhitectură",
      mainCaption: "Management Center — configurația clientului",
      badge: "Drepturi",
      insetCaption: "Portal Client",
      facts: [
        { label: "Instalare", value: "Installer ghidat" },
        { label: "Suport", value: "Portal Client" },
        { label: "Operare", value: "Management Center" },
      ],
    },
  },
};

const visualCopy: Record<string, VisualCopy> = { en, de, ro };

export function EnterpriseIntelligence({
  variant = "product",
  compact = false,
  className,
}: EnterpriseIntelligenceProps) {
  const { lang } = useT();
  const localized = visualCopy[lang] ?? en;
  const copy = localized.variants[variant];
  const assets = variantAssets[variant];

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
              {copy.insetCaption}
            </span>
          </div>
          <img
            src={assets.inset.src}
            alt={assets.inset.alt}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover object-top"
          />
        </div>

        {/* Foreground window: primary surface, bottom-left */}
        <div className="absolute bottom-0 left-0 h-[80%] w-[92%] overflow-hidden rounded-lg border border-border bg-card shadow-2xl ring-4 ring-card">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/70 px-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <HardDrive className="h-3 w-3 shrink-0 text-primary" strokeWidth={1.6} />
              <span className="truncate text-[10px] font-medium tracking-tight text-foreground">
                {copy.mainCaption}
              </span>
            </div>
            <span className="shrink-0 rounded border border-primary/25 bg-primary/10 px-2 py-0.5 text-[8px] font-bold uppercase text-primary">
              {copy.badge}
            </span>
          </div>
          <img
            src={assets.main.src}
            alt={assets.main.alt}
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
          {localized.footer}
        </span>
      </figcaption>
    </figure>
  );
}
