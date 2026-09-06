// Copy for the public pilot program page.
import { useT } from "@/i18n";

export const pilotCopyEn = {
  meta: {
    title: "Pilot Program — OPSQAI · 30 Days Free Windows Self-Hosted Trial",
    description:
      "Try OPSQAI free for 30 days on your own Windows Server. No cloud lock-in, no data leaving your boundary. For logistics, HR, finance and transport operations in Romania and DACH.",
  },
  hero: {
    eyebrow: "Pilot Program",
    serifAccent: "on your server.",
    headline: "Run OPSQAI free for 30 days —",
    body:
      "Install the Windows Self-Hosted platform in your environment, ingest your SOPs and let your team ask operational questions with grounded, source-cited answers. No credit card. No data leaves your boundary.",
  },
  terms: {
    eyebrow: "What is included",
    title: "A real production install, not a sandbox.",
    items: [
      { title: "30 days", body: "Full access to the Core platform on your own Windows Server." },
      { title: "Up to 10 users", body: "Invite the team members who actually operate the process." },
      { title: "Your AI provider", body: "Use OpenAI, Azure OpenAI, Ollama, OpenRouter or any compatible endpoint." },
      { title: "Support at setup", body: "We help with install, license activation and first SOP ingestion." },
      { title: "One condition", body: "At the end of the pilot you share a short written testimonial or case-study interview." },
    ],
  },
  form: {
    title: "Apply for the pilot",
    nameLabel: "Name",
    emailLabel: "Work email",
    companyLabel: "Company",
    countryLabel: "Country",
    verticalLabel: "Primary use case",
    verticalOptions: {
      logistics: "Logistics / Warehousing / Transport",
      hr: "HR / Training / Onboarding",
      finance: "Finance / Administration",
      operations: "Operations / Quality / Compliance",
      other: "Other",
    },
    messageLabel: "What would you like to pilot first?",
    submit: "Apply for pilot",
    sending: "Sending…",
    successTitle: "Application received",
    successBody: "Reference",
    successFooter: "We usually reply within 1 business day to schedule the install call.",
    sendAnother: "Send another application",
    consentPrefix: "By applying you agree to our",
    privacyNotice: "privacy notice",
    errorGeneric: "We couldn't send your application. Please try again.",
    errorNetwork: "Network error. Please try again.",
  },
};

type PilotCopy = typeof pilotCopyEn;

const de: PilotCopy = {
  meta: {
    title: "Pilotprogramm — OPSQAI · 30 Tage kostenlose Windows-Self-Hosted-Testphase",
    description:
      "Testen Sie OPSQAI 30 Tage kostenlos auf Ihrem eigenen Windows Server. Kein Cloud-Lock-in, keine Daten verlassen Ihre Grenzen. Für Logistik, HR, Finanzen und Transport in Deutschland und Rumänien.",
  },
  hero: {
    eyebrow: "Pilotprogramm",
    serifAccent: "auf Ihrem Server.",
    headline: "OPSQAI 30 Tage kostenlos nutzen —",
    body:
      "Installieren Sie die Windows-Self-Hosted-Plattform in Ihrer Umgebung, importieren Sie Ihre SOPs und lassen Sie Ihr Team operative Fragen mit belegten, quellengestützten Antworten stellen. Keine Kreditkarte. Keine Daten verlassen Ihre Grenzen.",
  },
  terms: {
    eyebrow: "Was enthalten ist",
    title: "Eine echte Produktionsinstallation, keine Sandbox.",
    items: [
      { title: "30 Tage", body: "Voller Zugriff auf die Core-Plattform auf Ihrem eigenen Windows Server." },
      { title: "Bis zu 10 Nutzer", body: "Laden Sie die Teammitglieder ein, die den Prozess tatsächlich betreiben." },
      { title: "Ihr KI-Anbieter", body: "Nutzen Sie OpenAI, Azure OpenAI, Ollama, OpenRouter oder einen kompatiblen Endpunkt." },
      { title: "Setup-Support", body: "Wir helfen bei Installation, Lizenzaktivierung und erster SOP-Import." },
      { title: "Eine Bedingung", body: "Am Ende des Pilots teilen Sie ein kurzes schriftliches Testimonial oder ein Case-Study-Interview." },
    ],
  },
  form: {
    title: "Für den Pilot bewerben",
    nameLabel: "Name",
    emailLabel: "Geschäftliche E-Mail",
    companyLabel: "Unternehmen",
    countryLabel: "Land",
    verticalLabel: "Hauptanwendungsfall",
    verticalOptions: {
      logistics: "Logistik / Lager / Transport",
      hr: "HR / Schulung / Onboarding",
      finance: "Finanzen / Verwaltung",
      operations: "Operations / Qualität / Compliance",
      other: "Sonstiges",
    },
    messageLabel: "Was möchten Sie zuerst pilotieren?",
    submit: "Für Pilot bewerben",
    sending: "Wird gesendet…",
    successTitle: "Bewerbung erhalten",
    successBody: "Referenz",
    successFooter: "Wir antworten in der Regel innerhalb eines Werktags, um den Installationstermin zu vereinbaren.",
    sendAnother: "Weitere Bewerbung senden",
    consentPrefix: "Mit der Bewerbung stimmen Sie unserem",
    privacyNotice: "Datenschutzhinweis",
    errorGeneric: "Wir konnten Ihre Bewerbung nicht senden. Bitte versuchen Sie es erneut.",
    errorNetwork: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
  },
};

