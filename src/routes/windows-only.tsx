import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { HardDrive, Download, ShieldCheck, Server } from "lucide-react";
import { useT } from "@/i18n";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { getBrowserAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/windows-only")({
  beforeLoad: async () => {
    if (getClientDeploymentMode() !== "selfhost") return;
    const user = await getBrowserAuthProvider().getUser();
    if (user) throw redirect({ to: "/app" });
    throw redirect({ to: "/auth", search: { audience: "company", next: "/app" } });
  },
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
  const ro = lang === "ro";

  const copy = ro
    ? {
        badge: "Produs Self-Hosted",
        h1: "Aplicația OPSQAI rulează în compania dumneavoastră.",
        lead: "OPSQAI nu este un SaaS în cloud. Este un produs instalat pe Windows Server, în propria infrastructură. Utilizatorii, cunoștințele și furnizorul AI rămân în rețeaua companiei.",
        ctaHow: "Cum funcționează",
        ctaPortal: "Portal Clienți (descărcări)",
        selfhostedTitle: "Self-Hosted (Windows)",
        selfhostedBody: "Produsul propriu-zis. Este instalat pe Windows Server, iar utilizatorii companiei se conectează local după activarea instalării de către administrator.",
        portalTitle: "Portal Clienți (acest site)",
        portalBody: "Doar pentru contactele desemnate ale clientului: instalatoare, pachete de activare, note de versiune și solicitări de suport.",
        mcTitle: "Management Center",
        mcBody: "Doar pentru echipa OPSQAI: licențe, versiuni și suport pentru clienți. Nu este accesibil clienților.",
      }
    : de
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
      <section className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <div className="oix-eyebrow inline-flex items-center gap-2 border border-[var(--oix-gold-line)] bg-[var(--oix-surface-2)] px-3 py-2">
          <HardDrive className="h-3.5 w-3.5" />
          {copy.badge}
        </div>
        <h1 className="oix-display mt-7 text-5xl md:text-7xl">{copy.h1}</h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--oix-cream-dim)]">{copy.lead}</p>
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
