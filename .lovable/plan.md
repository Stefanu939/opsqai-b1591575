# OPSQAI Investor Deck — SIventures

A polished 16:9 PDF pitch deck, addressed implicitly to Oliver Philipp / SIventures (Leipzig, early-stage B2B, Industrial Tech focus, Mainteny portfolio). Written in the voice of the founding team (CEO / CTO / Head of AI) — first person plural, confident, sober, European industrial tone. Core narrative: **AI that works *for* people in operations, not instead of them.**

## Design

- Format: 1920×1080 landscape, exported as a single high-quality PDF via ReportLab (Platypus + canvas) with DejaVu Sans registered for German umlauts (Schröter, etc.).
- Palette: **Midnight Executive** — deep navy `#0B1220` background on hero/section slides, ivory `#F5F1E8` content slides, gold accent `#C8A24B` (matches OPSQAI Noir & Gold brand memory), muted slate `#5B6472` for secondary text.
- Typography: Large editorial headlines (48–96pt), 22–28pt body, 14–16pt captions. No bullet dumps — max 4 lines per idea.
- One visual motif carried through every slide: a thin gold rule + numbered slide index bottom-right. No AI-cliché accent lines under titles.
- QA: render each page to JPEG, inspect for overflow / clipping / contrast, iterate until clean.

## Slide sequence (14 slides)

1. **Cover** — OPSQAI wordmark, tagline *"Operational AI that works for your people."*, "Investor Brief — Prepared for SIventures · July 2026".
2. **The moment** — one line: European industrial operators are drowning in SOPs, manuals, tribal knowledge. Public LLMs can't touch it (compliance, sovereignty).
3. **Mission** — *We bring AI to work alongside operators, not replace them.* Three tenets: Augment, don't automate away. Sovereignty by default. Auditable by design.
4. **Problem** — 4 concrete pains: onboarding time, SOP drift, audit exposure, knowledge loss on staff turnover. Backed by short quantified claims.
5. **Solution** — OPSQAI: a self-hosted, license-gated enterprise AI platform turning the customer's own SOPs, manuals, FAQs into a governed, source-cited answer surface. Screenshot/mock of chat with citations.
6. **How it works** — 3-step diagram: Ingest & govern → Retrieve with ACL → Answer with citations & audit trail. Emphasize data never leaves the customer boundary.
7. **Why now** — EU AI Act + data sovereignty + LLM maturity + labor shortage in logistics/industry. SIventures-relevant framing.
8. **Product** — modules grid: Knowledge Base, SOPs, Academy, Chat, FAQ, Internal Requests, Brand, Workspace. License-gated per module.
9. **Differentiation** — table vs. ChatGPT Enterprise / Glean / in-house RAG: sovereignty, per-module licensing, offline activation, audit-first, Windows self-hosted installer.
10. **Traction / proof** — Evertrace referral, self-hosted Windows installer shipping, architecture book & security documentation complete, early logistics/warehouse pilots. Honest phrasing where pre-revenue.
11. **Business model** — Installation License + per-module licenses + maintenance windows. Land-and-expand inside industrial groups. Rough ACV bands.
12. **Market** — Bottom-up: EU mid-market industrial & logistics operators (10k+ employees segment), TAM/SAM/SOM sized conservatively.
13. **Team** — Founders as CEO / CTO / Head of AI with one-line credibility statements. "We're operators who got tired of the answer being 'ask Ștefan'."
14. **Ask & contact** — What we're raising, what it buys (12–18 months runway: 2 pilots → 6 paying installs, security certifications, sales hire), then: *Next step: 30-min call. stefan@opsqai.de · opsqai.de*.

## Voice guidelines

- First person plural ("we", "our team"), never "the company".
- No hype adjectives ("revolutionary", "cutting-edge"). Prefer concrete verbs.
- Every claim either quantified or explicitly framed as directional.
- German-market awareness: mention Leipzig/DACH context on the Ask slide without pandering.

## Deliverable

- File: `/mnt/documents/OPSQAI-Investor-Deck-SIventures.pdf`
- Rendered previews inspected page by page before delivery.
- Presented back with a `<presentation-artifact>` tag so the user can download and forward directly to `oliver@siventures.de`.

## Technical section

- Script: `scripts/gen_investor_deck.py` (ReportLab, DejaVu Sans registered via fontconfig, landscape 1920×1080 via custom pagesize, per-slide canvas draw functions for full layout control).
- QA loop: `pdftoppm -jpeg -r 100 out.pdf page` → view each `page-*.jpg` → fix → re-render until clean.
- No app code changes; deck is a standalone artifact.
