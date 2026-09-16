// Investor page copy (EN/DE/RO).
//
// Rule: every figure on this page is a founder target or an indicative
// figure, never a promise or a measured result. Stage is stated honestly
// (functional, pre-pilot). No customer logos, no invented traction.
import { useT } from "@/i18n";

export const INVEST_EMAIL = "baristefan@opsqai.de";

const en = {
  meta: {
    title: "Invest in OPSQAI — Seed Round · Sovereign Operational AI",
    description:
      "OPSQAI is a Windows self-hosted operational AI platform for industrial, logistics and transport companies. Seed round of EUR 100,000. Founder targets, commercial model and how to reach us.",
  },
  hero: {
    eyebrow: "Investor brief · Seed round · 2026",
    h1a: "The operating system for",
    h1b: "operational knowledge.",
    intro:
      "Industrial companies will not put their operational knowledge into a public AI cloud. They need a platform they own, installed inside their own infrastructure. That is what we build — and we are raising EUR 100,000 to take it from functional to first paying customers.",
    primary: "Talk to the founder",
    secondary: "See how we work",
  },
  thesisTitle: "The thesis",
  thesis: [
    {
      title: "Knowledge does not leave the building",
      body: "Procedures, contracts, incidents and operational history are the most sensitive data a company has. Public AI tools are structurally the wrong answer for it.",
    },
    {
      title: "Self-hosted is the product, not a deployment option",
      body: "OPSQAI installs on a Windows server inside the customer's own network. Single tenant, offline capable, no data leaving their boundary.",
    },
    {
      title: "We sell a solved problem, not software",
      body: "Problem, diagnosis, solution design, workspace. Customers do not have to know what software they need — only what hurts.",
    },
    {
      title: "Grounded answers or none",
      body: "Every answer is built from the company's own documents with citations. When no source exists, the assistant refuses instead of inventing.",
    },
  ],
  stageTitle: "Where we are today",
  stage: [
    { label: "Product", value: "Functional", note: "Core platform, Transport and HR workspaces built and running." },
    { label: "Stage", value: "Pre-pilot", note: "No paying customers yet; commercial validation in progress." },
    { label: "Founder", value: "10 years", note: "Logistics and warehouse operations, SAP EWM and WMS environments." },
    { label: "First validation", value: "Students in Romania", note: "The application was used free of charge as early product validation." },
    { label: "Delivery", value: "Windows self-hosted", note: "PostgreSQL 16, role-based access, audit trail, offline capable." },
    { label: "First market", value: "Germany / DACH", note: "Logistics and transport as the sales wedge, product stays horizontal." },
  ],
  modelTitle: "Commercial model",
  modelNote: "Indicative figures. Final scope and price are defined per customer in Discovery.",
  model: [
    { title: "Implementation", value: "EUR 12,000", body: "One-time, per company: install, configuration, knowledge onboarding." },
    { title: "Modules", value: "EUR 2,000 – 6,000", body: "Per module, depending on scope — Transport, HR and further workspaces." },
    { title: "Maintenance", value: "from EUR 500 / month", body: "Updates, support and operational maintenance subscription." },
  ],
  planTitle: "Founder revenue plan",
  planNote: "Targets supplied by the founder, not measured results. Gross margin, sales cycle and retention are not yet validated on paying customers.",
  planHead: { year: "Year", customers: "Target customers", revenue: "Target revenue", per: "Revenue / customer" },
  plan: [
    { year: "2027", customers: "10", revenue: "EUR 260,000", per: "EUR 26,000" },
    { year: "2028", customers: "20", revenue: "EUR 580,000", per: "EUR 29,000" },
    { year: "2029", customers: "30", revenue: "EUR 960,000", per: "EUR 32,000" },
  ],
  roundTitle: "The round",
  roundAmount: "EUR 100,000",
  roundBody:
    "We are raising EUR 100,000 to convert a finished product into first paying customers: sales and go-to-market in Germany, delivery capacity for the first installations, legal and compliance work for enterprise procurement, and the infrastructure around licensing and updates.",
  roundUse: [
    "Go-to-market and sales in Germany / DACH",
    "Delivery and implementation capacity for the first customers",
    "Legal, IP and enterprise procurement readiness",
    "Product hardening, packaging and update infrastructure",
  ],
  riskTitle: "What is not proven yet",
  risks: [
    "No paying customers to date — pricing and sales cycle are unvalidated.",
    "Self-hosted delivery has a higher friction than SaaS; each install is a project.",
    "Country-specific HR and legal document templates require review by counsel before release.",
    "External services (routing, weather, messaging) are optional and dependent on third parties.",
  ],
  ctaTitle: "Interested? Write directly to the founder.",
  ctaBody:
    "Business plan, financial model, technology pack, security and GDPR pack and the legal/IP overview are available on request. One email is enough.",
  ctaButton: "Email the founder",
  ctaNote: "All figures on this page are founder targets or indicative. Nothing here is an offer of securities.",
  navLabel: "Invest",
};

