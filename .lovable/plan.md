# OPSQAI — "What is OPSQAI?" plain-language explainer

A 5th PDF alongside the existing four, written for a non-technical audience (family, friends, non-IT colleagues). English, short, friendly, no jargon.

## Output

- `/mnt/documents/OPSQAI-What-Is-It.pdf` (~6–8 pages, A4)

## Audience & tone

- Reader: someone with no software / AI background.
- Tone: like explaining your job at a family dinner. Short sentences. Analogies. No acronyms without a plain-English gloss (RAG, SOP, LLM, on-prem → all explained in one line the first time).
- No pricing, no investor claims, no market stats, no fake customers.

## Structure

1. **Cover** — "What is OPSQAI?" + one-sentence answer:
  *"OPSQAI is a private AI assistant that a company installs on its own computers so its employees can ask questions about the company's own documents and get trustworthy answers."*
2. **The everyday problem** — Companies have thousands of documents (procedures, manuals, training material). Employees waste hours searching. New hires take months to become useful. Analogy: "imagine your family's recipes scattered across 20 notebooks, 3 phones, and grandma's memory."
3. **Why they can't just use ChatGPT** — Two plain reasons: (a) company documents are confidential and can't be sent to a public AI, (b) public AI doesn't know your company's rules. One-line analogy.
4. **What OPSQAI does** — Reads the company's documents, understands them, answers employee questions in normal language, and always shows *where the answer came from* (like footnotes in a book).
5. **How it works, in 4 pictures** — Simple 4-step diagram: **Documents → OPSQAI reads them → Employee asks a question → OPSQAI answers with sources.** No tech words.
6. **Where it lives** — Installed on the company's own Windows computers/servers. Not in the cloud. The company's data stays with the company. Analogy: "like installing Microsoft Office, not like using Gmail."
7. **Who uses it** — Warehouse teams, factory workers, logistics staff, new hires, trainers, quality/compliance people. One line each.
8. **What makes it different** (3 bullets, plain words):
  - It only answers from your own documents (won't make things up).
  - Your data never leaves your company.
  - You can see exactly which document each answer came from.
9. **A day with OPSQAI** — Short story: new warehouse employee on day 1 asks "how do I handle a damaged pallet?", gets the exact procedure with the source SOP. 4–5 sentences.
10. **What OPSQAI is *not*** — Not a chatbot toy. Not a replacement for people. Not a public AI. Not a document storage system.
11. **In one paragraph, for grandma** — The single paragraph to memorize and repeat at dinner.
12. **Back cover** — opsqai.de, contact email, tagline.

## Visuals (all generated, no fabricated screenshots)

- Cover illustration: stylized speech bubble over a factory/warehouse silhouette.
- 4-step "how it works" strip (icons: document, brain, question mark, answer with citation).
- "Where it lives" diagram: a small building labeled "Your company" containing a laptop labeled "OPSQAI" — arrow *not* leaving the building.
- Tiny module strip (Chat, Knowledge Base, FAQ, Academy, Audit) with one-line plain descriptions.

All visuals are simple ReportLab drawings (boxes, icons, labels) in the same brand palette as the other four PDFs — no invented UI screenshots.

## Content sourcing

Same rule as the other four: everything drawn from real project files —
`docs/product-documentation/01-what-is-opsqai.md`, `02-why-it-exists.md`, `04-modules.md`, `06-how-ai-works.md`, `10-security-overview.md`, `11-faq.md`, `public/llms.txt`, `src/lib/opsqai-facts.ts`. Nothing invented.

## Technical approach

- Extend `scripts/gen_opsqai_pdfs.py` with a 5th builder `build_what_is_opsqai()` reusing `opsqai_pdf_theme.py` (fonts, palette, primitives).
- Layout: single-column, generous line-height, ~14pt body, big headings — reads like a friendly booklet, not a spec.
- QA: `pdftoppm -jpeg -r 150` → view every page → fix overflow/overlap/tone (flag any sentence that slips into jargon) → re-render.

## Out of scope

- No changes to the existing 4 PDFs.
- No code/product changes.
  Scriel In romana pe asta 

Confirm and I'll build it in the next turn.