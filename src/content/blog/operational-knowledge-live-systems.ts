import type { BlogPost } from "./_types";

export const post: BlogPost = {
  slug: "operational-knowledge-live-systems",
  title: "Operational Knowledge: Turning SOPs Into Live Systems",
  description:
    "SOPs die in shared drives. Here is how to turn operational knowledge into a live retrieval system that operators actually use.",
  pillar: "SOP Management",
  keywords: "operational knowledge, SOP live system, SOP digitisation, warehouse SOP",
  datePublished: "2026-06-20",
  author: { name: "OPSQAI Editorial", role: "Product" },
  readingMinutes: 5,
  lede:
    "Most SOPs are static PDFs that nobody opens. Turning them into a live system means solving three problems: findability, freshness, and honesty about what the SOP does not cover.",
  sections: [
    {
      heading: "Findability beats formatting",
      paragraphs: [
        "A perfectly formatted 40-page SOP that operators cannot find at the moment of use is worthless. The first job of a live SOP system is to answer the question the operator is actually asking — in their language, with the passage they need — in under five seconds.",
        "Retrieval-grounded AI does this well when three conditions hold: chunking is done at the paragraph level, embeddings are re-generated on every publish, and the query language matches the operational vocabulary.",
      ],
    },
    {
      heading: "Freshness through workflow",
      paragraphs: [
        "SOPs age. A live system needs an owner for every document, a review cadence, and an acknowledgement mechanism that captures who has actually read the current version. Version references travel with every answer — the operator sees which SOP version produced the citation.",
      ],
    },
    {
      heading: "Honest refusal",
      paragraphs: [
        "The hardest part is honesty. A live SOP system must refuse when the sources do not answer the question — and route the refusal to the person who can update the SOP. Every refusal is a signal about where the knowledge base is thin.",
      ],
    },
  ],
  relatedLandingPages: ["/solutions/warehouse-sop-software", "/guides/how-to-digitize-warehouse-sops"],
  relatedPosts: ["what-is-enterprise-knowledge-management-2026"],
};
