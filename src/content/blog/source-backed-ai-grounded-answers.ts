import type { BlogPost } from "./_types";

export const post: BlogPost = {
  slug: "source-backed-ai-grounded-answers",
  title: "Source-Backed AI: Why Grounded Answers Matter",
  description:
    "Grounded AI is not a feature — it is a discipline. Every enterprise AI decision should start from source-backed answers.",
  pillar: "Enterprise AI",
  keywords: "source-backed AI, grounded AI, retrieval augmented generation, cited AI answers",
  datePublished: "2026-07-01",
  author: { name: "OPSQAI Editorial", role: "Product" },
  readingMinutes: 5,
  lede:
    "An AI answer without a source is a liability. An AI answer with a citation to a specific document version is a decision an operator can defend.",
  sections: [
    {
      heading: "What 'grounded' actually means",
      paragraphs: [
        "Grounded AI is retrieval-augmented generation with a strict contract: the model may only synthesise from passages returned by the retrieval layer, and every synthesised claim must be traceable to at least one of those passages.",
        "The contract is enforced by the pipeline, not by the model's goodwill.",
      ],
    },
    {
      heading: "Why enterprises need it",
      paragraphs: [
        "In regulated operations, an answer must be defensible. 'The AI said so' is not defensible. 'SOP-234 v3 §4.2, published 12 April 2026' is.",
        "Grounded AI moves the trust boundary from the model to the document controls the enterprise already has. That is an architecture the compliance team can sign off on.",
      ],
    },
    {
      heading: "The refusal side of the contract",
      paragraphs: [
        "Grounded AI is only credible if it refuses when retrieval fails. A grounded system that quietly falls back to open-domain generation has broken the contract. OPSQAI's refusal-first behaviour is the enforcement mechanism.",
      ],
    },
  ],
  relatedLandingPages: ["/solutions/enterprise-ai-for-logistics", "/solutions/enterprise-knowledge-base"],
};
