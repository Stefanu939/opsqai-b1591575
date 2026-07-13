import type { Guide } from "./_types";

export const guide: Guide = {
  slug: "roll-out-ai-assistants-distribution-network",
  title: "How to Roll Out AI Assistants Across a Distribution Network",
  description:
    "A rollout playbook for AI assistants in multi-site distribution operations: pilot, isolation, language, governance, scale.",
  keywords: "AI assistant rollout, distribution network AI, multi-site AI deployment",
  datePublished: "2026-06-28",
  author: { name: "OPSQAI Editorial", role: "Deployment" },
  readingMinutes: 10,
  lede: "Rolling out an AI assistant across ten distribution sites is not ten single-site rollouts. It is one platform decision, one governance decision, and ten pragmatic launches.",
  steps: [
    {
      name: "Decide the tenancy model on day one",
      text: "Corporate SOPs shared, site rules per site — or full isolation with occasional overlays. The wrong choice creates governance debt that compounds for years. OPSQAI's recommendation for most 3PL networks: shared corporate workspace + per-site child workspaces.",
    },
    {
      name: "Launch on the site with the strongest ops leader",
      text: "The pilot site is not the biggest or the noisiest — it is the one where operational leadership actually engages with the tool. That is the site whose feedback will shape the rollout playbook.",
    },
    {
      name: "Fix the language mix before scaling",
      text: "If corporate SOPs are in one language and operators speak two others, verify translation quality on the pilot site before rolling to sites where the mismatch is worse.",
    },
    {
      name: "Standardise the gap workflow",
      text: "Every site refuses different questions. The refusal-to-SOP-update pipeline needs one owner across the network — or every site invents its own SOP dialect.",
    },
    {
      name: "Instrument adoption, not just usage",
      text: "Number of queries is a vanity metric. Track: percentage of shifts with an OPSQAI query, refusal rate trending down, time-to-answer for onboarded operators.",
    },
  ],
  relatedLandingPages: [
    "/solutions/ai-for-distribution-centers",
    "/solutions/operational-knowledge-platform",
  ],
};
