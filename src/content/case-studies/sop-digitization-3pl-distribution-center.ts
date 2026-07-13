import type { CaseStudy } from "./_types";

export const study: CaseStudy = {
  slug: "sop-digitization-3pl-distribution-center",
  title: "SOP Digitization for a 3PL Distribution Center",
  description:
    "Illustrative case study: how a distribution center digitised 180 SOPs and turned them into a live retrieval system in eight weeks.",
  keywords: "SOP digitisation case study, distribution center SOP, warehouse SOP live system",
  datePublished: "2026-07-01",
  illustrative: true,
  industry: "Distribution",
  scale: "1 site, 180 SOPs, ~400 operators",
  lede: "A regional distribution center consolidated 180 legacy SOPs into a retrieval-grounded platform, replacing a static shared drive with a live system operators use every shift.",
  challenge: [
    "SOPs were spread across three shared drives with duplicate and outdated versions. Operators rarely consulted them; team leads answered process questions verbally, creating drift across shifts.",
    "An upcoming ISO 9001 recertification required a defensible answer to 'what did the SOP say on any given day'.",
  ],
  approach: [
    "OPSQAI ingested the 180 documents, flagged 22 duplicates and 14 superseded versions, and assigned every remaining SOP to a named owner.",
    "Retrieval quality was verified on a 60-question test set before the assistant was opened to operators. Every published version was preserved for audit reconstruction.",
  ],
  outcome: [
    "The recertification audit reconstructed three sample interactions end-to-end with full version traceability.",
    "Operators consulted the assistant on roughly 70% of shifts within eight weeks of go-live. The refusal log drove 41 SOP updates in the first quarter.",
  ],
  metrics: [
    { label: "SOPs consolidated", value: "180 → 144" },
    { label: "Audit reconstruction time", value: "< 10 min" },
    { label: "Shift adoption", value: "~70%" },
    { label: "Time to go-live", value: "8 weeks" },
  ],
};
