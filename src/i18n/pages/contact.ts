import { useT } from "@/i18n";
import type { ContactSubject } from "@/lib/email/routing";

const en = {
  heroEyebrow: "Contact · Routed to the right team",
  heroSerifAccent: "operations.",
  heroHeadline: "Let's talk",
  heroBody:
    "Pick the topic that best fits — your message routes straight to the right team, and you'll get a confirmation by email.",
  subjectOptions: {
    general: "General question",
    demo: "Book a demo",
    sales: "Sales inquiry",
    pricing: "Pricing request",
    support: "Technical support",
    bug: "Bug report",
    security: "Security report",
    privacy: "Privacy / GDPR",
    partnership: "Business partnership",
    other: "Other",
  } satisfies Record<ContactSubject, string>,
  successTitle: "Thanks — we received your request.",
  successBody: "We've emailed a confirmation. Reference",
  successFooter: "Our team typically responds within 1 business day (CET).",
  sendAnother: "Send another message",
  subjectLabel: "What can we help with?",
  nameLabel: "Name",
  emailLabel: "Work email",
  companyLabel: "Company",
  phoneLabel: "Phone (optional)",
  countryLabel: "Country",
  messageLabel: "Message",
  honeypotLabel: "Website",
  sending: "Sending…",
  sendMessage: "Send message",
  consentPrefix: "By submitting you agree to our",
  privacyNotice: "privacy notice",
  channelLabels: {
    general: "General",
    support: "Support",
    security: "Security",
    privacy: "Privacy & GDPR",
  },
  errorGeneric: "We couldn't send your message. Please try again.",
  successToast: "Message sent — check your inbox for the confirmation.",
  errorNetwork: "Network error. Please try again.",
};

type Copy = typeof en;

const de: Copy = {
  heroEyebrow: "Kontakt · Direkt an das richtige Team",
  heroSerifAccent: "über Ihren Betrieb.",
  heroHeadline: "Sprechen wir",

  heroBody:
    "Wählen Sie das passende Thema — Ihre Nachricht wird direkt an das zuständige Team weitergeleitet, und Sie erhalten eine Bestätigung per E-Mail.",
  subjectOptions: {
    general: "Allgemeine Frage",
    demo: "Demo vereinbaren",
    sales: "Vertriebsanfrage",
    pricing: "Preisanfrage",
    support: "Technischer Support",
    bug: "Fehlerbericht",
    security: "Sicherheitsmeldung",
    privacy: "Datenschutz / DSGVO",
    partnership: "Geschäftspartnerschaft",
    other: "Sonstiges",
  },
  successTitle: "Vielen Dank — wir haben Ihre Anfrage erhalten.",
  successBody: "Wir haben Ihnen eine Bestätigung per E-Mail gesendet. Referenz",
  successFooter: "Unser Team antwortet in der Regel innerhalb eines Werktags (MEZ).",
  sendAnother: "Weitere Nachricht senden",
  subjectLabel: "Wobei können wir helfen?",
  nameLabel: "Name",
  emailLabel: "Geschäftliche E-Mail",
  companyLabel: "Unternehmen",
  phoneLabel: "Telefon (optional)",
  countryLabel: "Land",
  messageLabel: "Nachricht",
  honeypotLabel: "Website",
  sending: "Wird gesendet…",
  sendMessage: "Nachricht senden",
  consentPrefix: "Mit dem Absenden stimmen Sie unserem",
  privacyNotice: "Datenschutzhinweis",
  channelLabels: {
    general: "Allgemein",
    support: "Support",
    security: "Sicherheit",
    privacy: "Datenschutz & DSGVO",
  },
  errorGeneric: "Ihre Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
  successToast: "Nachricht gesendet — prüfen Sie Ihr Postfach für die Bestätigung.",
  errorNetwork: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
};

export function useContactCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : en;
}
