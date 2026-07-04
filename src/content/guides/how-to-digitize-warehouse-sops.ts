import type { Guide } from "./_types";

export const guide: Guide = {
  slug: "how-to-digitize-warehouse-sops",
  title: "How to Digitize Warehouse SOPs",
  description:
    "A step-by-step guide for warehouse operations leaders: from PDF chaos to a retrieval-grounded SOP system in six weeks.",
  keywords: "digitize warehouse SOP, SOP digitisation, warehouse SOP management",
  datePublished: "2026-06-22",
  author: { name: "OPSQAI Editorial", role: "Operations" },
  readingMinutes: 12,
  lede:
    "Digitising warehouse SOPs is not a document conversion project. It is a change to how operators find and use knowledge on the floor. This playbook is what actually works.",
  steps: [
    {
      name: "Inventory the top 50 SOPs by usage, not by folder",
      text:
        "Do not start with the SharePoint file tree. Start with the questions team leads answer most often. Pull the last three months of shift handover notes and rank the topics. The top 50 topics are your first-wave SOPs.",
    },
    {
      name: "Assign every SOP to a named owner",
      text:
        "Every document needs a person accountable for its accuracy. If nobody owns it, retire it. Ownership is a prerequisite for the review workflow — without it, freshness is impossible.",
    },
    {
      name: "Standardise structure at the paragraph level",
      text:
        "Retrieval works best on paragraphs of 100–250 words with clear headers. Refactor legacy SOPs into that shape. This is boring work — it pays back the moment you turn retrieval on.",
    },
    {
      name: "Ingest into a retrieval-grounded platform",
      text:
        "Upload the refactored SOPs into OPSQAI (or an equivalent grounded platform). Chunking and embedding are automatic. Verify the top 10 questions return the expected passages before opening the system to operators.",
    },
    {
      name: "Run a pilot shift with a real language mix",
      text:
        "Pilot on one shift for two weeks. Include the language mix operators actually use. Log every refusal — refusals are the map of the next batch of SOPs to write or fix.",
    },
    {
      name: "Close the loop with the gap workflow",
      text:
        "Every refused question opens an internal request. The SOP owner triages it and either updates the SOP or promotes the resolution to a new FAQ. This is the mechanism that keeps the system alive after launch.",
    },
    {
      name: "Roll out to additional sites via workspace cloning",
      text:
        "Once one site is stable, clone the workspace pattern to the next. Corporate SOPs go into a shared overlay; site-specific rules stay per site. Audit is unified across the network.",
    },
  ],
  closing: [
    "Six weeks is achievable if the ownership question is solved on week one. Everything else is execution.",
  ],
  relatedLandingPages: ["/solutions/warehouse-sop-software", "/solutions/warehouse-documentation-software"],
};
