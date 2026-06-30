
## Scope (3 things, no new modules / routes / sidebars)

1. Rename existing **Customer Delivery Center** → **Enterprise Documents** (label only; same route `/app/admin/customers`, same workflow, same files).
2. Upgrade document **generation quality** (PDF + DOCX) so exports look like consulting deliverables, plus tighten the AI writing prompt to match the reference PDF you'll upload.
3. **Recalibrate the color system** (softer enterprise blue, calmer dark surfaces) across the entire app + landing.
4. On the **existing landing page only**, add charts and a small demo screenshot under each module sub-title — keep current structure.

Out of scope: new routes, sidebar redesign, layout changes, typography changes, new templates.

---

## 1. Rename to "Enterprise Documents"

Touch only labels and copy. No route, file, or function renames.

- `src/routes/_authenticated/app.admin.customers.tsx` — page title, breadcrumb, header, page `<head>` title.
- Sidebar entry in `src/components/app/app-shell.tsx` — change label "Customer Delivery Center" → "Enterprise Documents". Icon, order, route untouched.
- `src/i18n/index.tsx` — update the EN / DE / RO strings for that menu item and page heading.
- Marketing site "Enterprise Documents" module card stays; just confirm copy alignment.

---

## 2. Premium document generation

Keep workflow exactly: pick workspace → pick type → generate → preview → export.

### 2a. AI writing prompt (`src/routes/api/customer-writer.ts`)
- Tighten the system prompt: enforce consulting structure (Cover meta → Exec Summary → TOC sections → Key Takeaways → Recommendations → Risks/Opportunities → Next Steps).
- Forbid AI clichés ("In today's fast-paced world…", "leverage", "unlock"), forbid invented numbers; require `[to be confirmed]` for unknowns.
- Emit structured markdown blocks the renderer understands:
  - `## Section` headings
  - `> [!kpi] Label | Value | Sub` for KPI cards
  - `> [!callout:recommendation|risk|opportunity|takeaway|note]` panels
  - `| col | col |` tables
  - `- [ ] step — owner — date` for timeline/roadmap rows
- Enforce per-template length budgets (the ones you listed: 2–4, 4–8, 3–6 pages…).
- Output `# Document Title` on line 1 + a YAML-ish front matter block with `subtitle`, `confidentiality`, `version`, `revision`, `generated_at`, `workspace`, `customer_logo_url`.

### 2b. PDF generator (`src/lib/generators/pdf.server.ts`)
Rewrite as a real layout engine on `pdf-lib`, still WinAnsi-safe:
- **Cover page**: OPSQAI mark + customer logo (if provided), title, subtitle, customer name, workspace, confidentiality stripe, version / revision / date block, accent rule.
- **Page chrome**: running header (doc title left, customer right), running footer (page x / y, confidentiality, OPSQAI © year), 1pt hairline rules in accent.
- **Auto Table of Contents** page built from collected H2/H3 with dot leaders + page numbers (two-pass layout).
- **Typography hierarchy**: H1/H2/H3 sizes, lead paragraph, body, caption; consistent 1.45 line height; first-line spacing rules; widow/orphan guard (move heading to next page if <3 body lines follow).
- **Markdown parser** (lightweight, no new deps) that understands the structured blocks above and renders:
  - KPI cards (rounded rect, big value, small label, accent bar)
  - Callout panels (left accent bar, soft tinted fill, icon glyph)
  - Tables with zebra rows, header band, cell padding, column auto-sizing, page-break across rows
  - Timeline (dot + connector + date + owner)
  - Section dividers (thin rule + small caps label)
- **Export verification pass**: detect empty trailing pages, orphan headings, oversize images; drop empty pages, push orphans, downscale rasters > page width.

