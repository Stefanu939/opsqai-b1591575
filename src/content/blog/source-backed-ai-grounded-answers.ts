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
        "Grounded AI is retrieval-augmented generation with a strict contract: the model may only synthesise from passages returned by the retrieval layer, and every synthesised claim must be traceable to at least one of those passages. There is no 'creative fill' step, no silent expansion beyond what retrieval provided.",
        "The contract is enforced by the pipeline, not by the model's goodwill. Prompts instruct the model to answer only from the provided context, but instructions alone are not enough — the pipeline post-checks that citations resolve, refuses when they do not, and logs both the passages and the response for review.",
        "This is the boring, unglamorous version of retrieval-augmented generation. It is also the version that survives an incident review.",
      ],
    },
    {
      heading: "Why enterprises need it",
      paragraphs: [
        "In regulated operations, an answer must be defensible. 'The AI said so' is not defensible. 'SOP-234 v3 §4.2, published 12 April 2026' is. That single change — from opaque generation to citable retrieval — is what makes AI usable in environments where a wrong answer has legal, safety, or financial consequences.",
        "Grounded AI moves the trust boundary from the model to the document controls the enterprise already has. The compliance team already knows how to audit SOPs. They already know how to version documents and track approvers. Grounded AI plugs into that machinery instead of asking the enterprise to invent new controls for a new kind of oracle.",
        "The buyer conversation shifts too. Instead of 'can we trust the model?' the question becomes 'do we trust our own documents?' — which is a question the customer's own governance is already equipped to answer.",
      ],
    },
    {
      heading: "The refusal side of the contract",
      paragraphs: [
        "Grounded AI is only credible if it refuses when retrieval fails. A grounded system that quietly falls back to open-domain generation has broken the contract in the exact scenario the contract was meant to cover. The refusal is not a bug in the demo — it is the demo.",
        "Well-designed refusal has three parts. It tells the operator that the corpus does not cover the question. It opens a knowledge-gap ticket routed to a named owner. It logs the query so KM can see the distribution of gaps over time. None of those cost the operator any additional effort.",
      ],
    },
    {
      heading: "Design details that separate real grounding from theatre",
      paragraphs: [
        "Citations must resolve in one click to the exact passage, not to the front page of a document. If the operator has to scroll to find the paragraph, they will stop checking, and grounding becomes decorative.",
        "Version pointers must be preserved. When SOP-234 becomes v4 next quarter, historical answers still cite v3 — the version that was authoritative when the question was asked. Overwriting silently is how audit trails die.",
        "Confidence must be visible without being manipulative. A single confidence score attached to the whole answer is usually worse than making the citation coverage explicit: 'this claim is supported by passage A; this claim is supported by passages B and C'. Operators calibrate quickly on structural transparency and slowly on numeric scores.",
      ],
    },
  ],
  relatedLandingPages: ["/solutions/enterprise-ai-for-logistics", "/solutions/enterprise-knowledge-base"],
};
