
# OPSQAI — Sovereign Mark Identity System

Un logo care arată ca și cum a fost comandat la un studio de identitate premium. Concept: **sigiliu heraldic** — o monogramă gravată "OQ" (Operational Q/Intelligence) închisă într-un cartuș octogonal, cu o coroană de noduri fine pe perimetru care sugerează rețeaua de cunoaștere. Auriul apare doar pe accent (nucleul monogramei + o linie de gravură), restul rămâne onix. Impresia: seif privat + medalie, nu "yet another AI startup".

## Identitate vizuală

- **Paletă:** Onyx `#0A0A0A`, Ink `#141414`, Gold `#C9A24C`, Champagne `#F0D78C`, Bone `#F5F0E6` (pentru light lockup).
- **Tipografie wordmark:** Cormorant Garamond SemiBold cu tracking `+180`, versale, litera "Q" cu terminația coborâtă intenționat. Micro-tagline în Karla Medium, tracking `+240`, versale mici.
- **Construcție geometrică:** grid 64×64, octogon regulat cu raza 28, monogramă centrată pe axa optică (nu geometrică — coborâtă 1u). Linie de gravură dublă (1.25pt + 0.5pt) la 2u interior de cartuș.
- **Regula aurului:** aurul acoperă ≤ 12% din suprafața marcă → efect medalie, nu efect banner.

## Direcția marcă (Sovereign Mark)

```text
     ╔════════════════╗       ← cartuș octogonal, gravură dublă
    ║  · · · · · · ·  ║      ← coroană de 8 noduri fine (rețea)
   ║   ┌──────────┐   ║
   ║   │    OQ    │   ║       ← monogramă serif, ligatură Q→O
   ║   └──────────┘   ║       ← nucleu auriu în interiorul Q
    ║  · · · · · · ·  ║
     ╚════════════════╝
         OPSQAI                ← wordmark Cormorant, tracking larg
    OPERATIONAL KNOWLEDGE       ← tagline Karla, small caps
```

## Livrabile (sistem complet de identitate)

Toate în `public/brand/` ca SVG-uri curate + un brand board.

1. `sovereign-mark.svg` — marca primară (onix + accent auriu).
2. `sovereign-mark-mono-gold.svg` — pe fundal onix, integral auriu.
3. `sovereign-mark-mono-bone.svg` — pe fundal bone, integral onix.
4. `sovereign-mark-inverse.svg` — pe fundal auriu, gravură onix.
5. `lockup-horizontal.svg` — mark + wordmark aliniat pe baseline optic.
6. `lockup-stacked.svg` — mark deasupra wordmark + tagline dedesubt.
7. `wordmark.svg` — doar "OPSQAI" în Cormorant, cu Q personalizată.
8. `monogram.svg` — doar "OQ" în cartuș, pentru favicon/app icon/avatar.
9. `favicon.svg` — variantă simplificată optimizată la 16–32px.
10. `brand-board.tsx` — pagina `/brand` internă cu grid de construcție, paletă, tipografie, do/don't, spacing rules, minimum size, clear space.

## Aplicare (după ce marca e aprobată vizual)

Nu ating aplicațiile în această fază — livrez întâi sistemul static și îl arăt pe `/brand`. Dacă îți place, într-un pas următor înlocuiesc:
- `LogoMark` / `Logo` / `LogoStacked` din `src/components/brand/logo.tsx`
- Header MC (`mc-shell`), Portal, Desktop Shell splash
- OG image, favicon.ico multi-size, PWA icons, apple-touch-icon
- Auth screen, Installer wizard header

## Plan de execuție

1. **Fonts:** adaug `Cormorant Garamond` + `Karla` prin `<link>` în `__root.tsx` (regula Tailwind v4 — nu în `styles.css`).
2. **Tokens marcă:** adaug în `styles.css` variabilele `--brand-onyx`, `--brand-ink`, `--brand-gold`, `--brand-champagne`, `--brand-bone` sub `@theme`.
3. **SVG-uri:** scriu manual cele 9 SVG-uri în `public/brand/` cu grid geometric exact, pathuri optimizate (fără artefacte de export), `role="img"` + `<title>`.
4. **Brand board:** creez `src/routes/brand.tsx` (rută internă, `noindex`) care arată: hero cu marca primară pe onix, grid de construcție cu linii de gardă vizibile, toate variantele, paleta cu hex + oklch, scala tipografică Cormorant/Karla, reguli clear-space și minimum size, do/don't cu exemple, download links pentru fiecare SVG.
5. **Verificare vizuală:** capturez `/brand` cu Playwright, inspectez la 100% și la 24px, ajustez tracking/kerning/greutăți până arată gravat, nu tipărit.
6. **Livrare:** îți arăt pagina `/brand`; dacă aprobi, într-o fază următoare aplic sistemul în aplicație (logo component, favicon, OG, MC header, desktop shell splash).

## Detalii tehnice

- SVG-urile folosesc `currentColor` unde e posibil, ca să funcționeze inversate.
- Fiecare SVG are `viewBox="0 0 64 64"` (mark) sau `0 0 320 80` (lockup), fără dimensiuni hardcodate.
- Monograma "OQ" e desenată ca `<path>`, nu ca `<text>` — ca să nu depindă de font la runtime și să rămână identic pe orice sistem.
- Wordmark-ul din lockup rămâne `<text>` cu fallback stack (`Cormorant Garamond, Cormorant, Georgia, serif`) — în brand board arăt și varianta outline-uită pentru export print.
- Zero animații în marca statică. Rezerv motion pentru aplicații (splash desktop, hero site).
- Ruta `/brand` primește `meta: [{ name: "robots", content: "noindex, nofollow" }]`.

## Ce nu fac acum (intenționat)

- Nu înlocuiesc logo-ul actual din `src/components/brand/logo.tsx` până nu vezi și aprobi marca.
- Nu regenerez OG image / favicon.ico / PWA icons — vin într-un pas următor după aprobare.
- Nu ating desktop shell / installer / MC header în această fază.

După ce vezi `/brand` și confirmi, aplic sistemul peste tot într-un singur pas.
