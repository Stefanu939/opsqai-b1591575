import type { CaseStudy } from "./_types";

export const study: CaseStudy = {
  slug: "multi-warehouse-rollout-cutting-onboarding-time",
  title: "Multi-Warehouse Rollout: Cutting Onboarding Time by 40%",
  description:
    "Illustrative case study: how a mid-market 3PL used OPSQAI to standardise operator onboarding across five distribution sites.",
  keywords: "warehouse onboarding, 3PL AI case study, multi-site rollout",
  datePublished: "2026-06-30",
  illustrative: true,
  industry: "Third-Party Logistics",
  scale: "5 sites, ~1,200 operators",
  lede: "A mid-market 3PL deployed OPSQAI across five distribution sites to standardise operator onboarding and reduce team-lead interruptions.",
  challenge: [
    "New operators reached productive throughput in an average of 21 shifts. Team leads spent 25–30% of their day answering repeat process questions. SOPs existed in SharePoint but were rarely opened on the floor.",
    "Corporate SOPs were in English; two of the five sites operated primarily in German and Romanian.",
  ],
  approach: [
    "OPSQAI was rolled out with a shared corporate workspace and five child workspaces — one per site — with per-site knowledge overlays and unified audit.",
    "The top 45 SOPs by team-lead consultation frequency were ingested and refactored to paragraph-scale structure. Refusal logs from the pilot shift drove the next 30 SOP updates.",
  ],
  outcome: [
    "By month three, average time to productive throughput dropped by ~40% and team-lead process-question interruptions were reduced by more than half.",
    "The refusal-to-SOP-update workflow surfaced 63 knowledge gaps in the first quarter that were previously invisible.",
  ],
  metrics: [
    { label: "Onboarding time", value: "-40%" },
    { label: "Team-lead interruptions", value: "-55%" },
    { label: "Documented knowledge gaps closed", value: "63" },
    { label: "Rollout duration", value: "12 weeks" },
  ],
};
