# OPSQAI — new visual direction: Aurora Noir

An intentional redesign. The Emerald / Gold / Parchment identity and the Noir & Gold
`.oq-soft` scope stop being active guidance. New direction, applied as one ecosystem:

- deep navy / near-black foundations, real dark+light contrast
- ambient violet / purple / blue glow, with a restrained warm ember accent
- floating premium surfaces, thin borders, soft elevation
- abstract generative line art and data-inspired visuals
- generous whitespace, modern typography, restrained motion

Four products, one language, different density:
website = most expressive · Management Center = strategic/powerful ·
Customer Portal = calm/clear · Self-Hosted = dense/operational.

One current design truth: Aurora Noir describes what exists after this work. It is
not a contract — a future explicit request replaces it instead of blending with it.
No permanent style guide, no palette-enforcing verification script, no second
active design truth.

---

## Phase 0 — Design truth cleanup

Sweep active guidance and code for visual statements that will contradict Aurora
Noir, then remove them rather than keep them alongside:

- `docs/design/current-design.md` (currently describes Emerald/Gold/Parchment and
  the Noir & Gold `.oq-soft` scope) — rewritten in Phase 8.
- `mem://index.md` design pointer, plus the design line in
  `docs/engineering/01-conventions.md`.
- `src/styles.css`: obsolete palette comments, unused legacy scopes, legacy font
  declarations, gold/parchment-specific one-off rules.
- Hardcoded brand colours and gold/emerald terminology found in components
  (audited earlier: 41 files reference gold/oix tokens, 19 use `oix-*`).

Contradictions get resolved in favour of the code that ships in Phases 1–6; nothing
is archived as an alternative instruction.

## Phase 1 — Visual foundation (`src/styles.css`)

Rewrite the token layers in place (structure unchanged, values replaced):

- `:root` / `.dark` semantic roles: background, `--surface-0..3`, card, popover,
  primary (violet), accent (blue), `--gold` → renamed usage to a warm ember accent
  token kept under the same variable names so no component has to change,
  border/border-strong/input/ring, destructive/success/warning.
- Background system: near-black navy in dark (`#0a0b14`-family), soft cool white in
  light; ambient radial glow tokens (`--glow-violet`, `--glow-blue`, `--glow-ember`).
- Surface system: floating panel tokens + `--shadow-soft`, `--shadow-lift`,
  `--shadow-glow`.
- Radius: 12 / 16 / 24 (`--radius`, `--radius-panel`) — rounded, not pill-soft.
- Typography: display `Space Grotesk` kept, body switched to `Inter`, serif accent
  dropped from the marketing scope in favour of a light-weight display treatment.
  Font `<link>` in `src/routes/__root.tsx` updated (drop unused families).
- `theme-color` meta values in `__root.tsx` updated to the new navy/white.
- Marketing scope `--oix-*` values remapped to navy/violet/blue (variable names
  kept, so all 19 consuming files inherit the new look without edits).
- `.oq-soft` remapped to the new navy/violet card language.
- Legacy `.mc-shell` (Violet Noir, unused by any route) deleted.

## Phase 2 — Shared primitives

Reused as-is structurally, restyled through tokens: `card`, `button`, `badge`,
`panel`, `bento-grid`, `metric-tile`, `stat-card`, `section-card`, `page-header`,
`segmented-tabs`, `mini-chart`, `progress-ring`, `empty-state`, `skeleton`,
`sonner`, `sidebar`.

Actual edits: `button.tsx` (new variants incl. violet/glass), `card.tsx` (floating
surface + hairline), `badge.tsx`, `mini-chart`/`chart.tsx` (new data palette),
plus new ambient primitives:

- `src/components/visual/ambient-glow.tsx` — reusable violet/blue aura
- `src/components/visual/line-art.tsx` — SVG generative line/wave field
- `src/components/visual/starfield.tsx` — sparse luminous points

## Phase 3 — Public website

- `src/components/oix/oix-layout.tsx`, `nav-shell.tsx`, `footer-oix.tsx`,
  `buttons.tsx`, `editorial-headline.tsx`, `section-shell.tsx`, `motto-band.tsx`,
  `security-wall.tsx` → new gradient stages, line-art backdrops, glass nav.
- `src/components/three/*` (`particle-genesis`, `grid-floor`, `ember-fog`,
  `gold-bloom`) → recoloured to violet/blue/ember; `gold-bloom` renamed in usage
  only if trivial, otherwise recoloured in place.
