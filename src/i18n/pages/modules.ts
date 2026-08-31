import { useT } from "@/i18n";

const en = {
  heroEyebrow: "The OPSQAI module network",
  heroSerifAccent: "Every module orbits it.",
  heroHeadline: "One platform.",
  heroBody:
    "The Basic Platform ships with every OPSQAI installation. Premium modules dock in through signed license bundles — activated by OPSQAI, no reinstall, no seat inflation, no cloud dependency.",
  ctaRequestModules: "Request modules",
  ctaSeePricing: "See pricing model",
  basicBadge: "Basic",
  premiumBadge: "Premium",
  includedWithBasic: "Included with Basic",
  fromPriceSuffix: "· one-time",
  activationEyebrow: "Activation",
  activationHeadlinePrefix: "Modules dock in through",
  activationHeadlineAccent: "signed bundles.",
  activationBody:
    "OPSQAI issues an Ed25519-signed license bundle. Your installation verifies it offline and unlocks the module instantly — no reinstall, no cloud call, no seat inflation.",
  ctaRequestActivation: "Request activation",
};

type Copy = typeof en;

const de: Copy = {
  heroEyebrow: "Das OPSQAI-Modulnetzwerk",
  heroSerifAccent: "Jedes Modul kreist darum.",
  heroHeadline: "Eine Plattform.",
  heroBody:
    "Die Basisplattform wird mit jeder OPSQAI-Installation ausgeliefert. Premium-Module docken über signierte Lizenzpakete an — aktiviert durch OPSQAI, ohne Neuinstallation, ohne Lizenzinflation, ohne Cloud-Abhängigkeit.",
  ctaRequestModules: "Module anfragen",
  ctaSeePricing: "Preismodell ansehen",
  basicBadge: "Basis",
  premiumBadge: "Premium",
  includedWithBasic: "In Basis enthalten",
  fromPriceSuffix: "· einmalig",
  activationEyebrow: "Aktivierung",
  activationHeadlinePrefix: "Module docken über",
  activationHeadlineAccent: "signierte Pakete an.",
  activationBody:
    "OPSQAI stellt ein Ed25519-signiertes Lizenzpaket aus. Ihre Installation verifiziert es offline und schaltet das Modul sofort frei — ohne Neuinstallation, ohne Cloud-Aufruf, ohne Lizenzinflation.",
  ctaRequestActivation: "Aktivierung anfragen",
};


const ro: Copy = {
  heroEyebrow: "Rețeaua de module OPSQAI",
  heroSerifAccent: "Fiecare modul orbitează în jurul ei.",
  heroHeadline: "O singură platformă.",
  heroBody:
    "Platforma Basic este inclusă în fiecare instalare OPSQAI. Modulele Premium se conectează prin pachete de licență semnate — activate de OPSQAI, fără reinstalare, fără inflație de licențe, fără dependență de cloud.",
  ctaRequestModules: "Solicitați module",
  ctaSeePricing: "Vedeți modelul de preț",
  basicBadge: "Basic",
  premiumBadge: "Premium",
  includedWithBasic: "Inclus în Basic",
  fromPriceSuffix: "· plată unică",
  activationEyebrow: "Activare",
  activationHeadlinePrefix: "Modulele se conectează prin",
  activationHeadlineAccent: "pachete semnate.",
  activationBody:
    "OPSQAI emite un pachet de licență semnat Ed25519. Instalarea dumneavoastră îl verifică offline și deblochează modulul instant — fără reinstalare, fără apel către cloud, fără inflație de licențe.",
  ctaRequestActivation: "Solicitați activarea",
};

export function useModulesCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
