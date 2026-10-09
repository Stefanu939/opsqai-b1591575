import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { pageHead } from "@/lib/seo";
import { useT } from "@/i18n";

export const Route = createFileRoute("/partners")({
  head: () =>
    pageHead({
      title: "OPSQAI Partners & Ambassadors — install, integrate, recommend",
      description: "Become an OPSQAI integration partner or ambassador: install self-hosted AI at your clients, maintain it locally, or recommend OPSQAI.",
      path: "/partners",
    }),
  component: PartnersPage,
});

const copy = {
  en: {
    eyebrow: "Partners & Ecosystem", h: "Grow with", s: "OPSQAI.",
    body: "OPSQAI runs on the customer's own server. That makes local IT partners essential — and we want to work with you.",
    cards: [
      { id: "integrator", t: "Integration partner", b: "IT companies and system integrators who install OPSQAI, connect it to existing infrastructure and provide local maintenance." },
      { id: "consultant", t: "Business consultant", b: "Consultants who map processes, SOPs and training — and turn them into OPSQAI knowledge and Academy courses." },
      { id: "ambassador", t: "Ambassador program", b: "Know a company that needs it? Introduce us. Terms are agreed individually and in writing — no automatic commissions." },
    ],
    cta: "Talk to us",
  },
  de: {
    eyebrow: "Partner & Ökosystem", h: "Wachsen Sie mit", s: "OPSQAI.",
    body: "OPSQAI läuft auf dem eigenen Server des Kunden. Lokale IT-Partner sind daher unverzichtbar — wir möchten mit Ihnen arbeiten.",
    cards: [
      { id: "integrator", t: "Integrationspartner", b: "IT-Firmen und Systemhäuser, die OPSQAI installieren, an bestehende Infrastruktur anbinden und vor Ort warten." },
      { id: "consultant", t: "Unternehmensberater", b: "Berater, die Prozesse, SOPs und Schulungen erfassen — und daraus OPSQAI-Wissen und Academy-Kurse machen." },
      { id: "ambassador", t: "Botschafter-Programm", b: "Sie kennen ein Unternehmen, das es braucht? Stellen Sie uns vor. Konditionen werden individuell und schriftlich vereinbart." },
    ],
    cta: "Sprechen Sie mit uns",
  },
  ro: {
    eyebrow: "Parteneri & Ecosistem", h: "Creșteți împreună cu", s: "OPSQAI.",
    body: "OPSQAI rulează pe serverul clientului. De aceea partenerii IT locali sunt esențiali — și vrem să lucrăm cu dumneavoastră.",
    cards: [
      { id: "integrator", t: "Partener de integrare", b: "Firme IT și integratori care instalează OPSQAI, îl conectează la infrastructura existentă și asigură mentenanța locală." },
      { id: "consultant", t: "Consultant de business", b: "Consultanți care cartografiază procese, SOP-uri și instruiri — și le transformă în cunoștințe OPSQAI și cursuri Academy." },
      { id: "ambassador", t: "Fii ambasador!", b: "Cunoașteți o firmă care are nevoie? Faceți-ne cunoștință. Condițiile se stabilesc individual, în scris — fără comisioane automate." },
    ],
    cta: "Vorbiți cu noi",
  },
};

function PartnersPage() {
  const { lang } = useT();
  const t = copy[lang === "de" ? "de" : lang === "ro" ? "ro" : "en"];
  return (
    <OixLayout>
      <section className="border-b border-[var(--oix-gold-line)]">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-32 md:pt-40">
          <EditorialHeadline as="h1" size="xl" eyebrow={t.eyebrow} serifAccent={t.s}>{t.h}</EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg text-[var(--oix-cream-dim)]">{t.body}</p>
        </div>
      </section>
      <SectionShell>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {t.cards.map((c) => (
            <div key={c.id} id={c.id} className="scroll-mt-28 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{c.t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-5xl">
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            {t.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
