import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Support",
    headline: "Real engineers. Real answers.",
    body: "OPSQAI support is handled by the team that ships the product. Customers file requests from inside the Customer Portal and receive responses under the SLA below.",
    ctaPrimary: "Open Customer Portal",
    ctaSecondary: "Contact sales",
  },
  cards: {
    tickets: {
      title: "Tickets in the Portal",
      body: "Every customer contact can open, follow, and reply to conversations from",
      bodyEnd: ". Full history is retained.",
    },
    targets: {
      title: "Response targets by priority",
      body: "Priorities are set on the ticket. Critical incidents are picked up during business hours in Central European Time.",
    },
    docs: {
      title: "Documentation first",
      body: "Most operational questions are answered in the administrator guide and the technical handbook.",
      link: "Browse docs →",
    },
  },
  tiers: [
    { label: "Critical", target: "1 business hour", body: "Install is down, license activation blocked, security incident." },
    { label: "High", target: "1 business day", body: "Feature broken for most users, module activation issue, upgrade failure." },
    { label: "Normal", target: "3 business days", body: "How-to questions, configuration guidance, non-blocking bugs." },
  ],
  slaSection: {
    headline: "Response targets",
    footnote: "Targets apply to customers on an active Annual Maintenance contract. Exact SLA terms are in each customer agreement.",
  },
  notCustomer: {
    headline: "Not a customer yet?",
    body: "Reach out and we'll route your question to the right person.",
    cta: "Contact OPSQAI",
  },
};

type Copy = typeof en;

const de: Copy = {
  hero: {
    eyebrow: "Support",
    headline: "Echte Ingenieure. Echte Antworten.",
    body: "Der OPSQAI-Support wird von dem Team betreut, das das Produkt entwickelt. Kunden stellen Anfragen über das Kundenportal und erhalten Antworten gemäß der unten stehenden SLA.",
    ctaPrimary: "Kundenportal öffnen",
    ctaSecondary: "Vertrieb kontaktieren",
  },
  cards: {
    tickets: {
      title: "Tickets im Portal",
      body: "Jeder Kundenkontakt kann Konversationen öffnen, verfolgen und beantworten über",
      bodyEnd: ". Der vollständige Verlauf bleibt erhalten.",
    },
    targets: {
      title: "Reaktionsziele nach Priorität",
      body: "Prioritäten werden im Ticket festgelegt. Kritische Vorfälle werden während der Geschäftszeiten in Mitteleuropäischer Zeit bearbeitet.",
    },
    docs: {
      title: "Erst die Dokumentation",
      body: "Die meisten betrieblichen Fragen werden im Administratorhandbuch und im technischen Handbuch beantwortet.",
      link: "Dokumentation ansehen →",
    },
  },
  tiers: [
    { label: "Kritisch", target: "1 Geschäftsstunde", body: "Installation ist ausgefallen, Lizenzaktivierung blockiert, Sicherheitsvorfall." },
    { label: "Hoch", target: "1 Geschäftstag", body: "Funktion für die meisten Benutzer defekt, Problem bei der Modulaktivierung, fehlgeschlagenes Upgrade." },
    { label: "Normal", target: "3 Geschäftstage", body: "Fragen zur Bedienung, Konfigurationshilfe, nicht blockierende Fehler." },
  ],
  slaSection: {
    headline: "Reaktionsziele",
    footnote: "Die Ziele gelten für Kunden mit einem aktiven Jahreswartungsvertrag. Die genauen SLA-Bedingungen sind in jedem Kundenvertrag festgelegt.",
  },
  notCustomer: {
    headline: "Noch kein Kunde?",
    body: "Melden Sie sich, und wir leiten Ihre Anfrage an die richtige Person weiter.",
    cta: "OPSQAI kontaktieren",
  },
};

export function useSupportCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : en;
}