- Routes touched for section chrome only (copy untouched): `index.tsx`,
  `company.tsx`, `self-hosted.tsx`, `modules.tsx`, `pricing.tsx`, `security.tsx`,
  `product.tsx`, `product-overview.tsx`, `support.tsx`, `contact.tsx`,
  `documentation.*`, `blog.*`, `brand.tsx`.

### Meet the Founders (new section)

New component `src/components/oix/founders-section.tsx`, rendered in
`src/routes/index.tsx` between `<Maturity />`/`<FAQSection />` and `<FinalCTA />`
(after the product/ecosystem story, before the final CTA).

- Eyebrow `ONE VISION`, heading `Meet the founders` via `EditorialHeadline`,
  supporting two-line copy.
- Two equal editorial portrait cards: Adela Bari — CEO; Bari Stefan — CEO & Developer.
  Portrait fills most of the card, name/role/short line at the bottom over a
  gradient scrim; thin hairline border, soft elevation, violet under-glow, line art
  and sparse luminous points behind the portraits (secondary to the photo).
- Desktop side-by-side, mobile stacked, identical crop/aspect for both.
- Copy added to `src/i18n/pages/home.ts` (EN/DE/RO) so it stays bilingual.

Photography: the two supplied photos are processed with the image-edit tool
(no regeneration, no face alteration, no beauty filters) → black and white,
office background removed and replaced with the new deep-navy field, matched crop
and tonal treatment. Results uploaded as CDN assets
(`src/assets/founder-adela.png.asset.json`, `src/assets/founder-stefan.png.asset.json`)
and imported as pointers.

## Phase 4 — Management Center

`src/components/mc/mc-shell.tsx` + `management.*` routes: keep the floating-region
shell and information architecture, restyle to navy/violet, sharpen KPI/chart
hierarchy. Enterprise density preserved.

## Phase 5 — Customer Portal

`portal.tsx` and `portal.*` routes: same tokens, calmer — more whitespace, fewer
accents, larger type, glow used only on hero/status cards.

## Phase 6 — Self-Hosted

`src/components/app/module-page.tsx`, `app-shell.tsx`, `chat/*` and the `app.*`
routes: unchanged layout and density; new tokens, thinner borders, violet accent
instead of gold, ambient aura toned down for 8-hour usage.

## Phase 7 — Romanian language (EN / DE / RO)

Romanian was removed from the product surface earlier (`src/i18n/index.tsx`:
`type Lang = "en" | "de"`). It comes back as a third first-class language:

- `src/i18n/index.tsx` — `Lang` becomes `"en" | "de" | "ro"`, a full `ro` dictionary
  added to the app `dict`, persisted-language validation accepts `ro`.
- `src/i18n/marketing.ts` — `ro` block (nav, footer, CTA, a11y labels).
- All page copy files get a `ro` block: `home.ts` (incl. the new founders copy),
  `company.ts`, `contact.ts`, `documentation.ts`, `modules.ts`, `pricing.ts`,
  `product-overview.ts`, `security.ts`, `self-hosted.ts`, `support.ts`.
- `src/components/oix/nav-shell.tsx` — the language control renders EN · DE · RO
  (desktop and mobile), keeping the existing `aria-pressed` pattern.
- Any `lang === "de" ? … : …` binary checks found across marketing routes and
  helpers (`src/lib/seo.ts`, blog content, hreflang/sitemap if present) become
  three-way, so `/sitemap.xml` and `hreflang` include `ro`.

Translations are real Romanian with correct diacritics — no machine-literal
placeholders — and verified page by page in the preview at all three languages.

## Phase 8 — Documentation

Rewrite `docs/design/current-design.md` to describe only Aurora Noir (old
description deleted, not archived). Update the design pointer line in
`mem://index.md`. No permanent standard, no verification script.


---

## Reused vs redesigned

- **Reused:** all routing, layout architecture, component APIs, module composition,
  semantic-token discipline, copy/i18n, three.js scene structure.
- **Redesigned:** every token value, marketing chrome, ambient effects, chart palette,
  button/card/badge styling, 3D scene colours.
- **Deleted:** legacy `.mc-shell` scope, gold-specific one-off styles.

## Notes

Values are centralised in `src/styles.css`; components keep reading semantic tokens,
so a future direction change is again a token-level change. Phases land in order with
a build check after each.
