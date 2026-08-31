import adela from "@/assets/founder-adela.png.asset.json";
import stefan from "@/assets/founder-stefan.png.asset.json";
import { useT } from "@/i18n";
import { LineArt } from "@/components/visual/line-art";
import { Starfield } from "@/components/visual/starfield";
import { AmbientGlow } from "@/components/visual/ambient-glow";

type Copy = {
  eyebrow: string;
  title: string;
  serif: string;
  intro: string;
  people: { name: string; role: string; bio: string }[];
};

const en: Copy = {
  eyebrow: "The people behind OPSQAI",
  title: "Built by operators,",
  serif: "not by a lab.",
  intro:
    "OPSQAI was founded by two people who spent their working lives inside logistics and industrial operations — where a missing procedure costs a shift, not a sprint. That experience is why the product is sovereign, governed and self-hosted by default.",
  people: [
    {
      name: "Adela Bari",
      role: "Co-Founder · Operations & Product",
      bio: "Shapes how OPSQAI behaves in real operations: knowledge lifecycle, training, compliance and the day-to-day discipline that keeps procedures trustworthy.",
    },
    {
      name: "Bari Ștefan",
      role: "Co-Founder · Platform & Architecture",
      bio: "Owns the sovereign architecture: the Windows self-hosted platform, licensing, local embeddings and the security boundary that keeps customer knowledge inside the customer.",
    },
  ],
};

const de: Copy = {
  eyebrow: "Die Menschen hinter OPSQAI",
  title: "Von Praktikern gebaut,",
  serif: "nicht im Labor.",
  intro:
    "OPSQAI wurde von zwei Menschen gegründet, die ihr Arbeitsleben in Logistik und Industrie verbracht haben — dort kostet eine fehlende Anweisung eine Schicht, keinen Sprint. Genau deshalb ist das Produkt souverän, governance-fähig und standardmäßig self-hosted.",
  people: [
    {
      name: "Adela Bari",
      role: "Co-Founderin · Betrieb & Produkt",
      bio: "Prägt, wie sich OPSQAI im echten Betrieb verhält: Wissenslebenszyklus, Schulung, Compliance und die tägliche Disziplin, die Verfahren verlässlich hält.",
    },
    {
      name: "Bari Ștefan",
      role: "Co-Founder · Plattform & Architektur",
      bio: "Verantwortet die souveräne Architektur: die Windows-Self-Hosted-Plattform, Lizenzierung, lokale Embeddings und die Sicherheitsgrenze, die Kundenwissen beim Kunden hält.",
    },
  ],
};

const ro: Copy = {
  eyebrow: "Oamenii din spatele OPSQAI",
  title: "Construit de operatori,",
  serif: "nu într-un laborator.",
  intro:
    "OPSQAI a fost fondat de doi oameni care și-au petrecut viața profesională în logistică și operațiuni industriale — acolo unde o procedură lipsă costă o tură, nu un sprint. De aceea produsul este suveran, guvernat și self-hosted implicit.",
  people: [
    {
      name: "Adela Bari",
      role: "Co-fondatoare · Operațiuni & Produs",
      bio: "Definește felul în care OPSQAI se comportă în operațiuni reale: ciclul de viață al cunoștințelor, instruirea, conformitatea și disciplina zilnică ce menține procedurile de încredere.",
    },
    {
      name: "Bari Ștefan",
      role: "Co-fondator · Platformă & Arhitectură",
      bio: "Răspunde de arhitectura suverană: platforma Windows self-hosted, licențierea, embeddings-urile locale și granița de securitate care ține cunoștințele clientului la client.",
    },
  ],
};

const PHOTOS = [adela.url, stefan.url];

export function Founders() {
  const { lang } = useT();
  const copy = lang === "de" ? de : lang === "ro" ? ro : en;

  return (
    <section className="relative overflow-hidden py-24 sm:py-32" aria-labelledby="founders-title">
      <AmbientGlow tone="violet" intensity={0.7} />
      <Starfield count={22} opacity={0.5} />
      <LineArt variant="fan" opacity={0.18} className="top-auto h-1/2" />

      <div className="relative mx-auto max-w-6xl px-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          {copy.eyebrow}
        </p>
        <h2
          id="founders-title"
          className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-3xl leading-[1.1] tracking-tight sm:text-5xl"
        >
          {copy.title}{" "}
          <span className="text-primary">{copy.serif}</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {copy.intro}
        </p>

        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {copy.people.map((p, i) => (
            <figure
              key={p.name}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] motion-reduce:transform-none"
            >
              <div className="relative aspect-4/5 overflow-hidden">
                <img
                  src={PHOTOS[i]}
                  alt={`${p.name} — ${p.role}, OPSQAI`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transform-none"
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-card via-card/60 to-transparent"
                />
              </div>
              <figcaption className="relative -mt-16 p-7">
                <h3 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
                  {p.name}
                </h3>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-primary">{p.role}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