type InvestCopy = typeof en;

const de: InvestCopy = {
  meta: {
    title: "In OPSQAI investieren — Seed-Runde · Souveräne operative KI",
    description:
      "OPSQAI ist eine Windows-self-hosted KI-Plattform für Industrie, Logistik und Transport. Seed-Runde von 100.000 EUR. Ziele des Gründers, Geschäftsmodell und Kontakt.",
  },
  hero: {
    eyebrow: "Investoren-Brief · Seed-Runde · 2026",
    h1a: "Das Betriebssystem für",
    h1b: "operatives Wissen.",
    intro:
      "Industrieunternehmen geben ihr operatives Wissen nicht in eine öffentliche KI-Cloud. Sie brauchen eine Plattform, die sie besitzen und in ihrer eigenen Infrastruktur betreiben. Genau das bauen wir — und wir nehmen 100.000 EUR auf, um vom fertigen Produkt zu den ersten zahlenden Kunden zu kommen.",
    primary: "Mit dem Gründer sprechen",
    secondary: "So arbeiten wir",
  },
  thesisTitle: "Die These",
  thesis: [
    {
      title: "Wissen verlässt das Haus nicht",
      body: "Verfahren, Verträge, Vorfälle und operative Historie sind die sensibelsten Daten eines Unternehmens. Öffentliche KI-Tools sind dafür strukturell die falsche Antwort.",
    },
    {
      title: "Self-hosted ist das Produkt, keine Option",
      body: "OPSQAI wird auf einem Windows-Server im eigenen Netz installiert. Single-Tenant, offline-fähig, keine Daten verlassen die Unternehmensgrenze.",
    },
    {
      title: "Wir verkaufen eine gelöste Aufgabe, keine Software",
      body: "Problem, Diagnose, Lösungsdesign, Workspace. Kunden müssen nicht wissen, welche Software sie brauchen — nur, was weh tut.",
    },
    {
      title: "Belegte Antworten oder keine",
      body: "Jede Antwort entsteht aus den eigenen Dokumenten, mit Quellenangabe. Fehlt die Quelle, verweigert der Assistent die Antwort statt zu erfinden.",
    },
  ],
  stageTitle: "Wo wir heute stehen",
  stage: [
    { label: "Produkt", value: "Funktionsfähig", note: "Core-Plattform, Transport- und HR-Workspaces gebaut und im Betrieb." },
    { label: "Phase", value: "Vor-Pilot", note: "Noch keine zahlenden Kunden; kommerzielle Validierung läuft." },
    { label: "Gründer", value: "10 Jahre", note: "Logistik- und Lageroperationen, SAP EWM und WMS-Umgebungen." },
    { label: "Erste Validierung", value: "Studierende in Rumänien", note: "Die Anwendung wurde kostenfrei als frühe Produktvalidierung genutzt." },
    { label: "Auslieferung", value: "Windows self-hosted", note: "PostgreSQL 16, Rollenrechte, Audit-Trail, offline-fähig." },
    { label: "Erster Markt", value: "Deutschland / DACH", note: "Logistik und Transport als Einstieg, Produkt bleibt horizontal." },
  ],
  modelTitle: "Geschäftsmodell",
  modelNote: "Indikative Zahlen. Umfang und Preis werden pro Kunde im Discovery festgelegt.",
  model: [
    { title: "Implementierung", value: "12.000 EUR", body: "Einmalig pro Unternehmen: Installation, Konfiguration, Wissens-Onboarding." },
    { title: "Module", value: "2.000 – 6.000 EUR", body: "Pro Modul, je nach Umfang — Transport, HR und weitere Workspaces." },
    { title: "Wartung", value: "ab 500 EUR / Monat", body: "Updates, Support und operatives Wartungsabonnement." },
  ],
  planTitle: "Umsatzplan des Gründers",
  planNote: "Ziele des Gründers, keine gemessenen Ergebnisse. Bruttomarge, Verkaufszyklus und Retention sind noch nicht an zahlenden Kunden validiert.",
  planHead: { year: "Jahr", customers: "Zielkunden", revenue: "Zielumsatz", per: "Umsatz / Kunde" },
  plan: [
    { year: "2027", customers: "10", revenue: "260.000 EUR", per: "26.000 EUR" },
    { year: "2028", customers: "20", revenue: "580.000 EUR", per: "29.000 EUR" },
    { year: "2029", customers: "30", revenue: "960.000 EUR", per: "32.000 EUR" },
  ],
  roundTitle: "Die Runde",
  roundAmount: "100.000 EUR",
  roundBody:
    "Wir nehmen 100.000 EUR auf, um aus einem fertigen Produkt erste zahlende Kunden zu machen: Vertrieb und Go-to-Market in Deutschland, Kapazität für die ersten Installationen, Recht und Compliance für Enterprise-Einkauf sowie die Infrastruktur für Lizenzen und Updates.",
  roundUse: [
    "Go-to-Market und Vertrieb in Deutschland / DACH",
    "Kapazität für Implementierung der ersten Kunden",
    "Recht, IP und Enterprise-Beschaffungsreife",
    "Produkthärtung, Paketierung und Update-Infrastruktur",
  ],
  riskTitle: "Was noch nicht bewiesen ist",
  risks: [
    "Bisher keine zahlenden Kunden — Preis und Verkaufszyklus sind unvalidiert.",
    "Self-hosted hat mehr Reibung als SaaS; jede Installation ist ein Projekt.",
    "Länderspezifische HR- und Rechtsdokumente brauchen anwaltliche Prüfung vor Freigabe.",
    "Externe Dienste (Routing, Wetter, Messaging) sind optional und von Dritten abhängig.",
  ],
  ctaTitle: "Interessiert? Schreiben Sie direkt an den Gründer.",
  ctaBody:
    "Business Plan, Finanzmodell, Technologie-Pack, Security- und DSGVO-Pack sowie die Legal/IP-Übersicht sind auf Anfrage verfügbar. Eine E-Mail genügt.",
  ctaButton: "E-Mail an den Gründer",
  ctaNote: "Alle Zahlen auf dieser Seite sind Ziele oder indikativ. Dies ist kein Wertpapierangebot.",
  navLabel: "Investieren",
};

