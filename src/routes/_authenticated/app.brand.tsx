import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { LogoMark, Logo, LogoStacked, LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/brand")({
  component: BrandGuard,
});

function BrandGuard() {
  const { isPlatformAdmin, isPlatformOwner, loading } = useAuth() as ReturnType<typeof useAuth> & {
    loading?: boolean;
  };
  if (loading) return null;
  if (!isPlatformAdmin && !isPlatformOwner) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Brand Center is available only to Platform Admins and the Platform Owner.
        </p>
        <Link
          to="/app"
          className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to app
        </Link>
      </div>
    );
  }
  return <BrandPage />;
}

type Asset = { label: string; href: string; ext: string };

const LOGO_ASSETS: Asset[] = [
  { label: "Mark — SVG (full color)", href: "/brand/logo-mark.svg", ext: "SVG" },
  { label: "Mark — SVG (monochrome)", href: "/brand/logo-mono.svg", ext: "SVG" },
  { label: "Horizontal lockup — dark bg", href: "/brand/logo-horizontal-dark.svg", ext: "SVG" },
  { label: "Horizontal lockup — light bg", href: "/brand/logo-horizontal-light.svg", ext: "SVG" },
  { label: "Favicon — SVG", href: "/favicon.svg", ext: "SVG" },
  { label: "Favicon — ICO (multi-size)", href: "/favicon.ico", ext: "ICO" },
  { label: "App icon — 192", href: "/icons/icon-192.png", ext: "PNG" },
  { label: "App icon — 512", href: "/icons/icon-512.png", ext: "PNG" },
  { label: "PWA maskable — 192", href: "/icons/icon-192-maskable.png", ext: "PNG" },
  { label: "PWA maskable — 512", href: "/icons/icon-512-maskable.png", ext: "PNG" },
  { label: "Apple touch icon — 180", href: "/icons/apple-touch-icon.png", ext: "PNG" },
];

const SOCIAL_ASSETS: Asset[] = [
  {
    label: "LinkedIn — profile (400×400)",
    href: "/brand/social/linkedin-profile-400.png",
    ext: "PNG",
  },
  {
    label: "LinkedIn — banner (1584×396)",
    href: "/brand/social/linkedin-banner-1584x396.png",
    ext: "PNG",
  },
  {
    label: "LinkedIn — cover (1128×191)",
    href: "/brand/social/linkedin-cover-1128x191.png",
    ext: "PNG",
  },
  {
    label: "Instagram — profile (1080)",
    href: "/brand/social/instagram-profile-1080.png",
    ext: "PNG",
  },
  {
    label: "Instagram — post (1080×1080)",
    href: "/brand/social/instagram-post-1080x1080.png",
    ext: "PNG",
  },
  {
    label: "Instagram — story (1080×1920)",
    href: "/brand/social/instagram-story-1080x1920.png",
    ext: "PNG",
  },
  {
    label: "X / Twitter — banner (1500×500)",
    href: "/brand/social/x-banner-1500x500.png",
    ext: "PNG",
  },
  {
    label: "Facebook — cover (1640×624)",
    href: "/brand/social/facebook-cover-1640x624.png",
    ext: "PNG",
  },
  {
    label: "YouTube — banner (2560×1440)",
    href: "/brand/social/youtube-banner-2560x1440.png",
    ext: "PNG",
  },
  {
    label: "Product Hunt — thumbnail (1000)",
    href: "/brand/social/product-hunt-1000.png",
    ext: "PNG",
  },
  { label: "GitHub — organization avatar", href: "/brand/social/github-org-460.png", ext: "PNG" },
  { label: "App Store icon (1024)", href: "/brand/social/app-store-icon-1024.png", ext: "PNG" },
  { label: "Google Play icon (512)", href: "/brand/social/google-play-icon-512.png", ext: "PNG" },
  { label: "Open Graph image (1200×630)", href: "/og-image.jpg", ext: "JPG" },
];

const COLOR_TOKENS = [
  { name: "Navy / Ink (bg-dark)", hex: "#020617", token: "--background (dark)" },
  { name: "Deep Navy", hex: "#0F172A", token: "--foreground (light) / surface (dark)" },
  { name: "Enterprise Blue", hex: "#2563EB", token: "--primary" },
  { name: "Signal Blue", hex: "#3B82F6", token: "--primary (dark) / --primary-glow" },
  { name: "Operational Teal", hex: "#14B8A6", token: "--signal" },
  { name: "Success", hex: "#10B981", token: "--success" },
  { name: "Warning", hex: "#F59E0B", token: "--warning" },
  { name: "Error", hex: "#DC2626", token: "--destructive" },
  { name: "Surface", hex: "#FFFFFF", token: "--surface (light)" },
  { name: "Slate 50", hex: "#F8FAFC", token: "--background (light)" },
];

