import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { HardDrive, Download, ShieldCheck, Server } from "lucide-react";
import { useT } from "@/i18n";

export const Route = createFileRoute("/windows-only")({
  head: () =>
    pageHead({
      title: "OPSQAI runs on your Windows Server — not in the cloud",
      description:
        "OPSQAI is a Windows-installed product. Company end users sign in only inside the local installation. The cloud site is used only by OPSQAI staff (Management Center) and designated customer contacts (Customer Portal).",
      path: "/windows-only",
    }),
  component: WindowsOnlyPage,
});

function WindowsOnlyPage() {
  const { lang } = useT();
  const de = lang === "de";

  const copy = de
    ? {
        badge: "Self-Hosted-Produkt",
        h1: "OPSQAI läuft im Netzwerk Ihres Unternehmens.",
        lead: "OPSQAI ist kein Cloud-SaaS. Es ist ein Windows-Installer, den Sie auf Ihrem eigenen Server ausführen. Firmenbenutzer, Wissen und KI-Anbieter bleiben in Ihrem Netzwerk. Hier gibt es nichts, wofür Sie sich anmelden müssten.",
        ctaHow: "So funktioniert es",
        ctaPortal: "Kundenportal (Downloads)",
        selfhostedTitle: "Self-Hosted (Windows)",
        selfhostedBody:
          "Das eigentliche Produkt. Installiert auf Ihrem Windows-Server. Alle Firmenbenutzer melden sich dort an, sobald Ihr Administrator die Installation aktiviert hat.",
        portalTitle: "Kundenportal (diese Website)",
        portalBody:
          "Nur für benannte Ansprechpartner. Installer und Aktivierungspakete herunterladen, Release-Notes lesen, Support-Tickets öffnen.",
        mcTitle: "Management Center",
        mcBody:
          "Nur für das OPSQAI-Team. Ausstellung von Lizenzen, Auslieferung von Releases, Kundensupport. Kunden haben keinen Zugriff.",
      }
    : {
        badge: "Self-Hosted product",
        h1: "The OPSQAI application runs inside your company.",
        lead: "OPSQAI is not a cloud SaaS. It is a Windows installer that you deploy on your own server. Your company's users, knowledge, and AI provider all stay inside your network. There is nothing to sign in to here.",
        ctaHow: "How it works",
        ctaPortal: "Customer Portal (downloads)",
        selfhostedTitle: "Self-Hosted (Windows)",
        selfhostedBody:
          "The product itself. Installed on your Windows Server. All company users sign in here, after your administrator activates the installation.",
        portalTitle: "Customer Portal (this site)",
        portalBody:
          "For designated customer contacts only. Download installers, retrieve activation bundles, read release notes, open support tickets.",
        mcTitle: "Management Center",
        mcBody:
          "OPSQAI staff only. Issues licenses, ships releases, provides customer support. Not accessible to customers.",
      };

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-1 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5" />
          {copy.badge}
        </div>
        <h1 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight">{copy.h1}</h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{copy.lead}</p>
        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <Button asChild>
            <Link to="/self-hosted">{copy.ctaHow}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/portal">{copy.ctaPortal}</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 border-border/60">
            <Server className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">{copy.selfhostedTitle}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {copy.selfhostedBody}
            </p>
          </Card>
          <Card className="p-6 border-border/60">
            <Download className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">{copy.portalTitle}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{copy.portalBody}</p>
          </Card>
          <Card className="p-6 border-border/60">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="mt-4 font-semibold">{copy.mcTitle}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{copy.mcBody}</p>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
