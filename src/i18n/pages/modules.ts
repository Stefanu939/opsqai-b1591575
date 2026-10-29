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

  customTitle: "Custom workflows by industry",
  customBody: "Examples of custom workspaces built on the OPSQAI Core after a process diagnosis. Proposed development, not off-the-shelf licensed products.",
  customBadge: "Custom development",
  customCases: [
    { title: "Auto repair", items: ["Vehicle intake sheets", "Faster repair estimates", "Technical specs and parts lookup", "Repair and warranty history"] },
    { title: "Banking & finance", items: ["Internal operational controls aligned with DORA and NIS2 requirements", "Credit and AML procedure assistant", "Internal audit preparation"] },
    { title: "Distribution & logistics", items: ["Delivery notes and CMR reconciliation", "Batch traceability", "Alerts for perishable stock and transport discrepancies"] },
  ],
  customCta: "Request a process diagnosis",
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

  customTitle: "Individuelle Abläufe nach Branche",
  customBody: "Beispiele individueller Workspaces auf dem OPSQAI Core nach einer Prozessanalyse. Vorgeschlagene Entwicklung, keine fertig lizenzierten Produkte.",
  customBadge: "Individuelle Entwicklung",
  customCases: [
    { title: "Kfz-Werkstatt", items: ["Fahrzeugannahme-Protokolle", "Schnellere Kostenvoranschläge", "Technische Daten und Teilesuche", "Reparatur- und Garantiehistorie"] },
    { title: "Banken & Finanzen", items: ["Interne operative Kontrollen, ausgerichtet an DORA- und NIS2-Anforderungen", "Assistent für Kredit- und AML-Verfahren", "Vorbereitung interner Audits"] },
    { title: "Distribution & Logistik", items: ["Abgleich von Lieferscheinen und CMR", "Chargenrückverfolgbarkeit", "Warnungen bei verderblichem Bestand und Transportabweichungen"] },
  ],
  customCta: "Prozessanalyse anfragen",
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

  customTitle: "Fluxuri custom pe industria ta",
  customBody: "Exemple de workspace-uri custom construite pe OPSQAI Core după diagnosticarea procesului. Dezvoltare propusă, nu produse licențiate gata făcute.",
  customBadge: "Dezvoltare custom",
  customCases: [
    { title: "Service auto", items: ["Fișe de intrare vehicul", "Devize estimative mai rapide", "Căutare specificații tehnice și piese", "Istoric reparații și garanții"] },
    { title: "Bănci & finanțe", items: ["Controale operaționale interne aliniate cerințelor DORA și NIS2", "Asistent pentru proceduri de creditare și AML", "Pregătire audit intern"] },
    { title: "Distribuție & logistică", items: ["Reconciliere avize și CMR-uri", "Trasabilitate loturi", "Alerte stocuri perisabile și discrepanțe de transport"] },
  ],
  customCta: "Cereți o diagnosticare a procesului",
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
