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

export function useModulesCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : en;
}
