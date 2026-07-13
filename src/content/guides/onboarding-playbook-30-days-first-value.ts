import type { Guide } from "./_types";

export const guide: Guide = {
  slug: "onboarding-playbook-30-days-first-value",
  title: "Onboarding Playbook: 30 Days to First Value with OPSQAI",
  description:
    "A 30-day playbook to reach first operational value with OPSQAI — from kickoff to a working assistant on the floor.",
  keywords: "OPSQAI onboarding, AI assistant onboarding, warehouse AI rollout",
  datePublished: "2026-07-04",
  author: { name: "OPSQAI Editorial", role: "Customer Success" },
  readingMinutes: 8,
  lede: "Thirty days is enough to reach first value on one site. This playbook is what OPSQAI teams do with customers who want measurable outcomes in month one.",
  steps: [
    {
      name: "Week 1 — Discovery and ownership",
      text: "Identify the top 20 questions operators actually ask. Assign an owner per topic. Confirm the language mix. Provision the workspace and invite the pilot users.",
    },
    {
      name: "Week 2 — Ingestion and verification",
      text: "Import the top 20 SOPs. Verify retrieval quality on a scripted question set. Refactor any SOPs whose structure prevents clean retrieval.",
    },
    {
      name: "Week 3 — Pilot shift",
      text: "Turn the assistant on for one shift. Watch the refusal log. Route each refusal to the topic owner. Land at least three SOP updates before the end of the week.",
    },
    {
      name: "Week 4 — Measure and expand",
      text: "Report against three metrics: time-to-answer, refusal rate, and team-lead interruption count. Expand to the second shift or the next site.",
    },
  ],
  relatedLandingPages: ["/solutions/warehouse-ai-assistant", "/product"],
};