### 2c. DOCX generator (`src/lib/generators/docx.server.ts`)
Apply the docx skill conventions:
- Explicit US Letter page size, 1" margins, Arial 11 default.
- Override `Heading1/2/3` with `outlineLevel` so Word/Google Docs generate the TOC.
- Real numbered/bulleted lists via `LevelFormat`, never unicode bullets.
- Cover paragraph block (title, subtitle, customer, workspace, version, date, confidentiality).
- Header w/ doc title + footer w/ page numbers via `PageNumber.CURRENT`.
- Tables built with dual widths (`columnWidths` + per-cell `width` in DXA), `ShadingType.CLEAR` for shaded header rows, hairline borders.
- KPI / callout blocks rendered as styled single-row tables with colored shading + left border accent.
- Insert `TableOfContents` after cover.
- Use the same markdown→blocks parser as PDF (extract to `src/lib/generators/doc-blocks.ts`) so both formats stay consistent.

### 2d. Shared
- New helper `src/lib/generators/doc-blocks.ts` — parse the AI markdown into a typed block list (`cover`, `toc`, `h2`, `para`, `kpi`, `callout`, `table`, `timeline`, `divider`, `pagebreak`).
- Pass customer metadata (name, logo URL from `customer_profiles`, workspace name, subscription, confidentiality) from `customers.functions.ts` into the generator alongside the markdown — no schema change.
- Preview pane in `app.admin.customers.tsx` reuses the same block list to render an on-screen preview that matches the export.

---

## 3. Calmer color system (palette only)

Single change point: `src/styles.css` `:root` and `.dark` blocks. No component edits.

**Light:**
- `--primary` `#2563eb` → `#3358D4` (deeper, lower-chroma indigo-blue)
- `--primary-glow` `#3b82f6` → `#5B7CE6`
- `--ring` matches primary at 35% opacity feel
- `--accent-foreground` softened; `--signal` teal `#14b8a6` → `#0E9F92`
- `--chart-1..5` re-tuned to muted enterprise set (slate-blue, teal, indigo, emerald-muted, amber-muted)
- `--border` slightly warmer (`#E4E7EC`)

**Dark:**
- Background `#020617` → `#0B0E14` (warmer, softer black)
- Surface / card raised to `#11151D` with a +1 step elevation token
- `--primary` in dark → `#5B7CE6` (less neon, AA on dark)
- `--ring` reduced opacity / desaturated
- Borders `#1E2330` instead of pure slate-900

All semantic tokens (`bg-primary`, `text-primary`, sidebar, charts, focus ring, hover/active) inherit automatically — no component-level edits needed.

Add a short comment block at the top of the palette documenting the "Notion / Linear / Stripe" intent so future edits keep it calm.

---

## 4. Landing page additions (existing `src/routes/index.tsx` only)

Keep current section order and structure. Two additions per existing module card / sub-section:

- A small **demo image** (192–240px tall, rounded, subtle border + shadow) directly under each module's sub-title, so a visitor instantly sees what the module looks like. Images generated via `imagegen` (one per module: AI Assistant, KB, Academy, SOP Generator, AI Audit, Health, Analytics, Workspaces, Enterprise Documents, Brand Center, Support) and stored under `src/assets/` then externalized via `lovable-assets`.
- Lightweight **charts** in the Analytics, AI Audit, and Health sections using `recharts` (already in the stack via shadcn chart) — a small line chart (knowledge health trend), a bar chart (questions answered vs gaps), and a radial/score gauge (audit score). Static demo data, no backend calls.

No new sections, no layout changes, no nav changes.

---

## Technical details

- All work stays in: `src/styles.css`, `src/routes/_authenticated/app.admin.customers.tsx`, `src/components/app/app-shell.tsx`, `src/i18n/index.tsx`, `src/lib/generators/pdf.server.ts`, `src/lib/generators/docx.server.ts`, `src/lib/generators/doc-blocks.ts` (new shared parser), `src/lib/customers.functions.ts` (only to pass extra metadata into the generator call), `src/routes/api/customer-writer.ts` (prompt only), `src/routes/index.tsx` (+ generated assets).
- No DB migrations. No new routes. No new env vars. No sidebar restructure.
- The reference PDF you upload next will guide cover, typography weights, KPI card proportions, table styling, and callout colors — used as visual inspiration only; no text copied.

---

## Open question

You mentioned uploading a reference PDF — please attach it before I start so I can calibrate the cover, KPI cards, callout panels, and table style to match its visual quality. I'll begin implementation as soon as it's attached (or you can tell me to proceed without it and I'll use a Stripe/Linear/McKinsey-style baseline).