const ro: PilotCopy = {
  meta: {
    title: "Program Pilot — OPSQAI · 30 de zile gratuite Windows Self-Hosted",
    description:
      "Încearcă OPSQAI gratuit timp de 30 de zile pe propriul tău Windows Server. Fără lock-in în cloud, fără date care părăsesc granița companiei. Pentru logistică, HR, finanțe și transport în România și DACH.",
  },
  hero: {
    eyebrow: "Program Pilot",
    serifAccent: "pe serverul tău.",
    headline: "Rulează OPSQAI gratuit 30 de zile —",
    body:
      "Instalează platforma Windows Self-Hosted în mediul tău, încarcă SOP-urile și lasă echipa să pună întrebări operaționale cu răspunsuri fundamentate și cu citare sursă. Fără card de credit. Datele nu părăsesc granița ta.",
  },
  terms: {
    eyebrow: "Ce include",
    title: "O instalare de producție reală, nu un sandbox.",
    items: [
      { title: "30 de zile", body: "Acces complet la platforma Core pe propriul tău Windows Server." },
      { title: "Până la 10 utilizatori", body: "Invită membrii echipei care operează efectiv procesul." },
      { title: "Furnizorul tău de AI", body: "Folosește OpenAI, Azure OpenAI, Ollama, OpenRouter sau orice endpoint compatibil." },
      { title: "Suport la instalare", body: "Te ajutăm cu instalarea, activarea licenței și prima încărcare de SOP-uri." },
      { title: "O singură condiție", body: "La finalul pilotului ne oferi un scurt testimonial scris sau un interviu de studiu de caz." },
    ],
  },
  form: {
    title: "Aplică pentru pilot",
    nameLabel: "Nume",
    emailLabel: "E-mail de serviciu",
    companyLabel: "Companie",
    countryLabel: "Țară",
    verticalLabel: "Caz principal de utilizare",
    verticalOptions: {
      logistics: "Logistică / Depozitare / Transport",
      hr: "HR / Training / Onboarding",
      finance: "Finanțe / Administrare",
      operations: "Operațiuni / Calitate / Conformitate",
      other: "Altceva",
    },
    messageLabel: "Ce ai vrea să pilotezi mai întâi?",
    submit: "Aplică pentru pilot",
    sending: "Se trimite…",
    successTitle: "Aplicație primită",
    successBody: "Referință",
    successFooter: "De obicei răspundem în cel mult o zi lucrătoare pentru a programa apelul de instalare.",
    sendAnother: "Trimite o altă aplicație",
    consentPrefix: "Prin aplicare ești de acord cu",
    privacyNotice: "politica de confidențialitate",
    errorGeneric: "Nu am putut trimite aplicația. Te rugăm să încerci din nou.",
    errorNetwork: "Eroare de rețea. Te rugăm să încerci din nou.",
  },
};

export function usePilotCopy(): PilotCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : pilotCopyEn;
}