function DownloadCard({ asset }: { asset: Asset }) {
  return (
    <a
      href={asset.href}
      download
      className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 hover-lift"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{asset.label}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {asset.ext}
        </div>
      </div>
      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
    </a>
  );
}

function Swatch({ name, hex, token }: { name: string; hex: string; token: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div
        className="h-12 w-12 rounded-md shrink-0 border border-border"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="font-mono text-[11px] text-muted-foreground">{hex}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 truncate">
          {token}
        </div>
      </div>
    </div>
  );
}

function BrandPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 space-y-12">
      <header className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Brand Center</div>
        <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
          OPSQAI Visual Identity
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          The single source of truth for every OPSQAI surface — logo, color, typography, and
          ready-to-ship assets for product, web, marketing and the app stores. Download SVG and PNG
          below; everything you see in the app loads from these same files.
        </p>
      </header>

      {/* Logo system */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold">Logo system</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-8 flex flex-col items-center justify-center gap-4 bg-[#020617] min-h-[180px]">
            <Logo size={36} />
            <span className="text-[11px] uppercase tracking-wider text-white/50">
              Horizontal · dark
            </span>
          </Card>
          <Card className="p-8 flex flex-col items-center justify-center gap-4 bg-white text-slate-900 min-h-[180px]">
            <Logo size={36} />
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              Horizontal · light
            </span>
          </Card>
          <Card className="p-8 flex flex-col items-center justify-center gap-4 min-h-[180px]">
            <LogoStacked size={72} />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Stacked
            </span>
          </Card>
          <Card className="p-8 flex items-center justify-center min-h-[140px]">
            <LogoMark size={64} />
          </Card>
          <Card className="p-8 flex items-center justify-center min-h-[140px]">
            <LogoMark size={64} mono className="text-foreground" />
          </Card>
          <Card className="p-8 flex items-center justify-center min-h-[140px]">
            <LogoWordmark size={32} />
          </Card>
        </div>
      </section>

      {/* Color palette */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold">Color palette</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Deep navy provides authority. Enterprise blue signals AI interaction. Teal marks
          operational success. The palette is WCAG AA across both themes.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_TOKENS.map((c) => (
            <Swatch key={c.hex} {...c} />
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold">Typography</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Display — Space Grotesk
            </div>
            <div className="font-display text-4xl font-semibold tracking-tight">
              Operational Knowledge.
            </div>
            <div className="font-display text-2xl font-medium text-muted-foreground mt-1">
              Built for warehouses.
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Body — Inter
            </div>
            <p className="text-base">
              OPSQAI grounds every answer in your SOPs, manuals and FAQs. No hallucinations, full
              audit trail, multilingual by default — the operational standard for enterprise AI.
            </p>
          </Card>
        </div>
      </section>

      {/* Logo assets */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold">Logo & app icons</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOGO_ASSETS.map((a) => (
            <DownloadCard key={a.href} asset={a} />
          ))}
        </div>
      </section>

      {/* Social */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold">Social & app store</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIAL_ASSETS.map((a) => (
            <DownloadCard key={a.href} asset={a} />
          ))}
        </div>
      </section>

      {/* Guidelines */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold">Usage guidelines</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6 space-y-2">
            <div className="text-sm font-semibold">Do</div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Use the SVG mark wherever possible — it stays sharp at any size.</li>
              <li>Maintain clear space equal to the mark's intelligence core on all sides.</li>
              <li>Use the dark lockup on navy/ink, light lockup on slate-50/white.</li>
              <li>Minimum mark size: 16px favicon, 24px in UI, 32px on marketing.</li>
            </ul>
          </Card>
          <Card className="p-6 space-y-2">
            <div className="text-sm font-semibold">Don't</div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Don't recolor the mark with gradients or photographic fills.</li>
              <li>Don't rotate, skew, outline, or otherwise distort the geometry.</li>
              <li>Don't replace the wordmark — always use Space Grotesk SemiBold.</li>
              <li>Don't place the dark mark on dark backgrounds without the wordmark in white.</li>
            </ul>
          </Card>
        </div>
      </section>

      <footer className="pt-6 border-t border-border text-sm text-muted-foreground flex items-center justify-between">
        <span>
          Need a custom export?{" "}
          <a
            href="mailto:brand@opsqai.de"
            className="text-primary underline-offset-4 hover:underline"
          >
            brand@opsqai.de
          </a>
        </span>
        <Button asChild variant="outline" size="sm">
          <a href="/brand/logo-mark.svg" download>
            <Download className="h-4 w-4 mr-2" /> Master mark
          </a>
        </Button>
      </footer>
    </div>
  );
}
