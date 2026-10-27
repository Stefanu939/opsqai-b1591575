// Public "Platform" page copy. Mirrors the canonical product architecture:
// Core Platform (always included) · OPSQAI Products (per domain) · Optional
// add-ons. No marketplace, no "Basic vs Premium", no prices.
import { useT } from "@/i18n";

const en = {
  heroEyebrow: "The OPSQAI platform",
  heroSerifAccent: "custom workflows for your business.",
  heroHeadline: "OPSQAI. Operational modules,",
  heroBody:
    "Connect knowledge, training, internal requests and day-to-day operations. Licensed HR, Transport, Logistics and Operations workspaces extend the platform; custom development starts with your process, including potential banking or auto repair workflows. Available and planned products are labelled below.",
  ctaRequestModules: "Talk to OPSQAI",
  ctaSeePricing: "See licensing model",

  coreTitle: "OPSQAI Core platform",
  coreBadge: "Always included",
  coreBody:
    "Platform capabilities included in the installation license, not sold individually. All modules remain license-governed; roles and permissions control user access.",

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
  heroSerifAccent: "individuelle Abläufe für Ihr Unternehmen.",
  heroHeadline: "OPSQAI. Operative Module,",
  heroBody:
    "Wissen, Schulungen, interne Anfragen und operative Arbeit verbinden. Lizenzierte HR-, Transport-, Logistik- und Operations-Workspaces erweitern die Plattform. Individuelle Entwicklung beginnt mit Ihrem Prozess, auch für mögliche Bank- oder Werkstattabläufe. Verfügbare und geplante Produkte sind unten gekennzeichnet.",
  ctaRequestModules: "OPSQAI kontaktieren",
  ctaSeePricing: "Lizenzmodell ansehen",

  coreTitle: "OPSQAI Core-Plattform",
  coreBadge: "Immer enthalten",
  coreBody:
    "Plattformfunktionen sind in der Installationslizenz enthalten und werden nicht einzeln verkauft. Alle Module bleiben lizenzgebunden; Rollen und Berechtigungen steuern den Benutzerzugriff.",

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
  heroSerifAccent: "fluxuri custom pentru firma ta.",
  heroHeadline: "OPSQAI. Module operaționale,",
  heroBody:
    "Leagă cunoștințele, instruirea, cererile interne și operațiunile zilnice. Workspace-urile licențiate HR, Transport, Logistică și Operations extind platforma; dezvoltarea custom pornește de la procesul tău, inclusiv pentru posibile fluxuri bancare sau de service auto. Produsele disponibile și cele planificate sunt marcate mai jos.",
  ctaRequestModules: "Contactați OPSQAI",
  ctaSeePricing: "Vedeți modelul de licențiere",

  coreTitle: "Platforma Core OPSQAI",
  coreBadge: "Mereu inclusă",
  coreBody:
    "Capabilități incluse în licența instalării, fără vânzare individuală. Toate modulele rămân guvernate de licență; rolurile și permisiunile controlează accesul utilizatorilor.",

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