const ro: InvestCopy = {
  meta: {
    title: "Investește în OPSQAI — Rundă seed · AI operațional suveran",
    description:
      "OPSQAI este o platformă AI operațională self-hosted pe Windows pentru industrie, logistică și transport. Rundă seed de 100.000 EUR. Ținte, model comercial și contact.",
  },
  hero: {
    eyebrow: "Brief pentru investitori · Rundă seed · 2026",
    h1a: "Sistemul de operare pentru",
    h1b: "cunoașterea operațională.",
    intro:
      "Companiile industriale nu își pun cunoașterea operațională într-un cloud AI public. Au nevoie de o platformă pe care o dețin, instalată în propria infrastructură. Exact asta construim — și atragem 100.000 EUR ca să trecem de la produs funcțional la primii clienți plătitori.",
    primary: "Vorbește cu fondatorul",
    secondary: "Cum lucrăm",
  },
  thesisTitle: "Teza",
  thesis: [
    {
      title: "Cunoașterea nu iese din companie",
      body: "Procedurile, contractele, incidentele și istoricul operațional sunt cele mai sensibile date ale unei companii. Instrumentele AI publice sunt structural răspunsul greșit pentru ele.",
    },
    {
      title: "Self-hosted este produsul, nu o opțiune",
      body: "OPSQAI se instalează pe un server Windows în rețeaua clientului. Single-tenant, funcționează offline, datele nu ies din perimetru.",
    },
    {
      title: "Vindem o problemă rezolvată, nu software",
      body: "Problemă, diagnostic, design de soluție, workspace. Clientul nu trebuie să știe ce software îi trebuie — doar ce îl doare.",
    },
    {
      title: "Răspunsuri cu sursă sau niciunul",
      body: "Fiecare răspuns este construit din documentele companiei, cu citări. Când nu există sursă, asistentul refuză în loc să inventeze.",
    },
  ],
  stageTitle: "Unde suntem astăzi",
  stage: [
    { label: "Produs", value: "Funcțional", note: "Platforma Core, workspace-urile Transport și HR construite și în funcțiune." },
    { label: "Etapă", value: "Pre-pilot", note: "Încă fără clienți plătitori; validarea comercială este în curs." },
    { label: "Fondator", value: "10 ani", note: "Operațiuni de logistică și depozit, medii SAP EWM și WMS." },
    { label: "Primă validare", value: "Studenți în România", note: "Aplicația a fost folosită gratuit ca validare inițială de produs." },
    { label: "Livrare", value: "Windows self-hosted", note: "PostgreSQL 16, drepturi pe roluri, jurnal de audit, offline." },
    { label: "Prima piață", value: "Germania / DACH", note: "Logistica și transportul ca punct de intrare, produsul rămâne orizontal." },
  ],
  modelTitle: "Model comercial",
  modelNote: "Cifre indicative. Scopul final și prețul se definesc per client în Discovery.",
  model: [
    { title: "Implementare", value: "12.000 EUR", body: "O singură dată, per companie: instalare, configurare, onboarding de cunoaștere." },
    { title: "Module", value: "2.000 – 6.000 EUR", body: "Per modul, în funcție de scop — Transport, HR și alte workspace-uri." },
    { title: "Mentenanță", value: "de la 500 EUR / lună", body: "Actualizări, suport și abonament de mentenanță operațională." },
  ],
  planTitle: "Planul de venituri al fondatorului",
  planNote: "Ținte ale fondatorului, nu rezultate măsurate. Marja, ciclul de vânzare și retenția nu sunt încă validate pe clienți plătitori.",
  planHead: { year: "An", customers: "Clienți țintă", revenue: "Venit țintă", per: "Venit / client" },
  plan: [
    { year: "2027", customers: "10", revenue: "260.000 EUR", per: "26.000 EUR" },
    { year: "2028", customers: "20", revenue: "580.000 EUR", per: "29.000 EUR" },
    { year: "2029", customers: "30", revenue: "960.000 EUR", per: "32.000 EUR" },
  ],
  roundTitle: "Runda",
  roundAmount: "100.000 EUR",
  roundBody:
    "Atragem 100.000 EUR pentru a transforma un produs finalizat în primii clienți plătitori: vânzări și go-to-market în Germania, capacitate de livrare pentru primele instalări, partea juridică și de conformitate pentru achiziții enterprise și infrastructura de licențiere și actualizări.",
  roundUse: [
    "Go-to-market și vânzări în Germania / DACH",
    "Capacitate de implementare pentru primii clienți",
    "Juridic, IP și pregătire pentru achiziții enterprise",
    "Consolidarea produsului, împachetare și infrastructura de update",
  ],
  riskTitle: "Ce nu este încă dovedit",
  risks: [
    "Fără clienți plătitori până acum — prețul și ciclul de vânzare nu sunt validate.",
    "Livrarea self-hosted are mai multă fricțiune decât SaaS; fiecare instalare e un proiect.",
    "Documentele HR și juridice pe țară necesită revizuire de avocat înainte de publicare.",
    "Serviciile externe (rutare, vreme, mesagerie) sunt opționale și depind de terți.",
  ],
  ctaTitle: "Te interesează? Scrie direct fondatorului.",
  ctaBody:
    "Planul de afaceri, modelul financiar, pachetul tehnologic, pachetul de securitate/GDPR și privirea de ansamblu juridic/IP sunt disponibile la cerere. Un e-mail e de ajuns.",
  ctaButton: "Trimite e-mail fondatorului",
  ctaNote: "Toate cifrele din pagină sunt ținte sau indicative. Aceasta nu este o ofertă de valori mobiliare.",
  navLabel: "Investește",
};

export const investCopyEn = en;

export function useInvestCopy(): InvestCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}

export function useInvestNavLabel(): string {
  return useInvestCopy().navLabel;
}
