## OPSQAI Investor Deck v3 — VC-grade rebuild (revised)

### Golden Rule (enforced across every slide)
**This deck must be defensible under investor due diligence.** Every statement must be something the founders can confidently explain and support in a VC meeting. If a claim cannot be defended with evidence, it is removed. Credibility > ambition.

### Non-negotiable rules
1. **No fabricated traction.** Never invent customers, pilots, design partners, revenue, downloads, meetings, partnerships, or adoption metrics. Missing info is marked **"Planned"** or the section is removed.
2. **No fabricated market numbers.** Every TAM/SAM/SOM figure and every stat carries a visible source (Gartner, IDC, Statista, Eurostat, Fortune Business Insights, Grand View, McKinsey, Deloitte, BSI, Bitkom, EU AI Act text) with year, in 9pt slate below the number.
3. **Mockups must faithfully represent the current OPSQAI product.** No invented screens, no invented features. Only surfaces that exist today in the codebase (`src/routes/*`, `src/components/mc/*`, installer wizard).
4. **Roadmap:** never mark a feature "Completed" unless it is already implemented and demonstrable in-repo. Otherwise → In Progress / Planned / Vision.
5. **Competitors:** objective comparisons only. No superiority claim without a measurable differentiator (self-host, sovereignty, module licensing, offline activation, AI audit, source citations).
6. **Ask:** €350K–€750K **Pre-Seed** (not Seed).
7. **Business model:** "Annual Maintenance (recurring, typically 15–20% depending on contract)" — no hardcoded 20%.
8. **Team:** exactly — Founder & CEO **Ștefan Bari**; CTO **Planned**; Head of AI **Planned**. No "to be named".

### Deck structure (18 slides — added "Why we're different")
1. Cover
2. Problem — why industrial ops can't put SOPs in public LLMs (EU AI Act, BSI cited)
3. Market context — enterprise GenAI adoption + regulated-industry constraint (cited)
4. Product — Basic Platform + Premium Modules (aligned with `docs/product-documentation/04-modules.md`)
5. **Why we're different** — Windows Native · Self-Hosted · Customer owns data · Customer chooses AI · Offline capable · Modular licensing · Enterprise governance · AI Audit · Source citations · No vendor lock-in · Installer included · Local embeddings
6. Architecture — MC (licensing/updates/portal/installer) ↔ Windows Self-Hosted (Postgres+pgvector, KB, AI adapter, users)
7. How it works — ingest → embed → retrieve → grounded generate → audited answer
8. Product mockups I — AI Chat + Knowledge Base *(faithful to current UI only)*
9. Product mockups II — Module Store + AI Audit *(faithful to current UI only)*
10. Product mockups III — Management Center + Customer Portal + Installer *(faithful to current UI only)*
11. Business model — Basic Platform + Premium Modules + Annual Maintenance (recurring, typically 15–20%) + expansion vectors
12. Competitive landscape — Copilot, ChatGPT Enterprise, Glean, Guru, Rovo, Coveo, Elastic AI, internal RAG. Matrix on measurable axes only: self-host, data residency, module licensing, offline activation, grounded audit, source citations.
13. Go-to-market — DACH logistics → industrial manufacturing → EU expansion; dated milestones (all forward-looking marked "Planned")
14. Traction — only what is real today; everything else marked **Planned** or omitted
15. Roadmap — Completed (only implemented & demonstrable) / In Progress / Planned / Vision
16. Team — Ștefan Bari (Founder & CEO); CTO Planned; Head of AI Planned
17. TAM / SAM / SOM — bottom-up, with methodology box + inline source per number
18. Ask — €350K–€750K **Pre-Seed**, use of funds (Engineering, AI, Sales, Marketing, CS, Infra), 18-month milestones, contact

### Research pass (before writing)
Web searches for verifiable inputs to TAM/SAM/SOM and market context:
- Enterprise GenAI / knowledge-management market — Gartner, IDC, Grand View, Fortune Business Insights
- DACH logistics operators / 3PL — Fraunhofer SCS, Statista, Eurostat
- Industrial / manufacturing IT spend — IDC, Deloitte
- EU sovereignty / AI Act constraints — official EU + BSI + Bitkom
Every number that survives is cited on the slide with source + year. Anything unverifiable is removed.

### Visual system
- Reuse Noir & Gold palette (NAVY #0B1220 / IVORY #F5F1E8 / GOLD #C8A24B) from `src/styles.css` — matches MC shell
- DejaVu Serif for titles, DejaVu Sans for body (existing v2 registration)
- Diagrams built with reportlab primitives; mockups hand-drawn to match real routes/components
- Source line: 9pt slate, bottom-left above page number

### Technical
- New file `scripts/gen_investor_deck_v3.py` → `/mnt/documents/OPSQAI-Investor-Deck-v3.pdf`
- Keep v2 as fallback
- **QA loop:** rasterize each slide with `pdftoppm`, inspect with `code--view`, fix overflow / low contrast / overlap, re-render until clean
- Deliverable includes a per-slide source list

### Out of scope
No changes to website, app, installer, tests, or catalog.

Approve and I start with the research pass, then build.