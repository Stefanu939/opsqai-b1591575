import { createFileRoute, Link } from "@tanstack/react-router";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { pageHead } from "@/lib/seo";
import { useT } from "@/i18n";

export const Route = createFileRoute("/press")({
  head: () =>
    pageHead({
      title: "OPSQAI Press & Careers — media kit and open roles",
      description: "Press information, brand assets and careers at OPSQAI, the self-hosted operational intelligence platform.",
      path: "/press",
    }),
  component: PressPage,
});

const copy = {
  en: { eyebrow: "Press & Careers", h: "OPSQAI in", s: "short.", about: "OPSQAI is a self-hosted operational intelligence platform: governed AI, knowledge, training and audit — installed on the customer's own Windows server.", pressT: "Press", pressB: "For interviews, statements or information, write to us. Logos and brand assets are on the brand page.", brand: "Brand assets", careersT: "Careers", careersB: "We have no open roles listed right now. If you want to build sovereign AI with us, send a short note about yourself.", contact: "Contact us" },
  de: { eyebrow: "Presse & Karriere", h: "OPSQAI in", s: "Kürze.", about: "OPSQAI ist eine Self-Hosted-Plattform für operative Intelligenz: kontrollierte KI, Wissen, Schulung und Audit — auf dem eigenen Windows-Server des Kunden.", pressT: "Presse", pressB: "Für Interviews, Statements oder Informationen schreiben Sie uns. Logos finden Sie auf der Markenseite.", brand: "Markenmaterial", careersT: "Karriere", careersB: "Derzeit sind keine Stellen ausgeschrieben. Wenn Sie souveräne KI mit uns bauen möchten, schreiben Sie uns kurz.", contact: "Kontakt" },
  ro: { eyebrow: "Presă & Cariere", h: "OPSQAI pe", s: "scurt.", about: "OPSQAI este o platformă self-hosted de inteligență operațională: AI controlat, cunoștințe, instruire și audit — instalată pe serverul Windows al clientului.", pressT: "Presă", pressB: "Pentru interviuri, declarații sau informații, scrieți-ne. Logo-urile și materialele de brand sunt pe pagina de brand.", brand: "Materiale de brand", careersT: "Cariere", careersB: "Momentan nu avem posturi deschise. Dacă vreți să construiți AI suveran cu noi, trimiteți-ne câteva rânduri despre dumneavoastră.", contact: "Contactați-ne" },
};

function PressPage() {
  const { lang } = useT();
  const t = copy[lang === "de" ? "de" : lang === "ro" ? "ro" : "en"];
  return (
    <OixLayout>
      <section className="border-b border-[var(--oix-gold-line)]">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-32 md:pt-40">
          <EditorialHeadline as="h1" size="xl" eyebrow={t.eyebrow} serifAccent={t.s}>{t.h}</EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg text-[var(--oix-cream-dim)]">{t.about}</p>
        </div>
      </section>
      <SectionShell>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div id="press" className="scroll-mt-28 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{t.pressT}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{t.pressB}</p>
            <div className="mt-5 flex gap-4 text-sm font-semibold text-primary">
              <Link to="/contact">{t.contact}</Link>
              <Link to="/brand">{t.brand}</Link>
            </div>
          </div>
          <div id="careers" className="scroll-mt-28 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{t.careersT}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{t.careersB}</p>
            <Link to="/contact" className="mt-5 inline-block text-sm font-semibold text-primary">{t.contact}</Link>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
