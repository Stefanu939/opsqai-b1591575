import { useT } from "@/i18n";

type Copy = {
  eyebrow: string;
  title: string;
  serif: string;
  intro: string;
  name: string;
  role: string;
  bio: string;
};

const en: Copy = {
  eyebrow: "The founder behind OPSQAI",
  title: "Built by an operator,",
  serif: "not by a lab.",
  intro:
    "OPSQAI was founded by Bari Ștefan, drawing on direct experience inside logistics and industrial operations — where a missing procedure costs a shift, not a sprint. That experience is why the product is sovereign, governed and self-hosted by default.",
  name: "Bari Ștefan",
  role: "Founder · Platform & Architecture",
  bio: "Owns the sovereign architecture: the Windows self-hosted platform, licensing, local embeddings and the security boundary that keeps customer knowledge inside the customer.",
};

const de: Copy = {
  eyebrow: "Der Gründer hinter OPSQAI",
  title: "Von einem Praktiker gebaut,",
  serif: "nicht im Labor.",
  intro:
    "OPSQAI wurde von Bari Ștefan gegründet, auf Grundlage direkter Erfahrung in Logistik und Industrie — dort kostet eine fehlende Anweisung eine Schicht, keinen Sprint. Genau deshalb ist das Produkt souverän, governance-fähig und standardmäßig self-hosted.",
  name: "Bari Ștefan",
  role: "Gründer · Plattform & Architektur",
  bio: "Verantwortet die souveräne Architektur: die Windows-Self-Hosted-Plattform, Lizenzierung, lokale Embeddings und die Sicherheitsgrenze, die Kundenwissen beim Kunden hält.",
};

const ro: Copy = {
  eyebrow: "Fondatorul OPSQAI",
  title: "Construit de un practician,",
  serif: "nu într-un laborator.",
  intro:
    "OPSQAI a fost fondat de Bari Ștefan, pe baza experienței directe în logistică și operațiuni industriale — acolo unde o procedură lipsă costă o tură, nu un sprint. De aceea, produsul este suveran, guvernat și self-hosted în mod implicit.",
  name: "Bari Ștefan",
  role: "Fondator · Platformă & Arhitectură",
  bio: "Răspunde de arhitectura suverană: platforma Windows self-hosted, licențierea, modelele locale de reprezentare a datelor și granița de securitate care păstrează cunoștințele clientului în infrastructura proprie.",
};

export function Founders() {
  const { lang } = useT();
  const copy = lang === "de" ? de : lang === "ro" ? ro : en;

  return (
    <section className="relative overflow-hidden border-y border-[var(--oix-gold-line)] bg-[var(--oix-surface-2)] py-24 sm:py-32" aria-labelledby="founders-title">
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="oix-eyebrow">
          {copy.eyebrow}
        </p>
        <h2
          id="founders-title"
          className="oix-display mt-4 max-w-3xl text-4xl leading-[1] sm:text-6xl"
        >
          {copy.title}{" "}
          <span className="italic text-[var(--oix-gold)]">{copy.serif}</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--oix-cream-dim)]">
          {copy.intro}
        </p>

        <div className="mt-16 border-t border-[var(--oix-gold-line)] pt-10 sm:mt-20 sm:grid sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-16 sm:pt-14">
          <div>
            <h3 className="oix-display text-4xl leading-none sm:text-6xl">
              {copy.name}
            </h3>
            <p className="mt-4 text-xs font-semibold uppercase text-[var(--oix-gold)]">
              {copy.role}
            </p>
          </div>
          <blockquote className="relative mt-10 border-l-2 border-[var(--oix-gold)] pl-6 sm:mt-8 sm:translate-y-10 sm:pl-8">
            <p className="oix-display text-xl italic leading-relaxed text-[var(--oix-cream)] sm:text-2xl">
              {copy.bio}
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
