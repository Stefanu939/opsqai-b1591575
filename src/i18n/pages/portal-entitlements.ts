// Customer Portal — platform / products / add-ons terminology (EN / DE / RO).
// Canonical vocabulary: Core Platform, Products, Optional Add-ons,
// Company Profile. Never "Basic", never a module marketplace.
import { useT } from "@/i18n";

const en = {
  eyebrow: "Customer portal",
  title: "Your OPSQAI platform",
  description:
    "What your organisation has today: the OPSQAI Core Platform (always included), the products enabled for you, active optional add-ons, and your license status. Contact OPSQAI to change seats, enable a product, or renew maintenance.",
  contactCta: "Contact OPSQAI",

  emptyTitle: "No subscription linked yet",
  emptyBody: "Once your OPSQAI installation is licensed, contract details appear here.",

  install: "Install",
  license: "License",
  licenseNotIssued: "Not yet issued",
  seats: "Seats",
  maintenanceUntil: "Maintenance until",
  expires: "Expires",
  status: "Status",
  active: "Active",
  suspended: "Suspended",
  revoked: "Revoked",
  daysLeft: "days left",
  expired: "expired",

  coreTitle: "Core platform",
  coreSubtitle: "Included with OPSQAI",
  coreNote:
    "These capabilities are part of the platform. They are never priced separately and are never activated one by one. Access is governed by roles and permissions.",

  productsTitle: "Your products",
  productsEmpty:
    "No products enabled yet. The Core Platform included with your installation is always available — ask OPSQAI to enable a product.",

  addonsTitle: "Optional add-ons",
  addonsEmpty: "No optional add-ons active.",

  companyProfile: "Company profile",
};

export type PortalEntitlementsCopy = typeof en;

const de: PortalEntitlementsCopy = {
  eyebrow: "Kundenportal",
  title: "Ihre OPSQAI-Plattform",
  description:
    "Was Ihr Unternehmen heute besitzt: die OPSQAI Core-Plattform (immer enthalten), die für Sie aktivierten Produkte, aktive optionale Add-ons und Ihren Lizenzstatus. Für Sitzplätze, Produktaktivierung oder Wartungsverlängerung wenden Sie sich an OPSQAI.",
  contactCta: "OPSQAI kontaktieren",

  emptyTitle: "Noch kein Abonnement verknüpft",
  emptyBody:
    "Sobald Ihre OPSQAI-Installation lizenziert ist, erscheinen hier die Vertragsdaten.",

  install: "Installation",
  license: "Lizenz",
  licenseNotIssued: "Noch nicht ausgestellt",
  seats: "Sitzplätze",
  maintenanceUntil: "Wartung bis",
  expires: "Läuft ab",
  status: "Status",
  active: "Aktiv",
  suspended: "Ausgesetzt",
  revoked: "Widerrufen",
  daysLeft: "Tage übrig",
  expired: "abgelaufen",

  coreTitle: "Core-Plattform",
  coreSubtitle: "In OPSQAI enthalten",
  coreNote:
    "Diese Funktionen sind Teil der Plattform. Sie werden nie separat bepreist und nie einzeln aktiviert. Der Zugriff wird über Rollen und Berechtigungen gesteuert.",

  productsTitle: "Ihre Produkte",
  productsEmpty:
    "Noch keine Produkte aktiviert. Die in Ihrer Installation enthaltene Core-Plattform ist immer verfügbar — bitten Sie OPSQAI, ein Produkt zu aktivieren.",

  addonsTitle: "Optionale Add-ons",
  addonsEmpty: "Keine optionalen Add-ons aktiv.",

  companyProfile: "Unternehmensprofil",
};

const ro: PortalEntitlementsCopy = {
  eyebrow: "Portal clienți",
  title: "Platforma dumneavoastră OPSQAI",
  description:
    "Ce are organizația dumneavoastră astăzi: Platforma Core OPSQAI (mereu inclusă), produsele activate pentru dumneavoastră, add-on-urile opționale active și starea licenței. Pentru locuri, activarea unui produs sau reînnoirea mentenanței, contactați OPSQAI.",
  contactCta: "Contactați OPSQAI",

  emptyTitle: "Niciun abonament asociat încă",
  emptyBody:
    "După ce instalarea OPSQAI este licențiată, detaliile contractului apar aici.",

  install: "Instalare",
  license: "Licență",
  licenseNotIssued: "Neemisă încă",
  seats: "Locuri",
  maintenanceUntil: "Mentenanță până la",
  expires: "Expiră",
  status: "Stare",
  active: "Activă",
  suspended: "Suspendată",
  revoked: "Revocată",
  daysLeft: "zile rămase",
  expired: "expirată",

  coreTitle: "Platforma Core",
  coreSubtitle: "Inclus în OPSQAI",
  coreNote:
    "Aceste capabilități fac parte din platformă. Nu sunt niciodată tarifate separat și nu se activează individual. Accesul este guvernat de roluri și permisiuni.",

  productsTitle: "Produsele dumneavoastră",
  productsEmpty:
    "Niciun produs activat încă. Platforma Core inclusă în instalarea dumneavoastră este mereu disponibilă — cereți OPSQAI activarea unui produs.",

  addonsTitle: "Add-on-uri opționale",
  addonsEmpty: "Niciun add-on opțional activ.",

  companyProfile: "Profil companie",
};

export function usePortalEntitlementsCopy(): PortalEntitlementsCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
