# Design Contract — o singură sursă de adevăr

Scop: designul actual (paletă, fonturi, layout pe module, scope-uri per produs) devine o regulă scrisă în repo, verificabilă, iar memoria proiectului nu mai conține variante contradictorii. Zero schimbare vizuală — doar codificarea a ceea ce există deja.

## Problema pe care o rezolvă

- Memoria proiectului descrie „Design System v3" (Deep Navy, Space Grotesk + Inter) în timp ce codul rulează Emerald/Gold/Parchment cu Karla ca font body.
- `mem://index.md` referă două fișiere de memorie care nu există (`design/palette-typography`, `design/motion-feedback`) și `.lovable/plan.md`, care se rescrie la fiecare plan nou.
- `docs/engineering/03-add-a-module.md` nu menționează contractul de layout, deci un modul nou poate fi construit fără `ModulePage` și fără primitivele partajate.

## Ce se creează

### 1. `docs/engineering/09-design-contract.md` (fișier nou, sursa de adevăr)

Conținut, extras din codul existent (nu inventat):

- **Scope-uri per produs** — ce wrapper se folosește unde și ce e interzis:
  - Self-Hosted `/app/*` → fără `.mc-shell`, fără `.oq-soft`; Emerald/Gold/Parchment, tokeni de bază.
  - Management Center `/management/*` → `.mc-shell` (Noir & Gold, Urbanist + Epilogue).
  - Customer Portal `/portal/*` → `.oq-soft`.
  - Site public → `.oix-shell`.
- **Tokeni și fonturi reale** — lista din `src/styles.css`: `--font-sans: Karla`, `--font-display: Space Grotesk`, `--font-mono: JetBrains Mono`, plus fonturile scoped MC/OIX. Regulă: doar tokeni semantici, niciodată `text-white` / `bg-[#...]`.
- **Contractul de layout pe module** — orice suprafață autentificată compune `ModulePage` (header + segmented tabs opționale + slot toolbar + zonă bento/panel) și reutilizează primitivele: `bento-grid`, `metric-tile`, `panel`, `progress-ring`, `segmented-tabs`, `mini-chart`, `stat-card`, `section-card`, `empty-state`, `skeleton`.
- **Motion** — motion explică schimbări de stare, nu decorează; utilitare `oq-*`, `Button loading/success`, `useCountUp`, vocabularul de toast din `src/lib/feedback.ts`.
- **Golden Rule** — dacă un ecran nou nu arată ca parte din OPSQAI, se redesenează înainte de shipping.
- **Cum se schimbă contractul** — doar la cerere explicită a utilizatorului, prin editarea acestui fișier în același commit cu schimbarea de cod.

### 2. Legături din documentele existente

- `docs/engineering/01-conventions.md`: linia despre design tokens trimite la contract.
- `docs/engineering/03-add-a-module.md`: pas nou „UI: compune `ModulePage` + primitivele partajate — vezi design contract".
- `docs/engineering/08-pre-release-checklist.md`: un rând de verificare a contractului.

### 3. Verificare automată: `scripts/verify-design-contract.mjs`

Rulează pe surse (rapid, fără build) și eșuează cu mesaj clar când:
- o rută autentificată nouă (`src/routes/_authenticated/*.tsx`) nu compune `ModulePage`, cu o listă mică de excepții declarate explicit în script;
- o rută `/app/*` (Self-Hosted) conține `mc-shell` sau `oq-soft`;
- apar utilitare de culoare hardcodate (`text-white`, `bg-black`, `bg-[#`, `text-[#`) în `src/components` și `src/routes`.

Prima rulare va raporta încălcările existente; cele reale se corectează, restul se trec pe allowlist explicită cu motiv, ca fișierul să pornească „verde".

### 4. Curățarea memoriei

- `mem://index.md`: Core rescris ca să descrie ce e în cod (Emerald/Gold/Parchment + Karla/Space Grotesk pentru Self-Hosted & Portal, Noir & Gold doar pentru MC), fără „Design System v3" contradictoriu, fără referințe la fișiere inexistente sau la `.lovable/plan.md`.
- Se adaugă `mem://design/design-contract` — un pointer scurt către `docs/engineering/09-design-contract.md` ca singura sursă de adevăr.

## Note tehnice

- Nicio schimbare de token, culoare, font sau layout: doar documentație, un script de verificare și eventuale corecții punctuale pentru încălcări reale găsite de script.
- Scriptul se adaugă ca `npm run verify:design` și se poate rula alături de verificările existente (`verify-source-imports`, `verify-bundle`).
- Verificare finală: rulare script, typecheck, apoi o trecere în browser peste `/app`, `/management`, `/portal` în light și dark pentru a confirma că nimic nu s-a mișcat vizual.
