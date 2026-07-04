import type { BlogPost } from "./_types";

export const post: BlogPost = {
  slug: "semantic-vs-keyword-search-warehouse",
  title: "Semantic Search vs Keyword Search in Warehouse Operations",
  description:
    "Why keyword search fails on the warehouse floor, and how semantic retrieval changes operator behaviour.",
  pillar: "Warehouse AI",
  keywords: "semantic search warehouse, keyword search vs semantic, retrieval augmented generation warehouse",
  datePublished: "2026-06-25",
  author: { name: "OPSQAI Editorial", role: "Engineering" },
  readingMinutes: 5,
  lede:
    "Operators do not phrase questions the way the SOP is written. Keyword search punishes them for it. Semantic search does not.",
  sections: [
    {
      heading: "The vocabulary mismatch",
      paragraphs: [
        "An SOP says 'dangerous goods class 3 flammable liquid handling'. An operator on the floor types 'gas spill what do'. Keyword search returns nothing. The operator asks a team lead — or worse, guesses.",
        "Semantic search — retrieval over embeddings — closes that gap because the model matches meaning, not tokens. The passage about class 3 flammable liquid handling surfaces for the operator's plain-language query.",
      ],
    },
    {
      heading: "Behavioural impact",
      paragraphs: [
        "The switch to semantic retrieval changes what operators do. They stop giving up on search. They stop copying answers into notebooks. Team leads get pulled off the line less. Onboarding gets faster because a new hire's imperfect vocabulary is no longer a barrier.",
      ],
    },
    {
      heading: "What to watch for",
      paragraphs: [
        "Semantic search is not a silver bullet. It can surface confidently-related-but-wrong passages. That is why retrieval must be paired with grounded generation and refusal: the AI is only allowed to answer from the returned passages, and refuses when they do not fit the question.",
      ],
    },
  ],
  relatedLandingPages: ["/solutions/warehouse-ai-assistant", "/solutions/ai-for-warehouse-operations"],
};
