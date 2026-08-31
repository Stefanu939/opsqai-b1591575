// Public "Platform" page copy. Mirrors the canonical product architecture:
// Core Platform (always included) · OPSQAI Products (per domain) · Optional
// add-ons. No marketplace, no "Basic vs Premium", no prices.
import { useT } from "@/i18n";

const en = {
  heroEyebrow: "The OPSQAI platform",
  heroSerifAccent: "Products adapt to your domain.",
  heroHeadline: "One platform.",
  heroBody:
    "Every OPSQAI installation includes the complete Core platform. On top of it, OPSQAI products bring the workspaces of your business domain, and a small set of optional add-ons covers what not every organisation needs. Everything is delivered through signed licenses — activated by OPSQAI, no reinstall, no cloud dependency.",
  ctaRequestModules: "Talk to OPSQAI",
  ctaSeePricing: "See licensing model",

  coreTitle: "OPSQAI Core platform",
  coreBadge: "Always included",
  coreBody:
    "Permanent platform capabilities. Never sold separately and never toggled commercially — access is governed only by roles and permissions.",

  productsTitle: "OPSQAI products",
  productsBody:
    "Domain solutions enabled per company. Your company profile determines which products are relevant; OPSQAI enables the ones you license.",
  availableBadge: "Available",
  plannedBadge: "Planned",

  addonsTitle: "Optional add-ons",
  addonsBody: "Genuinely optional capabilities, licensed only if you want them.",

  activationEyebrow: "Activation",
  activationHeadlinePrefix: "Entitlements arrive through",
  activationHeadlineAccent: "signed licenses.",
  activationBody:
    "OPSQAI issues an Ed25519-signed license. Your installation verifies it offline and resolves your products and add-ons instantly — no reinstall, no cloud call, no seat inflation.",
  ctaRequestActivation: "Request activation",
};

type Copy = typeof en;

const de: Copy = {
  heroEyebrow: "Die OPSQAI-Plattform",
  heroSerifAccent: "Produkte passen sich Ihrem Fachbereich an.",
  heroHeadline: "Eine Plattform.",
  heroBody:
    "Jede OPSQAI-Installation enthält die vollständige Core-Plattform. Darauf bringen OPSQAI-Produkte die Arbeitsbereiche Ihres Fachbereichs, und einige optionale Add-ons decken ab, was nicht jede Organisation braucht. Alles wird über signierte Lizenzen ausgeliefert — von OPSQAI aktiviert, ohne Neuinstallation, ohne Cloud-Abhängigkeit.",
  ctaRequestModules: "OPSQAI kontaktieren",
  ctaSeePricing: "Lizenzmodell ansehen",

  coreTitle: "OPSQAI Core-Plattform",
  coreBadge: "Immer enthalten",
  coreBody:
    "Dauerhafte Plattformfunktionen. Werden nie separat verkauft und nie kommerziell freigeschaltet — der Zugriff wird ausschließlich über Rollen und Berechtigungen gesteuert.",

  productsTitle: "OPSQAI Produkte",
  productsBody:
    "Fachlösungen, die pro Unternehmen aktiviert werden. Ihr Unternehmensprofil bestimmt, welche Produkte relevant sind; OPSQAI aktiviert die lizenzierten.",
  availableBadge: "Verfügbar",
  plannedBadge: "Geplant",

  addonsTitle: "Optionale Add-ons",
  addonsBody: "Wirklich optionale Funktionen — nur auf Wunsch lizenziert.",

  activationEyebrow: "Aktivierung",
  activationHeadlinePrefix: "Berechtigungen kommen über",
  activationHeadlineAccent: "signierte Lizenzen.",
  activationBody:
    "OPSQAI stellt eine Ed25519-signierte Lizenz aus. Ihre Installation verifiziert sie offline und löst Produkte und Add-ons sofort auf — ohne Neuinstallation, ohne Cloud-Aufruf, ohne Lizenzinflation.",
  ctaRequestActivation: "Aktivierung anfragen",
};

const ro: Copy = {
  heroEyebrow: "Platforma OPSQAI",
  heroSerifAccent: "Produsele se adaptează domeniului dumneavoastră.",
  heroHeadline: "O singură platformă.",
  heroBody:
    "Fiecare instalare OPSQAI include platforma Core completă. Peste ea, produsele OPSQAI aduc spațiile de lucru ale domeniului dumneavoastră, iar câteva add-on-uri opționale acoperă ce nu este necesar fiecărei organizații. Totul se livrează prin licențe semnate — activate de OPSQAI, fără reinstalare, fără dependență de cloud.",
  ctaRequestModules: "Contactați OPSQAI",
  ctaSeePricing: "Vedeți modelul de licențiere",

  coreTitle: "Platforma Core OPSQAI",
  coreBadge: "Mereu inclusă",
  coreBody:
    "Capabilități permanente ale platformei. Nu se vând separat și nu se activează comercial — accesul este guvernat exclusiv de roluri și permisiuni.",

  productsTitle: "Produse OPSQAI",
  productsBody:
    "Soluții de domeniu activate per companie. Profilul companiei determină ce produse sunt relevante; OPSQAI activează cele licențiate.",
  availableBadge: "Disponibil",
  plannedBadge: "Planificat",

  addonsTitle: "Add-on-uri opționale",
  addonsBody: "Capabilități cu adevărat opționale, licențiate doar dacă le doriți.",

  activationEyebrow: "Activare",
  activationHeadlinePrefix: "Drepturile ajung prin",
  activationHeadlineAccent: "licențe semnate.",
  activationBody:
    "OPSQAI emite o licență semnată Ed25519. Instalarea dumneavoastră o verifică offline și rezolvă instant produsele și add-on-urile — fără reinstalare, fără apel în cloud, fără inflație de licențe.",
  ctaRequestActivation: "Solicitați activarea",
};

export function useModulesCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
